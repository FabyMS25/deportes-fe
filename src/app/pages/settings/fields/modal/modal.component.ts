import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, FormArray, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import Swal from 'sweetalert2';

import { Categoria } from 'src/app/core/models/categoria.model';
import { campoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { CamposDeportivoService } from 'src/app/core/services/api/camposDeportivos.service';
import { ComplejosService } from 'src/app/core/services/api/conplejos.service';
import { SuperficiesService } from 'src/app/core/services/api/superficies.service';
import { TarifaService } from 'src/app/core/services/api/tarifa.service';
import { TarifaCategoriesService } from 'src/app/core/services/api/tarifa-categorias.service';
import { forkJoin, Observable, switchMap } from 'rxjs';
import { ModalScheduleComponent } from '../modal-schedule/modal-schedule.component';
import { Ceiling } from 'src/app/core/constants/Features';
import { Districts } from 'src/app/core/constants/Places';
import { TipoCobro } from 'src/app/core/constants/TipoCobro';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalFieldsComponent {
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

  constructor(private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private complejoService: ComplejosService,
    private canchaService: CamposDeportivoService,
    private surfaceService: SuperficiesService,
    private tarifaService: TarifaService,
    private categoriesService: TarifaCategoriesService
  ) {
  }

  ngOnInit(): void {
    this.getFacilities();
    this.getSurfaces()
    /**
     * Form Validation
     */
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
    this.formDataSet();
  }

  createTarifaFormGroup(): FormGroup {
    return this.formBuilder.group({
      uuid:[''],
      costo: [, Validators.required],
      desde: [""],
      hasta: [""],
      descripcion: [""],
      categorias: [[], Validators.required],
      categoriaDtoList: [[]],
      tipo: [, Validators.required],
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
            const tarifaGroup = this.formBuilder.group({
              uuid: [tarifa.uuid],
              costo: [tarifa.costo, Validators.required],
              desde: [tarifa.desde],
              hasta: [tarifa.hasta],
              descripcion: [tarifa.descripcion],
              categorias: [tarifa.categoriaDtoList.map(cat => cat.categoriaDto), Validators.required],
              // canchasDto: this.row, // Assuming `this.row` is needed for each tarifa
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
      this.tarifasCategorias.removeAt(index);
  }
      
  saveData() {
    this.submitted = true;
    if (this.fieldsForm.valid) {
      this.fieldsForm.enable()
      let datos: campoDeportivo = {
        complejoDto: this.fieldsForm.value.complejo,
        codigo: this.fieldsForm.value.codigo,
        tipo: this.fieldsForm.value.tipo,
        // tipo: this.fieldsForm.value.tarifas[0].tipo,
        superficieDto: this.fieldsForm.value.superficie,
      };
      if (this.fieldsForm.get('uuid')?.value) {
          datos.uuid = this.fieldsForm.value.uuid;
          this.updateData(datos);
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
          this.saveTarifasCat(data['payload']);
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
  private updateData(datos:campoDeportivo) {
      this.canchaService.update(datos).subscribe({
          next: (data: any) => {
            const field=data;
            this.saveTarifasCat(data['payload']);
            this.openScheduleModal(data['payload'],'edit','md')
            this.submitted = false;
            // this.modalService.dismissAll();
            this.fieldsForm.reset();
            this.listaItems.emit();
          },
          error: (error) => {
            this.submitted = false;
            this.modalService.dismissAll();
            this.fieldsForm.reset();
            this.notify('No se pudo Actualizar los datos!', 'error');
          }
      })
  }
  
  private saveTarifasCat(cancha:any) {    
    const formArray = this.tarifasCategorias ;
    const saveObservables: Observable<any>[] = [];
  
    formArray.controls.forEach((abstractControl: AbstractControl) => {
      const control = abstractControl as FormGroup;
      if (control.valid) {
        let tarifaData:any = {
          tipo: control.value.tipo,
          costo: control.value.costo,
          desde: control.value.desde,
          hasta: control.value.hasta,
          descripcion: control.value.descripcion,
          categorias: control.value.categorias,
          canchasDto: cancha  
        };
        
        let saveTarifaAndCategories ;
        if (control.value.uuid !=='') {
          tarifaData.uuid = control.value.uuid;
          saveTarifaAndCategories = this.updateTarifasCat(tarifaData);          
          saveObservables.push(saveTarifaAndCategories);
        } else {
           saveTarifaAndCategories= this.addTarifasCat(tarifaData);
           saveObservables.push(saveTarifaAndCategories);
        }
      }
    });
  
    if (saveObservables.length > 0) {
      forkJoin(saveObservables).subscribe({
        next: (results) => {
          this.notify('Datos Registrados exitosamente!','success');
        },
        error: (error) => {
          this.notify('Error al guardar las tarifas o categorías: ' + error, 'error');
        }
      });
    } else {
      this.notify('No hay tarifas válidas para guardar', 'warning');
    }

  }

  private addTarifasCat(tarifaData:any){       
    return this.tarifaService.save(tarifaData).pipe(
      switchMap((savedTarifa: any) => {
        const categorySaveObservables = tarifaData.categorias.map((categoria: any) => {
          const tarifaCategoriaData = {
            tarifaDto: {uuid:savedTarifa.payload.uuid},
            categoriaDto:{uuid: categoria.uuid} 
          };
          return this.categoriesService.save(tarifaCategoriaData);
        });
        return forkJoin(categorySaveObservables);
      })
    );
  }
  
  private updateTarifasCat(tarifaData: any): any {
    return this.tarifaService.update(tarifaData).pipe(
      switchMap((savedTarifa: any) => {
        const existingCategories = savedTarifa.payload.categoriaDtoList//.map((cat:any) => cat.categoriaDto.uuid);
        const newCategories = tarifaData.categorias.map((cat:any) => cat.uuid);  
        const categoriesToAdd = newCategories.filter((uuid:string) => !existingCategories.map((cat:any) => cat.categoriaDto.uuid).includes(uuid));  
        const categoriesToRemove = existingCategories.filter((cat:any) => !newCategories.includes(cat.categoriaDto.uuid));
        const addObservables = categoriesToAdd.map((uuid:string) => {
          const tarifaCategoriaData = {
            tarifaDto: { uuid: savedTarifa.payload.uuid },
            categoriaDto: { uuid: uuid }
          };
          return this.categoriesService.save(tarifaCategoriaData);
        });
  
        const removeObservables = categoriesToRemove.map((cat:any) => {
          cat.estado = true;
          cat.tarifaDto= { uuid: savedTarifa.payload.uuid };
          return this.categoriesService.update(cat);
        });
  
        return forkJoin([
          ...addObservables,
          ...removeObservables
        ]);
      })
    );
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
