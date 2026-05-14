import { Reserva } from "./reserva.model";

export interface ReservaAuditoria {
  uuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;

  accion: string;
  usuarioUuid: string;
  estadoAnterior?: string;
  estadoNuevo?: string;
  datosCambio?: string;
  observaciones?: string;
  direccionIp?: string;

  reservaDto?: Reserva;
}
