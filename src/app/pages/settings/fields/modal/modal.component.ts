import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators,ValidationErrors } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject, Observable, Subscription,  combineLatest,  forkJoin, of, switchMap } from 'rxjs';
import { catchError, map, startWith, tap } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { Categoria } from 'src/app/core/models/categoria.model';
import { campoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { CamposDeportivoService } from 'src/app/core/services/api/camposDeportivos.service';
import { ComplejosService } from 'src/app/core/services/api/conplejos.service';
import { SuperficiesService } from 'src/app/core/services/api/superficies.service';
import { TarifaService } from 'src/app/core/services/api/tarifa.service';
import { TarifaCategoriesService } from 'src/app/core/services/api/tarifa-categorias.service';
import { ModalScheduleComponent } from '../modal-schedule/modal-schedule.component';
import { Ceiling } from 'src/app/core/constants/Features';
import { Districts } from 'src/app/core/constants/Places';
import { TipoCobro } from 'src/app/core/constants/TipoCobro';
import { Tarifa } from 'src/app/core/models/tarifa.model';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalFieldsComponent implements OnInit, OnDestroy {
  @Input() accion!: string;
  @Input() row!: campoDeportivo;
  @Output() emitList = new EventEmitter();
  @Input() categoryList:Categoria[]=[];
  tipoList= TipoCobro
  ceilingList= Ceiling
  surfacesList:any[]=[];
  distictList= Districts
  dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  submitted = false;
  masterSelected!: boolean;
  checkedList: any;

  fieldsForm!: UntypedFormGroup;
  multiDefaultOption='';
  complejosList:any[]=[];

  @ViewChild('deleteConfirmation', { static: true }) deleteConfirmation!: TemplateRef<any>;

  private selectedTipoSubject = new BehaviorSubject<string | null>(null);
  private selectedTipo$ = this.selectedTipoSubject.asObservable();
  filteredCategories$!: Observable<any[]>;

  private subscription: Subscription = new Subscription();
  constructor(private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private complejoService: ComplejosService,
    private canchaService: CamposDeportivoService,
    private surfaceService: SuperficiesService,
    private tarifaService: TarifaService,
    private tarifaCategoryService: TarifaCategoriesService
  ) {
  }

  ngOnInit(): void {
    this.getFacilities();
    this.getSurfaces()
    this.initForm();
    this.initFilteredCategories();
    this.formDataSet();
  }
  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  initForm() {
    this.fieldsForm = this.formBuilder.group({
      uuid: [''],
      image_src: ['brands/dribbble.png'],
      complejo: [, [Validators.required]],
      codigo: ['', [Validators.required]],
      superficie: [, [Validators.required]],
      tipo: [],
      tarifas : this.formBuilder.array([
        this.createTarifaFormGroup()
      ]),
      horariosDeAtencion : this.formBuilder.array([
        this.formBuilder.group({
          dia: [""],
          abierto: [""],
          horaInicio: [""],
          horaFin: [""]
        })
      ])
    });
  }

  createTarifaFormGroup(tarifa: any = {}): FormGroup { 
    const tipo = tarifa.categoriaDtoList?.length > 0 ? tarifa.categoriaDtoList[0].categoriaDto.tipo : '';
    return this.formBuilder.group({
      uuid: [tarifa.uuid || ''],
      costo: [tarifa.costo || '', Validators.required],
      desde: [tarifa.desde || ''],
      hasta: [tarifa.hasta || ''],
      descripcion: [tarifa.descripcion || ''],
      tipo: [tipo, Validators.required],
      categorias: [tarifa.categoriaDtoList?.map((cat:any) => cat.categoriaDto) || [], [Validators.required, this.categoriasTipoValidator]],
      categoriaDtoList: [tarifa.categoriaDtoList || []],
    });
  }
  // createTarCategoryFormGroup(): FormGroup {
  //   return this.formBuilder.group({
  //     uuid:[''],
  //     tarifaDto: [],
  //     categoriaDto: [, Validators.required],
  //   });
  // }

  private formDataSet() {    
    if (this.accion !== '' ) {
      this.fieldsForm.patchValue({
        uuid: this.row.uuid,
        image_src: '',
        codigo: this.row.codigo,
        tipo: this.row.tipo,
        superficie: this.row.superficieDto,
        complejo: this.row.complejoDto,
      });

      const tarifasArray = this.fieldsForm.get('tarifas') as FormArray;
      if (tarifasArray) {
        tarifasArray.clear();      
        if (this.row.tarifasDtoList && this.row.tarifasDtoList.length > 0) {
          this.row.tarifasDtoList.forEach(tarifa => {
            tarifasArray.push(this.createTarifaFormGroup(tarifa));
          });
        } else {
          tarifasArray.push(this.createTarifaFormGroup());
        }
      }      
      const horariosArray = this.fieldsForm.get('horariosDeAtencion') as FormArray;
      horariosArray.clear();
      const horarios = this.row.horarioDtoList? this.row.horarioDtoList : [];
      horarios.forEach((horario) => {
        const horarioGroup = this.formBuilder.group({
          dia: [horario.dia],
          abierto: [horario.abierto],
          horaInicio: [horario.horaInicio],
          horaFin: [horario.horaFin],
        });
        horariosArray.push(horarioGroup);
      });
    }
  }
  /**
   * Form data get
   */
  get form() {
    return this.fieldsForm.controls;
  }
  get horariosDeAtencion() {
      return this.fieldsForm.get('horariosDeAtencion') as FormArray;
  } 
  get tarifasCategorias() {
    return this.fieldsForm.get('tarifas') as FormArray;
  }

  initFilteredCategories() {
    this.filteredCategories$ = combineLatest([
      this.selectedTipo$,
      this.fieldsForm.valueChanges.pipe(startWith(null))
    ]).pipe(
      map(([selectedTipo, _]) => {
        if (!selectedTipo) return this.categoryList ;
        return this.categoryList.filter(category => category.tipo === selectedTipo);
      })
    );
  }
  categoriasTipoValidator(control: AbstractControl): ValidationErrors | null {
    const categorias = control.value;
    const tipo = control.parent?.get('tipo')?.value;

    if (!categorias || !tipo) {
      return null;
    }
    const allCategoriesMatchTipo = categorias.every(
      (category: any) => category.tipo === tipo
    );

    return allCategoriesMatchTipo ? null : { invalidTipo: true };
  }

  onTipoChange(index: number) {
    const tarifa = this.tarifasCategorias.at(index);
    const selectedTipo = tarifa.get('tipo')?.value;
    this.selectedTipoSubject.next(selectedTipo);
    tarifa.get('categorias')?.setValue([]);
  }

  onCategoriesChange(index: number) {
    const tarifa = this.tarifasCategorias.at(index);
    tarifa.get('categorias')?.updateValueAndValidity();
  }

  openScheduleModal(row: campoDeportivo | undefined, accion: string, size: string): Promise<any> {
    const modalRef = this.modalService.open(ModalScheduleComponent, {
      backdrop: 'static',
      size: size
    });
  
    modalRef.componentInstance.row = row;
    modalRef.componentInstance.accion = accion;
    return new Promise((resolve, reject) => {
      modalRef.componentInstance.emitList.subscribe(() => {
        // if (success) {
          resolve(true); // Action was successful
        // } else {
          // reject(false); // Action failed
        // }
      });
    });
  }

  addTariffForm() {
    this.tarifasCategorias.push(this.createTarifaFormGroup());
  }
  removeTariff(index: number) {
    const tarifaGroup = this.tarifasCategorias.at(index);
    const uuid = tarifaGroup.get('uuid')?.value;
  
    if (uuid) {
      const modalRef = this.modalService.open(this.deleteConfirmation);
      modalRef.result.then(
        (result) => {
          if (result === 'delete') {
            this.deleteTarifa(uuid).subscribe({
              next: (result) => {
                if (result) {
                  this.tarifasCategorias.removeAt(index);
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
      this.tarifasCategorias.removeAt(index);
    }
  } 

  saveData() {
    this.submitted = true;
    if (this.fieldsForm.valid) {
      this.fieldsForm.enable()
      let datos: campoDeportivo = {
        codigo: this.fieldsForm.value.codigo,
        tipo: this.fieldsForm.value.tarifas[0].tipo,
        superficieDto: this.fieldsForm.value.superficie,
        complejoDto: this.fieldsForm.value.complejo,
        tarifasDtoList: this.fieldsForm.value.tarifas,
        horarioDtoList: this.fieldsForm.value.horariosDeAtencion,
      };      

      if (this.fieldsForm.get('uuid')?.value) {
          datos.uuid = this.fieldsForm.value.uuid;
          this.updateField(datos).subscribe({
            next: (result) => {
              if (result !==null) {
                this.notify('Cancha, tarifas, y categorias exitosamente actualizados', 'success');
                this.fieldsForm.reset();
                this.emitList.emit();
              }
            },
            error: (error) => {
              this.notify('Error en proceso de actualización: ' + error, 'error');
            }
          });
      } else {
          this.addField(datos).subscribe({
            next: (result) => {
              if (result !==null) {
                // this.notify('Cancha, tarifas, y categorias exitosamente creados', 'success');
                this.saveTarifasCat(result.payload)
                this.fieldsForm.reset();
                this.emitList.emit();
              }
            },
            error: (error) => {
              this.notify('Error en proceso de actualización: ' + error, 'error');
            }
          });
      }
    } else {
        this.notify('Formulario Invalido!', 'error');
    }
  }
  
  private saveTarifasCat(cancha: any ): Observable<any> {
    const tarifaUpdates = this.tarifasCategorias.controls.map((control: AbstractControl) => {
      const tarifaData:Tarifa = {
        // ...control.value,
        // uuid: control.value.uuid,
        costo: control.value.costo,
        desde: control.value.desde,
        hasta: control.value.hasta,
        descripcion: control.value.descripcion,
        canchasDto: cancha,
        categoriaDtoList: this.mergeCategories(control.value.categoriaDtoList, control.value.categorias)
      };      
      if (control.value.uuid) {
        tarifaData.uuid = control.value.uuid;
        return this.updateTariff(tarifaData);//this.tarifaService.update(tarifaData);
      } else {
        return this.addTariff(tarifaData);//this.tarifaService.save(tarifaData);
      }
    });
    return forkJoin(tarifaUpdates)
  }

   mergeCategories(categoriaTarifaDtoList: any[], categorias: any[]): any[] {
    const mergedList: any[] = [];
    const existingCategoriaTarifaMap = new Map(
      categoriaTarifaDtoList.map(item => [item.categoriaDto.uuid, item])
    );
    existingCategoriaTarifaMap.forEach(element => {
      if(!categorias.find((categoria:any) => categoria.uuid === element.categoriaDto.uuid)){
        this.tarifaCategoryService.delete(element.uuid).subscribe()
      }
    });
    categorias.forEach(categoria => {
      const existingItem = existingCategoriaTarifaMap.get(categoria.uuid);  
      if (!existingItem) {
        mergedList.push({
          uuid: '',
          estado: false,
          categoriaDto: categoria,
          // tarifaDto: null 
        });
      }
    });  
    return mergedList;
  }
  
  /**
  * Delete model
  */
  deleteId: any;
  confirm(content: any, id: any) {
    this.deleteId = id;
    this.modalService.open(content, { centered: true });
  }

  // Delete Data
  deleteData(id: any) {
    if (id) {
      // this.store.dispatch(deleteCompany({ id: this.deleteId.toString() }));
    } else {
      // this.store.dispatch(deleteCompany({ id: this.checkedValGet.toString() }));
    }
    this.deleteId = '';
    this.masterSelected = false;
  }

  /* API Requests */
  private getFacilities(){
    this.complejoService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.complejosList = data.payload;
        }
      },
      error: (error) => {
        this.notify('No se pudo recuperar los registros: ' + error, 'error');
      }
    });
  }
    
  private getSurfaces(){
    this.surfaceService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.surfacesList = data.payload;
        }
      },
      error: (error) => {
        this.notify('No se pudo recuperar los registros: ' + error, 'error');
      }
    });
  }

  private addField(datos: campoDeportivo): Observable<any> {
    return this.canchaService.save(datos).pipe(
      switchMap(async (result: any) => {
        if(result.status === 'OK'){
          this.submitted = false;
          const modalResult = await this.openScheduleModal(result.payload, 'edit', 'md');
          if (modalResult) {
            return this.saveTarifasCat(result.payload);
          } else {
            return of(null);
          }
        }else{
          return of(null);
        }
      }),
      catchError((error) => {
        this.submitted = false;
        this.modalService.dismissAll();
        this.fieldsForm.reset();
        this.notify('Error al crear la cancha: ' + error, 'error');
        return of(null);
      })
    );
  }  

  
  private updateField(canchaData: campoDeportivo): Observable<any> {
    return this.canchaService.update(canchaData).pipe(
      switchMap(async (updatedCancha: any) => {
        if(updatedCancha.status ==='OK'){
          this.submitted = false;
          const modalResult = await this.openScheduleModal(updatedCancha.payload, 'edit', 'md');
          if (modalResult) {
            return this.saveTarifasCat(updatedCancha.payload);
          } else {
            return of(null);
          }
        }else{
          return of(null);
        }
      }),
      catchError((error) => {
        this.submitted = false;
        this.modalService.dismissAll();
        this.fieldsForm.reset();
        this.notify('Error en proceso de actualización: ' + error, 'error');
        return of(null);
      })
    );
  }

  private addTariff(datos: Tarifa): Observable<any> {
    return this.tarifaService.save(datos).pipe(
      switchMap((result: any) => {
        if(result.status === 'OK'){
          return of(result);
        }else{
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
        if(result.status === 'OK'){
          return of(result);
        }else{
          return of(null);
        }
      }),
      catchError((error) => {
        return of(null);
      })
    );
  }
  deleteTarifa(uuid: string): Observable<boolean> {
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
  
  /*  */
  public closeModal() {
    this.accion = '';
    this.fieldsForm.enable();
    this.modalService.dismissAll();
    this.fieldsForm.reset();
  }
  private notify(message: any, type: any): void {
    let timerInterval: any;
    Swal.fire({
      title: message,
      icon: type,
      // timer: 2000,
      // timerProgressBar: true,
      willClose: () => {
        clearInterval(timerInterval);
      },
    }).then((result) => {
      if (result.dismiss === Swal.DismissReason.timer) {
      }
    });
  }
  
}
