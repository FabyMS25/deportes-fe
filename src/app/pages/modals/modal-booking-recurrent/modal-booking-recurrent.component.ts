import { Component, EventEmitter, Input, Output, OnInit, TemplateRef, ViewChild, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NgbModal, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ConfiguracionSistemaService } from 'src/app/core/services/api/configuracionSistema.service';
import { RuatRequestsService } from 'src/app/core/services/ruatRequest.service';
import { ReservaRecurrenteService } from 'src/app/core/services/api/reserva-recurrente.service';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { PagoService } from 'src/app/core/services/api/pago.service';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { ReservaRecurrente } from 'src/app/core/models/reservaRecurrente.model';
import { Reserva } from 'src/app/core/models/reserva.model';
import { Pago } from 'src/app/core/models/pago.model';
import { TicketComponent } from '../../modules/reports/ticket/ticket.component';
import { CityAcronym } from 'src/app/core/constants/Places';
import { EstadoReserva, EstadoValidacion, EstadoPago, StatusUtils } from 'src/app/core/constants/Estados';
import { BookingDetailModalComponent } from '../booking-detail-modal/booking-detail-modal.component';
@Component({
  selector: 'app-booking-recurrent-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, 
    NgbNavModule, FormsModule, TicketComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './modal-booking-recurrent.component.html',
  styleUrls: ['./modal-booking-recurrent.component.scss']
})
export class BookingRecurrentModalComponent implements OnInit, AfterViewInit {
  @Input() accion!: string;
  @Input() row!: ReservaRecurrente;
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

  diasSemanaOptions = [
    { value: 'LUNES', label: 'Lunes' },
    { value: 'MARTES', label: 'Martes' },
    { value: 'MIERCOLES', label: 'Miércoles' },
    { value: 'JUEVES', label: 'Jueves' },
    { value: 'VIERNES', label: 'Viernes' },
    { value: 'SABADO', label: 'Sábado' },
    { value: 'DOMINGO', label: 'Domingo' }
  ];
  showReservedDates = false;
  activeTab: number = 1;
  today: Date = new Date();

  systemConfigList: ConfiguracionSistema[] = [];
  EstadoReserva = EstadoReserva;
  EstadoPago = EstadoPago;
  CityAcronym = CityAcronym;

  userData!: any;
  motivo: string = '';
  observation: string = '';

  validationForm: FormGroup;
  validationSubmitted = false;
  showLoading = false;

  constructor(
    private modalService: NgbModal,
    private formBuilder: FormBuilder,
    private authService: AuthenticationService ,
    private systemConfigsService: ConfiguracionSistemaService,
    private ruatService: RuatRequestsService,
    private reservaRecurrenteService: ReservaRecurrenteService,
    private reservaService: ReservaService,
    private pagoService: PagoService,
  ) {
    this.validationForm = this.buildValidationForm();
  }

