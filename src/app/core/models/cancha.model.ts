import { EncargadoCancha } from "./encargado-cancha";
import { Horario } from "./horario.model";

export interface Cancha {
  uuid?: string;
  estado?:string;

  nombre?:string;
  techado?:string;
  superficie?:string;
  ubicacion?:string;
  distrito?:string;
  totalxhora?:number;
  latitud?:string;
  longitud?:string;

  canchaDeportesList?:any[];
  horarioList?:Horario[];
  
  encargadoCanchaList?:EncargadoCancha[];
  reservasList?:any[];

}
