import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ValidatorFn, ValidationErrors, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { addDays, startOfWeek, endOfWeek, format, eachDayOfInterval, isSameDay, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

import { TableroService } from 'src/app/core/services/api/tablero.service';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { Contribuyente } from 'src/app/core/models/contribuyente.models';
import { ComplejosService } from 'src/app/core/services/api/conplejos.service';
import { CamposDeportivoService } from 'src/app/core/services/api/camposDeportivos.service';
import { Categoria } from 'src/app/core/models/categoria.model';
import { ComplejoDeportivo } from 'src/app/core/models/complejoDeportivo.model';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { HorarioFijo } from 'src/app/core/models/horarioFijo.model';
import { Reserva } from 'src/app/core/models/reserva.models';
import { ReservaRecurrenteService } from 'src/app/core/services/api/reserva-recurrente.service';
import { ReservaService } from 'src/app/core/services/api/reserva.service';

interface TimeSlot {
  time: string;
  isAvailable: boolean;
  isSelected: boolean;
  isStart: boolean;
  isEnd: boolean;
  isInRange: boolean;
}

interface DayInfo {
  name: string;
  shortName: string;
  dateFormatted: string;
  date: Date;
  slots: TimeSlot[];
}

@Component({
  selector: 'app-booking-recurrent-form-recurrent',
  templateUrl: './booking-recurrent-form.component.html',
  styleUrls: ['./booking-recurrent-form.component.scss']
})
export class BookingRecurrentFormRecurrentComponent implements OnInit {

  reservaForm!: FormGroup;
  submitted = false;
  loading = false;
  editMode = false;
  reservaId: string | null = null;

  // Lists
  contribuyentesList: Contribuyente[] = [];
  categoryList: Categoria[] = [];
  facilitiesList: ComplejoDeportivo[] = [];
  fieldsList: CampoDeportivo[] = [];
  filteredFields: CampoDeportivo[] = [];
  
  // Selected items
  selectedFacility: ComplejoDeportivo | null = null;
  selectedField: CampoDeportivo | null = null;
  
  // Calendar properties
  currentWeekStart: Date = new Date();
  currentWeekEnd: Date = new Date();
  selectedStartTime: string | null = null;
  selectedEndTime: string | null = null;
  
  selectedDay: DayInfo | null = null;
  weekDays: DayInfo[] = [];
  timeRange: { start: string | null; end: string | null } = { start: null, end: null };
  availableTimeSlots: string[] = [];
  timeBlocks: { label: string; slots: string[] }[] = [];

  // Time slots
  horasDisponibles: string[] = [];
  timeSlotsToShow: string[] = [];
  currentTimeSlotIndex = 0;
  slotsPerPage = 12;

  constructor(
    private formBuilder: FormBuilder,
    private reservaService: ReservaService,
    private reservaRecurrente: ReservaRecurrenteService,
    private tableroService: TableroService,
    private contribuyenteService: ContribuyentesService,
    private categoriesService: CategoriasService,
    private facilityService: ComplejosService,
    private fieldService: CamposDeportivoService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.generateTimeSlots();
  }

  ngOnInit(): void {
    this.loadData();
    this.initForm();
    this.setWeekRange(new Date());
    
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.reservaId = params['id'];
        this.editMode = true;
        this.loadReservaData(this.reservaId);
      }
    });
    
    this.generateTimeBlocks();
  }

  private loadData(): void {
    this.getContribuyentes();
    this.getCategories();
    this.getFacilities();
  }
private initForm(): void {
  this.reservaForm = this.formBuilder.group({
    fechaInicio: [null, [Validators.required, this.futureDateValidator()]],
    fechaFin: [null, [Validators.required, this.futureDateValidator(), this.dateRangeValidator()]],
    categoria: ['', Validators.required],
    superficie: [{value: '', disabled: true}, Validators.required],
    totalPersonas: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
    numeroTasa: [''],
    estadoReserva: ['Pendiente'],
    observacion: ['Reserva Programada Recurrente', [Validators.maxLength(500)]],
    contribuyente: [null, Validators.required],
    complejo: [null, Validators.required],
    cancha: [null, Validators.required],
    horarios: this.formBuilder.array([], [Validators.required, this.minHorariosValidator(1)])
  });

  // Validación cruzada entre fecha inicio y fecha fin
  this.reservaForm.get('fechaInicio')?.valueChanges.subscribe(() => {
    this.reservaForm.get('fechaFin')?.updateValueAndValidity();
  });
}

