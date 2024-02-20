import React, { useState } from 'react';
import { Box, Grid, Typography, Card} from "@mui/material";
import RecommendedEventCard from './recommendedEventCard/index';

import Image from 'next/image'
import Link from 'next/link';
import { RecomendacaoAPI } from '@app/apis/RecomendacaoAPI';
import { Evento } from '@app/server/entities/evento.entity';
import { RecomendacaoObj } from '../../../app';

export default function RecommendationSection({recommendationData, inHomePage, mainEvent, userId} : 
    {recommendationData : RecomendacaoObj, inHomePage : boolean, mainEvent : Evento, userId : string}){

    //Indica se já foi persistida uma recomendação para a instância de recomendação atual
    // const [recAlredyStored, setRecAlredyStored] = useState(false);
    const [recommendationId, setRecommendationId] = useState(null);
    const tipoRecomendacao = recommendationData.tipoRecomendacao;
    const recomendados = recommendationData.recomendacoes;

    const storeRec = async (nota : number) => {
        if(!recommendationId){
            let res = await RecomendacaoAPI.cadastrar(userId, tipoRecomendacao, nota, recomendados.map(evento => evento.id));                        
            // setRecAlredyStored(true);
            setRecommendationId(res.id);
        }else{
            await RecomendacaoAPI.updateRecomendacao(recommendationId);
        }
    }

    if(inHomePage){ //Seção de recomendação na home page

        while(recomendados.length > 4)//limita a 4 eventos
            recomendados.pop()

        return(
            <Box sx={{ borderRadius: '0.3rem', backgroundColor: 'white', padding: '1rem', boxShadow: 3, maxHeight: "220px" }}>
                <Typography variant="h6" gutterBottom>
                    Eventos Similares a {mainEvent.titulo + " / " + tipoRecomendacao} 
                </Typography>
                <Grid container spacing={3}>
                    {
                        recomendados.map((rec) =>(
                        <Grid item xs={3} key={rec.id} title={rec?.titulo} >
                            <Link href={{ pathname: '/eventos/detalhes',query: {id: rec.id}}}>
                                <Card sx={{ display: 'flex', boxShadow: 3, 
                                    flexDirection:'column', flexGrow: 1 }}>
                                    <Box sx={{alignSelf: 'center'}}>
                                            <Image
                                            height={180}
                                            width={200}
                                            src={rec?.imagemUrl || ''}
                                            alt='evento-imagem'
                                            unoptimized
                                            onError={(event)=>event.currentTarget.src = "/images/default.png"}
                                            />
                                    </Box>
                                </Card>
                            </Link>
                        </Grid>
                        ))
                    }
                </Grid>
            </Box>
        )
    }

    //se na seção de detalhes do evento
    while(recomendados.length > 5)//limita a 5 eventos
        recomendados.pop()
    return(
        <Grid item md={12}>
            <Box sx={{ borderRadius: '0.3rem', backgroundColor: 'white', padding: '1rem', boxShadow: 3 }}>
                <Typography variant="h5" gutterBottom>
                    Recomendações de eventos similares
                </Typography>

                {/* <Grid container spacing={3} */}

                {recomendados.length != 0?
                    <Grid container justifyContent={"space-evenly"}>
                        {recomendados.map((rec) => <RecommendedEventCard key={rec.id} eventData={rec} userId={userId} storeRec={storeRec} /> )}
                    </Grid>
                :
                <Typography variant='body1'>
                    Nenhum evento similar.
                </Typography>
                }

            </Box>
        </Grid>
    )
}