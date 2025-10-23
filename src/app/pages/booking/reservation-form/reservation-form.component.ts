import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, SimpleChanges } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { format, addHours, differenceInHours, startOfDay, isBefore, isSameDay, parseISO, addDays, isAfter, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import Swal from 'sweetalert2';

import { Contribuyente } from 'src/app/core/models/contribuyente.models';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { Tarifa } from 'src/app/core/models/tarifa.model';
import { ComplejoDeportivo } from 'src/app/core/models/complejoDeportivo.model';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { RuatRequestsService } from 'src/app/core/services/ruat/ruatRequest.service';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { GlobalComponent } from 'src/app/global-component';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { NgbCollapseModule, NgbNavModule, NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { Reserva } from 'src/app/core/models/reserva.models';
import { ReservaPuntual } from 'src/app/core/models/reservaPuntual.models';
import { ReservaRecurrente } from 'src/app/core/models/reservaRecurrente.models';
import { Organizacion } from 'src/app/core/models/organizacion.models';
import { OrganizacionService } from 'src/app/core/services/api/organizacion.service';
import { BookingType } from 'src/app/core/constants/Features';
import { EstadoReserva, EstadoValidacion } from 'src/app/core/constants/Estados';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';

interface PuntualSchedule {
  date: Date;
  start: string;
  end: string;
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
  @Input() userRole: 'contribuyente' | 'representante' | 'encargado' | 'admin' = 'contribuyente';  
  @Input() bookingType!: BookingType;
  @Input() dataComplejo!: ComplejoDeportivo;
  @Input() dataField!: CampoDeportivo;
  @Input() selectedTariff!: Tarifa;
  @Input() selectedSchedule?: PuntualSchedule;
  @Input() recurrentSchedule?: any;
  @Input() contribuyente?: Contribuyente;
  @Input() reservationsList: Reserva[] = [];
  // @Input() validHours: number = GlobalComponent.VALID_HOURS;
  // @Input() anticipationHours: number = 48;
  @Input() systemConfigs: { [key: string]: ConfiguracionSistema } = {};
  
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
  requiresValidation = false;

  minDate = this.safeFormatDate(new Date(), 'yyyy-MM-dd');
  maxDate = this.safeFormatDate(addDays(new Date(), 30), 'yyyy-MM-dd');
  
  private destroy$ = new Subject<void>();
  private formInitialized = false;

  constructor(
    private fb: FormBuilder,
    private reservaService: ReservaService,
    private ruatService: RuatRequestsService,
    private contribuyenteService: ContribuyentesService,
    private organizationService: OrganizacionService
  ) {}

  
  // Add system config getters
  get validHours(): number {
    return this.systemConfigs['HORAS_VALIDACION_PAGO']?.valorNumerico || 4;
  }

  get anticipationHours(): number {
    if (!this.selectedTariff) {
      const horasPuntuales = this.systemConfigs['HORAS_ANTICIPACION_RESERVAS_PUNTUALES']?.valorNumerico;
      return horasPuntuales ?? 48;
    }
    
    switch (this.selectedTariff.tipoCobro) {
      case 'por_evento':
        const diasEventos = this.systemConfigs['DIAS_ANTICIPACION_EVENTOS']?.valorNumerico;
        return (diasEventos ?? 2) * 24;
      case 'mensualidad': 
      case 'por_sesion': 
      case 'por_club':
        const diasRecurrentes = this.systemConfigs['DIAS_ANTICIPACION_RECURRENTES']?.valorNumerico;
        return (diasRecurrentes ?? 3) * 24;
      default:
        const horasPuntuales = this.systemConfigs['HORAS_ANTICIPACION_RESERVAS_PUNTUALES']?.valorNumerico;
        return horasPuntuales ?? 48;
    }
  }

  get anticipationTimeDisplay(): string {
    if (!this.selectedTariff) {
      const horasPuntuales = this.systemConfigs['HORAS_ANTICIPACION_RESERVAS_PUNTUALES']?.valorNumerico;
      const hours = horasPuntuales ?? 48;
      return `${hours} horas`;
    }    
    switch (this.selectedTariff.tipoCobro) {
      case 'por_evento':
        const diasEventos = this.systemConfigs['DIAS_ANTICIPACION_EVENTOS']?.valorNumerico;
        const eventDays = diasEventos ?? 2;
        return `${eventDays} días`;
      case 'mensualidad': 
      case 'por_sesion': 
      case 'por_club':
        const diasRecurrentes = this.systemConfigs['DIAS_ANTICIPACION_RECURRENTES']?.valorNumerico;
        const recurrentDays = diasRecurrentes ?? 3;
        return `${recurrentDays} días`;
      default:
        const horasPuntuales = this.systemConfigs['HORAS_ANTICIPACION_RESERVAS_PUNTUALES']?.valorNumerico;
        const hours = horasPuntuales ?? 48;
        return `${hours} horas`;
    }
  }

  // Add RUAT config getters
  get ruatCodigoAlcaldia(): string {
    return this.systemConfigs['CODIGO_ALCALDIA_RUAT']?.valorTexto || 'QUI';
  }

  get ruatServicioMunicipal(): string {
    return this.systemConfigs['SERVICIO_MUNICIPAL_RUAT']?.valorTexto || '2174';
  }

  get ruatIntentosReintento(): number {
    return this.systemConfigs['INTENTOS_REINTENTO_RUAT']?.valorNumerico || 3;
  }


  ngOnInit(): void {
    this.initializeUserContext();
    this.generateReservationNumber();
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contribuyente'] && this.contribuyente) {
      this.selectedContribuyente = this.contribuyente;
      if (this.formInitialized) {
        this.updateFormWithContribuyente();
      }
    }
    
    if ((changes['selectedTariff'] || changes['selectedSchedule'] || changes['recurrentSchedule'] || changes['dataField'] || changes['systemConfigs']) && this.formInitialized) {
      this.calculateValidationRequirement();
      this.calculatePrice();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private safeFormatDate(date: any, formatStr: string): string {
    if (!date) return '';
    try {
      const parsedDate = typeof date === 'string' ? new Date(date) : date;
      return isValid(parsedDate) ? format(parsedDate, formatStr) : '';
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  }

  private safeParseDate(dateString: string): Date | null {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return isValid(date) ? date : null;
    } catch (error) {
      console.error('Error parsing date:', error);
      return null;
    }
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

  private initializeUserContext(): void {
    if (!this.contribuyente) {
      this.loadContribuyentes();
      this.loadOrganizations();   
    } else {      
      this.selectedContribuyente = this.contribuyente;
      if (this.userRole === 'representante') {
        this.organizationsList = this.contribuyente.organizacionesRepresentadas?.length ? 
          this.contribuyente.organizacionesRepresentadas : [];
      }
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
    
    this.calculateValidationRequirement();
    const numeroReservaDisabled = this.userRole === 'contribuyente';    
    this.reservationForm = this.fb.group({
      fechaReserva: [new Date()],
      tipoReserva: [this.bookingType],
      estadoValidacion: [{ value: this.requiresValidation ? EstadoValidacion.PENDIENTE : EstadoValidacion.APROBADA, disabled: true }],
      estadoReserva: [{ value: EstadoReserva.PENDIENTE, disabled: true }],
      numeroReserva: [{ value: this.numeroReserva, disabled: numeroReservaDisabled }, Validators.required],
      contribuyenteDto: [this.selectedContribuyente || null, [Validators.required]],
      esParaOrganizacion: [false],
      organizacionDto: [null],
      fechaUso: [
        initialFechaUso,
        [this.futureDateValidator()]
      ],
      horaInicio: [initialHoraInicio],
      horaFin: [initialHoraFin],
      duracionHoras: [{ value: initialDuracion, disabled: true }],
      cantidadPersonas: [
        1,
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
      aceptaTerminos: [false, [Validators.requiredTrue]]
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
    }
  }

  private calculateValidationRequirement(): void {
    if (!this.dataField || !this.selectedContribuyente) {
      this.requiresValidation = true;
      return;
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
    if (this.userRole === 'contribuyente') {
      this.reservationForm.get('esParaOrganizacion')?.disable();
    }
    
    this.reservationForm.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.calculatePrice();
    });
    
    this.reservationForm.get('esParaOrganizacion')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(esParaOrganizacion => {
      if (esParaOrganizacion && (this.userRole === 'admin' || this.userRole === 'encargado' || this.userRole === 'representante')) {
        this.showOrganizationSearch = true;
      } else {
        this.showOrganizationSearch = false;
        this.selectedOrganization = undefined;
        this.reservationForm.patchValue({ organizacionDto: null });
      }
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

  // VALIDATORS
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
    
    if (this.bookingType === 'recurrente' && this.userRole === 'contribuyente') {
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

  private anticipationValidator(): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      if (this.bookingType === 'recurrente') return null;

      const fechaUso = formGroup.get('fechaUso')?.value;
      const horaInicio = formGroup.get('horaInicio')?.value;

      if (!fechaUso || !horaInicio) return null;
      
      const selectedDateTime = this.safeParseDate(`${fechaUso}T${horaInicio}:00`);
      if (!selectedDateTime) return null;
      
      const now = new Date();
      const hoursDifference = differenceInHours(selectedDateTime, now);
      
      if (hoursDifference < this.anticipationHours) {
        return { 
          anticipationRequired: `Las reservas requieren ${this.anticipationHours} horas de anticipación mínima` 
        };
      }
      
      return null;
    };
  }

  private futureDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const selectedDate = this.safeParseDate(control.value);
      if (!selectedDate) return { invalidDate: true };
      
      const today = startOfDay(new Date());
      
      return isBefore(selectedDate, today) ? { pastDate: true } : null;
    };
  }

  private calculatePrice(): void {
    if (!this.selectedTariff || !this.reservationForm) {
      this.calculatedPrice = 0;
      this.priceDetails = [];
      return;
    }

    const formValue = this.reservationForm.getRawValue();
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
        total = montoBase * (this.recurrentSchedule?.cantidadSesiones || 1);
        detalles.push(`${this.recurrentSchedule?.cantidadSesiones} sesión(es) × Bs. ${montoBase.toFixed(2)}`);
        break;
      
      case 'por_club':
        total = montoBase;
        detalles.push(`Tarifa club/organización: Bs. ${montoBase.toFixed(2)}`);
        break;
    }

    // Add conceptos adicionales
    if (this.selectedTariff.conceptosDtos && this.selectedTariff.conceptosDtos.length > 0) {
      const conceptosActivos = this.selectedTariff.conceptosDtos.filter((concepto: any) => concepto.activo);
      
      if (conceptosActivos.length > 0) {
        detalles.push(''); // Empty line for separation
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
              const horasConcepto = this.getDurationForConcepto(formValue);
              conceptoDetalle = `${concepto.concepto}: ${horasConcepto.toFixed(1)}h × Bs. ${concepto.valor} (Bs. ${conceptoMonto.toFixed(2)})`;
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
      this.reservationForm.patchValue({ montoTotal: this.calculatedPrice }, { emitEvent: false });
    }
  }
  private calculateConceptoAmount(concepto: any, baseAmount: number, formValue: any): number {
    switch (concepto.tipo) {
      case 'porcentaje':
        return baseAmount * (concepto.valor / 100);
      
      case 'fijo':
        return concepto.valor || 0;
      
      case 'por_hora':
        const horas = this.getDurationForConcepto(formValue);
        return (concepto.valor || 0) * horas;
      
      default:
        return 0;
    }
  }

  private getDurationForConcepto(formValue: any): number {
    if (this.bookingType === 'puntual') {
      return formValue.duracionHoras || 1;
    } else if (this.bookingType === 'recurrente' && this.recurrentSchedule) {
      return this.recurrentSchedule.duracionSesionHoras || 1;
    }
    return 1;
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
        return montoBase * (this.recurrentSchedule?.cantidadSesiones || 1);
      default:
        return montoBase;
    }
  }

  hasConceptos(): boolean {
    return this.selectedTariff?.conceptosDtos?.some((concepto: any) => concepto.activo) || false;
  }

getBaseQuantity(): string {
  if (!this.selectedTariff) return '-';
  
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
      return `${this.recurrentSchedule?.cantidadSesiones || 1} sesión(es)`;
    case 'por_evento':
    case 'por_club':
      return '1 evento';
    default:
      return '1';
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
      
      switch (concepto.tipo) {
        case 'porcentaje':
          description = `Aplicado sobre tarifa base (${concepto.valor}%)`;
          quantity = `${concepto.valor}%`;
          break;
        case 'fijo':
          description = 'Monto fijo adicional';
          quantity = 'Fijo';
          break;
        case 'por_hora':
          const horas = this.getDurationForConcepto(formValue);
          description = `Tarifa por hora aplicada`;
          quantity = `${horas.toFixed(1)}h × Bs. ${concepto.valor}`;
          break;
        default:
          description = 'Concepto adicional';
          quantity = '1';
      }
      
      detalles.push({
        concepto: concepto.concepto,
        description: description,
        quantity: quantity,
        amount: amount
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

  private timeToMinutes(time: string): number {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private generateReservationNumber(): void {
    const timestamp = new Date().getTime().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.numeroReserva = `RES-${timestamp}-${random}`;
    
    if (this.reservationForm) {
      this.reservationForm.patchValue({ numeroReserva: this.numeroReserva });
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
    
    Swal.fire({
      title: 'Confirmar Reserva',
      html: `
        <div class="text-start">
          <p>¿Está seguro de que desea confirmar esta reserva?</p>
          <div class="border rounded p-3 bg-light">
            <strong>Detalles:</strong><br>
            • ${this.dataComplejo?.nombre} - ${this.dataField?.nombre}<br>
            • ${this.bookingType === 'recurrente' ? 'Reserva Recurrente' : 'Reserva Puntual'}<br>
            • Total: ${formattedTotal}<br>
            • Contribuyente: ${this.selectedContribuyente?.nombreCompleto}<br>
            • Estado: ${this.requiresValidation ? 'Requiere Aprobación' : 'Aprobada Automáticamente'}
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, Confirmar',
      cancelButtonText: 'Revisar',
      confirmButtonColor: '#198754',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
        this.processReservation();
      }
    });
  }

  private processReservation(): void {
    this.isSubmitting = true;
    const reservaData = this.prepareReservationData();
    
    this.registerReservationInRuat(reservaData);
  }

  private prepareReservationData(): Reserva {
    const formValue = this.reservationForm.getRawValue();
    
    const reserva: Reserva = {
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
      tipoReserva: this.bookingType,
      fechaReserva: new Date(),
      numeroReserva: formValue.numeroReserva,
      estadoValidacion: this.requiresValidation ? EstadoValidacion.PENDIENTE : EstadoValidacion.APROBADA,
      estadoReserva: EstadoReserva.PENDIENTE,
      montoTotal: this.calculatedPrice,
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
      reserva.reservaRecurrenteDto = {
        tipoRecurrencia: this.recurrentSchedule.tipoRecurrencia,
        fechaInicio: this.recurrentSchedule.fechaInicio,
        fechaFin: this.recurrentSchedule.fechaFin,
        diasSemana: this.recurrentSchedule.diasSemana,
        cantidadSesiones: this.recurrentSchedule.cantidadSesiones,
        duracionSesionHoras: this.recurrentSchedule.duracionSesionHoras,
        cantidadPersonas: formValue.cantidadPersonas,
        tarifaMensual: this.calculatedPrice / this.safeCalculateMonthsDuration(this.recurrentSchedule.fechaInicio, this.recurrentSchedule.fechaFin),
        activo: true,
        categoria: this.getTarifaCategories(),
        superficie: this.dataField?.superficieDto?.descripcion || '',
        observaciones: formValue.observaciones,
        tableroDto: {
          horario: this.recurrentSchedule.tablero
        }
      };
    }

    return reserva;
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

  private registerReservationInRuat(reservaData: Reserva): void {
    if (!reservaData.contribuyenteDto?.codigoContribuyente) {
      this.handleError('Datos incompletos', 'Falta el código de contribuyente para registrar en RUAT');
      return;
    }
    if (!this.selectedTariff?.clasificadorRuatDto?.codigo) {
      this.handleError('Configuración incompleta', 'Falta el clasificador RUAT para la tarifa seleccionada');
      return;
    }

    // Use system configs instead of GlobalComponent
    const ruatData = {
      codigoAlcaldia: this.ruatCodigoAlcaldia,
      codigoUsuario: reservaData.contribuyenteDto.codigoContribuyente,
      codigoContribuyente: reservaData.contribuyenteDto.codigoContribuyente,
      servicioMunicipal: this.ruatServicioMunicipal,
      datosConcepto: [{
        numero: '1',
        codigoClasificador: this.selectedTariff.clasificadorRuatDto.codigo,
        tipoArancel: this.selectedTariff.clasificadorRuatDto.tipoArancel || "DI",
        monto: this.calculatedPrice.toFixed(2)
      }],
      observacion: this.reservationForm.value.observaciones
    };

    this.ruatService.createTasa(ruatData, reservaData.contribuyenteDto.codigoContribuyente)
    .subscribe({
      next: (response: any) => {
        if (response.status === 'OK' || response.continuarFlujo) {
          reservaData.numeroTasa = response.numeroTasa || response.numeroTasa;
          this.saveReservation(reservaData);
        } else {
          this.handleError('Error en RUAT', response.mensaje || 'No se pudo registrar la tasa');
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        this.handleError('Error de conexión con RUAT', error.error?.mensaje || error.message);
      }
    });
  }

  private saveReservation(reservaData: Reserva): void {
    this.reservaService.create(reservaData).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        this.submitted = false;
        if (response.status === 'OK') {
          this.showSuccessMessage();
          this.reservationCompleted.emit(response.payload || response);
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

  private showSuccessMessage(): void {
    const successMessage = this.bookingType === 'recurrente' 
      ? '¡Reserva recurrente creada exitosamente! Se ha generado la tasa municipal correspondiente.' 
      : '¡Reserva creada exitosamente! Se ha generado la tasa municipal correspondiente.';
    
    Swal.fire({
      title: '¡Reserva Confirmada!',
      text: successMessage,
      icon: 'success',
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#198754'
    });
  }

  private handleError(title: string, error: any): void {
    console.error(title, error);
    Swal.fire({
      title: title,
      text: error.message || 'Por favor, intente nuevamente.',
      icon: 'error',
      confirmButtonText: 'Entendido'
    });
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
    if (this.organizationsList.length === 0) {
      this.loadOrganizations();
    }
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
  }

  private loadContribuyentes(): void {
    this.contribuyenteService.getAll().subscribe({
      next: (response: any) => {
        if (response.status === 'OK') {
          this.contribuyentesList = response.payload || [];
          this.filteredContribuyentes = [...this.contribuyentesList];
        } else {
          console.warn('Unexpected response format:', response);
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

  private loadOrganizations(): void {
    this.organizationService.getAll().subscribe({
      next: (response: any) => {
        if (response.status === 'OK') {
          this.organizationsList = response.payload.content || [];
        } else {
          console.warn('Unexpected response format:', response);
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

  back(): void {
    this.goBack.emit();
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

  get requiresApproval(): boolean {
    return this.requiresValidation;
  }

  get canSelectOrganization(): boolean {
    return this.userRole === 'admin' || this.userRole === 'encargado' || this.userRole === 'representante';
  }

  get userDisplayName(): string {
    if (this.selectedContribuyente) {
      return `${this.selectedContribuyente.nombre} ${this.selectedContribuyente.primerApellido}`;
    }
    return 'Usuario no identificado';
  }

  get canEditReservationNumber(): boolean {
    return this.userRole !== 'contribuyente';
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
      'por_club': 'por mes'
    };
    return units[this.selectedTariff.tipoCobro] || '';
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