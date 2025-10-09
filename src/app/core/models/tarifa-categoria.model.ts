import { Categoria } from "./categoria.model";
import { Tarifa } from "./tarifa.model";

export interface TarifaCategoria {
  uuid?: string;
  estado?:string;

  tarifaDto:Tarifa;
  categoriaDto:Categoria;
}
