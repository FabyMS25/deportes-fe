import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, SimpleChanges } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn, ReactiveFormsModule, FormsModule, FormControl } from '@angular/forms';
import { format, addHours, differenceInHours, startOfDay, isBefore, isSameDay, parseISO, addDays, isAfter, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import Swal from 'sweetalert2';

import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { Tarifa } from 'src/app/core/models/tarifa.model';
import { ComplejoDeportivo } from 'src/app/core/models/complejoDeportivo.model';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { RuatRequestsService } from 'src/app/core/services/ruatRequest.service';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { NgbCollapseModule, NgbNavModule, NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { Reserva } from 'src/app/core/models/reserva.model';
import { ReservaPuntual } from 'src/app/core/models/reservaPuntual.model';
import { ReservaRecurrente } from 'src/app/core/models/reservaRecurrente.model';
import { Organizacion } from 'src/app/core/models/organizacion.model';
import { OrganizacionService } from 'src/app/core/services/api/organizacion.service';
import { BookingType, TipoOrganizacion } from 'src/app/core/constants/Features';
import { EstadoReserva, EstadoValidacion, StatusUtils } from 'src/app/core/constants/Estados';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';
import { AuthenticationService } from 'src/app/core/services/auth.service';

interface PuntualSchedule {
  date: Date;
  start: string;
  end: string;
  cantidadPersonas?: number;
  calculatedPrice?: number;
  priceDetails?: string[];
}

@Component({
  selector: 'app-reservation-form',
  standalone: true,
  imports: [
    CommonModule,
    NgbNavModule,
    NgbCollapseModule,
    NgbTypeaheadModule,
    FormsModule,
    ReactiveFormsModule,
    CurrencyPipe
  ],
  templateUrl: './reservation-form.component.html',
  styleUrls: ['./reservation-form.component.scss']
})
export class ReservationFormComponent implements OnInit, OnDestroy { 
  @Input() bookingType!: BookingType;
  @Input() actionType?:'book' | 'request' | 'none';
  @Input() dataComplejo!: ComplejoDeportivo;
  @Input() dataField!: CampoDeportivo;
  @Input() selectedTariff!: Tarifa;
  @Input() selectedSchedule?: PuntualSchedule;
  @Input() recurrentSchedule?: any;
  @Input() contribuyente?: Contribuyente;
  @Input() reservationsList: Reserva[] = [];
  @Input() systemConfigs: { [key: string]: ConfiguracionSistema } = {};
  @Input() userRole: 'Contribuyente' | 'Representante' | 'Encargado' | 'Admin' = 'Contribuyente'; 
  
  @Output() reservationCompleted = new EventEmitter<Reserva>();
  @Output() goBack = new EventEmitter<void>();

  @ViewChild('searchInput') searchInput!: ElementRef;
  
  submitted = false;
  isSubmitting = false;
  reservationForm!: FormGroup;
  calculatedPrice = 0;
  priceDetails: string[] = [];
  numeroReserva = '';
  currentStep = 1;
  totalSteps = 3;

  showContribuyenteSearch = false;
  showOrganizationSearch = false;
  contribuyentesList: Contribuyente[] = [];
  organizationsList: Organizacion[] = [];
  selectedContribuyente?: Contribuyente;
  selectedOrganization?: Organizacion;
  filteredContribuyentes: Contribuyente[] = [];
  
  conceptos: any[] = [];  
  businessHours: any = null;
  requiresValidation = this.actionType==='book'? false:true;

  isFreeReservation = false;
  freeReservationReason = '';
  showFreeReservationOption = false;
  showOrganizationToggle = false;
  
  minDate = this.safeFormatDate(new Date(), 'yyyy-MM-dd');
  maxDate = this.safeFormatDate(addDays(new Date(), 30), 'yyyy-MM-dd');
  totalSessions: number = 0;

  private destroy$ = new Subject<void>();
  private formInitialized = false;

  constructor(
    private fb: FormBuilder,
    private reservaService: ReservaService,
    private ruatService: RuatRequestsService,
    private contribuyenteService: ContribuyentesService,
    private organizationService: OrganizacionService,
    private authenticationService: AuthenticationService
  ) {}

  get enableSolicitudOrganizationReservation(): boolean {
    return this.systemConfigs[ClaveConfiguracion.HABILITAR_SOLICITUD_RESERVAS_ORGANIZACIONES]?.valorBoolean ?? false;
  }
  get enableOrganizationReservation(): boolean {
    return this.systemConfigs[ClaveConfiguracion.HABILITAR_RESERVAS_ORGANIZACIONES]?.valorBoolean ?? false;
  }
  get enableSolicitudEventsBooking(): boolean{
    return this.systemConfigs[ClaveConfiguracion.HABILITAR_SOLICITUD_RESERVAS_EVENTOS]?.valorBoolean ?? false;
  }
  get enableEventsBooking(): boolean {
    return this.systemConfigs[ClaveConfiguracion.HABILITAR_RESERVAS_EVENTOS]?.valorBoolean ?? false;
  }
  get enableSolicitudRecurrentBooking(): boolean | undefined{
    return this.systemConfigs[ClaveConfiguracion.HABILITAR_SOLICITUD_RESERVAS_RECURRENTES]?.valorBoolean ?? false;
  }
  get enableRecurrentBooking(): boolean | undefined{
    return this.systemConfigs[ClaveConfiguracion.HABILITAR_RESERVAS_RECURRENTES]?.valorBoolean ?? false;
  }
  get ruatIntentosReintento(): number | undefined{
    return this.systemConfigs[ClaveConfiguracion.MAXIMO_INTENTOS_REINTENTO_RESERVAS]?.valorNumerico;
  }
  get validHours(): number {
    return this.systemConfigs[ClaveConfiguracion.HORAS_VALIDACION_PAGO]?.valorNumerico || 4;
  }
  get anticipationHours(): number | undefined{
    if (!this.selectedTariff) {
      return this.systemConfigs[ClaveConfiguracion.HORAS_ANTICIPACION_RESERVAS_PUNTUALES]?.valorNumerico;
    }
    switch (this.selectedTariff.tipoCobro) {
      case 'por_evento':
        const diasEventos = this.systemConfigs[ClaveConfiguracion.DIAS_ANTICIPACION_EVENTOS]?.valorNumerico;
        return diasEventos? diasEventos* 24:undefined;
      case 'mensualidad': 
      case 'por_sesion': 
      case 'por_club':
        return this.systemConfigs[ClaveConfiguracion.HORAS_ANTICIPACION_RECURRENTES]?.valorNumerico;
      default:
        return this.systemConfigs[ClaveConfiguracion.HORAS_ANTICIPACION_RESERVAS_PUNTUALES]?.valorNumerico;
    }
  }
  get anticipationTimeDisplay(): string {
    if (!this.selectedTariff) {
      const horasPuntuales = this.systemConfigs[ClaveConfiguracion.HORAS_ANTICIPACION_RESERVAS_PUNTUALES]?.valorNumerico;
      const hours = horasPuntuales ?? '';
      return `${hours} horas`;
    }    
    switch (this.selectedTariff.tipoCobro) {
      case 'por_evento':
        const diasEventos = this.systemConfigs[ClaveConfiguracion.DIAS_ANTICIPACION_EVENTOS]?.valorNumerico;
        const eventDays = diasEventos ?? '';
        return `${eventDays} días`;
      case 'mensualidad': 
      case 'por_sesion': 
      case 'por_club':
        const diasRecurrentes = this.systemConfigs[ClaveConfiguracion.HORAS_ANTICIPACION_RECURRENTES]?.valorNumerico;
        const recurrentDays = diasRecurrentes ?? '';
        return `${recurrentDays} horas`;
      default:
        const horasPuntuales = this.systemConfigs[ClaveConfiguracion.HORAS_ANTICIPACION_RESERVAS_PUNTUALES]?.valorNumerico;
        const hours = horasPuntuales ?? '';
        return `${hours} horas`;
    }
  }
  get shouldDisableScheduleFields(): boolean {
    if (!this.selectedTariff) return false;  
    return this.selectedTariff.tipoCobro === 'por_hora' || 
          this.selectedTariff.tipoCobro === 'por_persona' ||
          this.selectedTariff.tipoCobro === 'por_evento';
  }

  ngOnInit(): void {
    this.initializeUserContext();
    this.generateReservationNumber();
    this.initializeForm();
    this.checkFreeReservationEligibility();
    this.checkOrganizationToggleEligibility();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contribuyente'] && this.contribuyente) {
      this.selectedContribuyente = this.contribuyente;
      if (this.formInitialized) {
        this.updateFormWithContribuyente();
        this.checkFreeReservationEligibility();
        this.checkOrganizationToggleEligibility();
      }
    }
    if ((changes['selectedTariff'] || changes['selectedSchedule'] || changes['recurrentSchedule'] || changes['dataField'] || changes['systemConfigs']) && this.formInitialized) {
      this.calculateValidationRequirement();
      this.calculatePrice();
      this.checkFreeReservationEligibility();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeUserContext(): void {
    if (!this.contribuyente) {
      this.loadContribuyentes();
      this.loadOrganizations();   
    } else {      
      this.selectedContribuyente = this.contribuyente;
      if (this.userRole === 'Representante') {
        this.organizationsList = this.contribuyente.organizacionesRepresentadas?.length ? 
          this.contribuyente.organizacionesRepresentadas : [];
      }
    }
  }

  private checkOrganizationToggleEligibility(): void {
    if (this.userRole === 'Admin' || this.userRole === 'Encargado') {
      this.showOrganizationToggle = true;
      this.organizationsList = this.selectedContribuyente?.organizacionesRepresentadas || []
    } else if (this.userRole === 'Representante') {
      this.showOrganizationToggle = true;
    } else if (this.selectedContribuyente?.organizacionesRepresentadas?.length) {
      this.organizationsList = this.selectedContribuyente.organizacionesRepresentadas
      this.showOrganizationToggle = true;
    } else {
      this.showOrganizationToggle = false;
    }
  }

  private checkFreeReservationEligibility(): void {
    if (!this.selectedContribuyente && !this.selectedOrganization) {
      this.showFreeReservationOption = false;
      this.isFreeReservation = false;
      return;
    }
    const formValue = this.reservationForm?.getRawValue();
    const selectedOrganization = formValue?.organizacionDto || this.selectedOrganization;
    const isOrganizationFreeEligible = selectedOrganization?.permiteReservasGratuitas || 
                                    (selectedOrganization?.tipoOrganizacion === TipoOrganizacion.ESCUELA_MUNICIPAL && 
                                      selectedOrganization?.permiteReservasGratuitas);
    const isEliteAthlete = this.selectedContribuyente?.esDeportistaElite;
    this.showFreeReservationOption = isOrganizationFreeEligible || isEliteAthlete;    
    if (this.showFreeReservationOption) {
      if (isOrganizationFreeEligible) {
        this.isFreeReservation = true;
        this.setFreeReservationReason(selectedOrganization);
      } else if (isEliteAthlete && !selectedOrganization) {
        this.freeReservationReason = 'DEPORTISTA_ELITE';
      } else if (isEliteAthlete && selectedOrganization && !isOrganizationFreeEligible) {
        this.isFreeReservation = false;
        this.freeReservationReason = '';
        this.showFreeReservationOption = false;
      }
    } else {
      this.isFreeReservation = false;
      this.freeReservationReason = '';
    }
    this.calculatePrice();
  }

  private setFreeReservationReason(organization?: Organizacion): void {
    if (organization) {
      if (organization.tipoOrganizacion === TipoOrganizacion.ESCUELA_MUNICIPAL) {
        this.freeReservationReason = TipoOrganizacion.ESCUELA_MUNICIPAL;
      } else {
        this.freeReservationReason = 'ORGANIZACION';
      }
    } else if (this.selectedContribuyente?.esDeportistaElite) {
      this.freeReservationReason = 'DEPORTISTA_ELITE';
    }
  }

  private initializeForm(): void {
    const initialDuracion = this.bookingType === 'puntual' && this.selectedSchedule ? 
      this.calculateDurationFromTimes(this.selectedSchedule.start, this.selectedSchedule.end) : 1;
    const initialFechaUso = this.bookingType === 'puntual' && this.selectedSchedule?.date ? 
      this.safeFormatDate(this.selectedSchedule.date, 'yyyy-MM-dd') : '';
    const initialHoraInicio = this.bookingType === 'puntual' && this.selectedSchedule?.start ? 
      this.selectedSchedule.start.slice(0, 5) : '';
    const initialHoraFin = this.bookingType === 'puntual' && this.selectedSchedule?.end ? 
      this.selectedSchedule.end.slice(0, 5) : '';
    const recurrentFechaInicio = this.recurrentSchedule?.fechaInicio ? 
      this.safeFormatDate(this.recurrentSchedule.fechaInicio, 'yyyy-MM-dd') : '';
    const recurrentFechaFin = this.recurrentSchedule?.fechaFin ? 
      this.safeFormatDate(this.recurrentSchedule.fechaFin, 'yyyy-MM-dd') : '';    
    const initialCantidadPersonas = this.selectedSchedule?.cantidadPersonas || this.recurrentSchedule?.cantidadPersonas || null;
    this.calculateValidationRequirement();
    const initialEstadoValidacion = this.requiresValidation ? 
      EstadoValidacion.PENDIENTE : EstadoValidacion.APROBADA;    
    const initialEstadoReserva = this.requiresValidation ? 
      EstadoReserva.SOLICITADA : EstadoReserva.PENDIENTE;  

    this.reservationForm = this.fb.group({
      fechaReserva: [new Date()],
      tipoReserva: [this.bookingType],
      estadoValidacion: [{ value: initialEstadoValidacion, disabled: true }],
      estadoReserva: [{ value: initialEstadoReserva, disabled: true }],
      numeroReserva: [
        { value: this.numeroReserva, disabled: true },
        [Validators.required, this.reservationNumberFormatValidator()]
      ],
      contribuyenteDto: [this.selectedContribuyente || null, [Validators.required]],
      esParaOrganizacion: [false],
      organizacionDto: [null],
      fechaUso: [
        { value: initialFechaUso, disabled: this.shouldDisableScheduleFields },
        [this.futureDateValidator()]
      ],
      horaInicio: [
        { value: initialHoraInicio, disabled: this.shouldDisableScheduleFields }
      ],
      horaFin: [
        { value: initialHoraFin, disabled: this.shouldDisableScheduleFields }
      ],
      duracionHoras: [{ value: initialDuracion, disabled: true }],
      cantidadPersonas: [
        {
          value: initialCantidadPersonas,
          disabled: this.hasScheduleLockedCantidadPersonas()
        },
        [Validators.min(1), Validators.max(this.dataField?.capacidadPersonas || 100)]
      ],
      tipoRecurrencia: [{ value: this.recurrentSchedule?.tipoRecurrencia || '', disabled: true }],
      fechaInicio: [{ value: recurrentFechaInicio, disabled: true }],
      fechaFin: [{ value: recurrentFechaFin, disabled: true }],
      diasSemana: [{ value: this.recurrentSchedule?.diasSemana || '', disabled: true }],
      cantidadSesiones: [{ value: this.recurrentSchedule?.cantidadSesiones || 0, disabled: true }],
      duracionSesionHoras: [{ value: this.recurrentSchedule?.duracionSesionHoras || 0, disabled: true }],
      montoTotal: [{ value: 0, disabled: true }, [Validators.required, Validators.min(0.01)]],
      categoria: [{ value: this.getTarifaCategories(), disabled: true }],
      superficie: [{ value: this.dataField?.superficieDto?.descripcion || '', disabled: true }],
      observaciones: [
        'Reserva de Cancha Deportiva GAMQ', 
        [Validators.required, Validators.minLength(10), Validators.maxLength(500)]
      ],
      aceptaTerminos: [false, [Validators.requiredTrue]],
      esReservaGratuita: [this.isFreeReservation],
      motivoGratuidad: [this.freeReservationReason]
    }, {
      validators: [
        this.reservationValidator.bind(this),
        this.entityValidator.bind(this),
        this.tariffSpecificValidator.bind(this),
        this.timeRangeValidator(),
        this.anticipationValidator()
      ]
    });
    
    this.formInitialized = true;
    this.setupConditionalValidators();
    this.calculatePrice();
  }

  private updateFormWithContribuyente(): void {
    if (this.reservationForm && this.selectedContribuyente) {
      this.reservationForm.patchValue({
        contribuyenteDto: this.selectedContribuyente
      });
      this.calculateValidationRequirement();
      this.checkFreeReservationEligibility();
      this.checkOrganizationToggleEligibility();
    }
  }

  private generateReservationNumber(): void {
    this.reservaService.previewNumeroReserva(this.bookingType).subscribe({
      next: (response: any) => {
        this.numeroReserva = response.payload;        
        if (this.reservationForm) {
          this.reservationForm.patchValue({ 
            numeroReserva: this.numeroReserva 
          });
          const numeroReservaControl = this.reservationForm.get('numeroReserva');
          if (numeroReservaControl) {
            numeroReservaControl.disable();
          }
        }
      },
      error: (error) => {
        this.generateFallbackReservationNumber();
      }
    });
  }

  private generateFallbackReservationNumber(): void {
    const timestamp = new Date().getTime().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const prefix = this.bookingType === 'puntual' ? 'P' : 'R';
    this.numeroReserva = `${prefix}-${timestamp}-${random}`;
    
    if (this.reservationForm) {
      this.reservationForm.patchValue({ numeroReserva: this.numeroReserva });
    }
  }
  private reservationNumberFormatValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      
      if (!value) {
        return null;
      }
      
      // Updated regex to match both formats
      // P-0010/25 or R-0010/25
      const formatRegex = /^[PR]-\d{4}\/\d{2}$/;
      
      if (!formatRegex.test(value)) {
        return { 
          invalidFormat: 'El formato debe ser: P-0010/25 para puntuales o R-0010/25 para recurrentes' 
        };
      }
      
      // Optional: Validate that prefix matches booking type
      const prefix = value.charAt(0);
      if (prefix !== 'P' && this.bookingType === 'puntual') {
        return { invalidPrefix: 'Las reservas puntuales deben comenzar con P-' };
      }
      if (prefix !== 'R' && this.bookingType === 'recurrente') {
        return { invalidPrefix: 'Las reservas recurrentes deben comenzar con R-' };
      }
      
      return null;
    };
  }
  validateCustomReservationNumber(): void {
    const customNumber = this.reservationForm?.get('numeroReserva')?.value;
    
    if (!customNumber) {
      return;
    }
    
    const formatRegex = /^[PR]-\d{4}\/\d{2}$/;
    if (!formatRegex.test(customNumber)) {
      Swal.fire({
        title: 'Formato inválido',
        text: 'El número de reserva debe tener el formato: P-0010/25 para puntuales o R-0010/25 para recurrentes',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    this.reservaService.validateNumeroReserva(customNumber).subscribe({
      next: (response: any) => {
        if (response.valid) {
          this.numeroReserva = customNumber;
          Swal.fire({
            title: 'Número válido',
            text: 'El número de reserva está disponible',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
        } else {
          Swal.fire({
            title: 'Número no disponible',
            text: response.message || 'Este número de reserva ya está en uso',
            icon: 'warning',
            confirmButtonText: 'Entendido'
          });
          this.reservationForm?.patchValue({ numeroReserva: this.numeroReserva });
        }
      },
      error: (error) => {
        Swal.fire({
          title: 'Error de validación',
          text: 'No se pudo validar el número de reserva. Intente con otro número.',
          icon: 'error',
          confirmButtonText: 'Entendido'
        });
      }
    });
  }
  private calculateValidationRequirement(): void {
    if (!this.dataField || !this.selectedContribuyente) {
      this.requiresValidation = true;
      return;
    }
    const formValue = this.reservationForm?.getRawValue();
    const selectedOrganization = formValue?.organizacionDto;    
    if (this.isFreeReservation && this.showFreeReservationOption) {
      this.requiresValidation = false;
      return;
    }      
    if (selectedOrganization?.permiteReservasGratuitas) {
      this.requiresValidation = false;
      return;
    }      
    if (this.userRole === 'Admin' || this.userRole === 'Encargado') {
      this.requiresValidation = false;
      return;
    } else if(this.actionType==='book'){
      this.requiresValidation = false;
    }      
    if (this.selectedContribuyente.puedeReservarGratis && this.dataField.accesoLibre) {
      this.requiresValidation = false;
      return;
    }      
    if (!this.dataField.requiereAprobacion) {
      this.requiresValidation = false;
      return;
    }      
    if (this.bookingType === 'puntual') {
      let duration = 0;
      let personas = 1;   
      if (this.selectedSchedule) {
        duration = this.calculateDurationFromTimes(this.selectedSchedule.start, this.selectedSchedule.end);
      } else if (this.reservationForm) {
        const horaInicio = this.reservationForm.get('horaInicio')?.value;
        const horaFin = this.reservationForm.get('horaFin')?.value;
        if (horaInicio && horaFin) {
          duration = this.calculateDurationFromTimes(horaInicio, horaFin);
        }
        personas = this.reservationForm.get('cantidadPersonas')?.value || 1;
      }        
      if (this.dataField.maxDuracionAutoAprobacion && duration <= this.dataField.maxDuracionAutoAprobacion) {
        this.requiresValidation = false;
        return;
      }        
      if (this.dataField.maxPersonasAutoAprobacion && personas <= this.dataField.maxPersonasAutoAprobacion) {
        this.requiresValidation = false;
        return;
      }
    }      
    this.requiresValidation = true;
  }

  private setupConditionalValidators(): void {
    if (!this.reservationForm) return;
    if (this.userRole === 'Contribuyente') {
      this.reservationForm.get('esParaOrganizacion')?.disable();
    }    
    this.reservationForm.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.calculatePrice();
      this.calculateValidationRequirement();
      this.checkFreeReservationEligibility();
    });   
    this.reservationForm.get('esParaOrganizacion')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(esParaOrganizacion => {
      if (esParaOrganizacion && this.showOrganizationToggle) {
        this.showOrganizationSearch = true;
        this.loadOrganizations();
      } else {
        this.showOrganizationSearch = false;
        this.selectedOrganization = undefined;
        this.reservationForm.patchValue({ organizacionDto: null });
      }
      this.checkFreeReservationEligibility();
    });    
    this.reservationForm.get('esReservaGratuita')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(isFree => {
      this.isFreeReservation = isFree;
      this.calculatePrice();
    });
    this.reservationForm.get('organizacionDto')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(organization => {
      this.selectedOrganization = organization;
      this.checkFreeReservationEligibility();
    });
    this.reservationForm.get('horaInicio')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.updateDuration();
    });
    this.reservationForm.get('horaFin')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.updateDuration();
    });
    if (this.canEditReservationNumber) {
      this.reservationForm.get('numeroReserva')?.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      ).subscribe((newValue: string) => {
        if (newValue && newValue !== this.numeroReserva) {
          const formatRegex = /^\d{4}\/\d{2}$/;
          if (formatRegex.test(newValue)) {
            this.validateCustomReservationNumber();
          }
        }
      });
    }
  }

  private updateDuration(): void {
    if (this.bookingType === 'puntual' && this.reservationForm) {
      const horaInicio = this.reservationForm.get('horaInicio')?.value;
      const horaFin = this.reservationForm.get('horaFin')?.value;
      if (horaInicio && horaFin) {
        const duration = this.calculateDurationFromTimes(horaInicio, horaFin);
        this.reservationForm.patchValue({ duracionHoras: duration });
      }
    }
  }

  private safeFormatDate(date: any, formatStr: string): string {
    if (!date) return '';
    try {
      const parsedDate = typeof date === 'string' ? this.parseLocalDate(date) : date;
      return isValid(parsedDate) ? format(parsedDate, formatStr) : '';
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  }

  private safeParseDate(dateString: string): Date | null {
    if (!dateString) return null;
    try {
      const date = this.parseLocalDate(dateString);
      return isValid(date) ? date : null;
    } catch (error) {
      console.error('Error parsing date:', error);
      return null;
    }
  }

  private parseLocalDate(dateValue: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      const [year, month, day] = dateValue.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    return new Date(dateValue);
  }

  private safeCalculateMonthsDuration(startDate: any, endDate: any): number {
    try {
      const start = this.safeParseDate(startDate);
      const end = this.safeParseDate(endDate);
      if (!start || !end) return 1;
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      return Math.max(1, months);
    } catch (error) {
      console.error('Error calculating months duration:', error);
      return 1;
    }
  }

  private reservationValidator(control: AbstractControl): ValidationErrors | null {
    const errors: ValidationErrors = {};
    const form = control as FormGroup;
    const cantidadPersonas = form.get('cantidadPersonas')?.value;
    const campoCapacity = this.dataField?.capacidadPersonas;    
    if (campoCapacity && cantidadPersonas > campoCapacity) {
      errors['capacityExceeded'] = {
        max: campoCapacity,
        actual: cantidadPersonas
      };
    }    
    if (this.bookingType === 'recurrente' && this.userRole === 'Contribuyente') {
      errors['recurrentNotAllowed'] = 'Los contribuyentes no pueden hacer reservas recurrentes';
    }
    return Object.keys(errors).length ? errors : null;
  }

  private entityValidator(control: AbstractControl): ValidationErrors | null {
    const errors: ValidationErrors = {};
    const form = control as FormGroup;
    const esParaOrganizacion = form.get('esParaOrganizacion')?.value;
    const organizacionDto = form.get('organizacionDto')?.value;
    const contribuyenteDto = form.get('contribuyenteDto')?.value;
    if (!contribuyenteDto) {
      errors['contribuyenteRequired'] = 'Debe seleccionar un contribuyente';
    }
    if (esParaOrganizacion && !organizacionDto) {
      errors['organizacionRequired'] = 'Debe seleccionar una organización';
    }
    return Object.keys(errors).length ? errors : null;
  }

  private tariffSpecificValidator(control: AbstractControl): ValidationErrors | null {
    const errors: ValidationErrors = {};
    const form = control as FormGroup;
    if (!this.selectedTariff) return null;
    const cantidadPersonas = form.get('cantidadPersonas')?.value;
    switch (this.selectedTariff.tipoCobro) {
      case 'por_persona':
        if (!cantidadPersonas || cantidadPersonas < 1) {
          errors['cantidadPersonasRequired'] = 'La cantidad de personas es requerida para tarifas por persona';
        }
        break;
      case 'por_evento':
      case 'por_hora':
        if (cantidadPersonas && cantidadPersonas < 1) {
          errors['invalidPersonCount'] = 'La cantidad de personas debe ser mayor a 0';
        }
        break;
    }
    return Object.keys(errors).length ? errors : null;
  }

  private timeRangeValidator(): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      if (this.bookingType === 'recurrente') return null;
      const horaInicio = formGroup.get('horaInicio')?.value;
      const horaFin = formGroup.get('horaFin')?.value;
      if (!horaInicio || !horaFin) return null;
      const startTime = this.timeToMinutes(horaInicio);
      const endTime = this.timeToMinutes(horaFin);      
      if (startTime >= endTime) {
        return { timeRange: 'La hora de fin debe ser posterior a la hora de inicio' };
      }      
      if (endTime - startTime < 30) {
        return { minimumDuration: 'La duración mínima es de 30 minutos' };
      }      
      return null;
    };
  }

  private futureDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      const [year, month, day] = control.value.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day);      
      if (!isValid(selectedDate)) return { invalidDate: true };
      const today = startOfDay(new Date());
      const selectedDay = startOfDay(selectedDate);      
      return isBefore(selectedDay, today) ? { pastDate: 'La fecha no puede ser anterior a hoy' } : null;
    };
  }

  private anticipationValidator(): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      if (this.bookingType === 'recurrente') return null;
      const fechaUso = formGroup.get('fechaUso')?.value;
      const horaInicio = formGroup.get('horaInicio')?.value;
      if (!fechaUso || !horaInicio) return null;
      const [year, month, day] = fechaUso.split('-').map(Number);
      const [hours, minutes] = horaInicio.split(':').map(Number);
      const selectedDateTime = new Date(year, month - 1, day, hours, minutes, 0);      
      if (!isValid(selectedDateTime)) return null;
      const now = new Date();
      const minAllowedDateTime = this.anticipationHours? new Date(now.getTime() + (this.anticipationHours * 60 * 60 * 1000)):undefined;
      if (minAllowedDateTime && selectedDateTime < minAllowedDateTime) {
        return { 
          anticipationRequired: `Las reservas requieren ${this.anticipationTimeDisplay} de anticipación mínima. La reserva más temprana posible es el ${this.formatMinAllowedDateTime(minAllowedDateTime)}` 
        };
      }      
      return null;
    };
  }

  private formatMinAllowedDateTime(date: Date): string {
    return format(date, "dd/MM/yyyy 'a las' HH:mm", { locale: es });
  }

  private calculatePrice(): void {
    const formValue = this.reservationForm?.getRawValue();
    const selectedOrganization = formValue?.organizacionDto;    
    const isFreeReservationActive = this.isFreeReservation && this.showFreeReservationOption;    
    if (isFreeReservationActive) {
      this.calculatedPrice = 0;
      this.priceDetails = [this.getFreeReservationDescription()];      
      if (this.reservationForm) {
        this.reservationForm.patchValue({ 
          montoTotal: 0,
          motivoGratuidad: this.freeReservationReason,
          esReservaGratuita: true
        }, { emitEvent: false });
      }
      return;
    }
    if (!this.selectedTariff || !this.reservationForm) {
      this.calculatedPrice = 0;
      this.priceDetails = [];      
      if (this.reservationForm) {
        this.reservationForm.patchValue({ montoTotal: 0 }, { emitEvent: false });
      }
      return;
    }  
    const scheduleCalculation = this.getScheduleCalculation();
    if (scheduleCalculation) {
      this.calculatedPrice = scheduleCalculation.total;
      this.priceDetails = scheduleCalculation.details;
      this.reservationForm.patchValue({
        montoTotal: this.calculatedPrice,
        esReservaGratuita: false,
        motivoGratuidad: ''
      }, { emitEvent: false });
      return;
    }

    const montoBase = this.selectedTariff.precioBase || 0;
    let total = 0;
    let detalles: string[] = [];
    switch (this.selectedTariff.tipoCobro) {
      case 'por_hora':
        const horas = formValue.duracionHoras || 1;
        total = montoBase * horas;
        detalles.push(`${horas.toFixed(1)} hora(s) × Bs. ${montoBase.toFixed(2)}`);
        break;      
      case 'por_persona':
        total = montoBase * (formValue.cantidadPersonas || 1);
        detalles.push(`${formValue.cantidadPersonas} persona(s) × Bs. ${montoBase.toFixed(2)}`);
        break;      
      case 'por_evento':
        total = montoBase;
        detalles.push(`Tarifa por evento: Bs. ${montoBase.toFixed(2)}`);
        break;      
      case 'mensualidad':
        const meses = this.safeCalculateMonthsDuration(
          this.recurrentSchedule?.fechaInicio, 
          this.recurrentSchedule?.fechaFin
        );
        total = montoBase * meses;
        detalles.push(`Mensualidad × ${meses} mes(es): Bs. ${montoBase.toFixed(2)}`);
        break;      
      case 'por_sesion':
        total = montoBase * this.getRecurrentSessionCount();
        detalles.push(`${this.getRecurrentSessionCount()} sesión(es) × Bs. ${montoBase.toFixed(2)}`);
        break;      
      case 'por_club':
        total = montoBase;
        detalles.push(`Tarifa club/organización: Bs. ${montoBase.toFixed(2)}`);
        break;
    }
    if (this.selectedTariff.conceptosDtos && this.selectedTariff.conceptosDtos.length > 0) {
      const conceptosActivos = this.selectedTariff.conceptosDtos.filter((concepto: any) => concepto.activo);
      if (conceptosActivos.length > 0) {
        detalles.push('');
        detalles.push('Conceptos adicionales:');        
        conceptosActivos.forEach((concepto: any) => {
          const conceptoMonto = this.calculateConceptoAmount(concepto, total, formValue);
          total += conceptoMonto;          
          let conceptoDetalle = '';
          switch (concepto.tipo) {
            case 'porcentaje':
              conceptoDetalle = `${concepto.concepto}: ${concepto.valor}% (Bs. ${conceptoMonto.toFixed(2)})`;
              break;
            case 'fijo':
              conceptoDetalle = `${concepto.concepto}: Bs. ${conceptoMonto.toFixed(2)}`;
              break;
            case 'por_hora':
              const horasConcepto = this.getDurationForConcepto(concepto, formValue);
              const horasCalculadas = horasConcepto.toFixed(1);              
              if (concepto.desde && concepto.hasta) {
                conceptoDetalle = `${concepto.concepto}: ${horasCalculadas}h (${concepto.desde.slice(0, 5)}-${concepto.hasta.slice(0, 5)}) × Bs. ${concepto.valor} (Bs. ${conceptoMonto.toFixed(2)})`;
              } else {
                conceptoDetalle = `${concepto.concepto}: ${horasCalculadas}h × Bs. ${concepto.valor} (Bs. ${conceptoMonto.toFixed(2)})`;
              }
              break;
            default:
              conceptoDetalle = `${concepto.concepto}: Bs. ${conceptoMonto.toFixed(2)}`;
          }          
          detalles.push(conceptoDetalle);
        });
      }
    }
    this.calculatedPrice = parseFloat(total.toFixed(2));
    this.priceDetails = detalles;    
    if (this.reservationForm) {
      this.reservationForm.patchValue({ 
        montoTotal: this.calculatedPrice,
        esReservaGratuita: false,
        motivoGratuidad: ''
      }, { emitEvent: false });
    }
  }

  private getScheduleCalculation(): { total: number; details: string[] } | null {
    const source = this.bookingType === 'puntual' ? this.selectedSchedule : this.recurrentSchedule;
    const total = Number(source?.calculatedPrice);

    if (!source || Number.isNaN(total)) {
      return null;
    }

    return {
      total,
      details: Array.isArray(source.priceDetails) ? [...source.priceDetails] : []
    };
  }

  get requiresCantidadPersonas(): boolean {
    return this.selectedTariff?.tipoCobro === 'por_persona';
  }

  get shouldShowCantidadPersonasField(): boolean {
    const cantidadPersonas = this.reservationForm?.getRawValue()?.cantidadPersonas;
    return this.requiresCantidadPersonas || !!cantidadPersonas || !this.getScheduleCalculation();
  }

  get isCantidadPersonasLocked(): boolean {
    return this.hasScheduleLockedCantidadPersonas();
  }

  private hasScheduleLockedCantidadPersonas(): boolean {
    return !!(this.selectedSchedule?.cantidadPersonas || this.recurrentSchedule?.cantidadPersonas);
  }

  getScheduleDisplayValue(fieldName: string): string {
    const value = this.reservationForm?.getRawValue()?.[fieldName];
    if (!value) return '-';

    if (fieldName === 'fechaUso' || fieldName === 'fechaInicio' || fieldName === 'fechaFin') {
      const parsedDate = this.safeParseDate(value);
      return parsedDate ? this.formatDate(parsedDate) : value;
    }

    return String(value);
  }

  private calculateConceptoAmount(concepto: any, baseAmount: number, formValue: any): number {
    switch (concepto.tipo) {
      case 'porcentaje':
        return baseAmount * (concepto.valor / 100);      
      case 'fijo':
        return concepto.valor || 0;      
      case 'por_hora':
        const horas = this.getDurationForConcepto(concepto, formValue);
        return (concepto.valor || 0) * horas;      
      default:
        return 0;
    }
  }

