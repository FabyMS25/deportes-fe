import { Component, OnInit, ViewChild, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SlickCarouselComponent } from 'ngx-slick-carousel';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { ComplejoDeportivo } from 'src/app/core/models/complejoDeportivo.model';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { Tarifa } from 'src/app/core/models/tarifa.model';
import { Reserva } from 'src/app/core/models/reserva.models';
import { Contribuyente } from 'src/app/core/models/contribuyente.models';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { RuatRequestsService } from 'src/app/core/services/ruat/ruatRequest.service';
import { GlobalComponent } from 'src/app/global-component';
import { EncargadoComplejo } from 'src/app/core/models/encargadoComplejo';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { BookingType, ReservationType } from 'src/app/core/constants/Features';
import { ScheduleStateService } from './schedule-state.service';
import { EstadoActual } from 'src/app/core/constants/Estados';
import { ComplejosService } from 'src/app/core/services/api/conplejos.service';
import { ConfiguracionSistemaService } from 'src/app/core/services/api/configuracionSistema.service';

interface PuntualSchedule {
  date: Date;
  start: string;
  end: string;
}
interface RecurrentSchedule {
  tipoRecurrencia: string;
  fechaInicio: Date;
  fechaFin: Date;
  diasSeleccionados: any[];
  tablero: string[][];
  cantidadSesiones: number;
  duracionSesionHoras: number;
}

export enum BookingStep {
  COMPLEJO_SELECTION = 0,
  CAMPO_SELECTION = 1,
  HORARIO_SELECTION = 2,
  RESERVATION_FORM = 3
}
interface BookingState {
  complejo?: ComplejoDeportivo;
  campo?: CampoDeportivo;
  tarifa?: Tarifa;
  puntualSchedule?: PuntualSchedule;
  recurrentSchedule?: RecurrentSchedule;
  contribuyente?: Contribuyente;
}
@Component({
  selector: 'app-booking-details',
  templateUrl: './booking-details.component.html',
  styleUrls: ['./booking-details.component.scss']
})
export class BookingDetailsComponent implements OnInit, OnDestroy {
  breadCrumbItems!: Array<{}>;
  currentTime!: string;
  currentWeekStart: Date = new Date();
  currentWeekEnd: Date = new Date();  
  globalAdmin = GlobalComponent.admin_deportes;

  userRole: 'contribuyente' | 'representante' | 'encargado' | 'admin' = 'contribuyente';
  isLoading = false;
  isRuatAuthenticated = false;
  reservationsList: Reserva[] = [];
  complejosList: ComplejoDeportivo[] = [];
  configs: { [key: string]: ConfiguracionSistema } = {};

  readonly BookingStep = BookingStep;
  bookingStep: BookingStep = BookingStep.COMPLEJO_SELECTION;
  bookingType!: BookingType;
  bookingState: BookingState = {};
  
  private destroy$ = new Subject<void>();

  get anticipationTime(): string | undefined {
    if (!this.bookingState.tarifa) {
      return this.configs['HORAS_ANTICIPACION_RESERVAS_PUNTUALES']?.valorNumerico+' horas';
    }
    switch (this.bookingState.tarifa.tipoCobro) {
      case 'por_evento':
        return this.configs['DIAS_ANTICIPACION_EVENTOS']?.valorNumerico ? 
               this.configs['DIAS_ANTICIPACION_EVENTOS'].valorNumerico+' días' : undefined;
      case 'mensualidad': case 'por_sesion': case 'por_club':
        return this.configs['DIAS_ANTICIPACION_RECURRENTES']?.valorNumerico ? 
               this.configs['DIAS_ANTICIPACION_RECURRENTES'].valorNumerico +' días' : undefined;
      default:
        return this.configs['HORAS_ANTICIPACION_RESERVAS_PUNTUALES']?.valorNumerico+' horas';
    }
  }
  get maxDuration(): number | undefined {
    if (this.bookingState.tarifa?.tipoCobro === 'por_evento') {
      return this.configs['DURACION_MAXIMA_EVENTOS']?.valorNumerico;
    }
    return this.configs['DURACION_MAXIMA_PUNTUAL_POR_DEFECTO']?.valorNumerico;
  }
  get minDuration(): number | undefined {
    return this.configs['DURACION_MINIMA_RESERVA']?.valorNumerico;
  }
  get maxActiveReservationsPerUser(): number | undefined {
    return this.configs['MAXIMO_RESERVAS_ACTIVAS_POR_USUARIO']?.valorNumerico;
  }
  get maxReservationsPerDayUser(): number | undefined {
    return this.configs['MAXIMO_RESERVAS_POR_DIA_USUARIO']?.valorNumerico;
  }

