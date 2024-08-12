import { Component, OnInit } from '@angular/core';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { CityAcronym } from 'src/app/core/constants/Places';
import { UserStates , UserCivilStatus, UserDocType, UserGender} from 'src/app/core/constants/UserData';
import { Contribuyente } from 'src/app/core/models/contribuyente.models';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import Swal from 'sweetalert2';

import emailjs, { EmailJSResponseStatus } from 'emailjs-com';
import { MustMatch } from '../pass-create/must-match';
import { ActivatedRoute, Router } from '@angular/router';
import { UserDataService } from './user-data.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})


/**
 * Signup Basic Component
 */
export class SignupComponent implements OnInit {

  SignupForm!: UntypedFormGroup;
  submitted = false;
  passwordField!: boolean;
  confirmField!: boolean;
  year: number = new Date().getFullYear();
  
  estadoCivil = UserCivilStatus
  tipoDocs = UserDocType
  cityAcronym= CityAcronym
  userState= UserStates
  userGender= UserGender

  usersList!:any[];
  userExist=false;
  ruatData: any;

  constructor(
    private route: ActivatedRoute,
    private formBuilder: UntypedFormBuilder,
    private contribuyentesService: ContribuyentesService,
    private router: Router,
    private userDataService: UserDataService
  ) { }

