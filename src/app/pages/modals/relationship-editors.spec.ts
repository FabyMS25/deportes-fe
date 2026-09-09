import { UntypedFormBuilder } from '@angular/forms';
import { ModalOrganizationComponent } from './modal-organization/modal-organization.component';
import { ModalTaxpayerComponent } from './modal-taxpayer/modal-taxpayer.component';
import { Organizacion } from 'src/app/core/models/organizacion.model';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';

const representante = { uuid: 'coach', nombre: 'Ana', primerApellido: 'Perez', numeroDocumento: '123' } as unknown as Contribuyente;
const school = {
  uuid: 'school',
  nombre: 'Atletismo',
  activo: true,
  representantesDto: [{ contribuyenteDto: representante }]
} as Organizacion;

describe('Organization relationship editors', () => {
  it('links an existing organization through the representative relationship list', () => {
    const editor = new ModalTaxpayerComponent(null!, null!, null!, null!, null!, null!, null!);
    editor.organizationsList = [school];
    editor.vincularOrganizacion(school);

    expect(editor.organizacionesVinculadas[0].organizacionDto?.uuid).toBe('school');
    expect(editor.organizacionesVinculadas[0].organizacionDto?.representantesDto?.[0].contribuyenteDto?.uuid).toBe('coach');
    expect(editor.organizacionesDisponibles.length).toBe(0);

    editor.desvincularOrganizacion(0);
    expect(editor.organizacionesTemporales.length).toBe(0);
    expect(editor.organizacionesVinculadas.length).toBe(0);
    expect(school.activo).toBeTrue();
  });

  it('adds representatives without requiring one main representative field', () => {
    const editor = new ModalOrganizationComponent(null!, null!, null!, new UntypedFormBuilder());
    editor.contribuyentesList = [representante];
    editor.agregarRepresentante(representante);

    expect(editor.representantes[0].contribuyenteDto?.uuid).toBe('coach');
    expect(editor.personasDisponibles.length).toBe(0);
  });
});