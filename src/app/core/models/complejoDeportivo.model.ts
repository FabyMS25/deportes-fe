import { EstadoActual } from "../constants/Estados";
import { TipoEstructura } from "../constants/Features";
import { CampoDeportivo } from "./campoDeportivo.model";
import { EncargadoComplejo } from "./encargadoComplejo";

export interface ComplejoDeportivo {
  uuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;

  estadoActual: EstadoActual;
  nombre: string;
  telefonoPrincipal?: string;
  tipoEstructura: TipoEstructura;
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