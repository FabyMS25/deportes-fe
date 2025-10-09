import { Contribuyente } from "./contribuyente.models";
import { Reserva } from "./reserva.models";

export interface Organizacion {
  uuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;

  tipoOrganizacion:string;
  nombre:string;
  telefono?:string;
  email?: string;
  direccion?: string; 
  personeriaJuridica?: string;
  nroNit?: string;
  activo:boolean;

  representanteDto: Contribuyente;
  reservasDtoList?: Reserva[];
}
