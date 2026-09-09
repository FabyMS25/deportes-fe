import { Component, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, Input, Output, TemplateRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder,FormArray, FormGroup, UntypedFormBuilder,UntypedFormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { NgbDatepickerModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import Swal from 'sweetalert2';

import { catchError, forkJoin, Observable } from 'rxjs';
import { HorarioFijoService } from 'src/app/core/services/api/horarioFijo.service';
import { HorarioExcepcionService } from 'src/app/core/services/api/horarioExcepcion.service';
import { TipoExcepcion } from 'src/app/core/constants/Features';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { HorarioFijo } from 'src/app/core/models/horarioFijo.model';
import { HorarioExcepcion } from 'src/app/core/models/horarioExcepcion.model';

@Component({
  selector: 'app-modal-schedule',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbDatepickerModule,
    TranslateModule    
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './modal-schedule.component.html',
  styleUrl: './modal-schedule.component.scss'
})
export class ModalScheduleComponent implements OnInit {
  @Input() accion!: string;
  @Input() row!: CampoDeportivo;
  @Output() emitList = new EventEmitter();

  diaOptions = [
    { value: 'lunes_viernes', label: 'Lunes a Viernes', show: true, open: true },
    { value: 'lunes', label: 'Lunes', show: false, open: true },
    { value: 'martes', label: 'Martes', show: false, open: true },
    { value: 'miercoles', label: 'Miércoles', show: false, open: true },
    { value: 'jueves', label: 'Jueves', show: false, open: true },
    { value: 'viernes', label: 'Viernes', show: false, open: true },
    { value: 'sabado', label: 'Sábado', show: true, open: false },
    { value: 'domingo', label: 'Domingo', show: true, open: false },
  ];
  tipoExcepcionList = Object.values(TipoExcepcion);

  submitted = false;
  currentTab: 'fijos' | 'excepciones' = 'fijos';
  form!: FormGroup;
  showObsDropdown: boolean[] = [];

  private deletedHorariosFijos: string[] = [];
  private deletedHorariosExcepciones: string[] = [];

  constructor(
    private modalService: NgbModal,
    private horarioFijoService: HorarioFijoService,
    private scheduleExceptionService: HorarioExcepcionService,
    private formBuilder: UntypedFormBuilder,
  ) { }
  
  ngOnInit() {
    this.form = this.formBuilder.group({
      horariosFijosDtoList: this.formBuilder.array([], [this.uniqueDiasValidator()]),
      horariosExcepcionesDtoList: this.formBuilder.array([], [this.uniqueFechasValidator()])
    });
    this.formDataSet();
    if (this.accion === 'show') {
      this.form.disable();
    }
  }
  
  private formDataSet(): void {
    this.deletedHorariosFijos = [];
    this.deletedHorariosExcepciones = [];
    const horariosFijosArray = this.form.get('horariosFijosDtoList') as FormArray;
    if (this.row.horariosFijosDtoList && this.row.horariosFijosDtoList.length > 0) {
      this.row.horariosFijosDtoList.forEach((horario) => {
        horariosFijosArray.push(this.createHorarioFijoFormGroup(horario));
      });
    } else if (this.accion === 'edit') {
      this.diaOptions.forEach(dia => {
        if (dia.show) {
          horariosFijosArray.push(this.createHorarioFijoFormGroup({
            dia: dia.value,
            abierto: dia.open,
            horaApertura: dia.open ? '08:00' : null,
            horaCierre: dia.open ? '22:00' : null
          }));
        }
      });
    }
    const horariosExcepcionesArray = this.form.get('horariosExcepcionesDtoList') as FormArray;
    if (this.row.horariosExcepcionesDtoList && this.row.horariosExcepcionesDtoList.length > 0) {
      this.row.horariosExcepcionesDtoList.forEach((horario) => {
        horariosExcepcionesArray.push(this.createHorarioExcepcionFormGroup(horario));
      });
    }
  }

  createHorarioFijoFormGroup(horario: any = {}): FormGroup {
    const group = this.formBuilder.group({
      uuid: [horario.uuid || null],
      dia: [horario.dia || '', Validators.required],
      abierto: [horario.abierto !== undefined ? horario.abierto : true],
      horaApertura: [this.extractTimeHHMM(horario.horaApertura), [this.conditionalTimeValidator('abierto')]],
      horaCierre: [this.extractTimeHHMM(horario.horaCierre), [this.conditionalTimeValidator('abierto')]],
      observaciones: [horario.observaciones || '']
    });
    group.get('abierto')?.valueChanges.subscribe(abierto => {
      const horaApertura = group.get('horaApertura');
      const horaCierre = group.get('horaCierre');
      if (!abierto) {
        horaApertura?.setValue(null, { emitEvent: false });
        horaCierre?.setValue(null, { emitEvent: false });
      }
      setTimeout(() => {
        horaApertura?.updateValueAndValidity({ onlySelf: true });
        horaCierre?.updateValueAndValidity({ onlySelf: true });
      });
    });
    return group;
  }
  createHorarioExcepcionFormGroup(horario: any = {}): FormGroup {
    const isPastDate = this.isPastDate(horario.fecha);
    const isReadOnly = this.accion === 'edit' && isPastDate && horario.uuid;
    const group = this.formBuilder.group({
      uuid: [horario.uuid || null],
      fecha: [
        { value: horario.fecha || '', disabled: isReadOnly }, 
        [Validators.required, this.futureDateValidatorForNewEntries(horario.uuid)]
      ],
      tipoExcepcion: [
        { value: horario.tipoExcepcion || '', disabled: isReadOnly }, 
        Validators.required
      ],
      horaApertura: [
        { value: this.extractTimeHHMM(horario.horaApertura), disabled: isReadOnly }, 
      ],
      horaCierre: [
        { value: this.extractTimeHHMM(horario.horaCierre), disabled: isReadOnly }, 
        this.timeRangeValidator('horaApertura')
      ],
      motivo: [
        { value: horario.motivo || '', disabled: isReadOnly }
      ],
      isPastException: [isPastDate && !!horario.uuid]
    });
    return group;
  }

  private isPastDate(dateString: string): boolean {
    if (!dateString) return false;    
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);    
    return selectedDate < today;
  }

  private uniqueDiasValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const formArray = control as FormArray;
      const horarios = formArray.controls.map((c, index) => {
        const formGroup = c as FormGroup;
        return {
          index,
          dia: formGroup.get('dia')?.value,
          horaApertura: formGroup.get('horaApertura')?.value,
          horaCierre: formGroup.get('horaCierre')?.value,
          abierto: formGroup.get('abierto')?.value
        };
      }).filter(h => h.dia && h.abierto);
      const duplicates = this.findOverlappingSchedules(horarios);    
      if (duplicates.length > 0) {
        console.warn('Overlapping schedules found:', duplicates);
        return { overlappingSchedules: true };
      }    
      return null;
    };
  }

  private findOverlappingSchedules(horarios: any[]): any[] {
    const duplicates = [];
    const dayGroups = this.groupByDay(horarios);  
    for (const [dia, schedules] of Object.entries(dayGroups)) {
      if (schedules.length > 1) {
        for (let i = 0; i < schedules.length; i++) {
          for (let j = i + 1; j < schedules.length; j++) {
            if (this.schedulesOverlap(schedules[i], schedules[j])) {
              duplicates.push({ dia, schedule1: schedules[i], schedule2: schedules[j] });
            }
          }
        }
      }
    }  
    return duplicates;
  }

  private groupByDay(horarios: any[]): { [key: string]: any[] } {
    return horarios.reduce((groups, horario) => {
      const dia = horario.dia;
      if (!groups[dia]) {
        groups[dia] = [];
      }
      groups[dia].push(horario);
      return groups;
    }, {});
  }

  private schedulesOverlap(schedule1: any, schedule2: any): boolean {
    if (!schedule1.horaApertura || !schedule1.horaCierre || 
        !schedule2.horaApertura || !schedule2.horaCierre) {
      return false;
    }  
    const start1 = new Date(`1970-01-01T${schedule1.horaApertura}:00`);
    const end1 = new Date(`1970-01-01T${schedule1.horaCierre}:00`);
    const start2 = new Date(`1970-01-01T${schedule2.horaApertura}:00`);
    const end2 = new Date(`1970-01-01T${schedule2.horaCierre}:00`);
    return start1 < end2 && start2 < end1;
  }

  private uniqueFechasValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const formArray = control as FormArray;
      const fechas = formArray.controls
        .map(c => c.get('fecha')?.value)
        .filter(Boolean)
        .filter((_, index) => {
          const isPastException = formArray.at(index).get('isPastException')?.value;
          return !isPastException;
        });
      const uniqueFechas = new Set(fechas);
      
      if (fechas.length !== uniqueFechas.size) {
        return { duplicateDates: true };
      }
      return null;
    };
  }

  private timeRangeValidator(startTimeControlName: string) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) return null;
      const startTimeControl = control.parent.get(startTimeControlName);
      const endTimeControl = control;
      const isOpen = control.parent.get('abierto')?.value;
      if (!isOpen) {
        return null;
      }
      if (control === startTimeControl && !endTimeControl.value) {
        return null;
      }
      if (control === endTimeControl && !startTimeControl?.value) {
        return null;
      }
      if (startTimeControl?.value && endTimeControl.value) {
        const startTime = new Date(`1970-01-01T${startTimeControl?.value}:00`);
        const endTime = new Date(`1970-01-01T${endTimeControl.value}:00`);
        if (endTime <= startTime) {
          return { invalidTimeRange: true };
        }
      }    
      return null;
    };
  }
  private futureDateValidatorForNewEntries(existingUuid: string | null) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      if (existingUuid && this.isPastDate(control.value)) {
        return null;
      }      
      const selectedDate = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);      
      if (selectedDate < today) {
        return { pastDate: true };
      }      
      return null;
    };
  }

  private conditionalTimeValidator(dependentField: string) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) return null;
      const isOpen = control.parent.get(dependentField)?.value;
      if (isOpen && !control.value) {
        return { required: true };
      }      
      return null;
    };
  }

  private extractTimeHHMM(time: string | null | undefined): string {
    if (!time) return '';
    if (time.length === 8 && time.split(':').length === 3) {
      return time.substring(0, 5);
    }
    return time;
  }

  private formatTimeForBackend(time: string | null | undefined): string {
    if (!time) return '';
    if (time.length === 8 && time.split(':').length === 3) {
      return time;
    }
    if (time.length === 5 && time.split(':').length === 2) {
      return time + ':00';
    }
    return time;
  }

  get horariosFijos() {
    return this.form.get('horariosFijosDtoList') as FormArray;
  }
  get horariosExcepciones() {
    return this.form.get('horariosExcepcionesDtoList') as FormArray;
  }
  isPastException(index: number): boolean {
    const excepcion = this.horariosExcepciones.at(index);
    return excepcion.get('isPastException')?.value || false;
  }

  addHorarioFijo() {
    this.horariosFijos.push(this.createHorarioFijoFormGroup());
    this.showObsDropdown.push(false);
  }
  removeHorarioFijo(index: number) {
    if (this.horariosFijos.length > 1) {
      const horario = this.horariosFijos.at(index);
      const uuid = horario.get('uuid')?.value;
      if (uuid) {
        this.deletedHorariosFijos.push(uuid);
      }      
      this.horariosFijos.removeAt(index);
      this.showObsDropdown.splice(index, 1);
    } else {
      this.notify('Debe haber al menos un horario fijo', 'warning');
    }
  }
  addHorarioExcepcion() {
    this.horariosExcepciones.push(this.createHorarioExcepcionFormGroup());
  }
  removeHorarioExcepcion(index: number) {
    const excepcion = this.horariosExcepciones.at(index);
    if (this.isPastException(index)) {
      this.notify('No se pueden anular excepciones pasadas', 'warning');
      return;
    }
    const uuid = excepcion.get('uuid')?.value;
    if (uuid) {
      this.deletedHorariosExcepciones.push(uuid);
    }    
    this.horariosExcepciones.removeAt(index);
  }

  toggleObservacionesDropdown(index: number) {
    this.showObsDropdown[index] = !this.showObsDropdown[index];
    this.showObsDropdown.forEach((val, i) => {
      if (i !== index) this.showObsDropdown[i] = false;
    });
  }

  setObservacion(index: number, text: string) {
    const horario = this.horariosFijos.at(index);
    horario.get('observaciones')?.setValue(text);
    this.showObsDropdown[index] = false;
  }

  switchTab(tab: 'fijos' | 'excepciones') {
    this.currentTab = tab;
  }

  getDiaLabel(diaValue: string): string {
    const dia = this.diaOptions.find(d => d.value === diaValue);
    return dia ? dia.label : diaValue;
  }

  getGroupedSchedules(): any[] {
    const groupedMap = new Map<string, any>();    
    this.horariosFijos.controls.forEach((control: AbstractControl) => {
      const formGroup = control as FormGroup;
      const dia = formGroup.get('dia')?.value;
      const abierto = formGroup.get('abierto')?.value;
      const horaApertura = formGroup.get('horaApertura')?.value;
      const horaCierre = formGroup.get('horaCierre')?.value;
      const observaciones = formGroup.get('observaciones')?.value;      
      if (!groupedMap.has(dia)) {
        groupedMap.set(dia, {
          dia: dia,
          label: this.getDiaLabel(dia),
          isOpen: abierto,
          timeSlots: []
        });
      }      
      if (abierto && horaApertura && horaCierre) {
        groupedMap.get(dia).timeSlots.push({
          start: horaApertura,
          end: horaCierre,
          observaciones: observaciones
        });
      }
    });    
    return Array.from(groupedMap.values());
  }
  getTipoExcepcionLabel(tipo: string): string {
    const labels: { [key: string]: string } = {
      'horario_especial': 'Horario Especial',
      'mantenimiento': 'Mantenimiento',
      'evento_municipal': 'Evento Municipal'
    };
    return labels[tipo] || tipo;
  }

  saveData() {
    this.submitted = true;
    this.markFormGroupTouched(this.form);
    if (!this.form.valid) {      
      this.showDetailedValidationErrors();
      return;
    }  
    const saveObservables: Observable<any>[] = [];
    this.deletedHorariosFijos.forEach(uuid => {
      saveObservables.push(this.deleteSchedule(uuid));
    });
    this.deletedHorariosExcepciones.forEach(uuid => {
      saveObservables.push(this.deleteExcepcion(uuid));
    });
    this.horariosFijos.controls.forEach((control: AbstractControl) => {
      const formGroup = control as FormGroup;
      if (formGroup.valid && (formGroup.value.abierto || formGroup.value.uuid)) {
        const horarioData: HorarioFijo = {
          dia: formGroup.value.dia,
          abierto: formGroup.value.abierto,
          horaApertura: this.formatTimeForBackend(formGroup.value.horaApertura),
          horaCierre: this.formatTimeForBackend(formGroup.value.horaCierre),
          observaciones: formGroup.value.observaciones || null,
          campoDeportivoDto: this.row
        };          
        if (formGroup.value.uuid) {
          horarioData.uuid = formGroup.value.uuid;
          saveObservables.push(this.updateSchedule(horarioData));
        } else {
          saveObservables.push(this.addSchedule(horarioData));
        }
      }
    });
    this.horariosExcepciones.controls.forEach((control: AbstractControl, index: number) => {
      const formGroup = control as FormGroup;
      if (this.isPastException(index)) {
        return;
      }      
      if (formGroup.valid) {
        const excepcionData: HorarioExcepcion = {
          fecha: formGroup.value.fecha,
          tipoExcepcion: formGroup.value.tipoExcepcion,
          horaApertura: this.formatTimeForBackend(formGroup.value.horaApertura),
          horaCierre: this.formatTimeForBackend(formGroup.value.horaCierre),
          motivo: formGroup.value.motivo || null,
          campoDeportivoDto: this.row
        };
          
        if (formGroup.value.uuid) {
          excepcionData.uuid = formGroup.value.uuid;
          saveObservables.push(this.updateExcepcion(excepcionData));
        } else {
          saveObservables.push(this.addExcepcion(excepcionData));
        }
      }
    });
    if (saveObservables.length === 0) {
      this.notify('No hay cambios para guardar', 'info');
      this.submitted = false;
      return;
    }
    forkJoin(saveObservables).subscribe({
      next: (results) => {
        this.notify('Todos los horarios han sido guardados exitosamente', 'success');
        this.submitted = false;
        this.closeModal();
        this.emitList.emit();
      },
      error: (error) => {
        this.submitted = false;
        this.notify('Error en proceso de Guardar: ' + error, 'error');
      }
    });
  }

  private showDetailedValidationErrors(): void {
    let errorMessage = 'Formulario Inválido. Problemas encontrados:\n\n';
    if (this.form.get('horariosFijosDtoList')?.errors?.['overlappingSchedules']) {
      errorMessage += '• ❌ Horarios superpuestos encontrados (mismo día con horarios que se solapan)\n';
    }
    this.horariosFijos.controls.forEach((control: AbstractControl, index: number) => {
      const formGroup = control as FormGroup;
      const dia = formGroup.get('dia')?.value;
      const abierto = formGroup.get('abierto')?.value;      
      if (!formGroup.valid) {
        errorMessage += `• Horario ${index + 1} (${this.getDiaLabel(dia)}):\n`;
        if (formGroup.get('dia')?.errors?.['required']) {
          errorMessage += '  - Día es requerido\n';
        }
        if (abierto) {
          if (formGroup.get('horaApertura')?.errors?.['required']) {
            errorMessage += '  - Hora apertura es requerida\n';
          }
          if (formGroup.get('horaCierre')?.errors?.['required']) {
            errorMessage += '  - Hora cierre es requerida\n';
          }
          if (formGroup.errors?.['invalidTimeRange']) {
            errorMessage += '  - Hora cierre debe ser posterior a hora apertura\n';
          }
        }
      }
    });
    this.horariosExcepciones.controls.forEach((control: AbstractControl, index: number) => {
      const formGroup = control as FormGroup;      
      if (!formGroup.valid) {
        errorMessage += `• Excepción ${index + 1}:\n`;        
        if (formGroup.get('fecha')?.errors?.['required']) {
          errorMessage += '  - Fecha es requerida\n';
        }
        if (formGroup.get('fecha')?.errors?.['pastDate']) {
          errorMessage += '  - Fecha no puede ser en el pasado\n';
        }
        if (formGroup.get('tipoExcepcion')?.errors?.['required']) {
          errorMessage += '  - Tipo de excepción es requerido\n';
        }
      }
    });
    Swal.fire({
      title: 'Errores de Validación',
      html: errorMessage.replace(/\n/g, '<br>'),
      icon: 'error',
      confirmButtonText: 'Entendido'
    });
  }
  private markFormGroupTouched(formGroup: FormGroup | FormArray) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }
  
  private addSchedule(datos: HorarioFijo): Observable<any> {
    return this.horarioFijoService.save(datos).pipe(
      catchError((error) => {
        throw new Error(error);
      })
    );
  }
  private updateSchedule(datos: HorarioFijo): Observable<any> {
    return this.horarioFijoService.update(datos).pipe(
      catchError((error) => {
        throw new Error(error);
      })
    );
  }

  private deleteSchedule(uuid: string): Observable<any> {
    return this.horarioFijoService.delete(uuid).pipe(
      catchError((error) => {
        throw new Error(error);
      })
    );
  }

  private addExcepcion(datos: HorarioExcepcion): Observable<any> {
    return this.scheduleExceptionService.save(datos).pipe(
      catchError((error) => {
        throw new Error(error);
      })
    );
  }

  private updateExcepcion(datos: HorarioExcepcion): Observable<any> {
    return this.scheduleExceptionService.update(datos).pipe(
      catchError((error) => {
        throw new Error(error);
      })
    );
  }

  private deleteExcepcion(uuid: string): Observable<any> {
    return this.scheduleExceptionService.delete(uuid).pipe(
      catchError((error) => {
        throw new Error(error);
      })
    );
  }

  public closeModal() {
    this.accion = '';
    this.submitted = false;
    this.currentTab = 'fijos';
    this.showObsDropdown = [];
    this.form.reset();
    this.modalService.dismissAll();
  }

  private notify(message: any, type: any): void {
    let timerInterval: any;
    Swal.fire({
      title: message,
      icon: type,
      timer: 3000,
      timerProgressBar: true,
      willClose: () => {
        clearInterval(timerInterval);
      },
    }).then((result) => {
      if (result.dismiss === Swal.DismissReason.timer) {
      }
    });
  }
}
