import { ReservaRecurrente } from "./reservaRecurrente.model";
export interface Tablero {
  uuid?: string;
  estado?: boolean;
  
  horario: string[][][]; // 3D array: [months][31 days][5 slots]
  reservasProgramadas?: ReservaRecurrente;
}
