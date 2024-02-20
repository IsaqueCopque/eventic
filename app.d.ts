import { Evento } from "@app/server/entities/evento.entity"
import { EventoRecomendado } from "@app/server/entities/eventorecomendacao.entity"

declare module 'bcrypt';

interface Evento {
    id: string
    descricao: string
    localizacao: string
    dataInicial: string
    titulo: string
    destaque: boolean
    imagemUrl: string
    createdAt: string
    updatedAt: string
    datafinal: string
    tipo: string
    linkMaisInformacoes: string
    qtInscricoes: number
    avaliacoes: []
}

interface RecomendacaoObj{
    tipoRecomendacao: number;
    recomendacoes: Evento[];
}

interface EventoComRecomendacoes{
    evento: Evento;
    recomendacoes: RecomendacaoObj;
}

interface PeriodosComEventosRecomendacoes{
    periodo: string;
    eventosRecomendacoes: EventoComRecomendacoes[] 
}

interface Categoria {
    id: string
    nome: string
    icone: string
}

interface ListaCategorias {
    [key: string]: ObjetoCategoria;
}

interface AvaliacaoPostRequest {
    nota: number,
    comentario?: string,
    usuario_id: string,
    evento_id: string
}

interface EventoPostRequest {
    descricao: string,
    localizacao: string,
    data_inicial: string,
    titulo: string,
    destaque?: string,
    imagem?: string,
    data_final?: string,
    imagem_url: string,
    tipo: string,
    usuario_id: string,
    link_mais_informacoes?: string,
    categoria_id?: number    
}

interface EventoPutRequest {
    id: string,
    descricao: string,
    localizacao: string,
    data_inicial: string,
    titulo: string,
    destaque?: string,
    imagem?: string,
    data_final?: string,
    imagem_url: string,
    tipo: string,
    usuario_id: string,
    link_mais_informacoes?: string,
    categoria_id?: number    
}


interface LoginRequest {
    email: string;
    password: string;
}

interface RecuperarSenhaRequest {
    email: string;
}

interface AlterarSenhaRequest {
    senha: string;
    id: string;
}

interface FormFieldState { 
    value?: string | dayjs.Dayjs | File; 
    validators?: any[]; 
    valid?: boolean; 
    errorMessage?: string 
}

interface ValidatorResponse {
    isValid: boolean;
    errorMessage: string;
}

interface UsuarioPostRequest {
    primeiro_nome: string,
    segundo_nome: string,
    email: string,
    senha: string,
    permissao: Permissao,
    foto_perfil: string
}


interface UsuarioPutRequest {
    id: string,
    primeiroNome: string,
    segundoNome: string,
    email: string,
    senha: string,
    permissao: Permissao,
    celular?: string,
    cpf?: string,
    cep?: string,
    fotoPerfil: string
}

interface AvaliacaoData{
    comentario: string,
    createdAt: string,
    updatedAt: string,
    id: string,
    usuario : {primeiroNome : string, segundoNome:string, id :string, fotoPerfil : string|null},
    nota : number
    evento : {id: string, descricao: string, titulo: string}
}

interface ObjetoAvaliacao{
    usuario_id : string,
    evento_id : string,
    nota : number
}

type Permissao = 'admin'| 'servidor' | 'visitante';