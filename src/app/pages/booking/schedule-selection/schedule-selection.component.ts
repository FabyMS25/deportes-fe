import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Tarifa } from 'src/app/core/models/tarifa.model';
import { Reserva } from 'src/app/core/models/reserva.models';
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

interface TimeSlot {
  time: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isReserved: boolean;
  isPast: boolean;
  isSelected?: boolean;
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
  blockKeys: string[] = [];
  
  selectionMode: 'slots' | 'custom' = 'slots';
  startTimeInput: TimeInput = { hours: 8, minutes: 0 };
  endTimeInput: TimeInput = { hours: 9, minutes: 0 };
    
  eventDurationHours: number = 8;
  eventDurationError: string = '';

  hasMultipleApplicableTariffs = false;
  applicableTariffs: Tarifa[] = [];
  tariffBoundaryTime: string | null = null;

  get enableSolicitudEventsBooking(): boolean{
    return this.systemConfigs[ClaveConfiguracion.HABILITAR_SOLICITUD_RESERVAS_EVENTOS]?.valorBoolean ?? false;
  }
  
  get enableEventsBooking(): boolean {
    return this.systemConfigs[ClaveConfiguracion.HABILITAR_RESERVAS_EVENTOS]?.valorBoolean ?? false;
  }
  
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
    this.systemConfigs = this.authenticationService.getAllConfigs();
    this.initializeBlocks();
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
      
    this.initializeWeek();
    this.generateWeekDays();
    
    if (this.dataTariff?.tipoCobro === 'por_evento') {
      this.eventDurationHours = this.maxDuration; 
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataField'] && this.dataField) {
      this.initializeBlocks();
    }
    
    if (changes['reservationsList'] && !changes['reservationsList'].firstChange) {
      this.timeSlotsCache.clear();
      this.generateWeekDays();
      this.revalidateSelection();
    }    
    
    if (changes['dataTariff'] && !changes['dataTariff'].firstChange) {
      this.timeSlotsCache.clear();
      this.clearSelectedSlots();
      this.generateWeekDays();
      this.checkMultipleTariffs();
      
      if (this.dataTariff?.tipoCobro === 'por_evento') {
        this.eventDurationHours = this.maxDuration;
      }
    }

    if (changes['dataField'] && !changes['dataField'].firstChange) {
      this.timeSlotsCache.clear();
      this.clearSelectedSlots();
      this.generateWeekDays();
      this.checkMultipleTariffs();
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
    if (earliestStart === '23:59:59') {
      earliestStart = '08:00:00';
      latestEnd = '22:00:00';
    }
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
    this.blockKeys = Object.keys(this.blocks);
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

  setSelectionMode(mode: 'slots' | 'custom'): void {
    this.selectionMode = mode;
    this.validationErrors = [];
    this.showValidationAlert = false;    
    if (mode === 'custom') {
      this.initializeCustomTimeInputs();
    } else {
      this.clearSelectedSlots();
    }
  }

  private initializeCustomTimeInputs(): void {
    const daySlots = this.getTimeSlotsForDay(this.fechaReserva);
    if (!daySlots.daySchedule?.abierto || !daySlots.daySchedule.horaApertura) return;
    const openingTime = daySlots.daySchedule.horaApertura;
    const [openingHour] = openingTime.split(':').map(Number);
    this.startTimeInput = { hours: openingHour, minutes: 0 };
    this.endTimeInput = { hours: openingHour + 1, minutes: 0 };
  }

  getAvailableHours(type: 'start' | 'end'): number[] {
    const daySlots = this.getTimeSlotsForDay(this.fechaReserva);
    if (!daySlots.daySchedule?.abierto || !daySlots.daySchedule.horaApertura || !daySlots.daySchedule.horaCierre) return [];
    const openingTime = daySlots.daySchedule.horaApertura;
    const closingTime = daySlots.daySchedule.horaCierre;    
    const openingHour = parseInt(openingTime.split(':')[0]);
    const closingHour = parseInt(closingTime.split(':')[0]);
    const hours: number[] = [];
    for (let hour = openingHour; hour <= closingHour; hour++) {
      hours.push(hour);
    }    
    return hours;
  }

  private async confirmTimeSlotSelection(): Promise<void> {
    this.isCheckingAvailability = true;
    this.validationErrors = [];
    this.showValidationAlert = false;
    try {
      if (!this.validateTimeSlotSelection()) {
        this.showValidationAlert = true;
        return;
      }

      const startTime = this.selectedSlots[0].startTime;
      const endTime = this.selectedSlots[this.selectedSlots.length - 1].endTime;

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
        this.revalidateSelection();
        return;
      }      
      
      this.horarioSelected.emit({ 
        date: this.fechaReserva, 
        start: startTime, 
        end: endTime 
      });
      
    } catch (error) {
      console.error('Error confirming selection:', error);
      this.validationErrors.push('Error al verificar disponibilidad. Por favor, intente nuevamente.');
      this.showValidationAlert = true;
    } finally {
      this.isCheckingAvailability = false;
    }
  }

