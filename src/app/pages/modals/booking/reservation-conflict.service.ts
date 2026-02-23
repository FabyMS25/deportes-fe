import { Injectable } from '@angular/core';
import { EstadoReserva } from 'src/app/core/constants/Estados';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { Reserva } from 'src/app/core/models/reserva.model';
import { ReservaPuntual } from 'src/app/core/models/reservaPuntual.model';
import { ReservaRecurrente } from 'src/app/core/models/reservaRecurrente.model';

export interface ConflictResult {
  hasConflict: boolean;
  conflictingReservations: Reserva[];
  reason?: string;
  severity?: 'error' | 'warning' | 'info';
}

export interface TimeRange {
  date: Date;
  startTime: string;
  endTime: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReservationConflictService {
  private readonly BLOCKING_STATES: EstadoReserva[] = [
    EstadoReserva.PENDIENTE,
    EstadoReserva.SOLICITADA,
    EstadoReserva.PAGADA,
    EstadoReserva.EN_CURSO
  ];

  constructor() {}

  checkConflict(
    campoDeportivoId: string,
    timeRange: TimeRange,
    existingReservations: Reserva[],
    excludeReservaId?: string
  ): ConflictResult {
    const conflicts: Reserva[] = [];
    const campoReservations = existingReservations.filter(r => 
      r.campoDeportivoDto?.uuid === campoDeportivoId &&
      r.uuid !== excludeReservaId &&
      this.BLOCKING_STATES.includes(r.estadoReserva as EstadoReserva)
    );
    for (const reserva of campoReservations) {
      if (reserva.reservaPuntualDto) {
        if (this.checkPuntualConflict(timeRange, reserva.reservaPuntualDto)) {
          conflicts.push(reserva);
        }
      }
      if (reserva.reservaRecurrenteDto && reserva.reservaRecurrenteDto.activo) {
        if (this.checkRecurrentConflict(timeRange, reserva.reservaRecurrenteDto)) {
          conflicts.push(reserva);
        }
      }
    }
    if (conflicts.length > 0) {
      return {
        hasConflict: true,
        conflictingReservations: conflicts,
        reason: this.getConflictReason(conflicts[0]),
        severity: 'error'
      };
    }
    return {
      hasConflict: false,
      conflictingReservations: [],
      severity: 'info'
    };
  }

  /**
   * Check multiple time ranges for conflicts
   */
  checkMultipleConflicts(
    campoDeportivoId: string,
    timeRanges: TimeRange[],
    existingReservations: Reserva[],
    excludeReservaId?: string
  ): Map<string, ConflictResult> {
    const results = new Map<string, ConflictResult>();

    for (const range of timeRanges) {
      const key = this.getTimeRangeKey(range);
      const result = this.checkConflict(
        campoDeportivoId,
        range,
        existingReservations,
        excludeReservaId
      );
      results.set(key, result);
    }

    return results;
  }

  /**
   * Check if a puntual reservation conflicts with the given time range
   */
  private checkPuntualConflict(
    timeRange: TimeRange,
    puntual: ReservaPuntual
  ): boolean {
    const targetDate = this.formatDate(timeRange.date);
    const reservaDate = this.formatDate(new Date(puntual.fechaUso));
    if (targetDate !== reservaDate) {
      return false;
    }
    return this.timesOverlap(
      timeRange.startTime,
      timeRange.endTime,
      puntual.horaInicio,
      puntual.horaFin
    );
  }

  /**
   * Check if a recurrent reservation conflicts with the given time range
   */
  private checkRecurrentConflict(
    timeRange: TimeRange,
    recurrent: ReservaRecurrente
  ): boolean {
    const targetDate = timeRange.date;
    const startDate = new Date(recurrent.fechaInicio);
    const endDate = new Date(recurrent.fechaFin);
    if (targetDate < startDate || targetDate > endDate) {
      return false;
    }
    const dayName = this.getDayName(targetDate);
    if (!recurrent.diasSemana || !recurrent.diasSemana.includes(dayName)) {
      return false;
    }
    if (recurrent.tableroDto?.horario) {
      const dayIndex = targetDate.getDay();
      const daySchedule = recurrent.tableroDto.horario[dayIndex];
      if (daySchedule && Array.isArray(daySchedule)) {
        return daySchedule.some(timeSlot => {
          if (typeof timeSlot === 'string' && timeSlot.includes('-')) {
            const [start, end] = timeSlot.split('-').map(t => t.trim());
            return this.timesOverlap(
              timeRange.startTime,
              timeRange.endTime,
              start,
              end
            );
          }
          return false;
        });
      }
    }
    return false;
  }

  /**
   * Check if two time ranges overlap
   */
  private timesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    const s1 = this.timeToMinutes(start1);
    const e1 = this.timeToMinutes(end1);
    const s2 = this.timeToMinutes(start2);
    const e2 = this.timeToMinutes(end2);
    return s1 < e2 && s2 < e1;
  }

