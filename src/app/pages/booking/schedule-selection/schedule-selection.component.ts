import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { Tarifa } from 'src/app/core/models/tarifa.model';
import { Reserva } from 'src/app/core/models/reserva.models';
import { GlobalComponent } from 'src/app/global-component';
import { NgbModal, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HorarioFijo } from 'src/app/core/models/horarioFijo.model';
import { HorarioExcepcion } from 'src/app/core/models/horarioExcepcion.model';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';

interface TimeSlot {
  time: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isReserved: boolean;
  isPast: boolean;
  isSelected?: boolean;
  reservation?: Reserva;
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

interface ScheduleSelection {
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
  slots: TimeSlot[];
}

@Component({
  selector: 'app-schedule-selection',
  standalone: true,
  imports: [CommonModule, NgbNavModule, FormsModule],
  templateUrl: './schedule-selection.component.html',
  styleUrls: ['./schedule-selection.component.scss']
})
export class ScheduleSelectionComponent implements OnInit, OnChanges {
  @Input() dataField!: CampoDeportivo;
  @Input() dataTariff!: Tarifa;
  @Input() reservationsList: Reserva[] = [];
  @Input() anticipationHours: number = 2;
  
  @Output() horarioSelected = new EventEmitter<{ date: Date; start: string; end: string }>();
  @Output() openScheduleEmitter = new EventEmitter<void>();
  @Output() goBack = new EventEmitter<void>();

  readonly VALID_HOURS = GlobalComponent.VALID_HOURS || 24;
  readonly MORNING_END = 12;
  readonly AFTERNOON_END = 18;

  // Slot duration configuration
  slotDuration: number = 60;
  slotDurationOptions = [
    { value: 30, label: '30 minutos' },
    { value: 60, label: '1 hora' },
    { value: 90, label: '1.5 horas' },
    { value: 120, label: '2 horas' }
  ];

  // Week navigation
  weekDays: WeekDay[] = [];
  activeDayName: string = '';
  fechaReserva: Date = new Date();
  currentWeekStart: Date = new Date();
  currentWeekEnd: Date = new Date();
  
  // Selection management
  selectedSlots: TimeSlot[] = [];
  currentSelection: ScheduleSelection | null = null;
  selectionMode: 'single' | 'multiple' = 'multiple';
  
  // Validation
  validationErrors: string[] = [];
  showValidationAlert: boolean = false;
  
