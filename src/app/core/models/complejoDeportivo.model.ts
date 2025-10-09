import { CampoDeportivo } from "./campoDeportivo.model";
import { EncargadoComplejo } from "./encargadoComplejo";

export interface ComplejoDeportivo {
  uuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;

  estadoActual: string; // 'activo', 'mantenimiento', 'cerrado'
  nombre: string;
  telefonoPrincipal?: string;
  tipoEstructura: string; // 'techado', 'abierto', 'cerrado'
  tieneIluminacion: boolean;
  tieneVestuarios: boolean;
  tieneGraderias: boolean;
  observaciones?: string;
  
  distrito?: string;
  ubicacion: string;
  latitud: number;
  longitud: number;
  
  camposDeportivosDtoList?: CampoDeportivo[];  
  encargadosDtoList?: EncargadoComplejo[];
}