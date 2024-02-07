import { AvaliacaoRepo, EventoRepo, UsuarioRepo } from '@app/server/database';
import { Avaliacao } from '@app/server/entities/avaliacao.entity';
import { Evento } from '@app/server/entities/evento.entity';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ObjetoAvaliacao } from '../../../../app';
import Cosine from "string-comparison"
const ger = require('ger');
const fs = require('fs');

interface TiposMetricas{
    map3: number, map5: number, map10: number,
    mrr3: number, mrr5: number, mrr10: number,
    ndgc3: number, ndgc5: number, ndgc10: number
}

interface Metricas{
    usuario_id: string,
    simCosseno : TiposMetricas,
    fc: TiposMetricas,
    hibrido: TiposMetricas
}

const stopWords = ['i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves','he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',  'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was',  'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and',  'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between',  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off',  'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both',  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too','very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now'];
const fcNamespace = 'events_fc';
const posicoesMetricas = [3, 5, 10];

let insuficientes = 0, poucasAvaliacoes = 0; 

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
                // .limit(30)
                // .offset(200)
                .getRawMany();

            let results;
            let textSimCosseno = "Usuario;MAP@3;MAP@5;MAP@10;MRR@3;MRR@5;MRR@10;NDCG@3;NDCG@5;NDCG@10\n";
            let textFC = "Usuario;MAP@3;MAP@5;MAP@10;MRR@3;MRR@5;MRR@10;NDCG@3;NDCG@5;NDCG@10\n";
            let textHib = "Usuario;MAP@3;MAP@5;MAP@10;MRR@3;MRR@5;MRR@10;NDCG@3;NDCG@5;NDCG@10\n";
            let mediasSimCosseno =  [0,0,0,0,0,0,0,0,0], mediasFC = [0,0,0,0,0,0,0,0,0], mediasHib = [0,0,0,0,0,0,0,0,0]; 
            let accResults = 0;

            for (let id of usuariosIds) {
                results = await realizaExperimento(id.usuario_id);
                if (results) {
                    accResults+= 1;

                    textSimCosseno += `${results.usuario_id};${results.simCosseno.map3};${results.simCosseno.map5};${results.simCosseno.map10};${results.simCosseno.mrr3};${results.simCosseno.mrr5};${results.simCosseno.mrr10};${results.simCosseno.ndgc3};${results.simCosseno.ndgc5};${results.simCosseno.ndgc10}\n`
                    mediasSimCosseno[0] +=results.simCosseno.map3; mediasSimCosseno[1] +=results.simCosseno.map5; mediasSimCosseno[2] +=results.simCosseno.map10;
                    mediasSimCosseno[3] +=results.simCosseno.mrr3; mediasSimCosseno[4] +=results.simCosseno.mrr5; mediasSimCosseno[5] +=results.simCosseno.mrr10;
                    mediasSimCosseno[6] +=results.simCosseno.ndgc3; mediasSimCosseno[7] +=results.simCosseno.ndgc5; mediasSimCosseno[8] +=results.simCosseno.ndgc10;

                    textFC += `${results.usuario_id};${results.fc.map3};${results.fc.map5};${results.fc.map10};${results.fc.mrr3};${results.fc.mrr5};${results.fc.mrr10};${results.fc.ndgc3};${results.fc.ndgc5};${results.fc.ndgc10}\n`
                    mediasFC[0] +=results.fc.map3; mediasFC[1] +=results.fc.map5; mediasFC[2] +=results.fc.map10;
                    mediasFC[3] +=results.fc.mrr3; mediasFC[4] +=results.fc.mrr5; mediasFC[5] +=results.fc.mrr10;
                    mediasFC[6] +=results.fc.ndgc3; mediasFC[7] +=results.fc.ndgc5; mediasFC[8] +=results.fc.ndgc10;

                    textHib += `${results.usuario_id};${results.hibrido.map3};${results.hibrido.map5};${results.hibrido.map10};${results.hibrido.mrr3};${results.hibrido.mrr5};${results.hibrido.mrr10};${results.hibrido.ndgc3};${results.hibrido.ndgc5};${results.hibrido.ndgc10}\n`
                    mediasHib[0] +=results.hibrido.map3; mediasHib[1] +=results.hibrido.map5; mediasHib[2] +=results.hibrido.map10;
                    mediasHib[3] +=results.hibrido.mrr3; mediasHib[4] +=results.hibrido.mrr5; mediasHib[5] +=results.hibrido.mrr10;
                    mediasHib[6] +=results.hibrido.ndgc3; mediasHib[7] +=results.hibrido.ndgc5; mediasHib[8] +=results.hibrido.ndgc10;
                }
            }
            textSimCosseno+=`Medias;${mediasSimCosseno[0]/accResults};${mediasSimCosseno[1]/accResults};${mediasSimCosseno[2]/accResults};${mediasSimCosseno[3]/accResults};${mediasSimCosseno[4]/accResults};${mediasSimCosseno[5]/accResults};${mediasSimCosseno[6]/accResults};${mediasSimCosseno[7]/accResults};${mediasSimCosseno[8]/accResults}`
            textFC+=`Medias;${mediasFC[0]/accResults};${mediasFC[1]/accResults};${mediasFC[2]/accResults};${mediasFC[3]/accResults};${mediasFC[4]/accResults};${mediasFC[5]/accResults};${mediasFC[6]/accResults};${mediasFC[7]/accResults};${mediasFC[8]/accResults}`
            textHib+=`Medias;${mediasHib[0]/accResults};${mediasHib[1]/accResults};${mediasHib[2]/accResults};${mediasHib[3]/accResults};${mediasHib[4]/accResults};${mediasHib[5]/accResults};${mediasHib[6]/accResults};${mediasHib[7]/accResults};${mediasHib[8]/accResults}`
            
            fs.writeFileSync("./metricasSimCosseno.txt", textSimCosseno, 'utf-8');
            fs.writeFileSync("./metricasFC.txt", textFC, 'utf-8');
            fs.writeFileSync("./metricasHibrido.txt", textHib, 'utf-8');
            
            console.log("\n --- Total = " + accResults + " --- ")
            console.log("--- Avaliações insuficiente = " + poucasAvaliacoes + " ---")
            console.log("--- Poucos Recomendados = " + insuficientes + " --- \n")

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

