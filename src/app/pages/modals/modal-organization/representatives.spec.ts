import { UntypedFormBuilder } from '@angular/forms';
import { ModalOrganizationComponent } from './modal-organization.component';
// Synthetic fixtures for isolated tests; never used to create application records.
import { Organizacion } from 'src/app/core/models/organizacion.model';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';
const representante = { uuid: 'coach', nombre: 'Ana', primerApellido: 'Perez', numeroDocumento: '123' } as unknown as Contribuyente;
const school = {
  uuid: 'school',
  nombre: 'Atletismo',
  activo: true,
  representantesDto: [{ contribuyenteDto: representante }]
} as Organizacion;

describe('Organization representatives', () => {
  it('adds representatives without requiring one main representative field', () => {
    const editor = new ModalOrganizationComponent(null!, null!, null!, null!, new UntypedFormBuilder());
    editor.contribuyentesList = [representante];
    editor.agregarRepresentante(representante);

    expect(editor.representantes[0].contribuyenteDto?.uuid).toBe('coach');
    expect(editor.personasDisponibles.length).toBe(0);
  });
});
