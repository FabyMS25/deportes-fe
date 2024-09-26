import { Component, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import {DecimalPipe} from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormGroup, UntypedFormBuilder, Validators} from '@angular/forms';

import {CityAcronym}  from 'src/app/core/data/Places';
// import { DesignacionFuncionario } from 'src/app/core/models/designacion-funcionario';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { UserService } from 'src/app/core/services/api-users/users.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  providers: [ DecimalPipe]
})

/**
 * Profile Component
 */
export class ProfileComponent {

  @ViewChild('showModal') modal: any;
  CityAcronym=CityAcronym;
  userData: any;
  funcionario!:any;//DesignacionFuncionario;
  avatar="default-profile1.png";
  // userRol =UserRol;
  persona:any = null;

passwordForm!: FormGroup;
passwordData = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
};
  constructor(
    private authService:AuthenticationService, 
    private userService:UserService,
    private formBuilder: UntypedFormBuilder, private modalService: NgbModal) {

   }

  ngOnInit(): void {
      const token = window.sessionStorage.getItem('auth-token');
      const userString = window.sessionStorage.getItem('currentUser');
      this.userData =userString ? JSON.parse(userString) : null;
      this.avatar=this.authService.getAvatar();
      if(token==='isContribuyente'){
        this.persona =this.userData;
      }else{
        this.persona =this.userData.designacion.personaDto;
        const funcionarioString = localStorage.getItem('assignaments');
        this.funcionario =funcionarioString ? JSON.parse(funcionarioString) : null;
      }
      
    if(this.userData){
      this.passwordForm = this.formBuilder.group({
        currentPassword: ['', [Validators.required, this.validateCurrentPassword.bind(this)]],
        newPassword: ['', [Validators.required]],
        confirmPassword: ['', [Validators.required]]
      });
      }
  }

  validateCurrentPassword(control: any): { [key: string]: string } | null {
    if (control.value !== this.userData.password) {
      return { 'invalidCurrentPassword': 'Contraseña incorrecta' };
    }
    return null;
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

  changePassword() {
    if (this.passwordForm.controls['newPassword'].value !== this.passwordForm.controls['confirmPassword'].value) {
      this.notify('error','Los campos Nueva Contraseña y Confirmar Contraseña no coinciden')
      return;
    }

    this.userService.changePassword(this.userData.uuid, this.passwordForm.controls['newPassword'].value).subscribe(
      (response) => {
        this.notify('success','La contraseña fue actualizada exitosamente')
        this.passwordForm.reset();
      },
      (error) => {
        this.notify('error','Ocurrió un error inesperado al cambiar la contraseña')
      }
    );
  }
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

  openModal(content:any) {
    this.modalService.open(content, { centered: true });
    
    // Swal.fire({ text: 'Please select at least one checkbox', confirmButtonColor: '#299cdb', });  
  }
  
  getCityDescription(ciExpedido: any): string {
    console.log(ciExpedido)
    const cityById = CityAcronym.find(c => c.id === ciExpedido);  
    if (cityById) {
      return cityById.description;
    }
    // const cityByDescription = CityAcronym.find(c => c.description === ciExpedido);
    // if (cityByDescription) {
    //   return cityByDescription.description;
    // }  
    return ciExpedido;
  }
      
  public campoValido(campo: string): boolean {
    return this.passwordForm.controls[campo].valid;
  }
  campoInvalido(campo: string): string {
    if (this.passwordForm.controls[campo].touched) {
      if (this.passwordForm.controls[campo].hasError('required')) {
        return 'Campo requerido';
      } else if (this.passwordForm.controls[campo].hasError('invalidCurrentPassword')) {
        return 'Contraseña incorrecta';
      } else if (campo === "confirmPassword") {
        if (this.passwordForm.controls['newPassword'].value !== this.passwordForm.controls['confirmPassword'].value) {
          return 'Los campos no coinciden';
          
        }
      }
    }
    return '';
  }
}
