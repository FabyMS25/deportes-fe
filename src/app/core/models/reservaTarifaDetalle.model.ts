import { Reserva } from "./reserva.model";
import { Tarifa } from "./tarifa.model";
import { TarifaConcepto } from "./tarifaConcepto.model";

export type ReservaTarifaDetalleTipoLinea = 'BASE' | 'CONCEPTO' | string;

export interface ReservaTarifaDetalle {
  uuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;

  tipoLinea: ReservaTarifaDetalleTipoLinea;
  nombreConcepto?: string;
  tipoCobro?: string;
  tipoCalculo?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  reglaAplicada?: string;
  datosSnapshot?: string;

  reservaDto?: Reserva;
  tarifaDto?: Tarifa;
  tarifaConceptoDto?: TarifaConcepto;
}
