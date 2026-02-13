import { Component, Input, ViewChild } from '@angular/core';
import {DecimalPipe} from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AbstractControl, FormGroup, UntypedFormBuilder, ValidationErrors, Validators} from '@angular/forms';
import Swal from 'sweetalert2';

import {CityAcronym}  from 'src/app/core/constants/Places';
// import { MustMatch } from 'src/app/account/auth/pass-create/must-match';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { UserService } from 'src/app/core/services/api-users/users.service';
import { TokenStorageService } from 'src/app/core/services/token-storage.service';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { MustMatch } from 'src/app/public/account/auth/pass-create/must-match';

@Component({
  selector: 'app-pass-reset',
  templateUrl: './pass-reset.component.html',
  styleUrls: ['./pass-reset.component.scss'],
  providers: [ DecimalPipe]
})

export class PassResetComponent {
  @Input() userRole!: any;
  @Input() userData!: any;

  submitted: boolean = false;
  passwordForm!: FormGroup;
  
  constructor(
    private employeeService:UserService,
    private userService: ContribuyentesService,
    private storageService: TokenStorageService,
    private formBuilder: UntypedFormBuilder, 
    private modalService: NgbModal,
    private authService: AuthenticationService
  ) { }

  ngOnInit(): void {
    if(this.userData){
      this.initForm();
    }
  }

  private initForm() {
    this.passwordForm = this.formBuilder.group({
      user: [this.userRole],
      currentPassword: ['', [Validators.required], [this.validateCurrentPassword.bind(this)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      cpassword: ['', [Validators.required]]       
    }, {
      validator: MustMatch('password', 'cpassword')
    });
  } 

  get f() { return this.passwordForm.controls; }

  async validateCurrentPassword(control: AbstractControl): Promise<ValidationErrors | null> {
    return new Promise(async (resolve) => {
      setTimeout(async () => {
        if (!control.value) {
          resolve(null);
        }
        if(!this.userData){
          resolve(null);          
        }
        if(this.userRole === 'Contribuyente'){
          if(this.userData.password !== control.value){
            resolve({ invalidPassword: true });
          } else {
            resolve(null);
          }
        } else {
          const valid = await this.loginEmpleado(this.userData.username, control.value);
          if (!valid) {
            resolve({ invalidPassword: true });
          } else {
            resolve(null);
          }
        }
      }, 500); 
    });
  }

  changePassword() {
    this.submitted = true;  
    
    if (this.passwordForm.valid) {
      const newPassword = this.f['password'].value;  
      
      if(this.userRole === 'Contribuyente'){
        this.updateContribuyentePassword(newPassword);
      } else {
        this.updateEmployeePassword(newPassword);
      }    
    } else {
      this.notify('error','Formulario Inválido!');
      this.markAllFieldsAsTouched();
    }
  }

  /**
   * Update Contribuyente Password
   */
  private updateContribuyentePassword(newPassword: string): void {
    const updateData: Partial<Contribuyente> = {
      ...this.userData,
      password: newPassword,
    };
    this.userService.update(updateData as Contribuyente).subscribe({
      next: (response: any) => {
        if(response.status === 'OK') {        
          this.notify('success', "Su contraseña se ha restablecido correctamente.");
          this.updateLocalStoragePassword(newPassword);          
          this.initForm();
          this.modalService.dismissAll();
        } else {
          this.notify('error', response.payload || 'Error al actualizar la contraseña');
        }
      },
      error: (err) => {
        this.notify('error', 'Ocurrió un error inesperado al cambiar la contraseña');
      }
    });
  }

  private updateLocalStoragePassword(newPassword: string): void {
    try {
      const currentUser = this.authService.currentUser();
      if (currentUser && currentUser.uuid === this.userData.uuid) {
        const updatedUser = {
          ...currentUser,
          password: newPassword
        };
        this.storageService.saveUserData(updatedUser);
      }
    } catch (error) {
      console.warn('Could not update local storage password:', error);
    }
  }

  private updateEmployeePassword(password: string): void {
    this.employeeService.changePassword(this.userData.uuid, password).subscribe(
      (response) => {
        this.notify('success', 'La contraseña fue actualizada exitosamente');
        this.initForm();
        this.modalService.dismissAll();
      },
      (error) => {
        this.notify('error', 'Ocurrió un error inesperado al cambiar la contraseña');
      }
    );
  }

  /**
   * API Requests
   */
  async loginEmpleado(username: string, password: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.employeeService.loginByUsername(username, password).subscribe({
        next: (data) => {
          this.storageService.saveToken(data.token);
          resolve(data);
        },
        error: (error) => {
          resolve(null);
        }
      });
    });
  }

  /**
   * Password Hide/Show
   */
  oldPasswordField: boolean = false;
  toggleOldpasswordField() {
    this.oldPasswordField = !this.oldPasswordField;
  }

  passwordField: boolean = false;
  togglepasswordField() {
    this.passwordField = !this.passwordField;
  }

  confirmField: boolean = false;
  toggleconfirmField() {
    this.confirmField = !this.confirmField;
  }

  /**
   * Utility Methods
   */
  private markAllFieldsAsTouched() {
    Object.keys(this.passwordForm.controls).forEach(key => {
      const control = this.passwordForm.get(key);
      control?.markAsTouched();
    });
  }

  private notify(type: any, message: string) {
    let timerInterval: any;
    Swal.fire({
      title: message,
      icon: type,
      timer: 2000,
      timerProgressBar: true,
      willClose: () => {
        clearInterval(timerInterval);
      },
    });
  }

  public onCloseModal() {
    this.passwordForm.reset();
    this.modalService.dismissAll();
  }
}