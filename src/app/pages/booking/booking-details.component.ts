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
import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';

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
  RESERVATION_FORM = 3,
  TICKET = 4
}
interface BookingState {
  contribuyente?: Contribuyente;
  complejo?: ComplejoDeportivo;
  campo?: CampoDeportivo;
  tarifa?: Tarifa;
  puntualSchedule?: PuntualSchedule;
  recurrentSchedule?: RecurrentSchedule;
  reservaCreada?: Reserva;
  ticketData?: any;
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

  userRole: 'Contribuyente' | 'Representante' | 'Encargado' | 'Admin' = 'Contribuyente';
  isLoading = false;
  isRuatAuthenticated = false;
  reservationsList: Reserva[] = [];
  complejosList: ComplejoDeportivo[] = [];

  readonly BookingStep = BookingStep;
  bookingStep: BookingStep = BookingStep.COMPLEJO_SELECTION;
  bookingType!: BookingType;
  bookingState: BookingState = {};
  
  private destroy$ = new Subject<void>();

  @ViewChild('slickModal') slickModal!: SlickCarouselComponent;
  defaultImages = ['assets/images/fields/img-1.png', 'assets/images/fields/img-2.png', 'assets/images/fields/img-3.png', 'assets/images/fields/img-4.png'];
  config = {infinite: true, slidesToShow: 1, slidesToScroll: 1, autoplay: true, arrows: false};
  slidesConfig = {infinite: true, slidesToShow: 4, slidesToScroll: 1, autoplay: true};


  systemConfigList: { [key: string]: ConfiguracionSistema } = {};
  get enableRecurrentBooking(): boolean | undefined{
    return this.systemConfigList[ClaveConfiguracion.HABILITAR_RESERVAS_RECURRENTES]?.valorBoolean ?? true;
  }
  get enableOrganizationReservation(): boolean {
    return this.systemConfigList[ClaveConfiguracion.HABILITAR_RESERVAS_ORGANIZACIONES]?.valorBoolean ?? true;
  }
  get HorasValidacionPago(): number | undefined {
    return this.systemConfigList[ClaveConfiguracion.HORAS_VALIDACION_PAGO]?.valorNumerico;
  }  
  get anticipationTime(): string | undefined {
    if (this.userRole !== 'Contribuyente') {
      return undefined;
    }
    if (!this.bookingState.tarifa) {
      return this.systemConfigList['HORAS_ANTICIPACION_RESERVAS_PUNTUALES']?.valorNumerico +' horas';
    }
    switch (this.bookingState.tarifa.tipoCobro) {
      case 'por_evento':
        return this.systemConfigList['DIAS_ANTICIPACION_EVENTOS']?.valorNumerico ? 
               this.systemConfigList['DIAS_ANTICIPACION_EVENTOS'].valorNumerico +' horas' : undefined;
      case 'mensualidad': case 'por_sesion': case 'por_club':
        return this.systemConfigList['HORAS_ANTICIPACION_RECURRENTES']?.valorNumerico ? 
               this.systemConfigList['HORAS_ANTICIPACION_RECURRENTES'].valorNumerico +' días' : undefined;
      default:
        return this.systemConfigList['HORAS_ANTICIPACION_RESERVAS_PUNTUALES']?.valorNumerico+' horas';
    }
  }

  get maxActiveReservationsPerUser(): number | undefined {
    return this.systemConfigList['MAXIMO_RESERVAS_ACTIVAS_POR_USUARIO']?.valorNumerico ;
  }
  get maxReservationsPerDayUser(): number | undefined {
    return this.systemConfigList['MAXIMO_RESERVAS_POR_DIA_USUARIO']?.valorNumerico;
  }

  constructor(
    private authenticationService: AuthenticationService,
    private modalService: NgbModal,
    private complejoService: ComplejosService,
    private reservaService: ReservaService,
    private ruatService: RuatRequestsService,
    private router: Router,
    private cdRef: ChangeDetectorRef,
    private scheduleState: ScheduleStateService,
  ) {
    this.userRole = this.authenticationService.getUserRole()
  }

