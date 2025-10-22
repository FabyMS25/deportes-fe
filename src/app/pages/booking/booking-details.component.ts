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
  horario?: PuntualSchedule;
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
  
  readonly BookingStep = BookingStep;
  userRole: 'contribuyente' | 'representante' | 'encargado' | 'admin' = 'contribuyente';
  
  // System Configurations - Direct access via key
  configs: { [key: string]: ConfiguracionSistema } = {};
  isConfigurationsLoaded = false;
  
  globalAdmin = GlobalComponent.admin_deportes;
  
  step: BookingStep = BookingStep.COMPLEJO_SELECTION;
  bookingType!: BookingType;
  bookingState: BookingState = {};
  reservationsList: Reserva[] = [];
  complejosList: ComplejoDeportivo[] = [];
  
  isLoading = false;
  isRuatAuthenticated = false;
  
  // Computed properties
  get dataComplejo(): ComplejoDeportivo | undefined { 
    return this.bookingState.complejo;
  }
  
  get dataField(): CampoDeportivo | undefined { 
    return this.bookingState.campo;
  }
  
  get selectedTariff(): Tarifa | undefined { 
    return this.bookingState.tarifa;
  }
  
  get selectedSchedule(): PuntualSchedule | undefined { 
    return this.bookingState.horario;
  }
  
  get contribuyente(): Contribuyente | undefined { 
    return this.bookingState.contribuyente;
  }
  
  get recurrentSchedule(): RecurrentSchedule | undefined { 
    return this.bookingState.recurrentSchedule;
  }
  
  get reservationType(): ReservationType | undefined { 
    return this.selectedTariff?.tipoCobro as ReservationType;
  }
  
  get isEventReservation(): boolean { 
    return this.reservationType === 'por_evento';
  }
  
  get isPuntualReservation(): boolean { 
    return this.bookingType === 'puntual';
  }
  
  get isRecurrentReservation(): boolean { 
    return this.bookingType === 'recurrente';
  }

  // Dynamic getters for configurations - No defaults!
  get anticipationHours(): number | undefined {
    if (!this.selectedTariff) {
      return this.configs['HORAS_ANTICIPACION_RESERVAS_PUNTUALES']?.valorNumerico;
    }
    
    switch (this.selectedTariff.tipoCobro) {
      case 'por_evento':
        return this.configs['DIAS_ANTICIPACION_EVENTOS']?.valorNumerico ? 
               this.configs['DIAS_ANTICIPACION_EVENTOS'].valorNumerico * 24 : undefined;
      case 'mensualidad':
      case 'por_club':
        return this.configs['DIAS_ANTICIPACION_RECURRENTES']?.valorNumerico ? 
               this.configs['DIAS_ANTICIPACION_RECURRENTES'].valorNumerico * 24 : undefined;
      default:
        return this.configs['HORAS_ANTICIPACION_RESERVAS_PUNTUALES']?.valorNumerico;
    }
  }

  get maxDuration(): number | undefined {
    if (this.isEventReservation) {
      return this.configs['DURACION_MAXIMA_EVENTOS']?.valorNumerico;
    }
    return this.configs['DURACION_MAXIMA_PUNTUAL_POR_DEFECTO']?.valorNumerico;
  }

  get minDuration(): number | undefined {
    return this.configs['DURACION_MINIMA_RESERVA']?.valorNumerico;
  }

  get validationPaymentHours(): number | undefined {
    return this.configs['HORAS_VALIDACION_PAGO']?.valorNumerico;
  }

  get maxActiveReservationsPerUser(): number | undefined {
    return this.configs['MAXIMO_RESERVAS_ACTIVAS_POR_USUARIO']?.valorNumerico;
  }

  get maxReservationsPerDayUser(): number | undefined {
    return this.configs['MAXIMO_RESERVAS_POR_DIA_USUARIO']?.valorNumerico;
  }

  get graceMinutesNoShow(): number | undefined {
    return this.configs['MINUTOS_GRACIA_NO_SHOW']?.valorNumerico;
  }

  get requirePaymentBeforeUse(): boolean {
    return this.configs['REQUERIR_PAGO_ANTES_USO']?.valorBoolean ?? true;
  }

  get enableRecurrentReservations(): boolean {
    return this.configs['HABILITAR_RESERVAS_RECURRENTES']?.valorBoolean ?? false;
  }

  get enableOrganizationReservations(): boolean {
    return this.configs['HABILITAR_RESERVAS_ORGANIZACIONES']?.valorBoolean ?? false;
  }

  private destroy$ = new Subject<void>();

  @ViewChild('slickModal') slickModal!: SlickCarouselComponent;
  
  defaultImages = [
    'assets/images/fields/img-1.png',
    'assets/images/fields/img-2.png',
    'assets/images/fields/img-3.png',
    'assets/images/fields/img-4.png'
  ];
  
  config = {
    infinite: true, 
    slidesToShow: 1, 
    slidesToScroll: 1, 
    autoplay: true, 
    arrows: false
  };
  
  slidesConfig = {
    infinite: true, 
    slidesToShow: 4, 
    slidesToScroll: 1, 
    autoplay: true
  };

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
    
    // Subscribe to schedule state
    this.scheduleState.currentWeekStart$
      .pipe(takeUntil(this.destroy$))
      .subscribe(start => this.currentWeekStart = start);
      
    this.scheduleState.currentWeekEnd$
      .pipe(takeUntil(this.destroy$))
      .subscribe(end => this.currentWeekEnd = end);

    // Load configurations FIRST - Critical!
    await this.loadSystemConfigurations();
    
    // Validate configurations loaded
    if (!this.isConfigurationsLoaded) {
      this.showNotification(
        'Error crítico: No se pudieron cargar las configuraciones del sistema. Contacte al administrador.',
        'error'
      );
      return;
    }
    
    // Then load other data
    this.loadComplejos();
    await this.initializeUserData();
    this.initializeFromNavigation();
    await this.authenticateRuat();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.modalService.dismissAll();
  }

  /**
   * Load system configurations from database
   * Creates a dictionary for direct access by key
   */
  private async loadSystemConfigurations(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.systemConfigurationService.getAll()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response?.status === 'OK' && response.payload) {
              // Convert array to dictionary for direct access
              response.payload.forEach((config: ConfiguracionSistema) => {
                if (config.activo) {
                  this.configs[config.clave] = config;
                }
              });
              
              this.isConfigurationsLoaded = true;
              console.log('✅ System configurations loaded:', Object.keys(this.configs).length);
              console.log('📋 Available configs:', Object.keys(this.configs));
              resolve();
            } else {
              console.error('❌ Invalid response from configurations API');
              reject(new Error('Invalid configurations response'));
            }
          },
          error: (error) => {
            console.error('❌ Error loading system configurations:', error);
            this.showNotification(
              'Error crítico al cargar configuraciones del sistema',
              'error'
            );
            reject(error);
          }
        });
    });
  }

  /**
   * Validate if required configurations are present
   */
  private validateRequiredConfigurations(): boolean {
    const required = [
      'HORAS_ANTICIPACION_RESERVAS_PUNTUALES',
      'HORAS_VALIDACION_PAGO',
      'DURACION_MAXIMA_PUNTUAL_POR_DEFECTO',
      'DURACION_MINIMA_RESERVA'
    ];
    
    const missing = required.filter(key => !this.configs[key]);
    
    if (missing.length > 0) {
      console.error('❌ Missing required configurations:', missing);
      this.showNotification(
        `Configuraciones faltantes: ${missing.join(', ')}. Contacte al administrador.`,
        'error'
      );
      return false;
    }
    
    return true;
  }

  /**
   * Get configuration value directly
   */
  getConfigValue(key: string): any {
    const config = this.configs[key];
    if (!config) {
      console.warn(`⚠️ Configuration not found: ${key}`);
      return undefined;
    }
    
    // Return the appropriate value type
    if (config.valorNumerico !== null && config.valorNumerico !== undefined) {
      return config.valorNumerico;
    }
    if (config.valorTexto !== null && config.valorTexto !== undefined) {
      return config.valorTexto;
    }
    if (config.valorBoolean !== null && config.valorBoolean !== undefined) {
      return config.valorBoolean;
    }
    if (config.valorJson !== null && config.valorJson !== undefined) {
      try {
        return JSON.parse(config.valorJson);
      } catch {
        return config.valorJson;
      }
    }
    
    return undefined;
  }

  /**
   * Get configuration with metadata
   */
  getConfig(key: string): ConfiguracionSistema | undefined {
    return this.configs[key];
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(key: string): boolean {
    return this.configs[key]?.valorBoolean ?? false;
  }

  /**
   * Validate if user can create reservations based on system limits
   */
  private async validateUserReservationLimits(): Promise<boolean> {
    if (!this.contribuyente?.uuid) return true;

    const maxActive = this.maxActiveReservationsPerUser;
    const maxDaily = this.maxReservationsPerDayUser;

    if (!maxActive || !maxDaily) {
      console.warn('⚠️ Reservation limits not configured');
      return true; // Allow if not configured
    }

    // Check active reservations limit
    const activeReservations = await this.getUserActiveReservations();
    if (activeReservations >= maxActive) {
      this.showNotification(
        `Ha alcanzado el límite de ${maxActive} reservas activas simultáneas.`,
        'warning'
      );
      return false;
    }

    // Check daily reservations limit
    const todayReservations = await this.getUserTodayReservations();
    if (todayReservations >= maxDaily) {
      this.showNotification(
        `Ha alcanzado el límite de ${maxDaily} reservas por día.`,
        'warning'
      );
      return false;
    }

    return true;
  }

  private async getUserActiveReservations(): Promise<number> {
    // TODO: Implement based on your API
    return 0;
  }

  private async getUserTodayReservations(): Promise<number> {
    // TODO: Implement based on your API
    return 0;
  }

  private async initializeUserData(): Promise<void> {
    const authToken = window.sessionStorage.getItem('auth-token');
    const currentUser = window.sessionStorage.getItem('currentUser') ?? '';
    
    if (!currentUser) return;
    
    const currentUserStr = JSON.parse(currentUser);
    
    if (authToken === 'isContribuyente' && currentUserStr) {
      try {
        this.bookingState.contribuyente = currentUserStr;
        
        // Check if user represents organizations (only if feature enabled)
        if (this.enableOrganizationReservations) {
          this.userRole = !!this.bookingState.contribuyente?.organizacionesRepresentadas && 
                              this.contribuyente?.organizacionesRepresentadas?.length 
                              ? 'representante' 
                              : 'contribuyente';
        } else {
          this.userRole = 'contribuyente';
        }
        
        if (!this.bookingType) {
          this.bookingType = 'puntual';
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
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

  private initializeFromNavigation(): void {
    const navigationData = history.state;
    
    if (navigationData.data) {
      this.bookingState.complejo = navigationData.data;
      
      // Validate recurrent reservations if requested
      if (navigationData.tipoReserva === 'recurrente' && !this.enableRecurrentReservations) {
        this.showNotification(
          'Las reservas recurrentes no están habilitadas en este momento',
          'warning'
        );
        this.bookingType = 'puntual';
      } else {
        this.bookingType = navigationData.tipoReserva || 'puntual';
      }
      
      this.step = BookingStep.CAMPO_SELECTION;
    } else if (navigationData.tipoReserva) {
      if (navigationData.tipoReserva === 'recurrente' && !this.enableRecurrentReservations) {
        this.showNotification(
          'Las reservas recurrentes no están habilitadas en este momento',
          'warning'
        );
        this.bookingType = 'puntual';
      } else {
        this.bookingType = navigationData.tipoReserva;
      }
      this.step = BookingStep.COMPLEJO_SELECTION;
    } else {
      this.step = BookingStep.COMPLEJO_SELECTION;
    }
  }

  onComplejoSelected(complejo: ComplejoDeportivo): void {
    if (!complejo) {
      this.showNotification('Datos de complejo inválidos', 'error');
      return;
    }
    this.bookingState.complejo = complejo;
    this.step = BookingStep.CAMPO_SELECTION;
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
      
      if (this.isEventReservation) {
        this.step = BookingStep.RESERVATION_FORM;
      } else {
        this.step = BookingStep.HORARIO_SELECTION;
      }
    } catch (error) {
      console.error('Error loading reservations:', error);
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
    
    this.bookingState.horario = horario;
    this.modalService.dismissAll();
    this.step = BookingStep.RESERVATION_FORM;
    this.cdRef.detectChanges();
  }

  onRecurrentScheduleCompleted(scheduleData: any): void {
    if (!this.validateRecurrentSchedule(scheduleData)) {
      return;
    }
    
    this.bookingState.recurrentSchedule = scheduleData;
    this.step = BookingStep.RESERVATION_FORM;
    this.cdRef.detectChanges();
  }

  onReservationCompleted(reservaData: Reserva): void {
    this.isLoading = false;
    this.showSuccessModal(reservaData);
  }

  private canProceedToNextStep(): boolean {
    const validations: Record<BookingStep, () => boolean> = {
      [BookingStep.COMPLEJO_SELECTION]: () => {
        if (!this.dataComplejo) {
          this.showNotification('Por favor seleccione un complejo deportivo', 'warning');
          return false;
        }
        return true;
      },
      [BookingStep.CAMPO_SELECTION]: () => {
        if (!this.dataField || !this.selectedTariff) {
          this.showNotification('Por favor seleccione una cancha y tarifa', 'warning');
          return false;
        }
        return true;
      },
      [BookingStep.HORARIO_SELECTION]: () => {
        const hasValidSchedule = this.isPuntualReservation 
          ? !!this.selectedSchedule 
          : !!this.recurrentSchedule;
        
        if (!hasValidSchedule) {
          this.showNotification('Por favor seleccione un horario', 'warning');
          return false;
        }
        return true;
      },
      [BookingStep.RESERVATION_FORM]: () => true
    };
    
    return validations[this.step]?.() ?? false;
  }

  private clearForwardStepData(): void {
    switch (this.step) {
      case BookingStep.COMPLEJO_SELECTION:
        this.bookingState.campo = undefined;
        this.bookingState.tarifa = undefined;
        this.bookingState.horario = undefined;
        this.bookingState.recurrentSchedule = undefined;
        this.reservationsList = [];
        break;
      case BookingStep.CAMPO_SELECTION:
        this.bookingState.horario = undefined;
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

    // Validate duration using system configurations
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

  openScheduleModal(content: any): void {
    if (!this.dataField) {
      this.showNotification('Primero debe seleccionar una cancha', 'warning');
      return;
    }
    
    this.modalService.open(content, { 
      size: 'md', 
      centered: true,
      backdrop: 'static'
    });
  }

  private navigateToHome(): void {
    this.router.navigate(['/inicio/taxpayer']);
  }

  private navigateToReservations(): void {
    this.router.navigate(['/reservations/list']);
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

  getEncargadosActivos(): EncargadoComplejo[] {
    if (!this.dataComplejo?.encargadosDtoList?.length) {
      return [];
    }
    
    const today = new Date();
    const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    return this.dataComplejo.encargadosDtoList.filter((encargado: EncargadoComplejo) => {
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
              reject(new Error(response?.payload || 'Error al cargar reservas'));
            }
          },
          error: (error) => {
            console.error('Error fetching reservations:', error);
            reject(error);
          }
        });
    });
  }

  private loadComplejos(): void {
    this.isLoading = true;
    
    this.complejoService.getAll().subscribe({
      next: (response: any) => {
        if (response.status === 'OK') {
          this.complejosList = response.payload.filter(
            (c: ComplejoDeportivo) => c.estadoActual === EstadoActual.ACTIVO && this.getCamposCount(c) > 0
          );
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading complejos:', error);
        this.isLoading = false;
      }
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
    this.step++;
    this.cdRef.detectChanges();
  }

  back(): void {
    if (this.step > BookingStep.COMPLEJO_SELECTION) {
      this.step--;
      this.clearForwardStepData();
      this.cdRef.detectChanges();
    } else {
      this.navigateToHome();
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

  private navigateToTicket(reservaData: Reserva): void {
    this.router.navigate(['/reservations/ticket'], { 
      state: { data: reservaData } 
    });
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
    const paymentHours = this.validationPaymentHours;
    if (!paymentHours) {
      console.error('❌ Payment validation hours not configured');
      this.showNotification('Error: Configuración de pago no disponible', 'error');
      return;
    }

    const paymentDeadlineMessage = paymentHours > 1 
      ? `${paymentHours} horas` 
      : `${paymentHours} hora`;

    const requiresApproval = this.dataField?.requiereAprobacion;
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