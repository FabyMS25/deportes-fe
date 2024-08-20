import { campoDeportivo } from "./campoDeportivo.model";
import { Contribuyente } from "./contribuyente.models";
import { Pago } from "./pago.model";

 export interface Reserva{
  uuid?: String;
  estado?:boolean;

  fechaReserva: Date;
  horaEntrada:string;
  horaSalida:string;
  totalPago:number;   
  totalPesonas: number;
  numeroTasa :string;
  estadoReserva:string;//pendiente//vencido//anulado

  categoria?: string;
  superficie: string;
  observacion?: string;
  
  canchasDto:campoDeportivo;
  contribuyenteDto:Contribuyente;
  pagosDto?:Pago
  
}
