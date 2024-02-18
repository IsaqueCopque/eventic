import { AvaliacaoRepo, EventoRepo, ParametroRepo, CategoriaRepo } from '@app/server/database';
import { RecommendationService } from "@app/pages/api/services/recommendationService"
import type { NextApiRequest, NextApiResponse } from 'next'
import {In, Not} from 'typeorm'
import { Evento } from '@app/server/entities/evento.entity';
import { ParametroName, TipoRecomendacao } from '@app/common/constants';
import { Avaliacao } from '@app/server/entities/avaliacao.entity';
import Cosine from "string-comparison";
const ger = require('ger');

const stopWords = ['i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves','he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',  'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was',  'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and',  'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between',  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off',  'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both',  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too','very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now'];
const QT_AVALIADORES = 10, QT_OUTRAS_AVALIACOES = 15;
const fcNamespace = 'events_fc';

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
        const inHomePage = (req.query.home_page as string) == 'true';

        //Gera recomendações de eventos
        if(evento_id){
            evento_id = evento_id as string;
            let evento = await EventoRepo.findOne({where: {id:evento_id}}) as Evento;

            const avaliacoesEvento = await AvaliacaoRepo.createQueryBuilder('avaliacao')
            .leftJoinAndSelect('avaliacao.usuario', 'usuario')
            .where('avaliacao.evento_id = :id_evento', { id_evento: evento_id })
            .limit(QT_AVALIADORES)  //Limitado quantidade avaliadores
            .getMany();

            let recomendacoes, tipoRecomendacao;
            let userModel  : Evento[]; 
            if(usuario_id)
                userModel = await EventoRepo.createQueryBuilder("evento")
                .innerJoin(Avaliacao, 'avaliacao', 'avaliacao.evento_id = evento.id')
                .where("avaliacao.usuario_id = :userId AND avaliacao.nota >= 4 AND evento.id = avaliacao.evento_id", { userId: usuario_id })
                .limit(25)
                .getMany();

            //Evento contém avaliações
            if(avaliacoesEvento.length > 0){

                const recommendadorFC = new ger.GER(new ger.MemESM());
                const baseRecomendador : {namespace : string, person : string, action : string, thing : string, expires_at : number}[] = [];

                //Avaliações de outros usuários em outros eventos
                let avaliacoesOutros;
                for(let av of avaliacoesEvento){
                    avaliacoesOutros = await AvaliacaoRepo.createQueryBuilder('avaliacao')
                    .select('avaliacao.usuario_id, avaliacao.nota, avaliacao.evento_id')
                    //@ts-ignore
                    .where('avaliacao.usuario_id = :id_usuario AND avaliacao.evento_id != :evento_base_id', {id_usuario: av.usuario.id, evento_base_id: evento_id})
                    .limit(QT_OUTRAS_AVALIACOES)
                    .getRawMany();
                    avaliacoesOutros.forEach(avaliacaoOutro => baseRecomendador.push(
                        {
                            namespace: fcNamespace,
                            person: avaliacaoOutro.usuario_id,
                            action: avaliacaoOutro.nota >= 4 ? 'likes' : 'dislikes',
                            thing: avaliacaoOutro.evento_id,
                            expires_at: Date.now() + 3600000
                        }
                    ))
                }

                if(usuario_id){//Se usuário, adiciona na base o perfil do usuário
                    avaliacoesOutros = await AvaliacaoRepo.createQueryBuilder('avaliacao')
                    .select('avaliacao.nota, avaliacao.evento_id')
                    //@ts-ignore
                    .where('avaliacao.usuario_id = :id_usuario AND avaliacao.evento_id != :evento_base_id', {id_usuario: usuario_id, evento_base_id: evento_id})
                    .getRawMany();
                    avaliacoesOutros.forEach(avaliacaoOutro => baseRecomendador.push(
                        {
                            namespace: fcNamespace,
                            person: usuario_id as string,
                            action: avaliacaoOutro.nota >= 4 ? 'likes' : 'dislikes',
                            thing: avaliacaoOutro.evento_id,
                            expires_at: Date.now() + 3600000
                        }
                    ))
                }

                 //Limpa eventos do recomendador se armazenados em memória
                if(await recommendadorFC.namespace_exists(fcNamespace))
                await recommendadorFC.destroy_namespace(fcNamespace);
            
                await recommendadorFC.initialize_namespace(fcNamespace);
                await recommendadorFC.events(baseRecomendador);

                //Se na homePage ou sem usuário logado, item-based CF
                if(inHomePage || !usuario_id)
                recomendacoes = (await recommendadorFC.recommendations_for_thing(fcNamespace, evento_id,
                    { actions: { likes: 1, dislikes: -1 } }));
                else //Caso contrário, user-based CF
                recomendacoes = (await recommendadorFC.recommendations_for_person(fcNamespace, usuario_id,
                    { actions: { likes: 1, dislikes: -1 } }));
                
                recomendacoes = recomendacoes.recommendations.map((rec : any) => rec.thing);
                tipoRecomendacao = TipoRecomendacao.FILTRAGEM_COLABORATIVA;
            }
            else{//Sem avaliações, aplica a CBF
                let minimoParametro = await ParametroRepo.findOne(
                    {where: {nome: ParametroName.SIMILARIDADE_MIN}, select: {valor: true}
                });
                if(minimoParametro) similaridadeMinima = Number(minimoParametro.valor);

                const eventosSet = await findEventosDiversos(15,
                    usuario_id? userModel!.map(e=>e.id).concat(evento_id) : [evento_id]
                );

                recomendacoes = similaridadeCosseno(usuario_id? userModel! : [evento], eventosSet, similaridadeMinima);
                tipoRecomendacao = TipoRecomendacao.SIMLIARIDADE_COSSENO;
            }

            if(recomendacoes?.length < 5){//Completa com eventos diversos
                let skipIds = recomendacoes.concat(evento_id);
                if(usuario_id)
                    skipIds = skipIds.concat(userModel!.map(ev=>ev.id));

                recomendacoes = recomendacoes.concat(await findEventosDiversos(5 - recomendacoes.length, skipIds));

                if(recomendacoes.length == 0)
                    tipoRecomendacao = TipoRecomendacao.DIVERSOS;
                else if(tipoRecomendacao == TipoRecomendacao.FILTRAGEM_COLABORATIVA)
                    tipoRecomendacao = TipoRecomendacao.FILTRAGEM_COLABORATIVA_DIVERSOS;
                else 
                    tipoRecomendacao = TipoRecomendacao.SIMLIARIDADE_COSSENO_DIVERSOS;
            }

            res.status(200).json({recomendacoes, tipoRecomendacao});
         
            //OLD CODE

            // // const avaliacoesEvento = await AvaliacaoRepo.find(
            // //     {where: {evento: {id: evento_id}},
            // //      relations: {usuario: true}
            // //     });    
            
            // /*
            // .createQueryBuilder('evento')
            //         // .select(['DISTINCT evento.categoria_id', 'evento'])
            //         .distinctOn(['evento.categoria_id'])
            //         .where('evento.id NOT IN (:...ids)', { ids: skipEventosIds })
            //         .limit(numeroEventos)
            //         .getMany();
            // */

            // //Para todo avaliador, busca as avaliações do avaliador em outros eventos
            // const usuariosIds = [];
            // for(let avaliacao of avaliacoesEvento){
            //     //@ts-ignore
            //     usuariosIds.push(avaliacao.usuario.id);
            // }
            // const avaliacoesGeral = usuariosIds.length == 0?
            //     []
            //     :
            //     await AvaliacaoRepo.createQueryBuilder('avaliacao')
            //     .leftJoinAndSelect("avaliacao.evento", "evento")
            //     .leftJoinAndSelect("avaliacao.usuario", "usuario")
            //     .where('avaliacao.usuario_id IN (:...ids)', { ids: usuariosIds })
            //     .limit(QT_OUTRAS_AVALIACOES) //limita outras avaliações de cada usuário
            //     .getMany();

            // // const avaliacoesGeral = await AvaliacaoRepo.find(
            // //     {
            // //         where: {usuario: {id: In(usuariosIds)}},
            // //         relations: {usuario: true, evento: true}
            // //     }
            // // );

            // //Busca eventos avaliados pelo usuário se passado id de usuário
            // if(usuario_id){
            //     let minimoParametro = await ParametroRepo.findOne(
            //         {where: {nome: ParametroName.SIMILARIDADE_MIN}, select: {valor: true}
            //     })
            //     if(minimoParametro) similaridadeMinima = Number(minimoParametro.valor);
            //     let avaliacoesUsuario = 
            //     await AvaliacaoRepo.find({
            //         where: {usuario: {id: usuario_id}},
            //         relations: {evento: true}
            //     });
            //     for(let av of avaliacoesUsuario){
            //         //@ts-ignore
            //         eventosAvaliados.push(av.evento.id);
            //     }
            // }

            // //similaridadeMinima = 0 se não logado
            // const recService = new RecommendationService(evento, usuario_id,
            //     eventosAvaliados, avaliacoesGeral, similaridadeMinima);
            // let recIds;
            
            // //Evento sem avaliações e usuário logado, aplica apenas similaridade cosseno
            // if(avaliacoesGeral.length == 0 && usuario_id){ 
            //     let eventosDiversos = await findEventosDiversos(15,eventosAvaliados.concat(evento_id));
            //     // console.log("==> Cosseno puro: \n -> encontra " + eventosDiversos.length + " eventos diversos")
            //     recIds = await recService.generateRecsWithoutRatings(eventosDiversos);
            //     tipoRecomendacao = TipoRecomendacao.SIMLIARIDADE_COSSENO;
            // }
            // else{ // Caso contrário, híbrido, se logado, apenas colaborativa, se deslogado
            //     recIds = await recService.generateRecs();
            //     tipoRecomendacao = usuario_id? TipoRecomendacao.HIBRIDA : TipoRecomendacao.FILTRAGEM_COLABORATIVA;
            // }

            // let recommendations: Evento[] = [];
            // if(recIds.length != 0)
            //     recommendations = await EventoRepo.find({where: {id: In(recIds)}});

            // // console.log("Recomendados buscados")
            // // let stringFin = "";
            // // for(let ev of recommendations)
            // //     stringFin += ev.titulo + " || ";
            // // console.log(stringFin)

            // //Se houver menos que 5 eventos recomendados, completa com categorias diversas
            // if(recIds.length < 5){
            //     // console.log("[DEBUG] ==> Não foram recomendados eventos suficentes. Preechendo com eventos de categorias diversas");                

            //     if(recIds.length == 0)
            //         tipoRecomendacao = TipoRecomendacao.DIVERSOS;
            //     else if(tipoRecomendacao == TipoRecomendacao.SIMLIARIDADE_COSSENO)
            //         tipoRecomendacao = TipoRecomendacao.SIMLIARIDADE_COSSENO_DIVERSOS;
            //     else if(tipoRecomendacao == TipoRecomendacao.HIBRIDA)
            //         tipoRecomendacao = TipoRecomendacao.HIBRIDA_DIVERSOS;
            //     else
            //         tipoRecomendacao = TipoRecomendacao.FILTRAGEM_COLABORATIVA_DIVERSOS;

            //     //Desconsiderar evento atual, já avaliados e já na lista de recomendações
            //     let skipIds = eventosAvaliados.concat(recIds);
            //     skipIds.push(evento_id);                
            //     recommendations = recommendations.concat(await findEventosDiversos(5-recommendations.length,skipIds));                
            // }

            // res.status(200).json({recommendations, tipoRecomendacao});
        }
        else{
            res.status(400).json({errorMsg: "Faltam parametros para gerar recomendações."})
        }
    }
}

function similaridadeCosseno(userModel : Evento[], eventosSet : Evento[], similaridadeMin : number) : string[]{
    let recomendados : {id: string, similaridade : number}[] = [];
    let textoBase = "";
    for(let apreciado of userModel)
        textoBase += getTextoLimpo(apreciado.titulo + " " + apreciado.descricao);
    
    let texto2, simValue;
    for(let evento of eventosSet){
        texto2 = getTextoLimpo(evento.titulo + " " + evento.descricao)
        simValue = Cosine.cosine.similarity(textoBase,texto2);
        if(simValue >= similaridadeMin)
            recomendados.push({id: evento.id, similaridade: simValue});
    }

    recomendados = recomendados
        .sort((a,b) => a.similaridade < b.similaridade? -1 : (a.similaridade == b.similaridade? 0 : 1) );

    return recomendados.map(rec=> rec.id);
}

//Retorna texto sem stop words e com palavras separadas por espaço
function getTextoLimpo(texto : string) : string{
    texto = texto.toLowerCase();
    let words = texto.split(" ");
    words = words.filter((word) => !stopWords.includes(word));
    return words.reduce((word,acc) => word + " " + acc,"");
}