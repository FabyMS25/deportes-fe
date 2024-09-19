import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { UserService } from 'src/app/core/services/api-users/users.service';
import { Encargado } from 'src/app/core/models/encargado';
import { EncargadoService } from 'src/app/core/services/api/encargado.service';
import { ComplejosService } from 'src/app/core/services/api/conplejos.service';

@Component({
  selector: 'app-modalEmployee',
  templateUrl: './modalEmployee.component.html',
  styleUrl: './modalEmployee.component.scss'
})
export class ModalEmployeeComponent {
  @Input() accion!: string;
  @Input() row!: Encargado;
  @Output() itemsList = new EventEmitter();

  contentForm!: UntypedFormGroup;
  submitted = false;
  canchasList!:any[];
  usersList!:any[];
  user:any;

  constructor(private modalService: NgbModal,
    private usuariosService: UserService,
    private complejosService: ComplejosService,
    private encargadoCanchaService: EncargadoService,
    private formBuilder: UntypedFormBuilder,
  ) {}
  
  ngOnInit(): void {
    this.getUsers();
    this.getFields();
    /**
     * Form Validation
     */
    this.contentForm = this.formBuilder.group({
      image_src: [''],
      uuid: [''],
      uuidUsuario: ['', [Validators.required]],
      // fechaInicio: ['', [Validators.required]],
      // fechaFin: ['', [Validators.required]],
      horaEntrada: ['', [Validators.required]],
      horaSalida: ['', [Validators.required]],
      nombre: [''],
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
            // fechaInicio: this.row.fechaInicio,
            // fechaFin: this.row.fechaFin,
            horaEntrada: this.row.horaEntrada,
            horaSalida: this.row.horaSalida,
            nombre:this.row.nombre,
            telefono:this.row.telefono,
            uuidCancha: this.row.complejoDto.uuid,
            canchaDto:this.row.complejoDto
        });
    }
  }

onUserSelectHandler(event: any) {
  const selectedUuid = event.target.value;
  const selectedUser = this.usersList.find(user => user.uuid === selectedUuid);
  if (selectedUser) {
    this.user = selectedUser;
    this.contentForm.patchValue({
      nombre: selectedUser.designacionFuncionarioDto.personaDto.fullName
    });
  }
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
    this.complejosService.getAll().subscribe({
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
      
      let datos: Encargado = {
        userUuid: this.contentForm.value.uuidUsuario,
        // fechaInicio: this.contentForm.value.fechaInicio,
        // fechaFin: this.contentForm.value.fechaFin,
        horaEntrada: this.contentForm.value.horaEntrada,
        horaSalida: this.contentForm.value.horaSalida,
        nombre: this.contentForm.value.nombre,
        telefono: this.contentForm.value.telefono,
        complejoDto: { uuid: this.contentForm.value.uuidCancha },
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
  
  addData(datos:Encargado){
    this.encargadoCanchaService.save(datos).subscribe({
      next:(data:Encargado)=>{
        this.submitted=false;
        this.notify('Datos Registrados exitosamente!','success'); 
        this.modalService.dismissAll();
        this.contentForm.reset();
        this.itemsList.emit();       
      },error:(data)=>{
        this.submitted=true;
        this.notify('Formulario Invalido!', 'error');
      }
    })
  }
  updateData(datosUnit:Encargado) {
      this.encargadoCanchaService.update(datosUnit).subscribe({
          next: (data: Encargado) => {
            this.submitted = false;
            this.modalService.dismissAll();
            this.itemsList.emit();
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
