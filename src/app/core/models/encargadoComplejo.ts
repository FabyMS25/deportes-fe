import { ComplejoDeportivo } from "./complejoDeportivo.model";

export interface EncargadoComplejo {
  uuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;

  userUuid: string; // uuid referencial to external user system
  avatar:string;
  activo: boolean;
  nombre: string;
  telefono?: string;
  fechaAsignacion?: Date|string; // ISO date string
  fechaFinAsignacion?: Date|string; // ISO date string
  horaEntrada?: string; // "HH:mm:ss"
  horaSalida?: string; // "HH:mm:ss"
  
  complejoDto?: ComplejoDeportivo;
}