  @ViewChild('slickModal') slickModal!: SlickCarouselComponent;
  defaultImages = ['assets/images/fields/img-1.png', 'assets/images/fields/img-2.png', 'assets/images/fields/img-3.png', 'assets/images/fields/img-4.png'];
  config = {infinite: true, slidesToShow: 1, slidesToScroll: 1, autoplay: true, arrows: false};
  slidesConfig = {infinite: true, slidesToShow: 4, slidesToScroll: 1, autoplay: true};

  constructor(
    private authenticationService: AuthenticationService,
    private modalService: NgbModal,
    private complejoService: ComplejosService,
    private reservaService: ReservaService,
    private ruatService: RuatRequestsService,
    private router: Router,
    private cdRef: ChangeDetectorRef,
    private scheduleState: ScheduleStateService,
    private systemConfigurationService: ConfiguracionSistemaService
  ) {}

  async ngOnInit(): Promise<void> {
    this.breadCrumbItems = [
      { label: 'Complejo' },
      { label: 'Reserva', active: true }
    ];    
    this.currentTime = new Date().toLocaleTimeString();    
    this.scheduleState.currentWeekStart$
      .pipe(takeUntil(this.destroy$))
      .subscribe(start => this.currentWeekStart = start);      
    this.scheduleState.currentWeekEnd$
      .pipe(takeUntil(this.destroy$))
      .subscribe(end => this.currentWeekEnd = end);  

    await this.loadSystemConfigurations();  
    await this.initializeUserData();
    this.initializeFromNavigation();
    await this.authenticateRuat();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.modalService.dismissAll();
  }

  private async initializeUserData(): Promise<void> {
    const authToken = window.sessionStorage.getItem('auth-token');
    const currentUser = window.sessionStorage.getItem('currentUser') ?? '';    
    if (!currentUser) return;    
    const currentUserStr = JSON.parse(currentUser);    
    if (authToken === 'isContribuyente' && currentUserStr) {
      try {
        this.bookingState.contribuyente = currentUserStr;        
        if (this.configs['HABILITAR_RESERVAS_ORGANIZACIONES']?.valorBoolean ?? false) {
          this.userRole = !!this.bookingState.contribuyente?.organizacionesRepresentadas && 
                            this.bookingState.contribuyente?.organizacionesRepresentadas?.length 
                              ? 'representante' : 'contribuyente';
        } else {
          this.userRole = 'contribuyente';
        }
        if (!this.bookingType) {
          this.bookingType = 'puntual';
        }
      } catch (error) {
        this.showNotification(
          'Error al cargar datos del usuario. Por favor, inicie sesión nuevamente.',
          'error'
        );
      }
    } else {
      const permissionStatus = await this.authenticationService.userHasPermission(currentUserStr);
      if (permissionStatus === 'isAdmin') {
        this.userRole = 'admin';
      } else if (permissionStatus === 'isEmployee') {
        this.userRole = 'encargado';
      }
    }
  }
  private async initializeFromNavigation(): Promise<void> {
    const navigationData = history.state;
    
    if (navigationData.data && navigationData.tipoReserva) {
      this.bookingState.complejo = navigationData.data;      
      this.setBookingType(navigationData.tipoReserva);
      this.bookingStep = BookingStep.CAMPO_SELECTION;
    } else if (navigationData.data) {
      this.bookingState.complejo = navigationData.data;      
      this.bookingType = navigationData.tipoReserva || 'puntual';
      this.bookingStep = BookingStep.CAMPO_SELECTION;
    } else if (navigationData.tipoReserva) {
      await this.loadComplejos();
      this.setBookingType(navigationData.tipoReserva);
      this.bookingStep = BookingStep.COMPLEJO_SELECTION;
    } else {
      this.bookingStep = BookingStep.COMPLEJO_SELECTION;
    }
  }
  private setBookingType(tipoReserva: 'puntual' | 'recurrente'): void {
    if (tipoReserva === 'recurrente' && !(this.configs['HABILITAR_RESERVAS_RECURRENTES']?.valorBoolean ?? true)) {
      this.showNotification(
        'Las reservas recurrentes no están habilitadas en este momento',
        'warning'
      );
      this.bookingType = 'puntual';
    } else {
      this.bookingType = tipoReserva;
    }
  }

