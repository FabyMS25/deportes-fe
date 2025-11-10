import { Reserva } from "./reserva.models";
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
  // periodo?:string;
  categoria: string;
  superficie: string;
  observaciones?: string;
  
  reservaDto?: Reserva;
}