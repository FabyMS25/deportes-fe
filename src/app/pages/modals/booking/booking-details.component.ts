import { UserRoleName, UserRoles } from 'src/app/core/constants/UserData';
import { Component, OnInit, ViewChild, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SlickCarouselComponent } from 'ngx-slick-carousel';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { ComplejoDeportivo } from 'src/app/core/models/complejoDeportivo.model';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { Tarifa } from 'src/app/core/models/tarifa.model';
import { Reserva } from 'src/app/core/models/reserva.model';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { EncargadoComplejo } from 'src/app/core/models/encargadoComplejo.model';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { BookingType } from 'src/app/core/constants/Features';
import { ScheduleStateService } from './schedule-state.service';
import { EstadoActual } from 'src/app/core/constants/Estados';
import { FacilitiesService } from 'src/app/core/services/api/facilities.service';
import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';
import { ReservationConflictService } from './reservation-conflict.service';
import { SystemConfigurationService } from 'src/app/core/services/api/system-configuration.service';
import { obtenerDescripcionTipoCobro } from 'src/app/core/constants/TipoCobro';
import {
  obtenerHorasValidacionPago,
  obtenerValidacionPagoConUnidad,
  obtenerValorConfiguracionConUnidad
} from 'src/app/core/utils/configuracion-sistema.util';

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
  tablero: string[][][];
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
  actionType?:'book' | 'request' | 'none';
  tarifa?: Tarifa;
  puntualSchedule?: PuntualSchedule;
  recurrentSchedule?: RecurrentSchedule;
  reservaCreada?: Reserva;
  ticketData?: any;
}
interface AdminDeportesInfo {
  role?: string;
  avatar?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
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
  globalAdmin?: AdminDeportesInfo;

  userRole: UserRoleName = UserRoles.CONTRIBUYENTE;
  canActivate: string[] = [];
  isLoading = false;
  reservationsList: Reserva[] = [];
  complejosList: ComplejoDeportivo[] = [];

  readonly BookingStep = BookingStep;
  readonly ClaveConfiguracion = ClaveConfiguracion;
  bookingStep: BookingStep = BookingStep.COMPLEJO_SELECTION;
  bookingType!: BookingType;
  bookingState: BookingState = {};
  
  private destroy$ = new Subject<void>();

  @ViewChild('slickModal') slickModal!: SlickCarouselComponent;
  defaultImages = ['assets/images/fields/img-1.png', 'assets/images/fields/img-2.png', 'assets/images/fields/img-3.png', 'assets/images/fields/img-4.png'];
  config = {infinite: true, slidesToShow: 1, slidesToScroll: 1, autoplay: true, arrows: false};
  slidesConfig = {infinite: true, slidesToShow: 4, slidesToScroll: 1, autoplay: true};

  systemConfigList: { [key: string]: ConfiguracionSistema } = {};
  get enableRecurrentBooking(): boolean {
    return this.isInternalUser || this.systemConfigList[ClaveConfiguracion.HABILITAR_RESERVAS_RECURRENTES]?.valorBoolean === true;
  }
  get enableSolicitudRecurrentBooking(): boolean {
    return this.isInternalUser || this.systemConfigList[ClaveConfiguracion.HABILITAR_SOLICITUD_RESERVAS_RECURRENTES]?.valorBoolean === true;
  }
  get enableOrganizationReservation(): boolean {
    return this.isInternalUser || this.systemConfigList[ClaveConfiguracion.HABILITAR_RESERVAS_ORGANIZACIONES]?.valorBoolean === true;
  }
  get enableSolicitudOrganizationReservation(): boolean {
    return this.isInternalUser || this.systemConfigList[ClaveConfiguracion.HABILITAR_SOLICITUD_RESERVAS_ORGANIZACIONES]?.valorBoolean === true;
  }
  get HorasValidacionPago(): number | undefined {
    return obtenerHorasValidacionPago(
      this.systemConfigList,
      this.bookingType,
      this.bookingState.tarifa?.tipoCobro
    );
  }  
  get anticipationTime(): string | undefined {
    if (this.isInternalUser) {
      return undefined;
    }
    if (!this.bookingState.tarifa) {
      return this.getConfigValueDisplay(ClaveConfiguracion.HORAS_ANTICIPACION_RESERVAS_PUNTUALES);
    }
    switch (this.bookingState.tarifa.tipoCobro) {
      case 'por_evento':
        return this.getConfigValueDisplay(ClaveConfiguracion.DIAS_ANTICIPACION_EVENTOS);
      case 'mensualidad': case 'por_sesion': case 'por_club':
        return this.getConfigValueDisplay(ClaveConfiguracion.HORAS_ANTICIPACION_RECURRENTES);
      default:
        return this.getConfigValueDisplay(ClaveConfiguracion.HORAS_ANTICIPACION_RESERVAS_PUNTUALES);
    }
  }

