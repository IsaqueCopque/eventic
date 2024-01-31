import { AvaliacaoRepo, EventoRepo, ParametroRepo, CategoriaRepo } from '@app/server/database';
import { RecommendationService } from "@app/pages/api/services/recommendationService"
import type { NextApiRequest, NextApiResponse } from 'next'
import {In, Not} from 'typeorm'
import { Evento } from '@app/server/entities/evento.entity';
import { ParametroName, TipoRecomendacao } from '@app/common/constants';

const QT_AVALIADORES = 4, QT_OUTRAS_AVALIACOES = 6;

/*
* Retorna eventos de categorias diversas cujo id não esteja incluso numa lista passada
*/
export const findEventosDiversos = async (numeroEventos : number, skipEventosIds : string[] = []) : Promise<Evento[]> => {
    //seleciona eventos de categorias distintas
    let eventosDiversos = await EventoRepo
        .createQueryBuilder('evento')
        // .select(['DISTINCT evento.categoria_id', 'evento'])
        .distinctOn(['evento.categoria_id'])
        .where('evento.id NOT IN (:...ids)', { ids: skipEventosIds })
        .limit(numeroEventos)
        .getMany();

    let eventosSelecionados = eventosDiversos.length >= numeroEventos ? eventosDiversos.slice(0,numeroEventos) : eventosDiversos; 
   
    numeroEventos -= eventosSelecionados.length;

    //Completa com demais eventos de categorias diversas caso primeira busca não retorne o suficiente
    if(numeroEventos > 0){
        eventosDiversos = await EventoRepo
        .createQueryBuilder('evento')
        // .select(['DISTINCT evento.categoria_id', 'evento'])
        .distinctOn(['evento.categoria_id'])
        .where('evento.id NOT IN (:...ids)', { ids: skipEventosIds })
        .offset(eventosSelecionados.length)
        .limit(eventosSelecionados.length)
        .getMany();
        eventosSelecionados = eventosDiversos.length <= numeroEventos?
            eventosSelecionados.concat(eventosDiversos)
            :
            eventosSelecionados.concat(eventosDiversos.slice(numeroEventos-1));
    }
    return eventosSelecionados;
}

