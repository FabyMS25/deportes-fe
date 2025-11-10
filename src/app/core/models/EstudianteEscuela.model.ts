import { Contribuyente } from "./contribuyente.model";
import { Organizacion } from "./organizacion.models";
import { Reserva } from "./reserva.models";

export interface EstudianteEscuela {
  uuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;
  
  nombreCompleto?: string;
  fechaNacimiento?: Date;
  genero?: string;
  numeroDocumento?: string;
  telefono?: string;
  email?: string;

  fechaInscripcion: Date;
  fechaBaja?: Date;
  matricula: string;
  activo: boolean;
    
  contribuyenteDto: Contribuyente;

  // Monthly payments
  mensualidadesDtoList?: Reserva[];
}