private calculateTotalHoursForRecurrentSessions(): number {
  if (this.bookingType !== 'recurrente' || !this.recurrentSchedule) {
    return 1;
  }
  
  let totalHours = 0;
  const tablero = this.recurrentSchedule.tablero;
  
  // Detect format
  const isNewFormat = Array.isArray(tablero) && 
                      tablero.length > 0 && 
                      Array.isArray(tablero[0]) && 
                      tablero[0].length > 0 && 
                      Array.isArray(tablero[0][0]);
  
  if (isNewFormat) {
    // New 31×5 format
    (tablero as string[][][]).forEach(monthMatrix => {
      monthMatrix.forEach(daySlots => {
        daySlots.forEach(slot => {
          if (!slot) return;
          const [start, end] = slot.split('-');
          if (start && end) {
            totalHours += this.calculateDurationFromTimes(start, end);
          }
        });
      });
    });
  } else {
    // Old 7×3 format
    const start = new Date(this.recurrentSchedule.fechaInicio);
    const end = new Date(this.recurrentSchedule.fechaFin);
    const selectedDays = this.recurrentSchedule.diasSeleccionados || [];
    
    selectedDays.forEach((dia: any) => {
      if (dia.selected) {
        const dayOccurrences = this.countDayOccurrencesInRange(dia.dia, start, end);
        dia.horarios.forEach((slot: any) => {
          const duration = this.calculateDurationFromTimes(slot.horaInicio, slot.horaFin);
          totalHours += duration * dayOccurrences;
        });
      }
    });
  }
  
  return totalHours;
}

  private countDayOccurrencesInRange(dayName: string, start: Date, end: Date): number {
    const dayMap: {[key: string]: number} = {
      'domingo': 0,
      'lunes': 1,
      'martes': 2,
      'miercoles': 3,
      'jueves': 4,
      'viernes': 5,
      'sabado': 6
    };  
    const targetDay = dayMap[dayName];
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      if (current.getDay() === targetDay) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }  
    return count;
  }

