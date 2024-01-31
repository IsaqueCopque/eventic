import { UsuarioPostRequest, UsuarioPutRequest } from "../../app";
import { BaseAPI } from "./BaseAPI";

export class UsuarioAPI extends BaseAPI {

    static async cadastrar(usuario: UsuarioPostRequest){

        const response = await fetch(`${this.apiURL}/usuarios/cadastro`, {
            method: 'POST',
            body: JSON.stringify(usuario),
            headers: {"Content-type": "application/json; charset=UTF-8"}
        })

        return response.json();
    }

    static async editar(usuario: UsuarioPutRequest){
        const response = await fetch(`${this.apiURL}/usuarios/perfil`, {
            method: 'PUT',
            body: JSON.stringify(usuario),
            headers: {"Content-type": "application/json; charset=UTF-8"}
        })
        return response.json();
    }

    /*
     Obtém eventos em que o usuário logado se inscreveu
    */
    static async getEventosInscritosUsuarioLogado(){
        const response = await fetch(`${this.apiURL}/usuarios/eventos`);
        return response.json();
    }
}