  // Cache
  private timeSlotsCache: Map<string, DaySlots> = new Map();

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initializeWeek();
    this.generateWeekDays();
    this.setDefaultSlotDuration();
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
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private setDefaultSlotDuration(): void {
    if (!this.dataTariff) return;
    
    // Set default based on tariff type
    const tipoReserva = this.dataTariff.tipoCobro;
    
    switch (tipoReserva) {
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

  // ============================================================================
  // SLOT DURATION MANAGEMENT
  // ============================================================================

  onSlotDurationChange(): void {
    this.clearCache();
    this.clearSelectedSlots();
    this.regenerateTimeSlots();
    this.cdr.detectChanges();
  }

  private regenerateTimeSlots(): void {
    this.weekDays = [];
    this.generateWeekDays();
    
    if (this.weekDays.length > 0) {
      this.setSelectedDay(this.fechaReserva);
    }
  }

  // ============================================================================
  // TIME SLOTS GENERATION
  // ============================================================================

  getTimeSlotsForDay(date: Date): DaySlots {
    const dateKey = `${date.toISOString().split('T')[0]}-${this.slotDuration}`;
    
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

    // Check if day is closed
    if (!daySchedule?.abierto && (!exceptions || exceptions.length === 0)) {
      return result;
    }

    // Get opening hours
    let horaApertura = daySchedule?.horaApertura || '08:00:00';
    let horaCierre = daySchedule?.horaCierre || '22:00:00';

    // Apply exceptions
    if (exceptions && exceptions.length > 0) {
      const exception = exceptions[0];
      if (exception.tipoExcepcion === 'cerrado') return result;
      if (exception.horaApertura) horaApertura = exception.horaApertura;
      if (exception.horaCierre) horaCierre = exception.horaCierre;
    }

    // Apply tariff restrictions
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

    // Generate time slots
    const slots = this.generateTimeSlots(date, horaApertura, horaCierre);
    
    // Categorize slots
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

    for (let minutes = startMinutes; minutes < endMinutes; minutes += this.slotDuration) {
      const slotStart = this.minutesToTime(minutes);
      const slotEnd = this.minutesToTime(Math.min(minutes + this.slotDuration, endMinutes));
      
      const slotDateTime = this.combineDateAndTime(date, slotStart);
      const isPast = slotDateTime < minReservationTime;
      
      const reservation = this.getReservationForSlot(date, slotStart, slotEnd);
      const isReserved = !!reservation;

      slots.push({
        time: `${slotStart.slice(0, 5)} - ${slotEnd.slice(0, 5)}`,
        startTime: slotStart,
        endTime: slotEnd,
        isAvailable: !isPast,
        isReserved: isReserved,
        isPast: isPast,
        isSelected: false,
        reservation: reservation
      });
    }

    return slots;
  }

  // ============================================================================
  // SLOT SELECTION
  // ============================================================================

  toggleSlotSelection(slot: TimeSlot): void {
    if (!slot.isAvailable || slot.isReserved) return;

    this.validationErrors = [];
    this.showValidationAlert = false;

    const index = this.selectedSlots.findIndex(s => 
      s.startTime === slot.startTime && s.endTime === slot.endTime
    );

    if (index > -1) {
      // Deselect slot
      this.selectedSlots.splice(index, 1);
      slot.isSelected = false;
    } else {
      // Select slot
      this.selectedSlots.push(slot);
      slot.isSelected = true;
    }

    // Sort by start time
    this.selectedSlots.sort((a, b) => 
      this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
    );

    // Update current selection
    this.updateCurrentSelection();
  }

  private updateCurrentSelection(): void {
    if (this.selectedSlots.length === 0) {
      this.currentSelection = null;
      return;
    }

    const startTime = this.selectedSlots[0].startTime;
    const endTime = this.selectedSlots[this.selectedSlots.length - 1].endTime;
    const duration = this.calculateDuration(startTime, endTime);

    this.currentSelection = {
      date: this.fechaReserva,
      startTime: startTime,
      endTime: endTime,
      duration: duration,
      slots: [...this.selectedSlots]
    };
  }

  clearSelectedSlots(): void {
    this.selectedSlots.forEach(slot => slot.isSelected = false);
    this.selectedSlots = [];
    this.currentSelection = null;
    this.validationErrors = [];
    this.showValidationAlert = false;
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  confirmSelection(): void {
    this.validationErrors = [];
    this.showValidationAlert = false;

    if (!this.validateSelection()) {
      this.showValidationAlert = true;
      return;
    }

    const startTime = this.selectedSlots[0].startTime;
    const endTime = this.selectedSlots[this.selectedSlots.length - 1].endTime;

    this.horarioSelected.emit({ 
      date: this.fechaReserva, 
      start: startTime, 
      end: endTime 
    });
  }

  private validateSelection(): boolean {
    // Check if any slots selected
    if (this.selectedSlots.length === 0) {
      this.validationErrors.push('Debe seleccionar al menos un horario');
      return false;
    }

    // Check if slots are consecutive
    if (!this.areConsecutiveSlots(this.selectedSlots)) {
      this.validationErrors.push('Los horarios seleccionados deben ser consecutivos');
      return false;
    }

    // Check minimum duration for tariff type
    const duration = this.calculateDuration(
      this.selectedSlots[0].startTime,
      this.selectedSlots[this.selectedSlots.length - 1].endTime
    );

    const tipoReserva = this.dataTariff.tipoCobro;
    
    if (tipoReserva === 'por_hora' && duration < 60) {
      this.validationErrors.push('La duración mínima para reservas por hora es de 60 minutos');
      return false;
    }

    // Check auto-approval limits
    if (this.dataField?.requiereAprobacion) {
      const maxDuration = this.dataField.maxDuracionAutoAprobacion || 120;
      if (duration > maxDuration) {
        this.validationErrors.push(
          `Las reservas de más de ${maxDuration} minutos requieren aprobación del administrador`
        );
        // This is just a warning, not an error
      }
    }

    return this.validationErrors.length === 0;
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

    // Check if selected slots are still available
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

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

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

  private getReservationForSlot(date: Date, startTime: string, endTime: string): Reserva | undefined {
    if (!this.reservationsList || this.reservationsList.length === 0) return undefined;
    
    const dateStr = date.toISOString().split('T')[0];
    
    return this.reservationsList.find(reserva => {
      if (!reserva.reservaPuntualDto) return false;
      
      const reservaDate = new Date(reserva.reservaPuntualDto.fechaUso).toISOString().split('T')[0];
      if (reservaDate !== dateStr) return false;
      
      const reservaStart = reserva.reservaPuntualDto.horaInicio;
      const reservaEnd = reserva.reservaPuntualDto.horaFin;
      
      return this.timesOverlap(startTime, endTime, reservaStart, reservaEnd);
    });
  }

  private timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const s1 = this.timeToMinutes(start1);
    const e1 = this.timeToMinutes(end1);
    const s2 = this.timeToMinutes(start2);
    const e2 = this.timeToMinutes(end2);
    return s1 < e2 && s2 < e1;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
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
    const newStart = new Date(this.currentWeekStart);
    newStart.setDate(newStart.getDate() + (direction * 7));
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (newStart >= today || direction > 0) {
      this.currentWeekStart = newStart;
      this.currentWeekEnd = new Date(this.currentWeekStart);
      this.currentWeekEnd.setDate(this.currentWeekStart.getDate() + 6);
      
      this.clearCache();
      this.clearSelectedSlots();
      this.generateWeekDays();
      
      if (this.weekDays.length > 0) {
        this.setSelectedDay(this.weekDays[0].date);
      }
    }
  }

  goToToday(): void {
    this.initializeWeek();
    this.clearCache();
    this.clearSelectedSlots();
    this.generateWeekDays();
  }

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

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

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