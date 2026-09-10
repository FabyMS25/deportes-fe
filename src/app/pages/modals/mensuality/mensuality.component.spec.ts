import { convertToParamMap } from '@angular/router';
import Swal from 'sweetalert2';
import { MensualityComponent } from './mensuality.component';
import { BookingPeriodoModalComponent } from '../modal-booking-school/modal-booking-school.component';
import { EventEmitter } from '@angular/core';

describe('Mensualidad registration page', () => {
  const create = (params = {}) => {
    const page: any = Object.create(MensualityComponent.prototype);
    page.pageRouter = { navigate: jasmine.createSpy('navigate') };
    page.pageRoute = { snapshot: { queryParamMap: convertToParamMap(params) } };
    page.pageAuth = { hasPermission: () => ['CREAR'] };
    page.selection = { students: [], detailKeys: new Set(), studentSearch: '' };
    page.initializePageContext();
    return page;
  };

  it('restores the period from the URL for direct opening and refresh', () => {
    expect(create({ mes: '9', anio: '2026' }).defaultPeriodo).toEqual({ mesFiltro: 9, anioFiltro: 2026 });
    expect(create({ mes: '99', anio: 'bad' }).defaultPeriodo).toEqual({ mesFiltro: undefined, anioFiltro: undefined });
  });

  it('can leave an empty or successfully completed registration', async () => {
    const page = create();
    expect(await page.canLeave()).toBeTrue();
    Object.assign(page, { isLoading: false, reservationForm: { dirty: true }, selection: { school: {}, students: [], detailKeys: new Set() } });
    page.completed = true;
    expect(await page.canLeave()).toBeTrue();
  });

  it('retains selections when the user chooses to continue registering', async () => {
    const page = create();
    Object.assign(page, { isLoading: false, reservationForm: { dirty: true }, selection: { school: {}, students: [{ uuid: 'student' }], detailKeys: new Set(['month']) } });
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: false } as any));
    expect(await page.canLeave()).toBeFalse();
    expect(page.selection.students.length).toBe(1);
    expect(page.selection.detailKeys.size).toBe(1);
  });

  it('blocks navigation during registration and warns on browser reload', async () => {
    const page = create();
    Object.assign(page, { isLoading: true });
    expect(await page.canLeave()).toBeFalse();
    const event = { preventDefault: jasmine.createSpy(), returnValue: undefined } as any;
    page.beforeUnload(event);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('closing the page requests navigation without resetting the form or dismissing unrelated modals', () => {
    const form: any = Object.create(BookingPeriodoModalComponent.prototype);
    form.pageMode = true;
    form.isLoading = false;
    form.closeRequested = new EventEmitter<void>();
    form.reservationForm = { reset: jasmine.createSpy() };
    form.modalService = { dismissAll: jasmine.createSpy() };
    const closed = jasmine.createSpy();
    form.closeRequested.subscribe(closed);
    form.onCloseModal();
    expect(closed).toHaveBeenCalled();
    expect(form.reservationForm.reset).not.toHaveBeenCalled();
    expect(form.modalService.dismissAll).not.toHaveBeenCalled();
  });
});
