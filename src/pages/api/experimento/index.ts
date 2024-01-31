import type { NextApiRequest, NextApiResponse } from 'next'
import { AvaliacaoRepo, EventoRepo, ParametroRepo, CategoriaRepo, UsuarioRepo } from '@app/server/database';
import { Evento } from '@app/server/entities/evento.entity';
import { findEventosDiversos } from '../eventos/recomendar';
import { Avaliacao } from '@app/server/entities/avaliacao.entity';
import { RecommendationService } from '../services/recommendationService';
import { ObjetoAvaliacao } from '../../../../app';
const ger = require('ger')

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<any>
) {
    if(req.method === "GET"){
        let {usuario_id }  = req.query ;
        
        if(!usuario_id){ //Busca usuários do banco para experimentar
            //Pelo menos tenha avaliado 20 eventos
            const usuariosIds = await AvaliacaoRepo
                .createQueryBuilder('avaliacao')
                .select('avaliacao.usuario_id')
                .groupBy('avaliacao.usuario_id')
                .having('COUNT(avaliacao.usuario_id) >= :count', { count: 20 })
                .limit(20)
                .getRawMany();
            let final = "";
            for(let id of usuariosIds)
                final += await realizaExperimento(id.usuario_id);
            console.log(final);
            res.status(200).json({ok: "ok"});
        }else{ //Faz experimento com usuário passado em parâmetro
            usuario_id = usuario_id as string;
            const usuario = await UsuarioRepo.findOne({where : {id: usuario_id}});
            if(!usuario){
                res.status(400).json({errorMsg: "Id não corresponde a nenhum usuário"})
            }else{
                const resp = await realizaExperimento(usuario_id);
                res.status(200).json({resposta : resp});
            }
        }
    }
}

