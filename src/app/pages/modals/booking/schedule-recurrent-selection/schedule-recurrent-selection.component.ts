import { UserRoleName, UserRoles } from 'src/app/core/constants/UserData';
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';

import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { ReservaRecurrente } from 'src/app/core/models/reservaRecurrente.model';
import { Reserva } from 'src/app/core/models/reserva.model';
import { Tarifa } from 'src/app/core/models/tarifa.model';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';
import { ReservationConflictService } from '../reservation-conflict.service';

interface TimeSlot {
  horaInicio: string;
  horaFin: string;
}

interface DayConfig {
  dia: string;
  diaDisplay: string;
  selected: boolean;
}

interface ReservationConflict {
  date: Date;
  dayName: string;
  conflictingSlots: { slot: TimeSlot; conflictWith: string }[];
}

type EditMode = 'date' | 'weekday' | null;
const MAX_SLOTS = 5;

@Component({
  selector: 'app-schedule-recurrent-selection',
  standalone: true,
  imports: [CommonModule, NgbNavModule, FormsModule],
  templateUrl: './schedule-recurrent-selection.component.html',
  styleUrls: ['./schedule-recurrent-selection.component.scss']
})
export class ScheduleRecurrentSelectionComponent implements OnInit {
  @Input() dataField!: CampoDeportivo;
  @Input() dataTariff!: Tarifa;
  @Input() reservationsList: Reserva[] = [];
  @Input() systemConfigs: { [key: string]: ConfiguracionSistema } = {};
  @Input() userRole: UserRoleName = UserRoles.CONTRIBUYENTE;
  @Output() scheduleCompleted = new EventEmitter<ReservaRecurrente>();

  readonly MAX_SLOTS = MAX_SLOTS;

  tipoRecurrencia: string = 'semanal';
  fechaInicio: string = '';
  fechaFin: string = '';

  globalSlots: TimeSlot[] = [{ horaInicio: '08:00', horaFin: '09:00' }];

  diasSemana: DayConfig[] = [
    { dia: 'lunes',     diaDisplay: 'Lunes',     selected: false },
    { dia: 'martes',    diaDisplay: 'Martes',    selected: false },
    { dia: 'miercoles', diaDisplay: 'Miércoles', selected: false },
    { dia: 'jueves',    diaDisplay: 'Jueves',    selected: false },
    { dia: 'viernes',   diaDisplay: 'Viernes',   selected: false },
    { dia: 'sabado',    diaDisplay: 'Sábado',    selected: false },
    { dia: 'domingo',   diaDisplay: 'Domingo',   selected: false }
  ];

  tablero: string[][][] = []; // months × 31 days × 5 slots

  dayOfWeekOverrides: { [dayName: string]: TimeSlot[] } = {};
  dateSpecificSlots: { [dateKey: string]: TimeSlot[] } = {};
  selectedDateForEdit: string | null = null;
  editMode: EditMode = null;
  editingWeekday: string | null = null;
  editingSlots: TimeSlot[] = [];

  moveFromDate: Date | null = null;
  moveFromSlots: TimeSlot[] = [];

  calendarMonths: any[] = [];
  minTime = '06:00';
  maxTime = '23:00';
  cantidadPersonas?: number | null = null;

  errorMessage = '';
  reservationConflicts: ReservationConflict[] = [];
  showConflicts = false;

  systemConfigList: { [key: string]: ConfiguracionSistema } = {};
  calculatedTariff: number = 0;
  tariffDetails: string[] = [];
  showTariffBreakdown: boolean = false;

  get anticipationHours(): number | undefined {
    if (this.isInternalUser) {
      return undefined;
    }
    if (!this.dataTariff) {
      return this.getActiveNumericConfig(ClaveConfiguracion.HORAS_ANTICIPACION_RESERVAS_PUNTUALES);
    }
    switch (this.dataTariff.tipoCobro) {
      case 'por_evento':
        const d = this.getActiveNumericConfig(ClaveConfiguracion.DIAS_ANTICIPACION_EVENTOS);
        return d ? d * 24 : undefined;
      case 'mensualidad':
      case 'por_sesion':
      case 'por_club':
        return this.getActiveNumericConfig(ClaveConfiguracion.HORAS_ANTICIPACION_RECURRENTES);
      default:
        return this.getActiveNumericConfig(ClaveConfiguracion.HORAS_ANTICIPACION_RESERVAS_PUNTUALES);
    }
  }

  get maxRecurrentDurationDays(): number | undefined {
    return this.getActiveNumericConfig(ClaveConfiguracion.DURACION_MAXIMA_RECURRENTES);
  }

  get minSessionDurationHours(): number | undefined {
    return this.getActiveNumericConfig(ClaveConfiguracion.DURACION_MINIMA_RESERVA);
  }

  private getActiveNumericConfig(clave: ClaveConfiguracion): number | undefined {
    const config = this.systemConfigList[clave];
    const value = Number(config?.valorNumerico);
    return config?.activo === true && Number.isFinite(value) && value > 0
      ? value
      : undefined;
  }

  private get isInternalUser(): boolean {
    return this.userRole === 'Admin' || this.userRole === 'Encargado';
  }

  constructor(
    private authenticationService: AuthenticationService,
    private conflictService: ReservationConflictService
  ) {}

  ngOnInit(): void {
    this.systemConfigList = Object.keys(this.systemConfigs).length
      ? this.systemConfigs
      : this.authenticationService.getAllConfigs();
    this.initializeDates();
    this.loadFieldConstraints();
    this.initializeDaysFromFrecuencia();
    this.refreshScheduleCalculations();
  }

