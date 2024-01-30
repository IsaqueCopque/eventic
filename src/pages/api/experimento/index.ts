import type { NextApiRequest, NextApiResponse } from 'next'
import { AvaliacaoRepo, EventoRepo, ParametroRepo, CategoriaRepo, UsuarioRepo } from '@app/server/database';
import { Evento } from '@app/server/entities/evento.entity';
import { findEventosDiversos } from '../eventos/recomendar';
import { Avaliacao } from '@app/server/entities/avaliacao.entity';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<any>
) {
    if(req.method === "GET"){
        let {usuario_id }  = req.query ;
        usuario_id = usuario_id as string;
        const usuario = await UsuarioRepo.findOne({where : {id: usuario_id}});
        
        if(!usuario){
            res.status(400).json({errorMsg: "Id não corresponde a nenhum usuário"})
        }else{
            let eventosAvaliadosIds = await  AvaliacaoRepo.createQueryBuilder("avaliacao")
                .select(["avaliacao.evento_id"])
                .where("avaliacao.usuario_id = :userId", {userId: usuario_id})
                .getRawMany();
            eventosAvaliadosIds.forEach((evento, index) => eventosAvaliadosIds[index] = evento.evento_id);

            let eventosNaoAvaliados = await EventoRepo.createQueryBuilder("evento")
                .where('evento.id NOT IN (:...ids)', {ids: eventosAvaliadosIds})
                .limit(20)
                .getMany();

            let eventosApreciados = await EventoRepo.createQueryBuilder("evento")
            .innerJoin(Avaliacao, 'avaliacao', 'avaliacao.evento_id = evento.id')
            .where("avaliacao.usuario_id = :userId AND avaliacao.nota >= 4 AND evento.id = avaliacao.evento_id", {userId: usuario_id})
            .limit(5)
            .getMany();

            let conjuntoRecomendacao = eventosNaoAvaliados.concat(eventosApreciados);
            

            // console.log(`[DEBUG]: eventosAvaliados IDS \n ${eventosAvaliadosIds}\n`);
            // console.log(`[DEBUG]: eventosNaoAvaliados : `);
            // eventosNaoAvaliados.forEach(evento => console.log(`id = ${evento.id} titulo = ${evento.titulo}`));
            // console.log(`\n[DEBUG]: eventosapreciados`)
            // eventosApreciados.forEach(evento => console.log(`id = ${evento.id} titulo = ${evento.titulo}`));

            res.status(200).json({ok: "ok"});
        }

    }
}