  onComplejoSelected(complejo: ComplejoDeportivo): void {
    if (!complejo) {
      this.showNotification('Datos de complejo inválidos', 'error');
      return;
    }
    this.bookingState.complejo = complejo;
    this.bookingStep = BookingStep.CAMPO_SELECTION;
    this.cdRef.detectChanges();
  }

  async onCampoSelected(selection: { field: CampoDeportivo; tariff: Tarifa }): Promise<void> {
    if (!selection?.field || !selection?.tariff) {
      this.showNotification('Datos de selección inválidos', 'error');
      return;
    }    
    this.bookingState.campo = selection.field;
    this.bookingState.tarifa = selection.tariff;    
    this.isLoading = true;    
    try {
      await this.loadReservationsByField(selection.field.uuid!);      
      // if (this.bookingState.tarifa?.tipoCobro === 'por_evento') {
      //   this.bookingStep = BookingStep.RESERVATION_FORM;
      // } else {
        this.bookingStep = BookingStep.HORARIO_SELECTION;
      // }
    } catch (error) {
      this.showNotification('Error al cargar las reservas existentes', 'error');
    } finally {
      this.isLoading = false;
      this.cdRef.detectChanges();
    }
  }

  onHorarioSelected(horario: any): void {
    if (!this.validatePuntualSchedule(horario)) {
      return;
    }    
    this.bookingState.puntualSchedule = horario;
    this.modalService.dismissAll();
    this.bookingStep = BookingStep.RESERVATION_FORM;
    this.cdRef.detectChanges();
  }

  onRecurrentScheduleCompleted(scheduleData: any): void {
    if (!this.validateRecurrentSchedule(scheduleData)) {
      return;
    }    
    this.bookingState.recurrentSchedule = scheduleData;
    this.bookingStep = BookingStep.RESERVATION_FORM;
    this.cdRef.detectChanges();
  }

  onReservationCompleted(reservaData: Reserva): void {
    this.isLoading = false;
    this.showSuccessModal(reservaData);
  }

  openScheduleModal(content: any): void {
    if (!this.bookingState.campo) {
      this.showNotification('Primero debe seleccionar una cancha', 'warning');
      return;
    }    
    this.modalService.open(content, { 
      size: 'md', 
      centered: true,
      backdrop: 'static'
    });
  }

  private canProceedToNextStep(): boolean {
    const validations: Record<BookingStep, () => boolean> = {
      [BookingStep.COMPLEJO_SELECTION]: () => {
        if (!this.bookingState.complejo) {
          this.showNotification('Por favor seleccione un complejo deportivo', 'warning');
          return false;
        }
        return true;
      },
      [BookingStep.CAMPO_SELECTION]: () => {
        if (!this.bookingState.campo || !this.bookingState.tarifa) {
          this.showNotification('Por favor seleccione una cancha y tarifa', 'warning');
          return false;
        }
        return true;
      },
      [BookingStep.HORARIO_SELECTION]: () => {
        const hasValidSchedule = this.bookingType === 'puntual' 
          ? !!this.bookingState.puntualSchedule 
          : !!this.bookingState.recurrentSchedule;
        
        if (!hasValidSchedule) {
          this.showNotification('Por favor seleccione un horario', 'warning');
          return false;
        }
        return true;
      },
      [BookingStep.RESERVATION_FORM]: () => true
    };
    
    return validations[this.bookingStep]?.() ?? false;
  }

  private clearForwardStepData(): void {
    switch (this.bookingStep) {
      case BookingStep.COMPLEJO_SELECTION:
        this.bookingState.campo = undefined;
        this.bookingState.tarifa = undefined;
        this.bookingState.puntualSchedule = undefined;
        this.bookingState.recurrentSchedule = undefined;
        this.reservationsList = [];
        break;
      case BookingStep.CAMPO_SELECTION:
        this.bookingState.puntualSchedule = undefined;
        this.bookingState.recurrentSchedule = undefined;
        break;
      case BookingStep.HORARIO_SELECTION:
        break;
    }
  }

