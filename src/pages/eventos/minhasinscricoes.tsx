import { CategoriaAPI } from '@app/apis/CategoriaAPI';
import { UsuarioAPI } from '@app/apis/UsuarioAPI';
import Home from '@app/components/home';
import { Evento } from '@app/server/entities/evento.entity';
import { GetServerSideProps } from 'next';
import { getServerSession } from "next-auth";
import { Categoria, EventoComRecomendacoes } from '../../../app';
import { authOptions } from "../api/auth/[...nextauth]";

export default function MinhasInscricoes({ eventos, categorias, userId }: { eventos: EventoComRecomendacoes[], categorias: Categoria[], userId : string | null }) {
  return ( <Home eventos={eventos} home={false} categorias={categorias} userId={userId}></Home> );
};

export const getServerSideProps: GetServerSideProps = async ({query, req,res }) => {
  const session = await getServerSession(req, res, authOptions);

  const categorias = await CategoriaAPI.getCategorias();
  
  let eventos : Evento[];
  
  eventos = await UsuarioAPI.getEventosInscritosUsuarioLogado();

  return {
      props: {
          eventos: {eventos, recomendacoes: []},
          categorias,
          userId: session != null? session.user.id : null
      },
  }
}
