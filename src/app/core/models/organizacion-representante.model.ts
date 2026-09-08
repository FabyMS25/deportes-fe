import { Contribuyente } from './contribuyente.model';
import { Organizacion } from './organizacion.model';

export interface OrganizacionRepresentante {
  organizacionDto?: Organizacion;
  contribuyenteDto?: Contribuyente;
}