  private validatePuntualSchedule(horario: PuntualSchedule): boolean {
    if (!horario?.date) {
      this.showNotification('Por favor seleccione una fecha válida', 'warning');
      return false;
    }
    
    if (!horario?.start || !horario?.end) {
      this.showNotification('Por favor seleccione un horario válido', 'warning');
      return false;
    }
    
    if (horario.start >= horario.end) {
      this.showNotification('La hora de fin debe ser posterior a la hora de inicio', 'warning');
      return false;
    }

    const startTime = new Date(`2000-01-01T${horario.start}`);
    const endTime = new Date(`2000-01-01T${horario.end}`);
    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    const minDur = this.minDuration;
    const maxDur = this.maxDuration;

    if (minDur && durationHours < minDur) {
      this.showNotification(
        `La duración mínima de reserva es ${minDur} hora(s)`,
        'warning'
      );
      return false;
    }

    if (maxDur && durationHours > maxDur) {
      this.showNotification(
        `La duración máxima para este tipo de reserva es ${maxDur} horas`,
        'warning'
      );
      return false;
    }
    
    return true;
  }

  private validateRecurrentSchedule(schedule: RecurrentSchedule): boolean {
    if (!schedule?.fechaInicio || !schedule?.fechaFin) {
      this.showNotification('Por favor seleccione un rango de fechas válido', 'warning');
      return false;
    }    
    if (schedule.fechaInicio >= schedule.fechaFin) {
      this.showNotification('La fecha de fin debe ser posterior a la fecha de inicio', 'warning');
      return false;
    }    
    if (!schedule.tablero?.length) {
      this.showNotification('Por favor configure el horario recurrente', 'warning');
      return false;
    }    
    if (!schedule.cantidadSesiones || schedule.cantidadSesiones < 1) {
      this.showNotification('Debe tener al menos una sesión programada', 'warning');
      return false;
    }    
    return true;
  }


