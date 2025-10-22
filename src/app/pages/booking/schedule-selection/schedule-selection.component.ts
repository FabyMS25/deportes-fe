import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Tarifa } from 'src/app/core/models/tarifa.model';
import { Reserva } from 'src/app/core/models/reserva.models';
import { GlobalComponent } from 'src/app/global-component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { HorarioFijo } from 'src/app/core/models/horarioFijo.model';
import { HorarioExcepcion } from 'src/app/core/models/horarioExcepcion.model';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { ReservationConflictService, TimeRange } from '../reservation-conflict.service';
import { ScheduleStateService } from '../schedule-state.service';
import { Subject, takeUntil } from 'rxjs';

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
}
interface DaySlots {
  morningSlots: TimeSlot[];
  afternoonSlots: TimeSlot[];
  nightSlots: TimeSlot[];
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
  @Input() anticipationHours: number = 48;
  
  @Output() horarioSelected = new EventEmitter<{ date: Date; start: string; end: string }>();
  @Output() openScheduleEmitter = new EventEmitter<void>();
  @Output() goBack = new EventEmitter<void>();

  readonly VALID_HOURS = GlobalComponent.VALID_HOURS || 24;
  readonly MORNING_END = 12;
  readonly AFTERNOON_END = 18;

  slotDuration: number = 60;
  slotDurationOptions = [
    { value: 30, label: '30 minutos' },
    { value: 60, label: '1 hora' },
    { value: 90, label: '1.5 horas' },
    { value: 120, label: '2 horas' }
  ];

  weekDays: WeekDay[] = [];
  activeDayName: string = '';
  fechaReserva: Date = new Date();
  currentWeekStart: Date = new Date();
  currentWeekEnd: Date = new Date();
  private destroy$ = new Subject<void>();
  selectedSlots: TimeSlot[] = [];
  
  validationErrors: string[] = [];
  showValidationAlert: boolean = false;
  isCheckingAvailability: boolean = false;
  private timeSlotsCache: Map<string, DaySlots> = new Map();

  constructor(
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

    this.initializeWeek();
    this.generateWeekDays();
    this.setDefaultSlotDuration();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reservationsList'] && !changes['reservationsList'].firstChange) {
      this.clearCache();
      this.generateWeekDays();
      this.revalidateSelection();
    }
    
    if (changes['dataTariff'] && !changes['dataTariff'].firstChange) {
      this.setDefaultSlotDuration();
      this.clearCache();
      this.clearSelectedSlots();
      this.generateWeekDays();
    }