  private validateTimeSlotSelection(): boolean {
    if (this.selectedSlots.length === 0) {
      this.validationErrors.push('Debe seleccionar al menos un horario');
      return false;
    }
    if (!this.areConsecutiveSlots(this.selectedSlots)) {
      this.validationErrors.push('Los horarios seleccionados deben ser consecutivos');
      return false;
    }
    const duration = this.timeToMinutes(this.selectedSlots[this.selectedSlots.length - 1].endTime) - this.timeToMinutes(this.selectedSlots[0].startTime)
    const durationInHours = duration / 60;
    if (durationInHours < this.minDuration) {
      this.validationErrors.push(`La duración mínima de reserva es de ${this.minDurationDisplay}`);
      return false;
    }
    if (durationInHours > this.maxDuration) {
      this.validationErrors.push(`La duración máxima para este tipo de reserva es de ${this.maxDurationDisplay}`);
      return false;
    }
    if (this.dataField?.requiereAprobacion) {
      const maxDuration = this.dataField.maxDuracionAutoAprobacion || 120;
      if (duration > maxDuration) {
        this.validationErrors.push(
          `Las reservas de más de ${maxDuration} minutos requieren aprobación del administrador. Su reserva será revisada antes de confirmarse.`
        );
      }
    }
    return true;
  }

  private areConsecutiveSlots(slots: TimeSlot[]): boolean {
    if (slots.length <= 1) return true;
    for (let i = 0; i < slots.length - 1; i++) {
      if (slots[i].endTime !== slots[i + 1].startTime) {
        return false;
      }
    }
    return true;
  }
  validateCustomTimeSelection(): boolean {
    this.validationErrors = [];    
    const startMinutes = this.startTimeInput.hours * 60 + this.startTimeInput.minutes;
    const endMinutes = this.endTimeInput.hours * 60 + this.endTimeInput.minutes;
    if (!this.isDayOpenForCustomSelection()) {
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

    const daySlots = this.getTimeSlotsForDay(this.fechaReserva);
    if (daySlots.daySchedule?.abierto && daySlots.daySchedule.horaApertura && daySlots.daySchedule.horaCierre) {
      const openingTime = daySlots.daySchedule.horaApertura;
      const closingTime = daySlots.daySchedule.horaCierre;      
      const openingMinutes = this.timeToMinutes(openingTime);
      const closingMinutes = this.timeToMinutes(closingTime);
      if (startMinutes < openingMinutes || endMinutes > closingMinutes) {
        this.validationErrors.push(
          `El horario debe estar dentro del horario de atención (${openingTime.slice(0, 5)} - ${closingTime.slice(0, 5)})`
        );
        return false;
      }
    }    
    return true;
  }
  private timeInputToString(timeInput: TimeInput): string {
    return `${timeInput.hours.toString().padStart(2, '0')}:${timeInput.minutes.toString().padStart(2, '0')}:00`;
  }
  async confirmCustomTimeSelection(): Promise<void> {
    this.isCheckingAvailability = true;
    this.validationErrors = [];
    this.showValidationAlert = false;
    try {
      if (!this.validateCustomTimeSelection()) {
        this.showValidationAlert = true;
        return;
      }
      const startTime = `${this.startTimeInput.hours.toString().padStart(2, '0')}:${this.startTimeInput.minutes.toString().padStart(2, '0')}:00` ;
      const endTime = `${this.endTimeInput.hours.toString().padStart(2, '0')}:${this.endTimeInput.minutes.toString().padStart(2, '0')}:00`;
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

    } catch (error) {
      console.error('Error confirming custom time selection:', error);
      this.validationErrors.push('Error al verificar disponibilidad. Por favor, intente nuevamente.');
      this.showValidationAlert = true;
    } finally {
      this.isCheckingAvailability = false;
    }
  }

  getTimeInputValue(timeInput: TimeInput): string {
    return `${timeInput.hours.toString().padStart(2, '0')}:${timeInput.minutes.toString().padStart(2, '0')}`;
  }

  onStartTimeChange(event: any): void {
    const timeString = event.target.value;
    if (timeString) {
      const [hours, minutes] = timeString.split(':').map(Number);
      this.startTimeInput = { hours, minutes };
    }
  }

  onEndTimeChange(event: any): void {
    const timeString = event.target.value;
    if (timeString) {
      const [hours, minutes] = timeString.split(':').map(Number);
      this.endTimeInput = { hours, minutes };
    }
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

  onEventDurationChange(): void {
    this.eventDurationError = '';
    if (this.eventDurationHours < this.minDuration) {
      this.eventDurationError = `La duración mínima es de ${this.minDurationDisplay}`;
      return;
    }    
    if (this.eventDurationHours > this.maxDuration) {
      this.eventDurationError = `La duración máxima es de ${this.maxDurationDisplay}`;
      return;
    }
    this.timeSlotsCache.clear();
    this.generateWeekDays();
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
      }
      return;
    }
    this.validationErrors = [];
    this.showValidationAlert = false;
    const index = this.selectedSlots.findIndex(s => 
      s.startTime === slot.startTime && s.endTime === slot.endTime
    );
    if (index > -1) {
      this.selectedSlots.splice(index, 1);
      slot.isSelected = false;
    } else {
      this.selectedSlots.push(slot);
      slot.isSelected = true;
    }
    this.selectedSlots.sort((a, b) => 
      this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
    );
  }