// Validadores personalizados
private futureDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const selectedDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return selectedDate < today ? { pastDate: true } : null;
  };
}

private dateRangeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const endDate = new Date(control.value);
    const startDate = new Date(this.reservaForm?.get('fechaInicio')?.value);
    
    if (!startDate || !endDate) return null;
    
    return endDate <= startDate ? { invalidDateRange: true } : null;
  };
}

private minHorariosValidator(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const horariosArray = control as FormArray;
    return horariosArray.length >= min ? null : { minHorarios: { required: min, actual: horariosArray.length } };
  };
}

// Validar que al menos un horario esté seleccionado
validateHorarios(): void {
  const horariosArray = this.reservaForm.get('horarios') as FormArray;
  if (horariosArray.length === 0) {
    this.notify('Debe seleccionar al menos un horario', 'warning');
  }
}

// Validar que la fecha fin sea mayor que la fecha inicio
validateDateRange(): void {
  const startDate = new Date(this.reservaForm.get('fechaInicio')?.value);
  const endDate = new Date(this.reservaForm.get('fechaFin')?.value);
  
  if (startDate && endDate && endDate <= startDate) {
    this.notify('La fecha de fin debe ser posterior a la fecha de inicio', 'warning');
  }
}
get today(): string {
  return new Date().toISOString().split('T')[0];
}

