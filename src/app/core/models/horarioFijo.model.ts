import { CampoDeportivo } from "./campoDeportivo.model";
type Dia = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo' | 'feriado' | 'lunes_viernes';

export interface HorarioFijo {
  uuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;

  dia: Dia;
  abierto: boolean;
  horaApertura?: string; // "HH:mm:ss"
  horaCierre?: string; // "HH:mm:ss"
  observaciones?: string;
  
  campoDeportivoDto: CampoDeportivo;
}