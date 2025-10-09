import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Tarifa } from 'src/app/core/models/tarifa.model';
import { FormsModule } from '@angular/forms';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { Reserva } from 'src/app/core/models/reserva.models';

interface DayHorario {
  dia: string;
  diaDisplay: string;
  selected: boolean;
  horaInicio: string;
  horaFin: string;
}

interface RecurrentScheduleData {
  tipoRecurrencia: 'semanal' | 'mensual';
  fechaInicio: Date;
  fechaFin: Date;
  diasSeleccionados: DayHorario[];
  tablero: string[][];
  cantidadSesiones: number;
  duracionSesionHoras: number;
  diasSemana: string;
}

@Component({
  selector: 'app-schedule-recurrent-selection',
  standalone: true,
  imports: [CommonModule, NgbNavModule, FormsModule],
  templateUrl: './schedule-recurrent-selection.component.html',
  styleUrl: './schedule-recurrent-selection.component.scss'
})
export class ScheduleRecurrentSelectionComponent implements OnInit {
  @Input() dataField!: CampoDeportivo;
  @Input() dataTariff!: Tarifa;
  @Input() reservationsList: Reserva[] = [];
  
  @Output() scheduleCompleted = new EventEmitter<RecurrentScheduleData>();
  @Output() goBack = new EventEmitter<void>();

  // Configuration
  tipoRecurrencia: 'semanal' | 'mensual' = 'mensual';
  fechaInicio: string = '';
  fechaFin: string = '';
  
  // Days of week
  diasSemana: DayHorario[] = [
    { dia: 'lunes', diaDisplay: 'Lunes', selected: false, horaInicio: '08:00', horaFin: '09:00' },
    { dia: 'martes', diaDisplay: 'Martes', selected: false, horaInicio: '08:00', horaFin: '09:00' },
    { dia: 'miercoles', diaDisplay: 'Miércoles', selected: false, horaInicio: '08:00', horaFin: '09:00' },
    { dia: 'jueves', diaDisplay: 'Jueves', selected: false, horaInicio: '08:00', horaFin: '09:00' },
    { dia: 'viernes', diaDisplay: 'Viernes', selected: false, horaInicio: '08:00', horaFin: '09:00' },
    { dia: 'sabado', diaDisplay: 'Sábado', selected: false, horaInicio: '08:00', horaFin: '09:00' },
    { dia: 'domingo', diaDisplay: 'Domingo', selected: false, horaInicio: '08:00', horaFin: '09:00' }
  ];

  // Calendar view
  tablero: string[][] = [];
  calendarMonths: any[] = [];
  
  // Time constraints
  minTime = '06:00';
  maxTime = '23:00';
  
  // Validation
  errorMessage = '';

  ngOnInit(): void {
    this.initializeDates();
    this.loadFieldConstraints();
    this.generateCalendar();
  }

  // ==================== INITIALIZATION ====================

  private initializeDates(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Start next week
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 7);
    this.fechaInicio = this.formatDateForInput(startDate);
    
