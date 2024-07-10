import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Contribuyente } from 'src/app/core/models/contribuyente.models';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';

import {CityAcronym} from 'src/app/core/constants/Ciudades'
@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent {

  @Input() accion!: string;
  @Input() row!: Contribuyente;
  @Output() listaItems = new EventEmitter();

  cityAcronym= CityAcronym
  contentForm!: UntypedFormGroup;
  submitted = false;

  constructor(private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private contribuyentesService: ContribuyentesService
  ) {}

  
  ngOnInit(): void {
    /**
     * Form Validation
     */
    this.contentForm = this.formBuilder.group({
      uuid: [''],
      userName: ['', [Validators.required]],
      password: ['', [Validators.required]],
      codigoContribuyente:[''],
      estadoUsuario:['Pending'],
      correo: ['', [Validators.required]],
      nombre: ['', [Validators.required]],
      apPaterno: ['', [Validators.required]],
      apMaterno: [''],
      sexo: [null],
      nroCarnet:[''],
      nroNit:[''],
      ciExpedido:[''],
      direccion:[''],
      celular:['']
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
            userName: this.row.userName,
            password: this.row.password,
            codigoContribuyente: this.row.codigoContribuyente,
            estadoUsuario: this.row.estadoUsuario,
            correo:this.row.correo,
            nombre: this.row.nombre,
            apPaterno: this.row.apPaterno,
            apMaterno: this.row.apMaterno,
            sexo:this.row.sexo,
            nroCarnet: this.row.nroCarnet,
            ciExpedido:this.row.ciExpedido,
            nroNit:this.row.nroNit,
            direccion:this.row.direccion,
            celular:this.row.celular,
        });
    }
  }
  
  generateCode(): number {
    return Math.floor(1000 + Math.random() * 9000);
  }
  /**
  * Save
  */
  saveData() {
    this.submitted = true;
    if (this.contentForm.valid) {
      this.contentForm.enable()
      let datos: Contribuyente = {
        uuid:this.contentForm.value.uuid,
        userName: this.contentForm.value.userName,
        password: this.contentForm.value.password,
        codigoContribuyente: this.contentForm.value.codigoContribuyente,
        estadoUsuario: this.contentForm.value.estadoUsuario,
        verificationCode: this.contentForm.value.verificationCode,
        correo:this.contentForm.value.correo,
        nombre: this.contentForm.value.nombre,
        apPaterno: this.contentForm.value.apPaterno,
        apMaterno: this.contentForm.value.apMaterno,
        sexo:this.contentForm.value.sexo,
        nroCarnet: this.contentForm.value.nroCarnet,
        ciExpedido:this.contentForm.value.ciExpedido,
        nroNit:this.contentForm.value.nroNit,
        direccion:this.contentForm.value.direccion,
        celular:this.contentForm.value.celular,
      };
      if (this.contentForm.get('uuid')?.value) {
          datos.uuid=this.contentForm.value.uuid,
          this.updateData(datos);
      } else {
        datos.verificationCode= this.generateCode()
        this.addData(datos);
      }
    }else {
        this.notify('Formulario Invalido!', 'error');
    }

    setTimeout(() => {
      // this.contentForm.reset();
    }, 2000);
    // this.submitted = true
  }
    
addData(datos:Contribuyente){
  this.contribuyentesService.save(datos).subscribe({
    next:(data:Contribuyente)=>{
      this.submitted=false;
      this.notify('Datos Registrados exitosamente!','success'); 
      this.closeModal();
      this.listaItems.emit();       
    },
    error: (error) => {
      this.notify('No se pudo Guardar los datos! '+error, 'error');
    }
  })
}
updateData(datosUnit:Contribuyente) {
    this.contribuyentesService.update(datosUnit).subscribe({
        next: (data: Contribuyente) => {
          this.submitted = false;
          this.closeModal();
          this.listaItems.emit();
          this.notify('Datos Actualizados exitosamente!', 'success');
        },
        error: (error) => {
          this.notify('No se pudo Actualizar los datos! '+error, 'error');
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
