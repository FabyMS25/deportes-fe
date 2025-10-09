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
  @Input() clientsList: Contribuyente[] = [];
  @Output() emitList = new EventEmitter();

  civilStatus = UserCivilStatus;
  identityTypes = UserDocType;
  cityAcronym = CityAcronym;
  userStatus = UserStatus;
  userSex = UserGender;

  contentForm!: UntypedFormGroup;
  submitted = false;
  passwordField!: boolean;
  confirmField!: boolean;
  today = new Date().toISOString().split('T')[0];

  constructor(
    private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private contribuyentesService: ContribuyentesService,
    private ruatService: RuatRequestsService
  ) {}

  ngOnInit(): void {
    this.formInit();
    this.formDataSet();

    if (this.accion === 'show') {
      setTimeout(() => {
        document.getElementById('form-event')?.classList.add('view-event');
      }, 100);
    }
  }

  private formInit() {
    this.contentForm = this.formBuilder.group({
      uuid: [''],
      userName: ['', [Validators.required, Validators.minLength(6), this.usernameFormatValidator]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      cpassword: ['', [Validators.required]],
      estadoUsuario: ['Pendiente'],
      
      tipoContribuyente: ['NA', [Validators.required]],
      codigoContribuyente: [''],
      
      // Datos personales
      nombre: ['', [Validators.required]],
      primerApellido: ['', [Validators.required]],
      segundoApellido: [''],
      apellidoEsposo: [''],
      estadoCivil: [''],
      fechaNacimiento: [''],
      genero: [''],
      
      // Documentos
      tipoDocumento: ['CI', [Validators.required]],
      numeroDocumento: ['', [Validators.required], [this.identityNumberValidator.bind(this)]],
      expedido: [''],
      nroNit: [''],
      
      // Contacto
      telefono: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email], [this.emailValidator.bind(this)]],
      direccion: [''],
      
      // Campos adicionales del modelo actualizado
      verificadoRuat: [false],
      esDeportistaElite: [false],
      perteneceEscuelaMunicipal: [false],
      registroUnicoDeportivo: [''],
      descuentoAplicable: [0],
      estaSancionado: [false],
      fechaFinSancion: [''],
      motivoSancion: [''],
      observacionesMunicipales: ['']
    }, {
      validator: MustMatch('password', 'cpassword')
    });
  }
  private formDataSet() {
    if (this.accion !== '' && this.row) {
      const fechaNacimiento = this.row.fechaNacimiento ? 
        new Date(this.row.fechaNacimiento).toISOString().split('T')[0] : '';      
      const fechaFinSancion = this.row.fechaFinSancion ? 
        new Date(this.row.fechaFinSancion).toISOString().split('T')[0] : '';
      this.contentForm.patchValue({
        uuid: this.row.uuid,
        userName: this.row.userName,
        password: this.row.password,
        estadoUsuario: this.row.estadoUsuario,        
        tipoContribuyente: this.row.tipoContribuyente,
        codigoContribuyente: this.row.codigoContribuyente,        
        nombre: this.row.nombre,
        primerApellido: this.row.primerApellido,
        segundoApellido: this.row.segundoApellido,
        apellidoEsposo: this.row.apellidoEsposo,
        estadoCivil: this.row.estadoCivil,
        fechaNacimiento: fechaNacimiento,
        genero: this.row.genero,        
        tipoDocumento: this.row.tipoDocumento,
        numeroDocumento: this.row.numeroDocumento,
        expedido: this.row.expedido,
        nroNit: this.row.nroNit,        
        telefono: this.row.telefono,
        email: this.row.email,
        direccion: this.row.direccion,        
        verificadoRuat: this.row.verificadoRuat,
        esDeportistaElite: this.row.esDeportistaElite,
        perteneceEscuelaMunicipal: this.row.perteneceEscuelaMunicipal,
        registroUnicoDeportivo: this.row.registroUnicoDeportivo,
        descuentoAplicable: this.row.descuentoAplicable,
        estaSancionado: this.row.estaSancionado,
        fechaFinSancion: fechaFinSancion,
        motivoSancion: this.row.motivoSancion,
        observacionesMunicipales: this.row.observacionesMunicipales
      });
      if (this.accion === 'show') {
        this.contentForm.disable();
      }
    }
  }
  get form() {
    return this.contentForm.controls;
  }

  /**
   * Validators
   */
  identityNumberValidator(control: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.clientsList && this.accion === 'create') {
          const itExist = this.clientsList.some(user => 
            user.numeroDocumento === control.value && user.uuid !== this.contentForm.get('uuid')?.value
          );
          if (itExist) {
            resolve({ itExist: true });
          } else { 
            resolve(null); 
          }
        } else { 
          resolve(null); 
        }
      }, 300);
    });
  }

  emailValidator(control: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.clientsList && this.accion === 'create') {
          const isEmailTaken = this.clientsList.some(user => 
            user.email === control.value && user.uuid !== this.contentForm.get('uuid')?.value
          );
          if (isEmailTaken) {
            resolve({ emailTaken: true });
          } else { 
            resolve(null); 
          }
        } else { 
          resolve(null); 
        }
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



  /**
   * Actions
   */
  async saveData() {
    this.submitted = true;
    if (this.contentForm.invalid) {
      this.notify('Por favor complete todos los campos requeridos correctamente', 'error');
      return;
    }
    if (this.accion === '') {
      this.contentForm.patchValue({
        userName: this.contentForm.value.numeroDocumento,
        password: this.contentForm.value.numeroDocumento,
        cpassword: this.contentForm.value.numeroDocumento
      });
    }
    const formData = this.contentForm.value;
    const datos: Contribuyente = {
      ...formData,
      fechaCreacion: this.row?.fechaCreacion || new Date(),
      fechaActualizacion: new Date(),
      nombreCompleto: `${formData.nombre} ${formData.primerApellido} ${formData.segundoApellido || ''}`.trim(),
      puedeReservarGratis: formData.esDeportistaElite || formData.perteneceEscuelaMunicipal,
      estaActivo: formData.estadoUsuario === 'Activo' && !formData.estaSancionado
    };
    try {
      if (this.contentForm.get('uuid')?.value) {
          datos.uuid=this.contentForm.value.uuid,
          this.updateData(datos);
      } else {
        datos.verificationCode= this.generateCode()
        const ruatResp = await this.registerContribuyente(datos)
        if (ruatResp /* && ruatResp.continuarFlujo */) {
          datos.codigoContribuyente = ruatResp.codigoContribuyente;
          datos.verificadoRuat = true;
          datos.fechaVerificacionRuat = new Date();
          datos.estadoUsuario = 'Activo';          
          const savedContribuyente = await this.addData(datos);
          if (savedContribuyente) {
            await this.sendEmail(savedContribuyente, datos.userName, datos.password);
            this.notify('Contribuyente registrado exitosamente!', 'success');
            this.closeModal();
            this.emitList.emit();
          }else{
              this.notify('No se pudo registrar al Contribuyente', 'error');
          }
        } else {
          this.notify(ruatResp?.mensaje || 'No se pudo registrar en RUAT', 'error');
        }
      }
    } catch (error) {
      this.notify('Error al procesar la solicitud', 'error');
    }
  }
  private sendEmail(userData: any, username: string, password: string): Promise<void> {
    const email = userData.email;
    const name = userData.nombre;
    return emailjs.send("service_auth", "template_6htavso", {
      from_name: "GAMQ-DEPORTES",
      to_name: name,
      message: `USUARIO: ${username}, CONTRASEÑA: ${password}`,
      reply_to: email,
    }, 'X9362U1QpUzthcHGT')
      .then((response: EmailJSResponseStatus) => {
        this.notify("Un email fue enviado a " + email + " con su USUARIO y CONTRASEÑA ", 'success');
      })
      .catch((error) => {
        this.notify("No se pudo enviar el email con las credenciales", 'warning');
      });
  }

  blockUser(){
    const datos ={
      ...this.row
    }
    datos.estadoUsuario='Bloqueado';

    this.updateData(datos);
  }
    /**
   * API Requests
   */
  private addData(datos: Contribuyente): Promise<any> {
    return new Promise((resolve, reject) => {
      this.contribuyentesService.save(datos).subscribe({
        next: (data: any) => {
          this.submitted = false;
          if (data['status'] === 'OK') {
            resolve(data.payload);
          } else {
            this.notify(data.payload, 'error');
            resolve(null);
          }
        },
        error: (error) => {
          this.submitted = false;
          reject(error);
          this.notify('No se pudo guardar los datos! ' + error, 'error');
        }
      });
    });
  }
  private updateData(datos: Contribuyente): Promise<any> {
    return new Promise((resolve, reject) => {
      this.contribuyentesService.update(datos).subscribe({
        next: (data: any) => {
          this.submitted = false;
          this.notify('Datos actualizados exitosamente!', 'success');
          this.closeModal();
          this.emitList.emit();
          resolve(data);
        },
        error: (error) => {
          this.notify('No se pudo actualizar los datos! ' + error, 'error');
          reject(error);
        }
      });
    });
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
          reject(error);
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

  getDepartmentName(id: string|undefined): string |undefined{
    const found = this.cityAcronym.find(item => '' + item.id === id);
    return found ? found.value : id;
  }
  getCivilStatus(acronym: string|undefined): string|undefined {
    const found = this.civilStatus.find(item => item.type === acronym);
    return found ? found.description : acronym;
  }
  getGenderText(genero: string): string {
    return genero === 'F' ? 'FEMENINO' : genero === 'M' ? 'MASCULINO' : 'NO ESPECIFICADO';
  }
  getTipoContribuyenteText(tipo: string): string {
    return tipo === 'NA' ? 'CONTRIBUYENTE NATURAL' : 'CONTRIBUYENTE JURÍDICO';
  }
  generateCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
  // Toggle methods for password fields
  togglePasswordField() {
    this.passwordField = !this.passwordField;
  }
  toggleConfirmField() {
    this.confirmField = !this.confirmField;
  }
  toggleSancion() {
    const sancionado = !this.contentForm.get('estaSancionado')?.value;
    this.contentForm.patchValue({
      estaSancionado: sancionado,
      fechaFinSancion: sancionado ? this.today : '',
      motivoSancion: sancionado ? this.contentForm.get('motivoSancion')?.value : ''
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
