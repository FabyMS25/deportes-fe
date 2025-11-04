import { EstadoReserva, EstadoValidacion } from "../constants/Estados";
import { BookingType } from "../constants/Features";
import { CampoDeportivo } from "./campoDeportivo.model";
import { Contribuyente } from "./contribuyente.models";
import { Organizacion } from "./organizacion.models";
import { Pago } from "./pago.model";
import { ReservaAuditoria } from "./reservaAuditoria.models";
import { ReservaPuntual } from "./reservaPuntual.models";
import { ReservaRecurrente } from "./reservaRecurrente.models";
import { Tarifa } from "./tarifa.model";
 export interface Reserva{
  uuid?: String;
  estado?:boolean;
  fechaCreacion:Date;
  fechaActualizacion?:Date;

  fechaReserva:Date ;
  fechaAprobacion?:Date;
  fechaRechazo?:Date;
  motivoRechazo?:string;
  aprobadoPor?:string;
  estadoValidacion:EstadoValidacion;
  
  estadoReserva:EstadoReserva;
  tipoReserva:BookingType; //puntual / recurente / periodo
  numeroReserva:string;
  numeroTasa?:string;
  montoTotal:number;
  clasificadorRuatId:string; //saved to identify later 

  campoDeportivoDto:CampoDeportivo;
  contribuyenteDto:Contribuyente;
  organizacionDto?:Organizacion;
  tarifaDto: Tarifa;
  reservaPuntualDto?:ReservaPuntual;
  reservaRecurrenteDto?:ReservaRecurrente;  

  pagosDtoList?:Pago[];
  auditoriasDtoList?:ReservaAuditoria;
}