get observacionLength(): number {
  return this.reservaForm.get('observacion')?.value?.length || 0;
}

  onFacilitySelect(facility: ComplejoDeportivo): void {
    this.selectedFacility = facility;
    this.filteredFields = this.fieldsList.filter(field => 
      field.complejoDto.uuid === facility.uuid
    );
    this.reservaForm.patchValue({ cancha: null, superficie: '' });
    this.selectedField = null;
  }

  onFieldSelect(field: CampoDeportivo): void {
    this.selectedField = field;
    this.reservaForm.patchValue({
      superficie: field.superficieDto.descripcion
    });
    if (field.tarifasDtoList && field.tarifasDtoList.length > 0) {
      // const categorias = field.tarifasDtoList.flatMap(tarifa => 
      //   tarifa.categoriasDtoList?.map(cat => cat.nombre)
      // );
      // this.categoryList = [...new Set(categorias)].map(name => ({ nombre: name } as Categoria));
    }
  }

  isPastDate(date: Date): boolean {
    return isBefore(date, new Date());
  }

  private generateTimeSlotsForDay(date: Date): TimeSlot[] {
    const today = new Date();
    const isToday = isSameDay(date, today);
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();
    const isPast = this.isPastDate(date);

    // Si es día pasado, todos los slots no disponibles
    if (isPast) {
      return this.horasDisponibles.map(time => ({
        time,
        isAvailable: false,
        isSelected: false,
        isStart: false,
        isEnd: false,
        isInRange: false
      }));
    }

    let horariosAtencion:any = [];
    if (this.selectedField) {
      horariosAtencion = this.selectedField.horariosFijosDtoList?.filter(h => 
        h.dia.toLowerCase() === format(date, 'EEEE', { locale: es }).toLowerCase() && h.abierto
      );
    }

    return this.horasDisponibles.map(time => {
      const [hours, minutes] = time.split(':').map(Number);
      let isAvailable = false;
      if (horariosAtencion.length > 0) {
        for (const horario of horariosAtencion) {
          const [startHour, startMinute] = horario.horaApertura?.split(':').map(Number) || [0, 0];
          const [endHour, endMinute] = horario.horaCierre?.split(':').map(Number) || [23, 59];
          
          const slotTime = hours * 60 + minutes;
          const startTime = startHour * 60 + startMinute;
          const endTime = endHour * 60 + endMinute;
          
          if (slotTime >= startTime && slotTime < endTime) {
            isAvailable = true;
            break;
          }
        }
      }

      // Si es hoy, verificar que no sea hora pasada
      if (isToday && isAvailable) {
        isAvailable = hours > currentHour || (hours === currentHour && minutes > currentMinute);
      }

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

  private async loadReservaData(id: any): Promise<void> {
    try {
      this.loading = true;
      const response: any = await this.reservaService.getByUuid(id).toPromise();
      
      if (response.status === 'OK') {
        const reserva = response.payload;
        this.patchFormData(reserva);
        
        if (reserva.tablero && reserva.tablero.horario) {
          this.loadExistingHorarios(reserva.tablero.horario);
        }
      }
    } catch (error) {
      this.notify('Error al cargar la reserva', 'error');
    } finally {
      this.loading = false;
    }
  }

  
  private generateTimeBlocks(): void {
    this.timeBlocks = [
      {
        label: 'Mañana (6:00 - 12:00)',
        slots: this.horasDisponibles.filter(time => {
          const hour = parseInt(time.split(':')[0]);
          return hour >= 6 && hour < 12;
        })
      },
      {
        label: 'Tarde (12:00 - 18:00)',
        slots: this.horasDisponibles.filter(time => {
          const hour = parseInt(time.split(':')[0]);
          return hour >= 12 && hour < 18;
        })
      },
      {
        label: 'Noche (18:00 - 22:00)',
        slots: this.horasDisponibles.filter(time => {
          const hour = parseInt(time.split(':')[0]);
          return hour >= 18;
        })
      }
    ];
  }

selectDay(day: DayInfo): void {
  this.selectedDay = day;
  this.timeRange = { start: null, end: null };
  this.updateAvailableTimeSlots();
}
private updateAvailableTimeSlots(): void {
  if (!this.selectedDay) {
    this.availableTimeSlots = [];
    return;
  }

  const today = new Date();
  const isToday = isSameDay(this.selectedDay.date, today); // Usar this.selectedDay.date
  const currentHour = today.getHours();
  const currentMinute = today.getMinutes();

  this.availableTimeSlots = this.horasDisponibles.filter(time => {
    if (!isToday) return true;
    
    const [hours, minutes] = time.split(':').map(Number);
    return hours > currentHour || (hours === currentHour && minutes > currentMinute);
  });
}

addHorarioToCurrentSelection(): void {
  if (!this.selectedDay || !this.timeRange.start || !this.timeRange.end) return;

  this.addHorarioToForm(
    this.selectedDay.date,
    this.timeRange.start,
    this.timeRange.end
  );
  this.timeRange = { start: null, end: null };
}

  // Seleccionar hora inicio
  selectStartTime(time: string): void {
    this.timeRange.start = time;
    this.timeRange.end = null;
  }

  // Seleccionar hora fin
  selectEndTime(time: string): void {
    if (!this.timeRange.start) {
      this.selectStartTime(time);
      return;
    }

    const startIndex = this.availableTimeSlots.indexOf(this.timeRange.start);
    const endIndex = this.availableTimeSlots.indexOf(time);

    if (endIndex > startIndex) {
      this.timeRange.end = time;
      this.addHorarioToCurrentSelection();
    } else {
      this.timeRange.start = time;
      this.timeRange.end = null;
    }
  }
  
  isTimeInRange(time: string): boolean {
    if (!this.timeRange.start || !this.selectedDay) return false;
    
    const startIndex = this.availableTimeSlots.indexOf(this.timeRange.start);
    const currentIndex = this.availableTimeSlots.indexOf(time);
    
    return this.timeRange.end 
      ? currentIndex >= startIndex && currentIndex <= this.availableTimeSlots.indexOf(this.timeRange.end)
      : currentIndex === startIndex;
  }

  // Verificar si un slot es el inicio
  isStartTime(time: string): boolean {
    return this.timeRange.start === time;
  }

  // Verificar si un slot es el fin
  isEndTime(time: string): boolean {
    return this.timeRange.end === time;
  }

  private patchFormData(reserva: Reserva): void {
    this.reservaForm.patchValue({
      fechaInicio: reserva.fechaReserva,
      fechaFin: this.calculateEndDate(reserva.fechaReserva),
      // categoria: reserva.categoria,
      // superficie: reserva.superficie,
      // totalPersonas: reserva.totalPersonas,
      numeroTasa: reserva.numeroTasa,
      estadoReserva: reserva.estadoReserva,
      canchaDto: reserva.campoDeportivoDto,
      // observacion: reserva.observacion,
      contribuyente: reserva.contribuyenteDto
    });
  }

  // Calendar methods
  setWeekRange(date: Date): void {
    this.currentWeekStart = startOfWeek(date, { weekStartsOn: 1 });
    this.currentWeekEnd = endOfWeek(date, { weekStartsOn: 1 });
    this.generateWeekDays();
    this.updateVisibleTimeSlots();
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
    name: format(date, 'EEEE', { locale: es }),
    shortName: format(date, 'EEE', { locale: es }),
    dateFormatted: format(date, 'dd/MM'),
    date: date,
    slots: this.generateTimeSlotsForDay(date)
  }));
}

  scrollTimeSlots(direction: number): void {
    this.currentTimeSlotIndex = Math.max(0, 
      Math.min(this.horasDisponibles.length - this.slotsPerPage, 
      this.currentTimeSlotIndex + (direction * this.slotsPerPage))
    );
    this.updateVisibleTimeSlots();
  }

  private updateVisibleTimeSlots(): void {
    this.timeSlotsToShow = this.horasDisponibles.slice(
      this.currentTimeSlotIndex,
      this.currentTimeSlotIndex + this.slotsPerPage
    );
  }