  ngOnInit(): void {
    

    // this.authRuat()
    this.getUsers(); // api rest to get userList
    /**
     * Form Validatyion
     */
     this.SignupForm = this.formBuilder.group({
      uuid: [''],
      username: ['', [Validators.required, Validators.minLength(6),this.usernameFormatValidator], [this.usernameValidator.bind(this)]],
      password: ['', [Validators.required]], 
      cpassword: ['', [Validators.required]], 
      tipoContribuyente:['NA'],
      codigoContribuyente:[''],
      estadoUsuario:['Pendiente'],
      verificationCode:[null],
      nombre: ['', [Validators.required]],
      primerApellido: ['', [Validators.required]],
      segundoApellido: ['', [Validators.required]],
      genero: [''],
      fechaNacimiento: ['', [Validators.required]],
      estadoCivil: [''],
      tipoDocumento:['', [Validators.required]],
      nroDocumento:['', [Validators.required], [this.nroDocumentoValidator.bind(this)]],
      expedido:['', [Validators.required]],
      nroNit:[''],
      celular:['', [Validators.required]],
      correo: ['', [Validators.required]],
      direccion:[''],
    }, {
      validator: MustMatch('password', 'cpassword')
    });
    
  // Password Validation set
  // onPasswordFocus() {
    var myInput = document.getElementById("password-input") as HTMLInputElement;
    var letter = document.getElementById("pass-lower");
    var capital = document.getElementById("pass-upper");
    var number = document.getElementById("pass-number");
    var length = document.getElementById("pass-length");
    // When the user clicks on the password field, show the message box
    let input = document.getElementById("password-contain") as HTMLElement;
    myInput.onfocus = function () {
      input.style.display = "block"
    };
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
          // let input = document.getElementById("password-contain") as HTMLElement;
          input.style.display = "none"
        };
      }
    };

    
    this.route.queryParams.subscribe(params => {
      const exist = params['userExist'];
      this.ruatData = this.userDataService.getTemporaryUserData();
      if(exist && this.ruatData){
        this.formDataSet(this.ruatData);
        this.userDataService.setTemporaryUserData(null);
      }
      // if (this.userData) {
      //   this.searchContribuyente(this.userData);
      // }
    });
  }
  
  private formDataSet(data:any) {
    const contribuyente = data.contribuyente
    const doc = UserDocType.find(d => d.description === contribuyente.tipoDocumento);    
    const civ = UserCivilStatus.find(d => d.description === contribuyente.estadoCivil);
    const exp = CityAcronym.find(d => d.description === contribuyente.expedido);    
    const gen = UserGender.find(d => d.description === contribuyente.genero);
    let dateObject ='';
    if(contribuyente.fechaNacimiento){
      const [day, month, year] = contribuyente.fechaNacimiento.split('/').map(Number);
      const date = new Date(+year, +month - 1, +day);
      dateObject = date.toISOString().split('T')[0]
    }  
    
    this.SignupForm.patchValue({
    // userName: this.SignupForm.value.username,
    // password: this.SignupForm.value.password,
    // estadoUsuario: this.SignupForm.value.estadoUsuario,
    // verificationCode: codigo,
    tipoContribuyente: contribuyente.tipoContribuyente,
    codigoContribuyente: data.codigoContribuyente,
    nombre: contribuyente.nombre,
    primerApellido: contribuyente.primerApellido,
    segundoApellido: contribuyente.segundoApellido,
    genero:gen ? gen.id : '',
    fechaNacimiento: dateObject,
    estadoCivil: civ ? civ.type : '',
    tipoDocumento: doc ? doc.type : '',
    nroDocumento: contribuyente.numeroDocumento,
    expedido:exp ? exp.id : '',
    // nroNit:this.SignupForm.value.nroNit,
    // celular:this.SignupForm.value.celular,
    // correo:this.SignupForm.value.correo,
    // direccion:this.SignupForm.value.direccion,

    });


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
    let inputMsg = document.getElementById("username-contain") as HTMLElement;
    if (this.SignupForm.get('username')?.valid) {
      inputMsg.style.display = "none";
    }
  }
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

  
  nroDocumentoValidator(control: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.usersList) {
          const itExist = this.usersList.some(user => user.nroCarnet === control.value);
          if (itExist) {
            resolve({itExist: true });
          } else { resolve(null); }
        } else {   resolve(null); }
      }, 300); 
    });
  }

  get f() { return this.SignupForm.controls; }
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
  
  /**
   * Form submit
   */    
  onSubmit() {
    this.submitted = true;  
    if (this.SignupForm.valid) {
      const codigo = this.generateCode();
      this.SignupForm.enable();
  
      const dateString: string = this.SignupForm.value.fechaNacimiento;
      const originalDate: Date = new Date(dateString);
      const formattedDate: string = originalDate.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      let datos: Contribuyente = {
        // uuid:this.SignupForm.value.uuid,
        userName: this.SignupForm.value.username,
        password: this.SignupForm.value.password,
        tipoContribuyente: this.SignupForm.value.tipoContribuyente,
        codigoContribuyente: this.SignupForm.value.codigoContribuyente,
        estadoUsuario: this.SignupForm.value.estadoUsuario,
        verificationCode: codigo,
        nombre: this.SignupForm.value.nombre,
        apPaterno: this.SignupForm.value.primerApellido,
        apMaterno: this.SignupForm.value.segundoApellido,
        sexo:this.SignupForm.value.genero,
        fechaNac: formattedDate,
        estadoCivil: this.SignupForm.value.estadoCivil,
        tipoDocumento: this.SignupForm.value.tipoDocumento,
        nroCarnet: this.SignupForm.value.nroDocumento,
        ciExpedido:this.SignupForm.value.expedido,
        nroNit:this.SignupForm.value.nroNit,
        celular:this.SignupForm.value.celular,
        correo:this.SignupForm.value.correo,
        direccion:this.SignupForm.value.direccion,
      };
      // Store datos in the service
      // this.searchContribuyente(datos);
      this.userDataService.setTemporaryUserData(datos);
  
      this.sendEmail(datos, '')
        .then(() => {
          this.router.navigate(['/auth/twostep'], { queryParams: { username: datos.userName } });
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
  
  
  generateCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  sendEmail(data: any, link: string): Promise<void> {
    const email = data.correo;
    const name = data.nombre;
    const codigo = data.verificationCode;
  
    return emailjs.send("service_auth", "template_6htavso", {
      from_name: "GAMQ-DEPORTES",
      to_name: name,
      message: codigo,
      // message: `Puedes ingresar al siguiente Link: ${link}`,
      reply_to: email,
    }, 'X9362U1QpUzthcHGT')
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

}
