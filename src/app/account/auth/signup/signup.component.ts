import { Component, OnInit } from '@angular/core';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { CityAcronym } from 'src/app/core/constants/Ciudades';
import { UserStates , UserCivilStatus, UserDocType} from 'src/app/core/constants/UserData';
import { Contribuyente } from 'src/app/core/models/contribuyente.models';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import Swal from 'sweetalert2';

import emailjs, { EmailJSResponseStatus } from 'emailjs-com';
import { MustMatch } from '../pass-create/must-match';
import { Router } from '@angular/router';
import { UserDataService } from './user-data.service';
import { RuatAuthService } from 'src/app/core/services/ruat/ruatAuth.service';

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

  usersList:any[]=[];
  userExist=false;

  constructor(private formBuilder: UntypedFormBuilder,
    private contribuyentesService: ContribuyentesService,
    private ruatAuthService: RuatAuthService,
    private router: Router,
    private userDataService: UserDataService
  ) { }

  ngOnInit(): void {
    // this.authRuat()
    this.getUsers();
    /**
     * Form Validatyion
     */
     this.SignupForm = this.formBuilder.group({
      uuid: [''],
      username: ['', [Validators.required]],
      password: ['', [Validators.required]], 
      cpassword: ['', [Validators.required]], 
      tipoContribuyente:['NA'],
      codigoContribuyente:[''],
      estadoUsuario:['Pendiente'],
      verificationCode:[null],
      nombre: ['', [Validators.required]],
      primerApellido: ['', [Validators.required]],
      segundoApellido: [''],
      genero: [''],
      fechaNacimiento: ['', [Validators.required]],
      estadoCivil: [''],
      tipoDocumento:['', [Validators.required]],
      nroDocumento:['', [Validators.required]],
      nroNit:[''],
      expedido:[''],
      celular:['', [Validators.required]],
      correo: ['', [Validators.required]],
      direccion:[''],
    }, {
      validator: MustMatch('password', 'cpassword')
    });
    // Password Validation set
    var myInput = document.getElementById("password-input") as HTMLInputElement;
    var letter = document.getElementById("pass-lower");
    var capital = document.getElementById("pass-upper");
    var number = document.getElementById("pass-number");
    var length = document.getElementById("pass-length");

    // When the user clicks on the password field, show the message box
    myInput.onfocus = function () {
      let input = document.getElementById("password-contain") as HTMLElement;
      input.style.display = "block"
    };

    // When the user clicks outside of the password field, hide the password-contain box
    myInput.onblur = function () {
      let input = document.getElementById("password-contain") as HTMLElement;
      input.style.display = "none"
    };

    // When the user starts to type something inside the password field
    myInput.onkeyup = function () {
      // Validate lowercase letters
      var lowerCaseLetters = /[a-z]/g;
      if (myInput.value.match(lowerCaseLetters)) {
          letter?.classList.remove("invalid");
          letter?.classList.add("valid");
      } else {
          letter?.classList.remove("valid");
          letter?.classList.add("invalid");
      }

      // Validate capital letters
      var upperCaseLetters = /[A-Z]/g;
      if (myInput.value.match(upperCaseLetters)) {
          capital?.classList.remove("invalid");
          capital?.classList.add("valid");
      } else {
          capital?.classList.remove("valid");
          capital?.classList.add("invalid");
      }

      // Validate numbers
      var numbers = /[0-9]/g;
      if (myInput.value.match(numbers)) {
          number?.classList.remove("invalid");
          number?.classList.add("valid");
      } else {
          number?.classList.remove("valid");
          number?.classList.add("invalid");
      }

      // Validate length
      if (myInput.value.length >= 8) {
          length?.classList.remove("invalid");
          length?.classList.add("valid");
      } else {
          length?.classList.remove("valid");
          length?.classList.add("invalid");
      }
    };
  }


  private initUserValidation(): void {
    var myInput = document.getElementById("username-input") as HTMLInputElement;
    var taken = document.getElementById("user-taken");

      let input = document.getElementById("user-taken") as HTMLElement;
      input.style.display = "none"

    const list = this.usersList
    myInput.onkeyup = function () {
      const exist = list.some(user => user.userName === myInput.value);
      // this.userExist = exist;
      console.log(exist)
      if (!exist) {
        // let input = document.getElementById("user-taken") as HTMLElement;
        input.style.display = "none"
      } else {        
        // let input = document.getElementById("user-taken") as HTMLElement;
        input.style.display = "block"
      }
    };
  
    // if (!myInput || !usernameContain || !taken) {
    //   console.error("One or more username validation elements not found");
    //   return;
    // }
    // myInput.addEventListener('focus', () => usernameContain.style.display = "block");
    // myInput.addEventListener('blur', () => usernameContain.style.display = "none");
  
    // myInput.addEventListener('input', () => {
    //   const username = myInput;
    //   const exists = this.usersList.some(user => user.userName === username);
    //   // this.updateValidationClass(taken, !exists);
    //     taken.classList.toggle("valid", !exists);
    //     taken.classList.toggle("invalid", exists);
    // });
    
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
      
      let datos: Contribuyente = {
        uuid:this.SignupForm.value.uuid,
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
        fechaNacimiento: this.SignupForm.value.fechaNacimiento,
        tipoDocumento: this.SignupForm.value.tipoDocumento,
        nroCarnet: this.SignupForm.value.nroDocumento,
        ciExpedido:this.SignupForm.value.expedido,
        nroNit:this.SignupForm.value.nroNit,
        celular:this.SignupForm.value.celular,
        correo:this.SignupForm.value.correo,
        direccion:this.SignupForm.value.direccion,
      };
      // Store datos in the service
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
            this.initUserValidation();
          }else{
            Swal.fire({ text: data.payload, confirmButtonColor: '#299cdb'});
          }
        },
        error: (error) => {
          
        }
      });
  }
  private authRuat() {
  this.ruatAuthService.authenticate().subscribe({
    next: (response: any) => {
      console.log('Authentication successful:', response);
      

    },
    error: (error: any) => {
      console.error('Authentication error:', error);
      
      if (error.name === 'HttpErrorResponse') {
        if (error.status === 0) {
          console.error('CORS error or network issue:', error.message);
        } else {
          console.error(`Server returned error ${error.status}:`, error.error);
        }
        
        // Log additional details that might be helpful
        console.log('Error details:', {
          headers: error.headers,
          url: error.url,
          type: error.type,
          ok: error.ok
        });
      }
      
      // Handle authentication error here
    },
    complete: () => {
      console.log('Authentication request completed');
    }
  });
}

}
