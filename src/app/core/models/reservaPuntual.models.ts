import { CampoDeportivo } from "./campoDeportivo.model";
import { Contribuyente } from "./contribuyente.models";
import { Pago } from "./pago.model";
import { Reserva } from "./reserva.models";
import { Tablero } from "./tablero.models";

export interface ReservaPuntual {
  uuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;

  fechaUso: Date;
  fechaUsoReal?: Date;
  horaInicio:string; // "HH:mm:ss"
  horaFin:string; // "HH:mm:ss"
  duracionHoras?:number;
  cantidadPersonas?:number;
  categoria: string;
  superficie: string;
  observaciones?: string;
  
  reservaDto?: Reserva;
}