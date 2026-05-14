import { Component, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, Input, Output, TemplateRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder,FormArray, FormGroup, UntypedFormBuilder,FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { NgbDatepickerModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import Swal from 'sweetalert2';
import { catchError, forkJoin, Observable, of, switchMap, tap, map } from 'rxjs';

import { TarifaService } from 'src/app/core/services/api/tarifa.service';
import { Categoria } from 'src/app/core/models/categoria.model';
import { TipoCobro, frecuencia, obtenerLabelTipoCobro, tiposConcepto } from 'src/app/core/constants/TipoCobro';
import { ClasificadorRuat } from 'src/app/core/models/clasificadorRuat.model';
import { ClasificadorRuatService } from 'src/app/core/services/api/clasificadorRuat.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { Tarifa } from 'src/app/core/models/tarifa.model';

@Component({
  selector: 'app-modal-tarifa',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbDatepickerModule,
    TranslateModule    
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './modal-tarifa.component.html',
  styleUrl: './modal-tarifa.component.scss'
})
export class ModalTarifaComponent implements OnInit {
  @Input() accion!: string;
  @Input() row!: CampoDeportivo;
  @Output() emitList = new EventEmitter();
  
  tipoCobroOptions = TipoCobro;
  frecuenciaOptions = frecuencia;
  tipoConceptoOptions = tiposConcepto;
  
  clasificadoresRuatList: ClasificadorRuat[] = [];
  categoriasList: Categoria[] = [];

  // Add the same mapping and days functionality
  clasificadorTipoCobroMap: { [key: string]: string[] } = {
    'hora': ['por_hora'],
    'mensualidad': ['mensualidad', 'por_sesion'],
    'evento': ['por_evento'],
    'persona': ['por_persona'],
    'club': ['por_club']
  };

  diasPersonalizados: { [tarifaIndex: number]: { [diaId: number]: boolean } } = {};

  submitted = false;
  form!: FormGroup;

  @ViewChild('deleteConfirmation', { static: true }) deleteConfirmation!: TemplateRef<any>;

  constructor(
    private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private tarifaService: TarifaService,
    private clasificadoresRuatService: ClasificadorRuatService,
    private categoriaService: CategoriasService
  ) { }

  ngOnInit() {    
    this.getClasificadoresRuat();
    this.getCategorias();
    
    this.form = this.formBuilder.group({
      tarifasDtoList: this.formBuilder.array([])
    });

    this.formDataSet();
    if (this.accion === 'show') {
      this.form.disable();
    }
  }

  private formDataSet() {
    const tarifasArray = this.form.get('tarifasDtoList') as FormArray;
    
    if (this.row.tarifasDtoList && this.row.tarifasDtoList.length > 0) {
      this.row.tarifasDtoList.forEach((tarifa: any, index: number) => {
        const tarifaGroup = this.createTarifaFormGroup(tarifa);
        
        // Initialize personalized days if needed
        if (tarifa.frecuencia === 'personalizado' && tarifa.sesionesIncluidas) {
          this.inicializarDiasPersonalizadosDesdeSesiones(index, Number(tarifa.sesionesIncluidas));
        }
        
        if (tarifa.conceptosDtos && tarifa.conceptosDtos.length > 0) {
          const conceptosArray = tarifaGroup.get('conceptosDtos') as FormArray;
          tarifa.conceptosDtos.forEach((concepto: any) => {
            conceptosArray.push(this.createConceptoFormGroup(concepto));
          });
        }
        
        tarifasArray.push(tarifaGroup);
      });
    } else if (this.accion === 'edit') {
      const newIndex = this.tarifas.length;
      this.tarifas.push(this.createTarifaFormGroup());
      this.inicializarDiasPersonalizadosParaTarifa(newIndex);
    }
  }

  createTarifaFormGroup(tarifa: any = {}): FormGroup {
    return this.formBuilder.group({
      uuid: [tarifa.uuid || null],
      fechaInicio: [tarifa.fechaInicio || this.getTodayDate(), Validators.required],
      fechaFin: [tarifa.fechaFin || null],
      precioBase: [tarifa.precioBase || '', [Validators.required, Validators.min(0)]],
      desde: [this.extractTimeHHMM(tarifa.desde)],
      hasta: [this.extractTimeHHMM(tarifa.hasta)],
      descripcion: [tarifa.descripcion || ''],
      observaciones: [tarifa.observaciones || ''],
      activo: [tarifa.activo !== undefined ? tarifa.activo : true],
      tipoCobro: [tarifa.tipoCobro || '', Validators.required],
      frecuencia: [tarifa.frecuencia || '', this.conditionalValidator('tipoCobro', 'mensualidad')],
      sesionesIncluidas: [
        tarifa.sesionesIncluidas || null, 
        [this.conditionalValidator('tipoCobro', 'mensualidad'), Validators.min(1)]
      ],
      clasificadorRuatDto: [tarifa.clasificadorRuatDto || null, Validators.required],
      categoriasDtoList: [
        tarifa.categoriasDtoList?.map((cat: any) => cat.categoriaDto || cat) || [], 
        [Validators.required, Validators.minLength(1)]
      ],
      conceptosDtos: this.formBuilder.array([])
    });
  }

  // Add conditional validator
  private conditionalValidator(dependentField: string, requiredValue: string) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) return null;      
      const dependentControlValue = control.parent.get(dependentField)?.value;
      if (dependentControlValue === requiredValue && !control.value) {
        return { required: true };
      }      
      return null;
    };
  }

  // Add the same methods from main modal
  getFilteredTipoCobroOptions(tarifaIndex: number): any[] {
    const tarifaGroup = this.tarifas.at(tarifaIndex);
    const clasificador = tarifaGroup.get('clasificadorRuatDto')?.value;    
    if (!clasificador || !clasificador.nombre) {
      return this.tipoCobroOptions;
    }
    const nombre = clasificador.nombre.toLowerCase();
    const matchingKeys = Object.keys(this.clasificadorTipoCobroMap).filter(key => 
      nombre.includes(key)
    );
    if (matchingKeys.length === 0) {
      return this.tipoCobroOptions;
    }
    const allowedTipoCobros = new Set<string>();
    matchingKeys.forEach(key => {
      this.clasificadorTipoCobroMap[key].forEach(tipo => allowedTipoCobros.add(tipo));
    });    
    return this.tipoCobroOptions.filter(option => 
      allowedTipoCobros.has(option.value)
    );
  }

  onClasificadorRuatChange(tarifaIndex: number) {
    const tarifaGroup = this.tarifas.at(tarifaIndex);
    const clasificador = tarifaGroup.get('clasificadorRuatDto')?.value;    
    if (clasificador && clasificador.nombre) {
      const nombre = clasificador.nombre.toLowerCase();
      if (nombre.includes('hora')) {
        tarifaGroup.patchValue({ tipoCobro: 'por_hora' });
      } else if (nombre.includes('mensualidad')) {
        tarifaGroup.patchValue({ tipoCobro: 'mensualidad' });
      } else if (nombre.includes('evento')) {
        tarifaGroup.patchValue({ tipoCobro: 'por_evento' });
      }
      this.onTipoCobroChange(tarifaIndex);
    }
  }

  onTipoCobroChange(tarifaIndex: number) {
    const tarifaGroup = this.tarifas.at(tarifaIndex);
    const tipoCobro = tarifaGroup.get('tipoCobro')?.value;    
    if (tipoCobro !== 'mensualidad') {
      tarifaGroup.patchValue({
        frecuencia: '',
        sesionesIncluidas: null
      });
    }
  }

  onFrecuenciaChange(tarifaIndex: number) {
    const tarifaGroup = this.tarifas.at(tarifaIndex);
    const frecuenciaValue = tarifaGroup.get('frecuencia')?.value;
    const frecuenciaConfig = this.frecuenciaOptions.find(f => f.value === frecuenciaValue);
    if (frecuenciaConfig) {
      if (frecuenciaConfig.value === 'personalizado') {
        this.resetDiasPersonalizadosParaTarifa(tarifaIndex);
        tarifaGroup.patchValue({
          sesionesIncluidas: 0
        });
      } else {
        tarifaGroup.patchValue({
          sesionesIncluidas: frecuenciaConfig.sesiones
        });
      }
    }
  }

  // Days management methods
  inicializarDiasPersonalizadosParaTarifa(tarifaIndex: number) {
    if (!this.diasPersonalizados[tarifaIndex]) {
      this.diasPersonalizados[tarifaIndex] = {
        1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false
      };
    }
  }

  getDiasPersonalizados(tarifaIndex: number): { [diaId: number]: boolean } {
    if (!this.diasPersonalizados[tarifaIndex]) {
      this.inicializarDiasPersonalizadosParaTarifa(tarifaIndex);
    }
    return this.diasPersonalizados[tarifaIndex];
  }

  resetDiasPersonalizadosParaTarifa(tarifaIndex: number) {
    this.diasPersonalizados[tarifaIndex] = {
      1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false
    };
  }

  onDiaPersonalizadoChange(tarifaIndex: number, diaId: number, event: any) {
    const isChecked = event.target.checked;
    this.inicializarDiasPersonalizadosParaTarifa(tarifaIndex);
    this.diasPersonalizados[tarifaIndex][diaId] = isChecked;
    const diasSeleccionados = Object.keys(this.diasPersonalizados[tarifaIndex])
      .filter(key => this.diasPersonalizados[tarifaIndex][parseInt(key)])
      .map(key => parseInt(key))
      .sort();    
    const sesionesValue = this.calcularSesionesFromDias(diasSeleccionados);
    const tarifaGroup = this.tarifas.at(tarifaIndex);
    tarifaGroup.patchValue({
      sesionesIncluidas: sesionesValue
    });
  }

  inicializarDiasPersonalizadosDesdeSesiones(tarifaIndex: number, sesiones: number) {
    this.inicializarDiasPersonalizadosParaTarifa(tarifaIndex);
    const dias = this.convertirSesionesToDias(sesiones);
    dias.forEach(dia => {
      this.diasPersonalizados[tarifaIndex][dia] = true;
    });
  }

  calcularSesionesFromDias(dias: number[]): number {
    if (dias.length === 0) return 0;
    return parseInt(dias.join(''));
  }

  convertirSesionesToDias(sesiones: number): number[] {
    if (!sesiones || sesiones === 0) return [];    
    return sesiones.toString().split('').map(Number);
  }

  // Display methods
  getDisplaySesionesFromNumber(sesiones: number): string {
    if (!sesiones || sesiones === 0) {
      return '❌ Ningún día seleccionado';
    }  
    const diasSemanales = [
      { id: 1, name: 'Lunes' },
      { id: 2, name: 'Martes' },
      { id: 3, name: 'Miércoles' },
      { id: 4, name: 'Jueves' },
      { id: 5, name: 'Viernes' },
      { id: 6, name: 'Sábado' },
      { id: 7, name: 'Domingo' }
    ];  
    const sesionesStr = sesiones.toString();
    const selectedDayIds = sesionesStr.split('').map(Number);
    const displayParts = diasSemanales.map(dia => {
      const isSelected = selectedDayIds.includes(dia.id);
      return `${isSelected ? '✅' : '❌'} ${dia.name}`;
    });
    return displayParts.join(' • ');
  }

  getDisplaySesionesFromDias(diasObj: { [diaId: number]: boolean }): string {
    const diasSemanales = [
      { id: 1, name: 'Lunes' },
      { id: 2, name: 'Martes' },
      { id: 3, name: 'Miércoles' },
      { id: 4, name: 'Jueves' },
      { id: 5, name: 'Viernes' },
      { id: 6, name: 'Sábado' },
      { id: 7, name: 'Domingo' }
    ];     
    const displayParts = diasSemanales.map(dia => {
      const isSelected = diasObj[dia.id];
      return `${isSelected ? '✅' : '❌'} ${dia.name}`;
    });    
    return displayParts.join(' • ');
  }

  // Rest of the existing methods remain the same...
  createConceptoFormGroup(concepto: any = {}): FormGroup {
    return this.formBuilder.group({
      uuid: [concepto.uuid || null],
      concepto: [concepto.concepto || '', Validators.required],
      tipo: [concepto.tipo || '', Validators.required],
      valor: [concepto.valor || '', [Validators.required, Validators.min(0)]],
      desde: [this.extractTimeHHMM(concepto.desde)],
      hasta: [this.extractTimeHHMM(concepto.hasta)],
      activo: [concepto.activo !== undefined ? concepto.activo : true]
    });
  }

  showTimeFields(concepto: AbstractControl): boolean {
    const tipo = concepto.get('tipo')?.value;
    return tipo === 'por_hora' || tipo === 'fijo' || tipo === 'porcentaje';
  }

  getTipoConceptoDisplay(tipo: string): string {
    const tipoMap: Record<string, string> = {
      'fijo': 'Monto Fijo',
      'porcentaje': 'Porcentaje', 
      'por_hora': 'Por Hora'
    };
    return tipo ? tipoMap[tipo] || tipo : 'No especificado';
  }

  getConceptoBadgeClass(tipo: string): string {
    switch(tipo) {
      case 'porcentaje': return 'bg-info-subtle text-info';
      case 'por_hora': return 'bg-warning-subtle text-warning';
      default: return 'bg-light-subtle text-body';
    }
  }

  toggleTimeFields(concepto: AbstractControl) {
    const desde = concepto.get('desde');
    const hasta = concepto.get('hasta');    
    if (desde?.value || hasta?.value) {
      desde?.setValue(null);
      hasta?.setValue(null);
    } else {
      desde?.setValue('06:00');
      hasta?.setValue('22:00');
    }
  }

  private extractTimeHHMM(time: string | null | undefined): string {
    if (!time) return '';
    if (time.length === 8 && time.split(':').length === 3) {
      return time.substring(0, 5);
    }
    return time;
  }

  private formatTimeForBackend(time: string | null | undefined): string | null {
    if (!time) return null;
    if (time.length === 8 && time.split(':').length === 3) {
      return time;
    }
    if (time.length === 5 && time.split(':').length === 2) {
      return time + ':00';
    }
    return time;
  }

  private getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  get tarifas() {
    return this.form.get('tarifasDtoList') as FormArray;
  }

  getConceptos(tarifaIndex: number): FormArray {
    return this.tarifas.at(tarifaIndex).get('conceptosDtos') as FormArray;
  }

  addTarifa() {
    const newIndex = this.tarifas.length;
    this.tarifas.push(this.createTarifaFormGroup());
    this.inicializarDiasPersonalizadosParaTarifa(newIndex);
  }

  addConcepto(tarifaIndex: number) {
    const conceptosArray = this.getConceptos(tarifaIndex);
    conceptosArray.push(this.createConceptoFormGroup());
  }

  removeConcepto(tarifaIndex: number, conceptoIndex: number) {
    const conceptosArray = this.getConceptos(tarifaIndex);
    conceptosArray.removeAt(conceptoIndex);
  }

  removeTarifa(index: number) {
    const tarifaGroup = this.tarifas.at(index);
    const uuid = tarifaGroup.get('uuid')?.value;
  
    if (uuid) {
      const modalRef = this.modalService.open(this.deleteConfirmation);
      modalRef.result.then(
        (result) => {
          if (result === 'delete') {
            this.deleteTarifa(uuid).subscribe({
              next: (result) => {
                if (result) {
                  this.tarifas.removeAt(index);
                  delete this.diasPersonalizados[index];
                }
              },
            });
          }
        },
        (reason) => {
        }
      );
    } else {
      this.tarifas.removeAt(index);
      delete this.diasPersonalizados[index];
    }
  }

  getTipoCobro(tipo: string): string {
    return obtenerLabelTipoCobro(tipo);
  }

  formatDate(date: string | Date | null): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-BO');
  }
  
  saveData() {
    this.submitted = true;
    
    if (!this.form.valid) {
      this.notify('Formulario Inválido. Verifique los campos requeridos.', 'error');
      return;
    }

    const saveObservables: any[] = [];

    this.tarifas.controls.forEach((control: AbstractControl) => {
      const tarifaData: any = {
        precioBase: parseFloat(control.value.precioBase),
        fechaInicio: control.value.fechaInicio,
        fechaFin: control.value.fechaFin || null,
        desde: this.formatTimeForBackend(control.value.desde),
        hasta: this.formatTimeForBackend(control.value.hasta),
        descripcion: control.value.descripcion || null,
        observaciones: control.value.observaciones || null,
        activo: control.value.activo,
        tipoCobro: control.value.tipoCobro,
        frecuencia: control.value.tipoCobro === 'mensualidad' ? control.value.frecuencia : null,
        sesionesIncluidas: control.value.tipoCobro === 'mensualidad' ? parseInt(control.value.sesionesIncluidas) : null,
        clasificadorRuatDto: control.value.clasificadorRuatDto,
        campoDeportivoDto: this.row,
        categoriasDtoList: control.value.categoriasDtoList.map((cat: any) => ({
          categoriaDto: cat
        })),
        conceptosDtos: control.value.conceptosDtos.map((concepto: any) => ({
          uuid: concepto.uuid || undefined,
          concepto: concepto.concepto,
          tipo: concepto.tipo,
          valor: parseFloat(concepto.valor),
          desde: this.formatTimeForBackend(concepto.desde),
          hasta: this.formatTimeForBackend(concepto.hasta),
          activo: concepto.activo
        }))
      };   

      if (control.value.uuid) {
        tarifaData.uuid = control.value.uuid;
        saveObservables.push(this.updateTariff(tarifaData));
      } else {
        saveObservables.push(this.addTariff(tarifaData));
      }
    });

    if (saveObservables.length === 0) {
      this.notify('No hay cambios para guardar', 'info');
      return;
    }

    forkJoin(saveObservables).subscribe({
      next: (result) => {
        if (result !== null) {
          this.notify('Tarifas guardadas exitosamente', 'success');
          this.submitted = false;
          this.form.reset();
          this.emitList.emit();
          this.modalService.dismissAll();
        }
      },
      error: (error) => {
        this.submitted = false;
        this.notify('Error en proceso de Guardar: ' + error, 'error');
      }
    });
  }

  /* API requests */
  private getClasificadoresRuat() {
    this.clasificadoresRuatService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.clasificadoresRuatList = data.payload;
        }
      },
      error: (error) => {
        this.notify('No se pudo recuperar los clasificadores RUAT', 'error');
      }
    });
  }

  private getCategorias() {
    this.categoriaService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.categoriasList = data.payload;
        }
      },
      error: (error) => {
        this.notify('No se pudo recuperar las categorías', 'error');
      }
    });
  }

  private addTariff(datos: Tarifa): Observable<any> {
    return this.tarifaService.save(datos).pipe(
      switchMap((result: any) => {
        if (result.status === 'OK') {
          return of(result);
        } else { 
          return of(null);
        }
      }),
      catchError((error) => {
        return of(null);
      })
    );
  }

  private updateTariff(datos: Tarifa): Observable<any> {
    return this.tarifaService.update(datos).pipe(
      switchMap((result: any) => {
        if (result.status === 'OK') {
          return of(result);
        } else {
          return of(null);
        }
      }),
      catchError((error) => {
        return of(null);
      })
    );
  }

  private deleteTarifa(uuid: string): Observable<boolean> {
    return this.tarifaService.delete(uuid).pipe(
      tap((data: any) => {
        if (data.status === 'OK') {
          this.notify('Tarifa eliminada exitosamente', 'success');
        } else {
          Swal.fire({ text: 'No se pudo eliminar la Tarifa', confirmButtonColor: '#299cdb' });
        }
      }),
      catchError((error) => {
        Swal.fire({ 
          text: error, 
          confirmButtonColor: '#299cdb',
          icon: 'error'
        });
        return of(false);
      }),
      map((response: string) => true),
      catchError(() => of(false))
    );
  }

  private notify(message: any, type: any): void {
    let timerInterval: any;
    Swal.fire({
      title: message,
      icon: type,
      timer: 2000,
      timerProgressBar: true,
      willClose: () => {
        clearInterval(timerInterval);
      },
    }).then((result) => {
      if (result.dismiss === Swal.DismissReason.timer) {
      }
    });
  }
  
  public closeModal() {
    this.accion = '';
    this.submitted = false;
    this.form.reset();
    this.modalService.dismissAll();
  }
}
