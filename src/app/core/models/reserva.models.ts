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
  estadoValidacion:string; // "PENDIENTE", "APROBADA", "RECHAZADA"
  
  estadoReserva:string;
  tipoReserva:string; //puntual / recurente
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

            // Possible values for estadoReserva:
            // "BORRADOR" - Draft/being created
            // "PENDIENTE" - Submitted, awaiting approval
            // "APROBADA" - Approved by administrator
            // "RECHAZADA" - Rejected (with motivoRechazo)
            // "CONFIRMADA" - Payment completed, reservation confirmed
            // "ACTIVA" - Currently in use
            // "COMPLETADA" - Reservation period ended successfully
            // "CANCELADA" - Cancelled by user or system
            // "NO_SHOW" - User didn't show up
            // "SUSPENDIDA" - Temporarily suspended
            // "ANULADA" - Administrative cancellation (similar to Anexo F)