selectTimeSlot(dayIndex: number, time: string): void {
  const timeIndex = this.horasDisponibles.indexOf(time);
  if (timeIndex === -1) return;

  const slot = this.weekDays[dayIndex].slots[timeIndex];
  
  if (!slot.isAvailable) return;

  if (!this.selectedStartTime) {
    this.selectedStartTime = time;
    this.selectedDay = this.weekDays[dayIndex];
    slot.isStart = true;
    slot.isSelected = true;
  } else if (!this.selectedEndTime && this.selectedDay && 
             isSameDay(this.selectedDay.date, this.weekDays[dayIndex].date)) {
    // Seleccionar hora fin (mismo día) - usar this.selectedDay.date
    this.selectedEndTime = time;
    this.highlightTimeRange(dayIndex, timeIndex);
  } else {
    // Reiniciar selección
    this.clearSelection();
    this.selectTimeSlot(dayIndex, time);
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
    const slot = this.weekDays[dayIndex].slots[i];
    slot.isSelected = true;
    
    if (i === minIndex) slot.isStart = true;
    else if (i === maxIndex) slot.isEnd = true;
    else slot.isInRange = true;
  }

  this.addHorarioToForm(this.selectedDay!.date, startTime, endTime);
}

clearSelection(): void {
  this.selectedStartTime = null;
  this.selectedEndTime = null;
  this.selectedDay = null;
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

  private generateTimeSlots(): void {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    this.horasDisponibles = slots;
    this.timeSlotsToShow = this.horasDisponibles.slice(0, this.slotsPerPage);
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
  
 private getFacilities(): void {
    this.facilityService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.facilitiesList = data.payload;
          this.getFields();
        }
      },
      error: (error) => {
        this.notify('Error al cargar complejos', 'error');
      }
    });
  }

  private getFields(): void {
    this.fieldService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.fieldsList = data.payload;
        }
      },
      error: (error) => {
        this.notify('Error al cargar canchas', 'error');
      }
    });
  }


// Verificar si un tiempo está disponible
isTimeAvailable(time: string): boolean {
  if (!this.selectedDay) return false;
  
  const slot = this.selectedDay.slots.find(s => s.time === time);
  return slot ? slot.isAvailable : false;
}

// Guardar datos con manejo completo de errores
saveData(): void {
  this.submitted = true;
  
  // Validar manualmente todos los campos
  this.validateForm();
  
  if (this.reservaForm.valid) {
    this.loading = true;
    
    const formData = this.reservaForm.getRawValue(); // Para incluir campos disabled
    
    // Preparar datos del tablero
    const tableroData = {
      horario: this.formatHorariosForBackend(formData.horarios)
    };

    this.createReservaWithRetry(formData, tableroData);
  } else {
    this.showFormErrors();
  }
}

