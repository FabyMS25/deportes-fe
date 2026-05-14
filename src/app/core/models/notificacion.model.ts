export type EstadoLecturaNotificacion = 'NO_LEIDA' | 'LEIDA';
export type PrioridadNotificacion = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
export type CanalNotificacion = 'APP';

export interface Notificacion {
  uuid: string;
  estado?: boolean;
  fechaCreacion: string;
  fechaActualizacion?: string;
  usuarioUuid: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  estadoLectura: EstadoLecturaNotificacion;
  prioridad: PrioridadNotificacion;
  canal: CanalNotificacion;
  referenciaTipo?: string;
  referenciaUuid?: string;
  accionUrl?: string;
  programadaPara?: string;
  enviadaEn?: string;
  leidaEn?: string;
  expiraEn?: string;
  metadataJson?: string;
}