async function realizaExperimento(usuario_id: string): Promise<Metricas | null> {
    let eventosApreciados = await EventoRepo.createQueryBuilder("evento")
        .innerJoin(Avaliacao, 'avaliacao', 'avaliacao.evento_id = evento.id')
        .where("avaliacao.usuario_id = :userId AND avaliacao.nota >= 4 AND evento.id = avaliacao.evento_id", { userId: usuario_id })
        .limit(10)
        .getMany();

    if (eventosApreciados.length != 10) {
        poucasAvaliacoes += 1;
        // console.log({ resultado: `O usuário não tem ao menos 10 eventos apreciados ${eventosApreciados.length}` });
        return null;
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

        //===================
        //Similaridade cosseno
        //====================
        const idsResultadoSimCosseno = similaridadeCosseno(apreciadosBase, conjuntoParaRecomendacao);

        if(idsResultadoSimCosseno.length > 9){//Continua com outros métodos se recomendar ao menos 10
        
            //Prepara base do GER para FC
            const recommender = new ger.GER(new ger.MemESM());
            const fcRecommenderDataSet = [];

            for (let outrosav of avaliacoesOutros)
                fcRecommenderDataSet.push({ //FC
                    namespace: fcNamespace,
                    person: outrosav.usuario_id,
                    action: outrosav.nota >= 4 ? 'likes' : 'dislikes',
                    thing: outrosav.evento_id,
                    expires_at: Date.now() + 3600000
                });
            
            for (let usuarioAv of avaliacoesUsuario) 
                fcRecommenderDataSet.push({ //FC
                    namespace: fcNamespace,
                    person: usuarioAv.usuario_id,
                    action: usuarioAv.nota >= 4 ? 'likes' : 'dislikes',
                    thing: usuarioAv.evento_id,
                    expires_at: Date.now() + 3600000
                });
            
            //Limpa eventos do recomendador se armazenados em memória
            if(await recommender.namespace_exists(fcNamespace))
                await recommender.destroy_namespace(fcNamespace);
            
            await recommender.initialize_namespace(fcNamespace);
            await recommender.events(fcRecommenderDataSet);
            
            //===================
            //Filtragem Colaborativa
            //====================
            const fcResult = (await recommender.recommendations_for_person(fcNamespace, usuario_id,
                { actions: { likes: 1, dislikes: -1 } }));
            //É preciso remover do resultado os eventos do apreciadosBase, tem precisão 100% pois usuário avaliou
            const fcRecomendacoes = fcResult.recommendations.filter((rec: any) => !apreciadosBaseIds.includes(rec.thing));
            
            if(fcRecomendacoes.length > 9){ //Continua com híbrido se recomendar ao menos 10
                //===================
                //Método Híbrido
                //====================
                const hibResult = fcRecomendacoes.filter((rec : any) => idsResultadoSimCosseno.includes(rec.thing));
                        
                // console.log(`\n___________________\n${usuario_id}\n-------------\n`);
                // console.log("\n===Conjunto para recomendação===")
                // console.log( conjuntoParaRecomendacao.map(ev => ev.id))

                // const appeIds = apreciadosParaExperimento.map((e) => e.id);

                // console.log(`\n[Cosseno]: ${idsResultadoSimCosseno.length}`);
                // console.log(`Quantidade relevantes = ${idsResultadoSimCosseno.filter(id => appeIds.includes(id)).length}`);
                // console.log(idsResultadoSimCosseno);

                // console.log("[Filtragem COLABORATIVA]: " + fcRecomendacoes.length);
                // console.log(`Quantidade relevantes = ${fcRecomendacoes.filter(rec => appeIds.includes(rec.thing)).length}`);
                // fcRecomendacoes.forEach((rec:any) => console.log(rec.thing));
    
                // console.log("\n[Híbrido]: " + hibResult.length);
                // console.log(`Quantidade relevantes = ${hibResult.filter(rec => appeIds.includes(rec.thing)).length}`);
                // hibResult.forEach((rec:any) => console.log(rec.thing));
                
                if(hibResult.length > 9){
                    return calculaMetricas(idsResultadoSimCosseno, fcRecomendacoes, hibResult, apreciadosParaExperimento.map(evento => evento.id),usuario_id);
                }else{insuficientes += 1; return null;}
            }else{insuficientes += 1; return null;}
        }else{insuficientes += 1; return null;}
    }
}

