import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { AbstractControl, FormArray, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators,ValidationErrors } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject, Observable, Subscription,  combineLatest,  forkJoin, of, switchMap } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';
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

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalFieldsComponent implements OnInit, OnDestroy {
  @Input() accion!: string;
  @Input() row!: campoDeportivo;
  @Output() listaItems = new EventEmitter();
  @Input() categoryList:Categoria[]=[];
  tipoList= TipoCobro
  ceilingList= Ceiling
  surfacesList:any[]=[];
  distictList= Districts
  dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

  submitted = false;
  masterSelected!: boolean;
  checkedList: any;

  fieldsForm!: UntypedFormGroup;
  multiDefaultOption='';
  // Api Data
  complejosList:any[]=[];

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

  createTarifaFormGroup(): FormGroup {
    return this.formBuilder.group({
      uuid:[''],
      costo: [, Validators.required],
      desde: [""],
      hasta: [""],
      descripcion: [""],
      categorias: [[], [Validators.required, this.categoriasTipoValidator]],
      categoriaDtoList: [[]],
      tipo: [, Validators.required],
    });
  }
  createTarCatFormGroup(): FormGroup {
    return this.formBuilder.group({
      uuid:[''],
      tarifaDto: [],
      categoriaDto: [, Validators.required],
    });
  }

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
            const tipo = tarifa.categoriaDtoList.length >0? tarifa.categoriaDtoList[0].categoriaDto.tipo :''
            const tarifaGroup = this.formBuilder.group({
              uuid: [tarifa.uuid],
              costo: [tarifa.costo],
              desde: [tarifa.desde],
              hasta: [tarifa.hasta],
              descripcion: [tarifa.descripcion],
              tipo: [tipo],
              categorias: [tarifa.categoriaDtoList.map(cat => cat.categoriaDto)],
              categoriaDtoList: [tarifa.categoriaDtoList ],
            });
            tarifasArray.push(tarifaGroup);
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
        if (!selectedTipo) return [];
        return this.categoryList.filter(category => category.tipo === selectedTipo);
      })
    );
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



  openScheduleModal(row: campoDeportivo | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalScheduleComponent, {
        backdrop: 'static',
        size:size
    });
    modalRef.componentInstance.row = row;
    modalRef.componentInstance.accion = accion;
  }

  addTarifa() {
    this.tarifasCategorias.push(this.createTarifaFormGroup());
  }
  removeTarifa(index: number) {
    if (this.tarifasCategorias.length > 1) {
      this.tarifasCategorias.removeAt(index);
    }
  } 
  saveAll() {
    this.updateCancha(this.fieldsForm.value).subscribe({
      next: (result) => {
        if (result !== null) {
          this.notify('Cancha, tarifas, y categorias actualizados exitosamente', 'success');
        }
      },
      error: (error) => {
        this.notify('Error in update process: ' + error, 'error');
      }
    });
  }

  saveData() {
    this.submitted = true;
    if (this.fieldsForm.valid) {
      this.fieldsForm.enable()
      let datos: campoDeportivo = {
        codigo: this.fieldsForm.value.codigo,
        // tipo: this.fieldsForm.value.tipo,
        tipo: this.fieldsForm.value.tarifas[0].tipo,
        superficieDto: this.fieldsForm.value.superficie,
        complejoDto: this.fieldsForm.value.complejo,
        tarifasDtoList: this.fieldsForm.value.tarifas,
        horarioDtoList: this.fieldsForm.value.horariosDeAtencion,
      };
      

      if (this.fieldsForm.get('uuid')?.value) {
          datos.uuid = this.fieldsForm.value.uuid;
          this.updateCancha(datos).subscribe({
            next: (result) => {
              if (result !==null) {
                this.notify('Cancha, tarifas, y categorias exitosamente actualizados', 'success');
              }
            },
            error: (error) => {
              this.notify('Error in update process: ' + error, 'error');
            }
          });
      } else {
          this.addData(datos);
      }
    } else {
        this.notify('Formulario Invalido!', 'error');
    }

    setTimeout(() => {
      // this.fieldsForm.reset();
    }, 2000);
    // this.submitted = true
  }
  
  private addData(datos:campoDeportivo){
    this.canchaService.save(datos).subscribe({
      next:(data:any)=>{
        if (data['status'] === 'OK') {
          this.saveTarifasCat(data['payload'], datos);
          this.openScheduleModal(data['payload'],'edit','md')
          this.submitted=false;
          // this.modalService.dismissAll();
          this.fieldsForm.reset();
          this.listaItems.emit();       

        }else{
          this.notify(data.payload, 'error');
        }
      },error:(error)=>{
        this.notify(error, 'error');
      }
    })
  }
  
  updateCancha(canchaData: campoDeportivo): Observable<any> {
    return this.canchaService.update(canchaData).pipe(
      switchMap((updatedCancha: any) => {
        this.submitted = false;
        this.openScheduleModal(updatedCancha.payload,'edit','md')
        // this.modalService.dismissAll();
        // this.fieldsForm.reset();
        // this.listaItems.emit();
        return this.saveTarifasCat(updatedCancha.payload , canchaData);
      }),
      catchError((error) => {
        this.submitted = false;
        this.modalService.dismissAll();
        this.fieldsForm.reset();
        this.notify('Error updating cancha: ' + error, 'error');
        return of(null);
      })
    );
  }

  private saveTarifasCat(cancha: any , data:any): Observable<any> {
    console.log("data in  save tar cat ", data)
    const tarifaUpdates = this.tarifasCategorias.controls.map((control: AbstractControl) => {
      const tarifaData = {
        ...control.value,
        //   uuid: tarifaData.uuid,
        //   costo: tarifaData.costo,
        //   desde: tarifaData.desde,
        //   hasta: tarifaData.hasta,
        //   descripcion: tarifaData.descripcion,
        canchasDto: cancha
      };
      // console.log(tarifaData)
      
      // Create the categoriaDtoList with the correct structure
      tarifaData.categoriaDtoList = this.mergeCategorias(tarifaData.categoriaDtoList, tarifaData.categorias);
      //  tarifaData.categorias.map((element:any) => ({
      //   categoriaDto: element,
      // }));

      // Remove the original categorias array as it's no longer needed
      delete tarifaData.categorias;
      console.log("tarifa fin ",tarifaData)
      
      if (tarifaData.uuid) {
        return this.tarifaService.update(tarifaData);
      } else {
        return this.tarifaService.save(tarifaData);
      }
    });

    return forkJoin(tarifaUpdates)
  }


   mergeCategorias(categoriaTarifaDtoList: any[], categorias: any[]): any[] {
    const mergedList: any[] = [];
  
    // Create a map of existing CategoriaTarifaDto items for quick lookup
    const existingCategoriaTarifaMap = new Map(
      categoriaTarifaDtoList.map(item => [item.categoriaDto.uuid, item])
    );
  
    // Process each categoria in the categorias list
    categorias.forEach(categoria => {
      const existingItem = existingCategoriaTarifaMap.get(categoria.uuid);
  
      if (existingItem) {
        // If the categoria exists in categoriaTarifaDtoList, add it to the merged list
        mergedList.push(existingItem);
      } else {
        // If the categoria doesn't exist, create a new entry with an empty UUID
        mergedList.push({
          uuid: '',
          estado: false,
          categoriaDto: categoria,
          // tarifaDto: null // or undefined, depending on how you want to handle this
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

  /**
   * Multiple Delete
   */
  checkedValGet: any[] = [];
  deleteMultiple(content: any) {
    var checkboxes: any = document.getElementsByName('checkAll');
    var result
    var checkedVal: any[] = [];
    for (var i = 0; i < checkboxes.length; i++) {
      if (checkboxes[i].checked) {
        result = checkboxes[i].value;
        checkedVal.push(result);
      }
    }
    if (checkedVal.length > 0) {
      this.modalService.open(content, { centered: true });
    }
    else {
      Swal.fire({ text: 'Please select at least one checkbox', confirmButtonColor: '#299cdb', });
    }
    this.checkedValGet = checkedVal;
  }

  
  private getFacilities(){
    this.complejoService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.complejosList = data.payload;
        }
      },
      error: (error) => {
        Swal.fire({ text: 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb', });
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
        Swal.fire({ text: 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb', });
      }
    });
  }

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