  async ngOnInit(): Promise<void> {
    // await this.configService.ensureConfigsLoaded().toPromise();
    // this.updatePermissionsBasedOnConfig();
    this.breadCrumbItems = [
      { label: 'Complejo' },
      { label: 'Reserva', active: true }
    ];
    this.currentTime = new Date().toLocaleTimeString(); 
    this.systemConfigList = this.authenticationService.getAllConfigs()
    const currentUser = this.authenticationService.currentUser()   
    if (this.userRole === 'Contribuyente') {
        this.bookingState.contribuyente = currentUser;        
        if (this.systemConfigList[ClaveConfiguracion.HABILITAR_RESERVAS_ORGANIZACIONES]?.valorBoolean ?? false) {
          this.userRole = !!this.bookingState.contribuyente?.organizacionesRepresentadas && 
                            this.bookingState.contribuyente?.organizacionesRepresentadas?.length 
                              ? 'Representante' : 'Contribuyente';
        }
        if (!this.bookingType) {
          this.bookingType = 'puntual';
        }
    }
   
    this.scheduleState.currentWeekStart$
      .pipe(takeUntil(this.destroy$))
      .subscribe(start => this.currentWeekStart = start);      
    this.scheduleState.currentWeekEnd$
      .pipe(takeUntil(this.destroy$))
      .subscribe(end => this.currentWeekEnd = end);
    this.initializeFromNavigation();
    await this.authenticateRuat();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.modalService.dismissAll();
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
    if (tipoReserva === 'recurrente' && !this.enableRecurrentBooking) {
      this.showNotification(
        'Las reservas recurrentes no están habilitadas en este momento',
        'warning'
      );
      this.bookingType = 'puntual';
    } else {
      this.bookingType = tipoReserva;
    }
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
      [BookingStep.RESERVATION_FORM]: () => true,      
      [BookingStep.TICKET]: () => true,
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
    this.bookingState.puntualSchedule = horario;
    this.modalService.dismissAll();
    this.bookingStep = BookingStep.RESERVATION_FORM;
    this.cdRef.detectChanges();
  }
  onRecurrentScheduleCompleted(scheduleData: any): void {
    this.bookingState.recurrentSchedule = scheduleData;
    this.bookingStep = BookingStep.RESERVATION_FORM;
    this.cdRef.detectChanges();
  }
  onReservationCompleted(reservaData: Reserva): void {
    this.isLoading = false;
    this.showConfirmationModal(reservaData);
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
    const usuario = this.systemConfigList[ClaveConfiguracion.USUARIO_RUAT]?.valorTexto || '';
    const clave = this.systemConfigList[ClaveConfiguracion.CLAVE_RUAT]?.valorTexto || '';
    try {
      const response = await this.ruatService.authenticate(usuario,clave)
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
private showConfirmationModal(reservaData: Reserva): void {
  const paymentHours = this.HorasValidacionPago ?? 1;
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
      this.bookingState.reservaCreada = reservaData;
      this.bookingStep = BookingStep.TICKET;
    } else if (result.dismiss === Swal.DismissReason.cancel) {
      this.navigateToReservations();
    }
  });
}

showTicket(reservaData: Reserva): void {
  this.bookingState.reservaCreada = reservaData;
  this.bookingStep = BookingStep.TICKET;
}

  getTariffDescription(tarifa: Tarifa): string {
    const descriptions = {
      'por_hora': 'por hora',
      'por_persona': 'por persona',
      'por_evento': 'por evento',
      'mensualidad': 'por mes',
      'por_sesion': 'por sesión',
      'por_club': 'por mes',
      'periodo' : 'periodo de Escuela'
    };
    return descriptions[tarifa.tipoCobro] || 'Tarifa';
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
}