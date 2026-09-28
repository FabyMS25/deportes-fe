import { TicketComponent } from '../../modules/reports/ticket/ticket.component';
import { Component, EventEmitter, Input, Output, OnInit, TemplateRef, ViewChild, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { RuatRequestsService, ReservationPaymentConsultation } from 'src/app/core/services/ruatRequest.service';
import { ReservaPeriodoService } from 'src/app/core/services/api/reserva-periodo.service';
import { ReservaService } from 'src/app/core/services/api/reserva.service';

import { Reserva } from 'src/app/core/models/reserva.model';
import { ReservaPeriodo } from 'src/app/core/models/reservaPeriodo.model';

import { Contribuyente } from 'src/app/core/models/contribuyente.model';

import { EstadoReserva, EstadoValidacion, EstadoPago, StatusUtils } from 'src/app/core/constants/Estados';

import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-booking-periodo-modal', standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgbNavModule, TicketComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './modal-booking-school.component.html',
  styleUrls: ['./modal-booking-school.component.scss']
})
export class BookingPeriodoModalComponent implements OnInit, AfterViewInit {
  @Input() accion!: string;
  @Input() row!: Reserva;
  @Input() canActivate: any[] = [];
  @Input() selectedRows: Reserva[] = [];
  @Output() emitList = new EventEmitter();
  @ViewChild('annularModal') annularModal!: TemplateRef<any>;

  isLoading = false;
  reservationForm!: FormGroup;
  validationForm!: FormGroup;
  validationSubmitted = false;
  userData!: any;
  motivo = '';
  observation = '';

  consultationResults: ReservationPaymentConsultation[] = [];
  consultationResult?: ReservationPaymentConsultation;
  isConsultingRuat = false;
  activeTab = 1;
  months = [
    { value: 1, name: 'Enero' },
    { value: 2, name: 'Febrero' },
    { value: 3, name: 'Marzo' },
    { value: 4, name: 'Abril' },
    { value: 5, name: 'Mayo' },
    { value: 6, name: 'Junio' },
    { value: 7, name: 'Julio' },
    { value: 8, name: 'Agosto' },
    { value: 9, name: 'Septiembre' },
    { value: 10, name: 'Octubre' },
    { value: 11, name: 'Noviembre' },
    { value: 12, name: 'Diciembre' }
  ];

  EstadoPago = EstadoPago;

  constructor(
    private modalService: NgbModal,
    private formBuilder: FormBuilder,
    private authService: AuthenticationService,
    private ruatService: RuatRequestsService,
    private reservaService: ReservaService,
    private reservaPeriodoService: ReservaPeriodoService
  ) {}

  ngOnInit(): void {
    this.userData = this.authService.currentUser();
    if (!this.authService.isTaxpayer()) this.userData = this.userData?.designacion?.personaDto;
    this.validationForm = this.formBuilder.group({
      validationStatus: [EstadoValidacion.APROBADA, Validators.required],
      validationObservation: ['']
    });
    const first = this.row?.reservasPeriodoDtoList?.[0];
    this.reservationForm = this.formBuilder.group({
      mes: [first?.mes, Validators.required], año: [first?.año, Validators.required],
      observaciones: [(this.row as any)?.observaciones || '']
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (!this.accion) return;
      switch (this.accion) {
        case 'annularModal':
          if (this.annularModal) {
            this.openDeleteModal(this.annularModal);
          }
          break;
        case 'ticketModal':
          this.openTicketModal();
          break;
        case 'consult':
          void this.consultPaymentInModal();
          break;
      }
    });
  }

  get periodosUnicosActuales(): string[] {
    return this.getPeriodosUnicos(this.row);
  }

  getPeriodosUnicos(reserva?: Reserva): string[] {
    const detalles = [...(reserva?.reservasPeriodoDtoList || [])]
      .sort((a, b) => Number(a.año) - Number(b.año) || Number(a.mes) - Number(b.mes));
    return Array.from(new Set(
      detalles
        .map(detalle => this.formatPeriodoDetalle(detalle))
        .filter(periodo => periodo !== 'N/A')
    ));
  }

  getPeriodoResumen(reserva?: Reserva): string {
    const periodos = this.getPeriodosUnicos(reserva);
    if (!periodos.length) return 'Sin período registrado';
    return periodos.length === 1 ? periodos[0] : `${periodos.length} períodos`;
  }

  get montoUnitarioActual(): number {
    const total = Number(this.row?.montoTotal || 0);
    const cantidad = this.row?.reservasPeriodoDtoList?.length || 1;
    return total / cantidad;
  }

  get form() {
    return this.reservationForm.controls;
  }

  setActiveTab(tab: number): void {
    this.activeTab = tab;
  }

