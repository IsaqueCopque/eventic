import { Box, Grid, Typography, Button} from "@mui/material";
import ReviewForm from "@app/components/reviewSection/reviewForm";
import ReviewCard from "@app/components/reviewSection/reviewCard";
import {SessionContextValue} from 'next-auth/react';
import { useState, useEffect } from "react";
import EditIcon from '@mui/icons-material/Edit';
import RateReviewIcon from '@mui/icons-material/RateReview';

export default function ReviewSection(
    {
    avaliacaoData,
    evento,
    session
    } : {avaliacaoData : AvaliacaoData[], evento : Evento,  session : SessionContextValue}
){
    
    const [reviewed, setReviewed] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [reviewContent, setReviewContent] = useState('');
    const [reviewGrade, setReviewGrade] = useState(3);

    const handleButtonClick = () => {
        if(!session.data?.user.id)
            setShowForm(false);
        else if(showForm)
            setShowForm(false);
        else
            setShowForm(true);
    }

    useEffect(() => {
        const alreadyReviewed = () : boolean => {
            if(avaliacaoData && avaliacaoData.length > 0) 
              for(let avaliacao of avaliacaoData)
                if(avaliacao.usuario.id == session.data?.user.id){
                    setReviewContent(avaliacao.comentario);
                    setReviewGrade(avaliacao.nota);
                    return true;
                }
            return false;
        }
        setReviewed(alreadyReviewed())
    }, [reviewed, avaliacaoData, session.data]);

    return(

        <Grid item md={12}>
         <Box sx={{ borderRadius: '0.3rem', backgroundColor: 'white', padding: '1rem', boxShadow: 3 }}>

          <Grid container spacing={6}>

            <Grid item md={12}>
                <Grid container  direction="row" justifyContent="space-between" alignItems="center">

                    <Typography variant="h5" gutterBottom>
                        Avaliações sobre {`"${evento.titulo}"`}
                    </Typography>

                    {
                        session.data?.user?
                        <>
                         {
                            reviewed?
                            <Button variant="outlined" startIcon={<EditIcon />}
                                onClick={() => handleButtonClick()}>
                                Editar sua avaliação
                            </Button>
                            :
                            <Button variant="outlined" startIcon={<RateReviewIcon />}
                                onClick={() => handleButtonClick()}>
                                Avaliar
                            </Button>
                        }  
                        </>
                        :
                        <></>
                    }

                </Grid>
            </Grid>

            {
                showForm?
                <Grid item md={12}>
                    <ReviewForm 
                        userId={session.data!.user.id} 
                        eventId={evento.id}
                        comentario={reviewContent}
                        nota={reviewGrade}
                        isEdicao={reviewed}
                        setReviewed={setReviewed}
                    />
                </Grid>
                :
                <></>
            }

            <Grid item md={12}>

              {
                avaliacaoData && avaliacaoData.length > 0?
                <Grid container spacing={1} alignItems='center'>

                  {avaliacaoData.map(avaliacao=> (
                    <Grid key={avaliacao.id} item xs={6}>
                      <ReviewCard props={avaliacao}/>
                    </Grid>
                  ))
                  }
                </Grid>
                :
               <Typography variant="body1" gutterBottom>
                    Nenhuma avaliação
                </Typography>
              }
            </Grid>

          </Grid>

          </Box>
        </Grid>

    )
}