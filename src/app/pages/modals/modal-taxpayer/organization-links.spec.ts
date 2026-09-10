import { ModalTaxpayerComponent } from './modal-taxpayer.component';
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

describe('Taxpayer organization links', () => {
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


});