  get minReservationDurationDisplay(): string | undefined {
    const value = this.getActiveNumericConfig(ClaveConfiguracion.DURACION_MINIMA_RESERVA);
    return value ? `${value} hora(s)` : undefined;
  }

  get maxReservationDurationDisplay(): string | undefined {
    if (!this.bookingState.tarifa) {
      return undefined;
    }
    if (this.bookingType === 'recurrente') {
      const value = this.getActiveNumericConfig(ClaveConfiguracion.DURACION_MAXIMA_RECURRENTES);
      return value ? `${value} día(s)` : undefined;
    }
    if (this.bookingState.tarifa.tipoCobro === 'por_evento') {
      return this.maxEventDurationDisplay;
    }
    return this.maxPunctualDurationDisplay;
  }

  get shouldShowDurationRules(): boolean {
    return !!this.minReservationDurationDisplay || !!this.maxReservationDurationDisplay;
  }

  get shouldShowAnticipationRule(): boolean {
    return !this.isInternalUser && !!this.anticipationTime;
  }

  get maxEventDurationDisplay(): string | undefined {
    const value = this.getActiveNumericConfig(ClaveConfiguracion.DURACION_MAXIMA_EVENTOS);
    return value ? `${value} hora(s)` : undefined;
  }

  get maxPunctualDurationDisplay(): string | undefined {
    const value = this.getActiveNumericConfig(ClaveConfiguracion.DURACION_MAXIMA_PUNTUALES);
    return value ? `${value} hora(s)` : undefined;
  }

  get paymentValidationDisplay(): string | undefined {
    return obtenerValidacionPagoConUnidad(
      this.systemConfigList,
      this.bookingType,
      this.bookingState.tarifa?.tipoCobro
    );
  }

  constructor(
    private authenticationService: AuthenticationService,
    private modalService: NgbModal,
    private complejoService: FacilitiesService,
    private reservaService: ReservaService,
    private router: Router,
    private cdRef: ChangeDetectorRef,
    private scheduleState: ScheduleStateService,
    private conflictService: ReservationConflictService,
    private configuracionSistemaService: SystemConfigurationService,
  ) {
    this.userRole = this.authenticationService.getUserRole()
  }