/*
*   Rota para recomendações de eventos.
*   Query:  
*        evento_id para recomendar baseado no evento
*        usuario_id para recomendar baseado no evento utilizando perfil de usuário
*/
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<any>
) {
    if(req.method === "GET"){
        let {evento_id, usuario_id} = req.query;
        if(usuario_id) usuario_id = usuario_id as string;
        let eventosAvaliados = [], similaridadeMinima = 0;
        let tipoRecomendacao : number;

        //Gera recomendações de eventos similares a um evento
        if(evento_id){
            evento_id = evento_id as string;
            let evento = await EventoRepo.findOne({where: {id:evento_id}}) as Evento;
            
            const avaliacoesEvento = await AvaliacaoRepo.createQueryBuilder('avaliacao')
            .leftJoinAndSelect('avaliacao.usuario', 'usuario')
            .where('avaliacao.evento_id = :id_evento', { id_evento: evento_id })
            .limit(QT_AVALIADORES)  //Limitado quantidade avaliadores
            .getMany();

            // const avaliacoesEvento = await AvaliacaoRepo.find(
            //     {where: {evento: {id: evento_id}},
            //      relations: {usuario: true}
            //     });    
            
            /*
            .createQueryBuilder('evento')
                    // .select(['DISTINCT evento.categoria_id', 'evento'])
                    .distinctOn(['evento.categoria_id'])
                    .where('evento.id NOT IN (:...ids)', { ids: skipEventosIds })
                    .limit(numeroEventos)
                    .getMany();
            */

            //Para todo avaliador, busca as avaliações do avaliador em outros eventos
            const usuariosIds = [];
            for(let avaliacao of avaliacoesEvento){
                //@ts-ignore
                usuariosIds.push(avaliacao.usuario.id);
            }
            const avaliacoesGeral = usuariosIds.length == 0?
                []
                :
                await AvaliacaoRepo.createQueryBuilder('avaliacao')
                .leftJoinAndSelect("avaliacao.evento", "evento")
                .leftJoinAndSelect("avaliacao.usuario", "usuario")
                .where('avaliacao.usuario_id IN (:...ids)', { ids: usuariosIds })
                .limit(QT_OUTRAS_AVALIACOES) //limita outras avaliações de cada usuário
                .getMany();

            // const avaliacoesGeral = await AvaliacaoRepo.find(
            //     {
            //         where: {usuario: {id: In(usuariosIds)}},
            //         relations: {usuario: true, evento: true}
            //     }
            // );

            //Busca eventos avaliados pelo usuário se passado id de usuário
            if(usuario_id){
                let minimoParametro = await ParametroRepo.findOne(
                    {where: {nome: ParametroName.SIMILARIDADE_MIN}, select: {valor: true}
                })
                if(minimoParametro) similaridadeMinima = Number(minimoParametro.valor);
                let avaliacoesUsuario = 
                await AvaliacaoRepo.find({
                    where: {usuario: {id: usuario_id}},
                    relations: {evento: true}
                });
                for(let av of avaliacoesUsuario){
                    //@ts-ignore
                    eventosAvaliados.push(av.evento.id);
                }
            }

            //similaridadeMinima = 0 se não logado
            const recService = new RecommendationService(evento, usuario_id,
                eventosAvaliados, avaliacoesGeral, similaridadeMinima);
            let recIds;
            
            //Evento sem avaliações e usuário logado, aplica apenas similaridade cosseno
            if(avaliacoesGeral.length == 0 && usuario_id){ 
                let eventosDiversos = await findEventosDiversos(15,eventosAvaliados.concat(evento_id));
                // console.log("==> Cosseno puro: \n -> encontra " + eventosDiversos.length + " eventos diversos")
                recIds = await recService.generateRecsWithoutRatings(eventosDiversos);
                tipoRecomendacao = TipoRecomendacao.SIMLIARIDADE_COSSENO;
            }
            else{ // Caso contrário, híbrido, se logado, apenas colaborativa, se deslogado
                recIds = await recService.generateRecs();
                tipoRecomendacao = usuario_id? TipoRecomendacao.HIBRIDA : TipoRecomendacao.FILTRAGEM_COLABORATIVA;
            }

            let recommendations: Evento[] = [];
            if(recIds.length != 0)
                recommendations = await EventoRepo.find({where: {id: In(recIds)}});

            // console.log("Recomendados buscados")
            // let stringFin = "";
            // for(let ev of recommendations)
            //     stringFin += ev.titulo + " || ";
            // console.log(stringFin)

            //Se houver menos que 5 eventos recomendados, completa com categorias diversas
            if(recIds.length < 5){
                // console.log("[DEBUG] ==> Não foram recomendados eventos suficentes. Preechendo com eventos de categorias diversas");                

                if(recIds.length == 0)
                    tipoRecomendacao = TipoRecomendacao.DIVERSOS;
                else if(tipoRecomendacao == TipoRecomendacao.SIMLIARIDADE_COSSENO)
                    tipoRecomendacao = TipoRecomendacao.SIMLIARIDADE_COSSENO_DIVERSOS;
                else if(tipoRecomendacao == TipoRecomendacao.HIBRIDA)
                    tipoRecomendacao = TipoRecomendacao.HIBRIDA_DIVERSOS;
                else
                    tipoRecomendacao = TipoRecomendacao.FILTRAGEM_COLABORATIVA_DIVERSOS;

                //Desconsiderar evento atual, já avaliados e já na lista de recomendações
                let skipIds = eventosAvaliados.concat(recIds);
                skipIds.push(evento_id);                
                recommendations = recommendations.concat(await findEventosDiversos(5-recommendations.length,skipIds));                
            }

            res.status(200).json({recommendations, tipoRecomendacao});
        }
        else{
            res.status(400).json({errorMsg: "Faltam parametros para gerar recomendações."})
        }
    }
}