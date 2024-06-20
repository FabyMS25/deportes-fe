import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CanchaService } from 'src/app/core/services/api/canchas.service';
import { Cancha } from 'src/app/core/models/cancha.model';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent {
  @Input() accion!: string;
  @Input() row!: Cancha;
  @Output() listaItems = new EventEmitter();


submitted = false;
masterSelected!: boolean;
checkedList: any;

// Api Data
content?: any;
unidad?: any;
econtent?: any;

  fieldsForm!: UntypedFormGroup;

  // Api Data
  allcompany: any;
  searchResults: any;
  searchTerm: any;

  canchasList:any[]=[];
  constructor(private modalService: NgbModal,
    private canchaService: CanchaService,
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
      techado: ['', [Validators.required]],
      superficie: ['', [Validators.required]],
      distrito: ['', [Validators.required]],
      tarifa: ['', [Validators.required]],
      ubicacion: ['', [Validators.required]],
      latitud: ['', [Validators.required]],
      longitud: ['', [Validators.required]]
    });
    // this.fieldsForm.get('latitud')?.disable();
    // this.fieldsForm.get('longitud')?.disable();
    this.formDataSet();
  }

  /**
   * Form data get
   */
  get form() {
    return this.fieldsForm.controls;
  }

  
  private formDataSet() {
    if (this.accion != '') {
        this.fieldsForm.patchValue({
          uuid:this.row.uuid,
            image_src: ['u-urg.png'],
            // codigo: this.row.codigo,
            nombre: this.row.nombre,
            ubicacion: this.row.ubicacion,
            tarifa: this.row.totalxhora,
            techado: this.row.techado,
            superficie: this.row.superficie,
            latitud:this.row.latitud,
            longitud:this.row.longitud
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

  /**
  * Save user
  */
 
  saveData() {
    if (this.fieldsForm.valid) {
        this.submitted = true;
      this.fieldsForm.enable()
      let datos: Cancha = {
        // uuid:this.fieldsForm.value.uuid,
        // codigo:this.fieldsForm.value.codigo,
        // nombre: this.fieldsForm.value.nombre,
        techado: this.fieldsForm.value.techado,
        superficie: this.fieldsForm.value.superficie,
        ubicacion: this.fieldsForm.value.ubicacion,
        totalxhora: this.fieldsForm.value.tarifa,
        latitud: this.fieldsForm.value.latitud,
        longitud: this.fieldsForm.value.longitud
      };
      if (this.fieldsForm.get('uuid')?.value) {
          this.updateData(datos);
          } else {
            this.addData(datos);
          }
      }
      else {
        this.notify('Formulario Invalido!', 'error');
    }

    setTimeout(() => {
      this.fieldsForm.reset();
    }, 2000);
    // this.submitted = true
  }
  
  addData(datos:Cancha){
    this.canchaService.save(datos).subscribe({
      next:(data:Cancha)=>{
        this.submitted=false;
        this.notify('Datos Registrados exitosamente!','success'); 
        this.modalService.dismissAll();
        this.fieldsForm.reset();
        this.listaItems.emit();       
      },error:(data)=>{
        this.submitted=true;
        this.notify('Formulario Invalido!', 'error');
      }
    })
  }
  updateData(datosUnit:Cancha) {
      this.canchaService.update(datosUnit).subscribe({
          next: (data: Cancha) => {
            this.submitted = false;
            this.modalService.dismissAll();
            this.listaItems.emit();
            this.fieldsForm.reset();
            this.notify('Datos Actualizados exitosamente!', 'success');
          },
          error: (error) => {
            this.submitted = true;
            this.modalService.dismissAll();
            this.notify('No se pudo Actualizar los datos!', 'error');
          }
      })
  }


  /**
   * View Data Get
   * @param content modal content
   */
  viewDataGet(id: any) {
    this.econtent = this.allcompany[id];
    var img_data = document.querySelector('.company-details img') as HTMLImageElement;
    img_data.src = 'assets/images/' + this.econtent.image_src;
    (document.querySelector('.company-details h5') as HTMLImageElement).innerHTML = this.econtent.name;
    (document.querySelector('.company-details p') as HTMLImageElement).innerHTML = this.econtent.owner;
    (document.querySelector('.industry_type') as HTMLImageElement).innerHTML = this.econtent.industry_type;
    (document.querySelector('.location') as HTMLImageElement).innerHTML = this.econtent.location;
    (document.querySelector('.employee') as HTMLImageElement).innerHTML = this.econtent.employee;
    (document.querySelector('.rating') as HTMLImageElement).innerHTML = this.econtent.star_value;
    (document.querySelector('.website') as HTMLImageElement).innerHTML = this.econtent.website;
    (document.querySelector('.email') as HTMLImageElement).innerHTML = this.econtent.contact_email;
    (document.querySelector('.since') as HTMLImageElement).innerHTML = this.econtent.since;
  }

  /**
   * Open Edit modal
   * @param content modal content
   */
  editDataGet(id: any, content: any) {
    this.submitted = false;
    this.modalService.open(content, { size: 'lg', centered: true });
    var modelTitle = document.querySelector('.modal-title') as HTMLAreaElement;
    // modelTitle.innerHTML = 'Edit Company';
    var updateBtn = document.getElementById('add-btn') as HTMLAreaElement;
    updateBtn.innerHTML = "Update";

    this.econtent = this.allcompany[id];
    var img_data = document.getElementById('companylogo-img') as HTMLImageElement;
    img_data.src = 'assets/images/' + this.econtent.image_src

    this.fieldsForm.controls['nombre'].setValue(this.econtent.name);
    this.fieldsForm.controls['owner'].setValue(this.econtent.owner);
    this.fieldsForm.controls['industry_type'].setValue(this.econtent.industry_type);
    this.fieldsForm.controls['star_value'].setValue(this.econtent.star_value);
    this.fieldsForm.controls['location'].setValue(this.econtent.location);
    this.fieldsForm.controls['employee'].setValue(this.econtent.employee);
    this.fieldsForm.controls['website'].setValue(this.econtent.website);
    this.fieldsForm.controls['contact_email'].setValue(this.econtent.contact_email);
    this.fieldsForm.controls['since'].setValue(this.econtent.since);
    this.fieldsForm.controls['_id'].setValue(this.econtent._id);

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
