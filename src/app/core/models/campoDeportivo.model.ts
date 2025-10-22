import { Categoria } from './categoria.model';
import { ComplejoDeportivo } from './complejoDeportivo.model';
import { HorarioExcepcion } from './horarioExcepcion.model';
import { Superficie } from './superficie.model';
import { Tarifa } from './tarifa.model';
import { HorarioFijo } from './horarioFijo.model';
import { Reserva } from './reserva.models';
import { EstadoActual } from '../constants/Estados';
export interface CampoDeportivo {
  uuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;

  estadoActual: EstadoActual;
  codigo?: string;
  nombre: string;
  categoria: string; // 'A', 'B', 'ELITE'
  dimensiones?: string;
  capacidadPersonas?: number;
  tieneIluminacion?: boolean;
  accesoLibre: boolean; 
  observaciones?: string;
  
  requiereAprobacion:Boolean;// some campos may require validate any reserva but some not 
  horasMinimaAprobacion?:number;
  maxDuracionAutoAprobacion?:number;
  maxPersonasAutoAprobacion?:number;

  complejoDto: ComplejoDeportivo;
  superficieDto: Superficie;
  tarifasDtoList?: Tarifa[];
  horariosFijosDtoList?: HorarioFijo[];
  horariosExcepcionesDtoList?: HorarioExcepcion[];

  reservasList?: Reserva[];
}