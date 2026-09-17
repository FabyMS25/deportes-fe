import { TipoOrganizacion } from "../constants/Features";
import { Contribuyente } from "./contribuyente.model";
import { Reserva } from "./reserva.model";

export interface Organizacion {
  representantesDto?: import('./organizacion-representante.model').OrganizacionRepresentante[];
  uuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;

  activo:boolean;

  tipoOrganizacion:TipoOrganizacion; 
  personeriaJuridica?: string;
  nombre:string;
  telefono?:string;
  email?: string;
  direccion?: string; 
  nroNit?: string;

  entrenador?: string;
  disciplina?: string;
  codigoEscuela?: string;
  
  
  requierePagoMensualidad: boolean;// Payment configuration
  tarifaMensual?: number;
  permiteReservasGratuitas: boolean;

  reservasDtoList?: Reserva[];

  representantesTexto?: string;
  representantesDocumentos?: string;
  representantesEmails?: string;
  representantesTelefonos?: string;
  // estudiantesDtoList?: EstudianteEscuela[];
}
