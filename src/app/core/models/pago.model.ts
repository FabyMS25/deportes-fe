import { Reserva } from "./reserva.models";

export interface  Pago{

    uuid?: String;
    estado?:boolean;

    fechaPago: Date;  
    montoPago: number;
    
    numeroTasa: string;//"21987", 
    entidadFinanciera: string;//"BANCO SOLIDARIO S.A.-COCHABAMBA-QUILLACOLLO"
    folio: string;//"2870093262146", 
    formaPago: string;//"PAGO ORIGINAL TOTAL",
    observacion: string//"CONSOLIDADO"
  
    reservasDto: Reserva;
    // estadoPago: string;

  }
  