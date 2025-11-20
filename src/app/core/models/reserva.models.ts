import { EstadoReserva, EstadoValidacion } from "../constants/Estados";
import { BookingType } from "../constants/Features";
import { CampoDeportivo } from "./campoDeportivo.model";
import { Contribuyente } from "./contribuyente.model";
import { EstudianteEscuela } from "./EstudianteEscuela.model";
import { Organizacion } from "./organizacion.models";
import { Pago } from "./pago.model";
import { ReservaAuditoria } from "./reservaAuditoria.models";
import { ReservaPeriodo } from "./reservaPeriodo.models";
import { ReservaPuntual } from "./reservaPuntual.models";
import { ReservaRecurrente } from "./reservaRecurrente.models";
import { Tarifa } from "./tarifa.model";
export interface Reserva{
  uuid?: string;
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

  esReservaGratuita: boolean;
  motivoGratuidad?: string; // 'ESCUELA_MUNICIPAL', 'ORGANIZACION', 'EVENTO_ESPECIAL'

  organizacionDto?:Organizacion;
  estudianteEscuelaDto?: EstudianteEscuela;
  contribuyenteDto:Contribuyente;
  campoDeportivoDto:CampoDeportivo;
  tarifaDto: Tarifa;
  reservaPuntualDto?:ReservaPuntual;
  reservaRecurrenteDto?:ReservaRecurrente;  
  reservaPeriodoDto?: ReservaPeriodo;

  pagosDtoList?:Pago[];
  auditoriasDtoList?:ReservaAuditoria;
}