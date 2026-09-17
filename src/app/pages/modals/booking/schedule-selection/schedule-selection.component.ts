import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Tarifa } from 'src/app/core/models/tarifa.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { HorarioFijo } from 'src/app/core/models/horarioFijo.model';
import { HorarioExcepcion } from 'src/app/core/models/horarioExcepcion.model';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { ConflictResult, ReservationConflictService, TimeRange } from '../reservation-conflict.service';
import { ScheduleStateService } from '../schedule-state.service';
import { Subject, takeUntil } from 'rxjs';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';
import { Reserva } from 'src/app/core/models/reserva.model';
import { obtenerLabelTipoCobro } from 'src/app/core/constants/TipoCobro';
import {
  obtenerValidacionPagoConUnidad,
  obtenerValorConfiguracionConUnidad
} from 'src/app/core/utils/configuracion-sistema.util';

interface TimeSlot {
  time: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isReserved: boolean;
  isPast: boolean;
  isSelected?: boolean;
  isPartialSelection?: boolean; 
  partialStart?: number;
  partialEnd?: number;
  partialStartTime?: string;
  partialEndTime?: string;
  reservation?: Reserva;
  conflictReason?: string;
  blockType: 'morning' | 'afternoon' | 'night' | 'operating';
  isWithinTariffTime: boolean;
  applicableTariff?: Tarifa;
  tariffConflict?: boolean;
  isPartiallyReserved?: boolean;
  reservedStart?: number;
  reservedEnd?: number;
  reservedStartTime?: string;
  reservedEndTime?: string;
  availableStart?: number;
  availableEnd?: number;
  availableStartTime?: string;
  availableEndTime?: string;
}

interface DaySlots {
  morningSlots: TimeSlot[];
  afternoonSlots: TimeSlot[];
  nightSlots: TimeSlot[];
  operatingSlots: TimeSlot[];
  daySchedule?: HorarioFijo;
  exceptions?: HorarioExcepcion[]; 
}

interface WeekDay {
  name: string;
  dayName: string;
  date: Date;
  isToday: boolean;
  isPast: boolean;
}

interface TimeInput {
  hours: number;
  minutes: number;
}

interface BlockDefinition {
  start: string;
  end: string;
  label: string;
  icon: string;
  color: string;
}

interface OperatingPeriod {
  start: string;
  end: string;
}

@Component({
  selector: 'app-schedule-selection',
  standalone: true,
  imports: [CommonModule, NgbNavModule, FormsModule],
  templateUrl: './schedule-selection.component.html',
  styleUrls: ['./schedule-selection.component.scss']
})
export class ScheduleSelectionComponent implements OnInit, OnChanges, OnDestroy {
  readonly ClaveConfiguracion = ClaveConfiguracion;

  @Input() dataField!: CampoDeportivo;
  @Input() dataTariff!: Tarifa;
  @Input() reservationsList: Reserva[] = []; 
  @Input() systemConfigs: { [key: string]: ConfiguracionSistema } = {};
  @Input() userRole: 'Contribuyente' | 'Representante' | 'Encargado' | 'Admin' = 'Contribuyente';
  @Output() horarioSelected = new EventEmitter<{
    date: Date;
    start: string;
    end: string;
    cantidadPersonas?: number;
    calculatedPrice: number;
    priceDetails: string[];
  }>();
  currentWeekStart: Date = new Date();
  currentWeekEnd: Date = new Date();
  blocks: { [key: string]: BlockDefinition } = {};
  startTimeInput: TimeInput = { hours: 0, minutes: 0 };
  endTimeInput: TimeInput = { hours: 0, minutes: 0 };
  applicableTariffs: Tarifa[] = [];
  hasMultipleApplicableTariffs = false;
  tariffBoundaryTime: string | null = null;
  cantidadPersonas?: number | null = null;

  get anticipationHours(): number | undefined{
    if (this.isInternalUser) {
      return undefined;
    }
    if (!this.dataTariff) {
      return this.getActiveNumericConfig(ClaveConfiguracion.HORAS_ANTICIPACION_RESERVAS_PUNTUALES);
    }
    switch (this.dataTariff.tipoCobro) {
      case 'por_evento':
        const diasEventos = this.getActiveNumericConfig(ClaveConfiguracion.DIAS_ANTICIPACION_EVENTOS);
        return diasEventos? diasEventos* 24:undefined;
      case 'mensualidad': case 'por_sesion': case 'por_club':
        return this.getActiveNumericConfig(ClaveConfiguracion.HORAS_ANTICIPACION_RECURRENTES);
      default:
        return this.getActiveNumericConfig(ClaveConfiguracion.HORAS_ANTICIPACION_RESERVAS_PUNTUALES);
    }
  } 
  get anticipationTimeDisplay(): string {
    if (this.isInternalUser) {
      return '';
    }
    switch (this.dataTariff.tipoCobro) {
      case 'por_evento':
        return this.getConfigValueDisplay(ClaveConfiguracion.DIAS_ANTICIPACION_EVENTOS) ?? '';
      case 'mensualidad': case 'por_sesion': case 'por_club':
        return this.getConfigValueDisplay(ClaveConfiguracion.HORAS_ANTICIPACION_RECURRENTES) ?? '';
      default:
        return this.getConfigValueDisplay(ClaveConfiguracion.HORAS_ANTICIPACION_RESERVAS_PUNTUALES) ?? '';
    }
  }  

  get paymentValidationDisplay(): string | undefined {
    return obtenerValidacionPagoConUnidad(
      this.systemConfigs,
      'puntual',
      this.dataTariff?.tipoCobro
    );
  }

  private getConfigValueDisplay(clave: ClaveConfiguracion): string | undefined {
    return obtenerValorConfiguracionConUnidad(this.systemConfigs, clave);
  }

  private get isInternalUser(): boolean {
    return this.userRole === 'Admin' || this.userRole === 'Encargado';
  }

  private getActiveNumericConfig(clave: ClaveConfiguracion): number | undefined {
    const config = this.systemConfigs[clave];
    const value = Number(config?.valorNumerico);
    return config?.activo === true && Number.isFinite(value) && value > 0
      ? value
      : undefined;
  }

  get maxDuration(): number | undefined {
    if (this.dataTariff?.tipoCobro === 'por_evento') {
      return this.getActiveNumericConfig(ClaveConfiguracion.DURACION_MAXIMA_EVENTOS);
    }

    return this.getActiveNumericConfig(ClaveConfiguracion.DURACION_MAXIMA_PUNTUALES);
  }
  get minDuration(): number | undefined {
    return this.getActiveNumericConfig(ClaveConfiguracion.DURACION_MINIMA_RESERVA);
  }
  get maxDurationDisplay(): string | undefined {
    const hours = this.maxDuration;
    if (hours === undefined) {
      return undefined;
    }
    if (hours === 1) {
      return '1 hora';
    } else {
      return `${hours} horas`;
    }
  }
  get minDurationDisplay(): string | undefined {
    const hours = this.minDuration;
    if (hours === undefined) {
      return undefined;
    }
    if (hours === 1) {
      return '1 hora';
    } else {
      return `${hours} horas`;
    }
  }

  get requiresCantidadPersonas(): boolean {
    return this.dataTariff?.tipoCobro === 'por_persona';
  }

  get isEventTariff(): boolean {
    return this.dataTariff?.tipoCobro === 'por_evento';
  }

