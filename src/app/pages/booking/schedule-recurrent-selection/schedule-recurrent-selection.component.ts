import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';

import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { ReservaRecurrente } from 'src/app/core/models/reservaRecurrente.models';
import { Reserva } from 'src/app/core/models/reserva.models';
import { Tarifa } from 'src/app/core/models/tarifa.model';

interface TimeSlot {
  horaInicio: string;
  horaFin: string;
}

interface DayConfig {
  dia: string;
  diaDisplay: string;
  selected: boolean;
  horarios: TimeSlot[];
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
  
  @Output() scheduleCompleted = new EventEmitter<ReservaRecurrente>();
  @Output() goBack = new EventEmitter<void>();

  tipoRecurrencia: string = '';
  fechaInicio: string = '';
  fechaFin: string = '';
  
  diasSemana: DayConfig[] = [
    { dia: 'lunes', diaDisplay: 'Lunes', selected: false, horarios: [{ horaInicio: '08:00', horaFin: '09:00' }] },
    { dia: 'martes', diaDisplay: 'Martes', selected: false, horarios: [{ horaInicio: '08:00', horaFin: '09:00' }] },
    { dia: 'miercoles', diaDisplay: 'Miércoles', selected: false, horarios: [{ horaInicio: '08:00', horaFin: '09:00' }] },
    { dia: 'jueves', diaDisplay: 'Jueves', selected: false, horarios: [{ horaInicio: '08:00', horaFin: '09:00' }] },
    { dia: 'viernes', diaDisplay: 'Viernes', selected: false, horarios: [{ horaInicio: '08:00', horaFin: '09:00' }] },
    { dia: 'sabado', diaDisplay: 'Sábado', selected: false, horarios: [{ horaInicio: '08:00', horaFin: '09:00' }] },
    { dia: 'domingo', diaDisplay: 'Domingo', selected: false, horarios: [{ horaInicio: '08:00', horaFin: '09:00' }] }
  ];

  // Calendar view
  tablero: string[][] = []; // Starting from Monday (0=Monday, 6=Sunday)
  calendarMonths: any[] = [];
  
  minTime = '06:00';
  maxTime = '23:00';
  
  errorMessage = '';

  ngOnInit(): void {
    console.log(this.reservationsList);
    this.initializeDates();
    this.loadFieldConstraints();
    this.generateCalendar();
  }

  private initializeDates(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 7);
    this.fechaInicio = this.formatDateForInput(startDate);
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
    const horarioLV = this.dataField?.horariosFijosDtoList?.find(
      h => h.dia === 'lunes_viernes' && h.abierto
    );    
    if (horarioLV) {
      this.minTime = horarioLV.horaApertura?.slice(0, 5) || '06:00';
      this.maxTime = horarioLV.horaCierre?.slice(0, 5) || '23:00';
    }
    if (this.dataTariff?.desde) {
      const tarifaMin = this.dataTariff.desde.slice(0, 5);
      if (tarifaMin > this.minTime) this.minTime = tarifaMin;
    }
    
