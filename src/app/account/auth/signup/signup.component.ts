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
  
  civilStatus = UserCivilStatus
  identityTypes = UserDocType
  cityAcronym= CityAcronym
  userStatus= UserStatus
  userSex= UserGender

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
    this.getUsers(); 
    
     this.SignupForm = this.formBuilder.group({
      uuid: [''],
      username: ['', [Validators.required, Validators.minLength(6),this.usernameFormatValidator]],
      password: ['', [Validators.required]], 
      cpassword: ['', [Validators.required]], 
      verificationCode:[null],
      userState:['Pendiente'],
      contribuyentType:['NA'],
      contribuyentCode:[''],
      name: ['', [Validators.required]],
      firstSurname: ['', [Validators.required]],
      secondSurname: [''],
      identityType:['', [Validators.required]],
      identityNumber:['', [Validators.required], [this.identityNumberValidator.bind(this)]],
      expedite:['', [Validators.required]],
      birthDate: ['', [Validators.required]],
      sex: [''],
      civilStatus: [''],
      nitNumber:[''],
      phone:['', [Validators.required]],      
      email: ['', [Validators.required, Validators.email], [this.emailValidator.bind(this)]],
      address:[''],
    }, {
      validator: MustMatch('password', 'cpassword')
    });
    
    this.route.queryParams.subscribe(params => {
      const exist = params['userExist'];
      this.ruatData = this.userDataService.getTemporaryUserData();
      if(exist && this.ruatData){
        this.formDataSet(this.ruatData);
        this.userDataService.setTemporaryUserData(null);
      }
    });
  }
  
  private formDataSet(data:any) {
    console.log(data)
    const client = data.contribuyente
    const doc = UserDocType.find(d => d.description === client.tipoDocumento);    
    const civ = UserCivilStatus.find(d => d.description === client.estadoCivil);
    const exp = CityAcronym.find(d => d.value === client.expedido);    
    const gen = UserGender.find(d => d.description === client.genero);
    let dateObject ='';
    if(client.fechaNacimiento){
      const [day, month, year] = client.fechaNacimiento.split('/').map(Number);
      const date = new Date(+year, +month - 1, +day);
      dateObject = date.toISOString().split('T')[0]
    }  
    
    this.SignupForm.patchValue({
    // userName: this.SignupForm.value.username,
    // password: this.SignupForm.value.password,
    // userState: this.SignupForm.value.userState,
    // verificationCode: codigo,
    contribuyentType: client.tipoContribuyente,
    contribuyentCode: data.codigoContribuyente,
    name: client.nombre,
    firstSurname: client.primerApellido,
    secondSurname: client.segundoApellido,
    sex:gen ? gen.id : '',
    birthDate: dateObject,
    civilStatus: civ ? civ.type : '',
    identityType: doc ? doc.type : '',
    identityNumber: client.numeroDocumento,
    expedite:exp ? exp.id : '',
    // nitNumber:this.SignupForm.value.nitNumber,
    // phone:this.SignupForm.value.phone,
    // email:this.SignupForm.value.email,
    // address:this.SignupForm.value.address,

    });
  }

  get f() { return this.SignupForm.controls; }

  /**
   * Form submit
   */    
  onSubmit() {
    this.SignupForm.patchValue({
      username: this.SignupForm.value.identityNumber,
      password: this.SignupForm.value.identityNumber,
      cpassword:this.SignupForm.value.identityNumber
    });
    this.submitted = true;  
    if (this.SignupForm.valid) {
      const code = this.generateCode();
      this.SignupForm.enable();
  
      const dateString: string = this.SignupForm.value.birthDate;
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
        tipoContribuyente: this.SignupForm.value.contribuyentType,
        codigoContribuyente: this.SignupForm.value.contribuyentCode,
        estadoUsuario: this.SignupForm.value.userState,
        verificationCode: code,
        nombre: this.SignupForm.value.name,
        apPaterno: this.SignupForm.value.firstSurname,
        apMaterno: this.SignupForm.value.secondSurname,
        sexo:this.SignupForm.value.sex,
        fechaNac: formattedDate,
        estadoCivil: this.SignupForm.value.civilStatus,
        tipoDocumento: this.SignupForm.value.identityType,
        nroCarnet: this.SignupForm.value.identityNumber,
        ciExpedido:this.SignupForm.value.expedite,
        nroNit:this.SignupForm.value.nitNumber,
        celular:this.SignupForm.value.phone,
        correo:this.SignupForm.value.email,
        direccion:this.SignupForm.value.address,
      };
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
          const itExist = this.usersList.some(user => user.nroCarnet === control.value);
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
          const isEmailTaken = this.usersList.some(user => user.correo === control.value);
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
    let inputMsg = document.getElementById("username-contain") as HTMLElement;
    if (this.SignupForm.get('username')?.valid) {
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
