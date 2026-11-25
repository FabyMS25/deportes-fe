import { CampoDeportivo } from './campoDeportivo.model';
import { Categoria } from './categoria.model';
import { Contribuyente } from './contribuyente.model';
import { Organizacion } from './organizacion.model';
import { EstadoReserva, EstadoValidacion } from '../constants/Estados';

export interface ReservaBorderouxTalonario {
  uuid?: string;
  serieTalonario?: string | null;
  precioBoleta: number;
  numeroInicial: number;
  numeroFinal: number;
  cantidadAnuladas?: number;
  cantidadVendida?: number;
  cantidad?: number;
  totalBoletas?: number;
  montoBorderoux?: number;
}

/** One activity declared in a Borderoux pre-liquidation. */
export interface ReservaBorderouxActividad {
  uuid?: string;
  fechaActividad: string;
  porcentajeAplicado?: number;
  subtotal?: number;
  observaciones?: string | null;
  campoDeportivoDto?: Pick<CampoDeportivo, 'uuid'>;
  categoriaDeportivaDto?: Pick<Categoria, 'uuid'> | null;
  talonariosDtoList: ReservaBorderouxTalonario[];
}

/** Header and complete payload of a Borderoux pre-liquidation. */
export interface ReservaBorderoux {
  uuid?: string;
  fechaCreacion?: Date | string;
  fechaActualizacion?: Date | string;
  numeroReserva?: string;
  numeroTasa?: string;
  montoTotal: number;
  estadoReserva: EstadoReserva;
  estadoValidacion: EstadoValidacion;
  clasificadorRuatId?: string | null;
  creadoPor?: string;
  organizacionDto: Pick<Organizacion, 'uuid'> & Partial<Pick<Organizacion, 'nombre' | 'tipoOrganizacion'>>;
  contribuyenteDto: Pick<Contribuyente, 'uuid'> & Partial<Pick<Contribuyente, 'nombre' | 'nombreCompleto' | 'codigoContribuyente'>>;
  borderouxActividadesDtoList: ReservaBorderouxActividad[];
}

export interface BorderouxPorcentajePreset {
  etiqueta: string;
  tipoOrganizacion?: string;
  porcentaje: number;
}
