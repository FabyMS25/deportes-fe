import { CampoDeportivo } from "./campoDeportivo.model";
import { ClasificadorRuat } from "./clasificadorRuat.model";
import { TarifaCategoria } from "./tarifa-categoria.model";
import { TarifaConcepto } from "./tarifaConcepto.model";

export interface Tarifa {
  uuid?: string;
  estado?:string;
  fechaCreacion?:Date;
  
  precioBase: number;
  fechaInicio:Date|string;
  fechaFin?:Date|string;
  desde?: string;  // Time range for tariff application
  hasta?:string;
  activo:boolean;
  descripcion?:string;
  observaciones?:string;
  // typeRegister:String; // puntual , recurente 
  // forOrganization:boolean; //tarifas validad for Organizations 
  tipoCobro: 'por_hora' | 'por_persona' | 'por_evento' | 'por_sesion' | 'mensualidad' | 'por_club';
  frecuencia?: 'diaria' | 'semanal' | 'mensual'; // For recurring calculations
  sesionesIncluidas?: number; // For 'mensualidad' or 'por_club' types

  campoDeportivoDto: CampoDeportivo;
  clasificadorRuatDto:ClasificadorRuat;

  conceptosDtos?: TarifaConcepto[];
  categoriasDtoList?: TarifaCategoria[];
}
