import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { format, addHours, differenceInHours, startOfDay, isBefore, isSameDay, parseISO, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import Swal from 'sweetalert2';

// Models and Services
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

export type BookingType = 'puntual' | 'recurrente';
export type ReservationType = 'por_hora' | 'por_persona' | 'por_evento' | 'mensualidad' | 'por_club';

interface RecurrentScheduleData {
  tipoRecurrencia: 'semanal' | 'mensual';
  fechaInicio: Date;
  fechaFin: Date;
  diasSeleccionados: any[];
  tablero: string[][];
  cantidadSesiones: number;
  duracionSesionHoras: number;
  diasSemana: string;
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
  @Input() dataComplejo!: ComplejoDeportivo;
  @Input() dataField!: CampoDeportivo;
  @Input() selectedTariff!: Tarifa;
  @Input() selectedSchedule!: any;
  @Input() contribuyente?: Contribuyente;
  @Input() reservationsList: Reserva[] = [];
  @Input() globalAdmin: any;
  @Input() recurrentScheduleData?: RecurrentScheduleData;

  @Output() reservationCompleted = new EventEmitter<Reserva>();
  @Output() goBack = new EventEmitter<void>();

  @ViewChild('searchInput') searchInput!: ElementRef;

  VALID_HOURS = GlobalComponent.VALID_HOURS;
  ANTICIPATION_HOURS!:number;
  reservationForm!: FormGroup;
  isSubmitting = false;
  submitted = false;
  
  activeSection = 'schedule';
  showContribuyenteSearch = false;
  contribuyentesList: Contribuyente[] = [];
  filteredContribuyentes: Contribuyente[] = [];
  searchingContribuyente = false;
  
  totalCost = 0;
  duration = 0;
  conceptos: any[] = [];
  
  minDate: string;
  maxDate: string;
  minTime = '06:00';
  maxTime = '23:00';
  businessHours: any = null;

  // Collapsible Sections
  fieldCollapsed = true;
  contributorCollapsed = true;
  termsCollapsed = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private reservaService: ReservaService,
    private ruatService: RuatRequestsService,
    private contribuyenteService: ContribuyentesService
  ) {
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
    
    const maxDate = addDays(today, 60); // 2 months max
    this.maxDate = maxDate.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormSubscriptions();
    this.loadBusinessHours();
    
    if (!this.contribuyente) {
      this.loadContribuyentes();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.reservationForm = this.fb.group({
      complejo: [{ value: this.dataComplejo?.nombre || '', disabled: true }],
      campo: [{ value: this.dataField?.nombre || '', disabled: true }],
      fechaReserva: [
        this.selectedSchedule?.date ? this.formatDateForInput(this.selectedSchedule.date) : '',
        [Validators.required, this.futureDateValidator()]
      ],
      horaEntrada: [
        this.selectedSchedule?.start?.slice(0, 5) || '',
        [Validators.required]
      ],
      horaSalida: [
        this.selectedSchedule?.end?.slice(0, 5) || '',
        [Validators.required]
      ],
      
      contribuyenteDto: [this.contribuyente || null, [Validators.required]],
      searchContribuyente: [''],
      contribuyenteNombre: [
        { value: this.contribuyente?.nombreCompleto || this.contribuyente?.nombre || '', disabled: !!this.contribuyente }
      ],
      contribuyenteCI: [
        { value: this.contribuyente?.numeroDocumento || '', disabled: !!this.contribuyente }
      ],
      contribuyenteTelefono: [
        this.contribuyente?.telefono || '',
        [Validators.pattern(/^[\d\s+\-()]+$/)]
      ],
      contribuyenteEmail: [
        this.contribuyente?.email || '',
        [Validators.email]
      ],
      
      // Additional Information
      observaciones: ['Reserva de Cancha Deportiva GAMQ', [
        Validators.required, 
        Validators.minLength(10),
        Validators.maxLength(500)
      ]],
      totalPersonas: [1, [Validators.required, Validators.min(1), Validators.max(this.dataField?.capacidadPersonas || 100)]],
      
      // Payment and Terms
      totalPago: [{ value: 0, disabled: true }, [Validators.required, Validators.min(0.01)]],
      duracion: [{ value: '', disabled: true }, Validators.required],
      aceptaTerminos: [false, [Validators.requiredTrue]]
    }, {
      validators: [
        this.timeRangeValidator(),
        this.businessHoursValidator(),
        this.conflictValidator(),
        this.anticipationValidator()
      ]
    });

    this.setInitialFormValues();
  }

  private futureDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const selectedDate = new Date(control.value);
      const today = startOfDay(new Date());
      
      return isBefore(selectedDate, today) ? { pastDate: true } : null;
    };
  }

  private setInitialFormValues(): void {
    if (this.dataField) {
      this.reservationForm.patchValue({
        complejo: this.dataComplejo?.nombre,
        campo: this.dataField.nombre
      });
    }

    if (this.isEventTariff()) {
      this.reservationForm.patchValue({
        horaEntrada: this.selectedTariff.desde?.slice(0, 5),
        horaSalida: this.selectedTariff.hasta?.slice(0, 5)
      });
    }

    this.calculateCostAndDuration();
  }

  private setupFormSubscriptions(): void {
    // Schedule changes
    if (this.bookingType === 'puntual') {
      this.reservationForm.get('fechaReserva')?.valueChanges
        .pipe(takeUntil(this.destroy$), debounceTime(300))
        .subscribe(() => {
          this.loadBusinessHours();
          this.validateReservationTiming();
          this.calculateCostAndDuration();
        });

      ['horaEntrada', 'horaSalida'].forEach(field => {
        this.reservationForm.get(field)?.valueChanges
          .pipe(takeUntil(this.destroy$), debounceTime(300))
          .subscribe(() => {
            this.calculateCostAndDuration();
          });
      });
    }

    // Person count changes
    this.reservationForm.get('totalPersonas')?.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(300))
      .subscribe(() => {
        if (this.isPerPersonTariff()) {
          this.calculateCostAndDuration();
        }
      });

    // Contributor search
    this.reservationForm.get('searchContribuyente')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(400),
        distinctUntilChanged()
      )
      .subscribe(searchTerm => {
        this.searchContribuyente(searchTerm);
      });

    // Selected contributor changes
    this.reservationForm.get('contribuyenteDto')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((contribuyente: Contribuyente) => {
        if (contribuyente) {
          this.updateContribuyenteForm(contribuyente);
        }
      });
  }

  private updateContribuyenteForm(contribuyente: Contribuyente): void {
    this.reservationForm.patchValue({
      contribuyenteNombre: contribuyente.nombreCompleto || `${contribuyente.nombre} ${contribuyente.primerApellido} ${contribuyente.segundoApellido || ''}`.trim(),
      contribuyenteCI: contribuyente.numeroDocumento,
      contribuyenteTelefono: contribuyente.telefono,
      contribuyenteEmail: contribuyente.email
    }, { emitEvent: false });
  }


  private calculateCostAndDuration(): void {
    if (!this.selectedTariff) return;

    if (this.bookingType==='recurrente') {
      this.calculateRecurrentCost();
    } else {
      this.calculatePuntualCost();
    }

    this.updateFormCosts();
  }

  private calculatePuntualCost(): void {
    const horaEntrada = this.reservationForm.get('horaEntrada')?.value;
    const horaSalida = this.reservationForm.get('horaSalida')?.value;

    if (!horaEntrada || !horaSalida) {
      this.totalCost = 0;
      this.duration = 0;
      return;
    }

    const startMinutes = this.timeToMinutes(horaEntrada);
    const endMinutes = this.timeToMinutes(horaSalida);
    this.duration = (endMinutes - startMinutes) / 60;

    this.totalCost = this.calculateTotalCost();
  }

  private calculateRecurrentCost(): void {
    if (!this.recurrentScheduleData) return;

    this.duration = this.recurrentScheduleData.duracionSesionHoras;
    this.totalCost = this.calculateRecurrentTotalCost();
  }

  private updateFormCosts(): void {
    this.reservationForm.patchValue({
      duracion: this.formatDuration(this.duration),
      totalPago: this.totalCost
    });
  }

  private calculateTotalCost(): number {
    let baseCost = 0;

    if (this.isEventTariff()) {
      baseCost = this.selectedTariff.precioBase || 0;
    } else if (this.isPerPersonTariff()) {
      const personas = this.reservationForm.get('totalPersonas')?.value || 1;
      baseCost = (this.selectedTariff.precioBase || 0) * personas * this.duration;
    } else {
      baseCost = (this.selectedTariff.precioBase || 0) * this.duration;
    }

    return this.addAdditionalConcepts(baseCost);
  }

  private calculateRecurrentTotalCost(): number {
    let baseCost = 0;
    const totalSessions = this.recurrentScheduleData?.cantidadSesiones || 0;

    if (this.isEventTariff()) {
      baseCost = (this.selectedTariff.precioBase || 0) * totalSessions;
    } else if (this.isPerPersonTariff()) {
      const personas = this.reservationForm.get('totalPersonas')?.value || 1;
      baseCost = (this.selectedTariff.precioBase || 0) * personas * this.duration * totalSessions;
    } else {
      baseCost = (this.selectedTariff.precioBase || 0) * this.duration * totalSessions;
    }

    return this.addAdditionalConcepts(baseCost);
  }

  private addAdditionalConcepts(baseAmount: number): number {
    let totalCost = baseAmount;
    this.conceptos = [];

    if (this.selectedTariff.conceptosDtos) {
      this.selectedTariff.conceptosDtos.forEach(concepto => {
        if (concepto.activo) {
          const monto = this.calculateConceptoAmount(concepto, baseAmount);
          totalCost += monto;
          this.conceptos.push({
            nombre: concepto.concepto,
            tipo: concepto.tipo,
            valor: concepto.valor,
            monto: monto
          });
        }
      });
    }

    return parseFloat(totalCost.toFixed(2));
  }

  private calculateConceptoAmount(concepto: any, baseAmount: number): number {
    switch (concepto.tipo) {
      case 'PORCENTAJE':
        return baseAmount * (concepto.valor / 100);
      case 'FIJO':
        return concepto.valor || 0;
      case 'POR_HORA':
        return (concepto.valor || 0) * this.duration;
      default:
        return 0;
    }
  }

  // Navigation between form sections
  // nextStep(): void {
  //   if (this.currentStep < this.totalSteps) {
  //     this.currentStep++;
  //     this.scrollToTop();
  //   }
  // }

  // previousStep(): void {
  //   if (this.currentStep > 1) {
  //     this.currentStep--;
  //     this.scrollToTop();
  //   }
  // }

  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  isStepValid(step: number): boolean | undefined{
    switch (step) {
      case 1:
        return this.reservationForm.get('fechaReserva')?.valid &&
               this.reservationForm.get('horaEntrada')?.valid &&
               this.reservationForm.get('horaSalida')?.valid;
      case 2:
        return this.reservationForm.get('contribuyenteDto')?.valid &&
               this.reservationForm.get('observaciones')?.valid &&
               (!this.isPerPersonTariff() || this.reservationForm.get('totalPersonas')?.valid);
      case 3:
        return this.reservationForm.get('aceptaTerminos')?.valid;
      default:
        return false;
    }
  }

  private validateFinalReservation(): boolean {
    if (this.bookingType==='recurrente') return true; 

    const fechaReserva = this.reservationForm.get('fechaReserva')?.value;
    const horaEntrada = this.reservationForm.get('horaEntrada')?.value;

    if (!fechaReserva || !horaEntrada) return false;

    const reservationDateTime = new Date(`${fechaReserva}T${horaEntrada}:00`);
    const now = new Date();
    const hoursDifference = differenceInHours(reservationDateTime, now);
    this.ANTICIPATION_HOURS = this.selectedTariff.tipoCobro === 'por_evento' ? GlobalComponent.ANTICIPATION_EVENT_HOURS : GlobalComponent.ANTICIPATION_PUNTUAL_HOURS
    if (hoursDifference < this.ANTICIPATION_HOURS) {
      this.notify(
        `Las reservas deben realizarse con ${this.ANTICIPATION_HOURS} horas de anticipación mínima.`,
        'error'
      );
      return false;
    }

    return true;
  }
    private loadBusinessHours(): void {
    if (this.bookingType==='recurrente') return;

    const fecha = this.reservationForm.get('fechaReserva')?.value;
    if (!fecha || !this.dataField?.horariosFijosDtoList) return;

    const date = new Date(fecha + 'T00:00:00');
    const dayOfWeek = format(date, 'eeee', { locale: es }).toLowerCase();
    
    this.businessHours = this.dataField.horariosFijosDtoList.find(h => {
      if (h.dia === 'lunes_viernes') {
        return ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'].includes(dayOfWeek);
      }
      if (h.dia === 'sabado') return dayOfWeek === 'sábado';
      if (h.dia === 'domingo') return dayOfWeek === 'domingo';
      return h.dia.toLowerCase() === dayOfWeek;
    });

    if (this.businessHours?.abierto) {
      this.minTime = this.businessHours.horaApertura?.slice(0, 5) || '06:00';
      this.maxTime = this.businessHours.horaCierre?.slice(0, 5) || '23:00';
    }
  }
  
  private anticipationValidator(): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      if (this.bookingType==='recurrente') return null;

      const fechaReserva = formGroup.get('fechaReserva')?.value;
      const horaEntrada = formGroup.get('horaEntrada')?.value;

      if (!fechaReserva || !horaEntrada) return null;
      
      const selectedDate = new Date(`${fechaReserva}T${horaEntrada}:00`);
      const now = new Date();
    this.ANTICIPATION_HOURS = this.selectedTariff.tipoCobro === 'por_evento' ? GlobalComponent.ANTICIPATION_EVENT_HOURS : GlobalComponent.ANTICIPATION_PUNTUAL_HOURS
      const minimumDate = addHours(now, this.ANTICIPATION_HOURS);
      
      return isBefore(selectedDate, minimumDate) ? { 
        anticipationRequired: true 
      } : null;
    };
  }

  private timeRangeValidator(): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      if (this.bookingType==='recurrente') return null;

      const horaEntrada = formGroup.get('horaEntrada')?.value;
      const horaSalida = formGroup.get('horaSalida')?.value;

      if (!horaEntrada || !horaSalida) return null;

      const [startH, startM] = horaEntrada.split(':').map(Number);
      const [endH, endM] = horaSalida.split(':').map(Number);
      
      const startTime = startH * 60 + startM;
      const endTime = endH * 60 + endM;
      
      if (startTime >= endTime) {
        return { timeRange: true };
      }
      
      if (endTime - startTime < 30) {
        return { minimumDuration: true };
      }
      
      return null;
    };
  }

  private businessHoursValidator(): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      if (this.bookingType==='recurrente') return null;

      const fechaReserva = formGroup.get('fechaReserva')?.value;
      const horaEntrada = formGroup.get('horaEntrada')?.value;
      const horaSalida = formGroup.get('horaSalida')?.value;

      if (!fechaReserva || !horaEntrada || !horaSalida || !this.businessHours) {
        return null;
      }

      if (!this.businessHours.abierto) {
        return { businessClosed: true };
      }

      const scheduleStart = this.timeToMinutes(this.businessHours.horaApertura);
      const scheduleEnd = this.timeToMinutes(this.businessHours.horaCierre);
      const requestedStart = this.timeToMinutes(horaEntrada);
      const requestedEnd = this.timeToMinutes(horaSalida);

      if (requestedStart < scheduleStart || requestedEnd > scheduleEnd) {
        return { businessHours: true };
      }

      return null;
    };
  }

  private conflictValidator(): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      if (this.bookingType==='recurrente') return null;

      const fechaReserva = formGroup.get('fechaReserva')?.value;
      const horaEntrada = formGroup.get('horaEntrada')?.value;
      const horaSalida = formGroup.get('horaSalida')?.value;

      if (!fechaReserva || !horaEntrada || !horaSalida || !this.reservationsList?.length) {
        return null;
      }

      const hasConflict = this.reservationsList.some((reserva: Reserva) => {
        if (reserva.estadoReserva === 'CANCELADA') return false;
        
        const reservationDate = new Date(reserva.fechaReserva);
        const selectedDate = new Date(fechaReserva);
        
        if (!isSameDay(reservationDate, selectedDate)) return false;
        if (reserva.reservaPuntualDto) {
          const existingStart = reserva.reservaPuntualDto.horaInicio?.slice(0, 5) || '';
          const existingEnd = reserva.reservaPuntualDto.horaFin?.slice(0, 5) || '';
          
          return this.timesOverlap(horaEntrada, horaSalida, existingStart, existingEnd);
        }
        
        return false;
      });

      return hasConflict ? { timeConflict: true } : null;
    };
  }

  
  onSubmit(): void {
    this.submitted = true;

    if (this.reservationForm.invalid) {
      this.markFormGroupTouched(this.reservationForm);
      this.showFormErrors();
      return;
    }
    if (!this.validateFinalReservation()) {
      return;
    }
    this.confirmReservation();
  }
  
