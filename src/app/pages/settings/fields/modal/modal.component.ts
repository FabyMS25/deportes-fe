import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators, ValidationErrors } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, Subscription, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import Swal from 'sweetalert2';

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
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
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
    { value: 'domingo', label: 'Domingo' ,show:true ,open:false},
    { value: 'feriado', label: 'Feriado' ,show:true, open:false}
  ];
  tipoConceptoOptions = tiposConcepto
  tipoCobroOptions = TipoCobro;
  frecuenciaOptions = frecuencia;
  
  surfacesList: any[] = [];
  complejosList: any[] = [];
  clasificadoresRuatList: ClasificadorRuat[] = [];
  categoriasList: Categoria[] = [];

  submitted = false;
  currentStep = 1;
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
      horariosFijosDtoList: this.formBuilder.array([]),
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
      frecuencia: [tarifa.frecuencia || ''],
      sesionesIncluidas: [tarifa.sesionesIncluidas || null],
      clasificadorRuatDto: [tarifa.clasificadorRuatDto || null, Validators.required],
      categoriasDtoList: [
        tarifa.categoriasDtoList?.map((cat: any) => cat.categoriaDto || cat) || [], 
        [Validators.required, Validators.minLength(1)]
      ],
      conceptosDtos: this.formBuilder.array([])
    });
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
  showTimeFields(concepto: AbstractControl): boolean {
    const tipo = concepto.get('tipo')?.value;
    return tipo === 'por_hora' || tipo === 'fijo' || tipo === 'porcentaje';
  }
  private conditionalApprovalValidator(dependentField: string, requiresApproval: boolean) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) return null;
      
      const requiresApprovalValue = control.parent.get(dependentField)?.value;
      
      // If requires approval is true, then horasMinimaAprobacion is required
      // If requires approval is false, then the auto-approval fields are required
      if (requiresApproval === requiresApprovalValue && !control.value) {
        return { required: true };
      }
      return null;
    };
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
      // Clear time fields
      desde?.setValue(null);
      hasta?.setValue(null);
    } else {
      // Set default time values
      desde?.setValue('18:00');
      hasta?.setValue('06:00');
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
        this.row.tarifasDtoList.forEach((tarifa: any) => {
          const tarifaGroup = this.createTarifaFormGroup(tarifa);
          // Add conceptos if they exist
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
    } else {
      const tarifasArray = this.fieldsForm.get('tarifasDtoList') as FormArray;
      if (tarifasArray.length === 0) {
        tarifasArray.push(this.createTarifaFormGroup());
      }
    }
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

  addHorarioExcepcion() {
    this.horariosExcepciones.push(this.createHorarioExcepcionFormGroup());
  }
  removeHorarioExcepcion(index: number) {
    this.horariosExcepciones.removeAt(index);
  }

  addTarifa() {
    this.tarifas.push(this.createTarifaFormGroup());
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
                }
              },
              error: (err) => {
                console.error('Error while deleting tarifa', err);
              }
            });
          }
        },
        (reason) => {
          console.log('Delete operation canceled', reason);
        }
      );
    } else {
      this.tarifas.removeAt(index);
    }
  }

  // Conceptos methods
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

  formatDate(date: string | Date | null): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-BO');
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
      this.notify('Complete todos los campos requeridos', 'warning');
      this.currentStep = 1;
      console.log('Form errors:', this.getFormValidationErrors());
    }
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
        frecuencia: t.frecuencia || null,
        sesionesIncluidas: t.sesionesIncluidas ? parseInt(t.sesionesIncluidas) : null,
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

  private markFormGroupTouched(formGroup: FormGroup | FormArray) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private getFormValidationErrors() {
    const errors: any = {};
    Object.keys(this.fieldsForm.controls).forEach(key => {
      const control = this.fieldsForm.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  public openDeleteConfirmation() {
    if (this.row && this.row.uuid) {
      const modalRef = this.modalService.open(this.deleteModel, { 
        centered: true,
        backdrop: 'static'
      });
      
      modalRef.result.then(
        (result) => {
          if (result === 'delete' && this.row.uuid) {
            this.deleteData(this.row.uuid);
          }
        },
        (reason) => {
          console.log('Delete operation canceled', reason);
        }
      );
    }
  }

  public openDeleteModal(content: any, uuid: string) {
    const modalRef = this.modalService.open(content, { centered: true });
    modalRef.result.then(
      (result) => {
        if (result === 'delete') {
          this.deleteData(uuid);
        }
      },
      (reason) => {
        console.log('Delete operation canceled', reason);
      }
    );
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

  generateCodigo() {
    const timestamp = Date.now().toString().slice(-6);
    const randomPart = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const codigo = `CAMPO-${timestamp}${randomPart}`;
    this.fieldsForm.patchValue({ codigo: codigo });
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

  deleteTarifa(uuid: string): Observable<boolean> {
    return this.tarifaService.delete(uuid).pipe(
      tap((data: any) => {
        if (data.status === 'OK') {
          this.notify('Tarifa eliminada exitosamente', 'success');
        } else {
          throw new Error('No se pudo eliminar la tarifa');
        }
      }),
      catchError((error) => {
        this.notify('Error al eliminar la tarifa', 'error');
        return of(false);
      }),
      map((data: any) => data.status === 'OK')
    );
  }

  public closeModal() {
    this.submitted = false;
    this.currentStep = 1;
    this.showObsDropdown = [];
    this.fieldsForm.reset();
    this.modalService.dismissAll();
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
}