// Crear reserva con reintentos y manejo de errores
private createReservaWithRetry(formData: any, tableroData: any, retryCount: number = 0): void {
  const maxRetries = 2;
  
  this.tableroService.save(tableroData).subscribe({
    next: (tableroResponse: any) => {
      if (tableroResponse.status === 'OK') {
        this.saveReserva(formData, tableroResponse.payload);
      } else {
        this.handleTableroError(formData, tableroData, tableroResponse, retryCount, maxRetries);
      }
    },
    error: (error) => {
      this.handleTableroError(formData, tableroData, error, retryCount, maxRetries);
    }
  });
}

private handleTableroError(formData: any, tableroData: any, error: any, retryCount: number, maxRetries: number): void {
  if (retryCount < maxRetries) {
    this.notify(`Intento ${retryCount + 1} fallido. Reintentando...`, 'warning');
    setTimeout(() => {
      this.createReservaWithRetry(formData, tableroData, retryCount + 1);
    }, 1000);
  } else {
    this.loading = false;
    this.handleApiError(error, 'Error al crear el horario de reservas');
  }
}

private saveReserva(formData: any, tablero: any): void {
  const reservaProgramada: any = {
    fechaCreacion: new Date(),
    fechaReserva: formData.fechaInicio,
    // categoria: formData.categoria,
    // superficie: formData.cancha.superficieDto.descripcion, // Fixed as requested
    // totalPersonas: formData.totalPersonas,
    numeroTasa: formData.numeroTasa || 'PENDIENTE',
    estadoReserva: formData.estadoReserva,
    campoDeportivoDto: formData.cancha,
    // observacion: formData.observacion,
    contribuyenteDto: formData.contribuyente,
    // tableroDto: tablero
  };

  if (this.editMode && this.reservaId) {
    reservaProgramada.uuid = this.reservaId;
    this.updateReserva(reservaProgramada);
  } else {
    this.createReserva(reservaProgramada);
  }
}

private createReserva(reserva: Reserva): void {
  this.reservaService.create(reserva).subscribe({
    next: (response: any) => {
      this.handleSaveResponse(response);
    },
    error: (error) => {
      this.handleApiError(error, 'Error al crear la reserva programada');
    }
  });
}

private updateReserva(reserva: Reserva): void {
  this.reservaService.update(reserva).subscribe({
    next: (response: any) => {
      this.handleSaveResponse(response);
    },
    error: (error) => {
      this.handleApiError(error, 'Error al actualizar la reserva programada');
    }
  });
}

// Manejar respuesta del servidor
private handleSaveResponse(response: any): void {
  this.loading = false;
  
  if (response.status === 'OK') {
    this.notify('Reserva programada guardada exitosamente', 'success');
    this.router.navigate(['/reservations/recurrent']);
  } else {
    this.handleApiError(response, 'Error en el servidor');
  }
}

// Manejar errores de API de manera centralizada
private handleApiError(error: any, defaultMessage: string): void {
  this.loading = false;
  
  let errorMessage = defaultMessage;
  let errorDetails = '';

  if (error?.status) {
    switch (error.status) {
      case 'UNPROCESSABLE_ENTITY':
        errorMessage = 'No se pudo procesar la solicitud';
        errorDetails = 'Verifique que todos los datos sean correctos';
        break;
      case 'NOT_FOUND':
        errorMessage = 'Recurso no encontrado';
        errorDetails = 'El elemento solicitado no existe';
        break;
      case 'CONFLICT':
        errorMessage = 'Conflicto de datos';
        errorDetails = 'Ya existe una reserva con estos datos';
        break;
      default:
        errorMessage = `Error del servidor: ${error.status}`;
    }
  }

  if (error?.payload) {
    errorDetails = error.payload;
  }

  this.showErrorDialog(errorMessage, errorDetails);
}

// Mostrar diálogo de error detallado
private showErrorDialog(title: string, message: string): void {
  Swal.fire({
    title: title,
    text: message,
    icon: 'error',
    confirmButtonText: 'Entendido',
    confirmButtonColor: '#dc3545',
    showCancelButton: false
  });
}

// Validar formulario y mostrar errores específicos
private validateForm(): void {
  Object.keys(this.reservaForm.controls).forEach(key => {
    const control = this.reservaForm.get(key);
    if (control?.invalid) {
      control.markAsTouched();
    }
  });
}

