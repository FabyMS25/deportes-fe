// Categorías principales de configuraciones
export enum CategoriaConfiguracion {
  PAGOS = 'PAGOS',
  ANTICIPACION = 'ANTICIPACION',
  DURACION = 'DURACION',
  SLA = 'SLA',
  TIMEOUTS = 'TIMEOUTS',
  RECURRENTES = 'RECURRENTES',
  RUAT = 'RUAT',
  LIMITES = 'LIMITES',
  NOTIFICACIONES = 'NOTIFICACIONES',
  // FINANCIERO = 'FINANCIERO',
  SANCIONES = 'SANCIONES',
  FUNCIONALIDADES = 'FUNCIONALIDADES'
}

// Ámbito de aplicación de las configuraciones
export enum AplicaAConfiguracion {
  GLOBAL = 'global',
  CAMPO_DEPORTIVO = 'campo_deportivo',
  COMPLEJO = 'complejo',
  TARIFA = 'tarifa',
  USUARIO = 'usuario',
  ORGANIZACION = 'organizacion'
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
  DIA_MES = 'dia_mes',
  INTENTOS = 'intentos'
}

// Claves específicas de configuraciones (para acceso rápido)
export enum ClaveConfiguracion {
  // Integración RUAT
  CODIGO_ALCALDIA_RUAT = 'CODIGO_ALCALDIA_RUAT',
  SERVICIO_MUNICIPAL_RUAT = 'SERVICIO_MUNICIPAL_RUAT',
  USUARIO_RUAT = 'USUARIO_RUAT',
  CLAVE_RUAT = 'CLAVE_RUAT',
  CODIGO_USUARIO_RUAT = 'CODIGO_USUARIO_RUAT',
  // Banderas de Funcionalidad
  HABILITAR_RESERVAS_EVENTOS = 'HABILITAR_RESERVAS_EVENTOS',
  HABILITAR_RESERVAS_ORGANIZACIONES = 'HABILITAR_RESERVAS_ORGANIZACIONES',
  HABILITAR_RESERVAS_RECURRENTES = 'HABILITAR_RESERVAS_RECURRENTES',
  HABILITAR_SOLICITUD_RESERVAS_EVENTOS = 'HABILITAR_SOLICITUD_RESERVAS_EVENTOS',
  HABILITAR_SOLICITUD_RESERVAS_ORGANIZACIONES = 'HABILITAR_SOLICITUD_RESERVAS_ORGANIZACIONES',
  HABILITAR_SOLICITUD_RESERVAS_RECURRENTES = 'HABILITAR_SOLICITUD_RESERVAS_RECURRENTES',
  //Anticipaciones
  HORAS_ANTICIPACION_RESERVAS_PUNTUALES = 'HORAS_ANTICIPACION_RESERVAS_PUNTUALES',
  HORAS_ANTICIPACION_RECURRENTES = 'HORAS_ANTICIPACION_RECURRENTES',
  // DIAS_ANTICIPACION_RECURRENTES = 'DIAS_ANTICIPACION_RECURRENTES',
  // HORAS_ANTICIPACION_EVENTOS = 'HORAS_ANTICIPACION_EVENTOS',
  DIAS_ANTICIPACION_EVENTOS = 'DIAS_ANTICIPACION_EVENTOS',
  
  // Límites de Duración
  DURACION_MINIMA_RESERVA = 'DURACION_MINIMA_RESERVA',
  DURACION_MAXIMA_EVENTOS = 'DURACION_MAXIMA_EVENTOS',
  DURACION_MAXIMA_RECURRENTES = 'DURACION_MAXIMA_RECURRENTES',
  // Capacidad y Límites
  MAXIMO_RESERVAS_ACTIVAS_POR_USUARIO = 'MAXIMO_RESERVAS_ACTIVAS_POR_USUARIO',
  MAXIMO_RESERVAS_POR_DIA_USUARIO = 'MAXIMO_RESERVAS_POR_DIA_USUARIO',
  MAXIMO_INTENTOS_REINTENTO_RESERVAS = 'MAXIMO_INTENTOS_REINTENTO_RESERVAS',
  // Pagos
  HORAS_VALIDACION_PAGO = 'HORAS_VALIDACION_PAGO',
  