  private initializeDaysFromFrecuencia(): void {
    if (!this.dataTariff?.frecuencia) return;
    const frecuencia = String(this.dataTariff.frecuencia);
    const lv = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
    this.diasSemana.forEach(d => {
      switch (frecuencia) {
        case 'lunes_a_viernes': d.selected = lv.includes(d.dia); break;
        case 'lunes_a_sabado':  d.selected = [...lv, 'sabado'].includes(d.dia); break;
        case 'todos_los_dias':  d.selected = true; break;
        default:                d.selected = false; break;
      }
    });
  }

  get frecuenciaLabel(): string {
    const frecuencia = this.dataTariff?.frecuencia ? String(this.dataTariff.frecuencia) : '';
    const map: { [k: string]: string } = {
      lunes_a_viernes: 'Lunes a Viernes',
      lunes_a_sabado:  'Lunes a Sábado',
      todos_los_dias:  'Todos los días',
      personalizado:   'Personalizado'
    };
    return frecuencia ? (map[frecuencia] || frecuencia) : '';
  }

  // ─── DATE HELPERS ──────────────────────────────────────────────────────────
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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  public parseDateFromInput(dateString: string): Date {
    return this.parseLocalDate(dateString);
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

  private formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ─── SLOT SORTING ──────────────────────────────────────────────────────────
  private sortSlots(slots: TimeSlot[]): TimeSlot[] {
    return [...slots].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  }

  private slotsHaveOverlap(slots: TimeSlot[]): boolean {
    const sorted = this.sortSlots(slots);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].horaFin > sorted[i + 1].horaInicio) return true;
    }
    return false;
  }

  private validateSlotList(slots: TimeSlot[]): string | null {
    for (const s of slots) {
      if (!s.horaInicio || !s.horaFin) return 'Todos los horarios deben tener hora de inicio y fin';
      if (s.horaInicio >= s.horaFin) return 'La hora de fin debe ser mayor que la hora de inicio en cada horario';
      if (this.minSessionDurationHours !== undefined && this.calculateDuration(s.horaInicio, s.horaFin) < this.minSessionDurationHours) {
        return `La duración mínima de cada sesión es ${this.minSessionDurationHours} hora(s)`;
      }
    }
    if (this.slotsHaveOverlap(slots)) return 'Los horarios no pueden superponerse';
    return null;
  }

  // ─── SLOT LOOKUP ───────────────────────────────────────────────────────────
  getSlotsForDate(date: Date): TimeSlot[] {
    const dateKey = this.formatDateKey(date);
    if (this.dateSpecificSlots[dateKey] !== undefined) {
      return this.dateSpecificSlots[dateKey];
    }
    const dayName = this.getDayName(date.getDay());
    const dayConfig = this.diasSemana.find(d => d.dia === dayName);
    if (!dayConfig?.selected) return [];
    if (this.dayOfWeekOverrides[dayName]) {
      return this.dayOfWeekOverrides[dayName].map(s => ({ ...s }));
    }
    const valid = this.globalSlots.filter(s => s.horaInicio && s.horaFin && s.horaInicio < s.horaFin);
    return valid.map(s => ({ ...s }));
  }

  isDateOverridden(dateKey: string): boolean {
    return this.dateSpecificSlots[dateKey] !== undefined;
  }

  isWeekdayOverridden(dayName: string): boolean {
    return this.dayOfWeekOverrides[dayName] !== undefined;
  }

  hasSlotsForDate(date: Date): boolean {
    return this.getSlotsForDate(date).length > 0;
  }

  getDateDisplayTimes(date: Date): string {
    return this.getSlotsForDate(date).map(s => `${s.horaInicio}-${s.horaFin}`).join(', ');
  }

  getSelectedDateDisplay(): string {
    if (!this.selectedDateForEdit) return '';
    const [y, m, d] = this.selectedDateForEdit.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  getWeekdayDisplayName(dayName: string): string {
    return this.diasSemana.find(d => d.dia === dayName)?.diaDisplay || dayName;
  }

  getDayNameForDate(date: Date): string {
    return this.getDayName(date.getDay());
  }

  getSlotsForWeekday(dayName: string): TimeSlot[] {
    return this.dayOfWeekOverrides[dayName] ?? this.globalSlots;
  }

  getDisplaySlotsForWeekday(dayName: string): string {
    const slots = this.getSlotsForWeekday(dayName);
    return slots.filter(s => s.horaInicio && s.horaFin && s.horaInicio < s.horaFin)
                .map(s => `${s.horaInicio}-${s.horaFin}`).join(', ');
  }

  // ─── GLOBAL SLOT MANAGEMENT ────────────────────────────────────────────────
  addGlobalSlot(): void {
    if (this.globalSlots.length >= MAX_SLOTS) return;
    const last = this.globalSlots[this.globalSlots.length - 1];
    const newStart = last ? this.addHour(last.horaFin) : '08:00';
    const newEnd   = this.addHour(newStart);
    this.globalSlots.push({ horaInicio: newStart, horaFin: newEnd });
    this.onGlobalTimeChange();
  }

  removeGlobalSlot(index: number): void {
    if (this.globalSlots.length <= 1) return;
    this.globalSlots.splice(index, 1);
    this.onGlobalTimeChange();
  }

  // onGlobalTimeChange(): void {
  //   this.globalSlots = this.sortSlots(this.globalSlots);
  //   this.refreshScheduleCalculations();
  // }
  onGlobalTimeChange(): void {
    this.globalSlots = this.sortSlots(this.globalSlots);

    const shapeError = this.validateSlotList(this.globalSlots);
    if (shapeError) {
      this.errorMessage = shapeError;
      this.refreshScheduleCalculations();
      return;
    }

    const conflicts = this.checkAllConflicts();

    if (conflicts.length) {
      this.reservationConflicts = conflicts;
      this.showConflicts = true;
      this.errorMessage = `Este horario tiene ${conflicts.length} conflicto(s) con reservas existentes.`;
    } else {
      this.reservationConflicts = [];
      this.showConflicts = false;
      this.errorMessage = '';
    }

    this.refreshScheduleCalculations();
  }
  get requiresCantidadPersonas(): boolean {
    return this.dataTariff?.tipoCobro === 'por_persona';
  }

  // ─── DAY TOGGLE ────────────────────────────────────────────────────────────
  toggleDay(dia: DayConfig): void {
    dia.selected = !dia.selected;
    this.refreshScheduleCalculations({ validate: true });
  }

  // ─── EDIT PANEL ────────────────────────────────────────────────────────────
  selectDateForEdit(dayCell: any): void {
    if (!dayCell || dayCell.empty || !dayCell.isInRange) return;
    if (this.moveFromDate) { this.confirmMoveToDate(dayCell.date); return; }
    const dateKey = this.formatDateKey(dayCell.date);
    if (this.selectedDateForEdit === dateKey) { this.cancelDateEdit(); return; }
    this.selectedDateForEdit = dateKey;
    this.editMode = null;
    this.editingWeekday = dayCell.dayName;
    const slots = this.getSlotsForDate(dayCell.date);
    this.editingSlots = slots.length > 0
      ? slots.map(s => ({ ...s }))
      : this.globalSlots.map(s => ({ ...s }));
  }

  setEditMode(mode: EditMode): void {
    this.editMode = mode;
    if (mode === 'weekday' && this.editingWeekday) {
      const ov = this.dayOfWeekOverrides[this.editingWeekday];
      this.editingSlots = ov ? ov.map(s => ({ ...s })) : this.globalSlots.map(s => ({ ...s }));
    } else if (mode === 'date' && this.selectedDateForEdit) {
      const date = this.parseDateFromInput(this.selectedDateForEdit);
      const slots = this.getSlotsForDate(date);
      this.editingSlots = slots.length > 0 ? slots.map(s => ({ ...s })) : this.globalSlots.map(s => ({ ...s }));
    }
  }

  // ─── EDITING SLOT LIST (inside the panel) ─────────────────────────────────
  addEditingSlot(): void {
    if (this.editingSlots.length >= MAX_SLOTS) return;
    const last = this.editingSlots[this.editingSlots.length - 1];
    const newStart = last ? this.addHour(last.horaFin) : '08:00';
    this.editingSlots.push({ horaInicio: newStart, horaFin: this.addHour(newStart) });
  }

  removeEditingSlot(index: number): void {
    if (this.editingSlots.length <= 1) return;
    this.editingSlots.splice(index, 1);
  }

  // applyDateEdit(): void {
  //   if (!this.selectedDateForEdit || !this.editMode) return;
  //   const err = this.validateSlotList(this.editingSlots);
  //   if (err) { this.errorMessage = err; return; }
  //   this.errorMessage = '';

  //   const sorted = this.sortSlots(this.editingSlots);

  //   if (this.editMode === 'date') {
  //     this.dateSpecificSlots[this.selectedDateForEdit] = sorted;
  //   } else if (this.editMode === 'weekday' && this.editingWeekday) {
  //     this.dayOfWeekOverrides[this.editingWeekday] = sorted;
  //   }

  //   this.cancelDateEdit();
  //   this.refreshScheduleCalculations();
  // }
  applyDateEdit(): void {
  if (!this.selectedDateForEdit || !this.editMode) return;

  const err = this.validateSlotList(this.editingSlots);
  if (err) {
    this.errorMessage = err;
    return;
  }

  const sorted = this.sortSlots(this.editingSlots);

  const backupDateSpecificSlots = { ...this.dateSpecificSlots };
  const backupDayOfWeekOverrides = { ...this.dayOfWeekOverrides };

  if (this.editMode === 'date') {
    this.dateSpecificSlots[this.selectedDateForEdit] = sorted;
  } else if (this.editMode === 'weekday' && this.editingWeekday) {
    this.dayOfWeekOverrides[this.editingWeekday] = sorted;
  }

  const conflicts = this.checkAllConflicts();

  if (conflicts.length) {
    this.dateSpecificSlots = backupDateSpecificSlots;
    this.dayOfWeekOverrides = backupDayOfWeekOverrides;

    this.reservationConflicts = conflicts;
    this.showConflicts = true;
    this.errorMessage = `No se puede aplicar este horario porque tiene ${conflicts.length} conflicto(s).`;
    this.refreshScheduleCalculations();
    return;
  }

  this.errorMessage = '';
  this.reservationConflicts = [];
  this.showConflicts = false;

  this.cancelDateEdit();
  this.refreshScheduleCalculations();
}

  resetDateToGlobal(): void {
    if (!this.selectedDateForEdit) return;
    delete this.dateSpecificSlots[this.selectedDateForEdit];
    this.cancelDateEdit();
    this.refreshScheduleCalculations();
  }

  resetWeekdayToGlobal(): void {
    if (!this.editingWeekday) return;
    delete this.dayOfWeekOverrides[this.editingWeekday];
    this.cancelDateEdit();
    this.refreshScheduleCalculations();
  }

  cancelDateEdit(): void {
    this.selectedDateForEdit = null;
    this.editMode = null;
    this.editingWeekday = null;
    this.editingSlots = [];
  }

  // ─── CLEAR DATE ────────────────────────────────────────────────────────────
  clearDateSlots(date: Date): void {
    const dateKey = this.formatDateKey(date);
    this.dateSpecificSlots[dateKey] = [];
    this.cancelDateEdit();
    this.refreshScheduleCalculations();
    const dateStr = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    this.showTempMessage(`✅ Fecha excluida: ${dateStr}`);
  }

  private showTempMessage(msg: string): void {
    this.errorMessage = msg;
    setTimeout(() => { if (this.errorMessage === msg) this.errorMessage = ''; }, 3000);
  }

  // ─── MOVE SESSION ──────────────────────────────────────────────────────────
  startMoveSession(date: Date): void {
    const slots = this.getSlotsForDate(date);
    if (!slots.length) { this.errorMessage = 'No hay sesiones para mover en esta fecha'; return; }
    this.moveFromDate = date;
    this.moveFromSlots = [...slots];
    this.cancelDateEdit();
    const dateStr = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    this.errorMessage = `📦 Selecciona la fecha destino para mover la sesión del ${dateStr}`;
  }

  confirmMoveToDate(targetDate: Date): void {
    if (!this.moveFromDate || !targetDate) return;
    if (this.moveFromDate.toDateString() === targetDate.toDateString()) {
      this.showTempMessage('⚠️ No puedes mover una sesión a la misma fecha');
      this.cancelMove(); return;
    }
    const start = this.parseDateFromInput(this.fechaInicio);
    const end   = this.parseDateFromInput(this.fechaFin);
    if (targetDate < start || targetDate > end) {
      this.showTempMessage('❌ La fecha destino está fuera del rango');
      this.cancelMove(); return;
    }
    const fromKey = this.formatDateKey(this.moveFromDate);
    const toKey   = this.formatDateKey(targetDate);
    const existing = this.getSlotsForDate(targetDate);
    const merged   = this.sortSlots([...existing, ...this.moveFromSlots]).slice(0, MAX_SLOTS);
    const moveErr = this.validateSlotList(merged);
    if (moveErr) {
      this.showTempMessage(moveErr);
      this.cancelMove();
      return;
    }
    this.dateSpecificSlots[fromKey] = [];
    this.dateSpecificSlots[toKey]   = merged;
    const fromStr = this.moveFromDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const toStr   = targetDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    this.cancelMove();
    this.refreshScheduleCalculations();
    this.showTempMessage(`✅ Sesión movida del ${fromStr} al ${toStr}`);
  }

  cancelMove(): void {
    this.moveFromDate  = null;
    this.moveFromSlots = [];
    if (this.errorMessage?.startsWith('📦')) this.errorMessage = '';
  }

  // ─── SCHEDULED DATES LIST ─────────────────────────────────────────────────
  getScheduledDates(): { date: Date; slots: TimeSlot[]; isOverridden: boolean; isWeekdayOverridden: boolean; isSelectedForEdit: boolean }[] {
    const result: any[] = [];
    const start   = this.parseDateFromInput(this.fechaInicio);
    const end     = this.parseDateFromInput(this.fechaFin);
    const current = new Date(start);
    while (current <= end) {
      const slots = this.getSlotsForDate(current);
      if (slots.length) {
        const key     = this.formatDateKey(current);
        const dayName = this.getDayName(current.getDay());
        result.push({
          date: new Date(current),
          slots: [...slots],
          isOverridden:        this.dateSpecificSlots[key] !== undefined,
          isWeekdayOverridden: this.dayOfWeekOverrides[dayName] !== undefined,
          isSelectedForEdit: this.selectedDateForEdit === key
        });
      }
      current.setDate(current.getDate() + 1);
    }
    return result;
  }

  // ─── TABLERO ───────────────────────────────────────────────────────────────
  private initializeTablero(): void {
    if (!this.fechaInicio || !this.fechaFin || !this.calendarMonths.length) { this.tablero = []; return; }
    const start = this.parseDateFromInput(this.fechaInicio);
    const end   = this.parseDateFromInput(this.fechaFin);

    this.tablero = this.calendarMonths.map(monthData => {
      const monthMatrix: string[][] = Array(31).fill(null).map(() => Array(MAX_SLOTS).fill(''));
      const lastDay = new Date(monthData.year, monthData.month + 1, 0).getDate();
      for (let day = 1; day <= lastDay; day++) {
        const date = new Date(monthData.year, monthData.month, day);
        if (date < start || date > end) continue;
        const slots = this.getSlotsForDate(date);
        slots.forEach((slot, i) => {
          if (i < MAX_SLOTS) monthMatrix[day - 1][i] = `${slot.horaInicio}-${slot.horaFin}`;
        });
      }
      return monthMatrix;
    });
  }

  // ─── CALENDAR GENERATION ───────────────────────────────────────────────────
  generateCalendar(): void {
    if (!this.fechaInicio || !this.fechaFin) return;
    this.calendarMonths = [];
    const start     = this.parseDateFromInput(this.fechaInicio);
    const end       = this.parseDateFromInput(this.fechaFin);
    const current   = new Date(start.getFullYear(), start.getMonth(), 1);
    const lastMonth = new Date(end.getFullYear(),   end.getMonth(),   1);
    while (current <= lastMonth) {
      this.calendarMonths.push(this.generateMonth(new Date(current)));
      current.setMonth(current.getMonth() + 1);
    }
    this.initializeTablero();
  }

  private refreshScheduleCalculations(options: { validate?: boolean } = {}): void {
    this.generateCalendar();

    const shapeError = this.getScheduleShapeError();
    if (shapeError) {
      this.errorMessage = shapeError;
      this.resetCalculatedTariff();
      return;
    }

    if (!this.errorMessage?.startsWith('✅') && !this.errorMessage?.startsWith('📦')) {
      this.errorMessage = '';
    }

    this.calculateTariff();

    if (options.validate) {
      this.validateSchedule();
    }
  }

  private resetCalculatedTariff(): void {
    this.calculatedTariff = 0;
    this.tariffDetails = [];
  }

  private getScheduleShapeError(): string | null {
    const globalErr = this.validateSlotList(this.globalSlots);
    if (globalErr) return globalErr;

    for (const [dayName, slots] of Object.entries(this.dayOfWeekOverrides)) {
      const err = this.validateSlotList(slots);
      if (err) return `${this.getWeekdayDisplayName(dayName)}: ${err}`;
    }

    for (const [dateKey, slots] of Object.entries(this.dateSpecificSlots)) {
      if (!slots.length) continue;
      const err = this.validateSlotList(slots);
      if (err) return `${dateKey}: ${err}`;
    }

    return null;
  }

  private getCantidadPersonasError(): string | null {
    if (!this.cantidadPersonas) {
      return this.requiresCantidadPersonas
        ? 'Debe ingresar la cantidad de personas para esta tarifa'
        : null;
    }

    if (this.cantidadPersonas < 1) {
      return 'La cantidad de personas debe ser mayor a 0';
    }

    const maxPersonas = this.dataField?.capacidadPersonas;
    if (maxPersonas && this.cantidadPersonas > maxPersonas) {
      return `La cantidad de personas supera la capacidad máxima: ${maxPersonas}`;
    }

    return null;
  }

  onCantidadPersonasChange(): void {
    const error = this.getCantidadPersonasError();
    if (error) {
      this.errorMessage = error;
      return;
    }

    if (this.errorMessage === 'Debe ingresar la cantidad de personas para esta tarifa' ||
        this.errorMessage === 'La cantidad de personas debe ser mayor a 0' ||
        this.errorMessage?.includes('capacidad máxima')) {
      this.errorMessage = '';
    }
  }

  private generateMonth(date: Date): any {
    const year     = date.getFullYear();
    const month    = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const weeks: any[] = [];
    let week: any[] = [];

    for (let i = 0; i < firstDay.getDay(); i++) week.push({ empty: true });

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const currentDate = new Date(year, month, day);
      const isInRange   = currentDate >= this.parseDateFromInput(this.fechaInicio)
                       && currentDate <= this.parseDateFromInput(this.fechaFin);
      const dateKey     = this.formatDateKey(currentDate);
      const dayName     = this.getDayName(currentDate.getDay());
      const slots       = this.getSlotsForDate(currentDate);
      const hasSchedule      = isInRange && slots.length > 0;
      const isDateOverride   = isInRange && this.dateSpecificSlots[dateKey] !== undefined;
      const isWeekdayOverride= isInRange && this.dayOfWeekOverrides[dayName] !== undefined && !isDateOverride;
      const isEmptyOverride  = isDateOverride && slots.length === 0;
      const isSelectedForEdit= this.selectedDateForEdit === dateKey;
      const isMoveSource     = this.moveFromDate ? this.formatDateKey(this.moveFromDate) === dateKey : false;
      const isReserved       = hasSchedule && this.checkReservationConflicts(currentDate);

      week.push({
        date: currentDate, day, isInRange, isSelectable: isInRange,
        dayOfWeek: currentDate.getDay(), dayName,
        hasSchedule, isDateOverride, isWeekdayOverride, isEmptyOverride,
        isSelectedForEdit, isMoveSource, isReserved,
        slotCount: slots.length,
        conflictDetails: isReserved ? this.getDayConflicts(currentDate) : null
      });

      if (week.length === 7) { weeks.push(week); week = []; }
    }

    while (week.length > 0 && week.length < 7) week.push({ empty: true });
    if (week.length) weeks.push(week);

    return { year, month, monthName: this.getMonthName(month), weeks };
  }

  // ─── DATE CHANGE HANDLERS ──────────────────────────────────────────────────
  onFechaInicioChange(): void {
    if (this.fechaInicio >= this.fechaFin) {
      const newEnd = new Date(this.fechaInicio + 'T00:00:00');
      newEnd.setMonth(newEnd.getMonth() + 1);
      this.fechaFin = this.formatDateForInput(newEnd);
    }
    this.applyMaxRecurrentDuration();
    this.dateSpecificSlots  = {};
    this.dayOfWeekOverrides = {};
    this.cancelDateEdit();
    this.refreshScheduleCalculations();
  }

  onFechaFinChange(): void {
    const startDate = this.parseDateFromInput(this.fechaInicio);
    const endDate   = this.parseDateFromInput(this.fechaFin);
    if (endDate <= startDate) { this.errorMessage = 'La fecha de fin debe ser posterior al inicio'; return; }
    this.applyMaxRecurrentDuration();
    this.dateSpecificSlots  = {};
    this.dayOfWeekOverrides = {};
    this.cancelDateEdit();
    this.refreshScheduleCalculations();
  }

  // ─── LOAD FIELD CONSTRAINTS ────────────────────────────────────────────────
  private loadFieldConstraints(): void {
    const horarioLV = this.dataField?.horariosFijosDtoList?.find(h => h.dia === 'lunes_viernes' && h.abierto);
    if (horarioLV) {
      this.minTime = horarioLV.horaApertura?.slice(0, 5) || '06:00';
      this.maxTime = horarioLV.horaCierre?.slice(0, 5)  || '23:00';
    }
    if (this.dataTariff?.desde) {
      const t = this.dataTariff.desde.slice(0, 5);
      if (t > this.minTime) this.minTime = t;
    }
    if (this.dataTariff?.hasta) {
      const t = this.dataTariff.hasta.slice(0, 5);
      if (t < this.maxTime) this.maxTime = t;
    }
    this.globalSlots.forEach(s => {
      if (s.horaInicio < this.minTime) s.horaInicio = this.minTime;
      if (s.horaFin    > this.maxTime) s.horaFin    = this.maxTime;
    });
  }

  // ─── TARIFF ────────────────────────────────────────────────────────────────
  calculateTariff(): void {
    this.calculatedTariff = 0;
    this.tariffDetails    = [];
    if (!this.dataTariff) return;
    if (this.getScheduleShapeError() || !this.diasSemana.some(d => d.selected)) return;

    const totalHours   = this.calculateTotalHours();
    const billingMonths= this.calculateTotalMonths();

    switch (this.dataTariff.tipoCobro) {
      case 'mensualidad':
        this.calculatedTariff = this.dataTariff.precioBase * billingMonths;
        this.tariffDetails.push(`Tarifa mensual: Bs. ${this.dataTariff.precioBase} × ${billingMonths} mes(es) = Bs. ${this.calculatedTariff.toFixed(2)}`);
        break;
      case 'por_club':
        this.calculatedTariff = this.dataTariff.precioBase * billingMonths;
        this.tariffDetails.push(`Tarifa por club: Bs. ${this.dataTariff.precioBase} × ${billingMonths} mes(es) = Bs. ${this.calculatedTariff.toFixed(2)}`);
        break;
      case 'por_sesion': {
        const h = this.calculateHoursWithinTariffRange();
        this.calculatedTariff = this.dataTariff.precioBase * h;
        this.tariffDetails.push(`Horas cobrables: Bs. ${this.dataTariff.precioBase} × ${h.toFixed(1)}h = Bs. ${this.calculatedTariff.toFixed(2)}`);
        break;
      }
      case 'por_hora': {
        const h = this.calculateHoursWithinTariffRange();
        this.calculatedTariff = this.dataTariff.precioBase * h;
        this.tariffDetails.push(`Por hora: Bs. ${this.dataTariff.precioBase} × ${h.toFixed(1)}h = Bs. ${this.calculatedTariff.toFixed(2)}`);
        break;
      }
    }
    this.calculateAdditionalConcepts(totalHours, billingMonths);
  }

  private calculateAdditionalConcepts(totalHours: number, totalMonths: number): void {
    if (!this.dataTariff.conceptosDtos?.length) return;
    let conceptTotal = 0;
    this.dataTariff.conceptosDtos.forEach((concepto: any) => {
      if (!concepto.activo) return;
      let conceptAmount = 0; let conceptDetail = '';
      switch (concepto.tipo) {
        case 'por_hora': case 'por_sesion': {
          const h = this.calculateApplicableHoursForConcepto(concepto);
          if (h > 0) { conceptAmount = (concepto.valor || 0) * h; conceptDetail = `${concepto.concepto}: Bs. ${concepto.valor} × ${h.toFixed(1)}h = Bs. ${conceptAmount.toFixed(2)}`; }
          break;
        }
        case 'mensualidad':
          conceptAmount  = (concepto.valor || 0) * totalMonths;
          conceptDetail = `${concepto.concepto}: Bs. ${concepto.valor} × ${totalMonths} meses = Bs. ${conceptAmount.toFixed(2)}`;
          break;
        case 'porcentaje':
          conceptAmount  = (this.calculatedTariff * (concepto.valor || 0)) / 100;
          conceptDetail = `${concepto.concepto}: ${concepto.valor}% = Bs. ${conceptAmount.toFixed(2)}`;
          break;
        case 'monto_fijo': case 'fijo':
          conceptAmount  = concepto.valor || 0;
          conceptDetail = `${concepto.concepto}: Bs. ${conceptAmount.toFixed(2)}`;
          break;
      }
      if (conceptAmount > 0) { this.calculatedTariff += conceptAmount; conceptTotal += conceptAmount; this.tariffDetails.push(conceptDetail); }
    });
    if (conceptTotal > 0) this.tariffDetails.push(`Total conceptos adicionales: Bs. ${conceptTotal.toFixed(2)}`);
  }

  calculateTotalHours(): number {
    let total = 0;
    this.tablero.forEach(m => m.forEach(d => d.forEach(s => {
      if (!s) return;
      const [a, b] = s.split('-');
      if (a && b) total += this.calculateDuration(a, b);
    })));
    return total;
  }

  countProgrammedSlots(): number {
    let total = 0;
    this.tablero.forEach(month => month.forEach(day => day.forEach(slot => {
      if (slot) total++;
    })));
    return total;
  }

  getBillableSessionCount(): number {
    if (this.getScheduleShapeError()) return 0;

    if (this.dataTariff?.tipoCobro === 'por_sesion') {
      return this.calculateHoursWithinTariffRange();
    }

    return this.countProgrammedSlots();
  }

  private calculateAverageDuration(): number {
    let dur = 0; let count = 0;
    this.tablero.forEach(m => m.forEach(d => d.forEach(s => {
      if (!s) return;
      const [a, b] = s.split('-');
      if (a && b) { dur += this.calculateDuration(a, b); count++; }
    })));
    return count > 0 ? dur / count : 0;
  }

  private calculateHoursWithinTariffRange(): number {
    if (!this.dataTariff.desde || !this.dataTariff.hasta) return this.calculateTotalHours();
    const tS = this.timeToMinutes(this.dataTariff.desde);
    const tE = this.timeToMinutes(this.dataTariff.hasta);
    let h = 0;
    this.tablero.forEach(m => m.forEach(d => d.forEach(s => {
      if (!s) return;
      const [a, b] = s.split('-');
      if (!a || !b) return;
      h += Math.max(0, Math.min(this.timeToMinutes(b), tE) - Math.max(this.timeToMinutes(a), tS)) / 60;
    })));
    return h;
  }

  private calculateApplicableHoursForConcepto(concepto: any): number {
    if (!concepto.desde || !concepto.hasta) return this.calculateTotalHours();
    const cS = this.timeToMinutes(concepto.desde);
    const cE = this.timeToMinutes(concepto.hasta);
    let h = 0;
    this.tablero.forEach(m => m.forEach(d => d.forEach(s => {
      if (!s) return;
      const [a, b] = s.split('-');
      if (!a || !b) return;
      h += Math.max(0, Math.min(this.timeToMinutes(b), cE) - Math.max(this.timeToMinutes(a), cS)) / 60;
    })));
    return h;
  }

  calculateTotalMonths(): number {
    if (!this.fechaInicio || !this.fechaFin) return 0;
    const start = this.stripTime(this.parseDateFromInput(this.fechaInicio));
    const end   = this.stripTime(this.parseDateFromInput(this.fechaFin));
    if (end < start) return 0;
    let count    = 1;
    let cycleEnd = this.addMonthsSafe(start, 1);
    while (end > cycleEnd) { count++; cycleEnd = this.addMonthsSafe(start, count); }
    return count;
  }

  private stripTime(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }

  private addMonthsSafe(date: Date, months: number): Date {
    const d    = new Date(date);
    const orig = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(orig, last));
    return this.stripTime(d);
  }

  // ─── CONFLICT DETECTION ────────────────────────────────────────────────────
  private checkReservationConflicts(date: Date): boolean {
    if (!this.reservationsList?.length) return false;
    const slots = this.getSlotsForDate(date);
    if (!slots.length) return false;
    return slots.some(slot => this.getConflictForSlot(date, slot).hasConflict);
  }

  private getConflictForSlot(date: Date, slot: TimeSlot) {
    return this.conflictService.checkConflict(
      this.dataField.uuid!,
      {
        date,
        startTime: this.normalizeTime(slot.horaInicio),
        endTime: this.normalizeTime(slot.horaFin)
      },
      this.reservationsList
    );
  }

  private getConflictReason(date: Date, slot: TimeSlot): string | null {
    const conflict = this.getConflictForSlot(date, slot);
    if (!conflict.hasConflict) return null;
    const reserva = conflict.conflictingReservations[0];
    if (!reserva) return conflict.reason || 'Horario ocupado';
    const typeLabel = reserva.reservaRecurrenteDto ? 'Reserva recurrente' : 'Reserva puntual';
    return `${typeLabel} #${reserva.numeroReserva || reserva.uuid || ''}`.trim();
  }

  private getDayConflicts(date: Date): ReservationConflict {
    const dayName = this.getDayName(date.getDay());
    const conflictingSlots = this.getSlotsForDate(date)
      .map(slot => ({ slot, conflictWith: this.getConflictReason(date, slot) }))
      .filter(c => c.conflictWith !== null) as any[];
    return { date: new Date(date), dayName, conflictingSlots };
  }

  private checkAllConflicts(): ReservationConflict[] {
    const conflicts: ReservationConflict[] = [];
    const start = this.parseDateFromInput(this.fechaInicio);
    const end   = this.parseDateFromInput(this.fechaFin);
    const cur   = new Date(start);
    while (cur <= end) {
      const c = this.getDayConflicts(new Date(cur));
      if (c.conflictingSlots.length) conflicts.push(c);
      cur.setDate(cur.getDate() + 1);
    }
    return conflicts;
  }

  hideConflicts(): void { this.showConflicts = false; }

  // ─── VALIDATION ────────────────────────────────────────────────────────────
  private validateSchedule(): boolean {
    this.errorMessage      = '';
    this.reservationConflicts = [];
    if (!this.diasSemana.some(d => d.selected)) {
      this.errorMessage = 'Debe seleccionar al menos un día de la semana'; return false;
    }
    const cantidadPersonasError = this.getCantidadPersonasError();
    if (cantidadPersonasError) { this.errorMessage = cantidadPersonasError; return false; }
    const shapeError = this.getScheduleShapeError();
    if (shapeError) { this.errorMessage = shapeError; return false; }
    if (!this.fechaInicio || !this.fechaFin) {
      this.errorMessage = 'Seleccione un rango de fechas'; return false;
    }
    if (this.parseDateFromInput(this.fechaFin) <= this.parseDateFromInput(this.fechaInicio)) {
      this.errorMessage = 'La fecha de fin debe ser posterior al inicio'; return false;
    }
    const anticipationError = this.getAnticipationError();
    if (anticipationError) {
      this.errorMessage = anticipationError;
      return false;
    }
    const maxDurationError = this.getMaxRecurrentDurationError();
    if (maxDurationError) {
      this.errorMessage = maxDurationError;
      return false;
    }
    const conflicts = this.checkAllConflicts();
    if (conflicts.length) {
      this.reservationConflicts = conflicts;
      this.showConflicts = true;
      this.errorMessage = `Se encontraron ${conflicts.length} conflicto(s) con reservas existentes.`;
      return false;
    }
    return true;
  }

  confirmar(): void {
    if (!this.validateSchedule()) return;
    const selectedDays = this.diasSemana.filter(d => d.selected);
    const cantidadSesiones = this.getBillableSessionCount();

    const scheduleData: any = {
      tipoRecurrencia:    this.tipoRecurrencia || 'semanal',
      fechaInicio:        this.parseDateFromInput(this.fechaInicio),
      fechaFin:           this.parseDateFromInput(this.fechaFin),
      diasSeleccionados:  selectedDays,
      tablero:            this.tablero,
      cantidadSesiones,
      duracionSesionHoras: this.calculateAverageDuration(),
      diasSemana:         selectedDays.map(d => d.dia).join(','),
      cantidadPersonas:   this.cantidadPersonas || undefined,
      calculatedPrice:    this.calculatedTariff,
      priceDetails:       [...this.tariffDetails]
    };

    this.scheduleCompleted.emit(scheduleData);
  }

  // ─── UTILITIES ─────────────────────────────────────────────────────────────
  private getDayName(dayOfWeek: number): string {
    return ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][dayOfWeek];
  }

  private applyMaxRecurrentDuration(): void {
    const maxDate = this.getMaxRecurrentEndDate();
    if (!maxDate || !this.fechaFin) {
      this.errorMessage = '';
      return;
    }

    const endDate = this.parseDateFromInput(this.fechaFin);
    if (endDate > maxDate) {
      this.fechaFin = this.formatDateForInput(maxDate);
      this.errorMessage = this.getMaxRecurrentDurationMessage();
    } else {
      this.errorMessage = '';
    }
  }

  private getMaxRecurrentDurationError(): string | null {
    const maxDate = this.getMaxRecurrentEndDate();
    if (!maxDate || !this.fechaFin) {
      return null;
    }

    return this.parseDateFromInput(this.fechaFin) > maxDate
      ? this.getMaxRecurrentDurationMessage()
      : null;
  }

  private getAnticipationError(): string | null {
    const anticipationHours = this.anticipationHours;
    if (!anticipationHours || !this.fechaInicio) {
      return null;
    }

    const startDate = this.getFirstSessionStart();
    if (!startDate) {
      return null;
    }
    const minDate = new Date(Date.now() + anticipationHours * 60 * 60 * 1000);
    return startDate < minDate
      ? `La reserva recurrente debe realizarse con al menos ${this.formatAnticipation(anticipationHours)} de anticipación`
      : null;
  }

  private getFirstSessionStart(): Date | null {
    if (!this.fechaInicio || !this.fechaFin) return null;
    const current = this.parseDateFromInput(this.fechaInicio);
    const end = this.parseDateFromInput(this.fechaFin);
    while (current <= end) {
      const slots = this.getSlotsForDate(current)
        .filter(slot => slot.horaInicio)
        .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
      if (slots.length) {
        const [hours, minutes] = slots[0].horaInicio.split(':').map(Number);
        const result = new Date(current);
        result.setHours(hours, minutes, 0, 0);
        return result;
      }
      current.setDate(current.getDate() + 1);
    }
    return null;
  }

  private formatAnticipation(hours: number): string {
    return hours % 24 === 0
      ? `${hours / 24} día(s)`
      : `${hours} hora(s)`;
  }

  private getMaxRecurrentEndDate(): Date | null {
    if (!this.fechaInicio) {
      return null;
    }

    const startDate = this.parseDateFromInput(this.fechaInicio);
    const maxDays = this.maxRecurrentDurationDays;

    if (!maxDays) {
      return null;
    }

    const maxDate = new Date(startDate);
    maxDate.setDate(maxDate.getDate() + Math.max(0, Math.floor(maxDays) - 1));
    return maxDate;
  }

  private getMaxRecurrentDurationMessage(): string {
    return `La reserva recurrente no puede exceder ${this.maxRecurrentDurationDays} día(s)`;
  }

  private getMonthName(month: number): string {
    return ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][month];
  }

  calculateDuration(start: string, end: string): number {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if ([sh, sm, eh, em].some(value => Number.isNaN(value))) return 0;
    return Math.max(0, ((eh * 60 + em) - (sh * 60 + sm)) / 60);
  }