  private validateEventSelection(): boolean {
    if (!this.fechaReserva) {
      this.validationErrors.push('Debe seleccionar una fecha para el evento');
      return false;
    }
    const durationInHours = this.eventDurationHours;
    if (durationInHours < this.minDuration) {
      this.validationErrors.push(`La duración mínima del evento es de ${this.minDurationDisplay}`);
      return false;
    }
    if (durationInHours > this.maxDuration) {
      this.validationErrors.push(`La duración máxima del evento es de ${this.maxDurationDisplay}`);
      return false;
    }
    if (!this.isDayAvailableForEvent(this.fechaReserva)) {
      this.validationErrors.push('La fecha seleccionada no está disponible para eventos');
      return false;
    }
    return true;
  }

  clearSelectedSlots(): void {
    if (this.fechaReserva) {
      try {
        const currentDaySlots = this.getTimeSlotsForDay(this.fechaReserva);
        const allSlots = [
          ...currentDaySlots.morningSlots,
          ...currentDaySlots.afternoonSlots,
          ...currentDaySlots.nightSlots,
          ...currentDaySlots.operatingSlots
        ];        
        allSlots.forEach(slot => {
          slot.isSelected = false;
        });
      } catch (error) {
        console.warn('Error clearing slot selection:', error);
      }
    }
    this.selectedSlots.forEach(slot => slot.isSelected = false);
    this.selectedSlots = [];
    this.validationErrors = [];
    this.showValidationAlert = false;
  }

  async confirmSelection(): Promise<void> {
    if (this.dataTariff?.tipoCobro === 'por_evento') {
      await this.confirmEventSelection();
    } else {
      if (this.selectionMode === 'custom') {
        await this.confirmCustomTimeSelection();
      } else {
        await this.confirmTimeSlotSelection();
      }
    }
  }
  isDayOpenForCustomSelection(): boolean {
    const daySlots = this.getTimeSlotsForDay(this.fechaReserva);
    return daySlots.daySchedule?.abierto === true;
  }
  isDayAvailableForEvent(date: Date): boolean {
    if (date < new Date()) return false;    
    const daySlots = this.getTimeSlotsForDay(date);
    if (!daySlots.daySchedule?.abierto) return false;
    const durationInMinutes = this.eventDurationHours * 60;
    const availableSlots = [
      ...daySlots.morningSlots,
      ...daySlots.afternoonSlots, 
      ...daySlots.nightSlots
    ].filter(slot => slot.isAvailable && !slot.isReserved);
    let continuousTime = 0;
    for (let i = 0; i < availableSlots.length; i++) {
      const slot = availableSlots[i];
      const slotDuration = this.timeToMinutes(slot.endTime) - this.timeToMinutes(slot.startTime)
      if (slot.isAvailable && !slot.isReserved) {
        continuousTime += slotDuration;
        if (continuousTime >= durationInMinutes) {
          return true;
        }
      } else {
        continuousTime = 0;
      }
    }    
    return false;
  }

