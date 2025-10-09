import { ReservaRecurrente } from "./reservaRecurrente.models";
export interface Tablero {
  uuid?: string;
  estado?: boolean;
  
  horario: string[][];
  
  reservasProgramadas?: ReservaRecurrente;
}
