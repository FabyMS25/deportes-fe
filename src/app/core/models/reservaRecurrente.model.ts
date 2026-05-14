import { Reserva } from "./reserva.model";
import { Tablero } from "./tablero.model";
export interface ReservaRecurrente {
  uuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;

  tipoRecurrencia:string;
  fechaInicio: Date;
  fechaFin: Date;
  diasSemana:string;
  duracionSesionHoras:number;
  cantidadPersonas?:number;
  cantidadSesiones:number;
  precioBaseAplicado?: number;
  // tarifaMensual?:number;
  activo:Boolean;
  categoria?: string; //saved concatenado to show later like categoria1, categoria 2
  superficie?: string; //saved to show later
  observaciones?: string;
  
  tableroDto: Tablero;
  reservaDto?: Reserva;
}