function calculaMetricas(idsResultadoSimCosseno: string[], fcResult: any, hibResult: any, itensRelevantes : string[], usuario_id : string) : Metricas{
    const Rel = (item: string) => itensRelevantes.includes(item) ? 1 : 0;
    const mapsSimCosseno: number[] = [], mapsFC: number[] = [], mapsHib: number[] = [];
    const mrrsSimCosseno: number[] = [], mrrsFC: number[] = [],  mrrsHib: number[] = [];
    const ndcgsSimCosseno: number[] = [], ndcgsFC: number[] = [], ndcgsHib: number[] = [];
    let mapSumSimCosseno: number, mapSumFC: number, mapSumHib: number;
    let dcgSumSimCosseno: number, dcgSumFC: number, dcgSumHib: number;
    let accRelSimCosseno: number, accRelFC: number, accRelHib: number; //acc relevantes encontrados
    let idcgSum : number, index = 1;

    for (let posicao of posicoesMetricas) {
        mapSumSimCosseno = mapSumFC = mapSumHib = 0;
        dcgSumSimCosseno = dcgSumFC = dcgSumHib = 0;
        accRelSimCosseno = accRelFC = accRelHib = 0;
        idcgSum = 0;

        for (let r = 1; r <= posicao; r++) //indcg constante para posicao
                    idcgSum += (1 / (Math.log(r + 1)));

        for (let i = 0; i < posicao; i++) {
            //Métricas Cosseno
            if (Rel(idsResultadoSimCosseno[i])) {
                accRelSimCosseno += 1;
                mapSumSimCosseno += accRelSimCosseno / (i + 1); //mAP
                if (accRelSimCosseno == 1) //firstRelevant
                    mrrsSimCosseno.push(1 / (i + 1));//mrr
                dcgSumSimCosseno += 1 / (Math.log((i + 1) + 1)); //dgc
            }
            //Métricas FC
            if (Rel(fcResult[i].thing)) {
                accRelFC += 1;
                mapSumFC += accRelFC / (i + 1); //mAP
                if (accRelFC == 1) //firstRelevant
                    mrrsFC.push(1 / (i + 1));//mrr
                dcgSumFC += 1 / (Math.log((i + 1) + 1)); //dgc
            }
            //Métricas Híbrido
            if (Rel(hibResult[i].thing)) {
                accRelHib += 1;
                mapSumHib += accRelHib / (i + 1); //mAP
                if (accRelHib == 1) //firstRelevant
                 mrrsHib.push(1 / (i + 1));//mrr
                dcgSumHib += 1 / (Math.log((i + 1) + 1)); //dgc
            }
        }
        if (mrrsSimCosseno.length < index) mrrsSimCosseno.push(0);
        if (mrrsFC.length < index) mrrsFC.push(0);
        if (mrrsHib.length < index) mrrsHib.push(0);

        //NDCG 3,5,10 para um único usuário
        ndcgsSimCosseno.push(dcgSumSimCosseno / idcgSum); 
        ndcgsFC.push(dcgSumFC / idcgSum); 
        ndcgsHib.push(dcgSumHib / idcgSum); 

        //Average Precision (AP) 3,5,10 para um único usuário
        mapsSimCosseno.push(mapSumSimCosseno / posicao); 
        mapsFC.push(mapSumFC / posicao); 
        mapsHib.push(mapSumHib / posicao); 

        index++;
    }

    return {
        usuario_id,
        simCosseno: {
            map3: mapsSimCosseno[0], map5: mapsSimCosseno[1], map10: mapsSimCosseno[2],
            mrr3: mrrsSimCosseno[0], mrr5: mrrsSimCosseno[1], mrr10: mrrsSimCosseno[2],
            ndgc3: ndcgsSimCosseno[0], ndgc5: ndcgsSimCosseno[1], ndgc10: ndcgsSimCosseno[2]
        },
        fc:{
            map3: mapsFC[0], map5: mapsFC[1], map10: mapsFC[2],
            mrr3: mrrsFC[0], mrr5: mrrsFC[1], mrr10: mrrsFC[2],
            ndgc3: ndcgsFC[0], ndgc5: ndcgsFC[1], ndgc10: ndcgsFC[2]
        },
        hibrido:{
            map3: mapsHib[0], map5: mapsHib[1], map10: mapsHib[2],
            mrr3: mrrsHib[0], mrr5: mrrsHib[1], mrr10: mrrsHib[2],
            ndgc3: ndcgsHib[0], ndgc5: ndcgsHib[1], ndgc10: ndcgsHib[2]
        }
    };
}

