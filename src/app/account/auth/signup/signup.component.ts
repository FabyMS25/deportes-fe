import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { CityAcronym } from 'src/app/core/constants/Ciudades';
import { Contribuyente } from 'src/app/core/models/contribuyente.models';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})

/**
 * Signup Basic Component
 */
export class SignupComponent implements OnInit {

  // Login Form
  SignupForm!: UntypedFormGroup;
  submitted = false;
  fieldTextType!: boolean;
  // set the current year
  year: number = new Date().getFullYear();
  
  cityAcronym= CityAcronym

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
      sexo: [null],
      nroCarnet:['', [Validators.required]],
      nroNit:[''],
      ciExpedido:['', [Validators.required]],
      direccion:[''],
      celular:[''],

      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
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
   toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }

  /* API requests */
  
  /**
   * Form submit
   */
  onSubmit() {
    this.submitted = true;
    this.submitted = true;
    if (this.SignupForm.valid) {
      this.SignupForm.enable()
      let datos: Contribuyente = {
        userName: this.SignupForm.value.userName,
        password: this.SignupForm.value.password,
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
      next:(data:Contribuyente)=>{
        this.submitted=false;
        this.notify('Datos Registrados exitosamente!','success'); 
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
