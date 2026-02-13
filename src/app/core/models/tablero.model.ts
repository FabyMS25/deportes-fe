import { ReservaRecurrente } from "./reservaRecurrente.model";
export interface Tablero {
  uuid?: string;
  estado?: boolean;
  
  horario: string[][];
  
  reservasProgramadas?: ReservaRecurrente;
}