private timeToMinutes(time: string): number {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

  private addHour(time: string, hoursToAdd = 1): string {
    const [h, m] = time.split(':').map(Number);
    const newH = Math.min(h + hoursToAdd, 23);
    return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private normalizeTime(time: string): string {
    return time?.length === 5 ? `${time}:00` : time;
  }

  getDayTimes(dayName: string): string {
    const slots = this.getSlotsForWeekday(dayName);
    return slots.filter(s => s.horaInicio && s.horaFin && s.horaInicio < s.horaFin)
                .map(s => `${s.horaInicio} - ${s.horaFin}`).join(', ');
  }

  get selectedDaysCount(): number  { return this.diasSemana.filter(d => d.selected).length; }
  get totalHours(): number         { return this.calculateTotalHours(); }
  get diasSeleccionadosString(): string { return this.diasSemana.filter(d => d.selected).map(d => d.diaDisplay).join(', '); }
  get canConfirm(): boolean {
    const blockingMessage = !!this.errorMessage &&
      !this.errorMessage.startsWith('✅') &&
      !this.errorMessage.startsWith('📦');
    return this.selectedDaysCount > 0 &&
      !blockingMessage &&
      !this.reservationConflicts.length &&
      !this.getCantidadPersonasError() &&
      !this.getScheduleShapeError() &&
      this.getBillableSessionCount() > 0;
  }
  get overriddenDatesCount(): number    { return Object.keys(this.dateSpecificSlots).length; }
  get overriddenWeekdaysCount(): number { return Object.keys(this.dayOfWeekOverrides).length; }
}
