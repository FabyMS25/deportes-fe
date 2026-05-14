export const TipoCobro = [
  {
    id: "1",
    value: "por_hora",
    label: "Por Hora",
  },
  {
    id: "2",
    value: "por_persona",
    label: "Por Persona",
  },
  {
    id: "3",
    value: "por_evento",
    label: "Por Evento",
  },
  {
    id: "4",
    value: "por_club",
    label: "Por Club",
  },
  {
    id: "5",
    value: "por_sesion",
    label: "Por Sesión",
  },
  {
    id: "6",
    value: "mensualidad",
    label: "Mensualidad",
  }
];

export const TipoCobroLabels: Record<string, string> = {
  ...Object.fromEntries(TipoCobro.map(tipo => [tipo.value, tipo.label])),
  periodo: 'Periodo'
};

export const TipoCobroDescriptions: Record<string, string> = {
  por_hora: 'por hora',
  por_persona: 'por persona',
  por_evento: 'por evento',
  mensualidad: 'por mes',
  por_sesion: 'por sesión',
  por_club: 'por mes',
  periodo: 'periodo de Escuela'
};

export function obtenerLabelTipoCobro(tipo?: string, fallback = 'No especificado'): string {
  return tipo ? (TipoCobroLabels[tipo] || tipo) : fallback;
}

export function obtenerDescripcionTipoCobro(tipo?: string, fallback = 'Tarifa'): string {
  return tipo ? (TipoCobroDescriptions[tipo] || fallback) : fallback;
}

// En constants/TipoCobro.ts
export const frecuencia = [
  { 
    value: 'lunes_a_viernes', 
    label: 'Lunes a Viernes',
    dias: [1,2,3,4,5], // Lunes=1, Martes=2, ..., Viernes=5
    sesiones: 12345
  },
  { 
    value: 'lunes_a_sabado', 
    label: 'Lunes a Sábado',
    dias: [1,2,3,4,5,6],
    sesiones: 123456
  },
  { 
    value: 'todos_los_dias', 
    label: 'Todos los Días',
    dias: [1,2,3,4,5,6,7],
    sesiones: 1234567
  },
  { 
    value: 'personalizado', 
    label: 'Personalizado',
    dias: [],
    sesiones: null
  }
];
  
export const tiposConcepto = [
  { value: 'fijo', label: 'Monto Fijo' },
  { value: 'porcentaje', label: 'Porcentaje' },
  { value: 'por_hora', label: 'Por Hora' }
];
