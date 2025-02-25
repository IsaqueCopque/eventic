import type { NextApiRequest, NextApiResponse } from 'next'
import { AvaliacaoRepo, EventoRepo, UsuarioRepo} from '@app/server/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]';
import { Avaliacao } from '@app/server/entities/avaliacao.entity';
import { Usuario } from '@app/server/entities/usuario.entity';
import { Evento } from '@app/server/entities/evento.entity';

/*
*   Rota para avaliar eventos.
*   Restrição:       Usuário logado, eventos anteriores
*   Nível de acesso: Todos
*/
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<any>
) {
    /*
        Cria avaliação do evento
    */
    if(req.method === "POST"){
        const session = await getServerSession(req,res,authOptions);

        if (!session)
            res.status(401).send("É necessário estar autenticado.");
        else{
            const {evento_id, nota, comentario} = req.body;
            if(evento_id == null || nota == null){
                res.status(400).json({errorMsg: "Falta id do evento ou nota"});
                return;
            }
            else{
                let avaliacao = await AvaliacaoRepo.findOne({where: {usuario: {id: session.user.id}, evento: {id:evento_id}}});
                if(avaliacao != null){ //Atualização
                    avaliacao.comentario = comentario;
                    avaliacao.nota = nota;
                    avaliacao.updatedAt = new Date();
                }else{ //Cadastro
                    let evento = await EventoRepo.findOne({where: {id: evento_id}}) as Evento;
                    let usuario = await UsuarioRepo.findOne({where: {id: session.user.id}}) as Usuario;
                    avaliacao = new Avaliacao();
                    avaliacao.comentario = comentario;
                    avaliacao.nota = nota;
                    // @ts-ignore
                    avaliacao.usuario = usuario;
                    // @ts-ignore
                    avaliacao.evento = evento;
                    avaliacao.createdAt = new Date();
                    avaliacao.updatedAt = null;
                }
                await AvaliacaoRepo.save(avaliacao);
                res.status(200).json({msg: "Avaliação cadastrada"});
            }
        }
    }

    /*
        Exclui avaliação do evento
    */
    else if(req.method === "DELETE"){
        const session = await getServerSession(req,res,authOptions);

        if (!session)
            res.status(401).send("É necessário estar autenticado.");
        else{
            let {evento_id} = req.query;
            if(evento_id == null){
                res.status(400).json({errorMsg: "Falta id do evento"});
                return;
            }
            if(typeof evento_id === 'object')
                evento_id = evento_id[0];
            else{
                let avaliacao = await AvaliacaoRepo.findOne({where: {usuario: {id: session.user.id}, evento: {id:evento_id}}});
                if(avaliacao != null){
                    try{
                        await AvaliacaoRepo.delete(avaliacao.id);
                        res.status(200).json("Avaliação deletada com sucesso");
                    }catch (e) { res.status(500).json(e); }
                }else
                    res.status(400).json({errorMsg: `User ${session.user.id} Evento ${evento_id}`});
            }
        }
    }

    /*
        Obtém avaliações do evento
    */
    else if(req.method === "GET"){
        let {evento_id} = req.query;

        if(typeof evento_id === 'object')
            evento_id = evento_id[0];

        if(evento_id != null){  
            let evento = await EventoRepo.findOne({where: {id: evento_id}}) as Evento;
            if(evento){

                const sql = AvaliacaoRepo.createQueryBuilder("avaliacao");
                sql.leftJoinAndSelect('avaliacao.usuario','avaliador');
                sql.innerJoinAndSelect('avaliacao.evento', "evento", "evento.id = :evento_id", {evento_id: evento.id})
                sql.select(['avaliador.primeiroNome','avaliador.segundoNome', 'avaliador.id', 'avaliador.fotoPerfil', "avaliacao"]);

                const avaliacoes = await sql.getMany();
                res.status(200).json(avaliacoes);
            }
            else
                res.status(400).json({errorMsg: `Nenhum evento encontrado para o id ${evento_id}`})
        }else
            res.status(400).json({errorMsg: "Falta id do evento nos parametros"})
    }
}