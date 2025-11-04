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
export type BookingType = 'puntual' | 'recurrente' | 'periodo';
export type ReservationType = 'por_hora' | 'por_persona' | 'por_evento' | 'mensualidad' |'por_sesion'| 'por_club' | 'periodo';
