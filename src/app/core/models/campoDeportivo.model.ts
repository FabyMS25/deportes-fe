import { Categoria } from './categoria.model';
import { ComplejoDeportivo } from './complejoDeportivo.model';
import { HorarioExcepcion } from './horarioExcepcion.model';
import { Superficie } from './superficie.model';
import { Tarifa } from './tarifa.model';
import { HorarioFijo } from './horarioFijo.model';
import { Reserva } from './reserva.models';
export interface CampoDeportivo {
  uuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;

  estadoActual: string; // 'activo', 'mantenimiento', 'cerrado'
  codigo?: string;
  nombre: string;
  categoria: string; // 'A', 'B', 'ELITE'
  dimensiones?: string;
  capacidadPersonas?: number;
  tieneIluminacion?: boolean;
  observaciones?: string;
  accesoLibre: boolean; 
  
  requiereAprobacion:Boolean;// false
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