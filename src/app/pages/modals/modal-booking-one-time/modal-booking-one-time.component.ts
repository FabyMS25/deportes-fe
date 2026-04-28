import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnChanges,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  AfterViewInit,
  CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NgbModal, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ConfiguracionSistemaService } from 'src/app/core/services/api/configuracionSistema.service';
import { RuatRequestsService } from 'src/app/core/services/ruatRequest.service';
import { ReservaPuntualService } from 'src/app/core/services/api/reserva-puntual.service';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { PagoService } from 'src/app/core/services/api/pago.service';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { ReservaPuntual } from 'src/app/core/models/reservaPuntual.model';
import { Reserva } from 'src/app/core/models/reserva.model';
import { Pago } from 'src/app/core/models/pago.model';
import { TicketComponent } from '../../modules/reports/ticket/ticket.component';
import { CityAcronym } from 'src/app/core/constants/Places';
import { EstadoReserva, EstadoValidacion, EstadoPago } from 'src/app/core/constants/Estados';
import { BookingDetailModalComponent } from '../booking-detail-modal/booking-detail-modal.component';

@Component({
  selector: 'app-booking-one-time-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbNavModule, FormsModule, TicketComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './modal-booking-one-time.component.html',
  styleUrls: ['./modal-booking-one-time.component.scss'],
})
export class BookingOneTimeModalComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() accion!: string;
  @Input() row!: ReservaPuntual;
  @Input() canActivate!: any[];
  @Output() emitList = new EventEmitter();
  @Input() openedFromCalendar: boolean = false;
  @Input() calendarContext?: {
    reserva: Reserva;
    clickedDate?: Date;
    horaInicio?: string;
    horaFin?: string;
    canActivate: string[];
  };

  @ViewChild('validationModal') validationModel!: TemplateRef<any>;
  @ViewChild('ticketModal') ticketModal!: TemplateRef<any>;
  @ViewChild('annularModal') annularModal!: TemplateRef<any>;

  activeTab = 1;
  today: Date = new Date();

  systemConfigList: ConfiguracionSistema[] = [];
  EstadoReserva = EstadoReserva;
  EstadoPago = EstadoPago;
  CityAcronym = CityAcronym;

  userData!: any;
  motivo = '';
  observation = '';

  reservationForm: FormGroup;
  validationForm: FormGroup;
  submitted = false;
  validationSubmitted = false;
  showLoading = false;
  originalDurationMinutes = 0;

  constructor(
    private modalService: NgbModal,
    private formBuilder: FormBuilder,
    private authService: AuthenticationService,
    private systemConfigsService: ConfiguracionSistemaService,
    private ruatService: RuatRequestsService,
    private reservaPuntualService: ReservaPuntualService,
    private reservaService: ReservaService,
    private pagoService: PagoService
  ) {
    this.reservationForm = this.buildReservationForm();
    this.validationForm = this.buildValidationForm();
  }

  ngOnInit(): void {
    this.userData = this.authService.currentUser();
    if (this.authService.tokenUser() !== 'CONTRIBUYENTE_SESSION') {
      this.userData = this.userData.designacion.personaDto;
    }

    this.getConfigsSystem();
    this.configureByAction();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['accion'] || changes['row']) {
      this.configureByAction();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (!this.accion) return;

      switch (this.accion) {
        case 'validarModal':
          this.openValidationModal(this.validationModel);
          break;
        case 'annularModal':
          if (this.annularModal) this.openDeleteModal(this.annularModal);
          break;
        case 'ticketModal':
          this.openTicketModal(this.ticketModal);
          break;
      }
    });
  }

  private buildReservationForm(): FormGroup {
    return this.formBuilder.group({
      fechaUso: ['', Validators.required],
      horaInicio: ['', Validators.required],
      horaFin: [{ value: '', disabled: true }, Validators.required],
      observaciones: ['']
    });
  }

  private buildValidationForm(): FormGroup {
    return this.formBuilder.group({
      validationStatus: [EstadoValidacion.APROBADA, Validators.required],
      validationObservation: ['']
    });
  }

  private configureByAction(): void {
    this.setupValidationForm();

    if (this.accion === 'edit') {
      if (!this.row || !this.row.reservaDto) return;

      if (!this.canReschedule()) {
        this.notify('Solo se puede cambiar horario cuando la reserva está en estado PENDIENTE y aún no inició.', 'warning');
        this.onCloseModal();
        return;
      }

      this.setupReservationForm();
    } else {
      this.reservationForm.reset({
        fechaUso: '',
        horaInicio: '',
        horaFin: '',
        observaciones: ''
      });
      this.reservationForm.markAsPristine();
      this.reservationForm.markAsUntouched();
    }
  }

  private setupReservationForm(): void {
    this.originalDurationMinutes = this.getOriginalDurationMinutes();

    const horaInicio = this.toTimeInputValue(this.row?.horaInicio);
    const horaFin = this.toTimeInputValue(this.row?.horaFin);

    this.reservationForm.reset({
      fechaUso: this.formatDateForInput(this.row?.fechaUso),
      horaInicio,
      horaFin,
      observaciones: this.row?.observaciones || ''
    });
    this.recalculateEndTime(horaInicio);
    this.reservationForm.markAsPristine();
    this.reservationForm.markAsUntouched();
  }
  private recalculateEndTime(startTime?: string | null): void {
    if (!startTime || this.originalDurationMinutes <= 0) {
      this.reservationForm.get('horaFin')?.setValue('', { emitEvent: false });
      return;
    }

    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = startMinutes + this.originalDurationMinutes;

    if (endMinutes > 24 * 60) {
      this.reservationForm.get('horaFin')?.setValue('', { emitEvent: false });
      return;
    }

    this.reservationForm.get('horaFin')?.setValue(
      this.minutesToTime(endMinutes),
      { emitEvent: false }
    );
  }

  onHoraInicioChange(): void {
    const horaInicio = this.reservationForm.get('horaInicio')?.value;
    this.recalculateEndTime(horaInicio);
  }

  private parseLocalDate(dateValue: string | Date): Date {
    if (dateValue instanceof Date) {
      return new Date(
        dateValue.getFullYear(),
        dateValue.getMonth(),
        dateValue.getDate()
      );
    }

    if (typeof dateValue === 'string' && dateValue.includes('-')) {
      const [year, month, day] = dateValue.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    const parsed = new Date(dateValue);
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  private formatDateForInput(dateValue: string | Date | undefined): string {
    if (!dateValue) return '';
    const date = this.parseLocalDate(dateValue);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }



  private setupValidationForm(): void {
    this.validationForm.reset({
      validationStatus: EstadoValidacion.APROBADA,
      validationObservation: ''
    });

    this.validationForm.get('validationStatus')?.valueChanges.subscribe((status) => {
      this.updateObservationValidation(status);
    });

    this.updateObservationValidation(this.validationForm.get('validationStatus')?.value);
  }

  get form() {
    return this.reservationForm.controls;
  }

  get validationFormControls() {
    return this.validationForm.controls;
  }

  private updateObservationValidation(status: string): void {
    const observationControl = this.validationForm.get('validationObservation');
    if (!observationControl) return;

    if (status === EstadoValidacion.RECHAZADA) {
      observationControl.setValidators([Validators.required]);
    } else {
      observationControl.clearValidators();
    }
    observationControl.updateValueAndValidity();
  }

  private getOriginalDurationMinutes(): number {
    const start = this.timeToMinutes(this.row?.horaInicio);
    const end = this.timeToMinutes(this.row?.horaFin);
    return end - start;
  }

  private timeToMinutes(time?: string): number {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private minutesToTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private toTimeInputValue(time?: string): string {
    if (!time) return '';
    return time.slice(0, 5);
  }

  private syncEndTime(startTime: string): void {
    if (!startTime || !this.originalDurationMinutes) return;

    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = startMinutes + this.originalDurationMinutes;

    if (endMinutes >= 24 * 60) {
      this.reservationForm.get('horaFin')?.setValue('', { emitEvent: false });
      return;
    }

    this.reservationForm.get('horaFin')?.setValue(this.minutesToTime(endMinutes), { emitEvent: false });
  }

  private canReschedule(): boolean {
    if (!this.row?.reservaDto) return false;
    return this.row.reservaDto.estadoReserva === EstadoReserva.PENDIENTE && !this.hasUsageDateTimePassed();
  }

  private hasUsageDateTimePassed(): boolean {
    if (!this.row?.fechaUso || !this.row?.horaInicio) return false;

    const fecha = this.parseLocalDate(this.row.fechaUso);
    const [h, m, s] = (this.row.horaInicio || '00:00:00').split(':').map(Number);

    fecha.setHours(h || 0, m || 0, s || 0, 0);

    return fecha.getTime() <= new Date().getTime();
  }


  private validateScheduleForm(): string | null {
    const raw = this.reservationForm.getRawValue();
    const { fechaUso, horaInicio, horaFin } = raw;

    if (!fechaUso || !horaInicio || !horaFin) {
      return 'Debe completar fecha de uso y hora inicio.';
    }

    const start = new Date(`${fechaUso}T${horaInicio}:00`);
    const end = new Date(`${fechaUso}T${horaFin}:00`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 'El horario ingresado no es válido.';
    }

    if (end <= start) {
      return 'La hora fin debe ser mayor a la hora inicio.';
    }
    const newDuration = Math.round((end.getTime() - start.getTime()) / 60000);
    if (newDuration !== this.originalDurationMinutes) {
      return 'La duración debe mantenerse igual a la reserva original.';
    }
    if (start <= new Date()) {
      return 'Solo puede reprogramar a una fecha y hora futura.';
    }

    return null;
  }

  saveData(): void {
    this.submitted = true;

    if (this.reservationForm.invalid) {
      this.notify('Formulario inválido. Complete los campos requeridos.', 'error');
      return;
    }

    const validationError = this.validateScheduleForm();
    if (validationError) {
      this.notify(validationError, 'warning');
      return;
    }

    const raw = this.reservationForm.getRawValue();

    const updatePayload: ReservaPuntual = {
      ...this.row,
      fechaUso: raw.fechaUso,
      horaInicio: `${raw.horaInicio}:00`,
      horaFin: `${raw.horaFin}:00`,
      observaciones: raw.observaciones
    };

    this.validateAndUpdateSchedule(updatePayload);
  }


  setActiveTab(tab: number): void {
    this.activeTab = tab;
  }

  openValidationModal(content: any) {
    this.setupValidationForm();
    this.validationSubmitted = false;

    const modalRef = this.modalService.open(content, {
      centered: true,
      size: 'md',
      backdrop: 'static'
    });

    modalRef.dismissed.subscribe(() => {
      if (this.accion === 'validar') this.onCloseModal();
    });

    modalRef.closed.subscribe(() => {
      if (this.accion === 'validar') this.onCloseModal();
    });
  }

  openDeleteModal(content: any) {
    this.accion = content;
    this.motivo = '';
    this.observation = '';
  }

  openTicketModal(content: any) {
    this.modalService.open(content, { centered: true, size: 'md' });
    this.emitList.emit();
  }

  private validateAndUpdateSchedule(data: ReservaPuntual): void {
    const uuidCampo = this.row?.reservaDto?.campoDeportivoDto?.uuid;
    const excludeReservaUuid = this.row?.reservaDto?.uuid;
    if (!uuidCampo) {
      this.notify('No se pudo identificar el campo deportivo.', 'error');
      return;
    }
    this.showLoading = true;
    this.reservaPuntualService.validarCambioHorario(
      uuidCampo,
      this.formatDateForInput(data.fechaUso),
      data.horaInicio,
      data.horaFin,
      excludeReservaUuid
    ).subscribe({
      next: (resp: any) => {
        const existeConflicto = !!resp?.payload;

        if (existeConflicto) {
          this.showLoading = false;
          this.notify('Existe conflicto con otra reserva en ese horario.', 'warning');
          return;
        }

        this.updateReservaPuntual(data)
          .then(() => {
            this.showLoading = false;
            this.notify('Horario actualizado exitosamente.', 'success');
            this.emitList.emit();
            this.onCloseModal();
          })
          .catch((error) => {
            this.showLoading = false;
            this.notify(error?.message || 'No se pudo actualizar el horario.', 'error');
          });
      },
      error: (error: any) => {
        this.showLoading = false;
        this.notify(error?.error?.payload || error?.error?.message || 'Error al validar conflicto de horario.', 'error');
      }
    });
  }

  validateReservation() {
    this.validationSubmitted = true;
    this.updateObservationValidation(this.validationForm.value.validationStatus);

    if (this.validationForm.valid) {
      this.showLoading = true;
      const validationData = this.validationForm.value;
      const isApproved = validationData.validationStatus === EstadoValidacion.APROBADA;
      const reservaUuid = this.row.reservaDto?.uuid;

      if (!reservaUuid) {
        this.showLoading = false;
        this.notify('Error: No se pudo identificar la reserva', 'error');
        return;
      }

      if (isApproved) {
        this.approveReserva(reservaUuid, validationData.validationObservation);
      } else {
        this.rejectReserva(reservaUuid, validationData.validationObservation);
      }
    } else {
      this.notify('Por favor complete todos los campos de validación', 'error');
    }
  }

  annularData(formValues: any) {
    if (!formValues || !this.row?.reservaDto) {
      this.notify('No se pudo obtener los datos de la reserva', 'error');
      return;
    }

    const reserva = this.row.reservaDto;
    if (reserva.esReservaGratuita && (!reserva.numeroTasa || reserva.numeroTasa.trim() === '')) {
      this.cancelGratuitousReservation(reserva, formValues);
    } else {
      this.cancelPaidReservation(reserva, formValues);
    }
  }

  confirmUsage() {
    Swal.fire({
      title: 'Confirmar Uso',
      text: '¿Estás seguro de que la reserva se ha utilizado completamente?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#299cdb',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
        this.showLoading = true;
        const updatedReserva: any = {
          ...this.row,
          reservaDto: {
            ...this.row.reservaDto,
            estadoReserva: EstadoReserva.COMPLETADA,
          }
        };

        this.updateReservaPuntual(updatedReserva).then(() => {
          this.showLoading = false;
          this.notify('Reserva marcada como completada exitosamente', 'success');
          this.emitList.emit();
          this.onCloseModal();
        }).catch(error => {
          this.showLoading = false;
          this.notify('Error al actualizar la reserva: ' + error, 'error');
        });
      }
    });
  }

  private getConfigsSystem() {
    this.systemConfigsService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.systemConfigList = data.payload;
        }
      }
    });
  }

  private updateReservaPuntual(data: any): Promise<ReservaPuntual> {
    return new Promise((resolve, reject) => {
      this.reservaPuntualService.update(data).subscribe({
        next: (resp: any) => {
          if (resp['status'] === 'OK') {
            resolve(resp.payload);
          } else {
            reject(resp.payload);
          }
        },
        error: (error) => reject(error)
      });
    });
  }

  private updateReserva(data: Reserva): Promise<Reserva> {
    return new Promise((resolve, reject) => {
      this.reservaService.update(data).subscribe({
        next: (resp: any) => {
          if (resp['status'] === 'OK') {
            resolve(resp.payload);
          } else {
            reject(resp.payload);
          }
        },
        error: (error) => reject(error)
      });
    });
  }

  private rejectReserva(reservaUuid: any, motivoRechazo: string = '') {
    const aprobadoPor = this.userData.nombreCompleto || this.userData.fullName;
    this.reservaService.rechazarReserva(reservaUuid, motivoRechazo, aprobadoPor).subscribe({
      next: async () => {
        this.showLoading = false;
        this.openTicketModal(this.ticketModal);
        this.notify('Reserva rechazada exitosamente y notificación enviada al contribuyente', 'success');
      },
      error: (error) => {
        this.showLoading = false;
        this.notify('Error al rechazar la reserva: ' + (error.error?.message || error.message), 'error');
      }
    });
  }

  private async approveReserva(reservaUuid: any, observaciones: string = '') {
    try {
      this.showLoading = true;

      const reservaCompleta = await this.getReservaByUuid(reservaUuid);

      const reservaConTasa = await this.registerReservationInRuat(reservaCompleta);

      const aprobadoPor = this.userData.nombreCompleto || this.userData.fullName;

      const reservaAprobada = await this.approveReservaAfterRuat(reservaConTasa.uuid!, aprobadoPor);

      this.showLoading = false;
      this.openTicketModal(this.ticketModal);
      this.notify('Reserva aprobada exitosamente y registrada en RUAT', 'success');
      this.emitList.emit();
    } catch (error: any) {
      this.showLoading = false;
      this.notify(error?.message || 'No se pudo aprobar la reserva porque falló el registro en RUAT.', 'error');
    }
  }

  private registerReservationInRuat(reservaData: Reserva): Promise<Reserva> {
    return new Promise((resolve, reject) => {
      const codigoAlcaldia = this.systemConfigList.find(config => config.clave === 'CODIGO_ALCALDIA_RUAT')?.valorTexto || '';
      const codigoUsuario = this.systemConfigList.find(config => config.clave === 'CODIGO_USUARIO_RUAT')?.valorTexto || '';
      const servicioMunicipal = this.systemConfigList.find(config => config.clave === 'SERVICIO_MUNICIPAL_RUAT')?.valorTexto || '';

      const ruatData = {
        codigoAlcaldia,
        codigoUsuario: reservaData.contribuyenteDto.codigoContribuyente,
        codigoContribuyente: reservaData.contribuyenteDto.codigoContribuyente,
        servicioMunicipal,
        datosConcepto: [{
          numero: '1',
          codigoClasificador: reservaData.tarifaDto.clasificadorRuatDto.codigo,
          tipoArancel: reservaData.tarifaDto.clasificadorRuatDto.tipoArancel || 'DI',
          monto: reservaData.montoTotal
        }],
        observacion:
          reservaData.reservaPuntualDto?.observaciones ||
          reservaData.reservaRecurrenteDto?.observaciones ||
          'Reserva de Cancha Deportiva GAMQ'
      };

      const code = reservaData.contribuyenteDto.codigoContribuyente || '';

      this.ruatService.createTasa(codigoAlcaldia, codigoUsuario, servicioMunicipal, ruatData, code)
        .subscribe({
          next: async (response: any) => {
            try {
              if (response?.status !== 'OK') {
                reject(new Error(response?.mensaje || 'No se pudo registrar la tasa en RUAT'));
                return;
              }

              if (!response?.payload?.continuarFlujo || !response?.payload?.numeroTasa) {
                reject(new Error(response?.payload?.mensaje || 'RUAT no devolvió un número de tasa válido'));
                return;
              }

              reservaData.numeroTasa = response.payload.numeroTasa;

              const updatedReserva = await this.updateReserva(reservaData);
              resolve(updatedReserva);
            } catch (err) {
              reject(err);
            }
          },
          error: (error) => {
            reject(new Error(error?.error?.payload || error?.error?.mensaje || error?.message || 'Error de conexión con RUAT'));
          }
        });
    });
  }
  private getReservaByUuid(uuid: string): Promise<Reserva> {
    return new Promise((resolve, reject) => {
      this.reservaService.getByUuid(uuid).subscribe({
        next: (resp: any) => {
          if (resp?.status === 'OK') {
            resolve(resp.payload);
          } else {
            reject(new Error(resp?.payload || 'No se pudo obtener la reserva'));
          }
        },
        error: (error) => reject(new Error(error?.error?.message || error?.message || 'Error al obtener la reserva'))
      });
    });
  }
  private approveReservaAfterRuat(reservaUuid: string, aprobadoPor: string): Promise<Reserva> {
    return new Promise((resolve, reject) => {
      this.reservaService.aprobarReserva(reservaUuid, aprobadoPor).subscribe({
        next: (resp: any) => {
          if (resp?.status === 'OK') {
            resolve(resp.payload);
          } else {
            reject(new Error(resp?.payload || 'No se pudo aprobar la reserva'));
          }
        },
        error: (error) => reject(new Error(error?.error?.message || error?.message || 'Error al aprobar la reserva'))
      });
    });
  }


  private cancelGratuitousReservation(reserva: Reserva, formValues: any) {
    const updatedReserva: Reserva = {
      ...reserva,
      estadoReserva: EstadoReserva.CANCELADA,
      motivoRechazo: formValues.motivo
    };

    this.showLoading = true;
    this.reservaService.update(updatedReserva).subscribe({
      next: () => {
        this.showLoading = false;
        Swal.fire({
          title: 'Reserva Anulada!',
          text: 'La reserva gratuita ha sido anulada exitosamente.',
          icon: 'success',
          confirmButtonColor: '#299cdb',
          timer: 5000,
          timerProgressBar: true,
        });
        this.emitList.emit();
        this.modalService.dismissAll('close click');
      },
      error: () => {
        this.showLoading = false;
        this.notify('Error al anular la reserva gratuita localmente', 'error');
      }
    });
  }

  private cancelPaidReservation(reserva: Reserva, formValues: any) {
    if (!reserva.numeroTasa) {
      this.notify('No se pudo obtener el número de tasa para la anulación en RUAT', 'error');
      return;
    }

    const codigoAlcaldia = this.systemConfigList.find(config => config.clave === 'CODIGO_ALCALDIA_RUAT')?.valorTexto || '';
    const codigoUsuario = this.systemConfigList.find(config => config.clave === 'CODIGO_USUARIO_RUAT')?.valorTexto || '';

    const requestData = {
      numeroTasa: reserva.numeroTasa,
      motivo: formValues.motivo,
      observacion: formValues.observation
    };

    this.showLoading = true;
    this.ruatService.cancelTasa(codigoAlcaldia, codigoUsuario, requestData).subscribe({
      next: (resp: any) => {
        if (resp['status'] === 'OK') {
          const text = resp.payload['mensajeConfirmacion'];
          const updatedReserva: Reserva = {
            ...reserva,
            estadoReserva: EstadoReserva.CANCELADA,
            motivoRechazo: formValues.motivo
          };

          this.reservaService.update(updatedReserva).subscribe({
            next: () => {
              this.showLoading = false;
              Swal.fire({
                title: 'Anulado!',
                text: text,
                icon: 'success',
                confirmButtonColor: '#299cdb',
                timer: 5000,
                timerProgressBar: true,
              });
              this.emitList.emit();
              this.modalService.dismissAll('close click');
            },
            error: () => {
              this.showLoading = false;
              this.notify('Reserva anulada en RUAT pero error al actualizar localmente', 'warning');
            }
          });
        } else {
          this.showLoading = false;
          this.notify(resp.payload || 'Error al anular en RUAT', 'error');
        }
      },
      error: () => {
        this.showLoading = false;
        this.notify('Error al realizar la anulación en RUAT', 'error');
      },
    });
  }

  goBackToCalendarView(): void {
    this.modalService.dismissAll();
    const modalRef = this.modalService.open(BookingDetailModalComponent, {
      backdrop: true, size: 'md', centered: true
    });
    modalRef.componentInstance.reserva = this.calendarContext!.reserva;
    modalRef.componentInstance.clickedDate = this.calendarContext!.clickedDate;
    modalRef.componentInstance.horaInicio = this.calendarContext!.horaInicio;
    modalRef.componentInstance.horaFin = this.calendarContext!.horaFin;
    modalRef.componentInstance.canActivate = this.calendarContext!.canActivate;
    modalRef.componentInstance.emitList.subscribe(() => this.emitList.emit());
  }

  public onCloseModal() {
    if (this.reservationForm) {
      this.reservationForm.reset();
    }
    if (this.validationForm) {
      this.validationForm.reset();
    }
    this.modalService.dismissAll();
    this.activeTab = 1;
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

  private handleError(title: string, error: any): void {
    Swal.fire({
      title: title,
      text: error.message || 'Por favor, intente nuevamente.',
      icon: 'error',
      confirmButtonText: 'Entendido'
    });
  }

  getStatusBadgeClass(estado: string | undefined): string {
    switch (estado) {
      case EstadoReserva.SOLICITADA:
        return 'bg-secundary-subtle text-secondary';
      case EstadoReserva.PENDIENTE:
        return 'bg-info-subtle text-info';
      case EstadoReserva.PAGADA:
        return 'bg-primary-subtle text-primary';
      case EstadoReserva.EN_CURSO:
      case EstadoReserva.COMPLETADA:
        return 'bg-success-subtle text-success';
      case EstadoReserva.CANCELADA:
        return 'bg-danger-subtle text-danger';
      case EstadoReserva.EXPIRADA:
        return 'bg-warning-subtle text-warning';
      case EstadoReserva.NO_SHOW:
        return 'bg-dark-subtle text-dark';
      default:
        return 'bg-secondary-subtle text-secondary';
    }
  }

  getStatusAlertClass(estado: string | undefined): string {
    switch (estado) {
      case EstadoReserva.SOLICITADA: return 'alert-warning';
      case EstadoReserva.PENDIENTE: return 'alert-info';
      case EstadoReserva.PAGADA: return 'alert-primary';
      case EstadoReserva.EN_CURSO:
      case EstadoReserva.COMPLETADA: return 'alert-success';
      case EstadoReserva.CANCELADA:
      case EstadoReserva.EXPIRADA:
      case EstadoReserva.NO_SHOW: return 'alert-danger';
      default: return 'alert-secondary';
    }
  }

  getValidationBadgeClass(estado: string): string {
    switch (estado) {
      case 'PENDIENTE':
        return 'bg-secondary-subtle text-secondary';
      case 'APROBADA':
        return 'bg-success-subtle text-success';
      case 'RECHAZADA':
        return 'bg-danger-subtle text-danger';
      default:
        return 'bg-dark-subtle text-dark';
    }
  }

  getStatusDescription(estado: any): string {
    const descriptions: { [key: string]: string } = {
      [EstadoReserva.SOLICITADA]: 'Esperando validación administrativa',
      [EstadoReserva.PENDIENTE]: 'Reserva aprobada, pendiente de pago',
      [EstadoReserva.PAGADA]: 'Pago confirmado, reserva activa',
      [EstadoReserva.EN_CURSO]: 'Reserva en curso',
      [EstadoReserva.COMPLETADA]: 'Reserva finalizada exitosamente',
      [EstadoReserva.CANCELADA]: 'Reserva cancelada por el usuario',
      [EstadoReserva.EXPIRADA]: 'Tiempo de pago expirado',
      [EstadoReserva.NO_SHOW]: 'Usuario no se presentó'
    };
    return descriptions[estado] || 'Estado desconocido';
  }

  getValidationDescription(estado: string): string {
    const descriptions: { [key: string]: string } = {
      'PENDIENTE': 'Esperando validación administrativa',
      'APROBADA': 'Reserva validada y aprobada',
      'RECHAZADA': 'Reserva rechazada por validación'
    };
    return descriptions[estado] || 'Estado de validación desconocido';
  }

  getCityDescription(cityId: string | undefined): string {
    if (!cityId) return 'N/A';
    const city = this.CityAcronym.find(c => '' + c.id === cityId);
    return city ? city.value : 'Desconocido';
  }

  isCriticalStatus(estado?: string): boolean {
    if (!estado) return false;
    return ['EXPIRADA', 'RECHAZADA', 'ANULADA'].includes(estado);
  }

  formatTipoCobro(tipo?: string): string {
    const map: Record<string, string> = {
      por_hora: 'Por Hora',
      por_persona: 'Por Persona',
      por_evento: 'Por Evento',
      por_sesion: 'Por Sesión',
      mensualidad: 'Mensualidad',
      por_club: 'Por Club',
      periodo: 'Periodo'
    };
    return tipo ? (map[tipo] || tipo) : 'N/A';
  }

  formatTipoOrganizacion(tipo?: string): string {
    const map: Record<string, string> = {
      ASOCIACION: 'Asociación',
      CLUB: 'Club',
      ESCUELA_MUNICIPAL: 'Escuela Municipal',
      ORGANIZACION: 'Organización'
    };
    return tipo ? (map[tipo] || tipo) : 'N/A';
  }

  getPaymentStatusText(): string {
    const reserva = this.row?.reservaDto;
    const pagos = reserva?.pagosDtoList || [];

    if (!reserva) return 'N/A';

    if (reserva.esReservaGratuita) {
      return reserva.motivoGratuidad
        ? `Gratuita (${reserva.motivoGratuidad})`
        : 'Gratuita';
    }

    if (!pagos.length) {
      if (reserva.estadoReserva === EstadoReserva.SOLICITADA) return 'Pendiente de validación';
      if (reserva.estadoReserva === EstadoReserva.PENDIENTE) return 'Pendiente de pago';
      return reserva.numeroTasa ? 'Sin pagos registrados' : 'Sin tasa registrada';
    }

    const pagados = pagos.filter(p => p.estadoPago === 'PAGADO').length;
    if (pagados === pagos.length) return 'Pagado';
    if (pagados > 0) return `${pagados}/${pagos.length} pagos confirmados`;

    return 'Pendiente de verificación';
  }
}
