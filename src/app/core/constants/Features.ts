export const Surfaces =
[ 
    'PASTO NATURAL',
    'PISTA ATLETICA',
    'CANCHA MULTIDISCIPLINARIA',
    'DE TIERRA',
    'PASTO SINTETICO',
    'PISO PARQUET',
    'COMPLEJO'
    // 'Césped artificial homologadop', 
    // 'Césped sintético',
    // 'Césped natural', 
    // 'Pavimento de superficie acrílica', 
    // 'Suelos de EPDM', 
    // 'Caucho',
    // 'Polvo de ladrillo/Arcilla', 
    // 'Tierra batida',
    // 'Arena' 
]


export enum CategoriaCampo {
  A = 'A',
  B = 'B',
  ELITE = 'ELITE'
}

export enum TipoEstructura {
  TECHADO = 'Techado',
  ABIERTO = 'Abierto',
  CERRADO = 'Cerrado'
}

export enum EstadoActual {
  ACTIVO = 'Activo',
  MANTENIMIENTO = 'Mantenimiento',
  CERRADO = 'Cerrado'
}

export enum DiaSemana {
  LUNES = 'lunes',
  MARTES = 'martes',
  MIERCOLES = 'miercoles',
  JUEVES = 'jueves',
  VIERNES = 'viernes',
  SABADO = 'sabado',
  DOMINGO = 'domingo',
  FERIADO = 'feriado'
}

export enum TipoExcepcion {
  CERRADO = 'cerrado',
  HORARIO_ESPECIAL = 'horario_especial',
  MANTENIMIENTO = 'mantenimiento',
  EVENTO_MUNICIPAL = 'evento_municipal'
}