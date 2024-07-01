import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EncargadoCancha } from 'src/app/core/models/encargado-cancha';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EncargadoCanchaService } from 'src/app/core/services/api/encargado-cancha.service';
import { FormControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { UserService } from 'src/app/core/services/api-users/users.service';
import { CanchaService } from 'src/app/core/services/api/canchas.service';

@Component({
  selector: 'app-modalEmployee',
  templateUrl: './modalEmployee.component.html',
  styleUrl: './modalEmployee.component.scss'
})
export class ModalEmployeeComponent {
  @Input() accion!: string;
  @Input() row!: EncargadoCancha;
  @Output() listaItems = new EventEmitter();

  contentForm!: UntypedFormGroup;
  submitted = false;
  canchasList!:any[];
  usersList!:any[];
  user:any;

  constructor(private modalService: NgbModal,
    private usuariosService: UserService,
    private fieldsService: CanchaService,
    private encargadoCanchaService: EncargadoCanchaService,
    private formBuilder: UntypedFormBuilder,
  ) {}

  
  ngOnInit(): void {
    console.log(this.accion)
    this.getUsers();
    this.getFields();
    /**
     * Form Validation
     */
    this.contentForm = this.formBuilder.group({
      image_src: [''],
      uuid: [''],
      uuidUsuario: ['', [Validators.required]],
      fechaInicio: ['', [Validators.required]],
      fechaFin: ['', [Validators.required]],
      horaEntrada: ['', [Validators.required]],
      horaSalida: ['', [Validators.required]],
      telefono: [''],
      uuidCancha: [''],
      canchaDto: new FormControl(),
    });
    this.formDataSet();
  }
  
  /**
   * Form data get
   */
  get form() {
    return this.contentForm.controls;
  }
  private formDataSet() {
    if (this.accion != '') {
        this.contentForm.patchValue({
            uuid:this.row.uuid,
            image_src: [''],
            uuidUsuario: this.row.userUuid,
            fechaInicio: this.row.fechaInicio,
            fechaFin: this.row.fechaFin,
            horaEntrada: this.row.horaEntrada,
            horaSalida: this.row.horaSalida,
            telefono:this.row.telefono,
            uuidCancha: this.row.canchasDto.uuid,
            canchaDto:this.row.canchasDto
        });
    }
  }

  public onUserSelectHandler(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    this.usersList.forEach(element => {
        if (element.uuid === selectedValue) {
            this.user = element;
        }
    });
}

  // File Upload
  imageURL: string | undefined;
  fileChange(event: any) {
    let fileList: any = (event.target as HTMLInputElement);
    let file: File = fileList.files[0];
    document.getElementById('')
    this.contentForm.patchValue({
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

  /* API Service functions */
  private getUsers(){
    this.usuariosService.getAllUsers().subscribe({
        next: (data: any) => {
            this.usersList = data;
        }
      });
  }
  private getFields(){
    this.fieldsService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.canchasList = data.payload;
        }else{
          Swal.fire({ text: data.payload, confirmButtonColor: '#299cdb'});
        }
      },
    });
  }
  /**
  * Save user
  */
  saveData() {
    this.submitted = true;
    if (this.contentForm.valid) {
      this.contentForm.enable();
      
      let datos: EncargadoCancha = {
        userUuid: this.contentForm.value.uuidUsuario,
        fechaInicio: this.contentForm.value.fechaInicio,
        fechaFin: this.contentForm.value.fechaFin,
        horaEntrada: this.contentForm.value.horaEntrada,
        horaSalida: this.contentForm.value.horaSalida,
        telefono: this.contentForm.value.telefono,
        canchasDto: { uuid: this.contentForm.value.uuidCancha },
      };
  
      if (this.contentForm.get('uuid')?.value) {
        datos.uuid = this.contentForm.value.uuid;
        this.updateData(datos);
      } else {
        this.addData(datos);
      }
    } else {
      this.notify('Formulario Invalido!', 'error');
    }
  }
  
  
  addData(datos:EncargadoCancha){
    this.encargadoCanchaService.save(datos).subscribe({
      next:(data:EncargadoCancha)=>{
        this.submitted=false;
        this.notify('Datos Registrados exitosamente!','success'); 
        this.modalService.dismissAll();
        this.contentForm.reset();
        this.listaItems.emit();       
      },error:(data)=>{
        this.submitted=true;
        this.notify('Formulario Invalido!', 'error');
      }
    })
  }
  updateData(datosUnit:EncargadoCancha) {
      this.encargadoCanchaService.update(datosUnit).subscribe({
          next: (data: EncargadoCancha) => {
            this.submitted = false;
            this.modalService.dismissAll();
            this.listaItems.emit();
            this.contentForm.reset();
            this.notify('Datos Actualizados exitosamente!', 'success');
          },
          error: (error) => {
            this.submitted = true;
            this.modalService.dismissAll();
            this.notify('No se pudo Actualizar los datos!', 'error');
          }
      })
  }
  
  public closeModal() {
    this.accion = '';
    this.contentForm.enable();
    this.modalService.dismissAll();
    this.contentForm.reset();
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
