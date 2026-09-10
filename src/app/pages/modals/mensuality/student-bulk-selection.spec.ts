import { MensualityComponent } from './mensuality.component';

describe('Mensualidad bulk student selection', () => {
  let component: any;
  beforeEach(() => {
    component = Object.create(MensualityComponent.prototype);
    component.selection = { school: { uuid: 'school' }, baseReservation: { contribuyenteDto: { uuid: 'coach' } }, students: [], detailKeys: new Set(), studentSearch: '' };
    component.estudiantes = [
      { uuid: 'ana', nombreCompleto: 'Ana', activo: true, contribuyenteDto: { uuid: 'coach' }, organizacionDto: { uuid: 'school' } },
      { uuid: 'luis', nombreCompleto: 'Luis', activo: true, contribuyenteDto: { uuid: 'coach' }, organizacionDto: { uuid: 'school' } },
      { uuid: 'inactive', activo: false, organizacionDto: { uuid: 'school' } },
      { uuid: 'other', activo: true, contribuyenteDto: { uuid: 'coach' }, organizacionDto: { uuid: 'other-school' } }
    ];
    component.catalogs = { periodRegistrations: [], periods: [] };
    spyOn(component, 'syncDefaultContribuyente');
    spyOn(component, 'getDefaultPeriodoMatch').and.returnValue({ mes: 9, año: 2026 });
  });
  it('excludes another coach and unassigned students in the same school', () => {
    component.estudiantes.push({ uuid: 'other-coach', activo: true, organizacionDto: { uuid: 'school' }, contribuyenteDto: { uuid: 'different' } });
    component.estudiantes.push({ uuid: 'unassigned', activo: true, organizacionDto: { uuid: 'school' } });
    component.selectAllVisibleStudents();
    expect(component.selection.students.map((s: any) => s.uuid)).toEqual(['ana', 'luis']);
    component.selection.baseReservation = undefined;
    expect(component.estudiantesFiltrados).toEqual([]);
  });
  it('selects only active students of this school and is idempotent', () => {
    component.selectAllVisibleStudents();
    component.selectAllVisibleStudents();
    expect(component.selection.students.map((s: any) => s.uuid)).toEqual(['ana', 'luis']);
    expect(component.selection.detailKeys.size).toBe(2);
  });
  it('preserves hidden selections and does not restore intentionally cleared months', () => {
    component.selectAllVisibleStudents();
    component.clearStudentPeriods(component.estudiantes[0]);
    component.selection.studentSearch = 'Ana';
    component.selectAllVisibleStudents();
    expect(component.selection.students.length).toBe(2);
    expect(component.getSelectedPeriodCount(component.estudiantes[0])).toBe(0);
  });
  it('excludes registered months and clears students and months together', () => {
    component.catalogs.periodRegistrations = [{ estudianteEscuelaDto: { uuid: 'ana' }, reservaDto: { organizacionDto: { uuid: 'school' } }, mes: 9, año: 2026 }];
    component.selectAllVisibleStudents();
    expect(component.selection.detailKeys.size).toBe(1);
    component.clearAllStudents();
    expect(component.selection.students).toEqual([]);
    expect(component.selection.detailKeys.size).toBe(0);
  });
});
