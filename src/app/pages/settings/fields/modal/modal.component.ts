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

  placeholder='Seleccione una opción'
  ceilingList= Ceiling
  surfacesList:any[]=[];// Surfaces
  distictList= Districts
  dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

  submitted = false;
  masterSelected!: boolean;
  checkedList: any;

  fieldsForm!: UntypedFormGroup;
  multiDefaultOption='';
  // Api Data
  allcompany: any;
  searchResults: any;
  searchTerm: any;
  canchasList:any[]=[];
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
      tipo: ['', [Validators.required]],
      tarifasCategorias : this.formBuilder.array([
        this.createTarifaFormGroup()
      ]),
      horariosDeAtencion : this.formBuilder.array([
        this.formBuilder.group({
          dia: [""],
          abierto: [""],
          horaInicio: [""],
          horaFin: [""]
        })])
    });
    this.formDataSet();
  }

  createTarifaFormGroup(): FormGroup {
    return this.formBuilder.group({
      costo: [0, Validators.required],
      desde: [""],
      hasta: [""],
      allDay: [true],
      descripcion: [""],
      canchasDto:this.row,
      categorias: [[], Validators.required],
    });
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
    return this.fieldsForm.get('tarifasCategorias') as FormArray;
}

  addTarifa() {
    this.tarifasCategorias.push(this.createTarifaFormGroup());
  }

  // Function to remove a horario entry
  removeTarifa(index: number) {
      this.tarifasCategorias.removeAt(index);
  }
  // Function to add a new horario entry  
  addHorario() {
    const horarioGroup = this.formBuilder.group({
      dia: ['', Validators.required],
      horaInicio: ['', Validators.required],
      horaFin: ['', Validators.required]
    });
    this.horariosDeAtencion.push(horarioGroup);
  }

  // Function to remove a horario entry
  removeHorario(index: number) {
      this.horariosDeAtencion.removeAt(index);
  }
  
  private formDataSet() {
    if (this.accion != '') {
        this.fieldsForm.patchValue({
          uuid:this.row.uuid,
            image_src: [''],
            codigo: this.row.codigo,
            tipo: this.row.tipo,
            superficie: this.row.superficieDto,
            complejo: this.row.complejoDto,

            tarifas:this.row.tarifasList,
            horariosDeAtencion :this.row.horarioList
        });
    }
  }

  // File Upload
  imageURL: string | undefined;
  fileChange(event: any) {
    let fileList: any = (event.target as HTMLInputElement);
    let file: File = fileList.files[0];
    document.getElementById('')
    this.fieldsForm.patchValue({
      // image_src: file.name
      image_src: 'brands/dribbble.png'
    });
    const reader = new FileReader();
    reader.onload = () => {
      this.imageURL = reader.result as string;
      (document.getElementById('companylogo-img') as HTMLImageElement).src = this.imageURL;
    }
    reader.readAsDataURL(file)
  }

  saveData() {
    this.submitted = true;
    if (this.fieldsForm.valid) {
      this.fieldsForm.enable()
      let datos: campoDeportivo = {
        complejoDto: this.fieldsForm.value.complejo,
        codigo: this.fieldsForm.value.codigo,
        tipo: this.fieldsForm.value.tipo,
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
          console.log("data saved", data)
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
  private saveTarifasCat(cancha:any){      
      // const categories= this.fieldsForm.value.categorias      

      const formArray = this.tarifasCategorias ;
      const saveObservables: Observable<any>[] = [];
    
      formArray.controls.forEach((abstractControl: AbstractControl) => {
        const control = abstractControl as FormGroup;
        if (control.valid) {
          const tarifaData = {
            costo: control.value.costo,
            desde: control.value.desde,
            hasta: control.value.hasta,
            descripcion: control.value.descripcion,
            categorias: control.value.categorias,
            canchasDto: cancha  
          };
          const categorias = control.value.categorias;
          console.log(categorias)
          const saveTarifaAndCategories = this.tarifaService.save(tarifaData).pipe(
            switchMap((savedTarifa: any) => {
              console.log("tarifa ",savedTarifa)
              const categorySaveObservables = categorias.map((categoria: any) => {
                const tarifaCategoriaData = {
                  tarifaDto: {uuid:savedTarifa.payload.uuid},
                  categoriaDto:{uuid: categoria.uuid} 
                };
                console.log(tarifaCategoriaData)
                return this.categoriesService.save(tarifaCategoriaData);
              });
              return forkJoin(categorySaveObservables);
            })
          );
    
          saveObservables.push(saveTarifaAndCategories);
        }
      });
    
      if (saveObservables.length > 0) {
        forkJoin(saveObservables).subscribe({
          next: (results) => {
            this.notify('Datos Registrados exitosamente!','success');
            // You might want to close the modal or reset the form here
          },
          error: (error) => {
            this.notify('Error al guardar las tarifas o categorías: ' + error, 'error');
          }
        });
      } else {
        this.notify('No hay tarifas válidas para guardar', 'warning');
      }
  }

  
  openScheduleModal(row: campoDeportivo | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalScheduleComponent, {
        backdrop: 'static',
        size:size
    });
    modalRef.componentInstance.row = row;
    modalRef.componentInstance.accion = accion;
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
