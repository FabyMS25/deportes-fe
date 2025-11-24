export const TipoCobro = [
  {
    id: "1",
    value: "por_hora",
    label: "Por Horas",
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
    label: "Por Sesion",
  },
  {
    id: "6",
    value: "mensualidad",
    label: "Mensualidad",
  }
];
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