  // Pagos Recurrentes
  DIA_VENCIMIENTO_PAGO_RECURRENTE = 'DIA_VENCIMIENTO_PAGO_RECURRENTE',
  DIAS_GRACIA_PAGO_RECURRENTE = 'DIAS_GRACIA_PAGO_RECURRENTE',
  DIAS_CANCELACION_POR_IMPAGO = 'DIAS_CANCELACION_POR_IMPAGO',
  DIAS_ANTICIPACION_RECORDATORIO_PAGO = 'DIAS_ANTICIPACION_RECORDATORIO_PAGO',
  // Notificaciones
  HORAS_ANTICIPACION_RECORDATORIO = 'HORAS_ANTICIPACION_RECORDATORIO',
  MINUTOS_ANTICIPACION_ALERTA_CHECKIN = 'MINUTOS_ANTICIPACION_ALERTA_CHECKIN',
  MINUTOS_ANTICIPACION_NOTIFICACION_FIN = 'MINUTOS_ANTICIPACION_NOTIFICACION_FIN',
  // Financiero
  // PORCENTAJE_RECARGO_PAGO_TARDIO = 'PORCENTAJE_RECARGO_PAGO_TARDIO',
  // DIAS_PROCESAMIENTO_REEMBOLSO = 'DIAS_PROCESAMIENTO_REEMBOLSO',
  // HORAS_MINIMAS_REEMBOLSO_CANCELACION = 'HORAS_MINIMAS_REEMBOLSO_CANCELACION',
  // PORCENTAJE_REEMBOLSO_CANCELACION = 'PORCENTAJE_REEMBOLSO_CANCELACION',
  
  // SLA y Timeouts
  HORAS_SLA_APROBACION = 'HORAS_SLA_APROBACION',
  HORAS_ADVERTENCIA_SLA = 'HORAS_ADVERTENCIA_SLA',
  MINUTOS_GRACIA_NO_SHOW = 'MINUTOS_GRACIA_NO_SHOW',
  MINUTOS_TIMEOUT_GATEWAY_PAGO = 'MINUTOS_TIMEOUT_GATEWAY_PAGO',
  // Sanciones
  MAXIMO_NO_SHOWS_ANTES_SUSPENSION = 'MAXIMO_NO_SHOWS_ANTES_SUSPENSION',
  DIAS_SUSPENSION_PRIMERA_FALTA = 'DIAS_SUSPENSION_PRIMERA_FALTA',
  DIAS_SUSPENSION_SEGUNDA_FALTA = 'DIAS_SUSPENSION_SEGUNDA_FALTA',
  DIAS_SUSPENSION_TERCERA_FALTA = 'DIAS_SUSPENSION_TERCERA_FALTA',
  
}

// Tipos de valores que pueden almacenar las configuraciones
export enum TipoValorConfiguracion {
  NUMERICO = 'NUMERICO',
  TEXTO = 'TEXTO',
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
  [CategoriaConfiguracion.SLA]: 'SLA',
  [CategoriaConfiguracion.TIMEOUTS]: 'Timeouts',
  [CategoriaConfiguracion.RECURRENTES]: 'Recurrentes',
  [CategoriaConfiguracion.RUAT]: 'RUAT',
  [CategoriaConfiguracion.LIMITES]: 'Límites',
  [CategoriaConfiguracion.NOTIFICACIONES]: 'Notificaciones',
  // [CategoriaConfiguracion.FINANCIERO]: 'Financiero',
  [CategoriaConfiguracion.SANCIONES]: 'Sanciones',
  [CategoriaConfiguracion.FUNCIONALIDADES]: 'Funcionalidades',

  // Ámbito de Aplicación
  [AplicaAConfiguracion.GLOBAL]: 'Global',
  [AplicaAConfiguracion.CAMPO_DEPORTIVO]: 'Campo Deportivo',
  [AplicaAConfiguracion.COMPLEJO]: 'Complejo',
  [AplicaAConfiguracion.TARIFA]: 'Tarifa',
  [AplicaAConfiguracion.USUARIO]: 'Usuario',
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
  [UnidadMedida.DIA_MES]: 'Día del Mes',
  [UnidadMedida.INTENTOS]: 'Intentos',

  // Tipos de Valor
  [TipoValorConfiguracion.NUMERICO]: 'Numérico',
  [TipoValorConfiguracion.TEXTO]: 'Texto',
  [TipoValorConfiguracion.BOOLEANO]: 'Boolean',
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