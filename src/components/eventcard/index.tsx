// import styles from './eventcard.module.css'
import { Box, Card, CardMedia, CardContent, Typography, IconButton } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ShareIcon from '@mui/icons-material/Share';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useEffect, useState } from "react";
import SubscribeButton from "@app/components/subscribebutton/SubscribeButton"
import Link from 'next/link';
import ShareButton from "@app/components/sharebutton/ShareButton"
import CircularProgress from '@mui/material/CircularProgress';

interface Props {
    id: string
    initialDate: Date
    image: string
    title: string
    location: string
    subscribeButton: boolean
    eventoId: string
    inscrito: boolean
    setIdIncricoes: React.Dispatch<React.SetStateAction<string[]>>
    idIncricoes: string[]
    isLoadingSubButton: boolean
}

export default function EventCard(props: Props) {

    const meses = [
        "JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ",
    ];

    const dias = [
        "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado",
    ];

    const data = new Date(props.initialDate)
    const day = data.getDate()
    const month = meses[data.getMonth()]
    const diaSemana = dias[data.getDay()]
    const horario = data.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let defaultImage = "/images/default.png"
    const imagemPrincipal = props.image || '';

    const handleErro = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
        event.currentTarget.src = defaultImage;
    };

    return (

        <Card sx={{ display: 'flex', maxWidth: '420px', boxShadow: 3, flexGrow: 1, height: '240px' }}>
            <Box sx={{ alignSelf: 'center' }}>
                <Link href={{
                    pathname: '/eventos/detalhes',
                    query: {
                        id: props.id
                    }
                }}>
                    <CardMedia
                        component="img"
                        sx={{ width: 150, height: 150, objectFit: 'contain' }}
                        image={imagemPrincipal}
                        alt="evento-image"
                        onError={handleErro}
                    />
                </Link>
            </Box>

            <Box sx={{display:'flex',flexDirection:'column', flexGrow: 1 }} >
                <CardContent>
                    <Link style={{ color: "black" }} href={{
                        pathname: '/eventos/detalhes',
                        query: {
                            id: props.id
                        }
                    }}>
                        <Typography component="div" variant="h5" style={{textOverflow: 'clip', maxHeight: '80%'}}>
                            {props.title}
                        </Typography>
                    </Link>

                    <Box mt={2} sx={{ display: 'flex', gap: '1rem' }}>
                        <Box>
                            <Typography variant="h5" align="center" >
                                {day}
                            </Typography>
                            <Typography variant="body1" gutterBottom align="center" >
                                {month}
                            </Typography>
                        </Box>
                        <Box>

                            <Typography variant="subtitle1" color="text.secondary" component="div">
                                <LocationOnIcon sx={{ fontSize: '90%' }} fontSize='small' /> {props.location}
                            </Typography>
                            <Typography variant="subtitle1" color="text.secondary" component="div">
                                <AccessTimeIcon sx={{ fontSize: '90%' }} fontSize='small' /> {diaSemana}, {horario}h
                            </Typography>
                        </Box>
                    </Box>

                </CardContent>
                <Box mb={1} sx={{ display: 'flex', justifyContent: 'flex-end', marginRight: '0.5rem',marginTop:'auto' }}>
                    {props.subscribeButton && (props.isLoadingSubButton ? <CircularProgress size={28}/> : <SubscribeButton eventoId={props.eventoId} inscrito={props.inscrito} setIdIncricoes={props.setIdIncricoes} idIncricoes={props.idIncricoes} />)}
                    <ShareButton url={process.env.NEXT_PUBLIC_URL + "/eventos/detalhes?id=" + props.id} />
                </Box>
            </Box>

        </Card>
    );
}