    if (changes['dataField'] && !changes['dataField'].firstChange) {
      this.clearCache();
      this.clearSelectedSlots();
      this.generateWeekDays();
    }
  }

  private setDefaultSlotDuration(): void {
    if (!this.dataTariff) return;
    
    switch (this.dataTariff.tipoCobro) {
      case 'por_hora':
        this.slotDuration = 60;
        break;
      case 'por_persona':
        this.slotDuration = 60;
        break;
      case 'por_evento':
        this.slotDuration = 120;
        break;
      default:
        this.slotDuration = 60;
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

  onSlotDurationChange(newDuration?: number): void {
    if (newDuration !== undefined) {
      this.slotDuration = newDuration;
    }
    if (typeof this.slotDuration === 'string') {
      this.slotDuration = parseInt(this.slotDuration, 10);
      console.log('Converted string to number:', this.slotDuration);
    }
    
    if (!this.slotDuration || this.slotDuration <= 0) {
      console.error('Invalid slot duration:', this.slotDuration);
      return;
    }
    this.timeSlotsCache.clear();
    console.log('Cache cleared');
    
    this.clearSelectedSlots();
    console.log('Selected slots cleared');
    
    // Store current date
    const currentDate = new Date(this.fechaReserva);
    console.log('Stored current date:', currentDate);
    
    setTimeout(() => {      
      this.weekDays = [];
      this.generateWeekDays();      
      const matchingDay = this.weekDays.find(d => 
        d.date.toDateString() === currentDate.toDateString()
      );      
      if (matchingDay) {
        this.fechaReserva = new Date(matchingDay.date);
        this.activeDayName = matchingDay.name;
        console.log('Restored matching day:', this.activeDayName);
      } else if (this.weekDays.length > 0) {
        this.fechaReserva = new Date(this.weekDays[0].date);
        this.activeDayName = this.weekDays[0].name;
        console.log('Set to first day:', this.activeDayName);
      }
      const daySlots = this.getTimeSlotsForDay(this.fechaReserva);
      console.log('Slots for selected day:', {
        morning: daySlots.morningSlots.length,
        afternoon: daySlots.afternoonSlots.length,
        night: daySlots.nightSlots.length,
        total: daySlots.morningSlots.length + daySlots.afternoonSlots.length + daySlots.nightSlots.length
      });
      
      // Force UI update
      this.cdr.detectChanges();
      console.log('=== Slot Duration Change Completed ===');
    }, 0);
  }

  private regenerateTimeSlots(): void {
    this.timeSlotsCache.clear();
    
    const currentDate = new Date(this.fechaReserva);
    const currentDayName = this.activeDayName;
    
    this.weekDays = [];
    this.generateWeekDays();
    
    if (this.weekDays.length > 0) {
      const matchingDay = this.weekDays.find(d => d.name === currentDayName);
      if (matchingDay) {
        this.fechaReserva = new Date(matchingDay.date);
        this.activeDayName = matchingDay.name;
      } else {
        this.setSelectedDay(this.weekDays[0].date);
      }
    }
  }

  getTimeSlotsForDay(date: Date): DaySlots {
    const dateKey = `${date.toISOString().split('T')[0]}-${this.slotDuration}-${this.dataTariff?.uuid || 'no-tariff'}`;
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
      daySchedule: daySchedule,
      exceptions: exceptions
    };

    if (!daySchedule?.abierto && (!exceptions || exceptions.length === 0)) {
      return result;
    }

    let horaApertura = daySchedule?.horaApertura || '08:00:00';
    let horaCierre = daySchedule?.horaCierre || '22:00:00';

    if (exceptions && exceptions.length > 0) {
      const exception = exceptions[0];
      if (exception.tipoExcepcion === 'cerrado') return result;
      if (exception.horaApertura) horaApertura = exception.horaApertura;
      if (exception.horaCierre) horaCierre = exception.horaCierre;
    }

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

    const slots = this.generateTimeSlots(date, horaApertura, horaCierre);
    
    slots.forEach(slot => {
      const hour = parseInt(slot.startTime.split(':')[0]);
      if (hour < this.MORNING_END) {
        result.morningSlots.push(slot);
      } else if (hour < this.AFTERNOON_END) {
        result.afternoonSlots.push(slot);
      } else {
        result.nightSlots.push(slot);
      }
    });

    return result;
  }

  private generateTimeSlots(date: Date, startTime: string, endTime: string): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const now = new Date();
    const minReservationTime = new Date(now.getTime() + this.anticipationHours * 60 * 60 * 1000);

    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    console.log('Generating slots:', {
      date: date.toISOString().split('T')[0],
      startTime,
      endTime,
      startMinutes,
      endMinutes,
      slotDuration: this.slotDuration,
      expectedSlots: Math.floor((endMinutes - startMinutes) / this.slotDuration)
    });

    for (let minutes = startMinutes; minutes < endMinutes; minutes += this.slotDuration) {
      const slotStart = this.minutesToTime(minutes);
      const slotEnd = this.minutesToTime(Math.min(minutes + this.slotDuration, endMinutes));
      
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
      
      const slot: TimeSlot = {
        time: `${slotStart.slice(0, 5)} - ${slotEnd.slice(0, 5)}`,
        startTime: slotStart,
        endTime: slotEnd,
        isAvailable: !isPast && !conflictResult.hasConflict,
        isReserved: conflictResult.hasConflict,
        isPast: isPast,
        isSelected: false,
        reservation: conflictResult.conflictingReservations[0],
        conflictReason: conflictResult.reason
      };
      
      slots.push(slot);
    }
    return slots;
  }

  toggleSlotSelection(slot: TimeSlot): void {
    if (!slot.isAvailable || slot.isReserved) {
      if (slot.conflictReason) {
        this.validationErrors = [slot.conflictReason];
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

  clearSelectedSlots(): void {
    // Get current day slots to clear their selection state
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
    this.isCheckingAvailability = true;
    this.validationErrors = [];
    this.showValidationAlert = false;

    try {
      if (!this.validateSelection()) {
        this.showValidationAlert = true;
        return;
      }

      const startTime = this.selectedSlots[0].startTime;
      const endTime = this.selectedSlots[this.selectedSlots.length - 1].endTime;

      // Final validation using the conflict service
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

  private validateSelection(): boolean {
    if (this.selectedSlots.length === 0) {
      this.validationErrors.push('Debe seleccionar al menos un horario');
      return false;
    }

    if (!this.areConsecutiveSlots(this.selectedSlots)) {
      this.validationErrors.push('Los horarios seleccionados deben ser consecutivos');
      return false;
    }

    const duration = this.calculateDuration(
      this.selectedSlots[0].startTime,
      this.selectedSlots[this.selectedSlots.length - 1].endTime
    );
    if (this.dataTariff.tipoCobro === 'por_hora' && duration < 60) {
      this.validationErrors.push('La duración mínima para reservas por hora es de 60 minutos');
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

    // Validate event duration limits
    if (this.dataTariff.tipoCobro === 'por_evento') {
      const maxEventDuration = (GlobalComponent.MAX_DURATION_EVENT || 12) * 60;
      if (duration > maxEventDuration) {
        this.validationErrors.push(`La duración máxima para eventos es de ${maxEventDuration / 60} horas`);
        return false;
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
    const duration = this.calculateDuration(
      this.selectedSlots[0].startTime,
      this.selectedSlots[this.selectedSlots.length - 1].endTime
    );
    
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    let durationStr = '';
    if (hours > 0) durationStr += `${hours}h `;
    if (minutes > 0) durationStr += `${minutes}min`;
    
    return `${startTime} - ${endTime} (${durationStr.trim()})`;
  }

  private calculateDuration(startTime: string, endTime: string): number {
    return this.timeToMinutes(endTime) - this.timeToMinutes(startTime);
  }

  private getHorarioForDate(date: Date): HorarioFijo | undefined {
    if (!this.dataField?.horariosFijosDtoList) return undefined;
    
    const dayOfWeek = date.getDay();
    let diaKey: string;
    
    if (dayOfWeek === 0) diaKey = 'domingo';
    else if (dayOfWeek === 6) diaKey = 'sabado';
    else diaKey = 'lunes_viernes';
    
    return this.dataField.horariosFijosDtoList.find(h => h.dia === diaKey);
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

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  moveWeek(direction: number): void {
    this.scheduleState.moveWeek(direction);
    this.clearCache();
    this.clearSelectedSlots();
    this.generateWeekDays();
    
    if (this.weekDays.length > 0) {
      this.setSelectedDay(this.weekDays[0].date);
    }
  }

  goToToday(): void {
    this.scheduleState.goToToday();
    this.clearCache();
    this.clearSelectedSlots();
    this.generateWeekDays();
  }
  // moveWeek(direction: number): void {
  //   const newStart = new Date(this.currentWeekStart);
  //   newStart.setDate(newStart.getDate() + (direction * 7));
    
  //   const today = new Date();
  //   today.setHours(0, 0, 0, 0);
    
  //   if (newStart >= today || direction > 0) {
  //     this.currentWeekStart = newStart;
  //     this.currentWeekEnd = new Date(this.currentWeekStart);
  //     this.currentWeekEnd.setDate(this.currentWeekStart.getDate() + 6);
      
  //     this.clearCache();
  //     this.clearSelectedSlots();
  //     this.generateWeekDays();
      
  //     if (this.weekDays.length > 0) {
  //       this.setSelectedDay(this.weekDays[0].date);
  //     }
  //   }
  // }

  // goToToday(): void {
  //   this.initializeWeek();
  //   this.clearCache();
  //   this.clearSelectedSlots();
  //   this.generateWeekDays();
  // }

  setSelectedDay(date: Date): void {
    this.clearSelectedSlots();
    this.fechaReserva = date;
    this.activeDayName = this.getDayName(date);
  }

  canSelectDay(day: WeekDay): boolean {
    return !day.isPast;
  }

  // ============================================================================
  // UI HELPERS
  // ============================================================================

  trackBySlot(index: number, slot: TimeSlot): string {
    return `${slot.startTime}-${slot.endTime}`;
  }

  getSlotClasses(slot: TimeSlot): string {
    if (slot.isSelected) return 'border-primary bg-primary text-white';
    if (!slot.isAvailable) return 'border-secondary bg-light text-muted';
    if (slot.isReserved) return 'border-danger bg-danger-subtle text-danger';
    return 'border-success bg-success-subtle text-success cursor-pointer hover-effect';
  }

  getSlotTextClasses(slot: TimeSlot): string {
    if (slot.isSelected) return 'text-white fw-medium';
    if (!slot.isAvailable) return 'text-muted';
    if (slot.isReserved) return 'text-danger';
    return 'text-success';
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

  openScheduleModal(): void {
    this.openScheduleEmitter.emit();
  }

  back(): void {
    this.goBack.emit();
  }

  private clearCache(): void {
    this.timeSlotsCache.clear();
  }
}