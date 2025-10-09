import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';
import emailjs, { EmailJSResponseStatus } from 'emailjs-com';

import { CityAcronym } from 'src/app/core/constants/Places';
import { UserStatus , UserCivilStatus, UserGender, UserDocType} from 'src/app/core/constants/UserData';
import { MustMatch } from '../pass-create/must-match';
import { UserDataService } from './user-data.service';
import { Contribuyente } from 'src/app/core/models/contribuyente.models';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { GlobalComponent } from 'src/app/global-component';

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
  ruatData: any;
  isFromRuatConsultation = false;

  constructor(
    private route: ActivatedRoute,
    private formBuilder: UntypedFormBuilder,
    private contribuyentesService: ContribuyentesService,
    private router: Router,
    private userDataService: UserDataService
  ) { }


  ngOnInit(): void {
    // this.authRuat()
    this.getUsers();
    this.initializeForm();
    
    this.route.queryParams.subscribe(params => {
      const exist = params['userExist'];
      this.ruatData = this.userDataService.getTemporaryUserData();
      
      if (exist && this.ruatData) {
        this.isFromRuatConsultation = true;
        this.formDataSet(this.ruatData);
        this.userDataService.setTemporaryUserData(null);
      }
    });
  }
  
  private initializeForm() {
    this.SignupForm = this.formBuilder.group({
      // uuid: [''],
      userName: ['', [Validators.required, Validators.minLength(6),this.usernameFormatValidator]],
      password: ['', [Validators.required]], 
      cpassword: ['', [Validators.required]], 
      verificationCode:[null],
      estadoUsuario: ['Pendiente'],
      
      nombre: ['', [Validators.required]],
      primerApellido: ['', [Validators.required]],
      segundoApellido: [''],
      fechaNacimiento: ['', [Validators.required]],
      genero: ['', [Validators.required]],
      estadoCivil: [''],
      telefono: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email], [this.emailValidator.bind(this)]],
      direccion: [''],

      tipoContribuyente: ['NA'],
      codigoContribuyente: [''],
      tipoDocumento: ['', [Validators.required]],
      numeroDocumento: ['', [Validators.required]],
      expedido: ['', [Validators.required]],
      nroNit: [''],
      // Administrative fields (set by admin later)
      esDeportistaElite: [false],
      perteneceEscuelaMunicipal: [false],
      registroUnicoDeportivo: [''],
      descuentoAplicable: [0],
      estaSancionado: [false],
      fechaFinSancion: [''],
      motivoSancion: [''],
      observacionesMunicipales: ['']
    });
  }

  private formDataSet(data: any) {
    console.log('Setting form data from RUAT:', data);    
    if (data && data.contribuyente) {
      const client = data.contribuyente;
      const doc = UserDocType.find(d => d.description === client.tipoDocumento);    
      const civ = UserCivilStatus.find(d => d.description === client.estadoCivil);
      const exp = CityAcronym.find(d => d.value === client.expedido);    
      const gen = UserGender.find(d => d.description === client.genero);
      let fechaNacimientoValue = '';
      if (client.fechaNacimiento) {
        const [day, month, year] = client.fechaNacimiento.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        fechaNacimientoValue = date.toISOString().split('T')[0];
      }
      const username = client.numeroDocumento;
      const password = client.numeroDocumento;
      this.SignupForm.patchValue({
        tipoDocumento: client.tipoDocumento,
        numeroDocumento: client.numeroDocumento,
        expedido: client.expedido,
        tipoContribuyente: client.tipoContribuyente || 'NA',
        codigoContribuyente: data.codigoContribuyente,
        
        nombre: client.nombre,
        primerApellido: client.primerApellido,
        segundoApellido: client.segundoApellido,
        genero: client.genero,
        fechaNacimiento: fechaNacimientoValue,
        estadoCivil: client.estadoCivil,
        nroNit: client.nroNit,
        
        userName: username,
        password: password
      });
      // Make document fields readonly since they come from RUAT
      // this.SignupForm.get('tipoDocumento')?.disable();
      // this.SignupForm.get('numeroDocumento')?.disable();
      // this.SignupForm.get('expedido')?.disable();
      // this.SignupForm.get('tipoContribuyente')?.disable();
    }
  }

  get f() { return this.SignupForm.controls; }

  /**
   * Form submit
   */    
  onSubmit() {
    this.SignupForm.patchValue({
      userName: this.SignupForm.value.numeroDocumento,
      password: this.SignupForm.value.numeroDocumento,
      cpassword:this.SignupForm.value.numeroDocumento
    });
    this.submitted = true;
    console.log(this.SignupForm.value)
    if (this.SignupForm.valid) {
      const code = this.generateCode();
      this.SignupForm.enable();
  
      const formData = this.prepareFormData();
      formData.verificationCode = code;
      this.userDataService.setTemporaryUserData(formData);
      // const dateString: string = this.SignupForm.value.birthDate;
      // const originalDate: Date = new Date(dateString);
      // const formattedDate: string = originalDate.toLocaleDateString('es-ES', {
      //   day: '2-digit',
      //   month: '2-digit',
      //   year: 'numeric'
      // });
      // let datos: any = {
      //   // uuid:this.SignupForm.value.uuid,
      //   userName: this.SignupForm.value.username,
      //   password: this.SignupForm.value.password,
      //   tipoContribuyente: this.SignupForm.value.contribuyentType,
      //   codigoContribuyente: this.SignupForm.value.contribuyentCode,
      //   estadoUsuario: this.SignupForm.value.userState,
      //   verificationCode: code,
      //   nombre: this.SignupForm.value.name,
      //   primerApellido: this.SignupForm.value.firstSurname,
      //   segundoApellido: this.SignupForm.value.secondSurname,
      //   genero:this.SignupForm.value.sex,
      //   fechaNacimiento: formattedDate,
      //   estadoCivil: this.SignupForm.value.civilStatus,
      //   tipoDocumento: this.SignupForm.value.identityType,
      //   numeroDocumento: this.SignupForm.value.identityNumber,
      //   expedido:this.SignupForm.value.expedite,
      //   nroNit:this.SignupForm.value.nitNumber,
      //   telefono:this.SignupForm.value.phone,
      //   email:this.SignupForm.value.email,
      //   direccion:this.SignupForm.value.address,
      // };
      // this.userDataService.setTemporaryUserData(datos);
      this.sendEmail(formData, '')
        .then(() => {
          this.router.navigate(['/auth/twostep'], { queryParams: { username: formData.userName } });
        })
        .catch(error => {
          this.userDataService.setTemporaryUserData(null);
        });

    } else {
      this.notify('Formulario Invalido!', 'error');
      Object.keys(this.SignupForm.controls).forEach(key => {
        const control = this.SignupForm.get(key);
        control?.markAsTouched();
      });
    }
  }
  
  private prepareFormData(): any {
    const formValue = this.SignupForm.getRawValue();
    let fechaNacimientoFormatted = '';
    if (formValue.fechaNacimiento) {
      // If it's already a Date object from the input[type="date"]
      const date = new Date(formValue.fechaNacimiento);
      fechaNacimientoFormatted = date.toISOString().split('T')[0]; // "yyyy-MM-dd"
    }
    return {
      ...formValue,
      fechaNacimiento: fechaNacimientoFormatted,
      estadoUsuario: 'Pendiente',
      verificadoRuat: this.isFromRuatConsultation,
      estadoRuat: this.isFromRuatConsultation ? 'ACTIVO' : 'PENDIENTE'
    };
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

  getDepartmentName(id: string): string {
    const found = this.cityAcronym.find(item => '' + item.id === id);
    return found ? found.value : id;
  }

  getCivilStatus(acronym: string): string {
    const found = this.civilStatus.find(item => item.type === acronym);
    return found ? found.description : acronym;
  }


  sendEmail(data: any, link: string): Promise<void> {
    const email = data.email;
    const name = data.nombre;
    const codigo = data.verificationCode;  
    return emailjs.send(GlobalComponent.EmailJS.idService, GlobalComponent.EmailJS.idTemplate, {
      from_name: "GAMQ-DEPORTES",
      to_name: name,
      message: codigo,
      // message: `Puedes ingresar al siguiente Link: ${link}`,
      reply_to: email,
    },GlobalComponent.EmailJS.publicKey)
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

   /**
   * Password Hide/Show
   */
  togglepasswordField() {
    this.passwordField = !this.passwordField;
  }
  /**
 * Password Hide/Show
 */
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
