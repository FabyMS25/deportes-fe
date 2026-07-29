export enum CategoriaConfiguracion {
  RUAT = 'RUAT',
  FUNCIONALIDADES = 'FUNCIONALIDADES',
  ANTICIPACION = 'ANTICIPACION',
  DURACION = 'DURACION',
  PAGOS = 'PAGOS',

  TIMEOUTS = 'TIMEOUTS',
  LIMITES = 'LIMITES',
  NOTIFICACIONES = 'NOTIFICACIONES',
  
  INSTITUCIONAL = 'INSTITUCIONAL'
}

export enum AplicaAConfiguracion {
  GLOBAL = 'global',
  CONTRIBUYENTE = 'contribuyente',
  ORGANIZACION = 'organizacion',
  COMPLEJO = 'complejo',
  CAMPO_DEPORTIVO = 'campo_deportivo',
  TARIFA = 'tarifa'
}

// Unidades de medida para valores numéricos
export enum UnidadMedida {
  HORAS = 'horas',
  DIAS = 'dias',
  MINUTOS = 'minutos',
  SEGUNDOS = 'segundos',
  MESES = 'meses',
  BOLIVIANOS = 'bolivianos',
  PORCENTAJE = 'porcentaje',
  CANTIDAD = 'cantidad',
  PERSONAS = 'personas',
  INTENTOS = 'intentos'
}

export enum ClaveConfiguracion {
  /* Integración RUAT */
  CODIGO_ALCALDIA_RUAT = 'CODIGO_ALCALDIA_RUAT',
  SERVICIO_MUNICIPAL_RUAT = 'SERVICIO_MUNICIPAL_RUAT',
  USUARIO_RUAT = 'USUARIO_RUAT',
  CLAVE_RUAT = 'CLAVE_RUAT',
  CODIGO_USUARIO_RUAT = 'CODIGO_USUARIO_RUAT',
  /* Banderas de Funcionalidad */
  HABILITAR_RESERVAS_EVENTOS = 'HABILITAR_RESERVAS_EVENTOS',
  HABILITAR_RESERVAS_ORGANIZACIONES = 'HABILITAR_RESERVAS_ORGANIZACIONES',
  HABILITAR_RESERVAS_RECURRENTES = 'HABILITAR_RESERVAS_RECURRENTES',
  HABILITAR_SOLICITUD_RESERVAS_EVENTOS = 'HABILITAR_SOLICITUD_RESERVAS_EVENTOS',
  HABILITAR_SOLICITUD_RESERVAS_ORGANIZACIONES = 'HABILITAR_SOLICITUD_RESERVAS_ORGANIZACIONES',
  HABILITAR_SOLICITUD_RESERVAS_RECURRENTES = 'HABILITAR_SOLICITUD_RESERVAS_RECURRENTES',
  /* Anticipaciones */
  HORAS_ANTICIPACION_RESERVAS_PUNTUALES = 'HORAS_ANTICIPACION_RESERVAS_PUNTUALES',
  HORAS_ANTICIPACION_RECURRENTES = 'HORAS_ANTICIPACION_RECURRENTES',
  // DIAS_ANTICIPACION_RECURRENTES = 'DIAS_ANTICIPACION_RECURRENTES',
  DIAS_ANTICIPACION_EVENTOS = 'DIAS_ANTICIPACION_EVENTOS',
  // HORAS_ANTICIPACION_EVENTOS = 'HORAS_ANTICIPACION_EVENTOS',
  /* Límites de Duración */
  DURACION_MINIMA_RESERVA = 'DURACION_MINIMA_RESERVA',
  DURACION_MAXIMA_PUNTUALES = 'DURACION_MAXIMA_PUNTUALES',
  DURACION_MAXIMA_EVENTOS = 'DURACION_MAXIMA_EVENTOS',
  DURACION_MAXIMA_RECURRENTES = 'DURACION_MAXIMA_RECURRENTES',
  /*  */
  /* Pagos */
  HORAS_VALIDACION_PAGO = 'HORAS_VALIDACION_PAGO',
  HORAS_VALIDACION_PAGO_EVENTOS = 'HORAS_VALIDACION_PAGO_EVENTOS',
  HORAS_VALIDACION_PAGO_RECURRENTES = 'HORAS_VALIDACION_PAGO_RECURRENTES',

