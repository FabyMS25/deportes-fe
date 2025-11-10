import { CampoDeportivo } from "./campoDeportivo.model";
import { Contribuyente } from "./contribuyente.model";
import { Pago } from "./pago.model";
import { Tablero } from "./tablero.models";

export interface ReservaAuditoria {
  uuid?: string;
  estado?: boolean;

  fechaCreated: Date;
  fechaReserva: Date;
  categoria: string;
  superficie: string;
  totalPersonas: number;
  numeroTasa: string;
  estadoReserva: string;
  observacion?: string;
  
  tableroDto: Tablero;
  contribuyenteDto: Contribuyente;    
  canchasDto:CampoDeportivo;
  pagosDto?:Pago
}