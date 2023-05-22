import { BaseAPI } from "./BaseAPI";
export class RecuperarSenhaAPI extends BaseAPI {

    static async enviarLink(recuperarSenhaRequest: RecuperarSenhaRequest){
        const response = await fetch(`${this.apiURL}/usuarios/recuperasenha`, {
            method: 'POST',
            body: JSON.stringify(recuperarSenhaRequest),
            headers: {"Content-type": "application/json; charset=UTF-8"}
        })

        return await response.json();
    }

    static async alterarSenha(alterarSenhaRequest: AlterarSenhaRequest){
        const response = await fetch(`${this.apiURL}/usuarios/recuperasenha/redefine`, {
            method: 'POST',
            body: JSON.stringify(alterarSenhaRequest),
            headers: {"Content-type": "application/json; charset=UTF-8"}
        })

        return await response.json();
    }
}