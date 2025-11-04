import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup, ValidationErrors, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';
import emailjs, { EmailJSResponseStatus } from 'emailjs-com';

import { CityAcronym } from 'src/app/core/constants/Places';
import { UserStatus, UserCivilStatus, UserDocType, UserGender } from 'src/app/core/constants/UserData';
import { MustMatch } from 'src/app/account/auth/pass-create/must-match';
import { Contribuyente } from 'src/app/core/models/contribuyente.models';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { RuatRequestsService } from 'src/app/core/services/ruat/ruatRequest.service';
import { EstadoUsuario, EstadoRuat } from 'src/app/core/constants/Estados';
import { environment } from 'src/environments/environment';
import { ConfiguracionSistemaService } from 'src/app/core/services/api/configuracionSistema.service';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent {
  @Input() accion!: string; // '', 'edit', 'show', 'block', 'unblock', 'sanction'
  @Input() row!: Contribuyente;
  @Input() clientsList: Contribuyente[] = [];
  @Input() userPermissions: string[] = [];
  @Output() emitList = new EventEmitter();

  systemConfigList: ConfiguracionSistema[] = [];
  civilStatus = UserCivilStatus;
  identityTypes = UserDocType;
  cityAcronym = CityAcronym;
  userStatus = UserStatus;
  userSex = UserGender;

  editForm!: UntypedFormGroup;
  sanctionForm!: UntypedFormGroup;
  searchRuatForm!: UntypedFormGroup;
  verificationForm!: UntypedFormGroup;
  
  submitted = false;
  searchingRuat = false;
  ruatDataFound: any = null;
  showRuatSearch = false;
  showVerificationCode = false;
  verificationCodeSent = false;
  
  passwordField!: boolean;
  confirmField!: boolean;
  today = new Date().toISOString().split('T')[0];
  canSanction = false;

  constructor(
    private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private contribuyentesService: ContribuyentesService,
    private ruatService: RuatRequestsService,
    private systemConfigsService: ConfiguracionSistemaService
  ) {}

  ngOnInit(): void {
    this.getConfigsSystem();
    this.canSanction = this.userPermissions.includes('SANCIONAR');
    this.initForms();
    this.formDataSet();
    if (this.accion === 'show') {
      setTimeout(() => {
        document.getElementById('form-event')?.classList.add('view-event');
      }, 100);
    }
    if (this.accion === '') {
      this.showRuatSearch = true;
    }
  }

  private initForms() {
    this.searchRuatForm = this.formBuilder.group({
      tipoDocumento: ['CI', [Validators.required]],
      numeroDocumento: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(20)]],
      expedido: ['', [Validators.required]]
    });
    
    this.editForm = this.formBuilder.group({
      uuid: [''],
      userName: ['', [Validators.required, Validators.minLength(6), this.usernameFormatValidator]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      cpassword: ['', [Validators.required]],
      estadoUsuario: [EstadoUsuario.PENDIENTE_VERIFICACION],
      verificationCode: [null],
      
      tipoContribuyente: ['NA', [Validators.required]],
      codigoContribuyente: [''],
      
      nombre: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(250)]],
      primerApellido: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      segundoApellido: ['', [Validators.minLength(1), Validators.maxLength(100)]],
      apellidoEsposo: [''],
      estadoCivil: [''],
      fechaNacimiento: ['', [Validators.required]],
      genero: [''],
      
      tipoDocumento: ['CI', [Validators.required]],
      numeroDocumento: ['', [Validators.required], [this.identityNumberValidator.bind(this)]],
      expedido: ['', [Validators.required]],
      nroNit: ['', [Validators.maxLength(20)]],
      
      telefono: ['', [Validators.required, Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)], [this.emailValidator.bind(this)]],
      direccion: ['', [Validators.maxLength(250)]],
      
      estadoRuat: [EstadoRuat.ACTIVO],
      verificadoRuat: [false],
      fechaVerificacionRuat: [''],
      
      esDeportistaElite: [false],
      perteneceEscuelaMunicipal: [false],
      registroUnicoDeportivo: ['', [Validators.maxLength(50)]],
      puedeReservarGratis: [false],
      fechaUltimoUsoGratuito: [''],
      descuentoAplicable: [0, [Validators.min(0), Validators.max(100)]],
      
      observacionesMunicipales: ['', [Validators.maxLength(1000)]]
    }, {
      validator: MustMatch('password', 'cpassword')
    });
    
    // Sanction Form (only for sanction actions)
    this.sanctionForm = this.formBuilder.group({
      uuid: [''],
      estaSancionado: [true],
      fechaFinSancion: ['', [Validators.required]],
      motivoSancion: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]]
    });
    
    // Verification Form
    this.verificationForm = this.formBuilder.group({
      code: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(4)]]
    });
  }

  private formDataSet() {
    if (this.accion !== '' && this.row) {
      const fechaNacimiento = this.row.fechaNacimiento ? 
        new Date(this.row.fechaNacimiento).toISOString().split('T')[0] : '';      
      const fechaVerificacionRuat = this.row.fechaVerificacionRuat ?
        new Date(this.row.fechaVerificacionRuat).toISOString().split('T')[0] : '';

      // Set edit form data
      this.editForm.patchValue({
        uuid: this.row.uuid,
        userName: this.row.userName,
        password: this.row.password,
        coassword: this.row.password,
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
        estadoRuat: this.row.estadoRuat,
        verificadoRuat: this.row.verificadoRuat,
        fechaVerificacionRuat: fechaVerificacionRuat,
        esDeportistaElite: this.row.esDeportistaElite,
        perteneceEscuelaMunicipal: this.row.perteneceEscuelaMunicipal,
        registroUnicoDeportivo: this.row.registroUnicoDeportivo,
        puedeReservarGratis: this.row.puedeReservarGratis,
        descuentoAplicable: this.row.descuentoAplicable,
        observacionesMunicipales: this.row.observacionesMunicipales
      });

      // Set sanction form data
      const fechaFinSancion = this.row.fechaFinSancion ? 
        new Date(this.row.fechaFinSancion).toISOString().split('T')[0] : '';
      
      this.sanctionForm.patchValue({
        uuid: this.row.uuid,
        estaSancionado: this.row.estaSancionado,
        fechaFinSancion: fechaFinSancion,
        motivoSancion: this.row.motivoSancion
      });

      if (this.accion === 'show') {
        this.editForm.disable();
      }
      
      // En modo edición, deshabilitar campos verificados por RUAT
      if (this.row.verificadoRuat && this.accion === 'edit') {
        this.disableRuatVerifiedFields();
      }
    }
  }

  private disableRuatVerifiedFields() {
    this.editForm.get('nombre')?.disable();
    this.editForm.get('primerApellido')?.disable();
    this.editForm.get('segundoApellido')?.disable();
    this.editForm.get('fechaNacimiento')?.disable();
    this.editForm.get('genero')?.disable();
    this.editForm.get('estadoCivil')?.disable();
    this.editForm.get('tipoDocumento')?.disable();
    this.editForm.get('numeroDocumento')?.disable();
    this.editForm.get('expedido')?.disable();
  }

  // Form getters for template
  get form() { return this.editForm.controls; }
  get sanction() { return this.sanctionForm.controls; }
  get searchForm() { return this.searchRuatForm.controls; }

  /**
   * BÚSQUEDA RUAT (Solo para creación)
   */
  async searchInRuat() {
    if (this.searchRuatForm.invalid) {
      this.notify('Complete todos los campos de búsqueda', 'warning');
      return;
    }
    
    this.searchingRuat = true;
    try {
      
      const codigoAlcaldia = this.systemConfigList.find(config => config.clave === 'CODIGO_ALCALDIA_RUAT')?.valorTexto || '';
      const ruatResp = await this.searchContribuyenteInRuat(codigoAlcaldia,this.searchRuatForm.value);
      
      if (ruatResp && ruatResp.continuarFlujo) {
        this.ruatDataFound = ruatResp;
        this.fillFormFromRuat(ruatResp);
        this.notify('Datos encontrados en RUAT', 'success');
        this.showRuatSearch = false;
      } else {
        this.notify(ruatResp?.mensaje || 'No se encontraron datos en RUAT. Puede continuar con registro manual', 'info');
        this.fillFormManually();
        this.showRuatSearch = false;
      }
    } catch (error) {
      this.notify('Error al consultar RUAT. Puede continuar con registro manual', 'warning');
      this.fillFormManually();
      this.showRuatSearch = false;
    } finally {
      this.searchingRuat = false;
    }
  }

  private fillFormFromRuat(ruatData: any) {
    const client = ruatData.contribuyente;
    let fechaNacimientoValue = '';
    
    if (client.fechaNacimiento && client.fechaNacimiento.includes('/')) {
      const [day, month, year] = client.fechaNacimiento.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      fechaNacimientoValue = date.toISOString().split('T')[0];
    }

    this.editForm.patchValue({
      codigoContribuyente: ruatData.codigoContribuyente,
      estadoRuat: EstadoRuat.ACTIVO,
      verificadoRuat: true,
      fechaVerificacionRuat: new Date().toISOString().split('T')[0],
      estadoUsuario: EstadoUsuario.ACTIVO,
      
      nombre: client.nombre,
      primerApellido: client.primerApellido,
      segundoApellido: client.segundoApellido,
      fechaNacimiento: fechaNacimientoValue,
      genero: this.getUserGender(client.genero),
      estadoCivil: this.getCivilStatusCode(client.estadoCivil),
      
      tipoDocumento: client.tipoDocumento,
      numeroDocumento: client.numeroDocumento,
      expedido: client.expedido,
      
      userName: client.numeroDocumento,
      password: client.numeroDocumento,
      cpassword: client.numeroDocumento
    });

    this.disableRuatVerifiedFields();
  }

  private fillFormManually() {
    this.editForm.patchValue({
      tipoDocumento: this.searchRuatForm.value.tipoDocumento,
      numeroDocumento: this.searchRuatForm.value.numeroDocumento,
      expedido: this.searchRuatForm.value.expedido,
      
      userName: this.searchRuatForm.value.numeroDocumento,
      password: this.searchRuatForm.value.numeroDocumento,
      cpassword: this.searchRuatForm.value.numeroDocumento,
      
      verificadoRuat: false,
      estadoRuat: EstadoRuat.ACTIVO,
      estadoUsuario: EstadoUsuario.PENDIENTE_VERIFICACION
    });
  }

  skipRuatSearch() {
    this.showRuatSearch = false;
    this.editForm.patchValue({
      verificadoRuat: false,
      estadoRuat: EstadoRuat.ACTIVO,
      estadoUsuario: EstadoUsuario.PENDIENTE_VERIFICACION
    });
  }

  /**
   * VERIFICACIÓN DE EMAIL
   */
  async sendVerificationEmail() {
    const email = this.editForm.get('email')?.value;
    if (!email) {
      this.notify('Debe ingresar un email válido', 'warning');
      return;
    }

    const code = this.generateCode();
    this.editForm.patchValue({ verificationCode: code });

    try {
      await this.sendEmailCode(email, code);
      this.verificationCodeSent = true;
      this.showVerificationCode = true;
      this.notify('Código de verificación enviado al email', 'success');
    } catch (error) {
      this.notify('Error al enviar el código de verificación', 'error');
    }
  }

  verifyEmailCode() {
    const enteredCode = this.verificationForm.get('code')?.value;
    const storedCode = this.editForm.get('verificationCode')?.value;

    if (enteredCode === storedCode) {
      const isVerifiedRuat = this.editForm.get('verificadoRuat')?.value;
      const newStatus = isVerifiedRuat ? EstadoUsuario.ACTIVO : EstadoUsuario.PENDIENTE_VERIFICACION;
      
      this.editForm.patchValue({
        estadoUsuario: newStatus
      });
      
      this.showVerificationCode = false;
      this.verificationForm.reset();
      
      if (isVerifiedRuat) {
        this.notify('Email verificado correctamente. Usuario ACTIVO', 'success');
      } else {
        this.notify('Email verificado. Pendiente verificación RUAT', 'info');
      }
    } else {
      this.notify('Código incorrecto', 'error');
      this.verificationForm.patchValue({ code: '' });
    }
  }

  /**
   * VERIFICACIÓN RUAT (para usuarios existentes en modo edición)
   */
  async verifyInRuat() {
    this.submitted = true;
    const formData = this.editForm.getRawValue();
    const ruatData = { ...formData };
    if (ruatData.fechaNacimiento) {
      const date = new Date(ruatData.fechaNacimiento);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      ruatData.fechaNacimiento = `${day}/${month}/${year}`;
    }

    try {
      const codigoAlcaldia = this.systemConfigList.find(config => config.clave === 'CODIGO_ALCALDIA_RUAT')?.valorTexto || '';
      const codigoUsuario = this.systemConfigList.find(config => config.clave === 'CODIGO_USUARIO_RUAT')?.valorTexto || '';
      const ruatResp = await this.registerContribuyente(codigoAlcaldia,codigoUsuario,ruatData);
      
      if (ruatResp && ruatResp.continuarFlujo) {
        let nuevoEstado = this.editForm.get('estadoUsuario')?.value;
        
        if (nuevoEstado === EstadoUsuario.PENDIENTE_VERIFICACION) {
          nuevoEstado = EstadoUsuario.ACTIVO;
        }        
        this.editForm.patchValue({
          codigoContribuyente: ruatResp.codigoContribuyente,
          verificadoRuat: true,
          estadoRuat: EstadoRuat.ACTIVO,
          fechaVerificacionRuat: new Date(),
          estadoUsuario: nuevoEstado
        });
        
        await this.updateData(this.editForm.getRawValue());
        this.notify('Verificación RUAT exitosa', 'success');
      } else {
        this.notify(ruatResp?.mensaje || 'No se pudo verificar en RUAT', 'error');
      }
    } catch (error) {
      this.notify('Error al verificar en RUAT', 'error');
    } finally {
      this.submitted = false;
    }
  }

  /**
   * ACCIONES PRINCIPALES - EDIT
   */
  async saveData() {
    this.submitted = true;
    this.editForm.enable();
    const formData = this.editForm.getRawValue();
    const userName= formData.userName.trim() ?? formData.numberoDocumento.trim();
    const password= formData.password.trim() ?? formData.numberoDocumento.trim();
    this.editForm.patchValue({userName, password,cpassword: password});
    if (this.accion === '') {
      if (!this.verificationCodeSent) {
        this.notify('Debe verificar el email antes de guardar', 'warning');
        this.submitted = false;
        return;
      }      
      if (this.showVerificationCode) {
        this.notify('Debe completar la verificación del email', 'warning');
        this.submitted = false;
        return;
      }
    }
    await this.waitForAsyncValidation(this.editForm);

    if (this.editForm.invalid) {
      this.markAllFieldsAsTouched(this.editForm);
      const invalidFields = this.getInvalidFields();      
      let errorMessage = 'Por favor complete los siguientes campos requeridos:';
      invalidFields.forEach(field => {
        errorMessage += `\n• ${this.getFieldDisplayName(field)}`;
      });      
      this.notify(errorMessage, 'error');
      this.submitted = false;
      return;
    }
    let estadoFinal = formData.estadoUsuario;
    if (this.accion === '' ) {
      if (formData.verificadoRuat && this.verificationCodeSent) {
        estadoFinal = EstadoUsuario.ACTIVO;
      } else {
        estadoFinal = EstadoUsuario.PENDIENTE_VERIFICACION;
      }
    }
    const datos: Contribuyente = {
      ...formData,
      estadoUsuario: estadoFinal,
      fechaCreacion: this.row?.fechaCreacion || new Date(),
      fechaActualizacion: new Date(),
      nombreCompleto: `${formData.nombre} ${formData.primerApellido} ${formData.segundoApellido || ''}`.trim(),
      puedeReservarGratis: formData.esDeportistaElite || formData.perteneceEscuelaMunicipal,
      
      estaSancionado: this.row?.estaSancionado || false,
      fechaFinSancion: this.row?.fechaFinSancion,
      motivoSancion: this.row?.motivoSancion
    };

    try {
      if (this.editForm.get('uuid')?.value) {
        datos.uuid = this.editForm.value.uuid;
        await this.updateData(datos);
      } else {
        if (!datos.verificadoRuat && this.ruatDataFound) {
          datos.codigoContribuyente = this.ruatDataFound.codigoContribuyente;
          datos.verificadoRuat = true;
          datos.estadoRuat = EstadoRuat.ACTIVO;
          datos.fechaVerificacionRuat = new Date();
        }

        const savedContribuyente = await this.addData(datos);
        if (savedContribuyente) {
          await this.sendCredentialsEmail(savedContribuyente, datos.userName, datos.password);
          this.notify('Contribuyente registrado exitosamente!', 'success');
          this.closeModal();
          this.emitList.emit();
        } else {
          this.notify('No se pudo registrar al Contribuyente', 'error');
        }
      }
    } catch (error) {
      this.notify('Error al procesar la solicitud', 'error');
    } finally {
      this.submitted = false;
    }
  }
  
