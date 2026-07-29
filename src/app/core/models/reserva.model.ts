import { EstadoReserva, EstadoValidacion } from "../constants/Estados";
import { BookingType } from "../constants/Features";
import { CampoDeportivo } from "./campoDeportivo.model";
import { Contribuyente } from "./contribuyente.model";
import { Organizacion } from "./organizacion.model";
import { ReservaAuditoria } from "./reservaAuditoria.model";
import { ReservaPeriodo } from "./reservaPeriodo.model";
import { ReservaPuntual } from "./reservaPuntual.model";
import { ReservaRecurrente } from "./reservaRecurrente.model";
import { ReservaTarifaDetalle } from "./reservaTarifaDetalle.model";
import { Tarifa } from "./tarifa.model";
import { Pago } from "./pago.model";
export interface Reserva{
  uuid?: string;
  estado?:boolean;
  fechaCreacion:Date;
  fechaActualizacion?:Date;
  fechaLimitePago?: Date;
  cancelacionAutomatica?: boolean;
  motivoCancelacionAutomatica?: string;
  autorizadoPor?: string;

  clasificadorRuatId:string;
  tipoReserva:BookingType; //puntual / recurente / periodo 
  fechaReserva:Date ;
  numeroReserva:string;
  numeroTasa?:string;
  montoTotal:number;

  estadoReserva:EstadoReserva;
  estadoValidacion:EstadoValidacion;  
  fechaAprobacion?:Date;
  aprobadoPor?:string;
  creadoPor?: string;
  anuladoPor?: string | null;
  fechaRechazo?:Date;
  motivoRechazo?:string;
  esReservaGratuita: boolean;
  motivoGratuidad?: string; // 'ESCUELA_MUNICIPAL', 'ORGANIZACION', 'EVENTO_ESPECIAL'

  tarifaDto: Tarifa;
  campoDeportivoDto:CampoDeportivo;
  contribuyenteDto:Contribuyente;
  organizacionDto?:Organizacion;
  reservaPuntualDto?:ReservaPuntual;
  reservaRecurrenteDto?:ReservaRecurrente;  
  reservasPeriodoDtoList?: ReservaPeriodo[];

  pagosDtoList?:Pago[];
  auditoriasDtoList?: ReservaAuditoria[];
  tarifaDetallesDtoList?: ReservaTarifaDetalle[];
}
