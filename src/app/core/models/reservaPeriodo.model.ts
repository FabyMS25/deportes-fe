import { Reserva } from "./reserva.model";
import { EstudianteEscuela } from "./EstudianteEscuela.model";

export interface ReservaPeriodo {
  uuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;
  
  // Period information
  mes: number; // 1-12
  año: number;
  
  // School context
  matricula?: string;
  disciplina?: string;
  entrenador?: string;
  
  estudianteEscuelaDto: EstudianteEscuela;
  reservaDto?: Reserva;
}
