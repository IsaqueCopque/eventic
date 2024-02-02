import { AvaliacaoRepo, EventoRepo, UsuarioRepo } from '@app/server/database';
import { Avaliacao } from '@app/server/entities/avaliacao.entity';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ObjetoAvaliacao } from '../../../../app';
const ger = require('ger');
const fs = require('fs');

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<any>
) {
    if (req.method === "GET") {
        let { usuario_id } = req.query;

        if (!usuario_id) { //Busca usuários do banco para experimentar
            //Pelo menos tenha avaliado 10 eventos
            const usuariosIds = await AvaliacaoRepo
                .createQueryBuilder('avaliacao')
                .select('avaliacao.usuario_id')
                .groupBy('avaliacao.usuario_id')
                .having('COUNT(avaliacao.usuario_id) >= :count', { count: 10 })
                .getRawMany();
            let results, text = "Usuario;precision@3;precision@5;precision@10;MAP@3;MAP@5;MAP@10;MRR@3;MRR@5;MRR@10;NDCG@3;NDCG@5;NDCG@10\n";
            let medias = [0,0,0,0,0,0,0,0,0,0,0,0], accResults = 0;
            for (let id of usuariosIds) {
                results = await realizaExperimento(id.usuario_id);
                if (results) {
                    accResults+= 1;
                    text += `${results.usuario_id};${results.precision3};${results.precision5};${results.precision10};${results.map3};${results.map5};${results.map10};${results.mrr3};${results.mrr5};${results.mrr10};${results.ndgc3};${results.ndgc5};${results.ndgc10}\n`
                    medias[0] +=results.precision3; medias[1] +=results.precision5; medias[2] +=results.precision10;
                    medias[3] +=results.map3;medias[4] +=results.map5;medias[5] +=results.map10;
                    medias[6] +=results.mrr3;medias[7] +=results.mrr5;medias[8] +=results.mrr10;
                    medias[9] +=results.ndgc3;medias[10] +=results.ndgc5;medias[11] +=results.ndgc10;
                }
            }
            text+=`Medias;${medias[0]/accResults};${medias[1]/accResults};${medias[2]/accResults};${medias[3]/accResults};${medias[4]/accResults};${medias[5]/accResults};${medias[6]/accResults};${medias[7]/accResults};${medias[8]/accResults};${medias[9]/accResults};${medias[10]/accResults};${medias[11]/accResults}`
            fs.writeFileSync("./resultado.txt", text, 'utf-8');
            res.status(200).json({ ok: "ok" });
        } else { //Faz experimento com usuário passado em parâmetro
            usuario_id = usuario_id as string;
            const usuario = await UsuarioRepo.findOne({ where: { id: usuario_id } });
            if (!usuario) {
                res.status(400).json({ errorMsg: "Id não corresponde a nenhum usuário" })
            } else {
                const resp = await realizaExperimento(usuario_id);
                res.status(200).json({ resposta: resp });
            }
        }
    }
}