  ngOnInit(): void {
    this.userData = this.authService.currentUser();
    if (this.authService.tokenUser() !== 'CONTRIBUYENTE_SESSION') {
      this.userData = this.userData.designacion.personaDto;
    }
    this.getConfigsSystem();
    this.setupValidationForm();

    this.validationForm.get('validationStatus')?.valueChanges.subscribe(status => {
      this.updateObservationValidation(status);
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {      
      if (!this.accion) return;
      switch (this.accion) {
        case 'validarModal':
          this.openValidationModal(this.validationModel);
          break;
        case 'annularModal':
          if (this.annularModal) {
            this.openDeleteModal(this.annularModal);
          }
          break;
        case 'ticketModal': 
          this.openTicketModal(this.ticketModal);
          break;
      }
    });
  }
  private buildValidationForm(): FormGroup {
    return this.formBuilder.group({
      validationStatus: [EstadoValidacion.APROBADA, Validators.required],
      validationObservation: ['']
    });
  }

  setActiveTab(tab: number): void {
    this.activeTab = tab;
  }
  
  get validationFormControls() {
    return this.validationForm?.controls || {};
  }

  private setupValidationForm(): void {
    this.validationForm.reset({
      validationStatus: EstadoValidacion.APROBADA,
      validationObservation: ''
    });

    this.validationForm.get('validationStatus')?.setValidators([Validators.required]);
    this.updateObservationValidation(this.validationForm.get('validationStatus')?.value);
  }

  private updateObservationValidation(status: string): void {
    const observationControl = this.validationForm.get('validationObservation');
    if (status === EstadoValidacion.RECHAZADA) {
      observationControl?.setValidators([Validators.required]);
      observationControl?.updateValueAndValidity();
    } else {
      observationControl?.clearValidators();
      observationControl?.updateValueAndValidity();
    }
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


  /**
   * Open modals
   */
  openValidationModal(content: any) {
    this.setupValidationForm();
    this.validationSubmitted = false;

    const modalRef = this.modalService.open(content, {
      centered: true,
      size: 'md',
      backdrop: 'static'
    });

    modalRef.dismissed.subscribe(() => {
      this.onCloseModal();
    });

    modalRef.closed.subscribe(() => {
      this.onCloseModal();
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

  openNoShowModal(): void {
    this.accion = 'noShowModal';
    this.motivo = '';
    this.observation = '';
  }

  canMarkNoShow(): boolean {
    const estado = this.row?.reservaDto?.estadoReserva;
    return this.canActivate?.includes('ACTUALIZAR') &&
      (estado === EstadoReserva.PAGADA || estado === EstadoReserva.EN_CURSO);
  }

  markNoShowData(formValues: any): void {
    if (!this.row?.reservaDto) {
      this.notify('No se pudo obtener los datos de la reserva', 'error');
      return;
    }

    if (!this.canMarkNoShow()) {
      this.notify('Solo se puede marcar No Show en reservas PAGADAS o EN_CURSO.', 'warning');
      return;
    }

    const updatedReserva: ReservaRecurrente = {
      ...this.row,
      reservaDto: {
        ...this.row.reservaDto,
        estadoReserva: EstadoReserva.NO_SHOW,
        fechaActualizacion: new Date(),
        motivoRechazo: formValues?.observation || 'No Show registrado por administracion'
      }
    };

    this.showLoading = true;
    this.updateReservaRecurrente(updatedReserva)
      .then(() => {
        this.showLoading = false;
        this.notify('Reserva recurrente marcada como No Show exitosamente.', 'success');
        this.emitList.emit();
        this.onCloseModal();
      })
      .catch((error) => {
        this.showLoading = false;
        this.notify(error?.message || 'No se pudo marcar la reserva recurrente como No Show.', 'error');
      });
  }

  confirmUsage() {
    Swal.fire({
      title: 'Confirmar Uso',
      text: '¿Estás seguro de que la reserva recurrente se ha utilizado completamente?',
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
        this.updateReservaRecurrente(updatedReserva).then(() => {
          this.showLoading = false;
          this.notify('Reserva recurrente marcada como completada exitosamente', 'success');
          this.emitList.emit();
          this.onCloseModal();
        }).catch(error => {
          this.showLoading = false;
          this.notify('Error al actualizar la reserva: ' + error, 'error');
        });
      }
    });
  }

  // ==================== API REQUESTS ====================
  private getConfigsSystem() {
    this.systemConfigsService.getAll().subscribe({
      next: (data: any) => {
          if (data['status'] === 'OK') {
            this.systemConfigList = data.payload;
          }
        }
      });
  }
  private updateReservaRecurrente(data: ReservaRecurrente): Promise<ReservaRecurrente> {
    return new Promise((resolve, reject) => {
      this.reservaRecurrenteService.update(data).subscribe({
        next: (resp: any) => {
          if (resp['status'] === 'OK') {
            resolve(resp.payload);
          } else {
            reject(resp.payload);
          }
        },
        error: (error) => {
          console.error("Error updating reserva recurrente:", error);
          reject(error);
        }
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
        error: (error) => {
          console.error("Error updating reserva:", error);
          reject(error);
        }
      });
    });
  }
  
  private rejectReserva(reservaUuid: any, motivoRechazo: string = '') {
    const aprobadoPor = this.userData.nombreCompleto || this.userData.fullName; 
    this.reservaService.rechazarReserva(reservaUuid, motivoRechazo, aprobadoPor).subscribe({
      next: async (data: any) => {
        try {
          this.showLoading = false;
          this.openTicketModal(this.ticketModal);
          this.notify('Reserva recurrente rechazada exitosamente', 'success');
        } catch (error) {
          this.showLoading = false;
          console.error('Error in rejection process:', error);
          this.notify('Reserva rechazada pero error en proceso adicional', 'warning');
        }
      },
      error: (error) => {
        this.showLoading = false;
        console.error('Error rejecting reservation:', error);
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
      await this.approveReservaAfterRuat(reservaConTasa.uuid!, aprobadoPor);

      this.showLoading = false;
      this.openTicketModal(this.ticketModal);
      this.notify('Reserva recurrente aprobada exitosamente y registrada en RUAT', 'success');
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
        observacion: reservaData.reservaRecurrenteDto?.observaciones || 'Reserva Recurrente de Cancha Deportiva GAMQ'
      };

      const code = reservaData.contribuyenteDto.codigoContribuyente || '';

      this.ruatService.createTasa(codigoAlcaldia, codigoUsuario, servicioMunicipal, ruatData, code)
        .subscribe({
          next: async (response: any) => {
            try {
              if (response?.status !== 'OK') {
                reject(new Error(response?.payload?.mensaje || response?.mensaje || response?.payload || 'No se pudo registrar la tasa en RUAT'));
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
            reject(new Error(error?.error?.mensaje || error?.error?.payload || error?.message || 'Error de conexión con RUAT'));
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
        error: (error) => {
          reject(new Error(error?.error?.message || error?.message || 'Error al obtener la reserva'));
        }
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
        error: (error) => {
          reject(new Error(error?.error?.message || error?.message || 'Error al aprobar la reserva'));
        }
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
      error: (error) => {
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
            error: (error) => {
              this.showLoading = false;
              this.notify('Reserva anulada en RUAT pero error al actualizar localmente', 'warning');
            }
          });
        } else {
          this.showLoading = false;
          this.notify(resp.payload || 'Error al anular en RUAT', 'error');
        }
      },
      error: (error) => {
        this.showLoading = false;
        this.notify('Error al realizar la anulación en RUAT', 'error');
      },
    });
  }

  
  /* Common functions */
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
    this.validationForm.enable();
    this.validationForm.reset({
      validationStatus: EstadoValidacion.APROBADA,
      validationObservation: ''
    });
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

  // ==================== UTILIDADES ====================
  isCriticalStatus(estado?: string): boolean {
    if (!estado) return false;
    const criticalStates = [
      'EXPIRADA',
      'RECHAZADA',
      'ANULADA'
    ];
    return criticalStates.includes(estado);
  }

  canValidateReservation(): boolean {
    const estadoValidacion = this.row?.reservaDto?.estadoValidacion;
    const estadoReserva = this.row?.reservaDto?.estadoReserva;
    return (estadoValidacion === 'PENDIENTE' && 
            estadoReserva === EstadoReserva.SOLICITADA && 
            this.canActivate.includes('VALIDAR'));
  }
  canConsultReservation(): boolean {
    const estado = this.row?.reservaDto?.estadoReserva;
    return (estado === EstadoReserva.SOLICITADA || estado === EstadoReserva.PENDIENTE) && 
           this.canActivate.includes('ACTUALIZAR');
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

  formatFrecuenciaMensual(frecuencia?: string): string {
    const map: Record<string, string> = {
      lunes_a_viernes: 'Lunes a Viernes',
      lunes_a_sabado: 'Lunes a Sábado',
      todos_los_dias: 'Todos los días',
      personalizado: 'Personalizado'
    };
    return frecuencia ? (map[frecuencia] || frecuencia) : 'N/A';
  }
  // ==================== CALENDARIO - FUNCIONES PRINCIPALES ====================
  getScheduledDates(): { date: Date; slots: string[] }[] {
    const result: { date: Date; slots: string[] }[] = [];
    const horario3D = this.row?.tableroDto?.horario;
    if (!horario3D || !Array.isArray(horario3D) || horario3D.length === 0) {
      return result;
    }
    const startDate = this.normalizeDate(this.row.fechaInicio);
    const endDate = this.normalizeDate(this.row.fechaFin);
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    for (let monthIndex = 0; monthIndex < horario3D.length; monthIndex++) {
      const monthMatrix = horario3D[monthIndex] as any[];
      let targetYear = startYear;
      let targetMonth = startMonth + monthIndex;
      while (targetMonth >= 12) {
        targetMonth -= 12;
        targetYear++;
      }
      for (let dayIndex = 0; dayIndex < monthMatrix.length; dayIndex++) {
        const daySlots = monthMatrix[dayIndex];
        if (Array.isArray(daySlots)) {
          const validSlots = daySlots.filter(slot => slot && typeof slot === 'string' && slot !== '' && slot.includes('-'));
          if (validSlots.length > 0) {
            const currentDate = new Date(targetYear, targetMonth, dayIndex + 1);
            if (currentDate >= startDate && currentDate <= endDate) {
              result.push({
                date: currentDate,
                slots: validSlots
              });
            }
          }
        }
      }
    }  
    return result.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
  generateCalendarMonths(): any[] {
    if (!this.row?.fechaInicio || !this.row?.fechaFin) return [];
    const startDate = this.normalizeDate(this.row.fechaInicio);
    const endDate = this.normalizeDate(this.row.fechaFin);
    const calendarMonths: any[] = [];
    let currentYear = startDate.getFullYear();
    let currentMonth = startDate.getMonth();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();
    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
      calendarMonths.push(this.generateMonthCalendar(currentYear, currentMonth));
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }
    return calendarMonths;
  }
  private generateMonthCalendar(year: number, month: number): any {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const weeks: any[] = [];
    let week: any[] = [];  
    const startDate = this.normalizeDate(this.row.fechaInicio);
    const endDate = this.normalizeDate(this.row.fechaFin);
    const monthSlots = this.getSlotsForMonth(year, month);
    const startWeekday = firstDayOfMonth.getDay();
    for (let i = 0; i < startWeekday; i++) {
      week.push({ empty: true });
    }
    const totalDays = lastDayOfMonth.getDate();
    for (let day = 1; day <= totalDays; day++) {
      const currentDate = new Date(year, month, day);
      const isInRange = currentDate >= startDate && currentDate <= endDate;
      const slots = monthSlots.get(day) || [];
      const hasSchedule = slots.length > 0;
      week.push({
        date: currentDate,
        day: day,
        isInRange: isInRange,
        hasSchedule: hasSchedule,
        slots: slots,
        empty: false
      });
      if (week.length === 7) {
        weeks.push([...week]);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) {
        week.push({ empty: true });
      }
      weeks.push(week);
    }
    return {
      year: year,
      month: month,
      monthName: this.getMonthName(month),
      weeks: weeks
    };
  }
  private getMonthName(month: number): string {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[month];
  }
  private getSlotsForMonth(year: number, month: number): Map<number, string[]> {
    const result = new Map<number, string[]>();
    const horario3D = this.row?.tableroDto?.horario;
    if (!horario3D || !Array.isArray(horario3D)) {
      return result;
    }
    const startDate = this.normalizeDate(this.row.fechaInicio);
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    let monthIndex = (year - startYear) * 12 + (month - startMonth);
    if (monthIndex >= 0 && monthIndex < horario3D.length) {
      const monthMatrix = horario3D[monthIndex] as any[];
      for (let dayIndex = 0; dayIndex < monthMatrix.length; dayIndex++) {
        const daySlots = monthMatrix[dayIndex];
        if (Array.isArray(daySlots)) {
          const validSlots = daySlots.filter(slot => slot && typeof slot === 'string' && slot !== '' && slot.includes('-'));
          if (validSlots.length > 0) {
            result.set(dayIndex + 1, validSlots);
          }
        }
      }
    }  
    return result;
  }

  getTotalWeeklySessions(): number {
    const scheduledDates = this.getScheduledDates();
    let total = 0;
    scheduledDates.forEach(item => {
      total += item.slots.length;
    });
    return total;
  }
  getTotalWeeklyHours(): number {
    return this.getScheduledDates().reduce((total, item) => {
      return total + item.slots.reduce((slotTotal, slot) => slotTotal + this.getSlotDurationHours(slot), 0);
    }, 0);
  }

  private getSlotDurationHours(slot: string): number {
    const [start, end] = slot.split('-');
    if (!start || !end) return 0;

    const startMinutes = this.timeToMinutes(start);
    const endMinutes = this.timeToMinutes(end);
    return Math.max(0, endMinutes - startMinutes) / 60;
  }

  private timeToMinutes(time: string): number {
    const [hours = '0', minutes = '0'] = time.split(':');
    return (parseInt(hours, 10) * 60) + parseInt(minutes, 10);
  }

  getCantidadMeses(): number | null {
    if (!this.row?.fechaInicio || !this.row?.fechaFin) return null;
    const inicio = this.normalizeDate(this.row.fechaInicio);
    const fin = this.normalizeDate(this.row.fechaFin);
    if (fin < inicio) return 0;
    return this.calculateBillingMonths(inicio, fin);
  }

  getCantidadMesesLabel(): string {
    const meses = this.getCantidadMeses();
    if (meses === null) return 'N/A';
    return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
  }
  
  private normalizeDate(date: string | Date): Date {
    if (typeof date === 'string') {
      const parts = date.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    }
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private calculateBillingMonths(start: Date, end: Date): number {
    let count = 1;
    let cycleEnd = this.addMonthsSafe(start, count);
    while (end > cycleEnd) {
      count++;
      cycleEnd = this.addMonthsSafe(start, count);
    }
    return count;
  }

  private addMonthsSafe(date: Date, months: number): Date {
    const d = new Date(date);
    const originalDay = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(originalDay, lastDay));
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
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

    const pagados = pagos.filter(p => p.estadoPago === EstadoPago.PAGADO).length;

    if (pagados === pagos.length) return 'Pagado';
    if (pagados > 0) return `${pagados}/${pagos.length} pagos confirmados`;

    return 'Pendiente de verificación';
  }


  getDiasSemanaLabels(diasString: string): string {
    if (!diasString) return 'N/A';
    const diasArray = diasString.split(',').map(dia => dia.trim()).filter(Boolean);
    return diasArray.map(dia => {
      const option = this.diasSemanaOptions.find(d => d.value === dia.toUpperCase());
      return option ? option.label : dia;
    }).join(', ');
  }

  getCityDescription(cityId: string | undefined): string {
    if (!cityId) return 'N/A';
    const city = this.CityAcronym.find(c => '' + c.id === cityId);
    return city ? city.value : 'Desconocido';
  }

  getStatusBadgeClass(estado: string | undefined): string {
    return StatusUtils.getStatusBadgeClass(estado || '');
  }

  getStatusAlertClass(estado: string | undefined): string {
    return StatusUtils.getStatusAlertClass(estado || '');
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
  
  // selectedItems: any[] = [];
  // consultResults: any[] = [];
  // async consultModal(content: any, data: any) {
  //   if (this.selectedItems.length === 0) {
  //     this.selectedItems.push(this.row); 
  //   }
  //   const codigoAlcaldia = this.systemConfigList.find(config => config.clave === 'CODIGO_ALCALDIA_RUAT')?.valorTexto || '';
  //   this.consultResults = [];
  //   for (const item of this.selectedItems) {
  //     this.showLoading = true;      
  //     try {
  //       const result = await this.consultData(codigoAlcaldia, item); 
  //       this.consultResults.push(result);
  //     } catch (error) {
  //       console.error("Error during consultation:", error);
  //       this.consultResults.push({ 
  //         item, 
  //         text: 'Error al realizar la consulta', 
  //         type: 'error' 
  //       });
  //     } finally {
  //       this.showLoading = false;
  //     }
  //   }
    
  //   this.modalService.open(content, { centered: true, size: 'lg' });
  //   this.selectedItems = [];
  //   this.emitList.emit();
  // }

  // async consultData(codigoAlcaldia: string, item: any): Promise<any> {
  //   if (!item || !item.reservaDto?.numeroTasa) {
  //     return { item, text: 'No se pudo obtener el dato seleccionado', type: 'warning' };
  //   }  
    
  //   try {
  //     const nroTasa = item.reservaDto.numeroTasa;
  //     const resp: any = await this.ruatService.consultaPagoTasa(codigoAlcaldia, nroTasa).toPromise();

  //     if (resp['status'] !== 'OK') {
  //       return { item, text: "La Tasa y Otro Ingreso no tiene pagos", type: 'warning' };
  //     }
      
  //     if (!resp.payload.continuarFlujo) {
  //       return { item, text: resp.payload.observacion, type: 'warning' };
  //     }

  //     const text = resp.payload.observacion;  
  //     if (item.reservaDto?.estadoReserva === EstadoReserva.SOLICITADA || 
  //         item.reservaDto?.estadoReserva === EstadoReserva.PENDIENTE) {
  //       const pagoData = resp.payload.pagoTasa;
        
  //       try {
  //         const [day, month, year] = pagoData.fechaPago.split('/');
  //         const formattedDate = `${year}-${month}-${day}`;
          
  //         const nuevoPago: Pago = {
  //           numeroTasa: pagoData.numeroTasa,
  //           tipoTasa: "TO",
  //           folio: pagoData.folio,
  //           formaPago: pagoData.formaPago,
  //           fechaPago: new Date(formattedDate),
  //           entidadFinanciera: pagoData.entidadFinanciera,
  //           montoPagado: parseFloat(pagoData.montoPago) || 0,
  //           observaciones: pagoData.observacion,
  //           estadoPago: EstadoPago.PAGADO,
  //           ultimaConsulta: new Date(),
  //           respuestaCompletaRuat: JSON.stringify(resp),
  //           reservaDto: item.reservaDto
  //         };
          
  //         const pagoResp: any = await this.pagoService.save(nuevoPago).toPromise();
          
  //         if (pagoResp.status === 'OK') {
  //           const updatedReservaRecurrente = {
  //             ...item,
  //             reservaDto: {
  //               ...item.reservaDto,
  //               estadoReserva: EstadoReserva.PAGADA
  //             }
  //           };
  //           await this.updateReservaRecurrente(updatedReservaRecurrente);
  //           return { 
  //             item: updatedReservaRecurrente, 
  //             text, 
  //             type: 'success',
  //             hasPayment: true,
  //             pagoData: pagoResp.payload
  //           };
  //         }
  //       } catch (error) {
  //         console.error('Error saving pago:', error);
  //         return { item, text: 'Error al guardar el pago', type: 'error', hasPayment: true };
  //       }
  //     }
  //     return { 
  //       item, 
  //       text, 
  //       type: 'info',
  //       hasPayment: true,
  //       pagoData: item.reservaDto?.pagosDtoList?.[0] || resp.payload.pagoTasa
  //     };
  //   } catch (error) {
  //     console.error('Error:', error);
  //     return { item, text: 'Error al realizar la consulta en RUAT', type: 'error', hasPayment: false };
  //   }
  // }
}