  validateReservation(): void {
    this.validationSubmitted = true;

    if (!this.validationForm.valid) {
      this.notify('Por favor complete todos los campos de validación.', 'error');
      return;
    }

    this.isLoading = true;

    const validationData = this.validationForm.value;
    const isApproved = validationData.validationStatus === EstadoValidacion.APROBADA;
    const reservaUuid = this.row?.uuid;

    if (!reservaUuid) {
      this.isLoading = false;
      this.notify('No se pudo identificar la reserva.', 'error');
      return;
    }

    if (isApproved) {
      this.approveReserva(reservaUuid);
    } else {
      this.rejectReserva(reservaUuid, validationData.validationObservation);
    }
  }

  canValidateReservation(): boolean {
    const estadoValidacion = this.row?.estadoValidacion;
    const estadoReserva = this.row?.estadoReserva;

    return (
      estadoValidacion === EstadoValidacion.PENDIENTE &&
      estadoReserva === EstadoReserva.SOLICITADA &&
      this.canActivate?.includes('VALIDAR')
    );
  }

  canCancelReservation(): boolean {
    const estado = this.row?.estadoReserva;

    return (
      (estado === EstadoReserva.SOLICITADA || estado === EstadoReserva.PENDIENTE) &&
      this.canActivate?.includes('ANULAR')
    );
  }

  get closeAction() {
    return StatusUtils.reservationCloseAction(this.row, this.canActivate);
  }

  openDeleteModal(content: any): void {
    if (!this.closeAction) return;
    this.motivo = '';
    this.observation = '';
    this.modalService.open(content, { centered: true, size: 'md', backdrop: 'static' });
  }

  openTicketModal(): void {
    const modalRef = this.modalService.open(TicketComponent, { size: 'lg', windowClass: 'ticket-modal' });
    modalRef.componentInstance.reservationData = this.row;
    modalRef.componentInstance.bookingType = 'periodo';
    modalRef.componentInstance.autoLoad = true;
    modalRef.componentInstance.showAsModal = true;
  }

  annularData(formValues: any): void {
    const reserva = this.row;
    if (!formValues?.motivo?.trim() || !reserva || this.isLoading || this.closeAction?.kind !== 'annul') return;
    if (!reserva.numeroTasa?.trim() || reserva.estadoReserva === EstadoReserva.SOLICITADA) {
      this.notify('No corresponde anular una solicitud o mensualidad sin tasa. La solicitud requiere rechazo administrativo.', 'warning');
      return;
    }
    this.isLoading = true;
    this.reservaService.cancelReservation(reserva.uuid!, formValues.motivo, formValues.observation).subscribe({
      next: (resultado) => {
        this.isLoading = false;
        const confirmada = resultado.reservaDto?.uuid === reserva.uuid
          && resultado.reservaDto?.estadoReserva === EstadoReserva.CANCELADA;
        const mensaje = this.ruatService.getResponseMessage(resultado.respuestaRuat, '');
        if (resultado.ruat === 'PAGO_CONFIRMADO' && resultado.resultado === 'ACTUALIZADA'
            && resultado.reservaDto?.uuid === reserva.uuid) {
          this.row = resultado.reservaDto;
          this.notify(mensaje || resultado.detalleLocal || 'Pago confirmado; no se anuló la tasa.', 'info');
          this.emitList.emit();
          this.onCloseModal();
          return;
        }
        if (!confirmada) {
          this.notify(mensaje || resultado.detalleLocal || 'No se confirmó la cancelación local.', 'error');
          return;
        }
        this.row = resultado.reservaDto;
        this.notify(mensaje || 'La mensualidad ya está cancelada.', 'success');
        this.emitList.emit();
        this.onCloseModal();
      },
      error: (error) => {
        this.isLoading = false;
        this.notify(error.message || 'No se confirmó la cancelación. Verifique el resultado antes de reintentar.', 'error');
      }
    });
  }

