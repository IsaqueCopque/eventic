import { Evento } from '@app/server/entities/evento.entity';
import { AvaliacaoData, AvaliacaoPostRequest, EventoPostRequest, EventoPutRequest } from '../../app';
import { BaseAPI } from './BaseAPI';

export class EventoAPI extends BaseAPI {

    static async cadastrar(evento: EventoPostRequest) {
        const response = await fetch(`${this.apiURL}/eventos/gerencia`, {
            method: 'POST',
            body: JSON.stringify(evento),
            headers: {"Content-type": "application/json; charset=UTF-8"}
        })

        return await response.json();
    }

    static async editar(evento: EventoPutRequest){
        const response = await fetch(`${this.apiURL}/eventos/gerencia`, {
            method: 'PUT',
            body: JSON.stringify(evento),
            headers: {"Content-type": "application/json; charset=UTF-8"}

        })

        return await response.json();
    }

    /**
     *  Funcao utilizada para pegar os ultimos x eventos e filtrar.
     * @param evento 
     * @returns 
     */
    static async findLast(page: number, limit: number) : Promise<Evento[]> {
        const res = await fetch(`${this.apiURL}/eventos?page=${page}&limit=${limit}`)
        return await res.json();
    }

    static async get(eventoId: string): Promise<Evento>{
        const res = await fetch(`${this.apiURL}/eventos?id=${eventoId}`)

        return await res.json();
    }

    static async getByCategoria(categoriaId: string): Promise<Evento[]>{
        const res = await fetch(`${this.apiURL}/eventos?categoria_id=${categoriaId}`)
        return await res.json();
    }

    static async getByQ(inputValue: string): Promise<Evento[]>{
        const res = await fetch(`${this.apiURL}/eventos?q=${inputValue}`)
        return await res.json();
    }

    static async getByCategoriaAndQ(inputValue: string, categoria_id : string): Promise<Evento[]>{
        const res = await fetch(`${this.apiURL}/eventos?q=${inputValue}&categoria_id=${categoria_id}`)
        return await res.json();
    }

    /**
     *  Funcao avaliar um evento.
     * @param avaliacao 
     * @returns 
     */
    static async avaliar(avaliacao: AvaliacaoPostRequest) {
        const response = await fetch(`${this.apiURL}/eventos/avaliar?evento_id=${avaliacao.evento_id}`, {
            method: 'POST',
            body: JSON.stringify(avaliacao),
            headers: {"Content-type": "application/json; charset=UTF-8"}
        })

        return await response.json();
    }

    /**
     *  Requisicao para obter avaliações de um evento.
     * @param evento_id 
     * @returns 
     */
     static async getAvaliacoes(evento_id : string) : Promise<AvaliacaoData[]>{
        const response = await fetch(`${this.apiURL}/eventos/avaliar?evento_id=${evento_id}`, {
            method: 'GET',
            headers: {"Content-type": "application/json; charset=UTF-8"}
        })
        return await response.json();
    }

    /**
     *  Requisicao para deletar avaliação de um evento.
     * @param evento_id 
     * @returns 
     */
     static async deleteAvaliacao(evento_id : string) {
        const response = await fetch(`${this.apiURL}/eventos/avaliar?evento_id=${evento_id}`, {
            method: 'DELETE',
            headers: {"Content-type": "application/json; charset=UTF-8"}
        })

        return await response.json();
    }

     /**
     *  Requisicao para obter Recomendações de eventos similares
     * @param evento_id
     * @param user_id desconsidera eventos já avaliados pelo usuário
     * @returns 
     */
    static async getRecomendacoes(evento_id : string, usuario_id : string | null){
        let route = `${this.apiURL}/eventos/recomendar?evento_id=${evento_id}`;
        if(usuario_id != null)
            route = route.concat(`&&usuario_id=${usuario_id}`);
        const response = await fetch(route, {
            method: 'GET',
            headers: {"Content-type": "application/json; charset=UTF-8"}
        });
        return await response.json();
    }


}