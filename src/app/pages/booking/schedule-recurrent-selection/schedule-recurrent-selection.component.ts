import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';

import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { ReservaRecurrente } from 'src/app/core/models/reservaRecurrente.models';
import { Reserva } from 'src/app/core/models/reserva.models';
import { Tarifa } from 'src/app/core/models/tarifa.model';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';
import { ReservaPeriodo } from 'src/app/core/models/reservaPeriodo.models';

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

interface ReservationConflict {
  date: Date;
  dayName: string;
  conflictingSlots: { slot: TimeSlot, conflictWith: string }[];
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
  @Input() userRole: 'Contribuyente' | 'Representante' | 'Encargado' | 'Admin' = 'Contribuyente'; 
  @Output() scheduleCompleted = new EventEmitter<ReservaRecurrente>();

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

  tablero: string[][] = [];
  calendarMonths: any[] = [];
  minTime = '06:00'; 
  maxTime = '23:00';
  
  errorMessage = '';
  reservationConflicts: ReservationConflict[] = [];
  showConflicts = false;
  
  systemConfigList: { [key: string]: ConfiguracionSistema } = {};
  get anticipationHours(): number | undefined {
    if (!this.dataTariff) {
      return this.systemConfigList[ClaveConfiguracion.HORAS_ANTICIPACION_RESERVAS_PUNTUALES]?.valorNumerico;
    }
    switch (this.dataTariff.tipoCobro) {
      case 'por_evento':
        const diasEventos = this.systemConfigList[ClaveConfiguracion.DIAS_ANTICIPACION_EVENTOS]?.valorNumerico;
        return diasEventos ? diasEventos * 24 : undefined;
      case 'mensualidad': 
      case 'por_sesion': 
      case 'por_club':
        return this.systemConfigList[ClaveConfiguracion.HORAS_ANTICIPACION_RECURRENTES]?.valorNumerico;
      default:
        return this.systemConfigList[ClaveConfiguracion.HORAS_ANTICIPACION_RESERVAS_PUNTUALES]?.valorNumerico;
    }
  }
  constructor(
    private authenticationService: AuthenticationService
  ) {}