  getEncargadosActivos(): EncargadoComplejo[] {
    if (!this.bookingState.complejo?.encargadosDtoList?.length) {
      return [];
    }    
    const today = new Date();
    const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());    
    return this.bookingState.complejo.encargadosDtoList.filter((encargado: EncargadoComplejo) => {
      if (!encargado.activo) return false;      
      if (!encargado.fechaAsignacion || !encargado.fechaFinAsignacion) {
        return true;
      }      
      const fechaAsignacion = new Date(encargado.fechaAsignacion + 'T00:00:00');
      const fechaFinAsignacion = new Date(encargado.fechaFinAsignacion + 'T23:59:59');      
      return fechaAsignacion <= todayNormalized && todayNormalized <= fechaFinAsignacion;
    });
  }

  /* API REQUESTS */  
  private async authenticateRuat(): Promise<void> {
    try {
      const response = await this.ruatService.authenticate()
        .pipe(takeUntil(this.destroy$))
        .toPromise();      
      if (response?.token) {
        window.sessionStorage.setItem('ruatToken', response.token);
        this.isRuatAuthenticated = true;
      }
    } catch (error) {
      console.error('Error authenticating with RUAT:', error);
      this.showNotification(
        'Advertencia: No se pudo conectar con el RUAT. Algunas funcionalidades podrían estar limitadas.',
        'warning'
      );
    }
  }
  private async loadSystemConfigurations(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.systemConfigurationService.getAll()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response?.status === 'OK' && response.payload) {
              response.payload.forEach((config: ConfiguracionSistema) => {
                if (config.activo) {
                  this.configs[config.clave] = config;
                }
              });              
              this.isLoading = false;
              console.log('📋 Available configs:', Object.keys(this.configs));
              resolve();
            } else {
              reject(new Error('Invalid configurations response'));
            }
          },
          error: (error) => {
            this.showNotification(
              'Error crítico al cargar configuraciones del sistema',
              'error'
            );
            reject(error);
          }
        });
    });
  }
  private async loadReservationsByField(fieldUuid: string): Promise<void> {
    if (!fieldUuid) {
      throw new Error('UUID del campo es requerido');
    }    
    return new Promise((resolve, reject) => {
      this.reservaService.getByCampoDeportivo(fieldUuid)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response?.status === 'OK') {
              this.reservationsList = response.payload || [];
              resolve();
            } else {
              if (response?.payload) {
                this.reservationsList = [];
                resolve();
              } else {
                reject(new Error(response?.payload || 'Error al cargar reservas'));
              }
            }
          },
          error: (error) => {
            console.error('Error loading reservations:', error);
            this.reservationsList = [];
            resolve();
          }
        });
    });
  }
  private async loadComplejos(): Promise<void> {    
    return new Promise((resolve, reject) => {
    this.isLoading = true;    
    this.complejoService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
        if (response.status === 'OK') {
          this.complejosList = response.payload.filter(
            (c: ComplejoDeportivo) => c.estadoActual === EstadoActual.ACTIVO && this.getCamposCount(c) > 0
          );
          resolve();
        } else {
          reject(new Error(response?.payload || 'Error al cargar Complejos Deportivos'));
        }
        this.isLoading = false;
        },
        error: (error) => {
          reject(error);
          this.isLoading = false;
        }
      });
    });
  }
  getCamposCount(complejo: ComplejoDeportivo): number {
    return complejo.camposDeportivosDtoList?.filter(
      c => c.estadoActual === EstadoActual.ACTIVO
    ).length || 0;
  }

  next(): void {
    if (!this.canProceedToNextStep()) {
      return;
    }
    this.bookingStep++;
    this.cdRef.detectChanges();
  }
  back(): void {
    if (this.bookingStep > BookingStep.COMPLEJO_SELECTION) {
      this.bookingStep--;
      this.clearForwardStepData();
      this.cdRef.detectChanges();
    } else {
      this.navigateToHome();
    }
  }
  private navigateToTicket(reservaData: Reserva): void {
    this.router.navigate(['/reservations/ticket'], { 
      state: { data: reservaData } 
    });
  }
  private navigateToHome(): void {
    this.router.navigate(['/inicio/taxpayer']);
  }
  private navigateToReservations(): void {
    if (this.bookingType === 'recurrente') {
      this.router.navigate(['/reservations/recurrent']);
      return;
    }else {
      this.router.navigate(['/reservations/one-time']);
      return;
    }
  }

  getTariffDescription(tarifa: Tarifa): string {
    const descriptions = {
      'por_hora': 'Tarifa por Hora',
      'por_persona': 'Tarifa por Persona',
      'por_evento': 'Tarifa por Evento',
      'mensualidad': 'Mensualidad',
      'por_sesion': 'Sesión',
      'por_club': 'Tarifa Club'
    };
    return descriptions[tarifa.tipoCobro] || 'Tarifa';
  }

  slidePreview(id: number, event: any): void {
    const slides = document.querySelectorAll('.swiperlist');
    slides.forEach((el: Element) => {
      el.classList.remove('swiper-slide-thumb-active');
    });
    event.target.closest('.swiperlist')?.classList.add('swiper-slide-thumb-active');
    this.slickModal?.slickGoTo(id);
  }
  slickChange(event: any): void {
    const swiper = document.querySelectorAll('.swiperlist');
  }

  private showNotification(
    message: string, 
    type: 'success' | 'error' | 'warning' | 'info'
  ): void {
    Swal.fire({
      text: message,
      icon: type,
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  }

  private showSuccessModal(reservaData: Reserva): void {
    const paymentHours = this.configs['HORAS_VALIDACION_PAGO']?.valorNumerico;
    if (!paymentHours) {
      this.showNotification('Error: Configuración de pago no disponible', 'error');
      return;
    }

    const paymentDeadlineMessage = paymentHours > 1 
      ? `${paymentHours} horas` 
      : `${paymentHours} hora`;

    const requiresApproval = this.bookingState.campo?.requiereAprobacion;
    const title = requiresApproval 
      ? '¡Solicitud de Reserva Enviada!' 
      : '¡Reserva Creada Exitosamente!';

    const html = requiresApproval ? `
      <div class="text-start">
        <p class="mb-2">Su solicitud de reserva ha sido enviada para aprobación.</p>
        <div class="alert alert-info mb-0">
          <strong>Proceso de aprobación:</strong> 
          <ul class="mb-0 mt-1 small">
            <li>Será revisada por el administrador del complejo</li>
            <li>Recibirá una notificación por correo electrónico</li>
            <li>Una vez aprobada, tendrá ${paymentDeadlineMessage} para realizar el pago</li>
          </ul>
        </div>
      </div>
    ` : `
      <div class="text-start">
        <p class="mb-2">Su reserva ha sido registrada correctamente.</p>
        <div class="alert alert-warning mb-0">
          <strong>Importante:</strong> Debe realizar el pago dentro de las próximas 
          <strong>${paymentDeadlineMessage}</strong>, de lo contrario la reserva será 
          cancelada automáticamente.
        </div>
      </div>
    `;

    Swal.fire({
      text: title,
      html: html,
      icon: requiresApproval ? 'info' : 'success',
      confirmButtonText: 'Ver Comprobante',
      confirmButtonColor: '#3085d6',
      showCancelButton: true,
      cancelButtonText: 'Ver Mis Reservas',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
        this.navigateToTicket(reservaData);
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        this.navigateToReservations();
      }
    });
  }
}