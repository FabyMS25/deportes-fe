import { Reserva } from "./reserva.models";
import { Tablero } from "./tablero.models";

export interface ReservaRecurrente {
  uuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;

  tipoRecurrencia:string; //menusal / semanal
  fechaInicio: Date;
  fechaFin: Date;
  cantidadPersonas?:number;
  diasSemana:string;
  cantidadSesiones:number;
  duracionSesionHoras:number;
  tarifaMensual?:number;
  activo:Boolean;
  categoria?: string; //saved to identify later
  superficie?: string; //saved to identify later
  observaciones?: string;
  
  tableroDto: Tablero;
  reservaDto?: Reserva;
}