async function realizaExperimento(usuario_id: string): Promise<{ usuario_id: string, precision3: number, precision5: number, precision10: number, map3: number, map5: number, map10: number, mrr3: number, mrr5: number, mrr10: number, ndgc3: number, ndgc5: number, ndgc10: number } | null> {
    let eventosApreciados = await EventoRepo.createQueryBuilder("evento")
        .innerJoin(Avaliacao, 'avaliacao', 'avaliacao.evento_id = evento.id')
        .where("avaliacao.usuario_id = :userId AND avaliacao.nota >= 4 AND evento.id = avaliacao.evento_id", { userId: usuario_id })
        .limit(10)
        .getMany();

    if (eventosApreciados.length != 10) {
        console.log({ resultado: `O usuário não tem ao menos 10 eventos apreciados ${eventosApreciados.length}` });
    } else {
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
        const apreciadosParaExperimento = eventosApreciados.slice(0, 5);
        //5 eventos apreciados que não estarão no conjunto de experimento
        const apreciadosBase = eventosApreciados.slice(5, 10);
        const apreciadosBaseIds = apreciadosBase.map(ev => ev.id);

        const conjuntoParaRecomendacao = eventosNaoAvaliados.concat(apreciadosParaExperimento);

        //Busca avaliações dos outros usuários nos eventos do conjunto de recomendação
        //e apreciadosBase, para que haja conexão da preferência entre o usuário e os demais
        const idsEventosParaBusca = conjuntoParaRecomendacao.map((evento) => evento.id).concat(apreciadosBaseIds);
        const avaliacoesOutros: ObjetoAvaliacao[] = await AvaliacaoRepo.createQueryBuilder("avaliacao")
            .select(["avaliacao.evento_id as evento_id", "avaliacao.usuario_id as usuario_id", "avaliacao.nota as nota"])
            .where("avaliacao.evento_id in (:...eventos_ids) AND avaliacao.usuario_id != :usuarioId",
                { eventos_ids: idsEventosParaBusca, usuarioId: usuario_id })
            .getRawMany();

        //Avaliações do usuário sobre os apreciadosBase
        const avaliacoesUsuario: ObjetoAvaliacao[] = await AvaliacaoRepo.createQueryBuilder("avaliacao")
            .select(["avaliacao.evento_id as evento_id", "avaliacao.usuario_id as usuario_id", "avaliacao.nota as nota"])
            .where("avaliacao.evento_id in (:...eventos_ids) AND avaliacao.usuario_id = :usuarioId",
                { eventos_ids: apreciadosBaseIds, usuarioId: usuario_id })
            .getRawMany();

        const recommender = new ger.GER(new ger.MemESM());
        await recommender.initialize_namespace('events');
        const recommenderDataSet = [];

        for (let outrosav of avaliacoesOutros) {
            recommenderDataSet.push({
                namespace: 'events',
                person: outrosav.usuario_id,
                action: outrosav.nota >= 4 ? 'likes' : 'dislikes',
                thing: outrosav.evento_id,
                expires_at: Date.now() + 3600000
            })
        }
        for (let usuarioAv of avaliacoesUsuario) {
            recommenderDataSet.push({
                namespace: 'events',
                person: usuarioAv.usuario_id,
                action: usuarioAv.nota >= 4 ? 'likes' : 'dislikes',
                thing: usuarioAv.evento_id,
                expires_at: Date.now() + 3600000
            })
        }
        recommender.events(recommenderDataSet);

        let recsResult = (await recommender.recommendations_for_person('events', usuario_id,
            { actions: { likes: 1, dislikes: -1 } }));

        //É preciso remover do resultado os eventos do apreciadosBase, tem precisão 100% pois usuário avaliou
        const recomendacoesLimpas = recsResult.recommendations.filter((rec: any) => !apreciadosBaseIds.includes(rec.thing));

        if (recomendacoesLimpas.length < 10) {
            console.log({ msg: "Recomendou menos de 10" });
        } else {
            const itensRelevantes = apreciadosParaExperimento.map(evento => evento.id);
            const Rel = (item: string) => itensRelevantes.includes(item) ? 1 : 0;
            /*
            * Calcular MAP,MRR,MDCG e Precision@ para as posições 3,5 e 10
            */
            const posicoes = [3, 5, 10];

            let mapsResults: number[] = [], mapSum: number;
            let mrrResults = [];
            let ndcgResults = [], dcgSum: number, idcgSum: number;
            let precisions = [];
            let accRelevantes, index = 1;

            for (let posicao of posicoes) {
                mapSum = 0;
                accRelevantes = 0;
                dcgSum = 0;
                idcgSum = 0;
                for (let r = 1; r <= posicao; r++) //indcg constante para posicao
                    idcgSum += (1 / (Math.log(r + 1)));

                for (let i = 0; i < posicao; i++) {
                    if (Rel(recomendacoesLimpas[i].thing)) {
                        accRelevantes += 1;
                        //mAP
                        mapSum += accRelevantes / (i + 1);
                        //mrr
                        if (accRelevantes == 1) //firstRelevant
                            mrrResults.push(1 / (i + 1)); //Reciprocal Rank 3,5,10 para um único usuário
                        //dcg
                        dcgSum += 1 / (Math.log((i + 1) + 1));
                    }
                }
                precisions.push(accRelevantes / posicao);
                if (mrrResults.length < index) mrrResults.push(0);
                ndcgResults.push(dcgSum / idcgSum); //NDCG 3,5,10 para um único usuário
                mapsResults.push(mapSum / posicao); //Average Precision (AP) 3,5,10 para um único usuário
                index++;
            }

            return {
                usuario_id, precision3: precisions[0], precision5: precisions[1], precision10: precisions[2],
                map3: mapsResults[0], map5: mapsResults[1], map10: mapsResults[2],
                mrr3: mrrResults[0], mrr5: mrrResults[1], mrr10: mrrResults[2],
                ndgc3: ndcgResults[0], ndgc5: ndcgResults[1], ndgc10: ndcgResults[2]
            }
        }

    }
    return null;
}