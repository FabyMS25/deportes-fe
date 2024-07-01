import { Cancha } from "./cancha.model";
import { Contribuyente } from "./contribuyente.models";
import { Pago } from "./pago.model";

 export interface Reserva{
  uuid?: String;
  estado?:boolean;

  // codigo:string;
  fechaReserva: Date;
  totalPago:number;   
  horaEntrada:string;
  horaSalida:string;
  
  canchasDto:Cancha;
  contribuyenteDto:Contribuyente;
  pagosDto?:Pago
  
}