private getInvalidFields(): string[] {
  const invalidFields: string[] = [];
  Object.keys(this.editForm.controls).forEach(key => {
    const control = this.editForm.get(key);
    if (control?.invalid) {
      invalidFields.push(key);
    }
  });
  return invalidFields;
}

private getFieldDisplayName(fieldName: string): string {
  const fieldNames: { [key: string]: string } = {
    'tipoContribuyente': 'Tipo de Contribuyente',
    'tipoDocumento': 'Tipo de Documento',
    'numeroDocumento': 'Número de Documento',
    'expedido': 'Expedido',
    'nombre': 'Nombre',
    'primerApellido': 'Primer Apellido',
    'fechaNacimiento': 'Fecha de Nacimiento',
    'telefono': 'Teléfono',
    'email': 'Email',
    'userName': 'Usuario',
    'password': 'Contraseña',
    'cpassword': 'Confirmar Contraseña'
  };
  
  return fieldNames[fieldName] || fieldName;
}
  /**
   * ACCIONES DE SANCIÓN - ACTUALIZADO
   */
  async applySanction() {
    this.submitted = true;
    const sanctionData = this.sanctionForm.getRawValue();

    await this.waitForAsyncValidation(this.sanctionForm);
    if (this.sanctionForm.invalid) {
      this.notify('Por favor complete todos los campos de sanción', 'error');
      this.submitted = false;
      this.markAllFieldsAsTouched(this.sanctionForm);
      return;
    }
    const fechaFinSancion = sanctionData.fechaFinSancion ? 
      new Date(sanctionData.fechaFinSancion + 'T23:59:59') : undefined;
    const datos: Contribuyente = { 
      ...this.row,
      userName: this.row.userName,
      password: this.row.password,
      // cpassword: this.row.password,
      estaSancionado: true,
      estadoUsuario: EstadoUsuario.SANCIONADO,
      fechaActualizacion: new Date(),
      fechaFinSancion: fechaFinSancion,
      motivoSancion: sanctionData.motivoSancion
    };

    try {
      await this.updateData(datos);
      this.notify('Sanción aplicada correctamente', 'success');
      this.closeModal();
      this.emitList.emit();
    } catch (error) {
      console.error('Error al aplicar sanción:', error);
      this.notify('Error al aplicar la sanción: ' + error, 'error');
    } finally {
      this.submitted = false;
    }
  }
  async removeSanction() {
    const result = await Swal.fire({
      title: '¿Levantar Sanción?',
      html: `
        <div class="text-start">
          <p><strong>Contribuyente:</strong> ${this.row.nombreCompleto}</p>
          <p><strong>Motivo actual:</strong> ${this.row.motivoSancion}</p>
          <p><strong>Fecha fin:</strong> ${this.row?.fechaFinSancion}</p>
          <hr>
          <p class="text-muted">
            <i class="ri-information-line"></i> 
            El usuario quedará en estado: 
            <strong>${this.row.verificadoRuat ? 'ACTIVO' : 'PENDIENTE VERIFICACIÓN'}</strong>
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0ab39c',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="ri-check-line me-1"></i> Sí, Levantar',
      cancelButtonText: '<i class="ri-close-line me-1"></i> Cancelar'
    });
    if (!result.isConfirmed) {
      return;
    }
    this.submitted = true;    
    try {
      let nuevoEstado = EstadoUsuario.ACTIVO;
      if (!this.row.verificadoRuat) {
        nuevoEstado = EstadoUsuario.PENDIENTE_VERIFICACION;
      }
      if (this.row.estadoUsuario === EstadoUsuario.BLOQUEADO) {
        nuevoEstado = EstadoUsuario.BLOQUEADO;
      }

      const datos: Contribuyente = { 
        ...this.row,
        userName: this.row.userName,
        password: this.row.password,
        // cpassword: this.row.password,
        estaSancionado: false,
        fechaFinSancion: undefined,
        motivoSancion: '',
        estadoUsuario: nuevoEstado,
        fechaActualizacion: new Date()
      };
      
      await this.updateData(datos);
      
      // Mensaje personalizado según el nuevo estado
      let mensaje = 'Sanción levantada correctamente';
      let icon: any = 'success';
      
      if (nuevoEstado === EstadoUsuario.PENDIENTE_VERIFICACION) {
        mensaje += '<br><small class="text-muted">El usuario debe completar verificación RUAT</small>';
        icon = 'info';
      } else if (nuevoEstado === EstadoUsuario.BLOQUEADO) {
        mensaje += '<br><small class="text-muted">El usuario permanece bloqueado</small>';
        icon = 'warning';
      } else {
        mensaje += '<br><small class="text-success">Usuario ACTIVO</small>';
      }
      
      await Swal.fire({
        title: 'Sanción Levantada',
        html: mensaje,
        icon: icon,
        confirmButtonColor: '#0ab39c'
      });
      
      this.closeModal();
      this.emitList.emit();
    } catch (error) {
      console.error('Error al levantar sanción:', error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudo levantar la sanción. Por favor, intente nuevamente.',
        icon: 'error',
        confirmButtonColor: '#f06548'
      });
    } finally {
      this.submitted = false;
    }
  }
  async removeSanctionDirect() {
    this.submitted = true;    
    try {
      let nuevoEstado = EstadoUsuario.ACTIVO;      
      if (!this.row.verificadoRuat) {
        nuevoEstado = EstadoUsuario.PENDIENTE_VERIFICACION;
      }      
      if (this.row.estadoUsuario === EstadoUsuario.BLOQUEADO) {
        nuevoEstado = EstadoUsuario.BLOQUEADO;
      }
      const datos: Contribuyente = { 
        ...this.row,
        userName: this.row.userName,
        password: this.row.password,
        // cpassword: this.row.password,
        estaSancionado: false,
        fechaFinSancion: undefined,
        motivoSancion: '',
        estadoUsuario: nuevoEstado,
        fechaActualizacion: new Date()
      };      
      await this.updateData(datos);      
      let mensaje = 'Sanción levantada correctamente';
      if (nuevoEstado === EstadoUsuario.PENDIENTE_VERIFICACION) {
        mensaje += '. El usuario debe completar verificación RUAT';
      } else if (nuevoEstado === EstadoUsuario.BLOQUEADO) {
        mensaje += '. El usuario permanece bloqueado';
      } else {
        mensaje += '. Usuario ACTIVO';
      }
      
      this.notify(mensaje, 'success');
      this.closeModal();
      this.emitList.emit();
    } catch (error) {
      console.error('Error al levantar sanción:', error);
      this.notify('Error al levantar la sanción: ' + error, 'error');
    } finally {
      this.submitted = false;
    }
  }

  /**
   * ACCIONES DE ESTADO
   */
  async blockUser() {
    const datos = { ...this.row };
    datos.estadoUsuario = EstadoUsuario.BLOQUEADO;
    datos.fechaActualizacion = new Date();
    await this.updateData(datos);
  }

  async unblockUser() {
    const datos = { ...this.row };
    if (datos.estaSancionado) {
      datos.estadoUsuario = EstadoUsuario.SANCIONADO;
    } else if (!datos.verificadoRuat) {
      datos.estadoUsuario = EstadoUsuario.PENDIENTE_VERIFICACION;
    } else {
      datos.estadoUsuario = EstadoUsuario.ACTIVO;
    }
    datos.fechaActualizacion = new Date();
    await this.updateData(datos);
  }

  async inactivateUser() {
    const datos = { ...this.row };
    datos.estadoUsuario = EstadoUsuario.INACTIVO;
    datos.fechaActualizacion = new Date();
    await this.updateData(datos);
  }

  async activateUser() {
    const datos = { ...this.row };
    if (!datos.verificadoRuat) {
      this.notify('No se puede activar. El usuario debe estar verificado en RUAT', 'warning');
      return;
    }
    
    if (datos.estaSancionado) {
      this.notify('No se puede activar. El usuario tiene una sanción activa', 'warning');
      return;
    }
    
    datos.estadoUsuario = EstadoUsuario.ACTIVO;
    datos.fechaActualizacion = new Date();
    await this.updateData(datos);
  }

  /**
   * Validators
   */
  identityNumberValidator(control: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.clientsList && (this.accion === '' )) {
          const itExist = this.clientsList.some(user => 
            user.numeroDocumento === control.value && user.uuid !== this.editForm.get('uuid')?.value
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
        if (this.clientsList && (this.accion === '' )) {
          const isEmailTaken = this.clientsList.some(user => 
            user.email === control.value && user.uuid !== this.editForm.get('uuid')?.value
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
    if (!value) return null;
    
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

  private async waitForAsyncValidation(form: UntypedFormGroup): Promise<void> {
    return new Promise((resolve) => {
      if (form.pending) {
        const subscription = form.statusChanges.subscribe(status => {
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

  private markAllFieldsAsTouched(form: UntypedFormGroup) {
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * API Requests
   */
  private getConfigsSystem() {
    this.systemConfigsService.getAll().subscribe({
      next: (data: any) => {
          if (data['status'] === 'OK') {
            this.systemConfigList = data.payload;
          }
        }
      });
  }
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
          this.submitted = false;
          this.notify('No se pudo actualizar los datos! ' + error, 'error');
          reject(error);
        }
      });
    });
  }

  deleteData(uuid: string) {
    this.contribuyentesService.delete(uuid).subscribe({
      next: (data: any) => {
        this.submitted = false;
        if (data.status == 'OK') {
          this.closeModal();
          this.emitList.emit();
          this.notify(data.payload, 'info');
        }
      },
      error: err => {
        this.submitted = false;
        this.notify('No se pudo eliminar el registro!', 'error');
      }
    });
  }

  private async registerContribuyente(codigoAlcaldia:string,codigoUsuario:string,data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.ruatService.registerContribuyente(codigoAlcaldia,codigoUsuario,data).subscribe({
        next: (resp: any) => {
          if (resp['status'] === 'OK') {
            const response = resp.payload;
            resolve(response);
          } else {
            this.notify(resp.payload, 'error');
            resolve(null);
          }
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  private async searchContribuyenteInRuat(codigoAlcaldia:string,data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.ruatService.getContribuyentePorCi(
        codigoAlcaldia,
        data.numeroDocumento,
        data.tipoDocumento, 
        data.expedido
      ).subscribe({ 
        next: (resp: any) => {
          if (resp['status'] === 'OK') {
            resolve(resp.payload);
          } else {
            resolve(null);
          }
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  /**
   * Email Functions
   */
  private sendCredentialsEmail(userData: any, username: string, password: string): Promise<void> {
    const email = userData.email;
    const name = userData.nombre;
    
    return emailjs.send(
      environment.EmailJS.idService,
      environment.EmailJS.idTemplate,
      {
        from_name: "GAMQ-DEPORTES",
        to_name: name,
        message: `USUARIO: ${username}, CONTRASEÑA: ${password}`,
        reply_to: email,
      },
      environment.EmailJS.publicKey
    ).then((response: EmailJSResponseStatus) => {
      this.notify("Un email fue enviado a " + email + " con su USUARIO y CONTRASEÑA", 'success');
    }).catch((error) => {
      this.notify("No se pudo enviar el email con las credenciales", 'warning');
    });
  }

  private sendEmailCode(email: string, code: string): Promise<void> {
    return emailjs.send(
      environment.EmailJS.idService,
      environment.EmailJS.idTemplate,
      {
        from_name: "GAMQ-DEPORTES",
        to_name: this.editForm.get('nombre')?.value || 'Usuario',
        message: `Su código de verificación es: ${code}`,
        reply_to: email,
      },
      environment.EmailJS.publicKey
    ).then(() => {
      // Success handled in calling function
    }).catch((error) => {
      throw error;
    });
  }

  /**
   * Helper Functions
   */
  generateCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  getDepartmentName(id: string | undefined): string | undefined {
    const found = this.cityAcronym.find(item => '' + item.id === id);
    return found ? found.value : id;
  }

  getCivilStatus(acronym: string | undefined): string | undefined {
    const found = this.civilStatus.find(item => item.type === acronym);
    return found ? found.description : acronym;
  }

  getCivilStatusCode(description: string): string {
    const found = this.civilStatus.find(item => item.description === description);
    return found ? found.type : '';
  }

  getUserGender(description: string): string {
    const found = this.userSex.find(item => item.description === description);
    return found ? found.id : '';
  }

  getGenderText(genero: string | undefined): string {
    return genero === 'F' ? 'FEMENINO' : genero === 'M' ? 'MASCULINO' : 'NO ESPECIFICADO';
  }

  getTipoContribuyenteText(tipo: string): string {
    return tipo === 'NA' ? 'CONTRIBUYENTE NATURAL' : 'CONTRIBUYENTE JURÍDICO';
  }

  getEstadoUsuarioText(estado: string): string {
    switch (estado) {
      case EstadoUsuario.ACTIVO: 
        return 'ACTIVO';
      case EstadoUsuario.INACTIVO: 
        return 'INACTIVO';
      case EstadoUsuario.PENDIENTE_VERIFICACION: 
        return 'PENDIENTE VERIFICACIÓN';
      case EstadoUsuario.SANCIONADO: 
        return 'SANCIONADO';
      case EstadoUsuario.BLOQUEADO: 
        return 'BLOQUEADO';
      default: 
        return estado;
    }
  }

  getEstadoUsuarioDescription(estado: string): string {
    switch (estado) {
      case EstadoUsuario.PENDIENTE_VERIFICACION:
        return 'Registro en RUAT no verificado';
      case EstadoUsuario.ACTIVO:
        return 'Usuario habilitado en RUAT y sistema';
      case EstadoUsuario.INACTIVO:
        return 'Usuario deshabilitado, no podrá reservar ni acceder';
      case EstadoUsuario.SANCIONADO:
        return 'Tiene sanción activa';
      case EstadoUsuario.BLOQUEADO:
        return 'Bloqueado por infracciones o razón administrativa';
      default:
        return '';
    }
  }

  canUserReserve(contribuyente: Contribuyente): boolean {
    return contribuyente.estadoUsuario === EstadoUsuario.ACTIVO;
  }

  canUserAccess(contribuyente: Contribuyente): boolean {
    return contribuyente.estadoUsuario === EstadoUsuario.ACTIVO;
  }

  togglePasswordField() {
    this.passwordField = !this.passwordField;
  }

  toggleConfirmField() {
    this.confirmField = !this.confirmField;
  }

  // toggleSancion() {
  //   const sancionado = !this.contentForm.get('estaSancionado')?.value;
  //   this.contentForm.patchValue({
  //     estaSancionado: sancionado,
  //     fechaFinSancion: sancionado ? this.today : '',
  //     motivoSancion: sancionado ? this.contentForm.get('motivoSancion')?.value : ''
  //   });
  // }

  
  public closeModal() {
    this.editForm.enable();
    this.sanctionForm.reset();
    this.modalService.dismissAll();
    this.editForm.reset();
    this.searchRuatForm.reset();
    this.verificationForm.reset();
    this.showRuatSearch = false;
    this.showVerificationCode = false;
    this.verificationCodeSent = false;
    this.ruatDataFound = null;
  }

  private notify(message: any, type: any): void {
    let timerInterval: any;
    Swal.fire({
      text: message,
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
}