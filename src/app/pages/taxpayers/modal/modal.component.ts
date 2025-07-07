import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup, ValidationErrors, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';
import emailjs, { EmailJSResponseStatus } from 'emailjs-com';

import { CityAcronym } from 'src/app/core/constants/Places';
import { UserStatus , UserCivilStatus, UserDocType, UserGender} from 'src/app/core/constants/UserData';
import { MustMatch } from 'src/app/account/auth/pass-create/must-match';

import { Contribuyente } from 'src/app/core/models/contribuyente.models';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { RuatRequestsService } from 'src/app/core/services/ruat/ruatRequest.service';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent {

  @Input() accion!: string;
  @Input() row!: Contribuyente;
  @Input() clientsList:Contribuyente[]=[];
  @Output() emitList = new EventEmitter();

  civilStatus = UserCivilStatus
  identityTypes = UserDocType
  cityAcronym= CityAcronym
  userStatus= UserStatus
  userSex= UserGender

  contentForm!: UntypedFormGroup;
  submitted = false;
  passwordField!: boolean;
  confirmField!: boolean;

  constructor(private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private contribuyentesService: ContribuyentesService,
    private ruatService: RuatRequestsService
  ) {}


  ngOnInit(): void {
    this.formInit();
    this.formDataSet();

    if(this.accion==='show'){
      setTimeout(() => {
        document.getElementById('form-event')?.classList.add('view-event');
        // (document.getElementById('btn-save-event') as HTMLElement).setAttribute("hidden", "true");
        // (document.getElementById('btn-cancel-event') as HTMLElement).setAttribute("hidden", "true");
      }, 100);

    }else{
      // (document.getElementById('btn-delete-event') as HTMLElement).setAttribute("hidden", "true");

    }
  }

  /**
   * Form data
   */
  private formInit() {
    this.contentForm = this.formBuilder.group({
      uuid: [''],
      username: ['', [Validators.required, Validators.minLength(6),this.usernameFormatValidator]],
      password: ['', [Validators.required]],
      cpassword: ['', [Validators.required]],
      verificationCode:[1010],
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
  }
  private formDataSet() {
    if (this.accion != '') {
      let dateObject ='';
      if(this.row.fechaNac){
        const [day, month, year] = this.row.fechaNac.split('/').map(Number);
        const date = new Date(+year, +month - 1, +day);
        dateObject = date.toISOString().split('T')[0]
      }
      this.contentForm.patchValue({
          uuid:this.row.uuid,
          userName: this.row.userName,
          password: this.row.password,
          userState: this.row.estadoUsuario,
          // verificationCode: codigo,
          contribuyentType: this.row.tipoContribuyente,
          contribuyentCode: this.row.codigoContribuyente,
          name: this.row.nombre,
          firstSurname: this.row.apPaterno,
          secondSurname: this.row.apMaterno,
          sex:this.row.sexo,
          birthDate: dateObject,
          civilStatus: this.row.estadoCivil,
          identityType: this.row.tipoDocumento,
          identityNumber: this.row.nroCarnet,
          expedite:this.row.ciExpedido,
          nitNumber:this.row.nroNit,
          phone:this.row.celular,
          email:this.row.correo,
          address:this.row.direccion,
        });
    }
  }
  get form() {
    return this.contentForm.controls;
  }
  /**
  * Validator
  */
  identityNumberValidator(control: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.clientsList) {
          const itExist = this.clientsList.some(user => user.nroCarnet === control.value);
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
        if (this.clientsList) {
          const isEmailTaken = this.clientsList.some(user => user.correo === control.value);
          if (isEmailTaken) {
            resolve({ emailTaken: true });
          } else { resolve(null); }
        } else {   resolve(null); }
      }, 300);
    });
  }
  usernameValidator(control: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.clientsList) {
          const isUsernameTaken = this.clientsList.some(user => user.userName === control.value);
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


  generateCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  getDepartmentName(id: string): string {
    const found = this.cityAcronym.find(item => ''+item.id === id);
    return found ? found.value : id;
  }
  getCivilStatus(acronym: string): string {
    const found = this.civilStatus.find(item => item.type === acronym);
    return found ? found.description : acronym;
  }

  /**
  * Actions
  */
  async saveData() {
    this.submitted = true;
    this.contentForm.patchValue({
      username: this.contentForm.value.identityNumber,
      password: this.contentForm.value.identityNumber,
      cpassword:this.contentForm.value.identityNumber
    });
    if (this.contentForm.valid) {
      this.contentForm.enable()
      let datos: Contribuyente = {
        uuid:this.contentForm.value.uuid,
        userName: this.contentForm.value.username,
        password: this.contentForm.value.password,
        estadoUsuario: this.contentForm.value.userStatus,
        // verificationCode: this.contentForm.value.verificationCode,
        tipoContribuyente: this.contentForm.value.contribuyentType,
        codigoContribuyente: this.contentForm.value.contribuyentCode,
        nombre: this.contentForm.value.name,
        apPaterno: this.contentForm.value.firstSurname,
        apMaterno: this.contentForm.value.secondSurname,
        sexo:this.contentForm.value.sex,
        fechaNac: this.contentForm.value.birthDate,
        estadoCivil: this.contentForm.value.civilStatus,
        tipoDocumento: this.contentForm.value.identityType,
        nroCarnet: this.contentForm.value.identityNumber,
        ciExpedido:this.contentForm.value.expedite,
        nroNit:this.contentForm.value.nitNumber,
        celular:this.contentForm.value.phone,
        correo:this.contentForm.value.email,
        direccion:this.contentForm.value.address,
      };
      if (this.contentForm.get('uuid')?.value) {
          datos.uuid=this.contentForm.value.uuid,
          this.updateData(datos);
      } else {
        datos.verificationCode= this.generateCode()
        const ruatResp = await this.registerContribuyente(datos)
          if(ruatResp){
            datos.codigoContribuyente = ruatResp.codigoContribuyente
            datos.estadoUsuario = 'Activo';
            const client:any = await this.addData(datos);
            // const user = await this.registerUser(resp , client.nroDocumento, client.nroDocumento);
            if(client){
              this.sendEmail(client, client.nroDocumento, client.nroDocumento)
              // this.form.reset();
              // this.dynamicDialogRef.close(client);
              // this.notify('Sus Datos fueron registrados!','success');

              this.notify('Datos Registrados exitosamente!','success');
              this.closeModal();
              this.emitList.emit();
            }else{
              this.notify('No se pudo registrar al Contribuyente', 'error');
            }
          }else{
            this.notify('No se pudo registrar los datos en el Ruat', 'error');
          }
      }
    }else {
        this.notify('Formulario Invalido!', 'error');
    }

    setTimeout(() => {
      // this.contentForm.reset();
    }, 2000);
    // this.submitted = true
  }

  private sendEmail(userData:any,username:string,password:string): Promise<void> {
    const email = userData.correo;
    const name = userData.nombre;
    const message = 'USUARIO: '+ username +', CONTRASEÑA: '+ password;

    return emailjs.send("service_auth", "template_6htavso", {
      from_name: "GAMQ-DEPORTES",
      to_name: name,
      message: message,
      reply_to: email,
    }, 'X9362U1QpUzthcHGT')
      .then((response: EmailJSResponseStatus) => {
        this.notify("Un email fue enviado a " + email + " con su USUARIO y CONTRASEÑA ", 'success');
      })
      .catch((error) => {
        this.notify("No se pudo enviar correctamente el e-mail", 'error');
        throw error;
      });
  }

  blockUser(){
    const datos ={
      ...this.row
    }
    datos.estadoUsuario='Bloqueado';

    this.updateData(datos);
  }
  /* API REQUESTS */
  private async addData(datos:Contribuyente){
    return new Promise((resolve, reject) => {
      this.contribuyentesService.save(datos).subscribe({
        next:(data:any)=>{
          this.submitted=false;
          if (data['status'] === 'OK') {
            const user = data.payload;
            resolve(user)
          }else{
            this.notify(data.payload, 'error');
            resolve(null);
          }
        },
        error: (error) => {
          this.submitted=false;
          reject()
          this.notify('No se pudo Guardar los datos! '+error, 'error');
        }
      })
    })
  }
  // private addData(datos:Contribuyente){
  //   this.contribuyentesService.save(datos).subscribe({
  //     next:(data:Contribuyente)=>{
  //       this.submitted=false;
  //       this.notify('Datos Registrados exitosamente!','success');
  //       this.closeModal();
  //       this.emitList.emit();
  //     },
  //     error: (error) => {
  //       this.notify('No se pudo Guardar los datos! '+error, 'error');
  //     }
  //   })
  // }
  private updateData(datosUnit:Contribuyente) {
      this.contribuyentesService.update(datosUnit).subscribe({
          next: (data: Contribuyente) => {
            this.submitted = false;
            this.closeModal();
            this.emitList.emit();
            this.notify('Datos Actualizados exitosamente!', 'success');
          },
          error: (error) => {
            this.notify('No se pudo Actualizar los datos! '+error, 'error');
          }
      })
  }
  deleteData(){
    if(this.row.uuid){
    let uuid = this.row.uuid;
    this.contribuyentesService.delete(uuid).subscribe({
      next: (data:any) => {
            this.submitted = false;
            if(data.status=='OK'){
              this.closeModal();
              this.emitList.emit();
              this.notify(data.payload, 'info');
            }
       },
      error: err => {
        this.submitted = false;
      Swal.fire({ text: 'No se pudo eliminar el registro!', confirmButtonColor: 'success' });
      }
    });
    }
  }

  /* RUAT API Requests */
  private async registerContribuyente(data:any): Promise<any>{
    return new Promise((resolve, reject) => {
      this.ruatService.registerContribuyente(data ).subscribe({
        next: (resp: any) => {
          if(resp['status']==='OK'){
            const response = resp.payload
            if(response.continuarFlujo){
              // this.userData.codigoContribuyente = response.codigoContribuyente
              // this.addData(this.userData);
              // this.notify("Usted se encuentra registrado en el Ruat",'success')
              resolve(response);
            }else{
              this.notify(response.mensaje,'error')
              resolve(null);
            }
          }else{
            this.notify(resp.payload,'error')
            resolve(null);
          }
        },
        error: (error) => {
          resolve(error);
        }
      });
    })
  }

  /* Commun Actions */
  public closeModal() {
    this.contentForm.enable();
    this.modalService.dismissAll();
    this.contentForm.reset();
  }
  private notify(message: any, type: any): void {
    let timerInterval: any;
    Swal.fire({
      title: message,
      icon: type,
      timer: 5000,
      timerProgressBar: true,
      willClose: () => {
        clearInterval(timerInterval);
      },
    }).then((result) => {
      if (result.dismiss === Swal.DismissReason.timer) {
      }
    });
  }


  showeditEvent() {
    if (document.querySelector('#edit-event-btn')?.innerHTML == 'Cancelar') {
      document.getElementById('form-event')?.classList.add('view-event');
      var editbtn = document.querySelector('#edit-event-btn') as HTMLAreaElement;
      editbtn.innerHTML = 'Editar';
      // (document.getElementById('btn-save-event') as HTMLElement).setAttribute("hidden", "true");
    } else {
      document.getElementById('form-event')?.classList.remove('view-event');
      // (document.getElementById('btn-save-event') as HTMLElement).removeAttribute("hidden");
      // (document.getElementById('btn-cancel-event') as HTMLElement).removeAttribute("hidden");

      // var modalbtn = document.querySelector('#btn-save-event') as HTMLAreaElement;
      // modalbtn.innerHTML = "Actualizar"
      var editbtn = document.querySelector('#edit-event-btn') as HTMLAreaElement;
      editbtn.innerHTML = 'Cancelar'
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
    if (this.contentForm.get('password')?.valid) {
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

            if (this.contentForm.get('username')?.pending) {
              message?.classList.remove("valid", "invalid");
              message?.classList.add("pending");
            } else if (this.contentForm.get('username')?.hasError('usernameTaken')) {
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
    if (this.contentForm.get('username')?.valid) {
      inputMsg.style.display = "none";
    }
  }
}