  /**
   * Get available time slots for a specific date
   */
  getAvailableSlots(
    campoDeportivo: CampoDeportivo,
    date: Date,
    slotDuration: number,
    existingReservations: Reserva[],
    openTime: string = '08:00:00',
    closeTime: string = '22:00:00'
  ): TimeRange[] {
    const availableSlots: TimeRange[] = [];
    const startMinutes = this.timeToMinutes(openTime);
    const endMinutes = this.timeToMinutes(closeTime);

    for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDuration) {
      const slotStart = this.minutesToTime(minutes);
      const slotEnd = this.minutesToTime(Math.min(minutes + slotDuration, endMinutes));

      const timeRange: TimeRange = {
        date: date,
        startTime: slotStart,
        endTime: slotEnd
      };

      const conflict = this.checkConflict(
        campoDeportivo.uuid!,
        timeRange,
        existingReservations
      );

      if (!conflict.hasConflict) {
        availableSlots.push(timeRange);
      }
    }

    return availableSlots;
  }

  /**
   * Find the next available slot after a specific time
   */
  findNextAvailableSlot(
    campoDeportivoId: string,
    startDate: Date,
    duration: number,
    existingReservations: Reserva[],
    maxDaysToSearch: number = 30
  ): TimeRange | null {
    const currentDate = new Date(startDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + maxDaysToSearch);

    while (currentDate <= endDate) {
      const slots = this.getAvailableSlots(
        { uuid: campoDeportivoId } as CampoDeportivo,
        new Date(currentDate),
        duration,
        existingReservations
      );

      if (slots.length > 0) {
        return slots[0];
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return null;
  }

  /**
   * Get conflict statistics for a date range
   */
  getConflictStatistics(
    campoDeportivoId: string,
    startDate: Date,
    endDate: Date,
    existingReservations: Reserva[]
  ): {
    totalDays: number;
    daysWithConflicts: number;
    totalConflicts: number;
    averageConflictsPerDay: number;
  } {
    const stats = {
      totalDays: 0,
      daysWithConflicts: 0,
      totalConflicts: 0,
      averageConflictsPerDay: 0
    };

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      stats.totalDays++;
      const dayConflicts = existingReservations.filter(r => {
        if (r.campoDeportivoDto?.uuid !== campoDeportivoId) return false;
        if (!this.BLOCKING_STATES.includes(r.estadoReserva as EstadoReserva)) return false;
        if (r.reservaPuntualDto) {
          const reservaDate = this.formatDate(new Date(r.reservaPuntualDto.fechaUso));
          const currentDateStr = this.formatDate(currentDate);
          return reservaDate === currentDateStr;
        }
        return false;
      });
      if (dayConflicts.length > 0) {
        stats.daysWithConflicts++;
        stats.totalConflicts += dayConflicts.length;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    stats.averageConflictsPerDay = stats.totalDays > 0 
      ? stats.totalConflicts / stats.totalDays 
      : 0;

    return stats;
  }

  /**
   * Validate if a reservation can be created
   */
  validateReservation(
    campoDeportivoId: string,
    timeRange: TimeRange,
    existingReservations: Reserva[],
    anticipationHours: number | undefined
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const now = new Date();
    const minReservationTime = anticipationHours? new Date(now.getTime() + anticipationHours * 60 * 60 * 1000):undefined;
    const reservationDateTime = this.combineDateAndTime(timeRange.date, timeRange.startTime);

    if (minReservationTime && reservationDateTime < minReservationTime) {
      errors.push(`La reserva debe realizarse con al menos ${anticipationHours} horas de anticipación`);
    }
    const conflict = this.checkConflict(
      campoDeportivoId,
      timeRange,
      existingReservations
    );

    if (conflict.hasConflict) {
      errors.push(conflict.reason || 'El horario seleccionado tiene conflictos con otras reservas');
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (timeRange.date < today) {
      errors.push('No se pueden crear reservas para fechas pasadas');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Get a user-friendly conflict reason
   */
  private getConflictReason(reserva: Reserva): string {
    switch (reserva.estadoReserva) {
      case EstadoReserva.SOLICITADA:
        return 'Reserva pendiente de aprobación';
      case EstadoReserva.PENDIENTE:
        return 'Reserva confirmada, pendiente de pago';
      case EstadoReserva.PAGADA:
        return 'Reserva pagada y confirmada';
      case EstadoReserva.EN_CURSO:
        return 'Reserva actualmente en uso';
      default:
        return 'Horario ocupado';
    }
  }

  /**
   * Utility: Convert time string to minutes
   */
  private timeToMinutes(time: string): number {
    const parts = time.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    return hours * 60 + minutes;
  }

  /**
   * Utility: Convert minutes to time string
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
  }

  /**
   * Utility: Format date to YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Utility: Get day name in Spanish
   */
  private getDayName(date: Date): string {
    const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    return days[date.getDay()];
  }

  /**
   * Utility: Combine date and time
   */
  private combineDateAndTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  /**
   * Utility: Generate unique key for time range
   */
  private getTimeRangeKey(range: TimeRange): string {
    return `${this.formatDate(range.date)}_${range.startTime}_${range.endTime}`;
  }

  /**
   * Check if a reservation state is blocking
   */
  isBlockingState(estado: EstadoReserva): boolean {
    return this.BLOCKING_STATES.includes(estado);
  }

  /**
   * Get all blocking states
   */
  getBlockingStates(): EstadoReserva[] {
    return [...this.BLOCKING_STATES];
  }
}