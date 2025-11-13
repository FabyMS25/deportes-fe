import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AbstractControl, FormGroup, UntypedFormBuilder, UntypedFormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';
import emailjs, { EmailJSResponseStatus } from 'emailjs-com';

import { CityAcronym } from 'src/app/core/constants/Places';
import { UserStatus , UserCivilStatus, UserGender, UserDocType} from 'src/app/core/constants/UserData';
import { MustMatch } from '../pass-create/must-match';
import { UserDataService } from './user-data.service';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { environment } from 'src/environments/environment';
import { EstadoRuat, EstadoUsuario } from 'src/app/core/constants/Estados';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})

export class SignupComponent implements OnInit {
  SignupForm!: UntypedFormGroup;
  submitted = false;
  passwordField!: boolean;
  confirmField!: boolean;
  year: number = new Date().getFullYear();
  
  civilStatus = UserCivilStatus;
  identityTypes = UserDocType;
  cityAcronym = CityAcronym;
  userStatus = UserStatus;
  userSex = UserGender;

  usersList!: any[];
  userExist = false;
  ruatData!: Contribuyente;

  constructor(
    private route: ActivatedRoute,
    private formBuilder: UntypedFormBuilder,
    private contribuyentesService: ContribuyentesService,
    private router: Router,
    private userDataService: UserDataService
  ) { }


  ngOnInit(): void {
    this.getUsers();
    this.initializeForm();    
    this.route.queryParams.subscribe(params => {
      const exist = params['userExist'];
      this.ruatData = this.userDataService.getTemporaryUserData();
      
      if (exist && this.ruatData) {
        this.formDataSet(this.ruatData);
        this.userDataService.setTemporaryUserData(null);
      }
    });
  }
  
