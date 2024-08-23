import { campoDeportivo } from "./campoDeportivo.model";
import { Encargado } from "./encargado";

export interface Complejo {
  uuid?: string;
  estado?:string;

  nombre:string;
  techado?:string;
  ubicacion?:string;
  distrito?:string;
  latitud?:string;
  longitud?:string;

  canchasList?:campoDeportivo[];  
  encargadoCanchaList?:Encargado;
}
