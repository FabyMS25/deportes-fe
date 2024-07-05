import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { FormArray, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LeafletComponent } from 'src/app/shared/map/leaflet.component';
import { Horario } from 'src/app/core/models/horario.model';
import { CanchaDeportesService } from 'src/app/core/services/api/cancha-deportes.service';
import { CanchaHorariosService } from 'src/app/core/services/api/cancha-horarios.service';
import { Districts } from 'src/app/core/constants/Distritos';
import { Surfaces } from 'src/app/core/constants/Superficies';
import { Ceiling } from 'src/app/core/constants/Techados';
import { Categoria } from 'src/app/core/models/categoria.model';
import { CanchaCategoria } from 'src/app/core/models/cancha-categoria.model';
import { campoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { CamposDeportivoService } from 'src/app/core/services/api/camposDeportivos.service';

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
  ceilingList=Ceiling
  surfacesList = Surfaces
  distictList=Districts
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

  constructor(private modalService: NgbModal,
    private canchaService: CamposDeportivoService,
    private categoriesService: CanchaDeportesService,
    private horariosService: CanchaHorariosService,
    private formBuilder: UntypedFormBuilder,
  ) {
      
  }

  ngOnInit(): void {
    /**
     * Form Validation
     */
    this.fieldsForm = this.formBuilder.group({
      uuid: [''],
      image_src: ['brands/dribbble.png'],

      nombre: ['', [Validators.required]],
      techado: [null, [Validators.required]],
      distrito: [null, [Validators.required]],
      ubicacion: ['', [Validators.required]],
      latitud: ['', [Validators.required]],
      longitud: ['', [Validators.required]],

      codigo: ['', [Validators.required]],
      superficie: ['', [Validators.required]],
      tipo: ['', [Validators.required]],
      // categorias: [[],[Validators.required]],
      // tarifa: [0, [Validators.required]],
      tarifasCategorias : this.formBuilder.array([
        this.formBuilder.group({
          categorias: [[]],
          costo: [0],
          desde: [""],
          hasta: [""],
          allDay: [true],
          descripcion: [""]
        })]),
      horariosDeAtencion : this.formBuilder.array([
        this.formBuilder.group({
          dia: [""],
          horaInicio: [""],
          horaFin: [""]
        })])
    });
    this.formDataSet();
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
            // tarifa: this.row.totalxhora,
            superficie: this.row.superficie,
            tipo: this.row.tipo,
            complejoDto: this.row.complejoDto,

            tarifas:this.row.tarifasList,
            categorias:this.row.canchaDeportesList,
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
      this.fieldsForm.get('ubicacion')?.patchValue(direccion);
      this.fieldsForm.get('latitud')?.patchValue(latitud);
      this.fieldsForm.get('longitud')?.patchValue(longitud);
    });
  }

  /**
  * API Services Functions
  */ 
  saveData() {
    this.submitted = true;
    if (this.fieldsForm.valid) {
      this.fieldsForm.enable()
      let datos: campoDeportivo = {
        codigo: this.fieldsForm.value.codigo,
        superficie: this.fieldsForm.value.superficie,
        tipo: this.fieldsForm.value.tipo,
        // totalxhora: this.fieldsForm.value.tarifa,
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
          this.saveCategoriesTaxes(data['payload'].uuid);
          this.saveServiceHours(data['payload'].uuid); 
          this.submitted=false;
          this.modalService.dismissAll();
          this.fieldsForm.reset();
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
  private updateData(datos:campoDeportivo) {
      this.canchaService.update(datos).subscribe({
          next: (data: campoDeportivo) => {
            const field=data;
            this.saveCategoriesTaxes(data.uuid);
            this.saveServiceHours(data.uuid);
            this.submitted = false;
            this.modalService.dismissAll();
            this.fieldsForm.reset();
            this.listaItems.emit();
            this.notify('Datos Actualizados exitosamente!', 'success');
          },
          error: (error) => {
            this.submitted = false;
            this.modalService.dismissAll();
            this.fieldsForm.reset();
            this.notify('No se pudo Actualizar los datos!', 'error');
          }
      })
  }
  private saveCategoriesTaxes(uuid:string | undefined){
    if(uuid){
      
      const categories= this.fieldsForm.value.categorias
      categories.forEach((element:any) => {
        let datos: CanchaCategoria = {
          deporteDto:{uuid:element.uuid},
          canchasDto:{uuid:uuid}
        };
        this.categoriesService.save(datos).subscribe({
          next:(data:CanchaCategoria)=>{
            
            this.notify('Categoria Registrada','success'); 
          },error:(error)=>{
            this.notify('Formulario Invalido: '+error, 'error');
          }
        })
        
      });
    }

  }
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
