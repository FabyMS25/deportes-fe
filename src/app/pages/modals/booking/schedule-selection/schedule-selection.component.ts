import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Tarifa } from 'src/app/core/models/tarifa.model';
// import { Reserva } from 'src/app/core/models/reserva.models';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { HorarioFijo } from 'src/app/core/models/horarioFijo.model';
import { HorarioExcepcion } from 'src/app/core/models/horarioExcepcion.model';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { ReservationConflictService, TimeRange } from '../reservation-conflict.service';
import { ScheduleStateService } from '../schedule-state.service';
import { Subject, takeUntil } from 'rxjs';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';
import { Reserva } from 'src/app/core/models/reserva.model';

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
  reservation?: Reserva;
  conflictReason?: string;
  blockType: 'morning' | 'afternoon' | 'night' | 'operating';
  isWithinTariffTime: boolean;
  applicableTariff?: Tarifa;
  tariffConflict?: boolean;
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
  @Input() dataField!: CampoDeportivo;
  @Input() dataTariff!: Tarifa;
  @Input() reservationsList: Reserva[] = []; 
  @Input() systemConfigs: { [key: string]: ConfiguracionSistema } = {};
  @Input() userRole: 'Contribuyente' | 'Representante' | 'Encargado' | 'Admin' = 'Contribuyente';
  @Output() horarioSelected = new EventEmitter<{ date: Date; start: string; end: string }>();
  currentWeekStart: Date = new Date();
  currentWeekEnd: Date = new Date();
  blocks: { [key: string]: BlockDefinition } = {};
  startTimeInput: TimeInput = { hours: 0, minutes: 0 };
  endTimeInput: TimeInput = { hours: 0, minutes: 0 };
  applicableTariffs: Tarifa[] = [];
  hasMultipleApplicableTariffs = false;
  tariffBoundaryTime: string | null = null;

  get anticipationHours(): number | undefined{
    if (!this.dataTariff) {
      return this.systemConfigs[ClaveConfiguracion.HORAS_ANTICIPACION_RESERVAS_PUNTUALES]?.valorNumerico;
    }
    switch (this.dataTariff.tipoCobro) {
      case 'por_evento':
        const diasEventos = this.systemConfigs[ClaveConfiguracion.DIAS_ANTICIPACION_EVENTOS]?.valorNumerico;
        return diasEventos? diasEventos* 24:undefined;
      case 'mensualidad': case 'por_sesion': case 'por_club':
        return this.systemConfigs[ClaveConfiguracion.HORAS_ANTICIPACION_RECURRENTES]?.valorNumerico;
      default:
        return this.systemConfigs[ClaveConfiguracion.HORAS_ANTICIPACION_RESERVAS_PUNTUALES]?.valorNumerico;
    }
  }  
  get anticipationTimeDisplay(): string {
    switch (this.dataTariff.tipoCobro) {
      case 'por_evento':
        return (this.systemConfigs[ClaveConfiguracion.DIAS_ANTICIPACION_EVENTOS]?.valorNumerico ?? 0) + `días`;
      case 'mensualidad': case 'por_sesion': case 'por_club':
        return (this.systemConfigs[ClaveConfiguracion.HORAS_ANTICIPACION_RECURRENTES]?.valorNumerico ?? 0) + `días`;
      default:
        return (this.systemConfigs[ClaveConfiguracion.HORAS_ANTICIPACION_RESERVAS_PUNTUALES]?.valorNumerico ?? 0) + `horas`;
    }
  }  
  get maxDuration(): number {
      const maxHours = this.systemConfigs[ClaveConfiguracion.DURACION_MAXIMA_EVENTOS]?.valorNumerico;
      return (maxHours !== undefined && maxHours !== null ? maxHours : 24);
  }
  get minDuration(): number {
    const minDuration = this.systemConfigs[ClaveConfiguracion.DURACION_MINIMA_RESERVA]?.valorNumerico;
    return minDuration ? minDuration : 1;
  }
  get maxDurationDisplay(): string {
    const hours = this.maxDuration;
    if (hours === 1) {
      return '1 hora';
    } else {
      return `${hours} horas`;
    }
  }
  get minDurationDisplay(): string {
    const hours = this.minDuration;
    if (hours === 1) {
      return '1 hora';
    } else {
      return `${hours} horas`;
    }
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
    }    
    if (changes['dataTariff'] && !changes['dataTariff'].firstChange) {
      this.timeSlotsCache.clear();
      this.clearSelectedSlots();
      this.generateWeekDays();
      this.checkMultipleTariffs();
    }
    if (changes['reservationsList'] && !changes['reservationsList'].firstChange) {
      this.timeSlotsCache.clear();
      this.generateWeekDays();
      this.revalidateSelection();
    }
    if (changes['systemConfigs'] && !changes['systemConfigs'].firstChange) {
      this.timeSlotsCache.clear();
      this.generateWeekDays();
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
    const minDurationMinutes = this.minDuration * 60;
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
      end: endTime 
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
    if (duration < this.minDuration * 60) {
      this.validationErrors.push(`La duración mínima es de ${this.minDurationDisplay}`);
      return false;
    } 
    if (duration > this.maxDuration * 60) {
      this.validationErrors.push(`La duración máxima es de ${this.maxDurationDisplay}`);
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
toggleSlotSelection(slot: TimeSlot): void {
  if (!slot.isAvailable || slot.isReserved || !slot.isWithinTariffTime || slot.tariffConflict) {
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
      const now = new Date();
      const slotTime = this.combineDateAndTime(this.fechaReserva, slot.startTime);
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
    this.selectSlotWithConsecutive(slot);
  }
  
  this.selectedSlots.sort((a, b) => 
    this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
  );
  
  this.updateTimeInputsFromSlots();
}
private updateTimeInputsFromSlots(): void {
  if (this.selectedSlots.length === 0) {
    return;
  }
  const firstSlot = this.selectedSlots[0];
  const lastSlot = this.selectedSlots[this.selectedSlots.length - 1];
  const [startHours, startMinutes] = firstSlot.startTime.split(':').map(Number);
  const [endHours, endMinutes] = lastSlot.endTime.split(':').map(Number); 
  this.startTimeInput = { hours: startHours, minutes: startMinutes };
  this.endTimeInput = { hours: endHours, minutes: endMinutes };
}
private deselectSlotAndDependents(deselectedSlot: TimeSlot): void {
  const daySlots = this.getTimeSlotsForDay(this.fechaReserva);
  const allSlots = [
    ...daySlots.morningSlots,
    ...daySlots.afternoonSlots,
    ...daySlots.nightSlots
  ].sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));
  const deselectedIndex = this.selectedSlots.findIndex(s => 
    s.startTime === deselectedSlot.startTime && s.endTime === deselectedSlot.endTime
  );
  this.clearSelectedSlots();
  if (this.selectedSlots.length > 0) {
    const firstSelected = this.selectedSlots[0];
    const lastSelected = this.selectedSlots[this.selectedSlots.length - 1];
    const firstIndex = allSlots.findIndex(s => s.startTime === firstSelected.startTime);
    const lastIndex = allSlots.findIndex(s => s.startTime === lastSelected.startTime);
    for (let i = firstIndex; i <= lastIndex; i++) {
      if (i !== deselectedIndex) {
        const currentSlot = allSlots[i];
        if (currentSlot.isAvailable && !currentSlot.isReserved && 
            currentSlot.isWithinTariffTime && !currentSlot.tariffConflict) {
          currentSlot.isSelected = true;
          this.selectedSlots.push(currentSlot);
        }
      }
    }
  }
}
private selectSlotWithConsecutive(newSlot: TimeSlot): void {
  const daySlots = this.getTimeSlotsForDay(this.fechaReserva);
  const allSlots = [
    ...daySlots.morningSlots,
    ...daySlots.afternoonSlots,
    ...daySlots.nightSlots
  ].sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));
  if (this.selectedSlots.length === 0) {
    newSlot.isSelected = true;
    this.selectedSlots.push(newSlot);
    return;
  }
  const selectedStartTimes = this.selectedSlots.map(s => this.timeToMinutes(s.startTime));
  const minSelectedTime = Math.min(...selectedStartTimes);
  const maxSelectedTime = Math.max(...selectedStartTimes);
  const newSlotTime = this.timeToMinutes(newSlot.startTime);
  if (newSlotTime < minSelectedTime) {
    this.selectRangeFromNewToExisting(newSlot, allSlots, minSelectedTime);
  } else if (newSlotTime > maxSelectedTime) {
    this.selectRangeFromExistingToNew(newSlot, allSlots, maxSelectedTime);
  } else {
    this.selectEntireRange(minSelectedTime, maxSelectedTime, allSlots);
  }
}
private selectRangeFromNewToExisting(newSlot: TimeSlot, allSlots: TimeSlot[], minSelectedTime: number): void {
  const newSlotTime = this.timeToMinutes(newSlot.startTime);
  this.clearSelectedSlots();
  const startIndex = allSlots.findIndex(s => this.timeToMinutes(s.startTime) === newSlotTime);
  const endIndex = allSlots.findIndex(s => this.timeToMinutes(s.startTime) === minSelectedTime);
  for (let i = startIndex; i <= endIndex; i++) {
    const currentSlot = allSlots[i];
    if (currentSlot.isAvailable && !currentSlot.isReserved && 
        currentSlot.isWithinTariffTime && !currentSlot.tariffConflict) {
      currentSlot.isSelected = true;
      this.selectedSlots.push(currentSlot);
    }
  }
}
private selectRangeFromExistingToNew(newSlot: TimeSlot, allSlots: TimeSlot[], maxSelectedTime: number): void {
  const newSlotTime = this.timeToMinutes(newSlot.startTime);
  this.clearSelectedSlots();
  const startIndex = allSlots.findIndex(s => this.timeToMinutes(s.startTime) === maxSelectedTime);
  const endIndex = allSlots.findIndex(s => this.timeToMinutes(s.startTime) === newSlotTime);
  for (let i = startIndex; i <= endIndex; i++) {
    const currentSlot = allSlots[i];
    if (currentSlot.isAvailable && !currentSlot.isReserved && 
        currentSlot.isWithinTariffTime && !currentSlot.tariffConflict) {
      currentSlot.isSelected = true;
      this.selectedSlots.push(currentSlot);
    }
  }
}
private selectEntireRange(minTime: number, maxTime: number, allSlots: TimeSlot[]): void {
  this.clearSelectedSlots();
  const startIndex = allSlots.findIndex(s => this.timeToMinutes(s.startTime) === minTime);
  const endIndex = allSlots.findIndex(s => this.timeToMinutes(s.startTime) === maxTime);
  for (let i = startIndex; i <= endIndex; i++) {
    const currentSlot = allSlots[i];
    if (currentSlot.isAvailable && !currentSlot.isReserved && 
        currentSlot.isWithinTariffTime && !currentSlot.tariffConflict) {
      currentSlot.isSelected = true;
      this.selectedSlots.push(currentSlot);
    }
  }
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
    if (overlaps && slot.isAvailable && !slot.isReserved && slot.isWithinTariffTime && !slot.tariffConflict) {
      slot.isSelected = true;
      this.selectedSlots.push(slot);      
      if (slotStart < startMinutes || slotEnd > endMinutes) {
        slot.isPartialSelection = true;
        slot.partialStart = Math.max(slotStart, startMinutes);
        slot.partialEnd = Math.min(slotEnd, endMinutes);
      } else {
        slot.isPartialSelection = false;
      }
    }
  });  
  this.selectedSlots.sort((a, b) => 
    this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
  );
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
    const dateKey = `${date.toISOString().split('T')[0]}-${this.minDuration*60}-${this.dataTariff?.uuid || 'no-tariff'}`;
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
    for (let minutes = startMinutes; minutes < endMinutes; minutes += this.minDuration*60) {
      const slotStart = this.minutesToTime(minutes);
      const slotEnd = this.minutesToTime(Math.min(minutes + this.minDuration*60, endMinutes));
      const slotDateTime = this.combineDateAndTime(date, slotStart);
      const isPast = slotDateTime < minReservationTime;        
      const timeRange: TimeRange = {
        date: date,
        startTime: slotStart,
        endTime: slotEnd
      };
      const conflictResult = this.conflictService.checkConflict(
        this.dataField.uuid!,
        timeRange,
        this.reservationsList
      );
      const isWithinTariffTime = this.isTimeWithinTariff(slotStart, slotEnd);
      const applicableTariff = this.findApplicableTariffForTime(slotStart);
      const tariffConflict = applicableTariff && applicableTariff.uuid !== this.dataTariff.uuid;
      const slot: TimeSlot = {
        time: `${slotStart.slice(0, 5)} - ${slotEnd.slice(0, 5)}`,
        startTime: slotStart,
        endTime: slotEnd,
        isAvailable: !isPast && !conflictResult.hasConflict && isWithinTariffTime && !tariffConflict,
        isReserved: conflictResult.hasConflict,
        isPast: isPast,
        isSelected: false,
        reservation: conflictResult.conflictingReservations[0],
        conflictReason: conflictResult.reason,
        blockType: 'operating',
        isWithinTariffTime: isWithinTariffTime,
        applicableTariff: applicableTariff,
        tariffConflict: tariffConflict
      };        
      slots.push(slot);
    }
    return slots;
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
    const timeMinutes = this.timeToMinutes(time);
    const applicable = this.dataField.tarifasDtoList.filter(tarifa => 
      tarifa.activo && 
      tarifa.desde && 
      tarifa.hasta &&
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
    const activeTariffs = this.dataField.tarifasDtoList.filter(tarifa => 
      tarifa.activo && tarifa.tipoCobro !== 'por_evento'
    );
    this.applicableTariffs = activeTariffs.filter(tarifa => 
      tarifa.uuid !== this.dataTariff.uuid && 
      this.tariffsOverlap(this.dataTariff, tarifa)
    );
    this.hasMultipleApplicableTariffs = this.applicableTariffs.length > 0;
    if (this.hasMultipleApplicableTariffs) {
      this.tariffBoundaryTime = this.findTariffBoundaryTime();
    } else {
      this.tariffBoundaryTime = null;
    }
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
    const allSchedules = this.dataField.horariosFijosDtoList || [];
    const dayOfWeek = date.getDay();
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const currentDayName = dayNames[dayOfWeek];
    const applicableSchedules = allSchedules.filter(schedule => {
      if (!schedule.abierto || !schedule.horaApertura || !schedule.horaCierre) return false;
      if (schedule.dia === currentDayName) return true;
      if (schedule.dia === 'lunes_viernes' && dayOfWeek >= 1 && dayOfWeek <= 5) return true;
      if (schedule.dia === 'sabado' && dayOfWeek === 6) return true;
      if (schedule.dia === 'domingo' && dayOfWeek === 0) return true;
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
    if (!this.dataField?.horariosExcepcionesDtoList) return undefined;    
    const dateStr = date.toISOString().split('T')[0];
    return this.dataField.horariosExcepcionesDtoList.filter(exc => exc.fecha === dateStr);
  }


calculatedTariff: number = 0;
tariffDetails: string[] = [];
showTariffBreakdown: boolean = false;
calculateTariff(): void {
  this.calculatedTariff = 0;
  this.tariffDetails = [];
  if (!this.dataTariff) return;

  const startMinutes = this.startTimeInput.hours * 60 + this.startTimeInput.minutes;
  const endMinutes = this.endTimeInput.hours * 60 + this.endTimeInput.minutes;
  const durationInHours= (endMinutes - startMinutes) / 60;
  
  switch (this.dataTariff.tipoCobro) {
    case 'por_hora':
      const baseAmount = this.dataTariff.precioBase * durationInHours;
      this.calculatedTariff = baseAmount;
      this.tariffDetails.push(`Tarifa base: Bs. ${this.dataTariff.precioBase} × ${durationInHours.toFixed(1)}h = Bs. ${baseAmount.toFixed(2)}`);
      this.calculateAdditionalConcepts(durationInHours);
      break;
    case 'por_persona':
      this.calculatedTariff = this.dataTariff.precioBase;
      this.tariffDetails.push(`Tarifa base por persona: Bs. ${this.dataTariff.precioBase}`);
      this.tariffDetails.push('* Número de personas se definirá en el siguiente formulario');
      this.calculateAdditionalConcepts(1);
      break;
    case 'por_evento':
      this.calculatedTariff = this.dataTariff.precioBase;
      this.tariffDetails.push(`Tarifa por evento: Bs. ${this.dataTariff.precioBase}`);
      this.calculateAdditionalConcepts(1);
      break;
    case 'mensualidad':
      break;
    case 'por_sesion':
      break;
    case 'por_club':
      break;
    default:
      console.warn('Tipo de cobro no reconocido:', this.dataTariff.tipoCobro);
  }
}
private calculateAdditionalConcepts(baseHours: number): void {
  if (!this.dataTariff.conceptosDtos || this.dataTariff.conceptosDtos.length === 0) {
    return;
  }
  let conceptTotal = 0;
  this.dataTariff.conceptosDtos.forEach(concepto => {
    if (!concepto.activo) return;
    let conceptAmount = 0;
    let conceptDetail = '';    
    if (concepto.tipo === 'por_hora') {
      const applicableHours = this.getApplicableHoursForConcept(concepto);
      conceptAmount = (concepto.valor || 0) * applicableHours;
      conceptDetail = `${concepto.concepto}: $${concepto.valor} × ${applicableHours.toFixed(1)}h = $${conceptAmount.toFixed(2)}`;
    } else if (concepto.tipo === 'porcentaje') {
      conceptAmount = (this.calculatedTariff * (concepto.valor || 0)) / 100;
      conceptDetail = `${concepto.concepto}: ${concepto.valor}% = $${conceptAmount.toFixed(2)}`;
    } else if (concepto.tipo === 'monto_fijo') {
      conceptAmount = concepto.valor || 0;
      conceptDetail = `${concepto.concepto}: $${conceptAmount.toFixed(2)}`;
    }
    if (conceptAmount > 0) {
      this.calculatedTariff += conceptAmount;
      conceptTotal += conceptAmount;
      this.tariffDetails.push(conceptDetail);
    }
  });
  if (conceptTotal > 0) {
    this.tariffDetails.push(`Total conceptos adicionales: $${conceptTotal.toFixed(2)}`);
  }
}
private getApplicableHoursForConcept(concepto: any): number {
  if (!concepto.desde || !concepto.hasta) return 0;
  const startMinutes = this.startTimeInput.hours * 60 + this.startTimeInput.minutes;
  const endMinutes = this.endTimeInput.hours * 60 + this.endTimeInput.minutes;
  const conceptStart = this.timeToMinutes(concepto.desde);
  const conceptEnd = this.timeToMinutes(concepto.hasta);
  const overlapStart = Math.max(startMinutes, conceptStart);
  const overlapEnd = Math.min(endMinutes, conceptEnd);
  
  const overlapHours = Math.max(0, overlapEnd - overlapStart) / 60;
  return overlapHours;
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
    if (!slot.isAvailable) return 'border-secondary bg-light text-muted';
    if (slot.isReserved) return 'border-danger bg-danger-subtle text-danger';
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
    if (!this.dataTariff?.tipoCobro) return '';  
    const tipoCobroMap: { [key: string]: string } = {
      'por_hora': 'Por Hora',
      'por_persona': 'Por Persona',
      'por_evento': 'Por Evento',
      'mensualidad': 'Mensualidad',
      'por_sesion': 'Por Sesión',
      'por_club': 'Por Club'
    };
    return tipoCobroMap[this.dataTariff.tipoCobro] || this.dataTariff.tipoCobro;
  }

}