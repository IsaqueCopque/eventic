import { Categoria } from "@app/server/entities/categoria.entity";
import { BaseAPI } from "./BaseAPI";

export class CategoriaAPI extends BaseAPI {
    static async getCategorias() : Promise<Categoria[]>{   
        const response = await fetch(`${this.apiURL}/categorias`);
        return await response.json();
    }
}