  weekDays: WeekDay[] = [];
  activeDayName: string = '';
  fechaReserva: Date = new Date();
  selectedSlots: TimeSlot[] = [];
  private timeSlotsCache: Map<string, DaySlots> = new Map();
  validationErrors: string[] = [];
  showValidationAlert: boolean = false;
  isCheckingAvailability: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private authenticationService: AuthenticationService,
    private cdr: ChangeDetectorRef,
    private conflictService: ReservationConflictService,
    private scheduleState: ScheduleStateService
  ) {}

  ngOnInit(): void {
    this.scheduleState.currentWeekStart$
      .pipe(takeUntil(this.destroy$))
      .subscribe(start => {
        this.currentWeekStart = start;
        this.cdr.detectChanges();
      });      
    this.scheduleState.currentWeekEnd$
      .pipe(takeUntil(this.destroy$))
      .subscribe(end => {
        this.currentWeekEnd = end;
        this.cdr.detectChanges();
      }); 
    this.initializeBlocks();     
    this.initializeWeek();
    this.generateWeekDays();
    this.calculateTariff();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataField'] && this.dataField) {
      this.initializeBlocks();
    }    
    if (changes['dataField'] && !changes['dataField'].firstChange) {
      this.timeSlotsCache.clear();
      this.clearSelectedSlots();
      this.generateWeekDays();
      this.checkMultipleTariffs();
      this.cdr.markForCheck();
    }    
    if (changes['dataTariff'] && !changes['dataTariff'].firstChange) {
      this.timeSlotsCache.clear();
      this.clearSelectedSlots();
      this.generateWeekDays();
      this.checkMultipleTariffs();
      this.cdr.markForCheck();
    }
    if (changes['reservationsList'] && !changes['reservationsList'].firstChange) {
      this.timeSlotsCache.clear();
      this.generateWeekDays();
      this.revalidateSelection();
      this.cdr.markForCheck();
    }
    if (changes['systemConfigs'] && !changes['systemConfigs'].firstChange) {
      this.timeSlotsCache.clear();
      this.generateWeekDays();
      this.cdr.markForCheck();
    }
  }
  private initializeBlocks(): void {
    if (!this.dataField) return;
    const allSchedules = this.dataField.horariosFijosDtoList || [];
    let earliestStart = '23:59:59';
    let latestEnd = '00:00:00';
    allSchedules.forEach(schedule => {
      if (schedule.abierto && schedule.horaApertura && schedule.horaCierre) {
        const scheduleStart = schedule.horaApertura;
        const scheduleEnd = schedule.horaCierre;        
        if (this.timeToMinutes(scheduleStart) < this.timeToMinutes(earliestStart)) {
          earliestStart = scheduleStart;
        }
        if (this.timeToMinutes(scheduleEnd) > this.timeToMinutes(latestEnd)) {
          latestEnd = scheduleEnd;
        }
      }
    });
    let fieldStart = earliestStart;
    let fieldEnd = latestEnd;
    if (this.dataTariff?.desde) {
      const tariffStart = this.timeToMinutes(this.dataTariff.desde);
      const fieldStartMinutes = this.timeToMinutes(fieldStart);
      if (tariffStart > fieldStartMinutes) {
        fieldStart = this.dataTariff.desde;
      }
    }
    if (this.dataTariff?.hasta) {
      const tariffEnd = this.timeToMinutes(this.dataTariff.hasta);
      const fieldEndMinutes = this.timeToMinutes(fieldEnd);
      if (tariffEnd < fieldEndMinutes) {
        fieldEnd = this.dataTariff.hasta;
      }
    }
    const operatingPeriods = this.getOperatingPeriodsForDay(new Date());
    if (operatingPeriods.length === 1) {
      this.createDynamicBlocks(fieldStart, fieldEnd);
    } else {
      this.createDiscontinuousBlocks(operatingPeriods);
    }
  }
  private createDynamicBlocks(startTime: string, endTime: string): void {
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    const morningEnd = this.timeToMinutes('12:00:00');
    const afternoonEnd = this.timeToMinutes('18:00:00');
    this.blocks = {};
    if (startMinutes < morningEnd) {
      const morningEndTime = Math.min(morningEnd, endMinutes);
      if (morningEndTime > startMinutes) {
        this.blocks['morning'] = { 
          start: startTime, 
          end: this.minutesToTime(morningEndTime), 
          label: 'Mañana',
          icon: 'ri-sun-line',
          color: 'text-warning'
        };
      }
    }
    if (endMinutes > morningEnd && startMinutes < afternoonEnd) {
      const afternoonStart = Math.max(startMinutes, morningEnd);
      const afternoonEndTime = Math.min(afternoonEnd, endMinutes);
      if (afternoonEndTime > afternoonStart) {
        this.blocks['afternoon'] = { 
          start: this.minutesToTime(afternoonStart), 
          end: this.minutesToTime(afternoonEndTime), 
          label: 'Tarde',
          icon: 'ri-sun-cloudy-line',
          color: 'text-orange'
        };
      }
    }
    if (endMinutes > afternoonEnd && startMinutes < endMinutes) {
      const nightStart = Math.max(startMinutes, afternoonEnd);
      if (endMinutes > nightStart) {
        this.blocks['night'] = { 
          start: this.minutesToTime(nightStart), 
          end: endTime, 
          label: 'Noche',
          icon: 'ri-moon-line',
          color: 'text-info'
        };
      }
    }
    if (Object.keys(this.blocks).length === 0) {
      this.blocks['operating'] = { 
        start: startTime, 
        end: endTime, 
        label: 'Horario Completo',
        icon: 'ri-time-line',
        color: 'text-primary'
      };
    }
  }
  private createDiscontinuousBlocks(periods: OperatingPeriod[]): void {
    this.blocks = {};    
    periods.forEach((period, index) => {
      const startHour = parseInt(period.start.split(':')[0]);
      const endHour = parseInt(period.end.split(':')[0]);
      let blockKey: string;
      let label: string;
      let icon: string;
      let color: string;      
      if (periods.length === 1) {
        blockKey = 'operating';
        label = 'Horario';
        icon = 'ri-time-line';
        color = 'text-primary';
      } else {
        if (startHour < 12) {
          blockKey = 'morning';
          label = 'Mañana';
          icon = 'ri-sun-line';
          color = 'text-warning';
        } else if (startHour < 18) {
          blockKey = 'afternoon';
          label = 'Tarde';
          icon = 'ri-sun-cloudy-line';
          color = 'text-orange';
        } else {
          blockKey = 'night';
          label = 'Noche';
          icon = 'ri-moon-line';
          color = 'text-info';
        }
        if (this.blocks[blockKey]) {
          blockKey = `${blockKey}_${index + 1}`;
          label = `${label} ${index + 1}`;
        }
      }
      
      this.blocks[blockKey] = {
        start: period.start,
        end: period.end,
        label: label,
        icon: icon,
        color: color
      };
    });
  }

  private autoAdjustEndTime(): void {
    const startMinutes = this.startTimeInput.hours * 60 + this.startTimeInput.minutes;
    const endMinutes = this.endTimeInput.hours * 60 + this.endTimeInput.minutes;
    const minDurationMinutes = (this.minDuration ?? 1) * 60;
    if (endMinutes <= startMinutes) {
      const newEndMinutes = startMinutes + minDurationMinutes;
      this.endTimeInput = {
        hours: Math.floor(newEndMinutes / 60) % 24,
        minutes: newEndMinutes % 60
      };
      this.updateSlotsFromTimeInputs();
    }
  }


  async confirmTimeSelection(): Promise<void> {
    if (!this.validateTimeSelection()) {
      this.showValidationAlert = true;
      return;
    }
    const startTime = this.timeInputToString(this.startTimeInput);
    const endTime = this.timeInputToString(this.endTimeInput);
    const timeRange: TimeRange = {
      date: this.fechaReserva,
      startTime: startTime,
      endTime: endTime
    };
    const validation = this.conflictService.validateReservation(
      this.dataField.uuid!,
      timeRange,
      this.reservationsList,
      this.anticipationHours
    );
    if (!validation.isValid) {
      this.validationErrors = validation.errors;
      this.showValidationAlert = true;
      return;
    }
    this.horarioSelected.emit({ 
      date: this.fechaReserva, 
      start: startTime, 
      end: endTime,
      cantidadPersonas: this.cantidadPersonas || undefined,
      calculatedPrice: this.calculatedTariff,
      priceDetails: [...this.tariffDetails]
    });
  }
  isFormValid(): boolean {
    if (this.startTimeInput.hours === 0 && this.startTimeInput.minutes === 0 &&
        this.endTimeInput.hours === 0 && this.endTimeInput.minutes === 0) {
      return false;
    }
    if (this.startTimeInput.hours === this.endTimeInput.hours && 
        this.startTimeInput.minutes === this.endTimeInput.minutes) {
      return false;
    }
    const originalErrors = [...this.validationErrors];
    const originalShowAlert = this.showValidationAlert;
    const isValid = this.validateTimeSelection();
    this.validationErrors = originalErrors;
    this.showValidationAlert = originalShowAlert;
    return isValid;
  }

  getCurrentValidationErrors(): string[] {
    if (this.startTimeInput.hours === 0 && this.startTimeInput.minutes === 0 &&
        this.endTimeInput.hours === 0 && this.endTimeInput.minutes === 0) {
      return [];
    }

    const originalErrors = [...this.validationErrors];
    const originalShowAlert = this.showValidationAlert;
    const isValid = this.validateTimeSelection();
    const currentErrors = isValid ? [] : [...this.validationErrors];
    this.validationErrors = originalErrors;
    this.showValidationAlert = originalShowAlert;

    return currentErrors;
  }

  getConfirmDisabledReason(): string | null {
    if (this.isCheckingAvailability) {
      return 'Verificando disponibilidad...';
    }

    const currentErrors = this.getCurrentValidationErrors();
    return currentErrors.length ? currentErrors[0] : null;
  }

  validateTimeSelection(): boolean {
    this.validationErrors = [];    
    const startMinutes = this.startTimeInput.hours * 60 + this.startTimeInput.minutes;
    const endMinutes = this.endTimeInput.hours * 60 + this.endTimeInput.minutes;    
    if (!this.isDayOpen()) {
      this.validationErrors.push('El campo está cerrado para este día. No se pueden seleccionar horarios.');
      return false;
    }      
    if (startMinutes >= endMinutes) {
      this.validationErrors.push('La hora de inicio debe ser anterior a la hora de fin');
      return false;
    }     
    const duration = endMinutes - startMinutes;
    if (this.minDuration !== undefined && duration < this.minDuration * 60) {
      this.validationErrors.push(`La duración mínima es de ${this.minDurationDisplay}`);
      return false;
    } 
    if (this.maxDuration !== undefined && duration > this.maxDuration * 60) {
      const maxMessage = this.isEventTariff
        ? `Los eventos pueden durar como máximo ${this.maxDurationDisplay}. Ajuste la hora de fin para continuar.`
        : `La duración máxima es de ${this.maxDurationDisplay}`;
      this.validationErrors.push(maxMessage);
      return false;
    }
    if (!this.validateCantidadPersonas()) {
      return false;
    }
    const startTime = this.timeInputToString(this.startTimeInput);
    const endTime = this.timeInputToString(this.endTimeInput);
    if (!this.isTimeWithinAnyOperatingPeriod(startTime, endTime)) {
      const operatingHours = this.getOperatingHoursDisplay();
      this.validationErrors.push(
        `El horario seleccionado debe estar dentro del horario de atención: ${operatingHours}`
      );
      return false;
    }
    if (!this.isTimeWithinTariff(startTime, endTime)) {
      this.validationErrors.push(
        `El horario seleccionado está fuera del rango de la tarifa "${this.dataTariff.descripcion}". ` +
        `Rango permitido: ${this.dataTariff.desde?.slice(0, 5)} - ${this.dataTariff.hasta?.slice(0, 5)}`
      );
      return false;
    }      
    if (this.tariffBoundaryTime) {
      const boundaryMinutes = this.timeToMinutes(this.tariffBoundaryTime);
      if (startMinutes < boundaryMinutes && endMinutes > boundaryMinutes) {
        this.validationErrors.push(
          `El horario seleccionado cruza el límite entre tarifas (${this.tariffBoundaryTime.slice(0, 5)}). ` +
          `Seleccione un horario que esté completamente dentro del rango de una sola tarifa.`
        );
        return false;
      }
    }
    const now = new Date();
    const selectedDateTime = this.combineDateAndTime(this.fechaReserva, startTime);
    let minReservationTime = new Date(now.getTime());    
    if (this.anticipationHours) {
      minReservationTime = new Date(now.getTime() + this.anticipationHours * 60 * 60 * 1000);
    }    
    if (selectedDateTime < minReservationTime) {
      const timeDiff = minReservationTime.getTime() - now.getTime();
      const hoursDiff = Math.ceil(timeDiff / (1000 * 60 * 60));
      if (this.dataTariff.tipoCobro === 'por_evento') {
        this.validationErrors.push(
          `Las reservas de eventos deben realizarse con al menos ${this.anticipationTimeDisplay} de anticipación`
        );
      } else {
        this.validationErrors.push(
          `Las reservas deben realizarse con al menos ${this.anticipationTimeDisplay} de anticipación`
        );
      }
      return false;
    }
    const timeRange: TimeRange = {
      date: this.fechaReserva,
      startTime: startTime,
      endTime: endTime
    };
    const conflictResult = this.conflictService.checkConflict(
      this.dataField.uuid!,
      timeRange,
      this.reservationsList
    );
    if (conflictResult.hasConflict) {
      this.validationErrors.push(conflictResult.reason || 'El horario seleccionado tiene conflictos con reservas existentes');
      return false;
    }    
    return true;
  }
  private isTimeWithinAnyOperatingPeriod(startTime: string, endTime: string): boolean {
    const operatingPeriods = this.getOperatingPeriodsForDay(this.fechaReserva);
    if (operatingPeriods.length === 0) return false;
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    return operatingPeriods.some(period => {
      const periodStart = this.timeToMinutes(period.start);
      const periodEnd = this.timeToMinutes(period.end);
      return startMinutes >= periodStart && endMinutes <= periodEnd;
    });
  }
  private revalidateSelection(): void {
    if (this.selectedSlots.length === 0) return;
    const currentDaySlots = this.getTimeSlotsForDay(this.fechaReserva);
    const allSlots = [
      ...currentDaySlots.morningSlots,
      ...currentDaySlots.afternoonSlots,
      ...currentDaySlots.nightSlots
    ];
    const invalidSlots: TimeSlot[] = [];
    this.selectedSlots.forEach(selectedSlot => {
      const currentSlot = allSlots.find(s => 
        s.startTime === selectedSlot.startTime && s.endTime === selectedSlot.endTime
      );
      if (!currentSlot || !currentSlot.isAvailable || currentSlot.isReserved) {
        invalidSlots.push(selectedSlot);
      }
    });
    if (invalidSlots.length > 0) {
      this.clearSelectedSlots();
      this.validationErrors.push('Algunos horarios seleccionados ya no están disponibles');
      this.showValidationAlert = true;
    }
  }

  getDurationTime(): number {
    const startMinutes = this.startTimeInput.hours * 60 + this.startTimeInput.minutes;
    const endMinutes = this.endTimeInput.hours * 60 + this.endTimeInput.minutes;
    return endMinutes - startMinutes;
  }
  getDurationDisplay(): string {
    const startMinutes = this.startTimeInput.hours * 60 + this.startTimeInput.minutes;
    const endMinutes = this.endTimeInput.hours * 60 + this.endTimeInput.minutes;
    const durationMinutes = endMinutes - startMinutes;
    if (durationMinutes <= 0) return '0 min';
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    if (hours === 0) {
      return `${minutes} min`;
    } else if (minutes === 0) {
      return `${hours} h`;
    } else {
      return `${hours} h ${minutes} min`;
    }
  }
  canSelectSlot(slot: TimeSlot): boolean {
    if (slot.isPast) return false;
    if (!slot.isWithinTariffTime || slot.tariffConflict) return false;
    if (slot.isReserved && !slot.isPartiallyReserved) return false;
    if (slot.isPartiallyReserved) {
      return !!slot.availableStartTime && !!slot.availableEndTime;
    }
    return slot.isAvailable;
  }
  
  toggleSlotSelection(slot: TimeSlot): void {
    if (!this.canSelectSlot(slot)) {
      this.validationErrors = [
        slot.conflictReason || 'Este horario ya está reservado o no está disponible.'
      ];
      this.showValidationAlert = true;
      return;
    }
    if (
      !slot.isAvailable ||
      (slot.isReserved && !slot.isPartiallyReserved) ||
      !slot.isWithinTariffTime ||
      slot.tariffConflict
    ) {
      if (slot.conflictReason) {
        this.validationErrors = [slot.conflictReason];
        this.showValidationAlert = true;
      } else if (slot.tariffConflict && slot.applicableTariff) {
        this.validationErrors = [
          `Este horario corresponde a la tarifa "${slot.applicableTariff.descripcion}". ` +
          `Seleccione solo horarios dentro del rango de la tarifa "${this.dataTariff.descripcion}" ` +
          `(${this.dataTariff.desde?.slice(0, 5)} - ${this.dataTariff.hasta?.slice(0, 5)})`
        ];
        this.showValidationAlert = true;
      } else if (!slot.isWithinTariffTime) {
        this.validationErrors = [
          `Este horario está fuera del rango de la tarifa seleccionada. ` +
          `Tarifa "${this.dataTariff.descripcion}": ${this.dataTariff.desde?.slice(0, 5)} - ${this.dataTariff.hasta?.slice(0, 5)}`
        ];
        this.showValidationAlert = true;
      } else if (slot.isPast) {
        this.validationErrors = ['No se pueden seleccionar horarios en el pasado'];
        this.showValidationAlert = true;
      }
      this.updateTimeInputsFromSlots();
      this.calculateTariff();
      return;
    }
    this.validationErrors = [];
    this.showValidationAlert = false;  
    const index = this.selectedSlots.findIndex(s => 
      s.startTime === slot.startTime && s.endTime === slot.endTime
    );  
    if (index > -1) {
      this.deselectSlotAndDependents(slot);
    } else {
      const tempSelected = [...this.selectedSlots, slot];
      const daySlots = this.getTimeSlotsForDay(this.fechaReserva);
      const allSlots = [
        ...daySlots.morningSlots,
        ...daySlots.afternoonSlots,
        ...daySlots.nightSlots
      ].sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));
      let minTime = Math.min(
        ...tempSelected.map(s => this.timeToMinutes(s.startTime)),
        ...(slot.isPartiallyReserved && slot.availableStartTime ? 
            [this.timeToMinutes(slot.availableStartTime + ':00')] : [])
      );    
      let maxTime = Math.max(
        ...tempSelected.map(s => this.timeToMinutes(s.endTime)),
        ...(slot.isPartiallyReserved && slot.availableEndTime ? 
            [this.timeToMinutes(slot.availableEndTime + ':00')] : [])
      );
      let hasGap = false;
      for (const s of allSlots) {
        const slotStart = this.timeToMinutes(s.startTime);
        const slotEnd = this.timeToMinutes(s.endTime);
        if (slotStart >= minTime && slotEnd <= maxTime) {
          let isSlotAvailable = false;        
          if (s.isPartiallyReserved && s.availableStartTime && s.availableEndTime) {
            const availStart = this.timeToMinutes(s.availableStartTime + ':00');
            const availEnd = this.timeToMinutes(s.availableEndTime + ':00');
            if (availStart < maxTime && availEnd > minTime) {
              isSlotAvailable = true;
            }
          } else {
            isSlotAvailable = s.isAvailable && !s.isReserved;
          }        
          if (!isSlotAvailable) {
            hasGap = true;
            break;
          }
        }
      }    
      if (hasGap) {
        this.validationErrors = ['Solo se pueden seleccionar horarios consecutivos. Hay reservas en medio del rango seleccionado.'];
        this.showValidationAlert = true;
        return;
      } 
      this.selectSlotWithConsecutive(slot);
    }
    this.selectedSlots.sort((a, b) => 
      this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
    );
    if (!this.areSlotsConsecutive(this.selectedSlots)) {
      this.validationErrors = ['Los horarios seleccionados no son consecutivos'];
      this.showValidationAlert = true;
      this.clearSelectedSlots();
      return;
    }
    this.updateTimeInputsFromSlots();
    this.calculateTariff();
  }
  private areSlotsConsecutive(slots: TimeSlot[]): boolean {
    if (slots.length <= 1) return true;
    const sortedSlots = [...slots].sort((a, b) => 
      this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
    );
    for (let i = 0; i < sortedSlots.length - 1; i++) {
      const currentSlot = sortedSlots[i];
      const nextSlot = sortedSlots[i + 1];
      let currentEnd: number;
      if (currentSlot.isPartialSelection && currentSlot.partialEndTime) {
        currentEnd = this.timeToMinutes(currentSlot.partialEndTime + ':00');
      } else if (currentSlot.isPartiallyReserved && currentSlot.availableEndTime) {
        currentEnd = this.timeToMinutes(currentSlot.availableEndTime + ':00');
      } else {
        currentEnd = this.timeToMinutes(currentSlot.endTime);
      }
      let nextStart: number;
      if (nextSlot.isPartialSelection && nextSlot.partialStartTime) {
        nextStart = this.timeToMinutes(nextSlot.partialStartTime + ':00');
      } else if (nextSlot.isPartiallyReserved && nextSlot.availableStartTime) {
        nextStart = this.timeToMinutes(nextSlot.availableStartTime + ':00');
      } else {
        nextStart = this.timeToMinutes(nextSlot.startTime);
      }
      if (currentEnd !== nextStart) {
        return false;
      }
    }  
    return true;
  }
  private updateTimeInputsFromSlots(): void {
    if (this.selectedSlots.length === 0) {
      return;
    }
    let earliestStartMinutes = Infinity;
    let latestEndMinutes = 0;
    this.selectedSlots.forEach(slot => {
      if (slot.isPartialSelection && slot.partialStartTime && slot.partialEndTime) {
        const startMinutes = this.timeToMinutes(slot.partialStartTime + ':00');
        const endMinutes = this.timeToMinutes(slot.partialEndTime + ':00');      
        earliestStartMinutes = Math.min(earliestStartMinutes, startMinutes);
        latestEndMinutes = Math.max(latestEndMinutes, endMinutes);
      } 
      else if (slot.isPartiallyReserved && slot.availableStartTime && slot.availableEndTime) {
        const startMinutes = this.timeToMinutes(slot.availableStartTime + ':00');
        const endMinutes = this.timeToMinutes(slot.availableEndTime + ':00');      
        earliestStartMinutes = Math.min(earliestStartMinutes, startMinutes);
        latestEndMinutes = Math.max(latestEndMinutes, endMinutes);
      }
      else {
        const startMinutes = this.timeToMinutes(slot.startTime);
        const endMinutes = this.timeToMinutes(slot.endTime);      
        earliestStartMinutes = Math.min(earliestStartMinutes, startMinutes);
        latestEndMinutes = Math.max(latestEndMinutes, endMinutes);
      }
    });
    if (earliestStartMinutes !== Infinity && latestEndMinutes > 0) {
      const startHours = Math.floor(earliestStartMinutes / 60);
      const startMins = earliestStartMinutes % 60;
      const endHours = Math.floor(latestEndMinutes / 60);
      const endMins = latestEndMinutes % 60;
      this.startTimeInput = { hours: startHours, minutes: startMins };
      this.endTimeInput = { hours: endHours, minutes: endMins };
      this.cdr.detectChanges();
    }
  }
  private deselectSlotAndDependents(deselectedSlot: TimeSlot): void {
    if (this.selectedSlots.length === 1) {
      this.clearSelectedSlots();
      this.startTimeInput = { hours: 0, minutes: 0 };
      this.endTimeInput = { hours: 0, minutes: 0 };
      return;
    }
    let newMinTime = Infinity;
    let newMaxTime = 0;
    let foundOthers = false;  
    this.selectedSlots.forEach(slot => {
      if (slot.startTime === deselectedSlot.startTime && slot.endTime === deselectedSlot.endTime) {
        return;
      }    
      foundOthers = true;
      if (slot.isPartialSelection && slot.partialStartTime && slot.partialEndTime) {
        const start = this.timeToMinutes(slot.partialStartTime + ':00');
        const end = this.timeToMinutes(slot.partialEndTime + ':00');
        newMinTime = Math.min(newMinTime, start);
        newMaxTime = Math.max(newMaxTime, end);
      } else {
        const start = this.timeToMinutes(slot.startTime);
        const end = this.timeToMinutes(slot.endTime);
        newMinTime = Math.min(newMinTime, start);
        newMaxTime = Math.max(newMaxTime, end);
      }
    });  
    if (!foundOthers) {
      this.clearSelectedSlots();
      this.startTimeInput = { hours: 0, minutes: 0 };
      this.endTimeInput = { hours: 0, minutes: 0 };
      return;
    }
    this.startTimeInput = { 
      hours: Math.floor(newMinTime / 60), 
      minutes: newMinTime % 60 
    };
    this.endTimeInput = { 
      hours: Math.floor(newMaxTime / 60), 
      minutes: newMaxTime % 60 
    };
    this.updateSlotsFromTimeInputs();
  }
  private selectSlotWithConsecutive(newSlot: TimeSlot): void {
    const daySlots = this.getTimeSlotsForDay(this.fechaReserva);
    const allSlots = [
      ...daySlots.morningSlots,
      ...daySlots.afternoonSlots,
      ...daySlots.nightSlots
    ].sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));
    if (this.selectedSlots.length === 0) {
      if (newSlot.isPartiallyReserved && newSlot.availableStartTime && newSlot.availableEndTime) {
        const [startHours, startMinutes] = newSlot.availableStartTime.split(':').map(Number);
        const [endHours, endMinutes] = newSlot.availableEndTime.split(':').map(Number);
        
        this.startTimeInput = { hours: startHours, minutes: startMinutes };
        this.endTimeInput = { hours: endHours, minutes: endMinutes };
        this.updateSlotsFromTimeInputs();
      } else {
        newSlot.isSelected = true;
        this.selectedSlots.push(newSlot);
        this.updateTimeInputsFromSlots();
      }
      return;
    }
    let minTime = Math.min(
      ...this.selectedSlots.map(s => this.timeToMinutes(s.startTime)),
      this.timeToMinutes(newSlot.startTime)
    );    
    let maxTime = Math.max(
      ...this.selectedSlots.map(s => this.timeToMinutes(s.endTime)),
      this.timeToMinutes(newSlot.endTime)
    );
    let startFound = false;
    let validStart = minTime;
    let validEnd = maxTime;    
    for (const slot of allSlots) {
      const slotStart = this.timeToMinutes(slot.startTime);
      const slotEnd = this.timeToMinutes(slot.endTime);      
      if (slotStart >= minTime && slotStart < maxTime) {
        let isSlotAvailable = false;        
        if (slot.isPartiallyReserved && slot.availableStartTime && slot.availableEndTime) {
          const availStart = this.timeToMinutes(slot.availableStartTime + ':00');
          const availEnd = this.timeToMinutes(slot.availableEndTime + ':00');
          if (availStart < maxTime && availEnd > minTime) {
            isSlotAvailable = true;
            validStart = Math.min(validStart, availStart);
            validEnd = Math.max(validEnd, availEnd);
          }
        } else {
          isSlotAvailable = slot.isAvailable && !slot.isReserved;
        }        
        if (!isSlotAvailable && !startFound) {
          this.validationErrors = ['No se pueden seleccionar horarios no consecutivos'];
          this.showValidationAlert = true;
          return;
        }
      }
    }
    this.startTimeInput = { 
      hours: Math.floor(validStart / 60), 
      minutes: validStart % 60 
    };
    this.endTimeInput = { 
      hours: Math.floor(validEnd / 60), 
      minutes: validEnd % 60 
    };
    this.updateSlotsFromTimeInputs();
  }
  private updateSlotsFromTimeInputs(): void {
    this.clearSelectedSlots();  
    const startTime = this.timeInputToString(this.startTimeInput);
    const endTime = this.timeInputToString(this.endTimeInput);
    if (!this.isTimeWithinAnyOperatingPeriod(startTime, endTime)) {
      return;
    }
    const daySlots = this.getTimeSlotsForDay(this.fechaReserva);
    const allSlots = [
      ...daySlots.morningSlots,
      ...daySlots.afternoonSlots,
      ...daySlots.nightSlots
    ];    
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    allSlots.forEach(slot => {
      const slotStart = this.timeToMinutes(slot.startTime);
      const slotEnd = this.timeToMinutes(slot.endTime);
      const overlaps = slotStart < endMinutes && slotEnd > startMinutes;
      let isAvailableForSelection = false;
      let effectiveSlotStart = slotStart;
      let effectiveSlotEnd = slotEnd;      
      if (slot.isPartiallyReserved && slot.availableStartTime && slot.availableEndTime) {
        const availableStart = this.timeToMinutes(slot.availableStartTime + ':00');
        const availableEnd = this.timeToMinutes(slot.availableEndTime + ':00');
        const overlapsAvailable = availableStart < endMinutes && availableEnd > startMinutes;
        if (overlapsAvailable && slot.isWithinTariffTime && !slot.tariffConflict) {
          isAvailableForSelection = true;
          effectiveSlotStart = availableStart;
          effectiveSlotEnd = availableEnd;
        }
      } else {
        isAvailableForSelection = slot.isAvailable && !slot.isReserved;
      }    
      if (overlaps && isAvailableForSelection && slot.isWithinTariffTime && !slot.tariffConflict) {
        slot.isSelected = true;
        this.selectedSlots.push(slot);      
        if (startMinutes > effectiveSlotStart || endMinutes < effectiveSlotEnd) {
          slot.isPartialSelection = true;
          slot.partialStart = Math.max(effectiveSlotStart, startMinutes);
          slot.partialEnd = Math.min(effectiveSlotEnd, endMinutes);
          slot.partialStartTime = this.minutesToTime(slot.partialStart).slice(0, 5);
          slot.partialEndTime = this.minutesToTime(slot.partialEnd).slice(0, 5);
        } else {
          slot.isPartialSelection = false;
          slot.partialStart = undefined;
          slot.partialEnd = undefined;
          slot.partialStartTime = undefined;
          slot.partialEndTime = undefined;
        }
      }
    });  
    this.selectedSlots.sort((a, b) => 
      this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
    );
    this.calculateTariff(); 
  }

  async confirmSelection(): Promise<void> {
    this.isCheckingAvailability = true;
    this.validationErrors = [];
    this.showValidationAlert = false;
    try {
        await this.confirmTimeSelection();
    } catch (error) {
      console.error('Error confirming selection:', error);
      this.validationErrors.push('Error al verificar disponibilidad. Por favor, intente nuevamente.');
      this.showValidationAlert = true;
    } finally {
      this.isCheckingAvailability = false;
    }
  }
  clearSelectedSlots(): void {
    if (this.fechaReserva) {
      try {
        const currentDaySlots = this.getTimeSlotsForDay(this.fechaReserva);
        const allSlots = [
          ...currentDaySlots.morningSlots,
          ...currentDaySlots.afternoonSlots,
          ...currentDaySlots.nightSlots
        ];        
        allSlots.forEach(slot => {
          slot.isSelected = false;
          slot.isPartialSelection = false;
        });
      } catch (error) {
        console.warn('Error clearing slot selection:', error);
      }
    }
    this.selectedSlots = [];
    this.validationErrors = [];
    this.showValidationAlert = false;
  }

  private initializeWeek(): void {
    const today = new Date();    
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;    
    this.currentWeekStart = new Date(today);
    this.currentWeekStart.setDate(today.getDate() + diff);
    this.currentWeekEnd = new Date(this.currentWeekStart);
    this.currentWeekEnd.setDate(this.currentWeekStart.getDate() + 6);
    this.fechaReserva = new Date(today);
    this.activeDayName = this.getDayName(today);
  }
  private generateWeekDays(): void {
    this.weekDays = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const date = new Date(this.currentWeekStart);
      date.setDate(this.currentWeekStart.getDate() + i);        
      const dayName = this.getDayName(date);
      const isPast = date < today;        
      this.weekDays.push({
        name: dayName,
        dayName: this.getFullDayName(date),
        date: date,
        isToday: date.toDateString() === today.toDateString(),
        isPast: isPast
      });
    }
  }
  getTimeSlotsForDay(date: Date): DaySlots {
    const step = Math.max(1, this.minDuration ?? 1) * 60; 
    const dateKey = `${this.toLocalDateString(date)}-${step}-${this.dataTariff?.uuid || 'no-tariff'}`;
    if (this.timeSlotsCache.has(dateKey)) {
      return this.timeSlotsCache.get(dateKey)!;
    }    
    const slots = this.generateDaySlots(date);
    this.timeSlotsCache.set(dateKey, slots);
    return slots;
  }
  private generateDaySlots(date: Date): DaySlots {
    const daySchedule = this.getHorarioForDate(date);
    const exceptions = this.getExceptionsForDate(date);    
    const result: DaySlots = {
      morningSlots: [],
      afternoonSlots: [],
      nightSlots: [],
      operatingSlots: [],
      daySchedule: daySchedule,
      exceptions: exceptions
    };
    if (!daySchedule?.abierto && (!exceptions || exceptions.length === 0)) {
      return result;
    }
    
    const operatingPeriods = this.getOperatingPeriodsForDay(date);
    if (operatingPeriods.length === 0) {
      return result;
    }
    
    if (!this.dataField || !this.dataTariff) {
      return result;
    }
    
    operatingPeriods.forEach(period => {
      let horaApertura = period.start;
      let horaCierre = period.end;
      if (this.dataTariff?.desde) {
        const tarifaStart = this.timeToMinutes(this.dataTariff.desde);
        const scheduleStart = this.timeToMinutes(horaApertura);
        if (tarifaStart > scheduleStart) horaApertura = this.dataTariff.desde;
      }
      if (this.dataTariff?.hasta) {
        const tarifaEnd = this.timeToMinutes(this.dataTariff.hasta);
        const scheduleEnd = this.timeToMinutes(horaCierre);
        if (tarifaEnd < scheduleEnd) horaCierre = this.dataTariff.hasta;
      }
      if (this.timeToMinutes(horaApertura) < this.timeToMinutes(horaCierre)) {
        const slots = this.generateTimeSlots(date, horaApertura, horaCierre);
        
        slots.forEach(slot => {
          const startHour = parseInt(slot.startTime.split(':')[0]);
          const startMinutes = this.timeToMinutes(slot.startTime);        
          if (startMinutes < this.timeToMinutes('12:00:00')) {
            slot.blockType = 'morning';
            result.morningSlots.push(slot);
          } else if (startMinutes < this.timeToMinutes('18:00:00')) {
            slot.blockType = 'afternoon';
            result.afternoonSlots.push(slot);
          } else {
            slot.blockType = 'night';
            result.nightSlots.push(slot);
          }
        });
      }
    });
    return result;
  }

  private generateTimeSlots(date: Date, startTime: string, endTime: string): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const now = new Date();    
    let minReservationTime = new Date(now.getTime());
    if (this.anticipationHours) {
      minReservationTime = new Date(now.getTime() + this.anticipationHours * 60 * 60 * 1000);
    }  
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    const targetDateStr = this.toLocalDateString(date);

    const dayReservations = this.reservationsList.filter(r => {
      if (r.campoDeportivoDto?.uuid !== this.dataField.uuid) return false;
      if (!this.conflictService.isBlockingReservation(r)) return false;

      if (r.reservaPuntualDto) {
        return this.toLocalDateString(this.parseLocalDate(r.reservaPuntualDto.fechaUso)) === targetDateStr;
      }

      if (r.reservaRecurrenteDto) {
        const start = this.toLocalDateString(this.parseLocalDate(r.reservaRecurrenteDto.fechaInicio));
        const end = this.toLocalDateString(this.parseLocalDate(r.reservaRecurrenteDto.fechaFin));
        return targetDateStr >= start && targetDateStr <= end;
      }

      return false;
    });
    const occupiedRanges: { start: number; end: number; reservation: Reserva }[] = [];
    dayReservations.forEach(reserva => {
      if (reserva.reservaPuntualDto) {
        occupiedRanges.push({
          start: this.timeToMinutes(reserva.reservaPuntualDto.horaInicio),
          end: this.timeToMinutes(reserva.reservaPuntualDto.horaFin),
          reservation: reserva
        });

        return;
      }

      if (reserva.reservaRecurrenteDto) {
        const ranges = this.getRecurrentRangesForDate(reserva, date);

        ranges.forEach(range => {
          occupiedRanges.push({
            start: this.timeToMinutes(range.start),
            end: this.timeToMinutes(range.end),
            reservation: reserva
          });
        });
      }
    });
    occupiedRanges.sort((a, b) => a.start - b.start);
    const stepMinutes = Math.max(1, this.minDuration ?? 1) * 60;
    
    for (let minutes = startMinutes; minutes < endMinutes; minutes += stepMinutes) {
      const slotStart = this.minutesToTime(minutes);
      const slotEnd = this.minutesToTime(Math.min(minutes + stepMinutes, endMinutes));
      const slotStartMinutes = minutes;
      const slotEndMinutes = Math.min(minutes + stepMinutes, endMinutes);    
      const slotDateTime = this.combineDateAndTime(date, slotStart);
      const isPast = slotDateTime < minReservationTime;
      let isReserved = false;
      let isPartiallyReserved = false;
      let reservedStart: number | undefined;
      let reservedEnd: number | undefined;
      let availableStart = slotStartMinutes;
      let availableEnd = slotEndMinutes;
      let conflictingReservation: Reserva | undefined;    
      for (const range of occupiedRanges) {
        const overlapStart = Math.max(slotStartMinutes, range.start);
        const overlapEnd = Math.min(slotEndMinutes, range.end);
        if (overlapStart < overlapEnd) {

          conflictingReservation = range.reservation;
          const fullyCovered =
            range.start <= slotStartMinutes &&
            range.end >= slotEndMinutes;
          if (fullyCovered) {
            isReserved = true;
            isPartiallyReserved = false;
          } else {
            isReserved = false;
            isPartiallyReserved = true;
            reservedStart = overlapStart;
            reservedEnd = overlapEnd;
            if (range.start > slotStartMinutes) {
              availableStart = slotStartMinutes;
              availableEnd = range.start;
            }
            else if (range.end < slotEndMinutes) {
              availableStart = range.end;
              availableEnd = slotEndMinutes;
            }
          }

          break;
        }
      }    
      const timeRange: TimeRange = {
        date: date,
        startTime: slotStart,
        endTime: slotEnd
      };
      let conflictResult: ConflictResult | undefined;
      if (!conflictingReservation) {
        conflictResult = this.conflictService.checkConflict(
          this.dataField.uuid!,
          timeRange,
          this.reservationsList
        );
      }
      const isWithinTariffTime = this.isTimeWithinTariff(slotStart, slotEnd);
      const applicableTariff = this.findApplicableTariffForTime(slotStart);

      const PUNCTUAL_TYPES = ['por_hora', 'por_persona', 'por_evento'];
      const tariffConflict = !!(
        applicableTariff &&
        applicableTariff.uuid !== this.dataTariff.uuid &&
        this.dataTariff.desde &&
        this.dataTariff.hasta &&
        PUNCTUAL_TYPES.includes(applicableTariff.tipoCobro)
      );
      const hasFullConflictFromService =
        !conflictingReservation &&
        !!conflictResult?.hasConflict;
      if (hasFullConflictFromService) {
        isReserved = true;
        isPartiallyReserved = false;
        conflictingReservation = conflictResult?.conflictingReservations?.[0];
      }
      let isAvailable =
        !isPast &&
        !isReserved &&
        isWithinTariffTime &&
        !tariffConflict;

      if (isPartiallyReserved && !isPast && isWithinTariffTime && !tariffConflict) {
        isAvailable = true;
      }
      const slot: TimeSlot = {
        time: `${slotStart.slice(0, 5)} - ${slotEnd.slice(0, 5)}`,
        startTime: slotStart,
        endTime: slotEnd,
        isAvailable,
        isReserved: isReserved && !isPartiallyReserved,
        isPartiallyReserved,
        reservation: conflictingReservation || conflictResult?.conflictingReservations?.[0],
        conflictReason: conflictResult?.reason || (isReserved ? 'Reservado' : undefined),

        isPast: isPast,
        isSelected: false,
        blockType: 'operating',
        isWithinTariffTime: isWithinTariffTime,
        applicableTariff: applicableTariff,
        tariffConflict: tariffConflict
      };
      if (isPartiallyReserved && reservedStart !== undefined && reservedEnd !== undefined) {
        slot.reservedStart = reservedStart;
        slot.reservedEnd = reservedEnd;
        slot.reservedStartTime = this.minutesToTime(reservedStart).slice(0, 5);
        slot.reservedEndTime = this.minutesToTime(reservedEnd).slice(0, 5);
        slot.availableStart = availableStart;
        slot.availableEnd = availableEnd;
        slot.availableStartTime = this.minutesToTime(availableStart).slice(0, 5);
        slot.availableEndTime = this.minutesToTime(availableEnd).slice(0, 5);
      }    
      slots.push(slot);
    }  
    return slots;
  }
  private toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
