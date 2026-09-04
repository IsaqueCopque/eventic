// import styles from './eventcard.module.css'
import { Box, Typography, IconButton, Grid } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ShareIcon from '@mui/icons-material/Share';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useState } from "react";
import SubscribeButton from "@app/components/subscribebutton/SubscribeButton"
import Link from 'next/link';
import styles from './eventdetails.module.css'
import ShareButton from "@app/components/sharebutton/ShareButton"
import CircularProgress from '@mui/material/CircularProgress';

interface Props {
    id: string
    initialDate: Date | string
    title: string
    location: string
    subscribeButton: boolean
    eventoId: string
    inscrito: boolean
    setIdIncricoes: React.Dispatch<React.SetStateAction<string[]>>
    idIncricoes: string[]
    isLoadingSubButton: boolean
}

export default function ListCard(props: Props) {

    const [subscribed, setSubscribed] = useState(false)


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


    return (
        <Box m={2} sx={{ display: 'flex', borderRadius: '0.3rem', backgroundColor: 'white', boxShadow: 3, padding: '1rem' }}>

            <Box mr={10} sx={{ alignSelf: 'center', marginLeft: '1rem' }}>
                <Typography variant="h5" align="center" >
                    {day}
                </Typography>
                <Typography variant="body1" gutterBottom align="center" >
                    {month}
                </Typography>
            </Box>

            <Link href={{
                pathname: '/eventos/detalhes',
                query: {
                    id: props.id
                }
            }}>
                <Box>
                    <Typography style={{ color: "black" }} component="div" variant="h5">
                        {props.title}
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary" component="div">
                        <LocationOnIcon sx={{ fontSize: '90%' }} fontSize='small' /> {props.location}
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary" component="div">
                        <AccessTimeIcon sx={{ fontSize: '90%' }} fontSize='small' /> {diaSemana}, {horario}h
                    </Typography>
                </Box>
            </Link>

            <Box sx={{ display: 'flex', flexDirection: 'column', marginLeft: 'auto' }}>
                {props.subscribeButton && (props.isLoadingSubButton ? <CircularProgress size={28} /> : <SubscribeButton eventoId={props.eventoId} inscrito={props.inscrito} setIdIncricoes={props.setIdIncricoes} idIncricoes={props.idIncricoes} />)}
                
                <Box sx={{ marginTop: 'auto' }} >
                    <ShareButton url={process.env.NEXT_PUBLIC_URL + "/eventos/detalhes?id=" + props.id} />
                </Box>
            </Box>
        </Box >
    );
}