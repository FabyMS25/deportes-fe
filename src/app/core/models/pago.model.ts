import { Reserva } from "./reserva.model";

export interface  Pago{
    uuid?: string;
    estado?:boolean;
    fechaCreacion?: Date;
    fechaActualizacion?:Date;

    numeroTasa: string; //"21987", 
    tipoTasa: string; // = "TO";
    folio: string;//"2870093262146", 
    formaPago: string;//"PAGO ORIGINAL TOTAL",
    fechaPago: Date; // DD/MM/YYYY format
    entidadFinanciera: string;//"BANCO SOLIDARIO S.A.-COCHABAMBA-QUILLACOLLO"
    montoPagado: number;
    observaciones?: string//"CONSOLIDADO"
  
    estadoPago:string;// = "pendiente";
    ultimaConsulta?: Date;
    respuestaCompletaRuat?:string;

    reservaDto: Reserva;
  }