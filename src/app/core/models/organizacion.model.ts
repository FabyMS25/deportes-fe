import { TipoOrganizacion } from "../constants/Features";
import { Contribuyente } from "./contribuyente.model";
import { Reserva } from "./reserva.model";

export interface Organizacion {
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
  
  // Payment configuration
  requierePagoMensualidad: boolean;
  tarifaMensual?: number;
  permiteReservasGratuitas: boolean;

  representanteDto: Contribuyente;
  reservasDtoList?: Reserva[];
  // estudiantesDtoList?: EstudianteEscuela[];
}