private calculateTotalOverlappingHoursFromTablero(
  conceptoDesde: string,
  conceptoHasta: string
): number {
  if (
    !this.recurrentSchedule?.tablero ||
    !this.recurrentSchedule.fechaInicio ||
    !this.recurrentSchedule.fechaFin
  ) {
    return 0;
  }

  const tablero = this.recurrentSchedule.tablero;
  const start = new Date(this.recurrentSchedule.fechaInicio);
  const end = new Date(this.recurrentSchedule.fechaFin);

  let totalOverlappingHours = 0;

  // Detect format
  // New format → tablero is string[][][] (monthIndex × 31 × 5)
  // Old format → tablero is string[][] (7 × 3, day-of-week indexed)
  const isNewFormat = Array.isArray(tablero) && 
                      tablero.length > 0 && 
                      Array.isArray(tablero[0]) && 
                      tablero[0].length > 0 && 
                      Array.isArray(tablero[0][0]);

  if (isNewFormat) {
    // New 31×5 per-month format
    (tablero as string[][][]).forEach((monthMatrix, monthIndex) => {
      const monthDate = new Date(
        start.getFullYear(),
        start.getMonth() + monthIndex,
        1
      );

      monthMatrix.forEach((daySlots, dayIndex) => {
        const dayOfMonth = dayIndex + 1;
        const date = new Date(
          monthDate.getFullYear(),
          monthDate.getMonth(),
          dayOfMonth
        );

        if (date < start || date > end) return;

        daySlots.forEach(slot => {
          if (!slot) return;
          const [sessionStart, sessionEnd] = slot.split('-');
          if (sessionStart && sessionEnd) {
            const overlap = this.calculateOverlappingDuration(
              sessionStart,
              sessionEnd,
              conceptoDesde,
              conceptoHasta
            );
            totalOverlappingHours += overlap;
          }
        });
      });
    });
  } else {
    // Old 7×3 format
    const dayMap: { [key: number]: string } = {
      0: 'lunes', 1: 'martes', 2: 'miercoles',
      3: 'jueves', 4: 'viernes', 5: 'sabado', 6: 'domingo'
    };

    (tablero as string[][]).forEach((horariosDelDia, dayIndex) => {
      if (!horariosDelDia?.length) return;

      const dayName = dayMap[dayIndex];
      if (!dayName) return;

      const dayOccurrences = this.countDayOccurrencesInRange(dayName, start, end);

      horariosDelDia.forEach(horarioStr => {
        if (!horarioStr) return;
        const [sessionStart, sessionEnd] = horarioStr.split('-');
        if (sessionStart && sessionEnd) {
          const sessionOverlap = this.calculateOverlappingDuration(
            sessionStart,
            sessionEnd,
            conceptoDesde,
            conceptoHasta
          );
          totalOverlappingHours += sessionOverlap * dayOccurrences;
        }
      });
    });
  }

  return totalOverlappingHours;
}

