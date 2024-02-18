import { Box, Button, Grid, Tooltip,SvgIcon } from "@mui/material";
import styles from './detalhes.module.css'
import Typography from "@mui/material/Typography";
import IconButton from '@mui/material/IconButton';
import Image from 'next/image';
import PlaceIcon from '@mui/icons-material/Place';
import { useEffect, useState } from "react";
import { getServerSession } from "next-auth";
import { useSession } from "next-auth/react";
import SubscribeButton from "@app/components/subscribebutton/SubscribeButton"
import ShareButton from "@app/components/sharebutton/ShareButton"
import RecommendationSection from "@app/components/recommendationSection";
import { EventoAPI } from "@app/apis/EventoAPI";
import { authOptions } from "../api/auth/[...nextauth]";

import { GetServerSideProps } from 'next';

import moment from 'moment';
import CircularProgress from '@mui/material/CircularProgress';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from "next/link";

import MyIcon from './logoCalendar.svg';
import ReviewSection from "@app/components/reviewSection";
import { AvaliacaoData, Evento, RecomendacaoObj } from "../../../app";

const CustomIcon = (props: React.ComponentProps<typeof SvgIcon>) => (
  <SvgIcon {...props}>
    <MyIcon />
  </SvgIcon>
);


function EventDetails({ eventoData, avaliacaoData, recomendacaoData } : 
  { eventoData: Evento[], avaliacaoData: AvaliacaoData[], recomendacaoData : RecomendacaoObj}) {

  const [isLoading, setIsLoading] = useState(false);

  const handleLinkClick = () => {
    setIsLoading(true);
  };

  const session = useSession();

  const [subscribed, setSubscribed] = useState(false)

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  function getData(d: string, x: string) {
    if (d === null) {
      return null
    }
    const date = new Date(d)
    const day = date.getDate()
    const month = meses[date.getMonth()]
    const year = date.getFullYear()
    const horario = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `${x}: ${day} de ${month} de ${year} | ${horario}`
  }

  let defaultImage = "/images/default.png"
  const imagemPrincipal = eventoData[0]?.imagemUrl || '';

  const handleErro = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    event.currentTarget.src = defaultImage;
  };

  const dataInicialOriginal = moment(eventoData[0].dataInicial)
  const dataInicial = dataInicialOriginal.format('YYYYMMDDTHHmmssZ')

  const dataFinalOriginal = moment(eventoData[0].datafinal)
  const dataFinal = dataFinalOriginal.format('YYYYMMDDTHHmmssZ')

  const addAgenda = `
  https://calendar.google.com/calendar/u/0/r/eventedit?
  &text=${eventoData[0].titulo}
  &dates=${dataInicial}/${dataFinal}
  &details=${encodeURIComponent(eventoData[0].descricao)}
  &location=${eventoData[0].localizacao}
  `

  // Roda a roda de loading enquanto espera carrega o estado do evento, se esta ou nao inscrito
  const [isLoadingSubButton, setIsLoadingSubButton] = useState(false);

  // Controla a lista de eventos inscritos
  let [idIncricoes, setIdIncricoes] = useState<string[]>([])
  const getUserEvents = async () => {
    setIsLoadingSubButton(true)
    const api = process.env.NEXT_PUBLIC_URL;

    // Pega os Eventos do usuário
    const res = await fetch(`${api}/api/usuarios/eventos`);
    const data: Promise<Evento[] | { errorMsg: string }> = await res.json();


    let listId: string[] = []
    if (Array.isArray(data)) {
      listId = data.map(evento => evento.id)
    }
    setIdIncricoes(listId)
    setIsLoadingSubButton(false)
  };

  useEffect(() => {
    getUserEvents()
  }, []);

  return (

    <Box mt={5}>
      {isLoading ? <CircularProgress sx={{ marginBottom: '1rem' }} size={32}/> :
        <Link href='/eventos'>
          <Button onClick={handleLinkClick} sx={{ marginBottom: '1rem' }} startIcon={<ArrowBackIcon />}>
            Voltar
          </Button>
        </Link>
      }
      <Typography sx={{ borderRadius: '0.3rem', backgroundColor: 'white', boxShadow: 3, padding: '1rem' }} variant="h5" mb={3}>
        {eventoData[0].titulo}
      </Typography>
      <Grid container spacing={3}>
        <Grid item md={4}>
          <Box sx={{ boxShadow: 0 }}>
            <Image
              height={600}
              width={600}
              className={styles.img}
              src={imagemPrincipal}
              alt='evento-imagem'
              unoptimized
              onError={handleErro}
            />
          </Box>

          <Box mt={2} sx={{ borderRadius: '0.3rem', backgroundColor: 'white', boxShadow: 3 }}>
            <Typography variant="h4" align="center" >
              {subscribed ? eventoData[0].qtInscricoes + 1 : eventoData[0].qtInscricoes}
            </Typography>
            <Typography variant="body1" gutterBottom align="center" >
              Interessado(s)
            </Typography>
          </Box>
        </Grid>
        <Grid item md={8}>
          <Box sx={{ borderRadius: '0.3rem', backgroundColor: 'white', padding: '1rem', boxShadow: 3 }}>
            <Typography variant="h6" gutterBottom>
              Descrição
            </Typography>
            <Typography sx={{ textAlign: 'justify' }} variant="body1" gutterBottom>
              {eventoData[0].descricao}
            </Typography>
          </Box >

          <Box mt={3} mb={3} sx={{ borderRadius: '0.3rem', backgroundColor: 'white', padding: '1rem', boxShadow: 3 }}>
            <Typography variant="h6" gutterBottom>
              Detalhes
            </Typography>
            <Typography variant="body2" gutterBottom>
              {getData(eventoData[0].dataInicial, 'Início')}
              <Tooltip title="Adicionar a agenda">
                <IconButton target="_blank" href={addAgenda} aria-label="calendar">
                  <CustomIcon/>
                </IconButton>
              </Tooltip>
            </Typography>
            <Typography variant="body2" gutterBottom>
              {getData(eventoData[0].datafinal, 'Fim')}
            </Typography>
            <Typography variant="body2" gutterBottom>
              Local: {eventoData[0].localizacao}
              <Tooltip title="Ver no mapa">
                <IconButton target="_blank" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventoData[0].localizacao)}`} aria-label="location ">
                  <PlaceIcon />
                </IconButton>
              </Tooltip>
            </Typography>
            {eventoData[0].linkMaisInformacoes ?
              <Typography variant="body2" gutterBottom>
                Mais informacões: <a target="_blank" href={eventoData[0].linkMaisInformacoes || 'www.google.com'}>{eventoData[0].linkMaisInformacoes}</a>
              </Typography> : <></>
            }

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              {new Date(eventoData[0].dataInicial).getTime() >= Date.now() && (isLoadingSubButton ? <CircularProgress size={28} /> : <SubscribeButton eventoId={eventoData[0].id} inscrito={idIncricoes.includes(eventoData[0].id)} />)}
              <ShareButton url={process.env.NEXT_PUBLIC_URL + "/eventos/detalhes?id=" + eventoData[0].id} />
            </Box>
          </Box>

          <Box mt={3} mb={3} sx={{ borderRadius: '0.3rem', backgroundColor: 'white', padding: '1rem', boxShadow: 3 }}>
            <iframe
              src={`https://maps.google.com/maps?&q=${encodeURIComponent(eventoData[0].localizacao)}&output=embed`}
              style={{ width: '100%', height: '300px' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe> 
          </Box>
        </Grid>

        {/* @ts-ignore */}
        <RecommendationSection recommendationData = { recomendacaoData }  mainEvent = {eventoData[0]}
          inHomePage={false}
          userId = {session.data?.user.id? session.data.user.id : ''}
          />
       
        <ReviewSection 
        avaliacaoData={avaliacaoData} 
        evento={eventoData[0]} 
        session={session}
        />

      </Grid>
    </Box>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ query, req,res }) => {
  const session = await getServerSession(req, res, authOptions);
  let id = query.id;
  if(Array.isArray(id))
    id = id[0];
  else if(typeof id === 'undefined')
    id = '';

  const eventoData = await EventoAPI.get(id);
  const avaliacaoData = await EventoAPI.getAvaliacoes(id);

  const responseData = 
  session != null?
    await EventoAPI.getRecomendacoes(id, session.user.id,false) 
    : 
    await EventoAPI.getRecomendacoes(id, null,false);
  
  return {
    props: {
      eventoData,
      avaliacaoData,
      recomendacaoData: responseData,
    },
  };
};

export default EventDetails;