  /* Notificaciones */
  NOTIFICAR_REGISTRO_RESERVA = 'NOTIFICAR_REGISTRO_RESERVA',
  NOTIFICAR_RESULTADO_SOLICITUD = 'NOTIFICAR_RESULTADO_SOLICITUD',
  NOTIFICAR_PAGO_CONFIRMADO = 'NOTIFICAR_PAGO_CONFIRMADO',
  NOTIFICAR_RESERVA_ANULADA = 'NOTIFICAR_RESERVA_ANULADA',
  HORAS_ANTICIPACION_RECORDATORIO_RESERVA = 'HORAS_ANTICIPACION_RECORDATORIO_RESERVA',
  HORAS_ANTICIPACION_RECORDATORIO_PAGO = 'HORAS_ANTICIPACION_RECORDATORIO_PAGO',
  MINUTOS_ANTICIPACION_CHECKIN = 'MINUTOS_ANTICIPACION_CHECKIN',
  NOTIFICAR_CAMBIO_HORARIO = 'NOTIFICAR_CAMBIO_HORARIO',

  /* Institucional */
  ADMIN_DEPORTES = 'ADMIN_DEPORTES',
}

// Tipos de valores que pueden almacenar las configuraciones
export enum TipoValorConfiguracion {
  TEXTO = 'TEXTO',
  NUMERICO = 'NUMERICO',
  BOOLEANO = 'BOOLEANO',
  JSON = 'JSON'
}

// Estados de control de configuraciones
export enum EstadoControlConfiguracion {
  MODIFICABLE = 'MODIFICABLE',
  SOLO_LECTURA = 'SOLO_LECTURA',
  REQUIERE_APROBACION = 'REQUIERE_APROBACION'
}

// Mapeo de labels para mostrar en la interfaz
export const LabelsConfiguracion = {
  // Categorías
  [CategoriaConfiguracion.PAGOS]: 'Pagos',
  [CategoriaConfiguracion.ANTICIPACION]: 'Anticipación',
  [CategoriaConfiguracion.DURACION]: 'Duración',
  [CategoriaConfiguracion.TIMEOUTS]: 'Timeouts',
  [CategoriaConfiguracion.RUAT]: 'RUAT',
  [CategoriaConfiguracion.LIMITES]: 'Límites',
  [CategoriaConfiguracion.NOTIFICACIONES]: 'Notificaciones',
  [CategoriaConfiguracion.INSTITUCIONAL]: 'Institucional',
  [CategoriaConfiguracion.FUNCIONALIDADES]: 'Funcionalidades',

  // Ámbito de Aplicación
  [AplicaAConfiguracion.GLOBAL]: 'Global',
  [AplicaAConfiguracion.CAMPO_DEPORTIVO]: 'Campo Deportivo',
  [AplicaAConfiguracion.COMPLEJO]: 'Complejo',
  [AplicaAConfiguracion.TARIFA]: 'Tarifa',
  [AplicaAConfiguracion.CONTRIBUYENTE]: 'Contribuyente',
  [AplicaAConfiguracion.ORGANIZACION]: 'Organización',

  // Unidades de Medida
  [UnidadMedida.HORAS]: 'Horas',
  [UnidadMedida.DIAS]: 'Días',
  [UnidadMedida.MINUTOS]: 'Minutos',
  [UnidadMedida.SEGUNDOS]: 'Segundos',
  [UnidadMedida.MESES]: 'Meses',
  [UnidadMedida.BOLIVIANOS]: 'Bolivianos',
  [UnidadMedida.PORCENTAJE]: 'Porcentaje',
  [UnidadMedida.CANTIDAD]: 'Cantidad',
  [UnidadMedida.PERSONAS]: 'Personas',
  [UnidadMedida.INTENTOS]: 'Intentos',

  // Tipos de Valor
  [TipoValorConfiguracion.NUMERICO]: 'Numérico',
  [TipoValorConfiguracion.TEXTO]: 'Texto',
  [TipoValorConfiguracion.BOOLEANO]: 'Booleano',
  [TipoValorConfiguracion.JSON]: 'JSON',

  // Estados de Control
  [EstadoControlConfiguracion.MODIFICABLE]: 'Modificable',
  [EstadoControlConfiguracion.SOLO_LECTURA]: 'Solo Lectura',
  [EstadoControlConfiguracion.REQUIERE_APROBACION]: 'Requiere Aprobación'
};

export function obtenerLabelConfiguracion(valor: string, tipo: 'categoria' | 'aplicaA' | 'unidadMedida' | 'tipoValor' | 'estadoControl'): string {
  const mapeos = {
    categoria: CategoriaConfiguracion,
    aplicaA: AplicaAConfiguracion,
    unidadMedida: UnidadMedida,
    tipoValor: TipoValorConfiguracion,
    estadoControl: EstadoControlConfiguracion
  };

  const enumObj = mapeos[tipo];
  if (enumObj && LabelsConfiguracion[valor as keyof typeof LabelsConfiguracion]) {
    return LabelsConfiguracion[valor as keyof typeof LabelsConfiguracion];
  }
  
  return valor;
}


export interface AdminDeportesConfig {
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  address?: string;
  avatar?: string;
}
