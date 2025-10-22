import { Reserva } from "./reserva.models";
import { Tablero } from "./tablero.models";
export interface ReservaRecurrente {
  uuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;

  tipoRecurrencia:string; //menusal / semanal .. 
  fechaInicio: Date;
  fechaFin: Date;
  diasSemana:string;
  duracionSesionHoras:number;
  cantidadPersonas?:number;
  cantidadSesiones:number;
  tarifaMensual?:number;
  activo:Boolean;
  categoria?: string; //saved concatenado to show later like categoria1, categoria 2
  superficie?: string; //saved to show later
  observaciones?: string;
  
  tableroDto: Tablero;
  reservaDto?: Reserva;
}