private confirmReservation(): void {
  const currencyPipe = new CurrencyPipe('en-US');
  const formattedTotal = currencyPipe.transform(this.totalCost, 'BOB', 'symbol-narrow', '1.2-2');
  
  Swal.fire({
    title: 'Confirmar Reserva',
    html: `
      <div class="text-start">
        <p>¿Está seguro de que desea confirmar esta reserva?</p>
        <div class="border rounded p-3 bg-light">
          <strong>Detalles:</strong><br>
          • ${this.dataComplejo.nombre} - ${this.dataField.nombre}<br>
          • ${this.bookingType==='recurrente' ? 'Reserva Recurrente' : 'Reserva Puntual'}<br>
          • Total: ${formattedTotal}<br>
          • Contribuyente: ${this.reservationForm.get('contribuyenteNombre')?.value}
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
  const formData = this.prepareReservationData();
  this.registerReservationInRuat(formData);
}
  private prepareReservationData(): any {
    const formValue = this.reservationForm.getRawValue();
    
    const baseReserva: Reserva = {
      numeroReserva: '0001',
      campoDeportivoDto: this.dataField,
      // complejoDto: this.dataComplejo,
      contribuyenteDto: formValue.contribuyenteDto,
      montoTotal: this.totalCost,
      tarifaDto: this.selectedTariff,
      estadoReserva: 'PENDIENTE',
      estadoValidacion: 'PENDIENTE',
      tipoReserva: this.bookingType,
      // observaciones: formValue.observaciones,
      fechaCreacion: new Date(),
      fechaReserva: new Date(),
      clasificadorRuatId: this.selectedTariff.clasificadorRuatDto.uuid||''
    };

    if (this.bookingType==='recurrente' && this.recurrentScheduleData) {
      baseReserva.reservaRecurrenteDto = this.createReservaRecurrente(formValue);
      baseReserva.reservaPuntualDto = undefined;
    } else {
      baseReserva.reservaPuntualDto = this.createReservaPuntual(formValue);
      baseReserva.reservaRecurrenteDto = undefined;
      baseReserva.fechaReserva = new Date(formValue.fechaReserva + 'T00:00:00');
    }

    return baseReserva;
  }

  private createReservaPuntual(formValue: any): ReservaPuntual {
    return {
      fechaUso: new Date(formValue.fechaReserva + 'T00:00:00'),
      horaInicio: formValue.horaEntrada + ':00',
      horaFin: formValue.horaSalida + ':00',
      duracionHoras: this.duration,
      cantidadPersonas: formValue.totalPersonas,
      categoria: this.dataField.categoria,
      superficie: this.dataField.superficieDto.descripcion,
      observaciones: formValue.observaciones
    };
  }

  private createReservaRecurrente(formValue: any): ReservaRecurrente {
    return {
      tipoRecurrencia: this.recurrentScheduleData!.tipoRecurrencia,
      fechaInicio: this.recurrentScheduleData!.fechaInicio,
      fechaFin: this.recurrentScheduleData!.fechaFin,
      cantidadPersonas: formValue.totalPersonas,
      diasSemana: this.recurrentScheduleData!.diasSemana,
      cantidadSesiones: this.recurrentScheduleData!.cantidadSesiones,
      duracionSesionHoras: this.recurrentScheduleData!.duracionSesionHoras,
      tarifaMensual: this.getMonthlyCost(),
      activo: true,
      categoria: this.dataField.categoria,
      superficie: this.dataField.superficieDto.descripcion,
      observaciones: formValue.observaciones,
      tableroDto: {
        horario: this.recurrentScheduleData!.tablero
      }
    };
  }

  

  private registerReservationInRuat(formData: any): void {
    console.log("Form Data: ",formData)
    console.log(this.selectedTariff);
    const ruatData = {
      datosConcepto: [{
        numero: '1',
        codigoClasificador: this.selectedTariff.clasificadorRuatDto.codigo ,
        tipoArancel: 'DI',
        monto: this.totalCost
      }],
      observacion: this.reservationForm.value.observaciones
    };
    this.ruatService.createTasa(
      ruatData,
      formData.contribuyenteDto.codigoContribuyente, 
    ).subscribe({
      next: (response: any) => {
        if (response.status === 'OK') {
          formData.numeroTasa = response.payload.numeroTasa;
          this.saveReservation(formData);
        }else{
        this.handleError('Error al registrar en sistema', response.message);
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        this.handleError('Error al registrar en sistema RUAT', error);
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
          this.reservationCompleted.emit(response);
        }else{
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
    const successMessage = this.bookingType==='recurrente' 
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

  // Contribuyente Management
  private loadContribuyentes(): void {
    this.contribuyenteService.getAll().subscribe({
      next: (response: any) => {
        if (response.status === 'OK') {
          this.contribuyentesList = response.payload || [];
          this.filteredContribuyentes = [...this.contribuyentesList];
        }
      },
      error: (error) => {
        console.error('Error loading taxpayers:', error);
        this.contribuyentesList = [];
        this.filteredContribuyentes = [];
      }
    });
  }

  searchContribuyente(searchTerm: string): void {
    if (!searchTerm || searchTerm.length < 2) {
      this.filteredContribuyentes = [...this.contribuyentesList];
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    this.filteredContribuyentes = this.contribuyentesList.filter(contrib => 
      contrib.nombreCompleto?.toLowerCase().includes(term) ||
      contrib.numeroDocumento?.includes(term) ||
      contrib.nombre?.toLowerCase().includes(term) ||
      contrib.primerApellido?.toLowerCase().includes(term) ||
      contrib.email?.toLowerCase().includes(term)
    );
  }

  selectContribuyente(contrib: Contribuyente): void {
    this.reservationForm.patchValue({
      contribuyenteDto: contrib,
      searchContribuyente: ''
    });
    this.filteredContribuyentes = [...this.contribuyentesList];
  }

  clearContribuyenteSearch(): void {
    this.reservationForm.patchValue({
      searchContribuyente: ''
    });
    this.filteredContribuyentes = [...this.contribuyentesList];
  }

  // Helper methods (keep existing implementations)
  isEventTariff(): boolean {
    return this.selectedTariff.tipoCobro === 'por_evento';
  }

  isPerPersonTariff(): boolean {
    return this.selectedTariff.tipoCobro === 'por_persona';
  }

  isPerHourTariff(): boolean {
    return this.selectedTariff.tipoCobro === 'por_hora';
  }

  getBaseCost(): number {
    if (this.bookingType==='recurrente') {
      const totalSessions = this.recurrentScheduleData?.cantidadSesiones || 0;
      return (this.selectedTariff.precioBase || 0) * this.duration * totalSessions;
    } else {
      return (this.selectedTariff.precioBase || 0) * this.duration;
    }
  }

  getMonthlyCost(): number {
    if (this.bookingType==='puntual' || !this.recurrentScheduleData) return 0;
    
    const sessionsPerMonth = this.recurrentScheduleData.cantidadSesiones / 3;
    let monthlyCost = 0;

    if (this.isEventTariff()) {
      monthlyCost = (this.selectedTariff.precioBase || 0) * sessionsPerMonth;
    } else if (this.isPerPersonTariff()) {
      const personas = this.reservationForm.get('totalPersonas')?.value || 1;
      monthlyCost = (this.selectedTariff.precioBase || 0) * personas * this.duration * sessionsPerMonth;
    } else {
      monthlyCost = (this.selectedTariff.precioBase || 0) * this.duration * sessionsPerMonth;
    }

    return this.addAdditionalConcepts(monthlyCost);
  }

  // Validation helpers
  getFieldError(fieldName: string): string | null {
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
    if (errors['pattern']) return 'Formato inválido';
    if (errors['email']) return 'Formato de email inválido';
    if (errors['pastDate']) return 'La fecha no puede ser anterior a hoy';

    return 'Campo inválido';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.reservationForm.get(fieldName);
    return !!(field && field.invalid && (field.touched || this.submitted));
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private showFormErrors(): void {
    const firstInvalidField = this.findFirstInvalidField();
    if (firstInvalidField) {
      this.notify(firstInvalidField, 'error');
    }
  }

  private findFirstInvalidField(): string {
    const fields = [
      { name: 'fechaReserva', message: this.getFieldError('fechaReserva') },
      { name: 'horaEntrada', message: this.getFieldError('horaEntrada') },
      { name: 'horaSalida', message: this.getFieldError('horaSalida') },
      { name: 'contribuyenteDto', message: this.getFieldError('contribuyenteDto') },
      { name: 'observaciones', message: this.getFieldError('observaciones') },
      { name: 'totalPersonas', message: this.getFieldError('totalPersonas') },
      { name: 'aceptaTerminos', message: this.getFieldError('aceptaTerminos') }
    ];

    const invalidField = fields.find(field => field.message);
    return invalidField?.message || 'Por favor, complete todos los campos requeridos correctamente.';
  }


  // ... (keep existing timeToMinutes, formatDuration, and other helper methods)


  private timeToMinutes(time: string): number {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  formatDuration(hours: number): string {
    const totalMinutes = hours * 60;
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    
    if (hrs === 0) return `${mins} min`;
    if (mins === 0) return `${hrs} ${hrs === 1 ? 'hora' : 'horas'}`;
    
    return `${hrs}h ${mins}m`;
  }

  private formatDateForInput(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  private timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const s1 = this.timeToMinutes(start1);
    const e1 = this.timeToMinutes(end1);
    const s2 = this.timeToMinutes(start2);
    const e2 = this.timeToMinutes(end2);
    
    return s1 < e2 && s2 < e1;
  }

  private validateReservationTiming(): void {
    if (this.bookingType==='recurrente') return;

    const fechaReserva = this.reservationForm.get('fechaReserva')?.value;
    const horaEntrada = this.reservationForm.get('horaEntrada')?.value;
    
    if (!fechaReserva || !horaEntrada) return;
    
    const reservationDateTime = new Date(`${fechaReserva}T${horaEntrada}:00`);
    const now = new Date();
    const hoursDifference = differenceInHours(reservationDateTime, now);
    
    this.ANTICIPATION_HOURS = this.selectedTariff.tipoCobro === 'por_evento' ? GlobalComponent.ANTICIPATION_EVENT_HOURS : GlobalComponent.ANTICIPATION_PUNTUAL_HOURS
    if (hoursDifference < this.ANTICIPATION_HOURS) {
      this.notify(
        `Recuerde: Las reservas requieren ${this.ANTICIPATION_HOURS} horas de anticipación`,
        'warning'
      );
    }
  }


  private notify(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    Swal.fire({
      title: type === 'error' ? 'Error' : 'Información',
      text: message,
      icon: type,
      confirmButtonText: 'Entendido',
      confirmButtonColor: type === 'error' ? '#dc3545' : '#198754'
    });
  }

  back(): void {
    this.goBack.emit();
  }

  getFormError(): string | null {
    const errors = this.reservationForm.errors;
    
    if (!errors || (!this.reservationForm.touched && !this.submitted)) {
      return null;
    }

    if (errors['timeRange']) return 'La hora de salida debe ser posterior a la hora de entrada';
    if (errors['minimumDuration']) return 'La reserva mínima es de 30 minutos';
    if (errors['businessClosed']) return 'El campo está cerrado este día';
    if (errors['businessHours']) return `Horario debe estar entre ${this.minTime} y ${this.maxTime}`;
    if (errors['timeConflict']) return 'Este horario ya está reservado';
    if (errors['anticipationRequired']) return `Reserva requiere ${this.ANTICIPATION_HOURS} horas de anticipación`;

    return 'Existen errores en el formulario';
  }

  get scheduleConflictError(): boolean {
    return this.reservationForm.hasError('timeConflict');
  }
  get invalidRangeError(): boolean {
    return this.reservationForm.hasError('timeRange');
  }
  get businessClosedError(): boolean {
    return this.reservationForm.hasError('businessClosed');
  }
  get outOfRangeError(): boolean {
    return this.reservationForm.hasError('businessHours');
  }
  get minimumDurationError(): boolean {
    return this.reservationForm.hasError('minimumDuration');
  }
  get anticipationError(): boolean {
    return this.reservationForm.hasError('anticipationRequired');
  }

  // Contribuyente management methods (keep from original)
  toggleContribuyenteSearch(): void {
    this.showContribuyenteSearch = !this.showContribuyenteSearch;
    if (this.showContribuyenteSearch && this.contribuyentesList.length === 0) {
      this.getTaxpayers();
    }
  }

  private getTaxpayers(): void {
    this.contribuyenteService.getAll().subscribe({
      next: (response: any) => {
        if (response.status === 'OK') {
          this.contribuyentesList = response.payload || [];
        }
      },
      error: (error) => {
        console.error('Error loading taxpayers:', error);
        this.contribuyentesList = [];
      }
    });
  }

  getTarifaCategories(): string {
    if (!this.selectedTariff?.categoriasDtoList) return 'Sin categoría';
    return this.selectedTariff.categoriasDtoList
      .map((tc: any) => tc.categoriaDto?.nombre)
      .filter(Boolean)
      .join(', ');
  }

  get pastDateError(): boolean {
    return !!this.reservationForm.get('fechaReserva')?.errors?.['pastDate'];
  }

  setActiveSection(section: string): void {
    this.activeSection = section;
  }
  
}