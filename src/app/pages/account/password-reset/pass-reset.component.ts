import { Component, Input } from '@angular/core';
import {DecimalPipe} from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AbstractControl, FormGroup, UntypedFormBuilder, ValidationErrors, Validators} from '@angular/forms';
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { UserService } from 'src/app/core/services/api-users/users.service';
import { TokenStorageService } from 'src/app/core/services/token-storage.service';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { MustMatch } from 'src/app/public/account/auth/pass-create/must-match';

interface PasswordUserContext {
  uuid?: string;
  username?: string;
  password?: string;
}

@Component({
  selector: 'app-pass-reset',
  templateUrl: './pass-reset.component.html',
  styleUrls: ['./pass-reset.component.scss'],
  providers: [ DecimalPipe]
})

export class PassResetComponent {
  @Input() userRole!: any;
  @Input() userData!: PasswordUserContext;

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
    const isTaxpayer = this.userRole === 'Contribuyente';
    const passwordValidators = isTaxpayer
      ? [Validators.required, Validators.minLength(8), Validators.maxLength(72), Validators.pattern('(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}')]
      : [Validators.required, Validators.minLength(6)];
    this.passwordForm = this.formBuilder.group({
      user: [this.userRole],
      currentPassword: isTaxpayer
        ? ['', [Validators.required]]
        : ['', [Validators.required], [this.validateCurrentPassword.bind(this)]],
      password: ['', passwordValidators],
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
        const username = this.getUsername();
        if (!username) {
          resolve({ invalidPassword: true });
          return;
        }

        const valid = await this.loginEmpleado(username, control.value);
        if (!valid) {
          resolve({ invalidPassword: true });
        } else {
          resolve(null);
        }
      }, 500); 
    });
  }

  changePassword() {
    this.submitted = true;  
    
    if (this.passwordForm.valid) {
      const newPassword = this.f['password'].value;  
      
      if(this.userRole === 'Contribuyente'){
        this.updateTaxpayerPassword(this.f['currentPassword'].value, newPassword);
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
  private updateTaxpayerPassword(currentPassword: string, newPassword: string): void {
    const uuid = String(this.userData?.uuid || '').trim();
    if (!uuid) {
      this.notify('error', 'No se pudo identificar el contribuyente');
      return;
    }

    this.userService.changePassword(uuid, currentPassword, newPassword).subscribe({
      next: (message) => {
        this.notify('success', message);
        this.initForm();
        this.modalService.dismissAll();
      },
      error: (err) => {
        this.notify('error', err?.message || 'No se pudo actualizar la contraseña');
      }
    });
  }

  private updateEmployeePassword(password: string): void {
    const uuidUsuario = this.getUserUuid();
    if (!uuidUsuario) {
      this.notify('error', 'No se pudo identificar el usuario');
      return;
    }

    this.employeeService.changePassword(uuidUsuario, password).subscribe(
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
    return new Promise((resolve) => {
      this.employeeService.loginByUsername(username, password).subscribe({
        next: (data) => {
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

  private getUsername(): string {
    return (
      this.userData?.username ||
      this.authService.currentUser()?.username ||
      this.storageService.getUser()?.username ||
      ''
    ).trim();
  }

  private getUserUuid(): string {
    return (
      this.userData?.uuid ||
      this.authService.currentUser()?.uuid ||
      this.storageService.getUser()?.uuid ||
      ''
    ).trim();
  }
}
