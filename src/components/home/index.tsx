import EventCard from "@app/components/eventcard";
import EventList from "@app/components/eventlist";
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import { Box, Button, FormControl, Grid, IconButton, InputBase, InputLabel, MenuItem, Paper } from "@mui/material";
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Tab from '@mui/material/Tab';
import Typography from "@mui/material/Typography";
import moment from 'moment';
import 'moment/locale/pt-br';
import { useEffect, useState } from "react";

import { getCookie, setCookie } from '@app/utils/cookieUtils';
import CircularProgress from '@mui/material/CircularProgress';
import useMediaQuery from '@mui/material/useMediaQuery';

import { UsuarioAPI } from "@app/apis/UsuarioAPI";
import { useNavigate } from "react-router-dom";
import { Categoria, EventoComRecomendacoes, PeriodosComEventosRecomendacoes } from '../../../app';
import RecommendationSection from '../recommendationSection';

export default function Home({ eventos, categorias, home, userId }: { eventos: EventoComRecomendacoes[], categorias: Categoria[], home: boolean, userId : string | null }) {

    // Controla o filtro de periodo
    const [periodo, setPeriodo] = useState('1');

    // Controla a visualização lista/card
    const [listView, setListView] = useState(false)

    // Controla as abas Novos/Anteriores
    const [aba, setAba] = useState('1')
    const [eventosPosteriores, setEventosPosteriores] = useState<PeriodosComEventosRecomendacoes[]>([]);
    const [eventosAnteriores, setEventosAnteriores] = useState<PeriodosComEventosRecomendacoes[]>([]);

    // Controla o valor do campo de pesquisa
    const [inputValue, setInputValue] = useState('');

    // Roda a roda de loading enquanto espera o resultado da busca
    const [isLoading, setIsLoading] = useState(false);

    // Roda a roda de loading enquanto espera carregar o estado do evento, se esta ou nao inscrito
    const [isLoadingSubButton, setIsLoadingSubButton] = useState(false);

    // Loading meus eventos
    const [isLoadingMeusEventos, setIsLoadingMeusEventos] = useState(false);

    // Controla a lista de eventos inscritos
    let [idIncricoes, setIdIncricoes] = useState<string[]>([])

    moment.locale('pt-br');

    const navigate = useNavigate();

    function ordenaEventosPorPeriodo(valorPeriodo : string) : void{
        //Ordena os eventos da aba selecionada,anteriores ou posteriores
        let nomePeriodo : string;

        let eventosOrdenados =  aba == '1'?
            eventos.filter(evento => new Date(evento.evento.dataInicial).getTime() < Date.now())
            :
            eventos.filter(evento => new Date(evento.evento.dataInicial).getTime() >= Date.now());

        eventosOrdenados = eventosOrdenados.sort((a :EventoComRecomendacoes , b : EventoComRecomendacoes) => new Date(a.evento.dataInicial).getTime() - new Date(b.evento.dataInicial).getTime())

        const periodosMap =  new Map<string,EventoComRecomendacoes[]>();

        if(valorPeriodo == '3')//Por dia
            periodosMap.set('',eventosOrdenados);
        else if(valorPeriodo == '2'){//Por semana
            let dataInicioSemana, dataFimSemana;
            let semana;
            for(let evento of eventosOrdenados){
                dataInicioSemana = moment(evento.evento.dataInicial).startOf('week').format('D [de] MMMM');
                dataFimSemana = moment(evento.evento.dataInicial).add(6, 'days').format('D [de] MMMM');
                nomePeriodo = `Semana de ${dataInicioSemana} a ${dataFimSemana}`;
                semana = periodosMap.get(nomePeriodo);
                if(semana)
                    periodosMap.set(nomePeriodo, semana.concat(evento));
                else 
                    periodosMap.set(nomePeriodo,[evento]);
            }
        }else if(valorPeriodo == '3'){//Por mês
            let mes;
            for(let evento of eventosOrdenados){
                nomePeriodo = moment(evento.evento.dataInicial).format('MMMM YYYY');
                mes = periodosMap.get(nomePeriodo);
                if(mes)
                    periodosMap.set(nomePeriodo, mes.concat(evento));
                else 
                    periodosMap.set(nomePeriodo,[evento]);
            }
        }

        const eventosPorPeriodos : PeriodosComEventosRecomendacoes[] = [];
        periodosMap.forEach((valor,chave) => eventosPorPeriodos.push({periodo: chave, eventosRecomendacoes: valor}));

        if(aba == '1')
            setEventosPosteriores(eventosPorPeriodos);
        else
            setEventosPosteriores(eventosPorPeriodos);
    }

    // Ao carregar o componente
    useEffect(() => {
        //Recupera os valores de opções de visualização das variáveis do cookie
        const list = getCookie('listView')
        const savedlistView = list ? JSON.parse(list) : false;
        const savedPeriod = getCookie('periodo')
        if (savedlistView) 
            setListView(savedlistView);
        if (savedPeriod) 
            setPeriodo(savedPeriod);

        //Divide por período
        ordenaEventosPorPeriodo(savedPeriod || periodo);
        //Obtém ids dos eventos avalidos pelo usuário
        getUsuarioEventosIds();
    }, []);

    function handlePeriodChange(event: SelectChangeEvent) {
        const novoPeriodo = event.target.value;
        setPeriodo(novoPeriodo);
        ordenaEventosPorPeriodo(novoPeriodo);
        setCookie('periodo', novoPeriodo);
    }

    function handleCategoriaChange(event: SelectChangeEvent) {
        const idCategoria = event.target.value
        navigate(`/eventos?categoriaId=${idCategoria}`);
    }

    // Redireciona para fazer busca na api
    const handleClick = async () => {
        navigate(`/eventos?q=${inputValue}`)
    };

    //Obtém Ids dos eventos que o usuário logado se inscreveu
    const getUsuarioEventosIds = async () => {
        setIsLoadingSubButton(true)
        const res =  await UsuarioAPI.getEventosInscritosUsuarioLogado();
        let listId: string[] = []
        if (Array.isArray(res)) {
            listId = res.map(evento => evento.id)
        }
        setIdIncricoes(listId)
        setIsLoadingSubButton(false)
    };

    function limpaBusca() {
        setInputValue('')
    }

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Evita que o evento padrão de tecla Enter ocorra
            await handleClick(); // Realiza a busca quando a tecla Enter é pressionada
        }
    };

    const events = (eventList: PeriodosComEventosRecomendacoes[], hasSubscribeButton: boolean) =>
    (
        eventList.map((eventoPeriodoRec) =>
            <div key={eventoPeriodoRec.periodo}>
                {listView ?
                    <div key={eventoPeriodoRec.periodo}>
                        <Typography variant="h5" mt={8} mb={3}>{eventoPeriodoRec.periodo}</Typography>
                        {eventoPeriodoRec.eventosRecomendacoes.map((eventoRec) =>
                            <div key={eventoRec.evento.id}>
                                <EventList isLoadingSubButton={isLoadingSubButton} idIncricoes={idIncricoes} setIdIncricoes={setIdIncricoes} inscrito={idIncricoes.includes(eventoRec.evento.id)} key={eventoRec.evento.id} eventoId={eventoRec.evento.id} id={eventoRec.evento.id} subscribeButton={hasSubscribeButton} title={eventoRec.evento.titulo} location={eventoRec.evento.localizacao} initialDate={eventoRec.evento.dataInicial}  />
                            </div>
                        )}
                    </div> 
                    :
                    <div key={eventoPeriodoRec.periodo}>
                        <Typography variant="h5" mt={8} mb={3}>{eventoPeriodoRec.periodo}</Typography>


                        {/* Recomendações apenas para eventos futuros */}
                        {aba == '1'? 
                            // Eventos FUTUROS
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '1rem'}}>
                                {eventoPeriodoRec.eventosRecomendacoes.map((eventoRec) =>
                                    (
                                    <Grid container direction="row" alignItems="center" spacing={2} key={eventoRec.evento.id}> 
                                        <Grid item  xs={4}>
                                            <EventCard isLoadingSubButton={isLoadingSubButton} idIncricoes={idIncricoes} setIdIncricoes={setIdIncricoes} inscrito={idIncricoes.includes(eventoRec.evento.id)} key={eventoRec.evento.id} eventoId={eventoRec.evento.id} id={eventoRec.evento.id} subscribeButton={hasSubscribeButton} image={eventoRec.evento.imagemUrl} title={eventoRec.evento.titulo} location={eventoRec.evento.localizacao} initialDate={eventoRec.evento.dataInicial} />
                                        </Grid>
                                        <Grid item xs={8}>
                                            <RecommendationSection recommendationData={eventoRec.recomendacoes} inHomePage={true} mainEvent={eventoRec.evento} userId = {''} tipoRecomendacao={0}/>
                                        </Grid>
                                    </Grid>
                                    )
                                    )
                                }
                            </Box>
                            :
                            //Eventos Anteriores
                            <Grid container direction="row" alignItems="center" spacing={2}>
                                {eventoPeriodoRec.eventosRecomendacoes.map((eventoRec) =>
                                    (
                                        <Grid item xs={4} key={eventoRec.evento.id}>
                                            <EventCard isLoadingSubButton={isLoadingSubButton} idIncricoes={idIncricoes} setIdIncricoes={setIdIncricoes} inscrito={idIncricoes.includes(eventoRec.evento.id)} key={eventoRec.evento.id} eventoId={eventoRec.evento.id} id={eventoRec.evento.id} subscribeButton={hasSubscribeButton} image={eventoRec.evento.imagemUrl} title={eventoRec.evento.titulo} location={eventoRec.evento.localizacao} initialDate={eventoRec.evento.dataInicial} />
                                        </Grid>
                                    )
                                    )
                                }
                            </Grid>
                        }
                    </div>
                }
            </div>
        )
    )

    const mobile = useMediaQuery('(max-width: 720px)');
    return (
        <Box mt={5} style={{marginTop: '3rem'}}>
            {home &&
                <Box sx={{ borderRadius: '0.3rem', backgroundColor: 'white', boxShadow: 3 }}>
                    <Paper
                        component="form"
                        sx={{ display: 'flex', alignItems: 'center', padding: '1rem', }}
                    >
                        {isLoading ? <CircularProgress /> :
                            <IconButton onClick={handleClick} type="button" aria-label="search">
                                <SearchIcon />
                            </IconButton>
                        }
                        <InputBase
                            onKeyDown={handleKeyDown}
                            value={inputValue}
                            onChange={(e) => { setInputValue(e.target.value) }}
                            sx={{ ml: 1, flex: 1 }}
                            placeholder="Filtre pelo nome do evento"
                            inputProps={{ 'aria-label': 'busca de eventos' }}
                        />
                    </Paper>
                </Box>
            }
            {home &&
                <Button onClick={limpaBusca} variant="text">Limpar Busca</Button>
            }
            {/* flexDirection: 'column',alignItems:'flex-start' */}
            <Box mt={2} sx={{ borderRadius: '0.3rem', backgroundColor: 'white', padding: '1rem', boxShadow: 3 }}>
                <Box mb={2} sx={{ display: 'flex', flexWrap: 'wrap', flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'flex-start' : 'center', gap: '0.5rem' }}>
                    <Typography sx={{ marginRight: 'auto' }} variant="h3">{home ? 'Eventos' : 'Meus eventos'}</Typography>
                    <FormControl variant="standard" sx={{ m: 1, minWidth: 150 }}>
                        <InputLabel id="demo-simple-select-label">Período</InputLabel>
                        <Select
                            inputProps={{ MenuProps: { disableScrollLock: true } }}
                            labelId="demo-simple-select-label"
                            id="demo-simple-select"
                            value={periodo}
                            label="Período"
                            onChange={handlePeriodChange}
                        >
                            <MenuItem value={1}>Dia</MenuItem>
                            <MenuItem value={2}>Semana</MenuItem>
                            <MenuItem value={3}>Mês</MenuItem>
                        </Select>
                    </FormControl>
                    {home &&
                        <FormControl variant="standard" sx={{ m: 1, minWidth: 150 }}>
                            <InputLabel id="demo-simple-select-label">Categoria</InputLabel>
                            <Select
                                inputProps={{ MenuProps: { disableScrollLock: true } }}
                                labelId="demo-simple-select-label"
                                id="demo-simple-select"
                                // value={categoria}
                                label="Categoria"
                                onChange={handleCategoriaChange}
                            >
                                <MenuItem value='Todas'>Todas</MenuItem>
                                {categorias && categorias.map((categoria) =>
                                    <MenuItem key={categoria.id} value={categoria.id}>{categoria.nome}</MenuItem>
                                )}
                            </Select>
                        </FormControl>
                    }
                    <Box sx={{ marginLeft: '0.5rem' }}>
                        <ViewModuleIcon onClick={() => { setListView(false); setCookie('listView', 'false'); }} sx={{ color: 'black', opacity: listView ? 0.5 : 1, alignSelf: 'center', cursor: 'pointer', border: '1px solid', marginRight: '0.5rem', borderColor: listView ? 'gray' : 'black', borderRadius: '4px' }} fontSize="large" />

                        <ViewListIcon onClick={() => { setListView(true), setCookie('listView', 'true'); }} sx={{ color: 'black', opacity: listView ? 1 : 0.5, alignSelf: 'center', cursor: 'pointer', border: '1px solid', marginRight: '0.5rem', borderColor: listView ? 'black' : 'gray', borderRadius: '4px' }} fontSize="large" />
                    </Box>
                </Box>
                {isLoadingMeusEventos ?
                (<Grid container alignItems='center' justifyContent='center' sx={{height:'20vh'}}>
                    <CircularProgress size={100} /> 
                </Grid>):
                   (<Box>
                        <TabContext value={aba}>
                            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                                <TabList onChange={(e, newValue) => { setAba(newValue) }}>
                                    <Tab label='Próximos' value='1'></Tab>
                                    <Tab label='Anteriores' value='0'></Tab>
                                </TabList>

                            </Box>

                            <TabPanel sx={{ padding: 0 }} value='0'>
                                {events(eventosAnteriores, false)}
                            </TabPanel>

                            <TabPanel sx={{ padding: 0 }} value='1'>
                                {events(eventosPosteriores, true)}
                            </TabPanel>
                        </TabContext>
                    </Box>)
                }
            </Box>
        </Box>

    )
}
