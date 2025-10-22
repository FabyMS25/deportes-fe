import { Component, EventEmitter, Input, Output, TemplateRef, ViewChild, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AbstractControl, FormArray, FormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { catchError, forkJoin, Observable, of, switchMap, tap, map } from 'rxjs';
import Swal from 'sweetalert2';
import { TarifaService } from 'src/app/core/services/api/tarifa.service';
import { Categoria } from 'src/app/core/models/categoria.model';
import { TipoCobro, frecuencia, tiposConcepto } from 'src/app/core/constants/TipoCobro';
import { ClasificadorRuat } from 'src/app/core/models/clasificadorRuat.model';
import { ClasificadorRuatService } from 'src/app/core/services/api/clasificadorRuat.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { Tarifa } from 'src/app/core/models/tarifa.model';
import { TarifaConcepto } from 'src/app/core/models/tarifaConcepto.model';

@Component({
  selector: 'app-modal-tarifa',
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
      this.row.tarifasDtoList.forEach((tarifa: any) => {
        const tarifaGroup = this.createTarifaFormGroup(tarifa);
        if (tarifa.conceptosDtos && tarifa.conceptosDtos.length > 0) {
          const conceptosArray = tarifaGroup.get('conceptosDtos') as FormArray;
          tarifa.conceptosDtos.forEach((concepto: any) => {
            conceptosArray.push(this.createConceptoFormGroup(concepto));
          });
        }
        
        tarifasArray.push(tarifaGroup);
      });
    } else if (this.accion === 'edit') {
      tarifasArray.push(this.createTarifaFormGroup());
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
    this.tarifas.push(this.createTarifaFormGroup());
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
        frecuencia: control.value.frecuencia || null,
        sesionesIncluidas: control.value.sesionesIncluidas ? parseInt(control.value.sesionesIncluidas) : null,
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
        Swal.fire({ text: 'No se pudo eliminar la Tarifa', confirmButtonColor: '#299cdb' });
        return of(false);
      }),
      map((data: any) => data.status === 'OK')
    );
  }

  public closeModal() {
    this.accion = '';
    this.submitted = false;
    this.form.reset();
    this.modalService.dismissAll();
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
}