  private cancelReservaLocal(
    reserva: Reserva,
    motivo: string,
    successMessage: string,
    notificationType: 'success' | 'warning'
  ): void {
    if (!reserva.uuid) {
      this.isLoading = false;
      this.notify('No se pudo identificar la mensualidad para actualizarla localmente.', 'error');
      return;
    }

    this.reservaService.cancelReservation(reserva.uuid, motivo || 'Anulación de mensualidad').subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.notify(successMessage, notificationType);
        this.emitList.emit();
        this.onCloseModal();
      },
      error: () => {
        this.isLoading = false;
        this.notify(
          'La anulación fue aceptada por RUAT, pero hubo un error al actualizar la mensualidad localmente.',
          'warning'
        );
      }
    });
  }

  getMonthName(month: number): string {
    return this.months.find(m => m.value === month)?.name || '';
  }

  getReservationDetails(): ReservaPeriodo[] {
    return this.row?.reservasPeriodoDtoList || [];
  }

  canConsultPayment(): boolean {
    return !!this.row?.numeroTasa &&
      this.canActivate?.includes('ACTUALIZAR') &&
      this.row?.estadoReserva !== EstadoReserva.CANCELADA;
  }

  async consultPaymentInModal(): Promise<void> {
    if (this.isConsultingRuat) return;
    const rows = this.accion === 'consult' && this.selectedRows.length ? [...this.selectedRows] : [this.row];
    this.isConsultingRuat = true;
    this.consultationResults = [];
    this.consultationResult = undefined;
    this.activeTab = 2;
    try {
      for (const item of rows) {
        const result = await this.ruatService.consultReservationPayment(item);
        this.consultationResults.push(result);
      }
      this.consultationResult = this.consultationResults[0];
      if (this.consultationResults.some(result => result.type === 'success')) this.emitList.emit();
    } finally {
      this.isConsultingRuat = false;
    }
  }

  private parseRuatPaymentDate(fechaPago: string): Date | null {
    if (!fechaPago || !/^\d{2}\/\d{2}\/\d{4}$/.test(fechaPago)) {
      return null;
    }
    const parts = fechaPago.split('/').map(Number);
    return new Date(parts[2], parts[1] - 1, parts[0], 12, 0, 0, 0);
  }

  formatPeriodoDetalle(detalle?: ReservaPeriodo): string {
    const mes = Number(detalle?.mes);
    const año = Number(detalle?.año);
    if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(año) || año < 1) {
      return 'N/A';
    }
    return `${this.getMonthName(mes)} ${año}`;
  }

  getDocumentoContribuyente(contribuyente?: Contribuyente): string {
    if (!contribuyente) {
      return 'N/A';
    }
    return `${contribuyente.tipoDocumento || ''} ${contribuyente.numeroDocumento || 'N/A'}`.trim();
  }

  getStatusBadgeClass(estado: string | undefined): string {
    return StatusUtils.getStatusBadgeClass(estado || '');
  }

  getStatusAlertClass(estado: string | undefined): string {
    return StatusUtils.getStatusAlertClass(estado || '');
  }

  getStatusDescription(estado: string | undefined): string {
    return StatusUtils.getReservationStatusDescription(estado);
  }

  getValidationBadgeClass(estado: string): string {
    return StatusUtils.getStatusBadgeClass(estado);
  }

  private approveReserva(reservaUuid: string): void {
    const aprobadoPor = this.authService.currentUser()?.nombreCompleto || 'Sistema';

    this.reservaService.approveReservation(reservaUuid, aprobadoPor).subscribe({
      next: () => {
        this.isLoading = false;
        this.notify('Mensualidad aprobada exitosamente.', 'success');
        this.emitList.emit();
        this.openTicketModal();
      },
      error: (error) => {
        this.isLoading = false;
        this.notify(
          'Error al aprobar la mensualidad: ' + (error.error?.message || error.message),
          'error'
        );
      }
    });
  }

  private rejectReserva(reservaUuid: string, motivoRechazo: string): void {
    const aprobadoPor = this.authService.currentUser()?.nombreCompleto || 'Sistema';

    this.reservaService.rejectReservation(reservaUuid, motivoRechazo, aprobadoPor).subscribe({
      next: () => {
        this.isLoading = false;
        this.notify('Mensualidad rechazada exitosamente.', 'success');
        this.emitList.emit();
        this.onCloseModal();
      },
      error: (error) => {
        this.isLoading = false;
        this.notify(
          'Error al rechazar la mensualidad: ' + (error.error?.message || error.message),
          'error'
        );
      }
    });
  }

  canEditReservation(): boolean {
    return (
      this.row?.estadoReserva === EstadoReserva.PENDIENTE && !this.row?.numeroTasa &&
      this.canActivate?.includes('ACTUALIZAR')
    );
  }

  saveData(): void {
    if (!this.canEditReservation()) return;
    if (this.reservationForm.valid) {
      this.isLoading = true;

      const detallePrincipal = (this.row?.reservasPeriodoDtoList || [])[0];
      const updatedData: any = {
        ...detallePrincipal,
        mes: this.reservationForm.value.mes,
        año: this.reservationForm.value.año,
        reservaDto: {
          ...this.row,
          observaciones: this.reservationForm.value.observaciones
        }
      };

      this.updateReservaPeriodo(updatedData);
    } else {
      this.notify(
        'Formulario Inválido! Por favor complete todos los campos requeridos.',
        'error'
      );
    }
  }

  private updateReservaPeriodo(data: ReservaPeriodo): void {
    this.reservaPeriodoService.update(data).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.notify('Mensualidad actualizada exitosamente', 'success');
        this.emitList.emit();
        this.onCloseModal();
      },
      error: () => {
        this.isLoading = false;
        this.notify('Error al actualizar la mensualidad', 'error');
      }
    });
  }

  onCloseModal(): void {
    if (this.isLoading || this.isConsultingRuat) return;
    this.modalService.dismissAll();
  }

  private notify(message: string, type: any): void {
    Swal.fire({
      title: message,
      icon: type,
      timer: 4000,
      timerProgressBar: true,
      showConfirmButton: false
    });
  }
}