async function realizaExperimento(usuario_id : string) : Promise<string>{
    let eventosApreciados = await EventoRepo.createQueryBuilder("evento")
    .innerJoin(Avaliacao, 'avaliacao', 'avaliacao.evento_id = evento.id')
    .where("avaliacao.usuario_id = :userId AND avaliacao.nota >= 4 AND evento.id = avaliacao.evento_id", {userId: usuario_id})
    .limit(10)
    .getMany();

    if(eventosApreciados.length != 10){
        console.log({resultado: `O usuário não tem ao menos 10 eventos apreciados ${eventosApreciados.length}`});
    }else{
        const eventosAvaliadosIds = await AvaliacaoRepo.createQueryBuilder("avaliacao")
            .select(["avaliacao.evento_id"])
            .where("avaliacao.usuario_id = :userId", { userId: usuario_id })
            .getRawMany();
        eventosAvaliadosIds.forEach((evento, index) => eventosAvaliadosIds[index] = evento.evento_id);

        const eventosNaoAvaliados = await EventoRepo.createQueryBuilder("evento")
            .where('evento.id NOT IN (:...ids)', { ids: eventosAvaliadosIds })
            .limit(20)
            .getMany();

        //5 eventos apreciados que serão movidos para o conjunto de experimento
        const apreciadosParaExperimento = eventosApreciados.slice(0,5)
        //5 eventos apreciados que não estarão no conjunto de experimento
        const apreciadosBase = eventosApreciados.slice(5,10);
        const apreciadosBaseIds = apreciadosBase.map(ev=>ev.id);

        const conjuntoParaRecomendacao = eventosNaoAvaliados.concat(apreciadosParaExperimento);

        //Busca avaliações dos outros usuários nos eventos do conjunto de recomendação
        //e apreciadosBase, para que haja conexão da preferência entre o usuário e os demais
        const idsEventosParaBusca = conjuntoParaRecomendacao.map((evento)=> evento.id).concat(apreciadosBaseIds);
        const avaliacoesOutros : ObjetoAvaliacao[] = await AvaliacaoRepo.createQueryBuilder("avaliacao")
        .select(["avaliacao.evento_id as evento_id","avaliacao.usuario_id as usuario_id","avaliacao.nota as nota"])
        .where("avaliacao.evento_id in (:...eventos_ids) AND avaliacao.usuario_id != :usuarioId", 
            {eventos_ids: idsEventosParaBusca, usuarioId: usuario_id})
        .getRawMany();

        //Avaliações do usuário sobre os apreciadosBase
        const avaliacoesUsuario : ObjetoAvaliacao[] = await AvaliacaoRepo.createQueryBuilder("avaliacao")
        .select(["avaliacao.evento_id as evento_id","avaliacao.usuario_id as usuario_id","avaliacao.nota as nota"])
        .where("avaliacao.evento_id in (:...eventos_ids) AND avaliacao.usuario_id = :usuarioId", 
        {eventos_ids: apreciadosBaseIds, usuarioId: usuario_id})
        .getRawMany();

        const recommender = new ger.GER(new ger.MemESM());
        await recommender.initialize_namespace('events');
        const recommenderDataSet = [];

        for(let outrosav of avaliacoesOutros){
            recommenderDataSet.push({
                namespace: 'events',
                person: outrosav.usuario_id,
                action: outrosav.nota >=  4? 'likes' : 'dislikes',
                thing: outrosav.evento_id,
                expires_at: Date.now()+3600000
            })
        }
        for(let usuarioAv of avaliacoesUsuario){
            recommenderDataSet.push({
                namespace: 'events',
                person: usuarioAv.usuario_id,
                action: usuarioAv.nota >=  4? 'likes' : 'dislikes',
                thing: usuarioAv.evento_id,
                expires_at: Date.now()+3600000
            })
        }
        recommender.events(recommenderDataSet);

        let recsResult = (await recommender.recommendations_for_person('events',usuario_id, 
            {actions: {likes: 1, dislikes: -1}}));

        if(recsResult.recommendations.length < 7){
            console.log({ msg: "Recomendou menos de 7" });
        }else{
            //É preciso remover do resultado os eventos do apreciadosBase, tem precisão 100% pois usuário avaliou
            const recomendacoesLimpas = recsResult.recommendations.filter((rec : any) => !apreciadosBaseIds.includes(rec.thing));
            
            //Posicoes relevantes 1 - 3 - 5
            const relevantes = [apreciadosParaExperimento[0].id,apreciadosParaExperimento[2].id,apreciadosParaExperimento[4].id];
            let posicao, reciprocalRank:number[] = [], mAPSum = 0;

            //Cálculo da MMR (1/qt_relevantes)(somatório (1/relevante_rank))
            //Cálculo da mAP (1/qt_relevantes)(somatório (indice_relevante)/relevante_rank)
            relevantes.forEach((relevante, index) => {
                posicao = recomendacoesLimpas.findIndex((rec : any) => rec.thing == relevante);
                if(posicao == -1) posicao = 100000; //não encontrado 
                reciprocalRank.push(1/(posicao+1));
                mAPSum += (index+1)/posicao;
            });
            const rrSum = reciprocalRank.reduce((prv, rr)=>prv+rr, 0);
            const mmr = rrSum/relevantes.length;
            const mAP = mAPSum/relevantes.length;
            //Cálculo do NDCG DCG/IDCG
            let dcg = 0, idcg = 0;
            recomendacoesLimpas.forEach((rec : any,index : number) => {
                dcg+= (relevantes.includes(rec.thing)? 1 : 0)/Math.log((index+1)+1);
                idcg+= 1/Math.log((index+1)+1);
            });
            const ndcg = dcg /idcg;

            //------Imprime Resultado--------------
            // console.log("\nResultado")
            // console.log(recsResult);
            // console.log("\n///////////////\n")
            // recsResult.recommendations.forEach((res,index) => {
            //     console.log(`#${index+1} ${res.thing}`);
            //     console.log(`Peso ${res.weight}\nPessoas = `);
            //     console.log(res.people);
            // })
            // console.log("\n---------Resultados finais: ");
            // console.log("RECIRPOCAL RANK = ");
            // console.log(reciprocalRank);
            // console.log("MMR = " + mmr);
            //-------------------------------------

            return `${usuario_id};${reciprocalRank.reduce((prv,rr)=>prv+rr+";", "")}${mmr};${mAP};${ndcg}\n`
            // return `\n-------\nUsuario = ${usuario_id}\nRECIRPOCAL RANK = ${reciprocalRank} \n MMR = ${mmr}\n`
        }
       
        

    }
    return "";
}