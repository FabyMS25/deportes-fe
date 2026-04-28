import { ReservationType } from "../constants/Features";
import { CampoDeportivo } from "./campoDeportivo.model";
import { ClasificadorRuat } from "./clasificadorRuat.model";
import { TarifaCategoria } from "./tarifa-categoria.model";
import { TarifaConcepto } from "./tarifaConcepto.model";

export type PeriodicidadMensual = 
  | 'lunes_a_viernes' 
  | 'lunes_a_sabado' 
  | 'todos_los_dias'
  | 'personalizado';
export interface Tarifa {
  uuid?: string;
  estado?:string;
  fechaCreacion?:Date;
  
  precioBase: number;
  fechaInicio:Date|string;
  fechaFin?:Date|string;
  desde?: string;  
  hasta?:string;
  activo:boolean;
  descripcion?:string;
  observaciones?:string;
  // typeRegister:String; // puntual , recurente 
  tipoCobro: ReservationType;// 'por_hora' | 'por_persona' | 'por_evento' | 'por_sesion' | 'mensualidad' | 'por_club'
  // Para mensualidades
  frecuencia?: PeriodicidadMensual;
  sesionesIncluidas?: number; // [1,2,3,4,5,6,7] para lunes a domingo

  campoDeportivoDto: CampoDeportivo;
  clasificadorRuatDto:ClasificadorRuat;
  conceptosDtos?: TarifaConcepto[];
  categoriasDtoList?: TarifaCategoria[];
}
