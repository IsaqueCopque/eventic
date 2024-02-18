import { CategoriaAPI } from '@app/apis/CategoriaAPI';
import { EventoAPI } from '@app/apis/EventoAPI';
import Home from '@app/components/home';
import { Evento } from '@app/server/entities/evento.entity';
import { GetServerSideProps } from 'next';
import { getServerSession } from "next-auth";
import { Categoria, EventoComRecomendacoes } from '../../../app';
import { authOptions } from "../api/auth/[...nextauth]";

const NUMERO_EVENTOS_PAGINA = 15;

export default function HomePage({ eventos, categorias, userId }: { eventos: EventoComRecomendacoes[], categorias: Categoria[], userId : string | null }) {
    return (
            <Home eventosData={eventos} categorias={categorias} home={true} userId={userId}></Home>
    )
}

export const getServerSideProps: GetServerSideProps = async ({query, req,res }) => {
    const session = await getServerSession(req, res, authOptions);
    let categoriaId = query.categoriaId, buscaTexto = query.q;

    const categorias = await CategoriaAPI.getCategorias();
    
    let eventos : Evento[];
    
    if(categoriaId){
        categoriaId = categoriaId as string;
        eventos = await EventoAPI.getByCategoria(categoriaId);
    }
    else if(buscaTexto){
        buscaTexto = buscaTexto as string;
        eventos = await EventoAPI.getByQ(buscaTexto);
    }
    else{
        eventos = await EventoAPI.findLast(0,NUMERO_EVENTOS_PAGINA);
    }
    
    let data;
    const eventosComRecs : EventoComRecomendacoes[] = [];
    for(let evento of eventos){
        data = session != null?
            await EventoAPI.getRecomendacoes(evento.id, session.user.id,true) 
            : 
            await EventoAPI.getRecomendacoes(evento.id, null,true);
        eventosComRecs.push({evento: evento, recomendacoes: data})
    }

    return {
        props: {
            eventos: eventosComRecs,
            categorias,
            userId: session != null? session.user.id : null
        },
    }
}