private getDurationForConcepto(concepto: any, formValue: any): number {
  if (this.bookingType === 'puntual') {
    const horaInicio = formValue.horaInicio;
    const horaFin = formValue.horaFin;
    const duracionTotal = formValue.duracionHoras || 1;
    if (concepto.desde && concepto.hasta && horaInicio && horaFin) {
      return this.calculateOverlappingDuration(horaInicio, horaFin, concepto.desde, concepto.hasta);
    }    
    return duracionTotal;
  } else if (this.bookingType === 'recurrente' && this.recurrentSchedule) {
    if (concepto.desde && concepto.hasta) {
      return this.calculateTotalOverlappingHoursFromTablero(concepto.desde, concepto.hasta);
    }
    return this.calculateTotalHoursForRecurrentSessions();
  }  
  return 1;
}

  private calculateOverlappingDuration(startTime: string, endTime: string, conceptStart: string, conceptEnd: string): number {
    try {
      const startMinutes = this.timeToMinutes(startTime);
      const endMinutes = this.timeToMinutes(endTime);
      const conceptStartMinutes = this.timeToMinutes(conceptStart);
      const conceptEndMinutes = this.timeToMinutes(conceptEnd);
      const overlapStart = Math.max(startMinutes, conceptStartMinutes);
      const overlapEnd = Math.min(endMinutes, conceptEndMinutes);
      const overlapMinutes = Math.max(0, overlapEnd - overlapStart);
      return Math.round((overlapMinutes / 60) * 2) / 2; 
    } catch (error) {
      console.error('Error calculating overlapping duration:', error);
      return 0;
    }
  }

  private timeToMinutes(time: string): number {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }
  
  getBasePrice(): number {
    if (!this.selectedTariff) return 0;

    const formValue = this.reservationForm?.getRawValue();
    const montoBase = this.selectedTariff.precioBase || 0;
    
    switch (this.selectedTariff.tipoCobro) {
      case 'por_hora':
        return montoBase * (formValue?.duracionHoras || 1);
      case 'por_persona':
        return montoBase * (formValue?.cantidadPersonas || 1);
      case 'mensualidad':
        const meses = this.safeCalculateMonthsDuration(
          this.recurrentSchedule?.fechaInicio, 
          this.recurrentSchedule?.fechaFin
        );
        return montoBase * meses;
      case 'por_sesion':
        return montoBase * this.getRecurrentSessionCount();
      case 'por_club':
        const mesesClub = this.safeCalculateMonthsDuration(
          this.recurrentSchedule?.fechaInicio,
          this.recurrentSchedule?.fechaFin
        );
        return montoBase * mesesClub;
      default:
        return montoBase;
    }
  }

  hasConceptos(): boolean {
    return this.selectedTariff?.conceptosDtos?.some((concepto: any) => concepto.activo) || false;
  }

  getBaseQuantity(): string {
    if (!this.selectedTariff) return '-';    
    if (this.getScheduleCalculation()) {
      switch (this.selectedTariff.tipoCobro) {
        case 'por_hora':
          return `${this.duration || 1} hora(s)`;
        case 'por_persona':
          return `${this.reservationForm?.getRawValue()?.cantidadPersonas || 1} persona(s)`;
        case 'por_sesion':
          return `${this.getRecurrentSessionCount()} sesión(es)`;
        case 'mensualidad':
          return `${this.safeCalculateMonthsDuration(this.recurrentSchedule?.fechaInicio, this.recurrentSchedule?.fechaFin)} mes(es)`;
        case 'por_club':
          return `${this.safeCalculateMonthsDuration(this.recurrentSchedule?.fechaInicio, this.recurrentSchedule?.fechaFin)} mes(es)`;
        case 'por_evento':
          return '1 evento';
        default:
          return 'Calculado';
      }
    }

    const formValue = this.reservationForm?.getRawValue();
    switch (this.selectedTariff.tipoCobro) {
      case 'por_hora':
        return `${formValue?.duracionHoras || 1} hora(s)`;
      case 'por_persona':
        return `${formValue?.cantidadPersonas || 1} persona(s)`;
      case 'mensualidad':
        const meses = this.safeCalculateMonthsDuration(
          this.recurrentSchedule?.fechaInicio, 
          this.recurrentSchedule?.fechaFin
        );
        return `${meses} mes(es)`;
      case 'por_sesion':
        return `${this.getRecurrentSessionCount()} sesión(es)`;
      case 'por_evento':
        return '1 evento';
      case 'por_club':
        return `${this.safeCalculateMonthsDuration(this.recurrentSchedule?.fechaInicio, this.recurrentSchedule?.fechaFin)} mes(es)`;
      default:
        return '1';
    }
  }

  getBaseRateDisplay(): string {
    if (!this.selectedTariff) return '';

    const base = this.selectedTariff.precioBase || 0;
    const formattedBase = new CurrencyPipe('en-US').transform(base, 'BOB', 'symbol-narrow', '1.2-2');

    switch (this.selectedTariff.tipoCobro) {
      case 'por_hora':
        return `${formattedBase} por hora`;
      case 'por_persona':
        return `${formattedBase} por persona`;
      case 'por_sesion':
        return `${formattedBase} por sesión`;
      case 'mensualidad':
        return `${formattedBase} por mes`;
      case 'por_club':
        return `${formattedBase} por mes/club`;
      case 'por_evento':
        return `${formattedBase} por evento`;
      default:
        return `${formattedBase}`;
    }
  }

  getBaseQuantityLabel(): string {
    if (!this.selectedTariff) return 'Cantidad';

    switch (this.selectedTariff.tipoCobro) {
      case 'por_hora':
        return 'Duración en horas';
      case 'por_persona':
        return 'Personas';
      case 'por_sesion':
        return 'Total sesiones';
      case 'mensualidad':
      case 'por_club':
        return 'Meses';
      case 'por_evento':
        return 'Evento';
      default:
        return 'Cantidad';
    }
  }

  getConceptoDetails(): any[] {
    if (!this.selectedTariff?.conceptosDtos) return [];    
    const formValue = this.reservationForm?.getRawValue();
    const baseAmount = this.getBasePrice();
    const detalles: any[] = [];    
    this.selectedTariff.conceptosDtos
      .filter((concepto: any) => concepto.activo)
      .forEach((concepto: any) => {
        const amount = this.calculateConceptoAmount(concepto, baseAmount, formValue);
        let description = '';
        let quantity = '';
        let timeRange = '';        
        switch (concepto.tipo) {
          case 'porcentaje':
            description = `Aplicado sobre tarifa base`;
            quantity = `${concepto.valor}%`;
            break;
          case 'fijo':
            description = 'Monto fijo adicional';
            quantity = 'Fijo';
            break;
          case 'por_hora':
            const horas = this.getDurationForConcepto(concepto, formValue);
            description = `Tarifa por hora aplicada`;
            quantity = `${horas.toFixed(1)}h × Bs. ${concepto.valor}`;
            if (concepto.desde && concepto.hasta) {
              timeRange = `${concepto.desde.slice(0, 5)}-${concepto.hasta.slice(0, 5)}`;
              description = `Tarifa por hora (${timeRange})`;
            }
            break;
          default:
            description = 'Concepto adicional';
            quantity = '1';
        }        
        detalles.push({
          concepto: concepto.concepto,
          description: description,
          quantity: quantity,
          amount: amount,
          timeRange: timeRange
        });
      });    
    return detalles;
  }

  private calculateDurationFromTimes(startTime: string, endTime: string): number {
    try {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      const startTotalMinutes = startHours * 60 + (startMinutes || 0);
      const endTotalMinutes = endHours * 60 + (endMinutes || 0);      
      const durationMinutes = endTotalMinutes - startTotalMinutes;
      return Math.round((durationMinutes / 60) * 2) / 2;
    } catch (error) {
      console.error('Error calculating duration:', error);
      return 1;
    }
  }

  calculateMonthsDuration(startDate: Date, endDate: Date): number {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      return Math.max(1, months);
    } catch (error) {
      console.error('Error calculating months duration:', error);
      return 1;
    }
  }

  onSubmit(): void {
    this.submitted = true;
    if (!this.reservationForm || this.reservationForm.invalid) {
      if (this.reservationForm) {
        this.markFormGroupTouched(this.reservationForm);
      }
      this.showFormErrors();
      return;
    }
    this.confirmReservation();
  }

  private confirmReservation(): void {
    const currencyPipe = new CurrencyPipe('en-US');
    const formattedTotal = currencyPipe.transform(this.calculatedPrice, 'BOB', 'symbol-narrow', '1.2-2');
    const isRequest = this.requiresValidation;
    const actionLabel = isRequest ? 'Solicitar' : 'Reservar';
    const reservationKind = this.bookingType === 'recurrente' ? 'Reserva recurrente' : 'Reserva puntual';
    const statusLabel = isRequest ? 'Pendiente de aprobación' : 'Aprobación automática';
    const statusClass = StatusUtils.getStatusTextClass(
      isRequest ? EstadoValidacion.PENDIENTE : EstadoValidacion.APROBADA
    );
    const statusIcon = isRequest ? 'ri-time-line' : 'ri-checkbox-circle-line';
    const introText = isRequest
      ? 'La reserva será enviada para revisión administrativa.'
      : 'La reserva será registrada y se generará la tasa municipal.';
    Swal.fire({
      title: `${actionLabel} reserva`,
      html: `
        <div class="text-start">
          <p class="mb-3">${introText}</p>
          <p>¿Está seguro de que desea confirmar esta reserva?</p>
          <div class="border rounded p-3 bg-light">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <div>
                <strong class="d-block">${this.dataComplejo?.nombre || ''}</strong>
                <span class="text-muted">${this.dataField?.nombre || ''}</span>
              </div>
              <span class="badge bg-primary bg-opacity-10 text-primary">${reservationKind}</span>
            </div>
            <div class="small border-top pt-2 mt-2">
              <div class="d-flex justify-content-between mb-1">
                <span class="text-muted">Horario</span>
                <strong class="text-end">${this.getConfirmationScheduleSummary()}</strong>
              </div>
              <div class="d-flex justify-content-between mb-1">
                <span class="text-muted">Contribuyente</span>
                <strong class="text-end">${this.selectedContribuyente?.nombreCompleto || 'No definido'}</strong>
              </div>
              <div class="d-flex justify-content-between mb-1">
                <span class="text-muted">Total</span>
                <strong>${formattedTotal}</strong>
              </div>
              <div class="d-flex justify-content-between">
                <span class="text-muted">Estado</span>
                <strong class="${statusClass}">
                  <i class="${statusIcon} me-1"></i>${statusLabel}
                </strong>
              </div>
            </div>
        </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      cancelButtonText: 'Revisar',
      confirmButtonText: actionLabel,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
        this.processReservation();
      }
    });
  }

  getSubmitActionLabel(): string {
    return this.requiresValidation ? 'Solicitar Reserva' : 'Reservar';
  }

  private getConfirmationScheduleSummary(): string {
    const formValue = this.reservationForm?.getRawValue();

    if (this.bookingType === 'recurrente') {
      const start = formValue?.fechaInicio ? this.getScheduleDisplayValue('fechaInicio') : '-';
      const end = formValue?.fechaFin ? this.getScheduleDisplayValue('fechaFin') : '-';
      const sessions = this.calculateTotalSessions();
      return `${start} - ${end} (${sessions} sesiones)`;
    }

    const date = formValue?.fechaUso ? this.getScheduleDisplayValue('fechaUso') : '-';
    const start = formValue?.horaInicio || '-';
    const end = formValue?.horaFin || '-';
    return `${date}, ${start}-${end}`;
  }

  private async processReservation(): Promise<void> {
    this.isSubmitting = true;
    const reservaData = this.prepareReservationData();
    const isFreeReservation = reservaData.esReservaGratuita;
    if (isFreeReservation) {
      this.saveReservation(reservaData);
    } else if (!this.requiresValidation) {
      const ruatAvailability = await this.authenticationService.ensureRuatAuthenticated();
      if (!ruatAvailability.available) {
        this.isSubmitting = false;
        this.showRuatUnavailableMessage(ruatAvailability.message);
        return;
      }
      this.registerReservationInRuat(reservaData);
    } else {
      this.saveReservation(reservaData);
    }
  }

private prepareReservationData(): Reserva {
  const formValue = this.reservationForm.getRawValue(); 
  let estadoValidacion: EstadoValidacion;
  let estadoReserva: EstadoReserva;    
  const isFreeReservation = this.isFreeReservation && this.showFreeReservationOption;
  
  if (isFreeReservation || !this.requiresValidation || this.userRole === 'Admin' || this.userRole === 'Encargado') {
    estadoValidacion = EstadoValidacion.APROBADA;
    estadoReserva = EstadoReserva.PENDIENTE;
  } else {
    estadoValidacion = EstadoValidacion.PENDIENTE;
    estadoReserva = EstadoReserva.SOLICITADA;
  }
  
  const reserva: Reserva = {
    esReservaGratuita: isFreeReservation,
    motivoGratuidad: isFreeReservation ? this.freeReservationReason : undefined,
    fechaCreacion: new Date(),
    fechaActualizacion: new Date(),
    tipoReserva: this.bookingType,
    fechaReserva: new Date(),
    numeroReserva: formValue.numeroReserva,
    estadoValidacion: estadoValidacion,
    estadoReserva: estadoReserva,
    montoTotal: isFreeReservation ? 0 : this.calculatedPrice,
    clasificadorRuatId: this.selectedTariff.clasificadorRuatDto?.uuid || '',
    contribuyenteDto: formValue.contribuyenteDto,
    campoDeportivoDto: this.dataField,
    tarifaDto: this.selectedTariff,
  };    
  
  if (formValue.esParaOrganizacion && formValue.organizacionDto) {
    reserva.organizacionDto = formValue.organizacionDto;
  }
  
  if (this.bookingType === 'puntual') {
    const fechaUso = this.safeParseDate(formValue.fechaUso);
    reserva.reservaPuntualDto = {
      fechaUso: fechaUso || new Date(),
      horaInicio: formValue.horaInicio + ':00',
      horaFin: formValue.horaFin + ':00',
      duracionHoras: formValue.duracionHoras,
      cantidadPersonas: formValue.cantidadPersonas,
      categoria: this.getTarifaCategories(),
      superficie: this.dataField?.superficieDto?.descripcion || '',
      observaciones: formValue.observaciones
    };
  } else if (this.bookingType === 'recurrente' && this.recurrentSchedule) {
    // IMPORTANT: The tablero is already in the correct format from the schedule component
    reserva.reservaRecurrenteDto = {
      tipoRecurrencia: this.recurrentSchedule.tipoRecurrencia || '',
      fechaInicio: this.recurrentSchedule.fechaInicio,
      fechaFin: this.recurrentSchedule.fechaFin,
      diasSemana: this.recurrentSchedule.diasSemana,
      cantidadSesiones: this.getRecurrentSessionCount(),
      duracionSesionHoras: this.recurrentSchedule.duracionSesionHoras,
      cantidadPersonas: formValue.cantidadPersonas,
      tarifaMensual: isFreeReservation ? 0 : (this.calculatedPrice / this.safeCalculateMonthsDuration(this.recurrentSchedule.fechaInicio, this.recurrentSchedule.fechaFin)),
      activo: true,
      categoria: this.getTarifaCategories(),
      superficie: this.dataField?.superficieDto?.descripcion || '',
      observaciones: formValue.observaciones,
      tableroDto: {
        horario: this.recurrentSchedule.tablero  // This should be the 31×5 per month matrix
      }
    };
  }
  return reserva;
}

  private registerReservationInRuat(reservaData: Reserva): void {
    if (!reservaData.contribuyenteDto?.codigoContribuyente) {
      this.isSubmitting = false;
      this.handleError('Datos incompletos', 'Falta el código de contribuyente para registrar en RUAT');
      return;
    }
    if (!this.selectedTariff?.clasificadorRuatDto?.codigo) {
      this.isSubmitting = false;
      this.handleError('Configuración incompleta', 'Falta el clasificador RUAT para la tarifa seleccionada');
      return;
    }
    const ruatData = {
      codigoAlcaldia: this.systemConfigs[ClaveConfiguracion.CODIGO_ALCALDIA_RUAT]?.valorTexto || 'QUI',
      codigoUsuario: this.systemConfigs[ClaveConfiguracion.CODIGO_USUARIO_RUAT]?.valorTexto || '2174',
      codigoContribuyente: reservaData.contribuyenteDto.codigoContribuyente,
      servicioMunicipal: this.systemConfigs[ClaveConfiguracion.SERVICIO_MUNICIPAL_RUAT]?.valorTexto || '2174',
      datosConcepto: [{
        numero: '1',
        codigoClasificador: this.selectedTariff.clasificadorRuatDto.codigo,
        tipoArancel: this.selectedTariff.clasificadorRuatDto.tipoArancel || "DI",
        monto: this.calculatedPrice.toFixed(2)
      }],
      observacion: reservaData.reservaPuntualDto?.observaciones || reservaData.reservaRecurrenteDto?.observaciones || 'Reserva de Cancha Deportiva GAMQ'
    };
    const ruatValidationErrors = this.validateRuatRegistrationData(ruatData);
    if (ruatValidationErrors.length > 0) {
      this.isSubmitting = false;
      this.handleError('Datos RUAT incompletos', ruatValidationErrors.join('\n'));
      return;
    }
    const codigoAlcaldia = this.systemConfigs[ClaveConfiguracion.CODIGO_ALCALDIA_RUAT]?.valorTexto || '';
    const codigoUsuario = this.systemConfigs[ClaveConfiguracion.CODIGO_USUARIO_RUAT]?.valorTexto || '';
    const servicioMunicipal = this.systemConfigs[ClaveConfiguracion.SERVICIO_MUNICIPAL_RUAT]?.valorTexto || '';
    this.ruatService.createTasa(codigoAlcaldia,codigoUsuario,servicioMunicipal,ruatData, reservaData.contribuyenteDto.codigoContribuyente)
    .subscribe({
      next: (response: any) => {
        const ruatPayload = this.getRuatResponsePayload(response);
        if (response.status === 'OK' ) {
          if(ruatPayload?.continuarFlujo){
            reservaData.numeroTasa = ruatPayload.numeroTasa;
            this.saveReservation(reservaData);
          } else {
            this.isSubmitting = false;
            this.handleError('Error en RUAT', this.getRuatErrorMessage(response, 'RUAT no permitió registrar la tasa.'));
          }
        } else {
          this.isSubmitting = false;
          this.handleError('Error en RUAT', this.getRuatErrorMessage(response, 'No se pudo registrar la tasa.'));
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        this.authenticationService.ensureRuatAuthenticated(true);
        this.showRuatUnavailableMessage(this.getRuatErrorMessage(error, 'No se pudo conectar con RUAT.'));
      }
    });
  }

  private validateRuatRegistrationData(ruatData: any): string[] {
    const errors: string[] = [];
    const concepts = Array.isArray(ruatData?.datosConcepto) ? ruatData.datosConcepto : [];

    if (!ruatData?.codigoAlcaldia) {
      errors.push('Falta el código de alcaldía RUAT.');
    }
    if (!ruatData?.codigoUsuario) {
      errors.push('Falta el código de usuario RUAT que registrará la tasa.');
    }
    if (!ruatData?.codigoContribuyente) {
      errors.push('Falta el código de contribuyente RUAT.');
    }
    if (!ruatData?.servicioMunicipal) {
      errors.push('Falta el servicio municipal RUAT.');
    }
    if (concepts.length === 0) {
      errors.push('La tasa debe tener al menos un concepto.');
    }

    concepts.forEach((concepto: any, index: number) => {
      const item = `Concepto ${index + 1}`;
      const amount = Number(String(concepto?.monto ?? '').replace(',', '.'));

      if (!concepto?.numero) {
        errors.push(`${item}: falta el número secuencial.`);
      }
      if (!concepto?.codigoClasificador) {
        errors.push(`${item}: falta el clasificador RUAT.`);
      }
      if (!concepto?.tipoArancel) {
        errors.push(`${item}: falta el tipo de arancel.`);
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        errors.push(`${item}: el monto debe ser mayor a cero.`);
      }
    });

    if (!String(ruatData?.observacion || '').trim()) {
      errors.push('Falta la observación para el registro de la tasa.');
    }

    return errors;
  }

  private getRuatResponsePayload(response: any): any {
    const payload = response?.payload ?? response?.error?.payload ?? response?.error ?? response;
    if (typeof payload !== 'string') {
      return payload;
    }

    try {
      return JSON.parse(payload);
    } catch {
      return { mensaje: payload };
    }
  }

  private getRuatErrorMessage(response: any, fallback: string): string {
    const payload = this.getRuatResponsePayload(response);
    const message =
      payload?.mensaje ||
      payload?.observacion ||
      response?.mensaje ||
      response?.message ||
      response?.error?.mensaje ||
      fallback;

    return this.getFriendlyRuatMessage(message);
  }

  private getFriendlyRuatMessage(message: any): string {
    const rawMessage = typeof message === 'string' ? message : this.extractErrorText(message);
    const normalized = rawMessage.toLowerCase();

    if (normalized.includes('token') || normalized.includes('autoriz')) {
      return 'La sesión de RUAT no está disponible o expiró. Vuelva a intentar para reautenticar el servicio.';
    }
    if (normalized.includes('codigoalcaldia') || normalized.includes('alcald')) {
      return 'La configuración de alcaldía RUAT no es válida. Revise CODIGO_ALCALDIA_RUAT.';
    }
    if (normalized.includes('codigousuario') || normalized.includes('usuario')) {
      return 'El usuario RUAT configurado no es válido o no tiene el rol para registrar Tasas y Otros Ingresos.';
    }
    if (normalized.includes('codigocontribuyente') || normalized.includes('contribuyente')) {
      return 'El contribuyente no tiene un código RUAT válido. Verifique o vuelva a registrar sus datos de contribuyente.';
    }
    if (normalized.includes('serviciomunicipal') || normalized.includes('servicio municipal')) {
      return 'El servicio municipal RUAT no corresponde o no está configurado correctamente.';
    }
    if (normalized.includes('clasificador')) {
      return 'El clasificador RUAT de la tarifa no es válido para registrar esta tasa.';
    }
    if (normalized.includes('arancel')) {
      return 'El tipo de arancel de la tarifa no corresponde al clasificador RUAT.';
    }
    if (normalized.includes('monto')) {
      return 'El monto enviado a RUAT debe ser mayor a cero y estar expresado en bolivianos.';
    }
    if (normalized.includes('observacion')) {
      return 'La observación enviada a RUAT es obligatoria. Agregue una descripción de la reserva.';
    }
    if (normalized.includes('numero') && normalized.includes('tasa')) {
      return 'El número de tasa RUAT no existe, no corresponde al GAMQ o no puede procesarse.';
    }
    if (normalized.includes('anulaci')) {
      return 'RUAT indica que la tasa ya tiene un trámite de anulación o no puede anularse nuevamente.';
    }

    return rawMessage || 'Por favor, intente nuevamente.';
  }

  private showRuatUnavailableMessage(message?: string): void {
    Swal.fire({
      title: 'RUAT no disponible',
      text: message || 'No se pudo conectar con RUAT. La reserva con pago no puede continuar hasta recuperar la conexion.',
      icon: 'warning',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#f7b84b'
    });
  }

  private saveReservation(reservaData: Reserva): void {
    this.reservaService.create(reservaData).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        this.submitted = false;
        if (response.status === 'OK') {
          const savedReserva = response.payload || response;
          this.showSuccessMessage(savedReserva);
          this.reservationCompleted.emit(savedReserva);
        } else {
          this.handleError('Error al guardar la reserva', response.message);
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        this.handleError('Error al guardar la reserva', error);
      }
    });
  }

  private showSuccessMessage(reserva: Reserva): void {
    let title = '¡Reserva Confirmada!';
    let message = '';
    if (reserva.estadoValidacion === EstadoValidacion.PENDIENTE) {
      title = '¡Solicitud Enviada!';
      message = 'Su solicitud de reserva ha sido enviada exitosamente. ' +
                'Estará pendiente de aprobación por parte del administrador. ' +
                'Recibirá una notificación una vez que sea revisada.';
    } else if (reserva.estadoReserva === EstadoReserva.PENDIENTE && reserva.numeroTasa) {
      message = this.bookingType === 'recurrente' 
        ? '¡Reserva recurrente creada exitosamente! Se ha generado la tasa municipal correspondiente.' 
        : '¡Reserva creada exitosamente! Se ha generado la tasa municipal correspondiente.';
      message += `\n\nNúmero de Tasa: ${reserva.numeroTasa}`;
    } else {
      message = '¡Reserva procesada exitosamente!';
    }
    Swal.fire({
      title: title,
      text: message,
      icon: 'success',
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#198754'
    });
  }

  private handleError(title: string, error: any): void {
    Swal.fire({
      title: title,
      text: this.extractErrorText(error),
      icon: 'error',
      confirmButtonText: 'Entendido'
    });
  }

  private extractErrorText(error: any): string {
    if (!error) {
      return 'Por favor, intente nuevamente.';
    }
    if (typeof error === 'string') {
      return error;
    }
    if (Array.isArray(error)) {
      return error.join('\n');
    }
    return error.error?.mensaje || error.error?.message || error.mensaje || error.message || 'Por favor, intente nuevamente.';
  }

  getStatusDescription(): string {
    if (this.isFreeReservation && this.showFreeReservationOption) {
      return this.getFreeReservationDescription() + ' - No requiere pago';
    } else if (this.requiresValidation) {
      return 'Revisión administrativa requerida antes del pago';
    } else {
      return 'Confirmación inmediata - se generará tasa municipal';
    }
  }

  getStatusClass(): string {
    if (this.isFreeReservation && this.showFreeReservationOption) {
      return 'bg-info bg-opacity-10 border border-info';
    } else if (this.requiresValidation) {
      return 'bg-warning bg-opacity-10 border border-warning';
    } else {
      return 'bg-success bg-opacity-10 border border-success';
    }
  }

  getStatusIcon(): string {
    if (this.isFreeReservation && this.showFreeReservationOption) {
      return 'ri-gift-line text-info';
    } else if (this.requiresValidation) {
      return 'ri-time-line text-warning';
    } else {
      return 'ri-checkbox-circle-line text-success';
    }
  }

  getStatusText(): string {
    if (this.isFreeReservation && this.showFreeReservationOption) {
      return 'Reserva Gratuita';
    } else if (this.requiresValidation) {
      return 'Requiere Aprobación';
    } else {
      return 'Aprobación Automática';
    }
  }
  getFreeReservationTitle(): string {
  if (this.selectedOrganization?.permiteReservasGratuitas) {
    if (this.selectedOrganization.tipoOrganizacion === TipoOrganizacion.ESCUELA_MUNICIPAL) {
      return 'Reserva Gratuita - Escuela Municipal';
    }
    return 'Reserva Gratuita - Organización Autorizada';
  } else if (this.selectedContribuyente?.esDeportistaElite) {
    return 'Reserva Gratuita - Deportista de Elite';
  }
  return 'Reserva Gratuita';
}

getFreeReservationDescription(): string {
  if (this.selectedOrganization?.permiteReservasGratuitas) {
    return `La organización "${this.selectedOrganization.nombre}" tiene permisos para reservas gratuitas. Esta reserva no generará costo alguno.`;
  } else if (this.selectedContribuyente?.esDeportistaElite) {
    return 'Como deportista de elite registrado, esta reserva se realiza sin costo.';
  }
  return 'Reserva autorizada sin costo.';
}

getPaidReservationTitle(): string {
  if (this.selectedOrganization && !this.selectedOrganization.permiteReservasGratuitas && this.selectedContribuyente?.esDeportistaElite) {
    return 'Reserva con Costo Aplicado';
  } else if (this.selectedOrganization && !this.selectedOrganization.permiteReservasGratuitas) {
    return 'Reserva con Costo';
  } else if (this.selectedContribuyente?.esDeportistaElite && !this.isFreeReservation) {
    return 'Reserva con Costo (Beneficio No Aplicado)';
  }
  return 'Reserva con Costo';
}

getPaidReservationDescription(): string {
  if (this.selectedOrganization && !this.selectedOrganization.permiteReservasGratuitas && this.selectedContribuyente?.esDeportistaElite) {
    return `Aunque es deportista de elite, la organización "${this.selectedOrganization.nombre}" no tiene permisos para reservas gratuitas. Esta reserva generará el costo correspondiente.`;
  } else if (this.selectedOrganization && !this.selectedOrganization.permiteReservasGratuitas) {
    return `La organización "${this.selectedOrganization.nombre}" no tiene permisos para reservas gratuitas. Esta reserva generará el costo correspondiente.`;
  } else if (this.selectedContribuyente?.esDeportistaElite && !this.isFreeReservation) {
    return 'Ha optado por no utilizar su beneficio de deportista elite. Esta reserva generará el costo correspondiente.';
  }
  return 'Esta reserva generará el costo correspondiente.';
}

  onContribuyenteSearch(): void {
    this.showContribuyenteSearch = true;
    if (this.contribuyentesList.length === 0) {
      this.loadContribuyentes();
    }
  }

  onContribuyenteSelected(contribuyente: Contribuyente): void {
    this.selectedContribuyente = contribuyente;
    this.reservationForm.patchValue({
      contribuyenteDto: contribuyente
    });
    this.showContribuyenteSearch = false;
    this.filteredContribuyentes = [];
    this.checkFreeReservationEligibility();
    this.checkOrganizationToggleEligibility();
    this.calculateValidationRequirement();
  }

  searchContribuyente(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value;
    this.performContribuyenteSearch(searchTerm);
  }

  performContribuyenteSearch(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim().length < 2) {
      this.filteredContribuyentes = [...this.contribuyentesList];
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    this.filteredContribuyentes = this.contribuyentesList.filter(contrib => {
      if (contrib.nombreCompleto?.toLowerCase().includes(term)) {
        return true;
      }
      if (contrib.nombre?.toLowerCase().includes(term) ||
          contrib.primerApellido?.toLowerCase().includes(term) ||
          contrib.segundoApellido?.toLowerCase().includes(term)) {
        return true;
      }
      if (contrib.numeroDocumento?.includes(term)) {
        return true;
      }
      if (contrib.email?.toLowerCase().includes(term)) {
        return true;
      }    
      return false;
    });
  }

  clearContribuyenteSearch(): void {
    this.showContribuyenteSearch = false;
    this.filteredContribuyentes = [...this.contribuyentesList];
    if (this.searchInput && this.searchInput.nativeElement) {
      this.searchInput.nativeElement.value = '';
    }
  }

  onOrganizationSearch(): void {
    this.showOrganizationSearch = true;
  }

  onOrganizationSelected(organizacion: Organizacion): void {
    this.selectedOrganization = organizacion;
    this.reservationForm.patchValue({
      organizacionDto: organizacion,
      esParaOrganizacion: true
    });
    this.showOrganizationSearch = false;    
    if (organizacion.representanteDto) {
      this.selectedContribuyente = organizacion.representanteDto;
      this.reservationForm.patchValue({
        contribuyenteDto: organizacion.representanteDto
      });
    }
    this.checkFreeReservationEligibility();
    this.calculatePrice();
  }

  searchOrganization(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value;
    this.performOrganizationSearch(searchTerm);
  }

  performOrganizationSearch(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return;
    }
  }

  clearOrganizationSearch(): void {
    this.showOrganizationSearch = false;
    this.selectedOrganization = undefined;
    this.reservationForm.patchValue({
      organizacionDto: null,
      esParaOrganizacion: false
    });
    this.checkFreeReservationEligibility();
    this.calculatePrice();
  }

  toggleFreeReservation(): void {
    const formValue = this.reservationForm?.getRawValue();
    const selectedOrganization = formValue?.organizacionDto;
    const canToggle = this.selectedContribuyente?.esDeportistaElite && 
                    (!selectedOrganization || selectedOrganization?.permiteReservasGratuitas);    
    if (canToggle) {
      this.isFreeReservation = !this.isFreeReservation;
      this.reservationForm.patchValue({
        esReservaGratuita: this.isFreeReservation,
        motivoGratuidad: this.isFreeReservation ? 'DEPORTISTA_ELITE' : ''
      });
      this.calculatePrice();
    }
  }

  private loadContribuyentes(): void {
    this.contribuyenteService.getAll().subscribe({
      next: (response: any) => {
        if (response.status === 'OK') {
          this.contribuyentesList = response.payload || [];
          this.filteredContribuyentes = [...this.contribuyentesList];
        } else {
          this.contribuyentesList = [];
          this.filteredContribuyentes = [];
        }
      },
      error: (error) => {
        console.error('Error loading taxpayers:', error);
        this.contribuyentesList = [];
        this.filteredContribuyentes = [];
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los contribuyentes. Por favor, intente nuevamente.',
          icon: 'error',
          confirmButtonText: 'Entendido'
        });
      }
    });
  }

  private loadAllOrganizations(): void {
    this.organizationService.getAll().subscribe({
      next: (response: any) => {
        if (response.status === 'OK') {
          this.organizationsList = response.payload.content || [];
        } else {
          this.organizationsList = [];
        }
      },
      error: (error) => {
        console.error('Error loading organizations:', error);
        this.organizationsList = [];
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar las organizaciones. Por favor, intente nuevamente.',
          icon: 'error',
          confirmButtonText: 'Entendido'
        });
      }
    });
  }


  private loadOrganizations(): void {
    if (this.userRole === 'Admin' || this.userRole === 'Encargado') {
      if (this.selectedContribuyente) {
        this.organizationsList = this.selectedContribuyente.organizacionesRepresentadas || [];
      } else {
        this.loadAllOrganizations()
      }
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }

  private showFormErrors(): void {
    const firstInvalidField = this.findFirstInvalidField();
    if (firstInvalidField) {
      Swal.fire({
        title: 'Error en el formulario',
        text: firstInvalidField,
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    }
  }

  private findFirstInvalidField(): string {
    const fields = [
      { name: 'contribuyenteDto', message: this.getFieldError('contribuyenteDto') },
      { name: 'fechaUso', message: this.getFieldError('fechaUso') },
      { name: 'horaInicio', message: this.getFieldError('horaInicio') },
      { name: 'horaFin', message: this.getFieldError('horaFin') },
      { name: 'observaciones', message: this.getFieldError('observaciones') },
      { name: 'aceptaTerminos', message: this.getFieldError('aceptaTerminos') }
    ];
    
    const invalidField = fields.find(field => field.message);
    return invalidField?.message || 'Por favor, complete todos los campos requeridos correctamente.';
  }

  getFieldError(fieldName: string): string | null {
    if (!this.reservationForm) return null;
    
    const field = this.reservationForm.get(fieldName);
    
    if (!field || !field.errors || (!field.touched && !this.submitted)) {
      return null;
    }

    const errors = field.errors;

    if (errors['required']) return 'Este campo es obligatorio';
    if (errors['min']) return `Valor mínimo: ${errors['min'].min}`;
    if (errors['max']) return `Valor máximo: ${errors['max'].max}`;
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
    if (errors['email']) return 'Formato de email inválido';
    if (errors['pastDate']) return 'La fecha no puede ser anterior a hoy';
    if (errors['pattern']) return 'Formato inválido';

    if (errors['timeRange']) return errors['timeRange'];
    if (errors['minimumDuration']) return errors['minimumDuration'];
    if (errors['anticipationRequired']) return errors['anticipationRequired'];
    if (errors['capacityExceeded']) return `Capacidad máxima excedida: ${errors['capacityExceeded'].max} personas`;
    if (errors['contribuyenteRequired']) return errors['contribuyenteRequired'];
    if (errors['organizacionRequired']) return errors['organizacionRequired'];
    if (errors['cantidadPersonasRequired']) return errors['cantidadPersonasRequired'];
    if (errors['recurrentNotAllowed']) return errors['recurrentNotAllowed'];

    return 'Campo inválido';
  }

  isFieldInvalid(fieldName: string): boolean {
    if (!this.reservationForm) return false;    
    const field = this.reservationForm.get(fieldName);
    return !!(field && field.invalid && (field.touched || this.submitted));
  }

  getFormError(): string | null {
    if (!this.reservationForm) return null;    
    const errors = this.reservationForm.errors;
    if (!errors || (!this.reservationForm.touched && !this.submitted)) {
      return null;
    }
    if (errors['timeRange']) return errors['timeRange'];
    if (errors['minimumDuration']) return errors['minimumDuration'];
    if (errors['anticipationRequired']) return errors['anticipationRequired'];
    if (errors['capacityExceeded']) return `Capacidad máxima: ${errors['capacityExceeded'].max} personas`;
    if (errors['recurrentNotAllowed']) return errors['recurrentNotAllowed'];
    return 'Existen errores en el formulario';
  }

  get canSelectOrganization(): boolean {
    return this.showOrganizationToggle;
  }

  get userDisplayName(): string {
    if (this.selectedContribuyente) {
      return `${this.selectedContribuyente.nombre} ${this.selectedContribuyente.primerApellido}`;
    }
    return 'Usuario no identificado';
  }

  get canEditReservationNumber(): boolean {
    return false;
  }

  getTarifaCategories(): string {
    if (!this.selectedTariff?.categoriasDtoList) return 'Sin categoría';
    return this.selectedTariff.categoriasDtoList
      .map((tc: any) => tc.categoriaDto?.nombre)
      .filter(Boolean)
      .join(', ');
  }

  getTariffDescription(): string {
    const units = {
      'por_hora': 'por hora',
      'por_persona': 'por persona',
      'por_evento': 'por evento',
      'mensualidad': 'por mes',
      'por_sesion': 'por sesión',
      'por_club': 'por mes',
      'periodo' : 'periodo de Escuela'
    };
    return units[this.selectedTariff.tipoCobro] || '';
  }
  
  getRecurrenceSummary(): string {
    const tipoRecurrencia = this.reservationForm.get('tipoRecurrencia')?.value;
    const fechaInicio = this.reservationForm.get('fechaInicio')?.value;
    const fechaFin = this.reservationForm.get('fechaFin')?.value;
    const diasSemana = this.reservationForm.get('diasSemana')?.value;
    const horaInicio = this.reservationForm.get('horaInicio')?.value;
    const duracion = this.reservationForm.get('duracionSesionHoras')?.value;
    if (!tipoRecurrencia || !fechaInicio || !fechaFin) return '';
    let summary = '';
    const startDate = this.safeParseDate(fechaInicio);
    const endDate = this.safeParseDate(fechaFin);
    if (!startDate || !endDate) return '';
    switch (tipoRecurrencia) {
      case 'diaria':
        summary = `Diariamente del ${this.formatDate(startDate)} al ${this.formatDate(endDate)}`;
        break;
      case 'semanal':
        const dias = this.getDiasSemanaNames(diasSemana);
        summary = `Semanalmente los ${dias} del ${this.formatDate(startDate)} al ${this.formatDate(endDate)}`;
        break;
      case 'mensual':
        summary = `Mensualmente del ${this.formatDate(startDate)} al ${this.formatDate(endDate)}`;
        break;
    }
    if (horaInicio && duracion) {
      summary += ` a las ${horaInicio} por ${duracion} horas`;
    }
    return summary;
  }

  calculateTotalSessions(): number {
    if (this.bookingType === 'recurrente' && this.recurrentSchedule?.cantidadSesiones) {
      return this.getRecurrentSessionCount();
    }

    const tipoRecurrencia = this.reservationForm.get('tipoRecurrencia')?.value;
    const fechaInicio = this.reservationForm.get('fechaInicio')?.value;
    const fechaFin = this.reservationForm.get('fechaFin')?.value;
    const diasSemana = this.reservationForm.get('diasSemana')?.value;
    if (!tipoRecurrencia || !fechaInicio || !fechaFin) return 0;
    const start = this.safeParseDate(fechaInicio);
    const end = this.safeParseDate(fechaFin);
    if (!start || !end) return 0;
    let sessions = 0;
    switch (tipoRecurrencia) {
      case 'diaria':
        const timeDiff = end.getTime() - start.getTime();
        sessions = Math.floor(timeDiff / (1000 * 3600 * 24)) + 1;
        break;      
      case 'semanal':
        if (!diasSemana || diasSemana.length === 0) return 0;        
        const diasArray = this.normalizeDiasSemana(diasSemana);
        let current = new Date(start);
        while (current <= end) {
          const dayOfWeek = current.getDay();
          const dayName = this.getDiaSemanaKey(dayOfWeek);
          if (diasArray.includes(dayName)) {
            sessions++;
          }
          current.setDate(current.getDate() + 1);
        }
        break;      
      case 'mensual':
        let monthlyDate = new Date(start);
        while (monthlyDate <= end) {
          sessions++;
          monthlyDate.setMonth(monthlyDate.getMonth() + 1);
        }
        break;
    }
    return sessions;
  }

  private getRecurrentSessionCount(): number {
    if (this.selectedTariff?.tipoCobro === 'por_sesion') {
      const billableHours = this.selectedTariff.desde && this.selectedTariff.hasta
        ? this.calculateTotalOverlappingHoursFromTablero(this.selectedTariff.desde, this.selectedTariff.hasta)
        : this.calculateTotalHoursForRecurrentSessions();

      if (billableHours > 0) return billableHours;
    }

    const fromSchedule = Number(this.recurrentSchedule?.cantidadSesiones || 0);
    if (fromSchedule > 0) return fromSchedule;

    const fromForm = Number(this.reservationForm?.get('cantidadSesiones')?.value || 0);
    return fromForm > 0 ? fromForm : 1;
  }

  getDiasSemanaNames(diasSemana: string[] | string | any[]): string {
    const dias = this.normalizeDiasSemana(diasSemana);
    if (dias.length === 0) return '';
    const dayNames: { [key: string]: string } = {
      lunes: 'Lunes',
      martes: 'Martes',
      miercoles: 'Miércoles',
      jueves: 'Jueves',
      viernes: 'Viernes',
      sabado: 'Sábado',
      domingo: 'Domingo'
    };
    return dias.map(dia => dayNames[dia] || dia).join(', ');
  }

  private normalizeDiasSemana(diasSemana: string[] | string | any[]): string[] {
    if (!diasSemana) return [];

    const values = Array.isArray(diasSemana)
      ? diasSemana
      : String(diasSemana).split(',');

    const aliases: { [key: string]: string } = {
      lun: 'lunes',
      lunes: 'lunes',
      mar: 'martes',
      martes: 'martes',
      mie: 'miercoles',
      mié: 'miercoles',
      miercoles: 'miercoles',
      miércoles: 'miercoles',
      jue: 'jueves',
      jueves: 'jueves',
      vie: 'viernes',
      viernes: 'viernes',
      sab: 'sabado',
      sáb: 'sabado',
      sabado: 'sabado',
      sábado: 'sabado',
      dom: 'domingo',
      domingo: 'domingo'
    };

    return values
      .map((value: any) => typeof value === 'string' ? value : value?.dia)
      .filter(Boolean)
      .map((value: string) => value.trim().toLowerCase())
      .map((value: string) => aliases[value] || value)
      .filter((value: string, index: number, array: string[]) => array.indexOf(value) === index);
  }

  private getDiaSemanaKey(dayNumber: number): string {
    const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    return days[dayNumber];
  }

  getDayName(dayNumber: number): string {
    const days = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
    return days[dayNumber];
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('es-ES');
  }

  formatDuration(hours: number): string {
    const totalMinutes = hours * 60;
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;    
    if (hrs === 0) return `${mins} min`;
    if (mins === 0) return `${hrs} ${hrs === 1 ? 'hora' : 'horas'}`;
    return `${hrs}h ${mins}m`;
  }

  get f() { 
    return this.reservationForm ? this.reservationForm.controls : {}; 
  }

  get duration(): number {
    return this.reservationForm ? this.reservationForm.get('duracionHoras')?.value || 0 : 0;
  }

  get scheduleConflictError(): boolean {
    return this.reservationForm ? this.reservationForm.hasError('timeConflict') : false;
  }

  get invalidRangeError(): boolean {
    return this.reservationForm ? this.reservationForm.hasError('timeRange') : false;
  }

  get anticipationError(): boolean {
    return this.reservationForm ? this.reservationForm.hasError('anticipationRequired') : false;
  }
}