  private async confirmEventSelection(): Promise<void> {
    this.isCheckingAvailability = true;
    this.validationErrors = [];
    this.showValidationAlert = false;
    try {
      if (!this.validateEventSelection()) {
        this.showValidationAlert = true;
        return;
      }
      const durationInMinutes = this.eventDurationHours * 60;
      const bestTimeSlot = this.findBestTimeSlotForEvent(this.fechaReserva, durationInMinutes);
      
      if (!bestTimeSlot) {
        this.validationErrors.push('No se encontró un horario disponible para la duración seleccionada');
        this.showValidationAlert = true;
        return;
      }
      const timeRange: TimeRange = {
        date: this.fechaReserva,
        startTime: bestTimeSlot.startTime,
        endTime: bestTimeSlot.endTime
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
        start: bestTimeSlot.startTime, 
        end: bestTimeSlot.endTime 
      });
    } catch (error) {
      console.error('Error confirming event selection:', error);
      this.validationErrors.push('Error al verificar disponibilidad. Por favor, intente nuevamente.');
      this.showValidationAlert = true;
    } finally {
      this.isCheckingAvailability = false;
    }
  }

  getSlotProperty(daySlots: DaySlots, blockKey: string): TimeSlot[] {
    switch (blockKey) {
      case 'morning': return daySlots.morningSlots;
      case 'afternoon': return daySlots.afternoonSlots;
      case 'night': return daySlots.nightSlots;
      case 'operating': return daySlots.operatingSlots;
      default: return [];
    }
  }

  private findBestTimeSlotForEvent(date: Date, duration: number): { startTime: string; endTime: string } | null {
    const daySlots = this.getTimeSlotsForDay(date);
    const allSlots = [
      ...daySlots.morningSlots,
      ...daySlots.afternoonSlots,
      ...daySlots.nightSlots
    ].filter(slot => slot.isAvailable && !slot.isReserved);
    let currentStart: string | null = null;
    let accumulatedDuration = 0;
    for (let i = 0; i < allSlots.length; i++) {
      const slot = allSlots[i];      
      if (currentStart === null) {
        currentStart = slot.startTime;
      }      
      accumulatedDuration += this.timeToMinutes(slot.endTime) - this.timeToMinutes(slot.startTime)
      if (accumulatedDuration >= duration) {
        return {
          startTime: currentStart,
          endTime: slot.endTime
        };
      }
      if (i < allSlots.length - 1 && slot.endTime !== allSlots[i + 1].startTime) {
        currentStart = null;
        accumulatedDuration = 0;
      }
    }    
    return null;
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

  getSelectedSlotsInfo(): string {
    if (this.selectedSlots.length === 0) return '';    
    const startTime = this.selectedSlots[0].startTime.slice(0, 5);
    const endTime = this.selectedSlots[this.selectedSlots.length - 1].endTime.slice(0, 5);
    const duration = this.timeToMinutes(this.selectedSlots[this.selectedSlots.length - 1].endTime) - this.timeToMinutes(this.selectedSlots[0].startTime)
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    let durationStr = '';
    if (hours > 0) durationStr += `${hours}h `;
    if (minutes > 0) durationStr += `${minutes}min`;
    return `${startTime} - ${endTime} (${durationStr.trim()})`;
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

  private combineDateAndTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  private getDayName(date: Date): string {
    const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    return days[date.getDay()];
  }
  private getFullDayName(date: Date): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
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

  setSelectedDay(date: Date): void {
    this.clearSelectedSlots();
    this.fechaReserva = date;
    this.activeDayName = this.getDayName(date);
  }

  canSelectDay(day: WeekDay): boolean {
    if (this.dataTariff?.tipoCobro === 'por_evento') {
      return !day.isPast && this.isDayAvailableForEvent(day.date);
    }
    return !day.isPast;
  }

  trackBySlot(index: number, slot: TimeSlot): string {
    return `${slot.startTime}-${slot.endTime}`;
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
    } else if (this.dataTariff?.tipoCobro === 'por_evento') {
      if (this.isDayAvailableForEvent(day.date)) {
        classes.push('bg-success-subtle');
      } else {
        classes.push('bg-danger-subtle');
      }
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
}