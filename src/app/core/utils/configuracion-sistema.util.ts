import { ClaveConfiguracion } from '../constants/Configurations';
import { ConfiguracionSistema } from '../models/configuracionSistema.model';

export function obtenerValorNumericoConfiguracion(
  configs: { [key: string]: ConfiguracionSistema },
  clave: ClaveConfiguracion
): number | undefined {
  const value = configs[clave]?.valorNumerico;
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