    if (this.dataTariff?.hasta) {
      const tarifaMax = this.dataTariff.hasta.slice(0, 5);
      if (tarifaMax < this.maxTime) this.maxTime = tarifaMax;
    }
  }

  generateCalendar(): void {
    if (!this.fechaInicio || !this.fechaFin) return;
    this.calendarMonths = [];
    this.tablero = [];
    const start = this.fechaInicioDate;
    const end = this.fechaFinDate;
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
    const startDay = firstDay.getDay();
    for (let i = 0; i < startDay; i++) {
      week.push({ empty: true });
    }
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
    // Tablero structure: 7 days starting from Monday (0=Monday, 6=Sunday)
    this.tablero = Array(7).fill(null).map(() => []);
    
    // Populate based on selected days and their time slots
    this.diasSemana.forEach((dia) => {
      if (dia.selected && dia.horarios.length > 0) {
        const tableroIndex = this.getTableroIndex(dia.dia);
        if (tableroIndex !== -1) {
          // Add all time slots for this day
          this.tablero[tableroIndex] = dia.horarios.map(
            horario => `${horario.horaInicio}-${horario.horaFin}`
          );
        }
      }
    });
  }

  private getTableroIndex(diaName: string): number {
    // Monday = 0, Sunday = 6
    const dayMap: {[key: string]: number} = {
      'lunes': 0,
      'martes': 1,
      'miercoles': 2,
      'jueves': 3,
      'viernes': 4,
      'sabado': 5,
      'domingo': 6
    };
    return dayMap[diaName] !== undefined ? dayMap[diaName] : -1;
  }

  // ==================== DAY SELECTION ====================

  toggleDay(dia: DayConfig): void {
    dia.selected = !dia.selected;
    // Ensure at least one time slot when selecting
    if (dia.selected && dia.horarios.length === 0) {
      dia.horarios.push({ horaInicio: '08:00', horaFin: '09:00' });
    }
    this.generateCalendar();
    this.validateSchedule();
  }

  toggleDateInCalendar(dayCell: any): void {
    if (!dayCell.isInRange || dayCell.empty) return;
    
    const dayConfig = this.diasSemana.find(d => d.dia === dayCell.dayName);
    if (!dayConfig) return;
    
    dayConfig.selected = !dayConfig.selected;
    if (dayConfig.selected && dayConfig.horarios.length === 0) {
      dayConfig.horarios.push({ horaInicio: '08:00', horaFin: '09:00' });
    }
    this.generateCalendar();
    this.validateSchedule();
  }

  // ==================== TIME SLOT MANAGEMENT ====================

  addTimeSlot(dia: DayConfig): void {
    const lastSlot = dia.horarios[dia.horarios.length - 1];
    const newStart = lastSlot ? this.addHour(lastSlot.horaFin) : '08:00';
    const newEnd = this.addHour(newStart);
    
    dia.horarios.push({
      horaInicio: newStart,
      horaFin: newEnd
    });
    this.initializeTablero();
    this.calculateSessionInfo();
  }

  removeTimeSlot(dia: DayConfig, index: number): void {
    if (dia.horarios.length > 1) {
      dia.horarios.splice(index, 1);
      this.initializeTablero();
      this.calculateSessionInfo();
    }
  }

  updateTimeSlot(dia: DayConfig, slot: TimeSlot): void {
    if (!this.validateTimeRange(slot.horaInicio, slot.horaFin)) {
      this.errorMessage = 'La hora de fin debe ser mayor que la hora de inicio';
      return;
    }
    
    // Check for overlaps within the same day
    if (this.hasTimeSlotOverlap(dia)) {
      this.errorMessage = `Horarios superpuestos en ${dia.diaDisplay}`;
      return;
    }
    
    this.errorMessage = '';
    this.initializeTablero();
    this.calculateSessionInfo();
  }

  private hasTimeSlotOverlap(dia: DayConfig): boolean {
    for (let i = 0; i < dia.horarios.length; i++) {
      for (let j = i + 1; j < dia.horarios.length; j++) {
        const slot1 = dia.horarios[i];
        const slot2 = dia.horarios[j];
        if (this.hasTimeConflict(slot1.horaInicio, slot1.horaFin, slot2.horaInicio, slot2.horaFin)) {
          return true;
        }
      }
    }
    return false;
  }

  private addHour(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const newHours = (hours + 1) % 24;
    return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
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
    
    const start = this.fechaInicioDate;
    const end = this.fechaFinDate;
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weeks = Math.ceil(diffDays / 7);
    
    // Total sessions = weeks * sum of all time slots across all selected days
    const totalSlotsPerWeek = selectedDays.reduce((sum, dia) => sum + dia.horarios.length, 0);
    return weeks * totalSlotsPerWeek;
  }

  calculateTotalHours(): number {
    let totalHours = 0;
    const weeks = Math.ceil((this.fechaFinDate.getTime() - this.fechaInicioDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    
    this.diasSemana.forEach(dia => {
      if (dia.selected) {
        dia.horarios.forEach(slot => {
          const duration = this.calculateDuration(slot.horaInicio, slot.horaFin);
          totalHours += duration * weeks;
        });
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
    
    for (const dia of selectedDays) {
      if (dia.horarios.length === 0) {
        this.errorMessage = `${dia.diaDisplay} no tiene horarios configurados`;
        return false;
      }

      for (const slot of dia.horarios) {
        if (!this.validateTimeRange(slot.horaInicio, slot.horaFin)) {
          this.errorMessage = `Horario inválido para ${dia.diaDisplay}`;
          return false;
        }
        
        if (!this.isTimeInRange(slot.horaInicio) || !this.isTimeInRange(slot.horaFin)) {
          this.errorMessage = `El horario para ${dia.diaDisplay} debe estar entre ${this.minTime} y ${this.maxTime}`;
          return false;
        }
      }

      if (this.hasTimeSlotOverlap(dia)) {
        this.errorMessage = `Horarios superpuestos en ${dia.diaDisplay}`;
        return false;
      }
    }
    
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

    return this.reservationsList.some(reserva => {
      if (reserva.tipoReserva === 'recurrente') return false;
      
      const reservaDate = new Date(reserva.fechaReserva);
      const reservaDateStr = reservaDate.toISOString().split('T')[0];
      
      if (reservaDateStr === checkDate && reserva.reservaPuntualDto) {
        const reservaStart = reserva.reservaPuntualDto?.horaInicio?.slice(0, 5) || '00:00';
        const reservaEnd = reserva.reservaPuntualDto?.horaFin?.slice(0, 5) || '23:59';
        
        // Check if any time slot conflicts with this reservation
        return dayConfig.horarios.some(slot => 
          this.hasTimeConflict(slot.horaInicio, slot.horaFin, reservaStart, reservaEnd)
        );
      }
      
      return false;
    });
  }

  private hasTimeConflict(start1: string, end1: string, start2: string, end2: string): boolean {
    return start1 < end2 && start2 < end1;
  }

  private hasConflicts(): boolean {
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

  getDayTimes(dayName: string): string {
    const dayConfig = this.diasSemana.find(d => d.dia === dayName);
    if (dayConfig && dayConfig.selected) {
      return dayConfig.horarios
        .map(slot => `${slot.horaInicio}-${slot.horaFin}`)
        .join(', ');
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
    
    const scheduleData: any = {
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
    
    let totalDuration = 0;
    let totalSlots = 0;
    
    selectedDays.forEach(dia => {
      dia.horarios.forEach(slot => {
        totalDuration += this.calculateDuration(slot.horaInicio, slot.horaFin);
        totalSlots++;
      });
    });
    
    return totalSlots > 0 ? totalDuration / totalSlots : 0;
  }

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