import { CampoDeportivo } from "./campoDeportivo.model";

export interface Superficie {
  uuid?: string;
  estado?: boolean;
  
  descripcion: string; 
  campoDeportivosDtoList?:CampoDeportivo[];
}
