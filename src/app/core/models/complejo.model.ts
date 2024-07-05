import { campoDeportivo } from "./campoDeportivo.model";
import { Encargado } from "./encargado";
import { Horario } from "./horario.model";

export interface Complejo {
  uuid?: string;
  estado?:string;

  nombre?:string;
  techado?:string;
  // superficie?:string;
  ubicacion?:string;
  distrito?:string;
  // totalxhora?:number;
  latitud?:string;
  longitud?:string;

  canchasList?:campoDeportivo[];
  // horarioList?:Horario[];
  
  encargadoCanchaList?:Encargado;
  // reservasList?:any[];

}
