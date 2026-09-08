import { UntypedFormBuilder } from '@angular/forms';
import { ModalOrganizationComponent } from './modal-organization/modal-organization.component';
import { ModalTaxpayerComponent } from './modal-taxpayer/modal-taxpayer.component';
import { Organizacion } from 'src/app/core/models/organizacion.model';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';

describe('Organization relationship editors', () => {
  const person = {uuid: 'coach', nombre: 'Ana', primerApellido: 'Perez', numeroDocumento: '123'} as unknown as Contribuyente;
  const school = {uuid: 'school', nombre: 'Atletismo', activo: true, representanteDto: {uuid: 'primary'}} as Organizacion;

  it('links an existing organization without replacing its primary representative', () => {
    const editor = new ModalTaxpayerComponent(null!, null!, null!, null!, null!, null!, null!);
    editor.organizationsList = [school];
    editor.vincularOrganizacion(school);
    expect(editor.organizacionesVinculadas[0].organizacionDto?.uuid).toBe('school');
    expect(school.representanteDto.uuid).toBe('primary');
    expect(editor.organizacionesDisponibles.length).toBe(0);
    editor.desvincularOrganizacion(0);
    expect(editor.organizacionesVinculadas.length).toBe(0);
    expect(school.activo).toBeTrue();
  });

  it('requires reassignment before removing the primary representative from the taxpayer editor', () => {
    const editor = new ModalTaxpayerComponent(null!, null!, null!, null!, null!, null!, null!);
    editor.row = {uuid: 'primary'} as Contribuyente;
    editor.organizacionesTemporales = [school];
    editor.desvincularOrganizacion(0);
    expect(editor.organizacionesTemporales.length).toBe(1);
  });

  it('adds additional people without replacing the selected primary and excludes duplicates from search', () => {
    const editor = new ModalOrganizationComponent(null!, null!, null!, new UntypedFormBuilder());
    editor.contentForm = new UntypedFormBuilder().group({representanteDto: [{uuid: 'primary'}]});
    editor.contribuyentesList = [person];
    editor.agregarRepresentante(person);
    expect(editor.contentForm.value.representanteDto.uuid).toBe('primary');
    expect(editor.representantes[0].contribuyenteDto?.uuid).toBe('coach');
    expect(editor.personasDisponibles.length).toBe(0);
  });
});
