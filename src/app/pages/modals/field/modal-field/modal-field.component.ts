import { Component, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, Input, Output, TemplateRef, ViewChild, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder,FormArray, FormGroup, UntypedFormBuilder, UntypedFormGroup,FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { NgbDatepickerModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import Swal from 'sweetalert2';
import { catchError, Subscription, forkJoin, Observable, of, switchMap, tap, map } from 'rxjs';

import { Categoria } from 'src/app/core/models/categoria.model';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { CamposDeportivoService } from 'src/app/core/services/api/camposDeportivos.service';
import { ComplejosService } from 'src/app/core/services/api/conplejos.service';
import { SuperficiesService } from 'src/app/core/services/api/superficies.service';
import { TarifaService } from 'src/app/core/services/api/tarifa.service';
import { CategoriaCampo, TipoExcepcion } from 'src/app/core/constants/Features';
import { ClasificadorRuat } from 'src/app/core/models/clasificadorRuat.model';
import { ClasificadorRuatService } from 'src/app/core/services/api/clasificadorRuat.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { frecuencia, TipoCobro, tiposConcepto } from 'src/app/core/constants/TipoCobro';
import { Tarifa } from 'src/app/core/models/tarifa.model';
import { EstadoActual } from 'src/app/core/constants/Estados';

@Component({
  selector: 'app-modal-field',
    standalone: true,
    imports: [
      CommonModule,
      FormsModule,
      ReactiveFormsModule,
      NgbDatepickerModule,
      TranslateModule    
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './modal-field.component.html',
  styleUrl: './modal-field.component.scss'
})
export class ModalFieldsComponent implements OnInit, OnDestroy {
  @Input() accion!: string;
  @Input() row!: CampoDeportivo;
  @Output() emitList = new EventEmitter();
  
  categoriaCampoList = Object.values(CategoriaCampo);
  estadoActualList = Object.values(EstadoActual);
  tipoExcepcionList = Object.values(TipoExcepcion);
  diaOptions = [
    { value: 'lunes_viernes', label: 'Lunes a Viernes' ,show:true ,open:true},
    { value: 'lunes', label: 'Lunes',show:false ,open:true},
    { value: 'martes', label: 'Martes',show:false ,open:true},
    { value: 'miercoles', label: 'Miércoles',show:false ,open:true},
    { value: 'jueves', label: 'Jueves',show:false ,open:true},
    { value: 'viernes', label: 'Viernes',show:false ,open:true},
    { value: 'sabado', label: 'Sábado' ,show:true ,open:false},
    { value: 'domingo', label: 'Domingo' ,show:true ,open:false}
  ];
  tipoConceptoOptions = tiposConcepto
  tipoCobroOptions = TipoCobro;
  frecuenciaOptions = frecuencia;
  diasPersonalizados: { [tarifaIndex: number]: { [diaId: number]: boolean } } = {};
  clasificadorTipoCobroMap: { [key: string]: string[] } = {
    'hora': ['por_hora'],
    'mensualidad': ['mensualidad', 'por_sesion'],
    'evento': ['por_evento'],
    'persona': ['por_persona'],
    'club': ['por_club']
  };

  surfacesList: any[] = [];
  complejosList: any[] = [];
  clasificadoresRuatList: ClasificadorRuat[] = [];
  categoriasList: Categoria[] = [];

  currentStep = 1;
  submitted = false;
  fieldsForm!: UntypedFormGroup;  
  showObsDropdown: boolean[] = [];

  @ViewChild('deleteConfirmation', { static: true }) deleteConfirmation!: TemplateRef<any>;
  @ViewChild('deleteModel') deleteModel!: ElementRef;  
  private subscription: Subscription = new Subscription();

  constructor(
    private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private complejoService: ComplejosService,
    private fieldService: CamposDeportivoService,
    private surfaceService: SuperficiesService,
    private tarifaService: TarifaService,
    private clasificadoresRuatService: ClasificadorRuatService,
    private categoriaService: CategoriasService
  ) {}

  ngOnInit(): void {
    this.getFacilities();
    this.getSurfaces();
    this.getCategorias();
    this.getClasificadoresRuat();  
    this.initForm();
    this.formDataSet();
    if (this.accion !== 'edit') {
      this.generateCodigo();
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  initForm() {
    this.fieldsForm = this.formBuilder.group({
      uuid: [null],
      estadoActual: [EstadoActual.ACTIVO, [Validators.required]],
      codigo: ['', [Validators.required, Validators.maxLength(50)]],
      nombre: ['', [Validators.required, Validators.maxLength(250)]],
      categoria: ['', [Validators.required]],
      dimensiones: ['', [Validators.maxLength(100)]],
      capacidadPersonas: [0, [Validators.min(0)]],
      tieneIluminacion: [false],
      observaciones: [''],
      accesoLibre: [false],
      requiereAprobacion: [false],
      horasMinimaAprobacion: [null, [this.conditionalApprovalValidator('requiereAprobacion', true)]],
      maxDuracionAutoAprobacion: [null],
      maxPersonasAutoAprobacion: [null],
      complejoDto: [null, [Validators.required]],
      superficieDto: [null, [Validators.required]],      
      horariosFijosDtoList: this.formBuilder.array([], [this.overlappingSchedulesValidator()]), 
      horariosExcepcionesDtoList: this.formBuilder.array([]),
      tarifasDtoList: this.formBuilder.array([])
    });
    this.initializeDefaultHorariosFijos();
  }
  private initializeDefaultHorariosFijos() {
    const horariosFijosArray = this.fieldsForm.get('horariosFijosDtoList') as FormArray;
    this.diaOptions.forEach(dia => {
      if(dia.show){
        horariosFijosArray.push(this.createHorarioFijoFormGroup({
          dia: dia.value,
          abierto: dia.open,
          horaApertura: dia.open?'08:00':null,
          horaCierre: dia.open?'22:00':null
        }));
      }
    });
  }
  private overlappingSchedulesValidator() {
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
  createHorarioFijoFormGroup(horario: any = {}): FormGroup {
    return this.formBuilder.group({
      uuid: [horario.uuid || null],
      dia: [horario.dia || '', Validators.required],
      abierto: [horario.abierto !== undefined ? horario.abierto : true],
      horaApertura: [this.extractTimeHHMM(horario.horaApertura), [this.conditionalTimeValidator('abierto')]],
      horaCierre: [this.extractTimeHHMM(horario.horaCierre), [this.conditionalTimeValidator('abierto')]],
      observaciones: [horario.observaciones || '']
    });
  }
  createHorarioExcepcionFormGroup(horario: any = {}): FormGroup {
    return this.formBuilder.group({
      uuid: [horario.uuid || null],
      fecha: [horario.fecha || '', Validators.required],
      tipoExcepcion: [horario.tipoExcepcion || '', Validators.required],
      horaApertura: [this.extractTimeHHMM(horario.horaApertura)],
      horaCierre: [this.extractTimeHHMM(horario.horaCierre)],
      motivo: [horario.motivo || '']
    });
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
  
  private conditionalApprovalValidator(dependentField: string, requiresApproval: boolean) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) return null;
      const requiresApprovalValue = control.parent.get(dependentField)?.value;
      if (requiresApproval === requiresApprovalValue && !control.value) {
        return { required: true };
      }
      return null;
    };
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
  inicializarDiasPersonalizadosParaTarifa(tarifaIndex: number) {
    if (!this.diasPersonalizados[tarifaIndex]) {
      this.diasPersonalizados[tarifaIndex] = {
        1: false, // Lunes
        2: false, // Martes
        3: false, // Miércoles
        4: false, // Jueves
        5: false, // Viernes
        6: false, // Sábado
        7: false  // Domingo
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
  private getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  private formDataSet() {
    if (this.row) {
      this.fieldsForm.patchValue({
        uuid: this.row.uuid,
        estadoActual: this.row.estadoActual,
        codigo: this.row.codigo,
        nombre: this.row.nombre,
        categoria: this.row.categoria,
        dimensiones: this.row.dimensiones,
        capacidadPersonas: this.row.capacidadPersonas,
        tieneIluminacion: this.row.tieneIluminacion,
        observaciones: this.row.observaciones,
        accesoLibre: this.row.accesoLibre,
        requiereAprobacion:this.row.requiereAprobacion,
        horasMinimaAprobacion:this.row.horasMinimaAprobacion,
        maxDuracionAutoAprobacion:this.row.maxDuracionAutoAprobacion,
        maxPersonasAutoAprobacion:this.row.maxPersonasAutoAprobacion,
        superficieDto: this.row.superficieDto,
        complejoDto: this.row.complejoDto,
      });
      const horariosFijosArray = this.fieldsForm.get('horariosFijosDtoList') as FormArray;
      horariosFijosArray.clear();
      if (this.row.horariosFijosDtoList && this.row.horariosFijosDtoList.length > 0) {
        this.row.horariosFijosDtoList.forEach((horario: any) => {
          horariosFijosArray.push(this.createHorarioFijoFormGroup({
            uuid: horario.uuid,
            dia: horario.dia,
            abierto: horario.abierto,
            horaApertura: horario.horaApertura,
            horaCierre: horario.horaCierre,
            observaciones: horario.observaciones
          }));
        });
      } else {
        this.initializeDefaultHorariosFijos();
      }
      const horariosExcepcionesArray = this.fieldsForm.get('horariosExcepcionesDtoList') as FormArray;
      horariosExcepcionesArray.clear();
      if (this.row.horariosExcepcionesDtoList && this.row.horariosExcepcionesDtoList.length > 0) {
        this.row.horariosExcepcionesDtoList.forEach((horario: any) => {
          horariosExcepcionesArray.push(this.createHorarioExcepcionFormGroup(horario));
        });
      }
      
      const tarifasArray = this.fieldsForm.get('tarifasDtoList') as FormArray;
      tarifasArray.clear();
      if (this.row.tarifasDtoList && this.row.tarifasDtoList.length > 0) {
        this.row.tarifasDtoList.forEach((tarifa: any, index: number) => {
          const tarifaGroup = this.createTarifaFormGroup({
            ...tarifa,
            sesionesIncluidas: tarifa.sesionesIncluidas ? Number(tarifa.sesionesIncluidas) : null
          });
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
      } else {
        tarifasArray.push(this.createTarifaFormGroup());
      }
    }
  }
  inicializarDiasPersonalizadosDesdeSesiones(tarifaIndex: number, sesiones: number) {
    this.inicializarDiasPersonalizadosParaTarifa(tarifaIndex);
    const dias = this.convertirSesionesToDias(sesiones);
    dias.forEach(dia => {
      this.diasPersonalizados[tarifaIndex][dia] = true;
    });
  }
  
  get form() {
    return this.fieldsForm.controls;
  }
  get horariosFijos() {
    return this.fieldsForm.get('horariosFijosDtoList') as FormArray;
  }
  get horariosExcepciones() {
    return this.fieldsForm.get('horariosExcepcionesDtoList') as FormArray;
  }
  get tarifas() {
    return this.fieldsForm.get('tarifasDtoList') as FormArray;
  }
  getConceptos(tarifaIndex: number): FormArray {
    return this.tarifas.at(tarifaIndex).get('conceptosDtos') as FormArray;
  }

  addHorarioExcepcion() {
    this.horariosExcepciones.push(this.createHorarioExcepcionFormGroup());
  }
  removeHorarioExcepcion(index: number) {
    this.horariosExcepciones.removeAt(index);
  }
  addHorarioFijo() {
    this.horariosFijos.push(this.createHorarioFijoFormGroup());
  }
  removeHorarioFijo(index: number) {
    if (this.horariosFijos.length > 1) {
      this.horariosFijos.removeAt(index);
      this.showObsDropdown.splice(index, 1);
    }
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
  addTarifa() {
    const newIndex = this.tarifas.length;
    this.tarifas.push(this.createTarifaFormGroup());
    this.inicializarDiasPersonalizadosParaTarifa(newIndex);
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
              error: (err) => {
                console.error('Error while deleting tarifa', err);
              }
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
  addConcepto(tarifaIndex: number) {
    this.getConceptos(tarifaIndex).push(this.createConceptoFormGroup());
  }
  removeConcepto(tarifaIndex: number, conceptoIndex: number) {
    this.getConceptos(tarifaIndex).removeAt(conceptoIndex);
  }

  getTipoCobro(tipo: string): string {
    const tipoMap: Record<string, string> = {
      'por_hora': 'Por hora',
      'por_persona': 'Por persona',
      'por_evento': 'Por evento',
      'mensualidad': 'Mensualidad',
      'por_club': 'Por club'
    };
    return tipo ? tipoMap[tipo] || tipo : 'No especificado';
  }

  saveData() {
    this.submitted = true;
    this.markFormGroupTouched(this.fieldsForm);
    
    if (this.fieldsForm.valid) {
      const formData = this.prepareFormData();      
      if (this.fieldsForm.get('uuid')?.value) {
        this.updateField(formData).subscribe({
          next: (result) => {
            if (result && result.status === 'OK') {
              this.notify('Campo deportivo actualizado exitosamente', 'success');
              this.closeModal();
              this.emitList.emit();
            }
          },
          error: (error) => {
            this.notify('Error en actualización: ' + error.message, 'error');
            this.submitted = false;
          }
        });
      } else {
        this.addField(formData).subscribe({
          next: (result) => {
            if (result && result.status === 'OK') {
              this.notify('Campo deportivo creado exitosamente', 'success');
              this.closeModal();
              this.emitList.emit();
            }
          },
          error: (error) => {
            this.notify('Error en creación: ' + error.message, 'error');
            this.submitted = false;
          }
        });
      }
    } else {
      this.showDetailedValidationErrors(); 
      this.currentStep = 1;
    }
  }

  private showDetailedValidationErrors(): void {
    let errorMessage = 'Complete todos los campos requeridos. Problemas encontrados:\n\n';
    if (this.fieldsForm.get('horariosFijosDtoList')?.errors?.['overlappingSchedules']) {
      errorMessage += '• ❌ Horarios superpuestos encontrados (mismo día con horarios que se solapan)\n';
    }
    const basicFields = [
      { name: 'codigo', label: 'Código' },
      { name: 'nombre', label: 'Nombre' },
      { name: 'categoria', label: 'Categoría' },
      { name: 'complejoDto', label: 'Complejo' },
      { name: 'superficieDto', label: 'Superficie' }
    ];
    basicFields.forEach(field => {
      if (this.fieldsForm.get(field.name)?.errors?.['required']) {
        errorMessage += `• ${field.label} es requerido\n`;
      }
    });
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
    this.tarifas.controls.forEach((control: AbstractControl, index: number) => {
      const formGroup = control as FormGroup;
      if (!formGroup.valid) {
        errorMessage += `• Tarifa ${index + 1}:\n`;
        if (formGroup.get('fechaInicio')?.errors?.['required']) {
          errorMessage += '  - Fecha inicio es requerida\n';
        }
        if (formGroup.get('precioBase')?.errors?.['required']) {
          errorMessage += '  - Precio base es requerido\n';
        }
        if (formGroup.get('tipoCobro')?.errors?.['required']) {
          errorMessage += '  - Tipo de cobro es requerido\n';
        }
        if (formGroup.get('clasificadorRuatDto')?.errors?.['required']) {
          errorMessage += '  - Clasificador RUAT es requerido\n';
        }
        if (formGroup.get('categoriasDtoList')?.errors?.['required']) {
          errorMessage += '  - Al menos una categoría es requerida\n';
        }
      }
    });
    Swal.fire({
      title: 'Errores de Validación',
      html: errorMessage.replace(/\n/g, '<br>'),
      icon: 'warning',
      confirmButtonText: 'Entendido'
    });
  }
  getDiaLabel(diaValue: string): string {
    const dia = this.diaOptions.find(d => d.value === diaValue);
    return dia ? dia.label : diaValue;
  }

  private prepareFormData(): CampoDeportivo {
    const formValue = this.fieldsForm.value;    
    const datos: CampoDeportivo = {
      estadoActual: formValue.estadoActual,
      codigo: formValue.codigo,
      nombre: formValue.nombre,
      categoria: formValue.categoria,
      dimensiones: formValue.dimensiones,
      capacidadPersonas: formValue.capacidadPersonas || 0,
      tieneIluminacion: formValue.tieneIluminacion,
      observaciones: formValue.observaciones,
      accesoLibre: formValue.accesoLibre,
      requiereAprobacion: formValue.requiereAprobacion,
      horasMinimaAprobacion: formValue.requiereAprobacion ? formValue.horasMinimaAprobacion : null,
      maxDuracionAutoAprobacion: !formValue.requiereAprobacion ? formValue.maxDuracionAutoAprobacion : null,
      maxPersonasAutoAprobacion: !formValue.requiereAprobacion ? formValue.maxPersonasAutoAprobacion : null,
      complejoDto: formValue.complejoDto,
      superficieDto: formValue.superficieDto,
      horariosFijosDtoList: formValue.horariosFijosDtoList.map((h: any) => ({
        uuid: h.uuid || undefined,
        dia: h.dia,
        abierto: h.abierto,
        horaApertura: this.formatTimeForBackend(h.horaApertura),
        horaCierre: this.formatTimeForBackend(h.horaCierre),
        observaciones: h.observaciones || null
      })),
      horariosExcepcionesDtoList: formValue.horariosExcepcionesDtoList.map((h: any) => ({
        uuid: h.uuid || undefined,
        fecha: h.fecha,
        tipoExcepcion: h.tipoExcepcion,
        horaApertura: this.formatTimeForBackend(h.horaApertura),
        horaCierre: this.formatTimeForBackend(h.horaCierre),
        motivo: h.motivo || null
      })),
      tarifasDtoList: formValue.tarifasDtoList.map((t: any) => ({
        uuid: t.uuid || undefined,
        precioBase: parseFloat(t.precioBase),
        fechaInicio: t.fechaInicio,
        fechaFin: t.fechaFin || null,
        desde: this.formatTimeForBackend(t.desde),
        hasta: this.formatTimeForBackend(t.hasta),
        descripcion: t.descripcion || null,
        observaciones: t.observaciones || null,
        activo: t.activo,
        tipoCobro: t.tipoCobro,
        frecuencia: t.tipoCobro === 'mensualidad' ? t.frecuencia : null,
        sesionesIncluidas: t.tipoCobro === 'mensualidad' ? parseInt(t.sesionesIncluidas) : null,        
        clasificadorRuatDto: t.clasificadorRuatDto,
        categoriasDtoList: t.categoriasDtoList.map((cat: any) => ({
          categoriaDto: cat
        })),        
        conceptosDtos: t.conceptosDtos?.map((c: any) => ({
          uuid: c.uuid || undefined,
          concepto: c.concepto,
          tipo: c.tipo,
          valor: parseFloat(c.valor),
          desde: this.formatTimeForBackend(c.desde),
          hasta: this.formatTimeForBackend(c.hasta),
          activo: c.activo
        })) || []
      }))
    };
    if (formValue.uuid) {
      datos.uuid = formValue.uuid;
    }
    datos.fechaCreacion = new Date();
    return datos;
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
    return displayParts.join('');
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

  calcularSesionesFromDias(dias: number[]): number {
    if (dias.length === 0) return 0;
    return parseInt(dias.join(''));
  }
  convertirSesionesToDias(sesiones: number): number[] {
    if (!sesiones || sesiones === 0) return [];    
    return sesiones.toString().split('').map(Number);
  }
  private markFormGroupTouched(formGroup: FormGroup | FormArray) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      }
    });
  }

  generateCodigo() {
    const timestamp = Date.now().toString().slice(-6);
    const randomPart = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const codigo = `CAMPO-${timestamp}${randomPart}`;
    this.fieldsForm.patchValue({ codigo: codigo });
  }
  formatDate(date: string | Date | null): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-BO');
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

  /* API Requests */
  private getFacilities() {
    this.complejoService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.complejosList = data.payload;
        }
      },
      error: (error) => {
        this.notify('No se pudo recuperar los complejos', 'error');
      }
    });
  }
  private getSurfaces() {
    this.surfaceService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.surfacesList = data.payload;
        }
      },
      error: (error) => {
        this.notify('No se pudo recuperar las superficies', 'error');
      }
    });
  }
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

  private addField(datos: CampoDeportivo): Observable<any> {
    return this.fieldService.save(datos).pipe(
      tap((result: any) => {
        if (result.status !== 'OK') {
          throw new Error(result.message || 'Error al crear el campo deportivo');
        }
      }),
      catchError((error) => {
        throw error;
      })
    );
  }
  private updateField(campoData: CampoDeportivo): Observable<any> {
    return this.fieldService.update(campoData).pipe(
      tap((result: any) => {
        if (result.status !== 'OK') {
          throw new Error(result.message || 'Error al actualizar el campo deportivo');
        }
      }),
      catchError((error) => {
        throw error;
      })
    );
  }
  deleteData(uuid: string) {
    this.fieldService.delete(uuid).subscribe({
      next: (data: any) => {
        this.submitted = false;
        if (data['status'] === 'OK') {
          this.notify(data.payload, 'success');
          this.modalService.dismissAll();
          this.emitList.emit();
          this.closeModal();
        }
      },
      error: err => {
        this.submitted = false;
        this.notify('No se pudo eliminar el registro!', 'error');
      }
    });
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
  
  private notify(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    Swal.fire({
      title: message,
      icon: type,
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false
    });
  }

  goToStep(step: number) {
    this.currentStep = step;
  }
  nextStep() {
    if (this.currentStep < 3) {
      this.currentStep++;
    }
  }
  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }
  public closeModal() {
    this.submitted = false;
    this.currentStep = 1;
    this.showObsDropdown = [];
    this.fieldsForm.reset();
    this.modalService.dismissAll();
  }
}