    // Default: 1 month
    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + 1);
    this.fechaFin = this.formatDateForInput(endDate);
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private parseDateFromInput(dateString: string): Date {
    return new Date(dateString + 'T00:00:00');
  }

  get fechaInicioDate(): Date {
    return this.parseDateFromInput(this.fechaInicio);
  }

  get fechaFinDate(): Date {
    return this.parseDateFromInput(this.fechaFin);
  }

  private loadFieldConstraints(): void {
    // Get available hours from field schedule
    const horarioLV = this.dataField?.horariosFijosDtoList?.find(
      h => h.dia === 'lunes_viernes' && h.abierto
    );
    
    if (horarioLV) {
      this.minTime = horarioLV.horaApertura?.slice(0, 5) || '06:00';
      this.maxTime = horarioLV.horaCierre?.slice(0, 5) || '23:00';
    }
    
    // Apply tariff constraints
    if (this.dataTariff?.desde) {
      const tarifaMin = this.dataTariff.desde.slice(0, 5);
      if (tarifaMin > this.minTime) this.minTime = tarifaMin;
    }
    
    if (this.dataTariff?.hasta) {
      const tarifaMax = this.dataTariff.hasta.slice(0, 5);
      if (tarifaMax < this.maxTime) this.maxTime = tarifaMax;
    }
  }

  // ==================== CALENDAR GENERATION ====================

  generateCalendar(): void {
    if (!this.fechaInicio || !this.fechaFin) return;
    
    this.calendarMonths = [];
    this.tablero = [];
    
    const start = this.fechaInicioDate;
    const end = this.fechaFinDate;
    
    // Generate months between dates
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    
    while (current <= lastMonth) {
      this.calendarMonths.push(this.generateMonth(new Date(current)));
      current.setMonth(current.getMonth() + 1);
    }
    
    this.initializeTablero();
  }

  private generateMonth(date: Date): any {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const weeks: any[] = [];
    let week: any[] = [];
    
    // Fill initial empty days
    const startDay = firstDay.getDay();
    for (let i = 0; i < startDay; i++) {
      week.push({ empty: true });
    }
    
    // Fill days of month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const currentDate = new Date(year, month, day);
      const isInRange = currentDate >= this.fechaInicioDate && currentDate <= this.fechaFinDate;
      const dayOfWeek = currentDate.getDay();
      const dayName = this.getDayName(dayOfWeek);
      const dayConfig = this.diasSemana.find(d => d.dia === dayName);
      const hasSchedule = !!(dayConfig?.selected);
      const isReserved = hasSchedule && this.checkReservationConflicts(currentDate);
      
      week.push({
        date: currentDate,
        day: day,
        isInRange: isInRange,
        isSelectable: isInRange && dayConfig?.selected,
        dayOfWeek: dayOfWeek,
        dayName: dayName,
        hasSchedule: hasSchedule,
        isReserved: isReserved
      });
      
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    
    // Fill remaining empty days
    while (week.length > 0 && week.length < 7) {
      week.push({ empty: true });
    }
    if (week.length > 0) {
      weeks.push(week);
    }
    
    return {
      year: year,
      month: month,
      monthName: this.getMonthName(month),
      weeks: weeks
    };
  }

  private initializeTablero(): void {
    // Tablero structure for recurrent reservations: [day_of_week][time_slot]
    // 7 days (0=Sunday, 1=Monday, ..., 6=Saturday)
    this.tablero = Array(7).fill(null).map(() => []);
    
    // Populate based on selected days
    this.diasSemana.forEach((dia, index) => {
      if (dia.selected) {
        // Convert day name to tablero index (0=Sunday, 1=Monday, etc.)
        const tableroIndex = this.getTableroIndex(dia.dia);
        if (tableroIndex !== -1) {
          this.tablero[tableroIndex] = [`${dia.horaInicio}-${dia.horaFin}`];
        }
      }
    });
  }

  private getTableroIndex(diaName: string): number {
    const dayMap: {[key: string]: number} = {
      'domingo': 0,
      'lunes': 1,
      'martes': 2,
      'miercoles': 3,
      'jueves': 4,
      'viernes': 5,
      'sabado': 6
    };
    return dayMap[diaName] || -1;
  }

  // ==================== DAY SELECTION ====================

  toggleDay(dia: DayHorario): void {
    dia.selected = !dia.selected;
    this.generateCalendar();
    this.validateSchedule();
  }

  toggleDateInCalendar(dayCell: any): void {
    if (!dayCell.isInRange || dayCell.empty) return;
    
    const dayConfig = this.diasSemana.find(d => d.dia === dayCell.dayName);
    if (!dayConfig) return;
    
    // Toggle the day selection
    dayConfig.selected = !dayConfig.selected;
    this.generateCalendar();
    this.validateSchedule();
  }

  updateDayTime(dia: DayHorario): void {
    if (!this.validateTimeRange(dia.horaInicio, dia.horaFin)) {
      this.errorMessage = 'La hora de fin debe ser mayor que la hora de inicio';
      return;
    }
    
    this.errorMessage = '';
    this.initializeTablero();
    this.calculateSessionInfo();
  }

  // ==================== DATE MANAGEMENT ====================

  onFechaInicioChange(): void {
    if (this.fechaInicio >= this.fechaFin) {
      const newEnd = new Date(this.fechaInicio + 'T00:00:00');
      newEnd.setMonth(newEnd.getMonth() + 1);
      this.fechaFin = this.formatDateForInput(newEnd);
    }
    this.generateCalendar();
    this.calculateSessionInfo();
  }

  onFechaFinChange(): void {
    const startDate = this.fechaInicioDate;
    const endDate = this.fechaFinDate;
    
    if (endDate <= startDate) {
      this.errorMessage = 'La fecha de fin debe ser posterior a la fecha de inicio';
      return;
    }
    
    // Validate maximum duration (e.g., 6 months)
    const maxMonths = 6;
    const maxDate = new Date(startDate);
    maxDate.setMonth(maxDate.getMonth() + maxMonths);
    
    if (endDate > maxDate) {
      this.errorMessage = `La reserva no puede exceder ${maxMonths} meses`;
      this.fechaFin = this.formatDateForInput(maxDate);
    } else {
      this.errorMessage = '';
    }
    
    this.generateCalendar();
    this.calculateSessionInfo();
  }

  // ==================== CALCULATIONS ====================

  calculateSessionInfo(): number {
    const selectedDays = this.diasSemana.filter(d => d.selected);
    if (selectedDays.length === 0) return 0;
    
    // Calculate number of weeks between dates
    const start = this.fechaInicioDate;
    const end = this.fechaFinDate;
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weeks = Math.ceil(diffDays / 7);
    
    return weeks * selectedDays.length;
  }

  calculateTotalHours(): number {
    let totalHours = 0;
    
    this.diasSemana.forEach(dia => {
      if (dia.selected) {
        const duration = this.calculateDuration(dia.horaInicio, dia.horaFin);
        const sessions = this.calculateSessionInfo() || 0;
        totalHours += duration * (sessions / this.diasSemana.filter(d => d.selected).length);
      }
    });
    
    return totalHours;
  }

  calculateDuration(start: string, end: string): number {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    return (endMinutes - startMinutes) / 60;
  }

  // ==================== VALIDATION ====================

  private validateSchedule(): boolean {
    this.errorMessage = '';
    
    const selectedDays = this.diasSemana.filter(d => d.selected);
    
    if (selectedDays.length === 0) {
      this.errorMessage = 'Debe seleccionar al menos un día de la semana';
      return false;
    }
    
    // Validate each selected day has valid times
    for (const dia of selectedDays) {
      if (!this.validateTimeRange(dia.horaInicio, dia.horaFin)) {
        this.errorMessage = `Horario inválido para ${dia.diaDisplay}`;
        return false;
      }
      
      if (!this.isTimeInRange(dia.horaInicio) || !this.isTimeInRange(dia.horaFin)) {
        this.errorMessage = `El horario para ${dia.diaDisplay} debe estar entre ${this.minTime} y ${this.maxTime}`;
        return false;
      }
    }
    
    // Check for conflicts with existing reservations
    if (this.hasConflicts()) {
      this.errorMessage = 'Existe un conflicto con reservas existentes';
      return false;
    }
    
    return true;
  }

  private validateTimeRange(start: string, end: string): boolean {
    return start < end;
  }

  private isTimeInRange(time: string): boolean {
    return time >= this.minTime && time <= this.maxTime;
  }

  private hasScheduleForDate(date: Date): boolean {
    const dayOfWeek = date.getDay();
    const dayName = this.getDayName(dayOfWeek);
    const dayConfig = this.diasSemana.find(d => d.dia === dayName);
    
    return !!dayConfig?.selected;
  }

  // ==================== CONFLICT DETECTION ====================

  private checkReservationConflicts(date: Date): boolean {
    if (!this.reservationsList || this.reservationsList.length === 0) {
      return false;
    }

    const checkDate = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const dayName = this.getDayName(dayOfWeek);
    const dayConfig = this.diasSemana.find(d => d.dia === dayName);

    if (!dayConfig?.selected) {
      return false;
    }

    // Check if there's any reservation conflict for this date
    return this.reservationsList.some(reserva => {
      // Skip recurrent reservations for conflict checking (they'll be handled separately)
      if (reserva.tipoReserva === 'recurrente') return false;
      
      const reservaDate = new Date(reserva.fechaReserva);
      const reservaDateStr = reservaDate.toISOString().split('T')[0];
      
      if (reservaDateStr === checkDate) {
        // Check time conflict - for puntual reservations
        if (reserva.reservaPuntualDto) {
          const reservaStart = reserva.reservaPuntualDto?.horaInicio?.slice(0, 5) || '00:00';
          const reservaEnd = reserva.reservaPuntualDto?.horaFin?.slice(0, 5) || '23:59';
          
          return this.hasTimeConflict(
            dayConfig.horaInicio, 
            dayConfig.horaFin, 
            reservaStart, 
            reservaEnd
          );
        }
      }
      
      return false;
    });
  }

  private hasTimeConflict(start1: string, end1: string, start2: string, end2: string): boolean {
    return start1 < end2 && start2 < end1;
  }

  private hasConflicts(): boolean {
    // Check all dates in range for conflicts
    const start = this.fechaInicioDate;
    const end = this.fechaFinDate;
    const current = new Date(start);
    
    while (current <= end) {
      if (this.checkReservationConflicts(new Date(current))) {
        return true;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return false;
  }

  // ==================== HELPERS ====================

  getDayTime(dayName: string): string {
    const dayConfig = this.diasSemana.find(d => d.dia === dayName);
    if (dayConfig && dayConfig.selected) {
      return `${dayConfig.horaInicio} - ${dayConfig.horaFin}`;
    }
    return '';
  }

  private getDayName(dayOfWeek: number): string {
    const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    return days[dayOfWeek];
  }

  private getMonthName(month: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month];
  }

  // ==================== ACTIONS ====================

  confirmar(): void {
    if (!this.validateSchedule()) {
      return;
    }
    
    const selectedDays = this.diasSemana.filter(d => d.selected);
    const totalSessions = this.calculateSessionInfo() || 0;
    const diasSemanaString = selectedDays.map(d => d.dia).join(',');
    
    const scheduleData: RecurrentScheduleData = {
      tipoRecurrencia: this.tipoRecurrencia,
      fechaInicio: this.fechaInicioDate,
      fechaFin: this.fechaFinDate,
      diasSeleccionados: selectedDays,
      tablero: this.tablero,
      cantidadSesiones: totalSessions,
      duracionSesionHoras: this.calculateAverageDuration(),
      diasSemana: diasSemanaString
    };
    
    this.scheduleCompleted.emit(scheduleData);
  }

  private calculateAverageDuration(): number {
    const selectedDays = this.diasSemana.filter(d => d.selected);
    if (selectedDays.length === 0) return 0;
    
    const totalDuration = selectedDays.reduce((sum, dia) => {
      return sum + this.calculateDuration(dia.horaInicio, dia.horaFin);
    }, 0);
    
    return totalDuration / selectedDays.length;
  }

  back(): void {
    this.goBack.emit();
  }

  // ==================== GETTERS ====================

  get selectedDaysCount(): number {
    return this.diasSemana.filter(d => d.selected).length;
  }

  get totalSessions(): number {
    return this.calculateSessionInfo() || 0;
  }

  get totalHours(): number {
    return this.calculateTotalHours();
  }

  get diasSeleccionadosString(): string {
    return this.diasSemana
      .filter(d => d.selected)
      .map(d => d.diaDisplay)
      .join(', ');
  }

  get canConfirm(): boolean {
    return this.selectedDaysCount > 0 && !this.errorMessage;
  }
}