  async ngOnInit(): Promise<void> {
    if (!this.authenticationService.canCurrentUserCreateReservations()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Reserva no disponible',
        text: this.authenticationService.getReservationRestrictionMessage(),
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#299cdb'
      });
      await this.router.navigate(['/reservations/one-time']);
      return;
    }

    this.breadCrumbItems = [
      { label: 'Complejo' },
      { label: 'Reserva', active: true }
    ];
    this.currentTime = new Date().toLocaleTimeString(); 
    this.systemConfigList = this.authenticationService.getAllConfigs();
    this.updatePermissionsForBookingType();
    this.globalAdmin = this.getAdminDeportesConfig();
    this.loadAdminDeportesConfigIfMissing();
    const currentUser = this.authenticationService.currentUser()   
    if (this.userRole === 'Contribuyente') {
        this.bookingState.contribuyente = currentUser;        
        if (this.enableOrganizationReservation || this.enableSolicitudOrganizationReservation) {
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
      this.updatePermissionsForBookingType();
      this.bookingStep = BookingStep.CAMPO_SELECTION;
    } else if (navigationData.tipoReserva) {
      await this.loadFacilities();
      this.setBookingType(navigationData.tipoReserva);
      this.bookingStep = BookingStep.COMPLEJO_SELECTION;
    } else {
      this.bookingStep = BookingStep.COMPLEJO_SELECTION;
    }
  }

  private get isInternalUser(): boolean {
    return this.userRole === 'Admin' || this.userRole === 'Encargado';
  }

  get isRequestFlow(): boolean {
    return this.bookingState.actionType === 'request';
  }

  get isDirectReservationFlow(): boolean {
    return this.bookingState.actionType === 'book';
  }

  private setBookingType(tipoReserva: 'puntual' | 'recurrente'): void {
    if (tipoReserva === 'recurrente' && !this.enableRecurrentBooking && !this.enableSolicitudRecurrentBooking) {
      this.showNotification(
        'Las reservas recurrentes no están habilitadas en este momento',
        'warning'
      );
      this.bookingType = 'puntual';
    } else {
      this.bookingType = tipoReserva;
    }
    this.updatePermissionsForBookingType();
  }

  private updatePermissionsForBookingType(): void {
    const permissionRoute = this.bookingType === 'recurrente' ? '/reservations/recurrent' : '/reservations/one-time';
    this.canActivate = this.authenticationService.hasPermission(permissionRoute);
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
  async onCampoSelected(selection: { actionType:'book' | 'request' | 'none' ;field: CampoDeportivo; tariff: Tarifa }): Promise<void> {
    if (!selection?.field || !selection?.tariff) {
      this.showNotification('Datos de selección inválidos', 'error');
      return;
    }    
    this.bookingState.campo = selection.field;
    this.bookingState.tarifa = selection.tariff; 
    this.bookingState.actionType = selection.actionType;  
    this.isLoading = true;    
    try {
      await this.loadReservationsByField(selection.field.uuid!);
        this.bookingStep = BookingStep.HORARIO_SELECTION;
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

  public getAvailableDisciplines(campo: CampoDeportivo): string[] {        
    return Array.from(new Set(campo.tarifasDtoList?.flatMap((tarifa: Tarifa) => 
      tarifa.categoriasDtoList?.map((cat: any) => cat.categoriaDto.nombre) || [])
    )) as string[];  
  }

  public getVisibleDisciplines(campo: CampoDeportivo): string[] {
    return this.getAvailableDisciplines(campo).slice(0, 3);
  }

  public getHiddenDisciplinesCount(campo: CampoDeportivo): number {
    return Math.max(this.getAvailableDisciplines(campo).length - this.getVisibleDisciplines(campo).length, 0);
  }

  public getDisciplinesTooltip(campo: CampoDeportivo): string {
    return this.getAvailableDisciplines(campo).join(', ');
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

  private getConfigValueDisplay(clave: ClaveConfiguracion): string | undefined {
    return obtenerValorConfiguracionConUnidad(this.systemConfigList, clave);
  }

  private getActiveNumericConfig(clave: ClaveConfiguracion): number | undefined {
    const config = this.systemConfigList[clave];
    const value = Number(config?.valorNumerico);
    return config?.activo === true && Number.isFinite(value) && value > 0
      ? value
      : undefined;
  }

  private loadAdminDeportesConfigIfMissing(): void {
    if (this.globalAdmin) {
      return;
    }

    this.configuracionSistemaService.getByClave(ClaveConfiguracion.ADMIN_DEPORTES)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const config = response;
          if (!config?.activo) {
            return;
          }

          this.systemConfigList[ClaveConfiguracion.ADMIN_DEPORTES] = config;
          this.globalAdmin = this.getAdminDeportesConfig();
          this.cdRef.detectChanges();
        },
        error: () => {
          this.globalAdmin = undefined;
        }
      });
  }

  private getAdminDeportesConfig(): AdminDeportesInfo | undefined {
    const valorJson = this.systemConfigList[ClaveConfiguracion.ADMIN_DEPORTES]?.valorJson;
    if (!valorJson) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(valorJson);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return undefined;
      }

      return {
        role: typeof parsed.role === 'string' ? parsed.role : undefined,
        avatar: typeof parsed.avatar === 'string' ? parsed.avatar : undefined,
        name: typeof parsed.name === 'string' ? parsed.name : undefined,
        phone: typeof parsed.phone === 'string' ? parsed.phone : undefined,
        email: typeof parsed.email === 'string' ? parsed.email : undefined,
        address: typeof parsed.address === 'string' ? parsed.address : undefined
      };
    } catch {
      return undefined;
    }
  }

  /* API REQUESTS */
  private async loadReservationsByField(fieldUuid: string): Promise<void> {
    if (!fieldUuid) {
      throw new Error('UUID del campo es requerido');
    }    
    return new Promise((resolve, reject) => {
      this.reservaService.getBySportField(fieldUuid)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            this.reservationsList = (response || []).filter((reserva: Reserva) =>
              this.conflictService.isBlockingReservation(reserva)
            );
            resolve();
          },
          error: (error) => {
            console.error('Error loading reservations:', error);
            this.reservationsList = [];
            resolve();
          }
        });
    });
  }
  private async loadFacilities(): Promise<void> {
    return new Promise((resolve, reject) => {
    this.isLoading = true;    
    this.complejoService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.complejosList = response.filter(
            (c: ComplejoDeportivo) => c.estadoActual === EstadoActual.ACTIVO && this.getCamposCount(c) > 0
          );
          resolve();
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
    const requiresApproval = this.isRequestFlow;
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
    return obtenerDescripcionTipoCobro(tarifa.tipoCobro);
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
