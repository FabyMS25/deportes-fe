import { Reserva } from "./reserva.model";
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
  precioBaseAplicado?: number;
  categoria: string;
  superficie: string;
  observaciones?: string;
  periodo?: string;
  
  reservaDto?: Reserva;
}