import { CampoDeportivo } from "./campoDeportivo.model";
export interface HorarioExcepcion {
  uuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;

  fecha: string; // ISO date string
  tipoExcepcion: string; // 'cerrado', 'horario_especial', 'mantenimiento', 'evento_municipal'
  horaApertura?: string; // "HH:mm:ss"
  horaCierre?: string; // "HH:mm:ss"
  motivo?: string;
  
  campoDeportivoDto: CampoDeportivo;
}