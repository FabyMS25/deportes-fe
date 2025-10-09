import { Tarifa } from "./tarifa.model";

export interface ClasificadorRuat {
  uuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;

  codigo:String;
  nombre:String;
  descripcion?:String;
  // tipoReserva:String; // por_hora , por_persona , por_evento , mensualidad , por_club
  tipoArancel:String;
  activo: boolean;
  
  tarifasDtoList?:Tarifa[];
}
