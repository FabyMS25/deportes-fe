import { Cancha } from "./cancha.model";

export interface  Pago{

    uuid: String;
    estado:boolean;

    montoPago: number;
    nroTasa: string; 
    fechaPago?: Date;    
    estadoPago: string;
  }
  