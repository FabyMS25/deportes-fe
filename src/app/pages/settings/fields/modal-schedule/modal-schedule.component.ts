import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormGroup, UntypedFormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { catchError, forkJoin, Observable, of, switchMap } from 'rxjs';
import { HorarioFijoService } from 'src/app/core/services/api/horarioFijo.service';
import { HorarioExcepcionService } from 'src/app/core/services/api/horarioExcepcion.service';
import { TipoExcepcion } from 'src/app/core/constants/Features';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { HorarioFijo } from 'src/app/core/models/horarioFijo.model';
import { HorarioExcepcion } from 'src/app/core/models/horarioExcepcion.model';

@Component({
  selector: 'app-modal-schedule',
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
    { value: 'feriado', label: 'Feriado', show: true, open: false }
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
    private horarioExcepcionService: HorarioExcepcionService,
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
      horaCierre: [this.extractTimeHHMM(horario.horaCierre), [this.conditionalTimeValidator('abierto'), this.timeRangeValidator('horaApertura')]],
      observaciones: [horario.observaciones || '']
    });
    group.get('abierto')?.valueChanges.subscribe(abierto => {
      const horaApertura = group.get('horaApertura');
      const horaCierre = group.get('horaCierre');      
      if (abierto) {
        horaApertura?.setValidators([Validators.required, this.timeRangeValidator('horaApertura')]);
        horaCierre?.setValidators([Validators.required, this.timeRangeValidator('horaApertura')]);
      } else {
        horaApertura?.clearValidators();
        horaCierre?.clearValidators();
        horaApertura?.setValue(null);
        horaCierre?.setValue(null);
      }
      horaApertura?.updateValueAndValidity();
      horaCierre?.updateValueAndValidity();
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
        // this.timeRangeValidator('horaApertura')
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
      const dias = formArray.controls.map(c => c.get('dia')?.value).filter(Boolean);
      const uniqueDias = new Set(dias);      
      if (dias.length !== uniqueDias.size) {
        return { duplicateDays: true };
      }
      return null;
    };
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
      if (!startTimeControl?.value || !endTimeControl?.value) {
        return null;
      }      
      const startTime = new Date(`1970-01-01T${startTimeControl.value}:00`);
      const endTime = new Date(`1970-01-01T${endTimeControl.value}:00`);
      if (endTime <= startTime) {
        return { invalidTimeRange: true };
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

  removeHorarioExcepcion(index: number) {
    const excepcion = this.horariosExcepciones.at(index);
    if (this.isPastException(index)) {
      this.notify('No se pueden eliminar excepciones pasadas', 'warning');
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

  addHorarioExcepcion() {
    this.horariosExcepciones.push(this.createHorarioExcepcionFormGroup());
  }

  switchTab(tab: 'fijos' | 'excepciones') {
    this.currentTab = tab;
  }

  hasAnySchedule(): boolean {
    return this.horariosFijos.length > 0 || this.horariosExcepciones.length > 0;
  }

  getDiaLabel(diaValue: string): string {
    const dia = this.diaOptions.find(d => d.value === diaValue);
    return dia ? dia.label : diaValue;
  }

  saveData() {
    this.submitted = true;
    this.markFormGroupTouched(this.form);    
    if (!this.form.valid) {      
      // this.logValidationErrors(); 
      // this.showValidationErrors();
      this.notify('Formulario Inválido. Verifique los campos requeridos.', 'error');
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

  private showValidationErrors() : void {
  let errorMessages: string[] = [];
  this.horariosFijos.controls.forEach((control, index) => {
    if (control.invalid) {
      const horarioNumber = index + 1;
      
      if (control.get('dia')?.errors?.['required']) {
        errorMessages.push(`Horario Fijo ${horarioNumber}: Día es requerido`);
      }
      
      if (control.get('horaApertura')?.errors?.['required']) {
        errorMessages.push(`Horario Fijo ${horarioNumber}: Hora de apertura es requerida cuando está abierto`);
      }
      
      if (control.get('horaCierre')?.errors?.['required']) {
        errorMessages.push(`Horario Fijo ${horarioNumber}: Hora de cierre es requerida cuando está abierto`);
      }
      
      if (control.get('horaCierre')?.errors?.['invalidTimeRange']) {
        errorMessages.push(`Horario Fijo ${horarioNumber}: La hora de cierre debe ser posterior a la hora de apertura`);
      }
    }
  });
  this.horariosExcepciones.controls.forEach((control, index) => {
    if (control.invalid && control.enabled) { // Only check enabled controls
      const excepcionNumber = index + 1;      
      if (control.get('fecha')?.errors?.['required']) {
        errorMessages.push(`Excepción ${excepcionNumber}: Fecha es requerida`);
      }      
      if (control.get('fecha')?.errors?.['pastDate']) {
        errorMessages.push(`Excepción ${excepcionNumber}: La fecha no puede ser en el pasado`);
      }      
      if (control.get('tipoExcepcion')?.errors?.['required']) {
        errorMessages.push(`Excepción ${excepcionNumber}: Tipo de excepción es requerido`);
      }
      const hasOpening = control.get('horaApertura')?.value;
      const hasClosing = control.get('horaCierre')?.value;
      if (hasOpening && hasClosing && control.get('horaCierre')?.errors?.['invalidTimeRange']) {
        errorMessages.push(`Excepción ${excepcionNumber}: La hora de cierre debe ser posterior a la hora de apertura`);
      }
    }
  });
  if (this.horariosFijos.errors?.['duplicateDays']) {
    errorMessages.push('No puede haber días duplicados en los horarios fijos');
  }
  
  if (this.horariosExcepciones.errors?.['duplicateDates']) {
    errorMessages.push('No puede haber fechas duplicadas en las excepciones');
  }

  if (errorMessages.length > 0) {
    const errorMessage = errorMessages.join('<br>');
    this.notify(`Errores de validación:<br>${errorMessage}`, 'error');
  } else {
    this.notify('Formulario Inválido. Verifique los campos requeridos.', 'error');
  }
}

  private checkFormArrayErrors(formArray: FormArray, arrayName: string) {
    formArray.controls.forEach((control, index) => {
      if (control instanceof FormGroup && control.invalid) {
        Object.keys(control.controls).forEach(key => {
          const formControl = control.get(key);
          if (formControl?.errors && formControl.enabled) { // Only check enabled controls
            if (formControl.errors['required']) {
              this.notify(`Campo requerido en ${arrayName} (fila ${index + 1}): ${key}`, 'error');
            } else if (formControl.errors['invalidTimeRange']) {
              this.notify(`La hora de cierre debe ser posterior a la hora de apertura en ${arrayName} (fila ${index + 1})`, 'error');
            } else if (formControl.errors['pastDate']) {
              this.notify(`La fecha no puede ser en el pasado en ${arrayName} (fila ${index + 1})`, 'error');
            }
          }
        });
      }
    });
  }

  /* API requests - same as before */
  private addSchedule(datos: HorarioFijo): Observable<any> {
    return this.horarioFijoService.save(datos).pipe(
      switchMap((result: any) => {
        if (result.status === 'OK') {
          return of(result);
        } else {
          throw new Error(result.message || 'Error al guardar horario');
        }
      }),
      catchError((error) => {
        throw new Error(error);
      })
    );
  }

  private updateSchedule(datos: HorarioFijo): Observable<any> {
    return this.horarioFijoService.update(datos).pipe(
      switchMap((result: any) => {
        if (result.status === 'OK') {
          return of(result);
        } else {
          throw new Error(result.message || 'Error al actualizar horario');
        }
      }),
      catchError((error) => {
        throw new Error(error);
      })
    );
  }

  private deleteSchedule(uuid: string): Observable<any> {
    return this.horarioFijoService.delete(uuid).pipe(
      switchMap((result: any) => {
        if (result.status === 'OK') {
          return of(result);
        } else {
          throw new Error(result.message || 'Error al eliminar horario');
        }
      }),
      catchError((error) => {
        throw new Error(error);
      })
    );
  }

  private addExcepcion(datos: HorarioExcepcion): Observable<any> {
    return this.horarioExcepcionService.save(datos).pipe(
      switchMap((result: any) => {
        if (result.status === 'OK') {
          return of(result);
        } else {
          throw new Error(result.message || 'Error al guardar excepción');
        }
      }),
      catchError((error) => {
        throw new Error(error);
      })
    );
  }

  private updateExcepcion(datos: HorarioExcepcion): Observable<any> {
    return this.horarioExcepcionService.update(datos).pipe(
      switchMap((result: any) => {
        if (result.status === 'OK') {
          return of(result);
        } else {
          throw new Error(result.message || 'Error al actualizar excepción');
        }
      }),
      catchError((error) => {
        throw new Error(error);
      })
    );
  }

  private deleteExcepcion(uuid: string): Observable<any> {
    return this.horarioExcepcionService.delete(uuid).pipe(
      switchMap((result: any) => {
        if (result.status === 'OK') {
          return of(result);
        } else {
          throw new Error(result.message || 'Error al eliminar excepción');
        }
      }),
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