private showFormErrors(): void {
  const errors = [];
  
  if (this.reservaForm.get('complejo')?.invalid) {
    errors.push('• Seleccione un complejo deportivo');
  }
  
  if (this.reservaForm.get('cancha')?.invalid) {
    errors.push('• Seleccione una cancha');
  }
  
  if (this.reservaForm.get('fechaInicio')?.invalid) {
    if (this.reservaForm.get('fechaInicio')?.errors?.['pastDate']) {
      errors.push('• La fecha de inicio no puede ser anterior a hoy');
    } else {
      errors.push('• Ingrese una fecha de inicio válida');
    }
  }
  
  if (this.reservaForm.get('fechaFin')?.invalid) {
    if (this.reservaForm.get('fechaFin')?.errors?.['invalidDateRange']) {
      errors.push('• La fecha de fin debe ser posterior a la fecha de inicio');
    } else {
      errors.push('• Ingrese una fecha de fin válida');
    }
  }
  
  if (this.reservaForm.get('horarios')?.invalid) {
    errors.push('• Seleccione al menos un horario de reserva');
  }
  
  if (this.reservaForm.get('contribuyente')?.invalid) {
    errors.push('• Seleccione un contribuyente');
  }
  
  if (this.reservaForm.get('categoria')?.invalid) {
    errors.push('• Seleccione una categoría');
  }
  
  if (this.reservaForm.get('totalPersonas')?.invalid) {
    errors.push('• Ingrese un número válido de personas (1-100)');
  }
  
  if (errors.length > 0) {
    this.showValidationErrors(errors);
  }
}

private showValidationErrors(errors: string[]): void {
  Swal.fire({
    title: 'Errores en el formulario',
    html: `
      <div class="text-start">
        <p>Por favor corrija los siguientes errores:</p>
        <ul class="text-danger">
          ${errors.map(error => `<li>${error}</li>`).join('')}
        </ul>
      </div>
    `,
    icon: 'warning',
    confirmButtonText: 'Entendido',
    confirmButtonColor: '#ffc107'
  });
}

// En el método saveReserva, asegurar que se envíen los datos correctos
// private saveReserva(formData: any, tablero: any): void {
//   const reservaProgramada: ReservaProgramada = {
//     fechaCreated: new Date(),
//     fechaReserva: formData.fechaInicio,
//     categoria: formData.categoria,
//     superficie: formData.cancha.superficieDto.descripcion,
//     totalPersonas: formData.totalPersonas,
//     numeroTasa: formData.numeroTasa || 'PENDIENTE',
//     estadoReserva: formData.estadoReserva,
//     canchasDto: formData.cancha,
//     observacion: formData.observacion,
//     contribuyenteDto: formData.contribuyente,
//     tableroDto: tablero
//   };

//     if (this.editMode && this.reservaId) {
//       reservaProgramada.uuid = this.reservaId;
//       this.updateReserva(reservaProgramada);
//     } else {
//       this.createReserva(reservaProgramada);
//     }
//   }


  // Calcular duración entre horas
calculateDuration(startTime: string, endTime: string): string {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  let hours = endHours - startHours;
  let minutes = endMinutes - startMinutes;
  
  if (minutes < 0) {
    hours--;
    minutes += 60;
  }
  
  return `${hours}h ${minutes}m`;
}

private addHorarioToForm(date: Date, startTime: string, endTime: string): void {
  const dayName = format(date, 'EEEE', { locale: es });
  const horariosArray = this.reservaForm.get('horarios') as any;
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

getDayName(date: Date): string {
  return format(date, 'EEEE', { locale: es });
}
getFormattedDate(date: Date): string {
  return format(date, 'dd/MM', { locale: es });
}

  private handleSuccess(message: string): void {
    this.loading = false;
    this.notify(message, 'success');
    this.router.navigate(['/reservations/recurrent']);
  }

  private handleError(message: string): void {
    this.loading = false;
    this.notify(message, 'error');
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

  get horariosFormArray(): any[] {
    return (this.reservaForm.get('horarios') as any)?.value || [];
  }

  cancel(): void {
    this.router.navigate(['/reservations/recurrent']);
  }
}