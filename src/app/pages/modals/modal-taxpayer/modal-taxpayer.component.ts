import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  UntypedFormBuilder,
  UntypedFormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { NgbDatepickerModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import Swal from 'sweetalert2';
import emailjs from 'emailjs-com';
import { Observable } from 'rxjs';

import { CityAcronym } from 'src/app/core/constants/Places';
import { UserStatus, UserCivilStatus, UserDocType, UserGender } from 'src/app/core/constants/UserData';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { RuatRequestsService } from 'src/app/core/services/ruatRequest.service';
import { EstadoUsuario, EstadoRuat } from 'src/app/core/constants/Estados';
import { environment } from 'src/environments/environment';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { OrganizacionService } from 'src/app/core/services/api/organizacion.service';
import { EstudianteEscuelaService } from 'src/app/core/services/api/estudianteEscuela.service';
import { Organizacion } from 'src/app/core/models/organizacion.model';
import { EstudianteEscuela } from 'src/app/core/models/EstudianteEscuela.model';
import { TipoOrganizacion } from 'src/app/core/constants/Features';
import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';
import { MustMatch } from 'src/app/public/account/auth/pass-create/must-match';

@Component({
  selector: 'app-modal-taxpayer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbDatepickerModule,
    TranslateModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './modal-taxpayer.component.html',
  styleUrls: ['./modal-taxpayer.component.scss'],
})
export class ModalTaxpayerComponent implements OnInit {
  @Input() accion!: string;
  @Input() row!: Contribuyente;
  @Input() clientsList: Contribuyente[] = [];
  @Input() userPermissions: string[] = [];
  @Output() emitList = new EventEmitter();

  systemConfigList: ConfiguracionSistema[] = [];
  organizationsList: Organizacion[] = [];
  estudiantesList: EstudianteEscuela[] = [];
  estudianteBusqueda = '';

  civilStatus = UserCivilStatus;
  identityTypes = UserDocType;
  cityAcronym = CityAcronym;
  userStatus = UserStatus;
  userSex = UserGender;
  tiposOrganizacion = Object.values(TipoOrganizacion);

  editForm!: UntypedFormGroup;
  sanctionForm!: UntypedFormGroup;
  searchRuatForm!: UntypedFormGroup;
  verificationForm!: UntypedFormGroup;
  estudianteForm!: UntypedFormGroup;
  organizacionForm!: UntypedFormGroup;

  submitted = false;
  searchingRuat = false;
  ruatDataFound: any = null;
  showRuatSearch = false;
  showVerificationCode = false;
  verificationCodeSent = false;
  emailVerified = false;
  passwordField = false;
  confirmField = false;
  today = new Date().toISOString().split('T')[0];
  canSanction = false;
  activeTab: 'basic' | 'estudiantes' | 'organizaciones' | 'deportivo' = 'basic';

  estudiantesTemporales: any[] = [];
  editingEstudianteIndex = -1;
  showEstudianteForm = false;

  organizacionesTemporales: any[] = [];
  organizacionBusqueda = '';
  organizacionesVinculadas: import('src/app/core/models/organizacion-representante.model').OrganizacionRepresentante[] = [];

  get organizacionesDisponibles(): Organizacion[] {
    const q = this.organizacionBusqueda.trim().toLocaleLowerCase();
    return this.organizationsList.filter(o => o.activo &&
      !this.organizacionesTemporales.some(x => x.uuid === o.uuid) &&
      `${o.nombre} ${o.codigoEscuela || ''} ${o.disciplina || ''}`.toLocaleLowerCase().includes(q));
  }

  get escuelasDisponiblesParaInscripcion(): Organizacion[] {
    const schools = new Map<string, Organizacion>();
    const currentOrg = this.editingEstudianteIndex >= 0
      ? this.estudiantesTemporales[this.editingEstudianteIndex]?.organizacionDto
      : null;
    [...this.organizacionesTemporales, currentOrg].forEach((org) => {
      if (org?.uuid && org.activo !== false && org.tipoOrganizacion === TipoOrganizacion.ESCUELA_MUNICIPAL) {
        schools.set(org.uuid, org);
      }
    });
    return Array.from(schools.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get estudiantesDisponiblesParaRelacion(): EstudianteEscuela[] {
    const q = this.normalizeText(this.estudianteBusqueda);
    const byStudent = new Map<string, EstudianteEscuela>();
    this.estudiantesList.forEach((student) => {
      const key = student.estudianteUuid || student.uuid;
      if (!key || byStudent.has(key)) return;
      byStudent.set(key, student);
    });
    return Array.from(byStudent.values())
      .filter((student) => !q || [
        student.nombreCompleto,
        student.numeroDocumento,
        student.matricula
      ].some(value => this.normalizeText(value).includes(q)))
      .slice(0, 25);
  }

  vincularOrganizacion(org: Organizacion): void {
    this.organizacionesTemporales.push(org);
    this.organizacionesVinculadas.push({ organizacionDto: org });
    this.organizacionBusqueda = '';
  }

  vinculoOrganizacion(uuid: string): any {
    return this.organizacionesVinculadas.find(v => v.organizacionDto?.uuid === uuid);
  }

  desvincularOrganizacion(index: number): void {
    const org = this.organizacionesTemporales[index];
    this.organizacionesVinculadas = this.organizacionesVinculadas.filter(v => v.organizacionDto?.uuid !== org.uuid);
    this.organizacionesTemporales.splice(index, 1);
  }

  editingOrganizacionIndex = -1;
  showOrganizacionForm = false;

  private originalEmail = '';

  private futureDateValidator = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    return control.value >= this.today ? null : { pastDate: true };
  };

  constructor(
    private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private authService: AuthenticationService,
    private ruatService: RuatRequestsService,
    private contribuyentesService: ContribuyentesService,
    private organizationService: OrganizacionService,
    private estudianteEscuelaService: EstudianteEscuelaService
  ) {}

  ngOnInit(): void {
    this.getConfigsSystem();
    this.getOrganizations();
    this.getStudents();
    this.canSanction = this.userPermissions.includes('SANCIONAR');
    this.initForms();
    this.formDataSet();
    this.initEmailChangeWatcher();
    if (this.accion === 'show') {
      setTimeout(() => document.getElementById('form-event')?.classList.add('view-event'), 100);
    }
    if (this.accion === '') {
      this.showRuatSearch = true;
    }
  }

  private toDateInputValue(dateStr: string | Date | undefined | null): string {
    if (!dateStr) return '';
    const d = new Date(dateStr as string);
    if (isNaN(d.getTime())) return '';
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private formatDateForBackend(dateString: string): string | null {
    if (!dateString) return null;
    return `${dateString}T00:00:00.000Z`;
  }

  private formatDateForRuat(dateString: string): string {
    if (!dateString) return '';
    const d = new Date(dateString);
    return [
      String(d.getUTCDate()).padStart(2, '0'),
      String(d.getUTCMonth() + 1).padStart(2, '0'),
      d.getUTCFullYear(),
    ].join('/');
  }

  private escapeHtml(text: string): string {
    return (text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private initForms(): void {
    this.searchRuatForm = this.formBuilder.group({
      tipoDocumento: ['CI', [Validators.required]],
      numeroDocumento: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(20)]],
      expedido: ['', [Validators.required]],
    });

    const numeroDocumentoControl = this.formBuilder.control('', {
      validators: [Validators.required, Validators.maxLength(20)],
      asyncValidators: [this.identityNumberValidator.bind(this)],
      updateOn: 'blur',
    });
    const emailControl = this.formBuilder.control('', {
      validators: [Validators.required, Validators.email, Validators.maxLength(255)],
      asyncValidators: [this.emailValidator.bind(this)],
      updateOn: 'blur',
    });

    this.editForm = this.formBuilder.group(
      {
        uuid: [null],
        userName: ['', [Validators.required, Validators.minLength(6), this.usernameFormatValidator]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        cpassword: ['', [Validators.required]],
        estadoUsuario: [EstadoUsuario.PENDIENTE_VERIFICACION],
        verificationCode: [null],

        tipoContribuyente: ['NA', [Validators.required]],
        codigoContribuyente: [''],

        nombre: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(250)]],
        primerApellido: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
        segundoApellido: ['', [Validators.maxLength(100)]],
        apellidoEsposo: [''],
        estadoCivil: [''],
        fechaNacimiento: ['', [Validators.required]],
        genero: ['', [Validators.required]],

        tipoDocumento: ['CI', [Validators.required]],
        numeroDocumento: numeroDocumentoControl,
        expedido: ['', [Validators.required]],
        nroNit: ['', [Validators.maxLength(20)]],

        telefono: [
          '',
          [
            Validators.required,
            Validators.minLength(7),
            Validators.maxLength(15),
            Validators.pattern(/^[0-9+\-()\s]+$/),
          ],
        ],
        email: emailControl,
        direccion: ['', [Validators.maxLength(250)]],

        estadoRuat: [EstadoRuat.ACTIVO],
        verificadoRuat: [false],
        fechaVerificacionRuat: [''],

        esDeportistaElite: [false],
        registroUnicoDeportivo: [''],
        puedeReservarGratis: [false],
        fechaUltimoUsoGratuito: [''],

        observacionesMunicipales: ['', [Validators.maxLength(1000)]],
      },
      { validator: MustMatch('password', 'cpassword') }
    );

    this.editForm.get('esDeportistaElite')?.valueChanges.subscribe((value) => {
      if (this.accion === 'show') return;
      const registroControl = this.editForm.get('registroUnicoDeportivo');
      if (value) {
        registroControl?.setValidators([Validators.required, Validators.maxLength(50)]);
      } else {
        registroControl?.setValidators([Validators.maxLength(50)]);
      }
      registroControl?.updateValueAndValidity();
      this.updatePuedeReservarGratis();
    });

    this.estudianteForm = this.formBuilder.group({
      uuid: [null],
      estudianteUuid: [null],
      existingStudentUuid: [''],
      nombreCompleto: ['', [Validators.required, Validators.maxLength(250)]],
      fechaNacimiento: [''],
      genero: [''],
      numeroDocumento: [''],
      telefono: [''],
      email: ['', [Validators.email]],
      matricula: [{ value: '', disabled: true }],
      organizacionUuid: ['', [Validators.required]],
      fechaInscripcion: [new Date().toISOString().split('T')[0], [Validators.required]],
      activo: [true],
    });

    this.organizacionForm = this.formBuilder.group({
      uuid: [null],
      nombre: ['', [Validators.required, Validators.maxLength(250)]],
      tipoOrganizacion: [TipoOrganizacion.ASOCIACION, [Validators.required]],
      personeriaJuridica: [''],
      telefono: [''],
      email: ['', [Validators.email]],
      direccion: [''],
      nroNit: [''],
      entrenador: [''],
      disciplina: [''],
      codigoEscuela: [''],
      requierePagoMensualidad: [false],
      tarifaMensual: [0, [Validators.min(0)]],
      permiteReservasGratuitas: [false],
      activo: [true],
    });

    this.organizacionForm.get('tipoOrganizacion')?.valueChanges.subscribe((tipo) => {
      const esEscuela = tipo === TipoOrganizacion.ESCUELA_MUNICIPAL;
      if (esEscuela) {
        this.organizacionForm.patchValue({ requierePagoMensualidad: true, permiteReservasGratuitas: true });
        this.organizacionForm.get('disciplina')?.setValidators([Validators.required]);
        this.organizacionForm.get('codigoEscuela')?.setValidators([Validators.required]);
      } else {
        this.organizacionForm.get('disciplina')?.clearValidators();
        this.organizacionForm.get('codigoEscuela')?.clearValidators();
      }
      this.organizacionForm.get('disciplina')?.updateValueAndValidity();
      this.organizacionForm.get('codigoEscuela')?.updateValueAndValidity();
    });

    this.sanctionForm = this.formBuilder.group({
      uuid: [null],
      estaSancionado: [true],
      fechaFinSancion: ['', [Validators.required, this.futureDateValidator]],
      motivoSancion: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
    });

    this.verificationForm = this.formBuilder.group({
      code: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(4)]],
    });
  }

  private formDataSet(): void {
    if (this.accion !== '' && this.row) {
      this.originalEmail = (this.row.email || '').toLowerCase().trim();
      this.emailVerified = true;

      this.editForm.patchValue({
        uuid: this.row.uuid,
        userName: this.row.userName,
        estadoUsuario: this.row.estadoUsuario,
        tipoContribuyente: this.row.tipoContribuyente,
        codigoContribuyente: this.row.codigoContribuyente,
        nombre: this.row.nombre,
        primerApellido: this.row.primerApellido,
        segundoApellido: this.row.segundoApellido,
        apellidoEsposo: this.row.apellidoEsposo,
        estadoCivil: this.row.estadoCivil,
        fechaNacimiento: this.toDateInputValue(this.row.fechaNacimiento),
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
        fechaVerificacionRuat: this.toDateInputValue(this.row.fechaVerificacionRuat),
        esDeportistaElite: this.row.esDeportistaElite,
        registroUnicoDeportivo: this.row.registroUnicoDeportivo,
        puedeReservarGratis: this.row.puedeReservarGratis,
        fechaUltimoUsoGratuito: this.toDateInputValue(this.row.fechaUltimoUsoGratuito),
        observacionesMunicipales: this.row.observacionesMunicipales,
      });

      this.editForm.get('password')?.clearValidators();
      this.editForm.get('cpassword')?.clearValidators();
      this.editForm.get('password')?.updateValueAndValidity({ emitEvent: false });
      this.editForm.get('cpassword')?.updateValueAndValidity({ emitEvent: false });

      if (this.row.estudianteEnEscuelas?.length) {
        this.estudiantesTemporales = this.row.estudianteEnEscuelas.map((est) => ({
          ...est,
          fechaNacimiento: this.toDateInputValue(est.fechaNacimiento),
          fechaInscripcion: this.toDateInputValue(est.fechaInscripcion),
        }));
      }
      if (this.row.organizacionesRepresentadas?.length) {
        this.organizacionesTemporales = [...this.row.organizacionesRepresentadas];
        this.organizacionesVinculadas = (this.row.organizacionesVinculadas || []).map(v => ({ ...v }));
      }

      this.sanctionForm.patchValue({
        uuid: this.row.uuid,
        estaSancionado: this.row.estaSancionado,
        fechaFinSancion: this.toDateInputValue(this.row.fechaFinSancion),
        motivoSancion: this.row.motivoSancion,
      });

      if (this.accion === 'show') {
        this.editForm.disable();
      }
      if (this.row.verificadoRuat && this.accion === 'edit') {
        this.disableRuatVerifiedFields();
      }
    }
  }

  private initEmailChangeWatcher(): void {
    this.editForm.get('email')?.valueChanges.subscribe((value) => {
      if (this.accion === 'show') return;
      const current = (value || '').toLowerCase().trim();
      const ctrl = this.editForm.get('email');

      if (this.accion === 'edit') {
        if (current !== this.originalEmail) {
          this.emailVerified = false;
          this.verificationCodeSent = false;
          this.showVerificationCode = false;
          ctrl?.setErrors({ ...(ctrl.errors || {}), emailNotVerified: true });
        } else {
          this.emailVerified = true;
          const errors = { ...(ctrl?.errors || {}) };
          delete errors['emailNotVerified'];
          ctrl?.setErrors(Object.keys(errors).length ? errors : null);
        }
      }
    });
  }

  isEmailChanged(): boolean {
    const current = (this.editForm.get('email')?.value || '').toLowerCase().trim();
    return this.accion === 'edit' && current !== this.originalEmail;
  }

  shouldShowEmailVerifyButton(): boolean {
    if (this.accion === '') return !this.verificationCodeSent;
    if (this.accion === 'edit') return this.isEmailChanged() && !this.emailVerified;
    return false;
  }

  shouldShowVerificationCodeBox(): boolean {
    return this.showVerificationCode && (this.accion === '' || this.accion === 'edit');
  }

  setActiveTab(tab: 'basic' | 'estudiantes' | 'organizaciones' | 'deportivo'): void {
    this.activeTab = tab;
  }

  private updatePuedeReservarGratis(): void {
    const esElite = this.editForm.get('esDeportistaElite')?.value;
    const tieneOrgGratis = this.organizacionesTemporales.some((o) => o.permiteReservarGratis);
    this.editForm.patchValue({ puedeReservarGratis: esElite || tieneOrgGratis });
  }

  toggleEstudianteForm(): void {
    this.showEstudianteForm = !this.showEstudianteForm;
    if (!this.showEstudianteForm) {
      this.estudianteForm.reset({
        activo: true,
        fechaInscripcion: new Date().toISOString().split('T')[0],
        existingStudentUuid: ''
      });
      this.estudianteBusqueda = '';
      this.editingEstudianteIndex = -1;
    }
  }

  async addOrUpdateEstudiante(): Promise<boolean> {
    if (this.estudianteForm.invalid) {
      this.markAllFieldsAsTouched(this.estudianteForm);
      this.notify('Complete todos los campos requeridos del estudiante', 'warning');
      return false;
    }
    const data = this.estudianteForm.getRawValue();
    if (this.yaExisteRelacionEstudianteEscuela(data.estudianteUuid || data.existingStudentUuid, data.organizacionUuid)) {
      this.notify('Este estudiante ya está registrado bajo esa escuela en esta lista', 'warning');
      return false;
    }
    if (data.existingStudentUuid && !data.estudianteUuid) {
      data.estudianteUuid = data.existingStudentUuid;
    }
    delete data.existingStudentUuid;
    const escuela = this.findEscuelaDisponible(data.organizacionUuid);
    data.organizacionDto = escuela || { uuid: data.organizacionUuid };

    const contribuyenteUuid = this.row?.uuid || this.editForm.get('uuid')?.value;
    if (contribuyenteUuid) {
      data.contribuyenteDto = { uuid: contribuyenteUuid } as Contribuyente;
    }

    const escuelaPersistida = !!data.organizacionUuid &&
      this.organizationsList.some(org => org.uuid === data.organizacionUuid);
    const guardarAhora = !!contribuyenteUuid && escuelaPersistida;

    if (guardarAhora) {
      try {
        const guardado = await new Promise<EstudianteEscuela>((resolve, reject) => {
          const request = data.uuid
            ? this.estudianteEscuelaService.update(data as EstudianteEscuela)
            : this.estudianteEscuelaService.save(data as EstudianteEscuela);
          request.subscribe({ next: resolve, error: reject });
        });
        if (this.editingEstudianteIndex >= 0) {
          this.estudiantesTemporales[this.editingEstudianteIndex] = this.withEscuelaDisplay(guardado, escuela);
        } else {
          this.estudiantesTemporales.push(this.withEscuelaDisplay(guardado, escuela));
        }
        this.notify(
          data.uuid ? 'Inscripción actualizada correctamente' : 'Estudiante e inscripción registrados correctamente',
          'success'
        );
      } catch (error: any) {
        this.notify(error?.message || 'No se pudo guardar la relación estudiante-escuela', 'error');
        return false;
      }
    } else {
      if (this.editingEstudianteIndex >= 0) {
        this.estudiantesTemporales[this.editingEstudianteIndex] = data;
      } else {
        this.estudiantesTemporales.push(data);
      }
      this.notify('Inscripción agregada a la lista. Guarde el contribuyente para registrarla.', 'info');
    }
    this.updatePuedeReservarGratis();
    this.toggleEstudianteForm();
    return true;
  }

  editEstudiante(index: number): void {
    const est = this.estudiantesTemporales[index];
    this.estudianteForm.patchValue({
      ...est,
      existingStudentUuid: est.estudianteUuid || '',
      organizacionUuid: est.organizacionDto?.uuid || '',
      fechaNacimiento: this.toDateInputValue(est.fechaNacimiento),
      fechaInscripcion: this.toDateInputValue(est.fechaInscripcion),
    });
    this.editingEstudianteIndex = index;
    this.showEstudianteForm = true;
  }

  onExistingStudentChange(estudianteUuid: string): void {
    const selected = this.estudiantesDisponiblesParaRelacion.find(item =>
      (item.estudianteUuid || item.uuid) === estudianteUuid);
    if (!selected) return;
    this.estudianteForm.patchValue({
      estudianteUuid: selected.estudianteUuid || selected.uuid,
      nombreCompleto: selected.nombreCompleto || '',
      fechaNacimiento: this.toDateInputValue(selected.fechaNacimiento),
      genero: selected.genero || '',
      numeroDocumento: selected.numeroDocumento || '',
      telefono: selected.telefono || '',
      email: selected.email || ''
    });
    this.estudianteBusqueda = '';
  }

  estudianteLabel(estudiante: EstudianteEscuela): string {
    const documento = estudiante.numeroDocumento ? ` — ${estudiante.numeroDocumento}` : '';
    return `${estudiante.nombreCompleto || 'Sin nombre'}${documento}`;
  }

  private yaExisteRelacionEstudianteEscuela(estudianteUuid?: string, organizacionUuid?: string): boolean {
    if (!estudianteUuid || !organizacionUuid || this.editingEstudianteIndex >= 0) return false;
    return this.estudiantesTemporales.some((est) =>
      (est.estudianteUuid || est.uuid) === estudianteUuid
      && (est.organizacionUuid || est.organizacionDto?.uuid) === organizacionUuid);
  }

  private findEscuelaDisponible(uuid?: string): Organizacion | undefined {
    if (!uuid) return undefined;
    return this.escuelasDisponiblesParaInscripcion.find(org => org.uuid === uuid);
  }

  private withEscuelaDisplay(estudiante: EstudianteEscuela, escuela?: Organizacion): EstudianteEscuela {
    if (!escuela || estudiante.organizacionDto?.nombre) {
      return estudiante;
    }
    return {
      ...estudiante,
      organizacionDto: {
        ...estudiante.organizacionDto,
        ...escuela
      }
    };
  }

  removeEstudiante(index: number): void {
    Swal.fire({
      title: '¿Quitar responsabilidad?',
      text: 'El estudiante y su inscripción se conservarán. Solo se quitará la relación con este contribuyente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f06548',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, quitar relación',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.estudiantesTemporales.splice(index, 1);
        this.updatePuedeReservarGratis();
        this.notify('Relación removida; no se eliminó al estudiante', 'info');
      }
    });
  }

  toggleOrganizacionForm(): void {
    this.showOrganizacionForm = !this.showOrganizacionForm;
    if (!this.showOrganizacionForm) {
      this.organizacionForm.reset({
        tipoOrganizacion: TipoOrganizacion.ASOCIACION,
        requierePagoMensualidad: false,
        tarifaMensual: 0,
        permiteReservasGratuitas: false,
        activo: true,
      });
      this.editingOrganizacionIndex = -1;
    }
  }

  addOrUpdateOrganizacion(): void {
    if (this.organizacionForm.invalid) {
      this.markAllFieldsAsTouched(this.organizacionForm);
      return;
    }
    const data = this.organizacionForm.getRawValue();
    if (!data.uuid) {
      data.uuid = this.generateUuid();
    }
    if (this.editingOrganizacionIndex >= 0) {
      this.organizacionesTemporales[this.editingOrganizacionIndex] = data;
    } else {
      this.organizacionesTemporales.push(data);
    }
    this.updatePuedeReservarGratis();
    this.toggleOrganizacionForm();
  }

  editOrganizacion(index: number): void {
    this.organizacionForm.patchValue(this.organizacionesTemporales[index]);
    this.editingOrganizacionIndex = index;
    this.showOrganizacionForm = true;
  }

  removeOrganizacion(index: number): void {
    Swal.fire({
      title: '¿Anular organización?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f06548',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.organizacionesTemporales.splice(index, 1);
        this.updatePuedeReservarGratis();
        this.notify('Organización anulada', 'info');
      }
    });
  }

  get form() { return this.editForm.controls; }
  get organizacion() { return this.organizacionForm.controls; }
  get estudiante() { return this.estudianteForm.controls; }
  get sanction() { return this.sanctionForm.controls; }
  get searchForm() { return this.searchRuatForm.controls; }

  private generateUuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = Math.floor(Math.random() * 16);
      const value = char === 'x' ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  private disableRuatVerifiedFields(): void {
    ['tipoContribuyente', 'nombre', 'primerApellido', 'segundoApellido',
     'tipoDocumento', 'numeroDocumento', 'expedido'].forEach((f) =>
      this.editForm.get(f)?.disable()
    );
  }

  async saveData(): Promise<void> {
    this.submitted = true;
    const formData = this.editForm.getRawValue();

    const userName = (formData.userName || '').trim() || (formData.numeroDocumento || '').trim();
    const password = this.accion === ''
      ? (formData.password || '').trim() || (formData.numeroDocumento || '').trim()
      : undefined;
    if (this.accion === '') {
      this.editForm.patchValue({ userName, password, cpassword: password });
    }

    if (this.accion === '' && !this.emailVerified) {
      this.notify(
        this.verificationCodeSent
          ? 'Debe completar la verificación del código enviado a su correo'
          : 'Debe verificar el email antes de guardar',
        'warning'
      );
      this.submitted = false;
      return;
    }
    if (this.accion === 'edit' && this.isEmailChanged() && !this.emailVerified) {
      this.notify('Debe verificar el nuevo email antes de guardar', 'warning');
      this.submitted = false;
      return;
    }

    if (formData.esDeportistaElite && !formData.registroUnicoDeportivo) {
      this.notify('Deportista Elite requiere Registro Único Deportivo', 'error');
      this.setActiveTab('deportivo');
      this.submitted = false;
      return;
    }

    await this.waitForAsyncValidation(this.editForm);

    if (this.editForm.invalid) {
      this.markAllFieldsAsTouched(this.editForm);
      const fields = this.getInvalidFields().map((f) => `\n• ${this.getFieldDisplayName(f)}`).join('');
      this.notify(`Por favor complete los siguientes campos requeridos:${fields}`, 'error');
      this.setActiveTab('basic');
      this.submitted = false;
      return;
    }

    if (this.showEstudianteForm && this.estudianteForm.dirty) {
      const agregado = await this.addOrUpdateEstudiante();
      if (!agregado) {
        this.submitted = false;
        return;
      }
    }

    let estadoFinal = formData.estadoUsuario;
    if (this.accion === '') {
      estadoFinal = formData.verificadoRuat ? EstadoUsuario.ACTIVO : EstadoUsuario.PENDIENTE_VERIFICACION;
    }

    const contribuyenteUuid = formData.uuid;
    const contribuyenteRef = contribuyenteUuid
      ? ({ uuid: contribuyenteUuid } as Contribuyente)
      : undefined;

    const estudiantesPreparados = this.estudiantesTemporales.map((est) => {
      const organizacionUuid = est.organizacionUuid || est.organizacionDto?.uuid;
      return {
        ...est,
        organizacionDto: { uuid: organizacionUuid },
        ...(contribuyenteRef ? { contribuyenteDto: contribuyenteRef } : {}),
      };
    });
    const organizacionesPreparadas = this.organizacionesTemporales.map((org) => ({
      ...org,
      ...(contribuyenteRef ? { representantesDto: [{ contribuyenteDto: contribuyenteRef }] } : {}),
    }));

    const puedeReservarGratis =
      formData.esDeportistaElite ||
      organizacionesPreparadas.some((o: any) => o.permiteReservasGratuitas);

    const datos: Contribuyente = {
      ...formData,
      userName,
      password,
      fechaVerificacionRuat: formData.fechaVerificacionRuat
        ? this.formatDateForBackend(formData.fechaVerificacionRuat)
        : null,
      fechaUltimoUsoGratuito: formData.fechaUltimoUsoGratuito
        ? this.formatDateForBackend(formData.fechaUltimoUsoGratuito)
        : null,
      fechaCreacion: this.row?.fechaCreacion || new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      estadoUsuario: estadoFinal,
      nombreCompleto:
        `${formData.nombre} ${formData.primerApellido} ${formData.segundoApellido || ''}`.trim(),
      puedeReservarGratis,
      estaSancionado: this.row?.estaSancionado || false,
      fechaFinSancion: this.row?.fechaFinSancion,
      motivoSancion: this.row?.motivoSancion,
      estudianteEnEscuelas: estudiantesPreparados,
      organizacionesRepresentadas: organizacionesPreparadas.filter(o => this.isNewOrganization(o)),
      organizacionesVinculadas: this.organizacionesVinculadas,
    };

    try {
      if (formData.uuid) {
        await this.updateData(datos, this.buildUpdateSuccessMessage());
      } else {
        if (!datos.verificadoRuat) {
          const ruatResponse = await this.registerTaxpayerInRuat(datos);
          if (this.ruatService.canContinue(ruatResponse)) {
            datos.codigoContribuyente = this.ruatService.getResponseData(ruatResponse).codigoContribuyente;
            datos.verificadoRuat = true;
            datos.estadoRuat = EstadoRuat.ACTIVO;
            datos.fechaVerificacionRuat = new Date().toISOString();
            datos.estadoUsuario = EstadoUsuario.ACTIVO;
            const saved = await this.addData(datos);
            if (saved) {
              await this.sendCredentialsEmail(saved, userName, password);
              this.notify(this.buildCreateSuccessMessage(), 'success');
              this.closeModal();
              this.emitList.emit();
            } else {
              this.notify('No se pudo registrar al Contribuyente en el sistema local', 'error');
            }
          } else {
            this.notify('No se pudo registrar el contribuyente en RUAT. Operación cancelada.', 'error');
          }
        } else {
          const saved = await this.addData(datos);
          if (saved) {
            await this.sendCredentialsEmail(saved, userName, password);
            this.notify(this.buildCreateSuccessMessage(), 'success');
            this.closeModal();
            this.emitList.emit();
          }
        }
      }
    } catch (error) {
      this.notify(this.getContribuyenteErrorMessage(error, this.editForm?.getRawValue()), 'error');
    } finally {
      this.submitted = false;
    }
  }

  private buildCreateSuccessMessage(): string {
    let msg = 'Contribuyente registrado exitosamente!';
    if (this.estudiantesTemporales.length > 0)
      msg += `\n${this.estudiantesTemporales.length} estudiante(s) registrado(s)`;
    if (this.organizacionesTemporales.length > 0)
      msg += `\n${this.organizacionesTemporales.length} organización(es) registrada(s)`;
    return msg;
  }

  private buildUpdateSuccessMessage(): string {
    let msg = 'Datos actualizados exitosamente!';
    if (this.estudiantesTemporales.length > 0)
      msg += `\n${this.estudiantesTemporales.length} estudiante(s) guardado(s)`;
    if (this.organizacionesTemporales.length > 0)
      msg += `\n${this.organizacionesTemporales.length} organización(es) guardada(s)`;
    return msg;
  }

  private async registerTaxpayerInRuat(datos: Contribuyente): Promise<any> {
    const ruatData = {
      tipoDocumento: datos.tipoDocumento,
      numeroDocumento: datos.numeroDocumento,
      expedido: datos.expedido,
      nombre: datos.nombre,
      primerApellido: datos.primerApellido,
      segundoApellido: datos.segundoApellido,
      fechaNacimiento: datos.fechaNacimiento ? this.formatDateForRuat(datos.fechaNacimiento) : '',
      genero: datos.genero,
      estadoCivil: datos.estadoCivil,
      telefono: datos.telefono,
      email: datos.email,
      direccion: datos.direccion,
      nroNit: datos.nroNit,
    };
    this.notify('Registrando contribuyente en RUAT...', 'info');
    const ruatResp = await this.registerTaxpayer(ruatData);
    if (this.ruatService.canContinue(ruatResp)) {
      this.notify('Contribuyente registrado exitosamente en RUAT', 'success');
      return ruatResp;
    }
    throw new Error(this.ruatService.getResponseMessage(ruatResp, 'Error desconocido en RUAT'));
  }

  async searchInRuat(): Promise<void> {
    if (this.searchRuatForm.invalid) {
      this.notify('Complete todos los campos de búsqueda', 'warning');
      return;
    }
    this.searchingRuat = true;
    try {
      const ruatResp = await this.searchTaxpayerInRuat(this.searchRuatForm.value);
      if (this.ruatService.canContinue(ruatResp)) {
        this.ruatDataFound = ruatResp;
        this.fillFormFromRuat(ruatResp);
        this.notify('Datos encontrados en RUAT', 'success');
      } else {
        this.notify(this.ruatService.getResponseMessage(ruatResp, 'No se encontraron datos en RUAT. Puede continuar con registro manual'), 'info');
        this.fillFormManually();
      }
    } catch (error) {
      this.notify(
        this.ruatService.getResponseMessage(error, 'Error al consultar RUAT. Puede continuar con registro manual'),
        'warning'
      );
      this.fillFormManually();
    } finally {
      this.searchingRuat = false;
      this.showRuatSearch = false;
    }
  }

  private fillFormFromRuat(ruatData: any): void {
    const datos = this.ruatService.getResponseData(ruatData);
    const client = datos.contribuyente;
    this.editForm.patchValue({
      codigoContribuyente: datos.codigoContribuyente,
      estadoRuat: EstadoRuat.ACTIVO,
      verificadoRuat: true,
      fechaVerificacionRuat: new Date().toISOString().split('T')[0],
      estadoUsuario: EstadoUsuario.ACTIVO,
      nombre: client.nombre,
      primerApellido: client.primerApellido,
      segundoApellido: client.segundoApellido,
      fechaNacimiento: this.toDateInputValue(client.fechaNacimiento),
      genero: this.getUserGender(client.genero),
      estadoCivil: this.getCivilStatusCode(client.estadoCivil),
      tipoDocumento: this.getTipoDocumentoCode(client.tipoDocumento),
      numeroDocumento: client.numeroDocumento,
      expedido: this.getExpedidoCode(client.expedido),
      userName: client.numeroDocumento,
      password: client.numeroDocumento,
      cpassword: client.numeroDocumento,
    });
    this.disableRuatVerifiedFields();
  }

  private fillFormManually(): void {
    this.editForm.patchValue({
      tipoDocumento: this.searchRuatForm.value.tipoDocumento,
      numeroDocumento: this.searchRuatForm.value.numeroDocumento,
      expedido: this.searchRuatForm.value.expedido,
      userName: this.searchRuatForm.value.numeroDocumento,
      password: this.searchRuatForm.value.numeroDocumento,
      cpassword: this.searchRuatForm.value.numeroDocumento,
      verificadoRuat: false,
      estadoRuat: EstadoRuat.ACTIVO,
      estadoUsuario: EstadoUsuario.PENDIENTE_VERIFICACION,
    });
  }

  skipRuatSearch(): void {
    this.showRuatSearch = false;
    this.editForm.patchValue({
      verificadoRuat: false,
      estadoRuat: EstadoRuat.ACTIVO,
      estadoUsuario: EstadoUsuario.PENDIENTE_VERIFICACION,
    });
  }

  async verifyInRuat(): Promise<void> {
    this.submitted = true;
    const formData = this.editForm.getRawValue();
    const ruatData = { ...formData, fechaNacimiento: formData.fechaNacimiento ? this.formatDateForRuat(formData.fechaNacimiento) : '' };
    try {
      const ruatResp = await this.registerTaxpayer(ruatData);
      if (this.ruatService.canContinue(ruatResp)) {
        const datos = this.ruatService.getResponseData(ruatResp);
        const nuevoEstado =
          formData.estadoUsuario === EstadoUsuario.PENDIENTE_VERIFICACION
            ? EstadoUsuario.ACTIVO
            : formData.estadoUsuario;
        this.editForm.patchValue({
          codigoContribuyente: datos.codigoContribuyente,
          verificadoRuat: true,
          estadoRuat: EstadoRuat.ACTIVO,
          fechaVerificacionRuat: new Date().toISOString().split('T')[0],
          estadoUsuario: nuevoEstado,
        });
        await this.updateData(this.editForm.getRawValue(), 'Verificación RUAT exitosa');
      } else {
        this.notify(this.ruatService.getResponseMessage(ruatResp, 'No se pudo verificar en RUAT'), 'error');
      }
    } catch (error) {
      this.notify(this.ruatService.getResponseMessage(error, 'Error al verificar en RUAT'), 'error');
    } finally {
      this.submitted = false;
    }
  }

  async sendVerificationEmail(): Promise<void> {
    const emailCtrl = this.editForm.get('email');
    const emailValue = emailCtrl?.value;

    if (!emailValue) {
      this.notify('Ingrese un email antes de verificar', 'warning');
      return;
    }
    if (emailCtrl?.hasError('email')) {
      this.notify('El formato del email no es válido', 'warning');
      return;
    }
    await this.waitForAsyncValidation(this.editForm);
    if (emailCtrl?.hasError('emailTaken')) {
      this.notify('Este email ya está registrado por otro contribuyente', 'warning');
      return;
    }

    const code = this.generateCode();
    this.editForm.patchValue({ verificationCode: code });
    try {
      await this.sendEmailCode(emailValue, code);
      this.verificationCodeSent = true;
      this.showVerificationCode = true;
      this.notify('Código de verificación enviado al email', 'success');
    } catch {
      this.notify('Error al enviar el código de verificación. Intente nuevamente.', 'error');
    }
  }

  verifyEmailCode(): void {
    const entered = this.verificationForm.get('code')?.value;
    const stored = this.editForm.get('verificationCode')?.value;
    if (entered === stored) {
      this.emailVerified = true;
      this.verificationCodeSent = true;
      this.showVerificationCode = false;
      this.verificationForm.reset();

      const ctrl = this.editForm.get('email');
      const errors = { ...(ctrl?.errors || {}) };
      delete errors['emailNotVerified'];
      ctrl?.setErrors(Object.keys(errors).length ? errors : null);

      const isVerifiedRuat = this.editForm.get('verificadoRuat')?.value;
      this.editForm.patchValue({
        estadoUsuario: isVerifiedRuat ? EstadoUsuario.ACTIVO : EstadoUsuario.PENDIENTE_VERIFICACION,
      });
      this.notify('Email verificado correctamente', 'success');
    } else {
      this.notify('Código incorrecto. Verifique e intente de nuevo.', 'error');
      this.verificationForm.patchValue({ code: '' });
    }
  }

  async applySanction(): Promise<void> {
    this.submitted = true;
    await this.waitForAsyncValidation(this.sanctionForm);

    if (this.sanctionForm.invalid) {
      this.markAllFieldsAsTouched(this.sanctionForm);
      const msgs: string[] = [];
      if (this.sanction['fechaFinSancion'].errors?.['required']) msgs.push('La fecha de fin de sanción es requerida');
      if (this.sanction['fechaFinSancion'].errors?.['pastDate']) msgs.push('La fecha de fin debe ser posterior a hoy');
      if (this.sanction['motivoSancion'].errors?.['required']) msgs.push('El motivo de la sanción es requerido');
      if (this.sanction['motivoSancion'].errors?.['minlength']) msgs.push('El motivo debe tener al menos 5 caracteres');
      this.notify(msgs.join('\n'), 'error');
      this.submitted = false;
      return;
    }

    const sd = this.sanctionForm.getRawValue();
    const fechaFinSancion = sd.fechaFinSancion ? new Date(`${sd.fechaFinSancion}T23:59:59.000Z`) : undefined;
    const datos: Contribuyente = {
      ...this.row,
      estaSancionado: true,
      estadoUsuario: EstadoUsuario.SANCIONADO,
      fechaActualizacion: new Date(),
      fechaFinSancion,
      motivoSancion: sd.motivoSancion,
    };
    try {
      await this.updateData(datos, 'Sanción aplicada correctamente');
    } catch (error) {
      this.notify('Error al aplicar la sanción: ' + error, 'error');
    } finally {
      this.submitted = false;
    }
  }

  async removeSanction(): Promise<void> {
    const escapedNombre = this.escapeHtml(this.row.nombreCompleto as string);
    const escapedMotivo = this.escapeHtml(this.row.motivoSancion as string);
    const fechaFin = this.row.fechaFinSancion
      ? new Date(this.row.fechaFinSancion as string).toLocaleDateString('es-BO')
      : '—';
    const nuevoEstadoLabel = this.row.verificadoRuat ? 'ACTIVO' : 'PENDIENTE VERIFICACIÓN';

    const result = await Swal.fire({
      title: '¿Levantar Sanción?',
      html: `
        <div class="text-start">
          <p><strong>Contribuyente:</strong> ${escapedNombre}</p>
          <p><strong>Motivo actual:</strong> ${escapedMotivo}</p>
          <p><strong>Fecha fin:</strong> ${fechaFin}</p>
          <hr>
          <p class="text-muted">El usuario quedará en estado: <strong>${nuevoEstadoLabel}</strong></p>
        </div>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0ab39c',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="ri-check-line me-1"></i> Sí, Levantar',
      cancelButtonText: '<i class="ri-close-line me-1"></i> Cancelar',
    });
    if (!result.isConfirmed) return;

    this.submitted = true;
    try {
      let nuevoEstado: EstadoUsuario;
      if (this.row.estadoUsuario === EstadoUsuario.BLOQUEADO) {
        nuevoEstado = EstadoUsuario.BLOQUEADO; // stay blocked — just lift the sanction flag
      } else if (!this.row.verificadoRuat) {
        nuevoEstado = EstadoUsuario.PENDIENTE_VERIFICACION;
      } else {
        nuevoEstado = EstadoUsuario.ACTIVO;
      }
      const datos: Contribuyente = {
        ...this.row,
        estaSancionado: false,
        fechaFinSancion: undefined,
        motivoSancion: '',
        estadoUsuario: nuevoEstado,
        fechaActualizacion: new Date(),
      };
      await this.updateData(datos, 'Sanción levantada correctamente');
    } catch {
      Swal.fire({ title: 'Error', text: 'No se pudo levantar la sanción.', icon: 'error', confirmButtonColor: '#f06548' });
    } finally {
      this.submitted = false;
    }
  }

  async blockUser(): Promise<void> {
    await this.updateData(
      { ...this.row, estadoUsuario: EstadoUsuario.BLOQUEADO, fechaActualizacion: new Date() },
      'Contribuyente bloqueado'
    );
  }

  async unblockUser(): Promise<void> {
    let estadoUsuario: EstadoUsuario;
    if (this.row.estaSancionado) estadoUsuario = EstadoUsuario.SANCIONADO;
    else if (!this.row.verificadoRuat) estadoUsuario = EstadoUsuario.PENDIENTE_VERIFICACION;
    else estadoUsuario = EstadoUsuario.ACTIVO;
    await this.updateData({ ...this.row, estadoUsuario, fechaActualizacion: new Date() }, 'Contribuyente desbloqueado');
  }

  async inactivateUser(): Promise<void> {
    await this.updateData(
      { ...this.row, estadoUsuario: EstadoUsuario.INACTIVO, fechaActualizacion: new Date() },
      'Contribuyente inactivado'
    );
  }

  async activateUser(): Promise<void> {
    if (!this.row.verificadoRuat) {
      this.notify('No se puede activar. El usuario debe estar verificado en RUAT', 'warning');
      return;
    }
    if (this.row.estaSancionado) {
      this.notify('No se puede activar. El usuario tiene una sanción activa', 'warning');
      return;
    }
    await this.updateData(
      { ...this.row, estadoUsuario: EstadoUsuario.ACTIVO, fechaActualizacion: new Date() },
      'Contribuyente activado'
    );
  }

  private getOrganizations(): void {
    this.organizationService.getAll().subscribe({
      next: (data: any) => { this.organizationsList = data.content || data; },
    });
  }

  private getStudents(): void {
    this.estudianteEscuelaService.getAll().subscribe({
      next: (data: any) => { this.estudiantesList = data?.content || data || []; },
    });
  }

  private getConfigsSystem(): void {
    this.systemConfigList = Object.values(this.authService.getAllConfigs() || {});
  }

  private addData(datos: Contribuyente): Promise<any> {
    return new Promise((resolve, reject) => {
      this.contribuyentesService.save(datos).subscribe({
        next: (data: any) => {
          this.submitted = false;
          resolve(data);
        },
        error: (err) => {
          this.submitted = false;
          this.notify(this.getContribuyenteErrorMessage(err, datos), 'error');
          resolve(null);
        },
      });
    });
  }

  private updateData(datos: Contribuyente, successMessage = 'Datos actualizados exitosamente!'): Promise<any> {
    return new Promise((resolve, reject) => {
      this.contribuyentesService.update(datos).subscribe({
        next: (data: any) => {
          this.submitted = false;
          this.notify(successMessage, 'success');
          this.closeModal();
          this.emitList.emit();
          resolve(data);
        },
        error: (err) => {
          this.submitted = false;
          this.notify(this.getContribuyenteErrorMessage(err, datos), 'error');
          resolve(null);
        },
      });
    });
  }

  deleteData(uuid: string): void {
    this.contribuyentesService.delete(uuid).subscribe({
      next: (message: string) => {
        this.submitted = false;
        this.closeModal();
        this.emitList.emit();
        this.notify(message || 'Contribuyente eliminado exitosamente', 'info');
      },
      error: () => {
        this.submitted = false;
        this.notify('No se pudo anular el registro!', 'error');
      },
    });
  }

  private searchTaxpayerInRuat(data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.ruatService
        .getTaxpayerByIdentityNumber(data.numeroDocumento, data.tipoDocumento, data.expedido)
        .subscribe({
          next: (resp: any) => resolve(resp),
          error: (err) => reject(err),
        });
    });
  }

  private registerTaxpayer(data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.ruatService.registerTaxpayer(data).subscribe({
        next: (resp: any) => resolve(resp),
        error: (err) => reject(err),
      });
    });
  }

  private sendCredentialsEmail(userData: any, username: string, password: string): Promise<void> {
    return emailjs
      .send(
        environment.EmailJS.idService,
        environment.EmailJS.idTemplate,
        { from_name: 'GAMQ-DEPORTES', to_name: userData.nombre, message: `USUARIO: ${username}, CONTRASEÑA: ${password}`, reply_to: userData.email },
        environment.EmailJS.publicKey
      )
      .then(() => this.notify('Un email fue enviado a ' + userData.email + ' con su USUARIO y CONTRASEÑA', 'success'))
      .catch(() => this.notify('No se pudo enviar el email con las credenciales', 'warning'));
  }

  private sendEmailCode(email: string, code: string): Promise<void> {
    return emailjs
      .send(
        environment.EmailJS.idService,
        environment.EmailJS.idTemplate,
        { from_name: 'GAMQ-DEPORTES', to_name: this.editForm.get('nombre')?.value || 'Usuario', message: `Su código de verificación es: ${code}. Válido por un solo uso.`, reply_to: email },
        environment.EmailJS.publicKey
      )
      .then(() => undefined)
      .catch((err) => { throw err; });
  }

  generateCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  identityNumberValidator(control: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const itExist = (this.clientsList || []).some(
          (u) => u.numeroDocumento === control.value && u.uuid !== this.editForm.get('uuid')?.value
        );
        resolve(itExist ? { itExist: true } : null);
      }, 300);
    });
  }

  emailValidator(control: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const taken = (this.clientsList || []).some(
          (u) =>
            (u.email || '').toLowerCase() === (control.value || '').toLowerCase() &&
            u.uuid !== this.editForm.get('uuid')?.value
        );
        resolve(taken ? { emailTaken: true } : null);
      }, 300);
    });
  }

  usernameFormatValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    const lower = value.toLowerCase();
    if (!/^[a-z0-9.]+$/.test(lower)) return { invalidFormat: true };
    if (value !== lower) control.setValue(lower, { emitEvent: false });
    return null;
  }

  private markAllFieldsAsTouched(form: UntypedFormGroup): void {
    Object.keys(form.controls).forEach((key) => form.get(key)?.markAsTouched());
  }

  private async waitForAsyncValidation(form: UntypedFormGroup): Promise<void> {
    return new Promise((resolve) => {
      if (!form.pending) { resolve(); return; }
      const sub = form.statusChanges.subscribe((status) => {
        if (status !== 'PENDING') { sub.unsubscribe(); resolve(); }
      });
    });
  }

  private getInvalidFields(): string[] {
    return Object.keys(this.editForm.controls).filter((k) => this.editForm.get(k)?.invalid);
  }

  private getContribuyenteErrorMessage(error: any, datos?: any): string {
    const rawPayload = this.extractApiPayload(error);
    const rawMessage = typeof rawPayload === 'string'
      ? rawPayload
      : rawPayload?.mensaje || rawPayload?.message || error?.message || '';
    const isRuatResponse = rawPayload !== null && typeof rawPayload === 'object' &&
      Object.prototype.hasOwnProperty.call(rawPayload, 'continuarFlujo') &&
      Object.prototype.hasOwnProperty.call(rawPayload, 'mensaje');

    if (isRuatResponse) {
      return this.ruatService.getResponseMessage(error, '') || 'RUAT rechazó la solicitud sin devolver un mensaje.';
    }

    if (
      rawPayload?.code === 'RESOURCE_ALREADY_EXISTS' ||
      rawPayload?.status === 'DUPLICATE_ENTITY' ||
      error?.error?.status === 'DUPLICATE_ENTITY' ||
      error?.status === 'DUPLICATE_ENTITY'
    ) {
      const existingMessage = this.getExistingContribuyenteMessage(datos);
      return existingMessage || 'Ya existe un contribuyente registrado con esos datos. Revise el documento, NIT, correo o usuario antes de guardar.';
    }

    return rawMessage || 'No se pudo guardar los datos del contribuyente. Intente nuevamente.';
  }

  private normalizeText(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private extractApiPayload(error: any): any {
    const payload = error?.payload ?? error?.error?.payload ?? error?.error ?? error;
    if (typeof payload !== 'string') {
      return payload;
    }

    try {
      return JSON.parse(payload);
    } catch {
      return payload;
    }
  }

  private getExistingContribuyenteMessage(datos?: any): string | null {
    if (!datos || !Array.isArray(this.clientsList)) return null;

    const currentUuid = datos.uuid;
    const existing = this.clientsList.find((client) => {
      if (client.uuid && client.uuid === currentUuid) return false;
      return (
        (!!datos.numeroDocumento && client.numeroDocumento === datos.numeroDocumento) ||
        (!!datos.email && client.email?.toLowerCase() === String(datos.email).toLowerCase()) ||
        (!!datos.userName && client.userName?.toLowerCase() === String(datos.userName).toLowerCase()) ||
        (!!datos.nroNit && client.nroNit === datos.nroNit)
      );
    });

    if (!existing) return null;

    if (datos.numeroDocumento && existing.numeroDocumento === datos.numeroDocumento) {
      return `Ya existe un contribuyente registrado con el documento ${datos.numeroDocumento}.`;
    }
    if (datos.email && existing.email?.toLowerCase() === String(datos.email).toLowerCase()) {
      return `Ya existe un contribuyente registrado con el correo ${datos.email}.`;
    }
    if (datos.userName && existing.userName?.toLowerCase() === String(datos.userName).toLowerCase()) {
      return `Ya existe un contribuyente registrado con el usuario ${datos.userName}.`;
    }
    if (datos.nroNit && existing.nroNit === datos.nroNit) {
      return `Ya existe un contribuyente registrado con el NIT ${datos.nroNit}.`;
    }

    return null;
  }

  private getFieldDisplayName(fieldName: string): string {
    const map: { [k: string]: string } = {
      tipoContribuyente: 'Tipo de Contribuyente',
      tipoDocumento: 'Tipo de Documento',
      numeroDocumento: 'Número de Documento',
      expedido: 'Expedido',
      nombre: 'Nombre',
      primerApellido: 'Primer Apellido',
      fechaNacimiento: 'Fecha de Nacimiento',
      telefono: 'Teléfono',
      email: 'Email',
      userName: 'Usuario',
      password: 'Contraseña',
      cpassword: 'Confirmar Contraseña',
      registroUnicoDeportivo: 'Registro Único Deportivo (requerido para Deportista Elite)',
    };
    return map[fieldName] || fieldName;
  }

  private getTipoDocumentoCode(description: string): string {
    return this.identityTypes.find((i) => i.description === description)?.type ?? 'CI';
  }

  private getExpedidoCode(value: string): string {
    return this.cityAcronym.find((i) => i.value === value)?.id.toString() ?? '3';
  }

  getTipoOrganizacionLabel(tipo: string): string {
    const labels: Record<string, string> = {
      [TipoOrganizacion.ASOCIACION]: 'Asociación',
      [TipoOrganizacion.CLUB]: 'Club',
      [TipoOrganizacion.ESCUELA_MUNICIPAL]: 'Escuela Municipal',
      [TipoOrganizacion.ORGANIZACION]: 'Organización',
    };
    return labels[tipo] || tipo;
  }

  getDepartmentName(id: string | undefined): string | undefined {
    return this.cityAcronym.find((i) => '' + i.id === id)?.value ?? id;
  }

  getCivilStatus(acronym: string | undefined): string | undefined {
    return this.civilStatus.find((i) => i.type === acronym)?.description ?? acronym;
  }

  getCivilStatusCode(description: string): string {
    return this.civilStatus.find((i) => i.description === description)?.type ?? '';
  }

  getUserGender(description: string): string {
    const value = String(description || '').trim().toUpperCase();
    if (value === 'F' || value === 'FEMENINO') return 'F';
    if (value === 'M' || value === 'MASCULINO') return 'M';
    return this.userSex.find((i) => i.description.toUpperCase() === value)?.id ?? '';
  }

  getGenderText(genero: string | undefined): string {
    const value = String(genero || '').trim().toUpperCase();
    return value === 'F' || value === 'FEMENINO'
      ? 'FEMENINO'
      : value === 'M' || value === 'MASCULINO'
        ? 'MASCULINO'
        : 'No especificado';
  }

  getTipoContribuyenteText(tipo: string): string {
    return tipo === 'NA' ? 'CONTRIBUYENTE NATURAL' : 'CONTRIBUYENTE JURÍDICO';
  }

  getTipoDocumentoDescription(code: string): string {
    return this.identityTypes.find((i) => i.type === code)?.description ?? code;
  }

  getExpedidoDescription(id: string): string {
    return this.cityAcronym.find((i) => i.id.toString() === id)?.value ?? id;
  }

  getEstadoUsuarioText(estado: string): string {
    const map: Record<string, string> = {
      [EstadoUsuario.ACTIVO]: 'ACTIVO',
      [EstadoUsuario.INACTIVO]: 'INACTIVO',
      [EstadoUsuario.PENDIENTE_VERIFICACION]: 'PENDIENTE VERIFICACIÓN',
      [EstadoUsuario.SANCIONADO]: 'SANCIONADO',
      [EstadoUsuario.BLOQUEADO]: 'BLOQUEADO',
    };
    return map[estado] || estado;
  }

  calculateAge(fechaNacimiento: string): number {
    if (!fechaNacimiento) return 0;
    const birth = new Date(fechaNacimiento);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  togglePasswordField(): void { this.passwordField = !this.passwordField; }
  toggleConfirmField(): void { this.confirmField = !this.confirmField; }

  public closeModal(): void {
    this.editForm.enable();
    this.editForm.reset();
    this.sanctionForm.reset();
    this.estudianteForm.reset();
    this.organizacionForm.reset();
    this.searchRuatForm.reset();
    this.verificationForm.reset();
    this.modalService.dismissAll();
    this.showRuatSearch = false;
    this.showVerificationCode = false;
    this.verificationCodeSent = false;
    this.emailVerified = false;
    this.ruatDataFound = null;
    this.estudiantesTemporales = [];
    this.organizacionesTemporales = [];
    this.showEstudianteForm = false;
    this.showOrganizacionForm = false;
    this.activeTab = 'basic';
    this.originalEmail = '';
  }

  private isNewOrganization(org: any): boolean {
    return !org?.uuid || !this.organizationsList.some(existing => existing.uuid === org.uuid);
  }

  private notify(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    Swal.fire({ text: message, icon: type, timer: 5000, timerProgressBar: true });
  }
}
