import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { CityAcronym } from 'src/app/core/constants/Ciudades';
import { UserStates } from 'src/app/core/constants/UserData';
import { Contribuyente } from 'src/app/core/models/contribuyente.models';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import Swal from 'sweetalert2';

import emailjs, { EmailJSResponseStatus } from 'emailjs-com';
import { MustMatch } from '../pass-create/must-match';

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
  ) { }

  ngOnInit(): void {
    /**
     * Form Validatyion
     */
     this.SignupForm = this.formBuilder.group({
      correo: ['', [Validators.required]],
      nombre: ['', [Validators.required]],
      apPaterno: ['', [Validators.required]],
      apMaterno: [''],
      codigoContribuyente: [''],
      estadoUsuario: [''],
      sexo: [null],
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

  // convenience getter for easy access to form fields
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

  /* API requests */
  
  /**
   * Form submit
   */
  onSubmit() {
    this.submitted = true;
    console.log(this.SignupForm)
    if (this.SignupForm.valid) {
      this.SignupForm.enable()
      let datos: Contribuyente = {
        userName: this.SignupForm.value.username,
        password: this.SignupForm.value.password,
        codigoContribuyente: this.SignupForm.value.codigoContribuyente,
        estadoUsuario: this.SignupForm.value.estadoUsuario,
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
          this.addData(datos);
      
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
      next:(data:any)=>{
        if (data['status'] === 'OK') {
          this.SignupForm.reset();   
          this.submitted=false;
          this.notify('Datos Registrados exitosamente!','success');

        }else{
          this.notify(data.payload, 'error');
        }
      },
      error: (error) => {
        this.notify('No se pudo Guardar los datos! '+error, 'error');
      }
    })
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
