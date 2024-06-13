import { Cancha } from "./cancha.model";
import { Contribuyente } from "./contribuyente.models";
import { Pago } from "./pago.model";

 export interface Reserva{
  uuid?: String;
  estado?:boolean;

  fechaReserva: Date;
  totalPago:number;   
  horaEntrada:string;
  horaSalida:string;

  
  canchaDto:Cancha;
  contribuyenteDto:Contribuyente;
  pagoDto?:Pago
  
}
