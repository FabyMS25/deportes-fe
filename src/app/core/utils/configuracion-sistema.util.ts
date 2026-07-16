import { ClaveConfiguracion } from '../constants/Configurations';
import { ConfiguracionSistema } from '../models/configuracionSistema.model';

type TipoReservaPago = 'puntual' | 'recurrente' | string | undefined;
type TipoCobroPago = string | undefined;

export function obtenerValorNumericoConfiguracion(
  configs: { [key: string]: ConfiguracionSistema },
  clave: ClaveConfiguracion
): number | undefined {
  const config = configs[clave];
  if (!config || config.activo !== true) {
    return undefined;
  }
  const value = config.valorNumerico;
  return value === null || value === undefined ? undefined : value;
}

export function obtenerValorConfiguracionConUnidad(
  configs: { [key: string]: ConfiguracionSistema },
  clave: ClaveConfiguracion
): string | undefined {
  const config = configs[clave];
  const value = obtenerValorNumericoConfiguracion(configs, clave);

  if (value === undefined) {
    return undefined;
  }

  return config.unidadMedida ? `${value} ${config.unidadMedida}` : `${value}`;
}

export function obtenerClaveValidacionPago(
  tipoReserva: TipoReservaPago,
  tipoCobro: TipoCobroPago
): ClaveConfiguracion {
  if (tipoReserva === 'recurrente') {
    return ClaveConfiguracion.HORAS_VALIDACION_PAGO_RECURRENTES;
  }
  if (tipoCobro === 'por_evento') {
    return ClaveConfiguracion.HORAS_VALIDACION_PAGO_EVENTOS;
  }
  return ClaveConfiguracion.HORAS_VALIDACION_PAGO;
}

export function obtenerHorasValidacionPago(
  configs: { [key: string]: ConfiguracionSistema },
  tipoReserva: TipoReservaPago,
  tipoCobro: TipoCobroPago,
  fallback = 4
): number {
  const clave = obtenerClaveValidacionPago(tipoReserva, tipoCobro);
  return obtenerValorNumericoConfiguracion(configs, clave) ?? fallback;
}

export function obtenerValidacionPagoConUnidad(
  configs: { [key: string]: ConfiguracionSistema },
  tipoReserva: TipoReservaPago,
  tipoCobro: TipoCobroPago
): string | undefined {
  return obtenerValorConfiguracionConUnidad(
    configs,
    obtenerClaveValidacionPago(tipoReserva, tipoCobro)
  );
}