private getRecurrentRangesForDate(
  reserva: Reserva,
  date: Date
): Array<{ start: string; end: string }> {
  const recurrente = reserva.reservaRecurrenteDto;
  const tablero = recurrente?.tableroDto?.horario;

  if (!recurrente || !tablero) return [];

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const startDate = new Date(recurrente.fechaInicio);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(recurrente.fechaFin);
  endDate.setHours(0, 0, 0, 0);

  if (targetDate < startDate || targetDate > endDate) return [];

  const dayIndex = Math.floor(
    (targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const dailyRows = tablero.flat(2) as unknown[];

  const dayRow = dailyRows[dayIndex];

  const rawRanges: string[] = Array.isArray(dayRow)
    ? dayRow.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    : typeof dayRow === 'string' && dayRow.trim() !== ''
      ? [dayRow]
      : [];

  return rawRanges
    .flatMap(value => value.split(','))
    .map(value => value.trim())
    .filter(value => value.includes('-'))
    .map(value => {
      const [start, end] = value.split('-').map(v => {
        const clean = v.trim();
        return clean.length === 5 ? `${clean}:00` : clean;
      });

      return { start, end };
    });
}
  private combineDateAndTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
  private isTimeWithinTariff(startTime: string, endTime: string): boolean {
    if (!this.dataTariff.desde || !this.dataTariff.hasta) {
      return true; 
    }
    const slotStart = this.timeToMinutes(startTime);
    const slotEnd = this.timeToMinutes(endTime);
    const tariffStart = this.timeToMinutes(this.dataTariff.desde);
    const tariffEnd = this.timeToMinutes(this.dataTariff.hasta);
    return slotStart >= tariffStart && slotEnd <= tariffEnd;
  }
  private findApplicableTariffForTime(time: string): Tarifa | undefined {
    if (!this.dataField?.tarifasDtoList) return undefined;
    
    if (!this.dataTariff?.desde || !this.dataTariff?.hasta) {
      return this.dataTariff;
    }

    const PUNCTUAL_TYPES = ['por_hora', 'por_persona', 'por_evento'];
    const timeMinutes = this.timeToMinutes(time);

    const applicable = this.dataField.tarifasDtoList.filter(tarifa =>
      tarifa.activo &&
      tarifa.desde &&
      tarifa.hasta &&
      PUNCTUAL_TYPES.includes(tarifa.tipoCobro) &&  // Only punctual tariff types
      timeMinutes >= this.timeToMinutes(tarifa.desde) &&
      timeMinutes < this.timeToMinutes(tarifa.hasta)
    );

    const selectedTariffApplicable = applicable.find(t => t.uuid === this.dataTariff.uuid);
    return selectedTariffApplicable || applicable[0];
  }
  private checkMultipleTariffs(): void {
    if (!this.dataField?.tarifasDtoList || !this.dataTariff) {
      this.hasMultipleApplicableTariffs = false;
      this.applicableTariffs = [];
      this.tariffBoundaryTime = null;
      return;
    }

    const PUNCTUAL_TYPES = ['por_hora', 'por_persona', 'por_evento'];

    const activePunctualTariffs = this.dataField.tarifasDtoList.filter(tarifa =>
      tarifa.activo &&
      tarifa.desde &&
      tarifa.hasta &&
      PUNCTUAL_TYPES.includes(tarifa.tipoCobro)
    );

    this.applicableTariffs = activePunctualTariffs.filter(tarifa =>
      tarifa.uuid !== this.dataTariff.uuid &&
      this.tariffsOverlap(this.dataTariff, tarifa)
    );

    this.hasMultipleApplicableTariffs = this.applicableTariffs.length > 0;
    this.tariffBoundaryTime = this.hasMultipleApplicableTariffs
      ? this.findTariffBoundaryTime()
      : null;
  }
  private tariffsOverlap(tariff1: Tarifa, tariff2: Tarifa): boolean {
    if (!tariff1.desde || !tariff1.hasta || !tariff2.desde || !tariff2.hasta) {
      return false;
    }
    const t1Start = this.timeToMinutes(tariff1.desde);
    const t1End = this.timeToMinutes(tariff1.hasta);
    const t2Start = this.timeToMinutes(tariff2.desde);
    const t2End = this.timeToMinutes(tariff2.hasta);
    return (t1Start < t2End && t1End > t2Start);
  }
  private findTariffBoundaryTime(): string | null {
    if (!this.dataTariff.hasta) return null;
    const overlappingStarts = this.applicableTariffs
      .map(tarifa => this.timeToMinutes(tarifa.desde || '00:00:00'))
      .filter(startTime => startTime > this.timeToMinutes(this.dataTariff.desde || '00:00:00'));

    if (overlappingStarts.length === 0) return null;

    const earliestOverlap = Math.min(...overlappingStarts);
    return this.minutesToTime(earliestOverlap);
  }
  private getOperatingPeriodsForDay(date: Date): OperatingPeriod[] {
    const allSchedules = this.dataField?.horariosFijosDtoList || [];
    
    if (!allSchedules || allSchedules.length === 0) {
      return [];
    }
    
    const dayOfWeek = date.getDay();
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const currentDayName = dayNames[dayOfWeek];
    
    const applicableSchedules = allSchedules.filter(schedule => {
      if (!schedule.abierto || !schedule.horaApertura || !schedule.horaCierre) {
        return false;
      }
      
      if (schedule.dia === currentDayName) {
        return true;
      }
      
      if (schedule.dia === 'lunes_viernes' && dayOfWeek >= 1 && dayOfWeek <= 5) {
        return true;
      }
      
      if (schedule.dia === 'sabado' && dayOfWeek === 6) {
        return true;
      }
      
      if (schedule.dia === 'domingo' && dayOfWeek === 0) {
        return true;
      }
      
      return false;
    });
    
    const periods: OperatingPeriod[] = applicableSchedules
      .map(schedule => ({ 
        start: schedule.horaApertura!, 
        end: schedule.horaCierre! 
      }))
      .sort((a, b) => this.timeToMinutes(a.start) - this.timeToMinutes(b.start));
    
    const mergedPeriods: OperatingPeriod[] = [];
    let currentPeriod: OperatingPeriod | null = null;
    
    for (const period of periods) {
      if (!currentPeriod) {
        currentPeriod = { ...period };
      } else {
        const currentEnd = this.timeToMinutes(currentPeriod.end);
        const nextStart = this.timeToMinutes(period.start);
        
        if (nextStart <= currentEnd) {
          const nextEnd = this.timeToMinutes(period.end);
          if (nextEnd > currentEnd) {
            currentPeriod.end = period.end;
          }
        } else {
          mergedPeriods.push(currentPeriod);
          currentPeriod = { ...period };
        }
      }
    }
    
    if (currentPeriod) {
      mergedPeriods.push(currentPeriod);
    }
    
    return mergedPeriods;
  }
  private getHorarioForDate(date: Date): HorarioFijo | undefined {
    if (!this.dataField?.horariosFijosDtoList) return undefined;
    const dayOfWeek = date.getDay();
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const currentDayName = dayNames[dayOfWeek];
    const exactDayMatch = this.dataField.horariosFijosDtoList.find(h => h.dia === currentDayName);
    if (exactDayMatch) {
        return exactDayMatch;
    }
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        return this.dataField.horariosFijosDtoList.find(h => h.dia === 'lunes_viernes');
    }
    if (dayOfWeek === 6) { // sábado
        return this.dataField.horariosFijosDtoList.find(h => h.dia === 'sabado');
    }    
    if (dayOfWeek === 0) { // domingo
        return this.dataField.horariosFijosDtoList.find(h => h.dia === 'domingo');
    }    
    return undefined;
  }

  private getExceptionsForDate(date: Date): HorarioExcepcion[] | undefined {
    if (!this.dataField?.horariosExcepcionesDtoList) {
      return undefined;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return this.dataField.horariosExcepcionesDtoList.filter(
      exc => exc.fecha === dateStr
    );
  }


calculatedTariff: number = 0;
tariffDetails: string[] = [];
showTariffBreakdown: boolean = false;
calculateTariff(): void {
  this.calculatedTariff = 0;
  this.tariffDetails = [];
  if (!this.dataTariff) return;
  
  const montoBase = this.dataTariff.precioBase || 0;
  const startMinutes = this.startTimeInput.hours * 60 + this.startTimeInput.minutes;
  const endMinutes = this.endTimeInput.hours * 60 + this.endTimeInput.minutes;
  const durationInHours = Math.max(0, (endMinutes - startMinutes) / 60);
  let total = 0;

  switch (this.dataTariff.tipoCobro) {
    case 'por_hora':
      if (durationInHours <= 0) return;

      total = montoBase * durationInHours;
      this.tariffDetails.push(
        `${durationInHours.toFixed(1)} hora(s) × Bs. ${montoBase.toFixed(2)} = Bs. ${total.toFixed(2)}`
      );
      break;      
    case 'por_persona':
      const personas = this.cantidadPersonas || 1;
      total = montoBase * personas;
      this.tariffDetails.push(
        `${personas} persona(s) × Bs. ${montoBase.toFixed(2)} = Bs. ${total.toFixed(2)}`
      );
      break;

    case 'por_evento':
      total = montoBase;
      this.tariffDetails.push(`Tarifa por evento: Bs. ${montoBase.toFixed(2)}`);
      break;

    case 'mensualidad':
      total = montoBase;
      this.tariffDetails.push(`Mensualidad base: Bs. ${montoBase.toFixed(2)}`);
      break;

    case 'por_sesion':
      total = montoBase;
      this.tariffDetails.push(`Tarifa por sesión: Bs. ${montoBase.toFixed(2)}`);
      break;

    case 'por_club':
      total = montoBase;
      this.tariffDetails.push(`Tarifa club/organización: Bs. ${montoBase.toFixed(2)}`);
      break;

    default:
      total = montoBase;
      this.tariffDetails.push(`Tarifa base: Bs. ${montoBase.toFixed(2)}`);
      break;
  }
  const conceptosActivos = this.dataTariff.conceptosDtos?.filter((c: any) => c.activo) || [];

  for (const concepto of conceptosActivos) {
    const baseForConcepto = total;
    const conceptoMonto = this.calculateScheduleConceptoAmount(concepto, baseForConcepto, durationInHours);
    total += conceptoMonto;

    if (conceptoMonto > 0) {
      this.tariffDetails.push(this.getScheduleConceptoDetail(concepto, conceptoMonto, baseForConcepto, durationInHours));
    }
  }

  this.calculatedTariff = total;
}
private calculateScheduleConceptoAmount(
  concepto: any,
  baseAmount: number,
  durationInHours: number
): number {
  const valor = Number(concepto.valor || 0);
  switch (concepto.tipo) {
    case 'porcentaje':
      return baseAmount * (valor / 100);
    case 'fijo':
      return valor;
    case 'por_hora':
      return valor * this.getDurationForScheduleConcepto(concepto, durationInHours);
    default:
      return 0;
  }
}
private getDurationForScheduleConcepto(concepto: any, durationInHours: number): number {
  if (!concepto.desde || !concepto.hasta) {
    return durationInHours;
  }
  const selectionStart = this.startTimeInput.hours * 60 + this.startTimeInput.minutes;
  const selectionEnd = this.endTimeInput.hours * 60 + this.endTimeInput.minutes;
  const conceptoStart = this.timeToMinutes(concepto.desde);
  const conceptoEnd = this.timeToMinutes(concepto.hasta);
  const overlapStart = Math.max(selectionStart, conceptoStart);
  const overlapEnd = Math.min(selectionEnd, conceptoEnd);
  if (overlapEnd <= overlapStart) return 0;
  return (overlapEnd - overlapStart) / 60;
}

private getScheduleConceptoDetail(
  concepto: any,
  amount: number,
  baseAmount: number,
  durationInHours: number
): string {
  const name = concepto.concepto || 'Concepto adicional';
  const valor = Number(concepto.valor || 0);

  switch (concepto.tipo) {
    case 'por_hora': {
      const conceptHours = this.getDurationForScheduleConcepto(concepto, durationInHours);
      const range = this.getConceptoTimeRangeDisplay(concepto);
      return `${name}${range}: ${conceptHours.toFixed(1)}h × Bs. ${valor.toFixed(2)} = Bs. ${amount.toFixed(2)}`;
    }
    case 'porcentaje':
      return `${name}: ${valor.toFixed(2)}% de Bs. ${baseAmount.toFixed(2)} = Bs. ${amount.toFixed(2)}`;
    case 'fijo':
      return `${name}: monto fijo = Bs. ${amount.toFixed(2)}`;
    default:
      return `${name}: Bs. ${amount.toFixed(2)}`;
  }
}

private getConceptoTimeRangeDisplay(concepto: any): string {
  if (!concepto.desde || !concepto.hasta) {
    return '';
  }

  return ` (${String(concepto.desde).slice(0, 5)}-${String(concepto.hasta).slice(0, 5)})`;
}

  setSelectedDay(date: Date): void {
    this.clearSelectedSlots();
    this.fechaReserva = date;
    this.activeDayName = this.getDayName(date);
  }
  onStartTimeChange(event: any): void {
    const timeString = event.target.value;
    if (timeString) {
      const [hours, minutes] = timeString.split(':').map(Number);
      this.startTimeInput = { hours, minutes };
      const startTime = this.timeInputToString(this.startTimeInput);
      const endTime = this.timeInputToString(this.endTimeInput);
      if (this.timeToMinutes(startTime) >= this.timeToMinutes(endTime)) {
        this.autoAdjustEndTime();
      }    
      this.updateSlotsFromTimeInputs();
      this.calculateTariff();
      if (!this.validateTimeSelection()) {
        this.showValidationAlert = true;
      }
    }
  }
  onEndTimeChange(event: any): void {
    const timeString = event.target.value;
    if (timeString) {
      const [hours, minutes] = timeString.split(':').map(Number);
      this.endTimeInput = { hours, minutes };
      this.updateSlotsFromTimeInputs();
      this.calculateTariff();
      if (!this.validateTimeSelection()) {
        this.showValidationAlert = true;
      }
    }
  }
  private getDayName(date: Date): string {
    const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    return days[date.getDay()];
  }

  onCantidadPersonasChange(): void {
    this.calculateTariff();
    if (!this.validateCantidadPersonas()) {
      this.showValidationAlert = true;
    } else {
      this.showValidationAlert = this.validationErrors.length > 0;
    }
  }

  private validateCantidadPersonas(): boolean {
    this.validationErrors = this.validationErrors.filter(error =>
      !error.includes('cantidad de personas') && !error.includes('capacidad máxima')
    );

    if (!this.cantidadPersonas) {
      if (this.requiresCantidadPersonas) {
        this.validationErrors.push('Debe ingresar la cantidad de personas para esta tarifa');
        return false;
      }
      return true;
    }

    if (this.cantidadPersonas < 1) {
      this.validationErrors.push('La cantidad de personas debe ser mayor a 0');
      return false;
    }

    const maxPersonas = this.dataField?.capacidadPersonas;
    if (maxPersonas && this.cantidadPersonas > maxPersonas) {
      this.validationErrors.push(`La cantidad de personas supera la capacidad máxima: ${maxPersonas}`);
      return false;
    }

    return true;
  }
  private getFullDayName(date: Date): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
  }
  private timeToMinutes(time: string): number {
    const parts = time.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const result = hours * 60 + minutes;
    return result;
  }
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const result = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
    return result;
  }
  getTimeInputValue(timeInput: TimeInput): string {
    if (timeInput.hours === 0 && timeInput.minutes === 0) {
      return '';
    }
    return `${timeInput.hours.toString().padStart(2, '0')}:${timeInput.minutes.toString().padStart(2, '0')}`;
  }
  private timeInputToString(timeInput: TimeInput): string {
    return `${timeInput.hours.toString().padStart(2, '0')}:${timeInput.minutes.toString().padStart(2, '0')}:00`;
  }