function similaridadeCosseno(apreciadosBase : Evento[], experimentoSet : Evento[]) : string[]{
    let recomendados : {id: string, similaridade : number}[] = [];
    let textoBase = "";
    for(let apreciado of apreciadosBase)
        textoBase += getTextoLimpo(apreciado.titulo);
        // textoBase += getTextoLimpo(apreciado.titulo + " " + apreciado.descricao);
    
    let texto2, simValue, i = 1;
    for(let evento of experimentoSet){
        // texto2 = getTextoLimpo(evento.titulo + " " + evento.descricao)
        texto2 = getTextoLimpo(evento.titulo)
        simValue = Cosine.cosine.similarity(textoBase,texto2);
        if(simValue >= 0.6)
            recomendados.push({id: evento.id, similaridade: simValue});
        if(i == 16 && recomendados.length == 0) //Não irá mais recomendar 10, interrompe processamento
            return [];
        i++;
    }

    recomendados = recomendados
        .sort((a,b) => a.similaridade < b.similaridade? -1 : (a.similaridade == b.similaridade? 0 : 1) );

    //console.log("\n---\n[SIMILARIDADE COSSENO]: " + recomendados.length);
    //recomendados.forEach((rec) => console.log(`${rec.id} - ${rec.similaridade}`));

    return recomendados.map(rec=> rec.id);
}

//Retorna texto sem stop words e com palavras separadas por espaço
function getTextoLimpo(texto : string) : string{
    texto = texto.toLowerCase();
    let words = texto.split(" ");
    words = words.filter((word) => !stopWords.includes(word));
    return words.reduce((word,acc) => word + " " + acc,"");
}