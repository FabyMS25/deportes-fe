import { of, Subject, throwError } from 'rxjs';
import { ModalStudentComponent } from './modal-student.component';

describe('Student monthly history', () => {
  let component: ModalStudentComponent;
  let history: jasmine.Spy;
  let open: jasmine.Spy;
  beforeEach(() => {
    component = Object.create(ModalStudentComponent.prototype);
    history = jasmine.createSpy().and.returnValue(of([]));
    open = jasmine.createSpy().and.returnValue({ componentInstance: {} });
    Object.assign(component, { accion: 'show', row: { uuid: 'enrollment-a' },
      relacionesEstudiante: [{ uuid: 'enrollment-a' }, { uuid: 'enrollment-b' }],
      monthlyService: { getStudentHistory: history }, modalService: { open },
      destroy$: new Subject<void>(), monthlyHistory: [], monthlyLoaded: false,
      monthlyLoading: false, monthlyPage: 1, monthlyPageSize: 8 });
  });
  it('loads each enrollment once and retains canceled history in period order', () => {
    const canceled = { uuid: 'old', mes: 1, año: 2026, reservaDto: { uuid: 'r1', estadoReserva: 'CANCELADA' } };
    const latest = { uuid: 'new', mes: 2, año: 2026, reservaDto: { uuid: 'r2' } };
    history.and.callFake((uuid: string) => of(uuid === 'enrollment-a' ? [canceled] : [latest, canceled]));
    component.openMonthlyHistory();
    expect(history.calls.allArgs()).toEqual([['enrollment-a'], ['enrollment-b']]);
    expect(component.monthlyHistory.map(item => item.uuid)).toEqual(['new', 'old']);
    component.openMonthlyHistory();
    expect(history).toHaveBeenCalledTimes(2);
  });
  it('does not load history or open a ticket in edit mode', () => {
    component.accion = 'edit';
    component.openMonthlyHistory();
    component.openMonthlyTicket({ reservaDto: { uuid: 'r1' } } as any);
    expect(history).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });
  it('opens the selected registration and paginates the displayed rows', () => {
    component.monthlyHistory = Array.from({ length: 30 }, (_, i) => ({ uuid: String(i) } as any));
    component.monthlyPage = 4;
    expect(component.visibleMonthlyHistory.length).toBe(6);
    const reservation = { uuid: 'selected-registration' };
    component.openMonthlyTicket({ reservaDto: reservation } as any);
    expect(open.calls.mostRecent().returnValue.componentInstance.reservationData).toBe(reservation);
    expect(open.calls.mostRecent().args[1]).toEqual({ size: 'lg', windowClass: 'ticket-modal' });
    expect(open).toHaveBeenCalledTimes(1);
  });
  it('allows retry after a failed request', () => {
    history.and.returnValue(throwError(() => new Error('Unavailable')));
    component.openMonthlyHistory();
    expect(component.monthlyLoading).toBeFalse();
    expect(component.monthlyLoaded).toBeFalse();
    history.and.returnValue(of([]));
    component.openMonthlyHistory();
    expect(component.monthlyLoaded).toBeTrue();
  });
});
