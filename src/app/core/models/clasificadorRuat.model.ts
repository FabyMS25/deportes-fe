import { Tarifa } from "./tarifa.model";

export interface ClasificadorRuat {
  uuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;

  codigo:string;
  nombre:string;
  descripcion?:string;
  // tipoReserva:String; // por_hora , por_persona , por_evento , mensualidad , por_club
  tipoArancel:string;
  activo: boolean;
  
  tarifasDtoList?:Tarifa[];
}
