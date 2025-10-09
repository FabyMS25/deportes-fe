import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { addDays, startOfWeek, endOfWeek, format, eachDayOfInterval, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

import { ReservaRecurrenteService } from 'src/app/core/services/api/reserva-recurrente.service';
import { TableroService } from 'src/app/core/services/api/tablero.service';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { Contribuyente } from 'src/app/core/models/contribuyente.models';
import { Reserva } from 'src/app/core/models/reserva.models';
import { ReservaService } from 'src/app/core/services/api/reserva.service';

interface TimeSlot {
  time: string;
  isAvailable: boolean;
  isSelected: boolean;
  isStart: boolean;
  isEnd: boolean;
  isInRange: boolean;
}

interface DaySchedule {
  date: Date;
  dayName: string;
  slots: TimeSlot[];
}

@Component({
  selector: 'app-reserva-programada-calendar-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalRecurrentComponent implements OnInit {

  @Input() row: Reserva | undefined;
  @Input() accion: string = 'create';
  @Input() canActivate: string[] = [];
  @Output() emitList = new EventEmitter<void>();

  reservaForm!: FormGroup;
  submitted = false;
  loading = false;

  // Lists
  contribuyentesList: Contribuyente[] = [];
  categoryList: any[] = [];
  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  
  // Calendar properties
  currentWeekStart: Date = new Date();
  currentWeekEnd: Date = new Date();
  weekDays: DaySchedule[] = [];
  selectedStartTime: string | null = null;
  selectedEndTime: string | null = null;
  selectedDay: Date | null = null;

  // Time slots
  horasDisponibles: string[] = [];
  horarioAtencion = { inicio: '06:00', fin: '22:00' };

  constructor(
    public activeModal: NgbActiveModal,
    private formBuilder: FormBuilder,
    private reservaService: ReservaService,
    private reservaRecurrenteService: ReservaRecurrenteService,
    private tableroService: TableroService,
    private contribuyenteService: ContribuyentesService,
    private categoriesService: CategoriasService
  ) {
    this.generateTimeSlots();
  }

  ngOnInit(): void {
    this.initForm();
    this.loadData();
    this.setWeekRange(new Date());

    if (this.accion === 'edit' && this.row) {
      this.loadReservaData(this.row);
    }
  }

  private initForm(): void {
    this.reservaForm = this.formBuilder.group({
      // Información básica
      fechaInicio: [null, Validators.required],
      fechaFin: [null, Validators.required],
      categoria: ['', Validators.required],
      superficie: ['', Validators.required],
      totalPersonas: [1, [Validators.required, Validators.min(1)]],
      numeroTasa: [''],
      estadoReserva: ['Pendiente'],
      observacion: ['Reserva Programada Recurrente'],
      
      // Contribuyente
      contribuyente: [null, Validators.required],
      
      // Horarios (se llenará automáticamente desde la selección del calendario)
      horarios: this.formBuilder.array([], Validators.required)
    });
  }

  private loadData(): void {
    this.getContribuyentes();
    this.getCategories();
  }

  private loadReservaData(reserva: Reserva): void {
    this.reservaForm.patchValue({
      fechaInicio: reserva.fechaReserva,
      // fechaFin: this.calculateEndDate(reserva?.fechaReserva),
      // categoria: reserva.categoria,
      // superficie: reserva.superficie,
      // totalPersonas: reserva.totalPersonas,
      numeroTasa: reserva.numeroTasa,
      estadoReserva: reserva.estadoReserva,
      // observacion: reserva.observaciones,
      contribuyente: reserva.contribuyenteDto
    });

    // Cargar horarios existentes en el calendario
    if (reserva.reservaRecurrenteDto?.tableroDto && reserva.reservaRecurrenteDto?.tableroDto.horario) {
      this.loadExistingHorarios(reserva.reservaRecurrenteDto.tableroDto.horario);
    }
  }

  // Calendar methods
  setWeekRange(date: Date): void {
    this.currentWeekStart = startOfWeek(date, { weekStartsOn: 1 });
    this.currentWeekEnd = endOfWeek(date, { weekStartsOn: 1 });
    this.generateWeekDays();
  }

  moveWeek(direction: number): void {
    const newStartDate = new Date(this.currentWeekStart);
    newStartDate.setDate(newStartDate.getDate() + (direction * 7));
    this.setWeekRange(newStartDate);
  }

  goToToday(): void {
    this.setWeekRange(new Date());
  }

  private generateWeekDays(): void {
    const days = eachDayOfInterval({
      start: this.currentWeekStart,
      end: this.currentWeekEnd
    });

    this.weekDays = days.map(date => ({
      date,
      dayName: format(date, 'EEE', { locale: es }),
      slots: this.generateTimeSlotsForDay(date)
    }));
  }

  private generateTimeSlotsForDay(date: Date): TimeSlot[] {
    const today = new Date();
    const isToday = isSameDay(date, today);
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();

    return this.horasDisponibles.map(time => {
      const [hours, minutes] = time.split(':').map(Number);
      const isAvailable = !isToday || hours > currentHour || (hours === currentHour && minutes > currentMinute);
      
      return {
        time,
        isAvailable,
        isSelected: false,
        isStart: false,
        isEnd: false,
        isInRange: false
      };
    });
  }

  // Time slot selection
  selectTimeSlot(dayIndex: number, slotIndex: number): void {
    const slot = this.weekDays[dayIndex].slots[slotIndex];
    
    if (!slot.isAvailable) return;

    if (!this.selectedStartTime) {
      // Seleccionar hora inicio
      this.selectedStartTime = slot.time;
      this.selectedDay = this.weekDays[dayIndex].date;
      slot.isStart = true;
      slot.isSelected = true;
    } else if (!this.selectedEndTime && this.selectedDay && 
               isSameDay(this.selectedDay, this.weekDays[dayIndex].date)) {
      // Seleccionar hora fin (mismo día)
      this.selectedEndTime = slot.time;
      this.highlightTimeRange(dayIndex, slotIndex);
    } else {
      // Reiniciar selección
      this.clearSelection();
      this.selectTimeSlot(dayIndex, slotIndex);
    }
  }

  private highlightTimeRange(dayIndex: number, endSlotIndex: number): void {
    const startTime = this.selectedStartTime!;
    const endTime = this.selectedEndTime!;
    
    const startIndex = this.horasDisponibles.indexOf(startTime);
    const endIndex = this.horasDisponibles.indexOf(endTime);

    if (startIndex === -1 || endIndex === -1) return;

    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);

    // Marcar rango seleccionado
    for (let i = minIndex; i <= maxIndex; i++) {
      if (i === minIndex) {
        this.weekDays[dayIndex].slots[i].isStart = true;
      } else if (i === maxIndex) {
        this.weekDays[dayIndex].slots[i].isEnd = true;
      } else {
        this.weekDays[dayIndex].slots[i].isInRange = true;
      }
      this.weekDays[dayIndex].slots[i].isSelected = true;
    }

    // Agregar al formulario
    this.addHorarioToForm(this.weekDays[dayIndex].date, startTime, endTime);
  }

  private addHorarioToForm(date: Date, startTime: string, endTime: string): void {
    const dayName = format(date, 'EEEE', { locale: es });
    const horariosArray = this.reservaForm.get('horarios') as any;
    
    // Verificar si ya existe este horario
    const existingIndex = horariosArray.value.findIndex((h: any) => 
      h.dia === dayName && h.horaInicio === startTime && h.horaFin === endTime
    );

    if (existingIndex === -1) {
      horariosArray.push(this.formBuilder.group({
        dia: [dayName, Validators.required],
        horaInicio: [startTime, Validators.required],
        horaFin: [endTime, Validators.required]
      }));
    }
  }

  clearSelection(): void {
    this.selectedStartTime = null;
    this.selectedEndTime = null;
    this.selectedDay = null;
    
    // Limpiar selección visual
    this.weekDays.forEach(day => {
      day.slots.forEach(slot => {
        slot.isSelected = false;
        slot.isStart = false;
        slot.isEnd = false;
        slot.isInRange = false;
      });
    });
  }

  removeHorario(index: number): void {
    const horariosArray = this.reservaForm.get('horarios') as any;
    horariosArray.removeAt(index);
  }

  // Generar slots de tiempo
  private generateTimeSlots(): void {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    this.horasDisponibles = slots;
  }

  private loadExistingHorarios(horario: string[][]): void {
    const horariosArray = this.reservaForm.get('horarios') as any;
    horariosArray.clear();
    
    horario.forEach(h => {
      if (h.length >= 3) {
        horariosArray.push(this.formBuilder.group({
          dia: [h[0], Validators.required],
          horaInicio: [h[1], Validators.required],
          horaFin: [h[2], Validators.required]
        }));
      }
    });
  }

  private calculateEndDate(fechaInicio: Date): Date {
    const endDate = new Date(fechaInicio);
    endDate.setMonth(endDate.getMonth() + 1);
    return endDate;
  }

  // Servicios
  private getContribuyentes(): void {
    this.contribuyenteService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.contribuyentesList = data.payload;
        }
      },
      error: (error) => {
        this.notify('Error al cargar contribuyentes', 'error');
      }
    });
  }

  private getCategories(): void {
    this.categoriesService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.categoryList = data.payload;
        }
      },
      error: (error) => {
        this.notify('Error al cargar categorías', 'error');
      }
    });
  }

  // Guardar datos
  saveData(): void {
    this.submitted = true;
    
    if (this.reservaForm.valid) {
      this.loading = true;
      
      const formData = this.reservaForm.value;
      
      // Crear/actualizar tablero
      const tableroData = {
        horario: this.formatHorariosForBackend(formData.horarios)
      };

      const tableroOperation = this.accion === 'edit' && this.row?.reservaRecurrenteDto?.tableroDto?.uuid
        ? this.tableroService.update({ ...tableroData, uuid: this.row.reservaRecurrenteDto.tableroDto.uuid })
        : this.tableroService.save(tableroData);

      tableroOperation.subscribe({
        next: (tableroResponse: any) => {
          const tablero = tableroResponse.payload || tableroResponse;
          
          // Crear/actualizar reserva
          const reservaProgramada: any/* Reserva */ = {
            fechaCreacion: new Date(),
            fechaReserva: formData.fechaInicio,
            // categoria: formData.categoria,
            // superficie: formData.superficie,
            // totalPersonas: formData.totalPersonas,
            numeroTasa: formData.numeroTasa || 'PENDIENTE',
            estadoReserva: formData.estadoReserva,
            // observaciones: formData.observacion,
            campoDeportivoDto: formData.cancha,
            contribuyenteDto: formData.contribuyente,
            // tableroDto: tablero
          };

          if (this.accion === 'edit' && this.row?.uuid) {
            reservaProgramada.uuid = this.row.uuid;
            this.updateReserva(reservaProgramada);
          } else {
            this.createReserva(reservaProgramada);
          }
        },
        error: (error) => {
          this.loading = false;
          this.notify('Error al guardar el horario', 'error');
        }
      });
    } else {
      this.notify('Por favor complete todos los campos requeridos', 'warning');
    }
  }

  private createReserva(reserva: Reserva): void {
    this.reservaService.create(reserva).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.notify('Reserva programada creada exitosamente', 'success');
        this.emitList.emit();
        this.activeModal.close();
      },
      error: (error) => {
        this.loading = false;
        this.notify('Error al crear la reserva programada', 'error');
      }
    });
  }

  private updateReserva(reserva: Reserva): void {
    this.reservaService.update(reserva).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.notify('Reserva programada actualizada exitosamente', 'success');
        this.emitList.emit();
        this.activeModal.close();
      },
      error: (error) => {
        this.loading = false;
        this.notify('Error al actualizar la reserva programada', 'error');
      }
    });
  }

  private formatHorariosForBackend(horarios: any[]): string[][] {
    return horarios.map(h => [h.dia, h.horaInicio, h.horaFin]);
  }

  // Utilidades
  private notify(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    Swal.fire({
      title: message,
      icon: type,
      timer: 2000,
      timerProgressBar: true,
    });
  }

  get isViewMode(): boolean {
    return this.accion === 'show';
  }

  get horariosFormArray(): any[] {
    return (this.reservaForm.get('horarios') as any)?.value || [];
  }
}