  private initializeForm() {
    this.SignupForm = this.formBuilder.group({
      // uuid: [''],
      userName: ['', [Validators.required, Validators.minLength(5),Validators.maxLength(150),this.usernameFormatValidator]],
      password: ['', [Validators.required, Validators.minLength(5),Validators.maxLength(150)]], 
      cpassword: ['', [Validators.required, Validators.minLength(5),Validators.maxLength(150)]], 
      verificationCode:[null],
      estadoUsuario: [EstadoUsuario.PENDIENTE_VERIFICACION],
      estadoRuat: [''],
      verificadoRuat: [false],     
      tipoContribuyente: ['NA', [Validators.required]],
      codigoContribuyente: [''],
      tipoDocumento: ['', [Validators.required]],
      numeroDocumento: ['', [Validators.required,Validators.minLength(1),Validators.maxLength(20)]],
      expedido: ['', [Validators.maxLength(20)]],
      nroNit: ['', [Validators.maxLength(20)]],

      nombre: ['', [Validators.required,Validators.minLength(1),Validators.maxLength(250)]],
      primerApellido: ['', [Validators.required,Validators.minLength(1),Validators.maxLength(100)]],
      segundoApellido: ['', [Validators.minLength(1),Validators.maxLength(100)]],      
      // apellidoEsposo: ['', [Validators.maxLength(100)]],
      estadoCivil: [''],
      fechaNacimiento: ['', [Validators.required]],
      genero: [''],
      
      telefono: ['', [Validators.required, Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)],
                   [this.emailValidator.bind(this)]],
      direccion: ['', [Validators.maxLength(250)]],
      // Administrative fields 
      esDeportistaElite: [false],
      perteneceEscuelaMunicipal: [false],
      registroUnicoDeportivo: ['', [Validators.maxLength(50)]],
      fechaUltimoUsoGratuito:[],
      observacionesMunicipales: [''],
      descuentoAplicable: [0],
      estaSancionado: [false],
      fechaFinSancion: [''],
      motivoSancion: [''],
    }, {
      validator: MustMatch('password', 'cpassword')
    });
  }

  private formDataSet(data: any) {   
    if (data && data.contribuyente) {
      const client = data.contribuyente;
      let fechaNacimientoValue = '';
      if (client.fechaNacimiento) {
      //   const [day, month, year] = client.fechaNacimiento.split('/').map(Number);
      //   const date = new Date(year, month - 1, day);
      //   fechaNacimientoValue = date.toISOString().split('T')[0];
      if (client.fechaNacimiento.includes('/')) {
        const [day, month, year] = client.fechaNacimiento.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        fechaNacimientoValue = date.toISOString().split('T')[0];
      } else {
        fechaNacimientoValue = client.fechaNacimiento;
      }
    }
      this.SignupForm.patchValue({
        ...data.contribuyente,
        codigoContribuyente: data.codigoContribuyente, 
        estadoRuat: EstadoRuat.ACTIVO,
        estadoUsuario: EstadoUsuario.ACTIVO,
        verificadoRuat: true,
        fechaNacimiento: fechaNacimientoValue,
        tipoDocumento: UserDocType.find(d => d.description === client.tipoDocumento)?.type,
        expedido: CityAcronym.find(d => d.value === client.expedido)?.id,
        genero: UserGender.find(d => d.description === client.genero)?.id,
        estadoCivil: UserCivilStatus.find(d => d.description === client.estadoCivil)?.type,
      });
      this.SignupForm.get('nombre')?.disable();
      this.SignupForm.get('primerApellido')?.disable();
      this.SignupForm.get('segundoApellido')?.disable();
      this.SignupForm.get('fechaNacimiento')?.disable();
      this.SignupForm.get('genero')?.disable();
      this.SignupForm.get('estadoCivil')?.disable();
      this.SignupForm.get('tipoContribuyente')?.disable();
      this.SignupForm.get('tipoDocumento')?.disable();
      this.SignupForm.get('numeroDocumento')?.disable();
      this.SignupForm.get('expedido')?.disable();
    }
  }

  get f() { return this.SignupForm.controls; }

  /**
   * Form submit
   */    
  async onSubmit() {
    this.submitted = true;
    this.SignupForm.enable();  
    this.SignupForm.patchValue({
      userName: this.SignupForm.value.numeroDocumento,
      password: this.SignupForm.value.numeroDocumento,
      cpassword: this.SignupForm.value.numeroDocumento
    });
    await this.waitForAsyncValidation();
    if (this.SignupForm.valid) {
      const formData = this.SignupForm.getRawValue();
      formData.verificationCode = this.generateCode();
      this.userDataService.setTemporaryUserData(formData);    
      this.sendEmail(formData, '')
        .then(() => {
          this.router.navigate(['/auth/twostep'], { queryParams: { username: formData.userName } });
        })
        .catch(error => {
          this.userDataService.setTemporaryUserData(null);
        });
    } else {
      this.notify('Formulario Inválido!', 'error');
      this.markAllFieldsAsTouched();
    }
  }

  private waitForAsyncValidation(): Promise<void> {
    return new Promise((resolve) => {
      if (this.SignupForm.pending) {
        const subscription = this.SignupForm.statusChanges.subscribe(status => {
          if (status !== 'PENDING') {
            subscription.unsubscribe();
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  generateCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
  markAllFieldsAsTouched() {
    Object.keys(this.SignupForm.controls).forEach(key => {
      const control = this.SignupForm.get(key);
      control?.markAsTouched();
    });
  }

  sendEmail(data: any, link: string): Promise<void> {
    const email = data.email;
    const name = data.nombre;
    const codigo = data.verificationCode;  
    return emailjs.send(environment.EmailJS.idService, environment.EmailJS.idTemplate, {
      from_name: "GAMQ-DEPORTES",
      to_name: name,
      message: codigo,
      // message: `Puedes ingresar al siguiente Link: ${link}`,
      reply_to: email,
    },environment.EmailJS.publicKey)
      .then((response: EmailJSResponseStatus) => {
        this.notify("Un email fue enviado a " + email + " con el codigo de confirmacion", 'success');
        this.submitted = false;
        this.SignupForm.reset();   
      })
      .catch((error) => {
        this.submitted = false;
        this.notify("No se pudo enviar correctamente el e-mail", 'error');
        throw error; 
      });
  }

  /**
   * Nro Documento Validator
   */
  identityNumberValidator(control: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.usersList) {
          const itExist = this.usersList.some(user => user.numeroDocumento === control.value);
          if (itExist) {
            resolve({itExist: true });
          } else { resolve(null); }
        } else {   resolve(null); }
      }, 300); 
    });
  }

  emailValidator(control: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.usersList) {
          const isEmailTaken = this.usersList.some(user => user.email === control.value);
          if (isEmailTaken) {
            resolve({ emailTaken: true });
          } else { resolve(null); }
        } else {   resolve(null); }
      }, 300); 
    });
  }
  
  /**
   * Username / Password Validator
   */
  usernameValidator(control: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.usersList) {
          const isUsernameTaken = this.usersList.some(user => user.userName === control.value);
          if (isUsernameTaken) {
            resolve({ usernameTaken: true });
          } else { resolve(null); }
        } else {   resolve(null); }
      }, 300); 
    });
  }
  usernameFormatValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) {
      return null;
    }
    const lowercaseValue = value.toLowerCase();
    const validFormat = /^[a-z0-9.]+$/.test(lowercaseValue);
    if (!validFormat) {
      return { invalidFormat: true };
    }
    if (value !== lowercaseValue) {
      control.setValue(lowercaseValue, { emitEvent: false });
    }
    return null;
  }
  onPasswordFocus() {
    var myInput = document.getElementById("password-input") as HTMLInputElement;
    var letter = document.getElementById("pass-lower");
    var capital = document.getElementById("pass-upper");
    var number = document.getElementById("pass-number");
    var length = document.getElementById("pass-length");
    let input = document.getElementById("password-contain") as HTMLElement;
    // myInput.onfocus = function () {
      input.style.display = "block"
    // };
    myInput.onkeyup = function () {
      let isValid = true;
      // Validate lowercase letters
      var lowerCaseLetters = /[a-z]/g;
      if (myInput.value.match(lowerCaseLetters)) {
          letter?.classList.remove("invalid");
          letter?.classList.add("valid");
      } else {
          letter?.classList.remove("valid");
          letter?.classList.add("invalid");
          isValid = false
      }
      // Validate capital letters
      var upperCaseLetters = /[A-Z]/g;
      if (myInput.value.match(upperCaseLetters)) {
          capital?.classList.remove("invalid");
          capital?.classList.add("valid");
      } else {
          capital?.classList.remove("valid");
          capital?.classList.add("invalid");
          isValid = false
      }
      // Validate numbers
      var numbers = /[0-9]/g;
      if (myInput.value.match(numbers)) {
          number?.classList.remove("invalid");
          number?.classList.add("valid");
      } else {
          number?.classList.remove("valid");
          number?.classList.add("invalid");
          isValid = false
      }
      // Validate length
      if (myInput.value.length >= 8) {
          length?.classList.remove("invalid");
          length?.classList.add("valid");
      } else {
          length?.classList.remove("valid");
          length?.classList.add("invalid");
          isValid =false
      }
      if(isValid){          
        myInput.onblur = function () {
          input.style.display = "none"
        };
      }
    };    
  }  
  onPasswordBlur() {
    let input = document.getElementById("password-contain") as HTMLElement;
    if (this.SignupForm.get('password')?.valid) {
      input.style.display = "none";
    }
  }
  onUsernameFocus() {
    var inputUser = document.getElementById("username-input") as HTMLInputElement;
    var message = document.getElementById("user-taken");
    var pattern = document.getElementById("user-pattern");
    var uLength = document.getElementById("user-length");
    let inputMsg = document.getElementById("username-contain") as HTMLElement;
      // inputUser.onfocus = function () {
        inputMsg.style.display = "block"
      // };
      inputUser.onkeyup = () => {        
        var patternValue = /^[a-z0-9.]+$/;
        if (inputUser.value.match(patternValue)) {
            pattern?.classList.remove("invalid");
            pattern?.classList.add("valid");
        } else {
            pattern?.classList.remove("valid");
            pattern?.classList.add("invalid");
        }
        if (inputUser.value.length >= 6) {
            uLength?.classList.remove("invalid");
            uLength?.classList.add("valid");
            
            if (this.SignupForm.get('username')?.pending) {
              message?.classList.remove("valid", "invalid");
              message?.classList.add("pending");
            } else if (this.SignupForm.get('username')?.hasError('usernameTaken')) {
              message?.classList.remove("valid", "pending");
              message?.classList.add("invalid");
            } else{ 
              message?.classList.remove("invalid", "pending");
              message?.classList.add("valid");
            }
        } else {
            uLength?.classList.remove("valid");
            uLength?.classList.add("invalid");
        }        
      };
  }  
  onUsernameBlur() {
    let inputMsg = document.getElementById("userName-contain") as HTMLElement;
    if (this.SignupForm.get('userName')?.valid) {
      inputMsg.style.display = "none";
    }
  }
  togglepasswordField() {
    this.passwordField = !this.passwordField;
  }
  toggleconfirmField() {
    this.confirmField = !this.confirmField;
  }
 
  /* API REQUESTS */
  private getUsers() {
    this.contribuyentesService.getAll().subscribe({
        next: (data: any) => {
          if (data['status'] === 'OK') {
            this.usersList = data.payload;
          }
        },
        error: (error) => {         
        }
      });
  }

  /*  */
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
