import { CampoDeportivo } from './campoDeportivo.model';
import { Categoria } from './categoria.model';

/** Rango de talonarios/boletas declarado en una actividad Borderoux. */
export interface ReservaBorderouxTalonario {
  uuid?: string;
  precioBoleta: number;
  numeroInicial: number;
  numeroFinal: number;
  cantidad?: number;
  totalBoletas?: number;
  montoBorderoux?: number;
}

/** Actividad declarada dentro de una liquidación Borderoux. */
export interface ReservaBorderouxActividad {
  uuid?: string;
  fechaActividad: string;
  porcentajeAplicado?: number;
  subtotal?: number;
  observaciones?: string;
  campoDeportivoDto?: CampoDeportivo;
  categoriaDeportivaDto?: Categoria;
  talonariosDtoList: ReservaBorderouxTalonario[];
}

/** Preset de porcentaje configurado en BORDEROUX_PORCENTAJES. */
export interface BorderouxPorcentajePreset {
  etiqueta: string;
  tipoOrganizacion?: string;
  porcentaje: number;
}
