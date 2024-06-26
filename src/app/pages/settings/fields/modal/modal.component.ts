import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { FormArray, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CanchaService } from 'src/app/core/services/api/canchas.service';
import { Cancha } from 'src/app/core/models/cancha.model';
import { Deporte } from 'src/app/core/models/deporte.model';
import { LeafletComponent } from 'src/app/shared/map/leaflet.component';
import { Horario } from 'src/app/core/models/horario.model';
import { forEach } from 'lodash';
import { CanchaDeportesService } from 'src/app/core/services/api/cancha-deportes.sservice';
import { CanchaHorariosService } from 'src/app/core/services/api/cancha-horarios.service';
import { CanchaDeporte } from 'src/app/core/models/cancha-deporte.model';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent {
  @Input() accion!: string;
  @Input() row!: Cancha;
  @Output() listaItems = new EventEmitter();
  @Input() categoryList:Deporte[]=[];

  placeholder='Seleccione una opción'
  surfacesList = ['Césped artificial homologado', 'Césped sintético','Césped natural', 'Pavimento de superficie acrílica', 'Suelos de EPDM', 'Caucho','Polvo de ladrillo/Arcilla', 'Tierra batida','Arena'];
  // surfacesList = [{name:'Césped artificial homologado'}, {name:'Césped sintético'},
  //   {name:'Césped natural'}, {name:'Pavimento de superficie acrílica'}, {name:'Suelos de EPDM'}, 
  //   {name:'Caucho'},{name:'Polvo de ladrillo/Arcilla'}, {name:'Tierra batida'},{name:'Arena'}];
  distictList=[
    {distrito:'Distrito 1'/* (Tacata) */, area:'Ámbito urbano', comprende: 'las zonas de Sapenco y Tacata.'},
    {distrito:'Distrito 2',/* Piñami */ area:'Ámbito urbano', comprende: 'Iquircollo Central.'},
    {distrito:'Distrito 3 (Santo Domingo)', area:'Ámbito urbano', comprende: 'los sectores Purgatorio, Cota, Santo Domingo y Sapenco.'},
    {distrito:'Distrito 4 (La Chulla)', area:'Ámbito rural-urbano', conprende: 'las comunidades de Paucarpata, Illataco, La Chulla, Esmeralda e Ironcollo.'},
    {distrito:'Distrito 5 (Pandoja - Piñami)', area:'Ámbito urbano-rural', comprende: 'las comunidades de Pandoja, Piñami, Pojpocollo, Barrio Minero y Esquilan.'},
    {distrito:'Distrito 6 (Urkupiña)', area:'Ámbito rural-urbano', comprende: 'las comunidades de Caico Alto, Molle Molle, Cotapachi y Urkupiña.'},
    {distrito:'Distrito 7 (Bella Vista)', area:'Ámbito rural', comprende: 'las comunidades de Potrero, Bella Vista, Falsuri y Marquina.'},
    {distrito:'Distrito 8 (El Paso)', area:'Ámbito rural-urbano', comprende: 'Las comunidades de Chocaya, Molle Molle, Urinzaya, Aranzaya, Pihusi, Apote, Mosoj Rancho,Okhosuru, Pandoja, Chojñacollo, Khorapata, Callajchullpa, Llaukenquiri, Totorcahua, Águila Rancho y El Paso.'},
    {distrito:'Distrito 9 (Misicuni)',area: 'Ámbito rural-cordillera', comprende: 'todas las comunidades situadas en la Cordillera, con escasa densidad poblacional y accesibilidad.'},
    {distrito:'Distrito 10 (Ámbito urbano)'}
  ]
  dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

submitted = false;
masterSelected!: boolean;
checkedList: any;

// Api Data

  fieldsForm!: UntypedFormGroup;
  multiDefaultOption='';
  // Api Data
  allcompany: any;
  searchResults: any;
  searchTerm: any;
  canchasList:any[]=[];

  constructor(private modalService: NgbModal,
    private canchaService: CanchaService,
    private categoriesService: CanchaDeportesService,
    private horariosService: CanchaHorariosService,
    private formBuilder: UntypedFormBuilder,
    // private store: Store<{ data: RootReducerState }>
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
      tarifa: [0, [Validators.required]],
      techado: ['', [Validators.required]],
      superficie: [null, [Validators.required]],
      distrito: [null, [Validators.required]],
      ubicacion: ['', [Validators.required]],
      latitud: ['', [Validators.required]],
      longitud: ['', [Validators.required]],
      categorias: [[],[Validators.required]],
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
            nombre: this.row.nombre,
            tarifa: this.row.totalxhora,
            techado: this.row.techado,
            superficie: this.row.superficie,
            ubicacion: this.row.ubicacion,
            distrito: this.row.distrito,
            latitud:this.row.latitud,
            longitud:this.row.longitud,
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
      let datos: Cancha = {
        // codigo:this.fieldsForm.value.codigo,
        nombre: this.fieldsForm.value.nombre,
        techado: this.fieldsForm.value.techado,
        superficie: this.fieldsForm.value.superficie,
        ubicacion: this.fieldsForm.value.ubicacion,
        distrito: this.fieldsForm.value.distrito,
        totalxhora: this.fieldsForm.value.tarifa,
        latitud: this.fieldsForm.value.latitud,
        longitud: this.fieldsForm.value.longitud
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
  
  private addData(datos:Cancha){
    this.canchaService.save(datos).subscribe({
      next:(data:any)=>{
        if (data['status'] === 'OK') {
          console.log("data saved", data)
          this.saveCategories(data['payload'].uuid);
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
  private updateData(datos:Cancha) {
      this.canchaService.update(datos).subscribe({
          next: (data: Cancha) => {
            const field=data;
            this.saveCategories(data.uuid);
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
  private saveCategories(uuid:string | undefined){
    if(uuid){
      
      const categories= this.fieldsForm.value.categorias
      categories.forEach((element:any) => {
        let datos: CanchaDeporte = {
          deporteDto:{uuid:element.uuid},
          canchasDto:{uuid:uuid}
        };
        this.categoriesService.save(datos).subscribe({
          next:(data:CanchaDeporte)=>{
            
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
   * View Data Get
   * @param content modal content
   */
  viewDataGet(id: any) {
    // this.econtent = this.allcompany[id];
    // var img_data = document.querySelector('.company-details img') as HTMLImageElement;
    // img_data.src = 'assets/images/' + this.econtent.image_src;
    // (document.querySelector('.company-details h5') as HTMLImageElement).innerHTML = this.econtent.name;
    // (document.querySelector('.company-details p') as HTMLImageElement).innerHTML = this.econtent.owner;
    // (document.querySelector('.industry_type') as HTMLImageElement).innerHTML = this.econtent.industry_type;
    // (document.querySelector('.location') as HTMLImageElement).innerHTML = this.econtent.location;
    // (document.querySelector('.employee') as HTMLImageElement).innerHTML = this.econtent.employee;
    // (document.querySelector('.rating') as HTMLImageElement).innerHTML = this.econtent.star_value;
    // (document.querySelector('.website') as HTMLImageElement).innerHTML = this.econtent.website;
    // (document.querySelector('.email') as HTMLImageElement).innerHTML = this.econtent.contact_email;
    // (document.querySelector('.since') as HTMLImageElement).innerHTML = this.econtent.since;
  }

  /**
   * Open Edit modal
   * @param content modal content
   */
  editDataGet(id: any, content: any) {
    // this.submitted = false;
    // this.modalService.open(content, { size: 'lg', centered: true });
    // var modelTitle = document.querySelector('.modal-title') as HTMLAreaElement;
    // // modelTitle.innerHTML = 'Edit Company';
    // var updateBtn = document.getElementById('add-btn') as HTMLAreaElement;
    // updateBtn.innerHTML = "Update";

    // this.econtent = this.allcompany[id];
    // var img_data = document.getElementById('companylogo-img') as HTMLImageElement;
    // img_data.src = 'assets/images/' + this.econtent.image_src

    // this.fieldsForm.controls['nombre'].setValue(this.econtent.name);
    // this.fieldsForm.controls['owner'].setValue(this.econtent.owner);
    // this.fieldsForm.controls['industry_type'].setValue(this.econtent.industry_type);
    // this.fieldsForm.controls['star_value'].setValue(this.econtent.star_value);
    // this.fieldsForm.controls['location'].setValue(this.econtent.location);
    // this.fieldsForm.controls['employee'].setValue(this.econtent.employee);
    // this.fieldsForm.controls['website'].setValue(this.econtent.website);
    // this.fieldsForm.controls['contact_email'].setValue(this.econtent.contact_email);
    // this.fieldsForm.controls['since'].setValue(this.econtent.since);
    // this.fieldsForm.controls['_id'].setValue(this.econtent._id);

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
