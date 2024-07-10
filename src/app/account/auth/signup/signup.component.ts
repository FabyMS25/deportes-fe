import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { CityAcronym } from 'src/app/core/constants/Ciudades';
import { UserStates } from 'src/app/core/constants/UserData';
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
  
  cityAcronym= CityAcronym
  userState= UserStates

  constructor(private formBuilder: UntypedFormBuilder,
    private contribuyentesService: ContribuyentesService,
    private ruatAuthService: RuatAuthService,
    private router: Router,
    private userDataService: UserDataService
  ) { }

  ngOnInit(): void {
    this.authRuat()
    /**
     * Form Validatyion
     */
     this.SignupForm = this.formBuilder.group({
      correo: ['', [Validators.required]],
      nombre: ['', [Validators.required]],
      apPaterno: ['', [Validators.required]],
      apMaterno: [''],
      codigoContribuyente: [''],
      estadoUsuario: ['Pending'],
      verificationCode:[''],
      sexo: ['', [Validators.required]],
      nroCarnet:['', [Validators.required]],
      nroNit:[''],
      ciExpedido:['', [Validators.required]],
      direccion:[''],
      celular:[''],

      username: ['', [Validators.required]],
      password: ['', [Validators.required]], 
      cpassword: ['', [Validators.required]],      
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
        userName: this.SignupForm.value.username,
        password: this.SignupForm.value.password,
        codigoContribuyente: this.SignupForm.value.codigoContribuyente,
        estadoUsuario: this.SignupForm.value.estadoUsuario,
        verificationCode: codigo,
        correo:this.SignupForm.value.correo,
        nombre: this.SignupForm.value.nombre,
        apPaterno: this.SignupForm.value.apPaterno,
        apMaterno: this.SignupForm.value.apMaterno,
        sexo:this.SignupForm.value.sexo,
        nroCarnet: this.SignupForm.value.nroCarnet,
        ciExpedido:this.SignupForm.value.ciExpedido,
        nroNit:this.SignupForm.value.nroNit,
        direccion:this.SignupForm.value.direccion,
        celular:this.SignupForm.value.celular,
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
  private authRuat(){
    this.ruatAuthService.authenticate().subscribe({
      next:(data:any)=>{
         console.log(data)
      },
      error: (error) => {
        console.log(error)
      }
    })
  }

}