  ngOnInit(): void {
    this.systemConfigList = this.authenticationService.getAllConfigs();
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
    const start = this.parseDateFromInput(this.fechaInicio);
    const end = this.parseDateFromInput(this.fechaFin);
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
      const isInRange = currentDate >= this.parseDateFromInput(this.fechaInicio) && currentDate <= this.parseDateFromInput(this.fechaFin);
      const dayOfWeek = currentDate.getDay();
      const dayName = this.getDayName(dayOfWeek);
      const dayConfig = this.diasSemana.find(d => d.dia === dayName);
      const isSelectable = isInRange && dayConfig?.selected;
      const hasSchedule = isSelectable;
      const isReserved = hasSchedule && this.checkReservationConflicts(currentDate);    
      week.push({
        date: currentDate,
        day: day,
        isInRange: isInRange,
        isSelectable: isSelectable,
        dayOfWeek: dayOfWeek,
        dayName: dayName,
        hasSchedule: hasSchedule,
        isReserved: isReserved,
        conflictDetails: isReserved ? this.getDayConflicts(currentDate) : null
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
    this.tablero = Array(7).fill(null).map(() => []);
    this.diasSemana.forEach((dia) => {
      if (dia.selected && dia.horarios.length > 0) {
        const tableroIndex = this.getTableroIndex(dia.dia);
        if (tableroIndex !== -1) {
          this.tablero[tableroIndex] = dia.horarios.map(
            horario => `${horario.horaInicio}-${horario.horaFin}`
          );
        }
      }
    });
  }

  private checkReservationConflicts(date: Date): boolean {
    if (!this.reservationsList || this.reservationsList.length === 0) {
      return false;
    }    
    const dayOfWeek = date.getDay();
    const dayName = this.getDayName(dayOfWeek);
    const dayConfig = this.diasSemana.find(d => d.dia === dayName);
    
    if (!dayConfig?.selected) {
      return false;
    }

    return dayConfig.horarios.some(slot => 
      this.hasTimeConflictWithExistingReservations(date, dayName, slot)
    );
  }

  private hasTimeConflictWithExistingReservations(date: Date, dayName: string, slot: TimeSlot): boolean {
    for (const reserva of this.reservationsList) {
      if (reserva.campoDeportivoDto?.uuid !== this.dataField.uuid) continue;
      if (reserva.tipoReserva === 'recurrente' && reserva.reservaRecurrenteDto) {
        const recurrente = reserva.reservaRecurrenteDto;
        const reservaStart = new Date(recurrente.fechaInicio);
        const reservaEnd = new Date(recurrente.fechaFin);        
        if (date >= reservaStart && date <= reservaEnd) {
          const reservaDays = recurrente.diasSemana?.toLowerCase().split(',') || [];
          
          if (reservaDays.includes(dayName.toLowerCase())) {
            if (this.hasTimeConflictWithRecurrenteTablero(slot, recurrente, dayName)) {
              return true;
            }
          }
        }
      }
      if (reserva.tipoReserva === 'periodo' && reserva.reservaPeriodoDto) {
        const periodo = reserva.reservaPeriodoDto;
        if (date.getFullYear() === periodo.año && date.getMonth() + 1 === periodo.mes) {
          if (this.hasTimeConflictWithPeriodo(slot, reserva)) {
            return true;
          }
        }
      }
    }    
    return false;
  }

  private hasTimeConflictWithRecurrenteTablero(slot: TimeSlot, recurrente: any, dayName: string): boolean {
    if (!recurrente.tableroDto?.horario) {
      return false;
    }
    const dayIndex = this.getTableroIndex(dayName);
    if (dayIndex === -1) return false;
    const existingTimeSlots = recurrente.tableroDto.horario[dayIndex] || [];
    return existingTimeSlots.some((existingSlot: string) => {
      const [existingStart, existingEnd] = existingSlot.split('-');
      return this.hasTimeConflict(
        slot.horaInicio, 
        slot.horaFin, 
        existingStart, 
        existingEnd
      );
    });
  }

  private hasTimeConflictWithRecurrente(slot: TimeSlot, recurrente: any): boolean {
    if (recurrente.tableroDto?.horario) {
      return this.hasTimeConflictWithRecurrenteTablero(slot, recurrente, this.getDayName(new Date().getDay()));
    }
    const defaultStart = '08:00';
    const defaultEnd = this.addHour(defaultStart, recurrente.duracionSesionHoras || 1);
    return this.hasTimeConflict(
      slot.horaInicio, 
      slot.horaFin, 
      defaultStart, 
      defaultEnd
    );
  }

  private hasTimeConflictWithPeriodo(slot: TimeSlot, periodoReserva: any): boolean {
    if (periodoReserva.reservaRecurrenteDto) {
      return this.hasTimeConflictWithRecurrente(slot, periodoReserva.reservaRecurrenteDto);
    }
    return this.hasTimeConflict(slot.horaInicio, slot.horaFin, '08:00', '10:00');
  }

  private hasTimeConflict(start1: string, end1: string, start2: string, end2: string): boolean {
    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    const start1Min = timeToMinutes(start1);
    const end1Min = timeToMinutes(end1);
    const start2Min = timeToMinutes(start2);
    const end2Min = timeToMinutes(end2);
    return start1Min < end2Min && start2Min < end1Min;
  }

  private getDayConflicts(date: Date): ReservationConflict {
    const dayOfWeek = date.getDay();
    const dayName = this.getDayName(dayOfWeek);
    const dayConfig = this.diasSemana.find(d => d.dia === dayName);
    const conflictingSlots: { slot: TimeSlot, conflictWith: string }[] = [];
    if (dayConfig?.selected && this.reservationsList) {
      dayConfig.horarios.forEach(slot => {
        const conflictReason = this.getConflictReason(date, dayName, slot);
        if (conflictReason) {
          conflictingSlots.push({ slot, conflictWith: conflictReason });
        }
      });
    }    
    return {
      date: new Date(date),
      dayName: dayName,
      conflictingSlots: conflictingSlots
    };
  }

  private getConflictReason(date: Date, dayName: string, slot: TimeSlot): string | null {
    for (const reserva of this.reservationsList) {
      if (reserva.campoDeportivoDto?.uuid !== this.dataField.uuid) continue;
      if (reserva.tipoReserva === 'recurrente' && reserva.reservaRecurrenteDto) {
        const recurrente = reserva.reservaRecurrenteDto;
        const reservaStart = new Date(recurrente.fechaInicio);
        const reservaEnd = new Date(recurrente.fechaFin); 
        if (date >= reservaStart && date <= reservaEnd) {
          const reservaDays = recurrente.diasSemana?.toLowerCase().split(',') || [];
          if (reservaDays.includes(dayName.toLowerCase())) {
            if (this.hasTimeConflictWithRecurrenteTablero(slot, recurrente, dayName)) {
              const reservaInfo = `Reserva recurrente #${reserva.numeroReserva} (${recurrente.fechaInicio} a ${recurrente.fechaFin})`;
              return reservaInfo;
            }
          }
        }
      }      
      if (reserva.tipoReserva === 'periodo' && reserva.reservaPeriodoDto) {
        const periodo = reserva.reservaPeriodoDto;
        if (date.getFullYear() === periodo.año && date.getMonth() + 1 === periodo.mes) {
          if (this.hasTimeConflictWithPeriodo(slot, reserva)) {
            return `Mensualidad: ${reserva.estudianteEscuelaDto?.nombreCompleto || 'Estudiante'} - ${periodo.mes}/${periodo.año}`;
          }
        }
      }
    }    
    return null;
  }

  private checkAllConflicts(): ReservationConflict[] {
    const conflicts: ReservationConflict[] = [];
    const start = this.parseDateFromInput(this.fechaInicio);
    const end = this.parseDateFromInput(this.fechaFin);
    const current = new Date(start);
    while (current <= end) {
      const dayConflicts = this.getDayConflicts(new Date(current));
      if (dayConflicts.conflictingSlots.length > 0) {
        conflicts.push(dayConflicts);
      }
      current.setDate(current.getDate() + 1);
    }    
    return conflicts;
  }

  getConflictSummary(): string {
    if (this.reservationConflicts.length === 0) return '';    
    const conflictDates = this.reservationConflicts.map(conflict => 
      conflict.date.toLocaleDateString()
    );    
    return `Conflicto(s) en: ${conflictDates.join(', ')}`;
  }

  hideConflicts(): void {
    this.showConflicts = false;
  }

  private getTableroIndex(diaName: string): number {
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

  onFechaInicioChange(): void {
  if (this.fechaInicio >= this.fechaFin) {
    const newEnd = new Date(this.fechaInicio + 'T00:00:00');
    newEnd.setMonth(newEnd.getMonth() + 1);
    this.fechaFin = this.formatDateForInput(newEnd);
  }
  this.generateCalendar();
  this.calculateTotalHours();
  this.calculateTariff();
}

onFechaFinChange(): void {
  const startDate = this.parseDateFromInput(this.fechaInicio);
  const endDate = this.parseDateFromInput(this.fechaFin);
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
  this.calculateTotalHours();
  this.calculateTariff();
}

addTimeSlot(dia: DayConfig): void {
  const lastSlot = dia.horarios[dia.horarios.length - 1];
  const newStart = lastSlot ? this.addHour(lastSlot.horaFin) : '08:00';
  const newEnd = this.addHour(newStart);
  
  dia.horarios.push({
    horaInicio: newStart,
    horaFin: newEnd
  });
  this.initializeTablero();
  this.calculateTotalHours();
  this.calculateTariff();
}

removeTimeSlot(dia: DayConfig, index: number): void {
  if (dia.horarios.length > 1) {
    dia.horarios.splice(index, 1);
    this.initializeTablero();
    this.calculateTotalHours();
    this.calculateTariff();
  }
}
updateTimeSlot(dia: DayConfig, slot: TimeSlot): void {
  if (!this.validateTimeRange(slot.horaInicio, slot.horaFin)) {
    this.errorMessage = 'La hora de fin debe ser mayor que la hora de inicio';
    return;
  }
  if (this.hasTimeSlotOverlap(dia)) {
    this.errorMessage = `Horarios superpuestos en ${dia.diaDisplay}`;
    return;
  }
  const operatingPeriods = this.getOperatingPeriodsForDay(dia.dia);
  if (operatingPeriods.length > 0 && !this.isTimeWithinFieldHours(dia.dia, slot.horaInicio, slot.horaFin)) {
    const operatingHours = operatingPeriods.map(p => 
      `${p.start.slice(0, 5)}-${p.end.slice(0, 5)}`
    ).join(', '); 
    this.errorMessage = `El horario debe estar dentro del horario de atención: ${operatingHours}`;
    return;
  }
  this.errorMessage = '';
  this.initializeTablero();
  this.calculateTariff();
}


toggleDay(dia: DayConfig): void {
  dia.selected = !dia.selected;
  if (dia.selected && dia.horarios.length === 0) {
    dia.horarios.push({ horaInicio: '08:00', horaFin: '09:00' });
  }
  this.generateCalendar();
  this.validateSchedule();
  this.calculateTariff();
}

calculateTotalHours(): number {
  let totalHours = 0;
  const start = this.parseDateFromInput(this.fechaInicio);
  const end = this.parseDateFromInput(this.fechaFin);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const weeks = Math.ceil(diffDays / 7);
  
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
  

  calculatedTariff: number = 0;
  tariffDetails: string[] = [];
  showTariffBreakdown: boolean = false;
  calculateTariff(): void {
    this.calculatedTariff = 0;
    this.tariffDetails = [];    
    if (!this.dataTariff) return;
    const totalHours = this.calculateTotalHours();
    const totalMonths = this.calculateTotalMonths();
    switch (this.dataTariff.tipoCobro) {
      case 'mensualidad':
        this.calculatedTariff = this.dataTariff.precioBase * totalMonths;
        this.tariffDetails.push(`Tarifa mensual: Bs. ${this.dataTariff.precioBase} × ${totalMonths} meses = Bs. ${this.calculatedTariff.toFixed(2)}`);
        break;        
      case 'por_sesion':
        const applicableBaseHours = this.calculateHoursWithinTariffRange();
        this.calculatedTariff = this.dataTariff.precioBase * applicableBaseHours;
        this.tariffDetails.push(`Tarifa por sesión: Bs. ${this.dataTariff.precioBase} × ${applicableBaseHours.toFixed(1)} horas = Bs. ${this.calculatedTariff.toFixed(2)}`);
        break;
        
      case 'por_hora':
        const applicableHours = this.calculateHoursWithinTariffRange();
        this.calculatedTariff = this.dataTariff.precioBase * applicableHours;
        this.tariffDetails.push(`Tarifa por hora: Bs. ${this.dataTariff.precioBase} × ${applicableHours.toFixed(1)} horas = Bs. ${this.calculatedTariff.toFixed(2)}`);
        break;
        
      case 'por_club':
        this.calculatedTariff = this.dataTariff.precioBase * totalMonths;
        this.tariffDetails.push(`Tarifa club: Bs. ${this.dataTariff.precioBase} × ${totalMonths} meses = Bs. ${this.calculatedTariff.toFixed(2)}`);
        break;
        
      default:
        console.warn('Tipo de cobro no reconocido:', this.dataTariff.tipoCobro);
    }

    this.calculateAdditionalConcepts(totalHours, totalMonths);
  }
  private calculateHoursWithinTariffRange(): number {
    if (!this.dataTariff.desde || !this.dataTariff.hasta) {
      return this.calculateTotalHours();
    }  
    let applicableHours = 0;
    const start = this.parseDateFromInput(this.fechaInicio);
    const end = this.parseDateFromInput(this.fechaFin);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weeks = Math.ceil(diffDays / 7);  
    const tariffStart = this.timeToMinutes(this.dataTariff.desde);
    const tariffEnd = this.timeToMinutes(this.dataTariff.hasta);
    this.diasSemana.forEach(dia => {
      if (dia.selected) {
        dia.horarios.forEach(slot => {
          const slotStart = this.timeToMinutes(slot.horaInicio);
          const slotEnd = this.timeToMinutes(slot.horaFin);
          const slotDuration = (slotEnd - slotStart) / 60;
          const overlapStart = Math.max(slotStart, tariffStart);
          const overlapEnd = Math.min(slotEnd, tariffEnd);
          const overlapHours = Math.max(0, overlapEnd - overlapStart) / 60;
          if (overlapHours > 0) {
            applicableHours += overlapHours * weeks;
          }
        });
      }
    });  
    return applicableHours;
  }
  calculateTotalMonths(): number {
    const start = this.parseDateFromInput(this.fechaInicio);
    const end = this.parseDateFromInput(this.fechaFin);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    const endOfMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0);
    if (end.getDate() < endOfMonth.getDate()) {
      return months + 1; 
    }  
    return Math.max(1, months);
  }
  private calculateAdditionalConcepts(totalHours: number, totalMonths: number): void {
    if (!this.dataTariff.conceptosDtos || this.dataTariff.conceptosDtos.length === 0) {
      return;
    }    
    let conceptTotal = 0;
    this.dataTariff.conceptosDtos.forEach(concepto => {
      if (!concepto.activo) return;
      let conceptAmount = 0;
      let conceptDetail = '';
      let applicableHours = 0;      
      switch (concepto.tipo) {
        case 'por_hora':
        case 'por_sesion':
          applicableHours = this.calculateApplicableHoursForConcepto(concepto);
          if (applicableHours > 0) {
            conceptAmount = (concepto.valor || 0) * applicableHours;
            conceptDetail = `${concepto.concepto}: Bs. ${concepto.valor} × ${applicableHours.toFixed(1)}h = Bs. ${conceptAmount.toFixed(2)}`;
          }
          break;          
        case 'mensualidad':
          conceptAmount = (concepto.valor || 0) * totalMonths;
          conceptDetail = `${concepto.concepto}: Bs. ${concepto.valor} × ${totalMonths} meses = Bs. ${conceptAmount.toFixed(2)}`;
          break;          
        case 'porcentaje':
          conceptAmount = (this.calculatedTariff * (concepto.valor || 0)) / 100;
          conceptDetail = `${concepto.concepto}: ${concepto.valor}% = Bs. ${conceptAmount.toFixed(2)}`;
          break;          
        case 'monto_fijo':
        case 'fijo':
          conceptAmount = concepto.valor || 0;
          conceptDetail = `${concepto.concepto}: Bs. ${conceptAmount.toFixed(2)}`;
          break;
      }      
      if (conceptAmount > 0) {
        this.calculatedTariff += conceptAmount;
        conceptTotal += conceptAmount;
        this.tariffDetails.push(conceptDetail);
      }
    });    
    if (conceptTotal > 0) {
      this.tariffDetails.push(`Total conceptos adicionales: Bs. ${conceptTotal.toFixed(2)}`);
    }
  }
private calculateApplicableHoursForConcepto(concepto: any): number {
  if (!concepto.desde || !concepto.hasta) {
    return this.calculateTotalHours();
  }  
  let applicableHours = 0;
  const start = this.parseDateFromInput(this.fechaInicio);
  const end = this.parseDateFromInput(this.fechaFin);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const weeks = Math.ceil(diffDays / 7);  
  const conceptoStart = this.timeToMinutes(concepto.desde);
  const conceptoEnd = this.timeToMinutes(concepto.hasta);
  this.diasSemana.forEach(dia => {
    if (dia.selected) {
      dia.horarios.forEach(slot => {
        const slotStart = this.timeToMinutes(slot.horaInicio);
        const slotEnd = this.timeToMinutes(slot.horaFin);
        const slotDuration = (slotEnd - slotStart) / 60; 
        const overlapStart = Math.max(slotStart, conceptoStart);
        const overlapEnd = Math.min(slotEnd, conceptoEnd);
        const overlapHours = Math.max(0, overlapEnd - overlapStart) / 60;
        if (overlapHours > 0) {
          applicableHours += overlapHours * weeks;
        }
      });
    }
  });
  return applicableHours;
}

private getOperatingPeriodsForDay(dayName: string): any[] {
  if (!this.dataField?.horariosFijosDtoList) return [];  
  const operatingPeriods: any[] = [];
  const allSchedules = this.dataField.horariosFijosDtoList;
  const exactDaySchedules = allSchedules.filter(schedule => 
    schedule.dia === dayName && schedule.abierto && schedule.horaApertura && schedule.horaCierre
  );
  const weekdays = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
  if (weekdays.includes(dayName)) {
    const weekdaySchedules = allSchedules.filter(schedule => 
      schedule.dia === 'lunes_viernes' && schedule.abierto && schedule.horaApertura && schedule.horaCierre
    );
    exactDaySchedules.push(...weekdaySchedules);
  }
  exactDaySchedules.forEach(schedule => {
    operatingPeriods.push({
      start: schedule.horaApertura!,
      end: schedule.horaCierre!
    });
  });  
  return operatingPeriods;
}

private isTimeWithinFieldHours(dayName: string, startTime: string, endTime: string): boolean {
  const operatingPeriods = this.getOperatingPeriodsForDay(dayName);
  if (operatingPeriods.length === 0) {
    return false;
  }  
  const slotStart = this.timeToMinutes(startTime);
  const slotEnd = this.timeToMinutes(endTime);
  return operatingPeriods.some(period => {
    const periodStart = this.timeToMinutes(period.start);
    const periodEnd = this.timeToMinutes(period.end);
    
    return slotStart >= periodStart && slotEnd <= periodEnd;
  });
}
private timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
private validateSchedule(): boolean {
  this.errorMessage = '';
  this.reservationConflicts = [];  
  const selectedDays = this.diasSemana.filter(d => d.selected);
  if (selectedDays.length === 0) {
    this.errorMessage = 'Debe seleccionar al menos un día de la semana';
    return false;
  }  
  if (!this.fechaInicio || !this.fechaFin) {
    this.errorMessage = 'Debe seleccionar un rango de fechas válido';
    return false;
  }  
  const startDate = this.parseDateFromInput(this.fechaInicio);
  const endDate = this.parseDateFromInput(this.fechaFin);
  if (endDate <= startDate) {
    this.errorMessage = 'La fecha de fin debe ser posterior a la fecha de inicio';
    return false;
  }  
  for (const dia of selectedDays) {
    if (dia.horarios.length === 0) {
      this.errorMessage = `${dia.diaDisplay} no tiene horarios configurados`;
      return false;
    }
    const operatingPeriods = this.getOperatingPeriodsForDay(dia.dia);
    if (operatingPeriods.length === 0) {
      this.errorMessage = `El campo está cerrado los ${dia.diaDisplay}`;
      return false;
    }
    for (const slot of dia.horarios) {
      if (!this.validateTimeRange(slot.horaInicio, slot.horaFin)) {
        this.errorMessage = `Horario inválido para ${dia.diaDisplay}: la hora de fin debe ser mayor que la hora de inicio`;
        return false;
      }
      if (!this.isTimeWithinFieldHours(dia.dia, slot.horaInicio, slot.horaFin)) {
        const operatingHours = operatingPeriods.map(p => 
          `${p.start.slice(0, 5)}-${p.end.slice(0, 5)}`
        ).join(', ');
        this.errorMessage = `El horario para ${dia.diaDisplay} (${slot.horaInicio}-${slot.horaFin}) debe estar dentro del horario de atención: ${operatingHours}`;
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
  const conflicts = this.checkAllConflicts();
  if (conflicts.length > 0) {
    this.reservationConflicts = conflicts;
    this.showConflicts = true;
    this.errorMessage = `Se encontraron ${conflicts.length} conflicto(s) con reservas existentes. Revise los detalles antes de continuar.`;
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

  private addHour(time: string, hoursToAdd: number = 1): string {
    const [hours, minutes] = time.split(':').map(Number);
    const newHours = (hours + hoursToAdd) % 24;
    return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  confirmar(): void {
    if (!this.validateSchedule()) {
      return;
    }
    
    const selectedDays = this.diasSemana.filter(d => d.selected);
    const totalSessions = this.calculateTotalHours() || 0;
    const diasSemanaString = selectedDays.map(d => d.dia).join(',');
    
    const scheduleData: any = {
      tipoRecurrencia: this.tipoRecurrencia,
      fechaInicio: this.parseDateFromInput(this.fechaInicio),
      fechaFin: this.parseDateFromInput(this.fechaFin),
      diasSeleccionados: selectedDays,
      tablero: this.tablero,
      cantidadSesiones: totalSessions,
      duracionSesionHoras: this.calculateAverageDuration(),
      diasSemana: diasSemanaString
    };
    
    this.scheduleCompleted.emit(scheduleData);
  }

  get selectedDaysCount(): number {
    return this.diasSemana.filter(d => d.selected).length;
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
    return this.selectedDaysCount > 0 && !this.errorMessage && this.reservationConflicts.length === 0;
  }
}