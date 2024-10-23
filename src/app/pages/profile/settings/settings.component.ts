import { Component, OnInit } from '@angular/core';

import { TokenStorageService } from '../../../core/services/token-storage.service';
import { AuthenticationService } from 'src/app/core/services/auth.service';

import {CityAcronym}  from 'src/app/core/constants/Places';
import { UserService } from 'src/app/core/services/api-users/users.service';
import Swal from 'sweetalert2';
import { AbstractControl, AsyncValidatorFn, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Observable, catchError, map, of } from 'rxjs';
import { PassResetComponent } from '../password-reset/pass-reset.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Location } from '@angular/common';
@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})

/**
 * Profile Settings Component
 */
export class SettingsComponent implements OnInit {

  CityAcronym=CityAcronym;
  avatar="default-profile1.png";
  userType:string='';
  userData: any;
  persona:any = null;
  funcionario!:any;

  submitted = false;
  passwordForm: FormGroup = this.formBuilder.group({
    currentPassword: ['', {
      validators: [Validators.required],
      updateOn: 'blur'
    }],
    newPassword: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(120)]],
    confirmPassword: ['', [Validators.required]]
  });

  constructor(
    private formBuilder: FormBuilder,
    private authService:AuthenticationService,
    private userService:UserService,
    private modalService: NgbModal,
    private location: Location
   ) { }

  ngOnInit(): void {    
    const token = window.sessionStorage.getItem('auth-token');
    const userString = window.sessionStorage.getItem('currentUser');
    this.userData =userString ? JSON.parse(userString) : null;
    this.avatar=this.authService.getAvatar();
    if(token==='isContribuyente'){
      this.persona =this.userData;
      this.userType='Contribuyente';
    }else{
      this.userType='Administrador';
      this.persona =this.userData.designacion.personaDto;
      const funcionarioString = localStorage.getItem('assignaments');
      this.funcionario =funcionarioString ? JSON.parse(funcionarioString) : null;
      if(this.funcionario)this.userType='Encargado'; 
    }
  }

  /**
  * Multiple Default Select2
  */
   selectValue = ['Illustrator', 'Photoshop', 'CSS', 'HTML', 'Javascript', 'Python', 'PHP'];
   
   get form() {
    return this.passwordForm.controls;
  }
  public openModal() {
    const modalRef = this.modalService.open(PassResetComponent, {
        backdrop: 'static',
    });
    modalRef.componentInstance.userData = this.userData;
  }
   getAcronymCity(city: string): string {
    let acronym = '';
    CityAcronym.forEach(element => {
      if (element['description'] === city) {
        acronym = element['id'];
      }
    });
    return acronym;
   }

   /* API Services */
   updatePersona() {    
    this.persona['ciExpedido'] = this.getAcronymCity(this.persona['ciExpedido']);
    console.log(this.persona);
    // this.userService.updatePersona(this.persona).subscribe({
    //   next:(data) => {
    //       this.persona = data;
    //       this.notify('success','Registro actualizado con exito');
    //   },
    //   error: (error) => {
    //       this.notify('error','No se puedo actualizar el Registro');
    //   }
    // });
   }
  changePassword() {
    this.submitted = true;
    if (this.passwordForm.controls['newPassword'].value !== this.passwordForm.controls['confirmPassword'].value) {
      this.notify('error','Los campos Nueva Contraseña y Confirmar Contraseña no coinciden')
      return;
    }

    this.userService.changePassword(this.userData.uuid, this.passwordForm.controls['newPassword'].value).subscribe(
      (response) => {
        this.notify('success','La contraseña fue actualizada exitosamente')
        this.passwordForm.reset();
        this.submitted = false;
      },
      (error) => {
        this.notify('error','Ocurrió un error inesperado al cambiar la contraseña')
        this.submitted = false;
      }
    );
  }
   /* Common functions */
  private notify(type:any, message:string){
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
  goBack() {
    this.location.back();
  }
}
