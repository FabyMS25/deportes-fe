import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { FormArray, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LeafletComponent } from 'src/app/shared/map/leaflet.component';
import { Horario } from 'src/app/core/models/horario.model';
// import { CanchaDeportesService } from 'src/app/core/services/api/cancha-deportes.service';
import { Districts } from 'src/app/core/constants/Distritos';
import { Surfaces } from 'src/app/core/constants/Superficies';
import { Ceiling } from 'src/app/core/constants/Techados';
import { Categoria } from 'src/app/core/models/categoria.model';
// import { CanchaCategoria } from 'src/app/core/models/cancha-categoria.model';
import { Complejo } from 'src/app/core/models/complejo.model';
import { ComplejosService } from 'src/app/core/services/api/conplejos.service';
import { HorariosService } from 'src/app/core/services/api/horarios.service';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalFacilitiesComponent {
  @Input() accion!: string;
  @Input() row!: Complejo;
  @Output() listaItems = new EventEmitter();
  @Input() categoryList:Categoria[]=[];

  placeholder='Seleccione una opción'
  ceilingList=Ceiling
  surfacesList = Surfaces
  distictList=Districts
  dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

  submitted = false;
  masterSelected!: boolean;
  checkedList: any;

  complejosForm!: UntypedFormGroup;
  multiDefaultOption='';
  // Api Data
  allcompany: any;
  searchResults: any;
  searchTerm: any;
  canchasList:any[]=[];

  constructor(private modalService: NgbModal,
    private complejosSevice: ComplejosService,
    // private categoriesService: CanchaDeportesService,
    private horariosService: HorariosService,
    private formBuilder: UntypedFormBuilder,
    // private store: Store<{ data: RootReducerState }>
  ) {
      
  }

  ngOnInit(): void {
    /**
     * Form Validation
     */
    this.complejosForm = this.formBuilder.group({
      uuid: [''],
      image_src: ['brands/dribbble.png'],
      nombre: ['', [Validators.required]],
      // tarifa: [0, [Validators.required]],
      techado: ['', [Validators.required]],
      // superficie: [null, [Validators.required]],
      distrito: [null, [Validators.required]],
      ubicacion: ['', [Validators.required]],
      latitud: ['', [Validators.required]],
      longitud: ['', [Validators.required]],
      // categorias: [[],[Validators.required]],
      // horariosDeAtencion : this.formBuilder.array([
      //   this.formBuilder.group({
      //     dia: [""],
      //     horaInicio: [""],
      //     horaFin: [""]
      //   })])
    });
    this.formDataSet();
  }

  /**
   * Form data get
   */
  get form() {
    return this.complejosForm.controls;
  }
  get horariosDeAtencion() {
      return this.complejosForm.get('horariosDeAtencion') as FormArray;
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
        this.complejosForm.patchValue({
          uuid:this.row.uuid,
            image_src: [''],
            nombre: this.row.nombre,
            // tarifa: this.row.totalxhora,
            techado: this.row.techado,
            // superficie: this.row.superficie,
            ubicacion: this.row.ubicacion,
            distrito: this.row.distrito,
            latitud:this.row.latitud,
            longitud:this.row.longitud,
            encargado:this.row.encargadoCanchaList,
            canchas :this.row.canchasList
        });
    }
  }

  // File Upload
  imageURL: string | undefined;
  fileChange(event: any) {
    let fileList: any = (event.target as HTMLInputElement);
    let file: File = fileList.files[0];
    document.getElementById('')
    this.complejosForm.patchValue({
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
  
  public openMapa() {
    const modalRef = this.modalService.open(LeafletComponent, {
        backdrop: 'static',
        size: 'lg'
    });
    modalRef.componentInstance.title = 'Buscar en Mapa';
    modalRef.componentInstance.form=true;
    modalRef.componentInstance.latLngEmitter.subscribe((data:any) => {
      const latitud=data.lat;
      const longitud=data.lng;
      const direccion=data.dir;
      this.complejosForm.get('ubicacion')?.patchValue(direccion);
      this.complejosForm.get('latitud')?.patchValue(latitud);
      this.complejosForm.get('longitud')?.patchValue(longitud);
    });
  }

  /**
  * API Services Functions
  */ 
  saveData() {
    this.submitted = true;
    if (this.complejosForm.valid) {
      this.complejosForm.enable()
      let datos: Complejo = {
        nombre: this.complejosForm.value.nombre,
        techado: this.complejosForm.value.techado,
        ubicacion: this.complejosForm.value.ubicacion,
        distrito: this.complejosForm.value.distrito,
        latitud: this.complejosForm.value.latitud,
        longitud: this.complejosForm.value.longitud
      };
      if (this.complejosForm.get('uuid')?.value) {
          datos.uuid = this.complejosForm.value.uuid;
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
  
  private addData(datos:Complejo){
    this.complejosSevice.save(datos).subscribe({
      next:(data:any)=>{
        if (data['status'] === 'OK') {
          // this.saveCategories(data['payload'].uuid);
          // this.saveServiceHours(data['payload'].uuid); 
          this.submitted=false;
          this.modalService.dismissAll();
          this.complejosForm.reset();
          this.listaItems.emit();       
          this.notify('Datos Registrados exitosamente!','success');

        }else{
          this.notify(data.payload, 'error');
        }
      },error:(error)=>{
        this.notify(error, 'error');
      }
    })
  }
  private updateData(datos:Complejo) {
      this.complejosSevice.update(datos).subscribe({
          next: (data: Complejo) => {
            const field=data;
            // this.saveCategories(data.uuid);
            this.saveServiceHours(data.uuid);
            this.submitted = false;
            this.modalService.dismissAll();
            this.complejosForm.reset();
            this.listaItems.emit();
            this.notify('Datos Actualizados exitosamente!', 'success');
          },
          error: (error) => {
            this.submitted = false;
            this.modalService.dismissAll();
            this.complejosForm.reset();
            this.notify('No se pudo Actualizar los datos!', 'error');
          }
      })
  }
  // private saveCategories(uuid:string | undefined){
  //   if(uuid){
      
  //     const categories= this.complejosForm.value.categorias
  //     categories.forEach((element:any) => {
  //       let datos: CanchaCategoria = {
  //         deporteDto:{uuid:element.uuid},
  //         canchasDto:{uuid:uuid}
  //       };
  //       this.categoriesService.save(datos).subscribe({
  //         next:(data:CanchaCategoria)=>{
            
  //           this.notify('Categoria Registrada','success'); 
  //         },error:(error)=>{
  //           this.notify('Formulario Invalido: '+error, 'error');
  //         }
  //       })
        
  //     });
  //   }

  // }
  private saveServiceHours(uuid:string | undefined){
    if(uuid){
      this.form['horariosDeAtencion'].value.forEach((element:Horario) => {
        let datos = {
          dia: element.dia,
          horaInicio:element.horaInicio,
          horaFin:element.horaFin,
          canchasDto:{uuid:uuid}
        };
        this.horariosService.save(datos).subscribe({
            next:(data:Horario)=>{            
            this.notify('Horario Registrado'+data,'success'); 
          },error:(error)=>{
            this.notify('Formulario Invalido: '+error, 'error');
          }
        })
        
      });
    }
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

  public closeModal() {
    this.accion = '';
    this.complejosForm.enable();
    this.modalService.dismissAll();
    this.complejosForm.reset();
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