/* public : redirection,displays, class getter*/
  trackBySlot(index: number, slot: TimeSlot): string {
    return `${slot.startTime}-${slot.endTime}`;
  }
  moveWeek(direction: number): void {
    this.scheduleState.moveWeek(direction);
    this.timeSlotsCache.clear();
    this.clearSelectedSlots();
    this.generateWeekDays();    
    if (this.weekDays.length > 0) {
      this.setSelectedDay(this.weekDays[0].date);
    }
  }
  goToToday(): void {  
    this.scheduleState.goToToday();
    this.timeSlotsCache.clear();
    this.clearSelectedSlots();
    this.generateWeekDays();
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const todayInWeek = this.weekDays.find(day => 
        day.date.toDateString() === today.toDateString()
    );
    if (todayInWeek) {
        this.setSelectedDay(todayInWeek.date);
    } else if (this.weekDays.length > 0) {
        this.setSelectedDay(this.weekDays[0].date);
    }
  }
  isDayOpen(): boolean {
    const daySlots = this.getTimeSlotsForDay(this.fechaReserva);
    return daySlots.daySchedule?.abierto === true;
  }
  getSlotClasses(slot: TimeSlot): string {
    if (slot.isSelected) return 'border-primary bg-primary text-white';
    if (slot.isPartiallyReserved) return 'border-danger bg-danger bg-opacity-10 text-danger cursor-pointer hover-effect';
    if (slot.isReserved) return 'border-danger bg-danger-subtle text-danger';
    if (!slot.isAvailable) return 'border-secondary bg-body-tertiary text-muted';
    if (!slot.isWithinTariffTime || slot.tariffConflict) return 'border-warning bg-warning-subtle text-warning';
    return 'border-success bg-success-subtle text-success cursor-pointer hover-effect';
  }
  getSlotTextClasses(slot: TimeSlot): string {
    if (slot.isSelected) return 'text-white fw-medium';
    if (!slot.isAvailable) return 'text-muted';
    if (slot.isReserved) return 'text-danger';
    if (!slot.isWithinTariffTime || slot.tariffConflict) return 'text-warning';
    return 'text-success';
  }
  getSlotTooltip(slot: TimeSlot): string {
    if (slot.conflictReason) return slot.conflictReason;
    if (slot.tariffConflict && slot.applicableTariff) {
      return `Corresponde a: ${slot.applicableTariff.descripcion} (${slot.applicableTariff.desde?.slice(0, 5)} - ${slot.applicableTariff.hasta?.slice(0, 5)})`;
    }
    if (!slot.isWithinTariffTime) {
      return `Fuera del rango de la tarifa seleccionada: ${this.dataTariff.desde?.slice(0, 5)} - ${this.dataTariff.hasta?.slice(0, 5)}`;
    }
    if (slot.isPast) return 'Hora pasada';
    if (slot.isAvailable) return 'Disponible';
    return '';
  }

  getDayCardClasses(day: WeekDay): string {
    const classes: string[] = ['rounded-3', 'me-1', 'mb-2'];
    const daySlots = this.getTimeSlotsForDay(day.date);
    if (day.isPast) {
      classes.push('bg-secondary-subtle');
    } else if (daySlots.daySchedule?.abierto) {
      classes.push('bg-success-subtle');
    } else {
      classes.push('bg-danger-subtle');
    }
    if (day.isToday) {
      classes.push('border', 'border-primary', 'border-2');
    }
    return classes.join(' ');
  }
  getOperatingHoursDisplay(): string {
    const daySlots = this.getTimeSlotsForDay(this.fechaReserva);
    if (!daySlots.daySchedule?.abierto) return 'Cerrado';
    const operatingPeriods = this.getOperatingPeriodsForDay(this.fechaReserva);
    if (operatingPeriods.length === 0) return 'Cerrado';
    const periodDisplays = operatingPeriods.map(period => 
      `${period.start.slice(0, 5)} - ${period.end.slice(0, 5)}`
    );    
    return periodDisplays.join(', ');
  }
  getTipoCobroDisplay(): string {
    return obtenerLabelTipoCobro(this.dataTariff?.tipoCobro, '');
  }
  
  private parseLocalDate(date: Date | string): Date {
    if (date instanceof Date) {
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
    }
    const raw = String(date).split('T')[0];
    const [year, month, day] = raw.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

}
