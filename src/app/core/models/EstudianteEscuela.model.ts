import { Contribuyente } from "./contribuyente.model";
import { Organizacion } from "./organizacion.model";
import { ReservaPeriodo } from "./reservaPeriodo.model";

export interface EstudianteEscuela {
  uuid?: string;
  estudianteUuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;
  
  nombreCompleto?: string;
  fechaNacimiento?: Date | string;
  genero?: string;
  numeroDocumento?: string;
  telefono?: string;
  email?: string;

  fechaInscripcion: Date | string;
  fechaBaja?: Date;
  motivoBaja?: string;
  matricula?: string;
  activo: boolean;
    
  contribuyenteDto?: Contribuyente;
  organizacionDto: Organizacion;

  // Monthly payments
  mensualidadesDtoList?: ReservaPeriodo[];

  // Values calculated by the management view; they are not persisted.
  estadoInscripcion?: 'ACTIVA' | 'INACTIVA';
  estadoEstudiante?: 'ACTIVO' | 'INACTIVO';
  reactivacionBloqueada?: boolean;
  puedeGestionar?: boolean;
}
