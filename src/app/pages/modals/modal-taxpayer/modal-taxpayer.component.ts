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
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { RuatRequestsService } from 'src/app/core/services/ruatRequest.service';
import { EstadoUsuario, EstadoRuat } from 'src/app/core/constants/Estados';
import { environment } from 'src/environments/environment';
import { ConfiguracionSistemaService } from 'src/app/core/services/api/configuracionSistema.service';
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
  editingOrganizacionIndex = -1;
  showOrganizacionForm = false;

  private originalEmail = '';

  // Arrow function so `this.today` is always in scope when used as a validator
  private futureDateValidator = (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    return control.value >= this.today ? null : { pastDate: true };
  };

  constructor(
    private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private ruatService: RuatRequestsService,
    private systemConfigsService: ConfiguracionSistemaService,
    private contribuyentesService: ContribuyentesService,
    private organizationService: OrganizacionService,
    private estudianteEscuelaService: EstudianteEscuelaService
  ) {}

  ngOnInit(): void {
    this.getConfigsSystem();
    this.getOrganizations();
    this.getEstudiantes();
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

  // ─── Date Utilities ───────────────────────────────────────────────────────

  /**
   * Converts any date value (ISO string, Date, undefined) into the YYYY-MM-DD
   * format expected by <input type="date">. Uses UTC parts to prevent timezone
   * shifts from moving the date one day backward.
   */
  private toDateInputValue(dateStr: string | Date | undefined | null): string {
    if (!dateStr) return '';
    const d = new Date(dateStr as string);
    if (isNaN(d.getTime())) return '';
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** Converts YYYY-MM-DD → ISO UTC midnight for the backend. */
  private formatDateForBackend(dateString: string): string | null {
    if (!dateString) return null;
    return `${dateString}T00:00:00.000Z`;
  }

  /** Converts YYYY-MM-DD → DD/MM/YYYY for the RUAT API. */
  private formatDateForRuat(dateString: string): string {
    if (!dateString) return '';
    const d = new Date(dateString);
    return [
      String(d.getUTCDate()).padStart(2, '0'),
      String(d.getUTCMonth() + 1).padStart(2, '0'),
      d.getUTCFullYear(),
    ].join('/');
  }

  /** Escapes HTML characters to prevent XSS in Swal HTML blocks. */
  private escapeHtml(text: string): string {
    return (text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ─── Form Initialization ──────────────────────────────────────────────────

  private initForms(): void {
    this.searchRuatForm = this.formBuilder.group({
      tipoDocumento: ['CI', [Validators.required]],
      numeroDocumento: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(20)]],
      expedido: ['', [Validators.required]],
    });

    // Async-validator controls use updateOn:'blur' so the duplicate-check fires
    // only when the user leaves the field, not on every keystroke.
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

    // Reactively toggle registroUnicoDeportivo requirement
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
      nombreCompleto: ['', [Validators.required, Validators.maxLength(250)]],
      fechaNacimiento: ['', [Validators.required]],
      genero: [''],
      numeroDocumento: [''],
      telefono: [''],
      email: ['', [Validators.email]],
      matricula: ['', [Validators.required, Validators.maxLength(50)]],
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

  // ─── Form Data Population ─────────────────────────────────────────────────

  private formDataSet(): void {
    if (this.accion !== '' && this.row) {
      this.originalEmail = (this.row.email || '').toLowerCase().trim();
      // Existing email is already verified
      this.emailVerified = true;

      this.editForm.patchValue({
        uuid: this.row.uuid,
        userName: this.row.userName,
        password: this.row.password,
        cpassword: this.row.password,
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

      // Normalise child dates so date inputs display correctly
      if (this.row.estudianteEnEscuelas?.length) {
        this.estudiantesTemporales = this.row.estudianteEnEscuelas.map((est) => ({
          ...est,
          fechaNacimiento: this.toDateInputValue(est.fechaNacimiento),
          fechaInscripcion: this.toDateInputValue(est.fechaInscripcion),
        }));
      }
      if (this.row.organizacionesRepresentadas?.length) {
        this.organizacionesTemporales = [...this.row.organizacionesRepresentadas];
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

  // ─── Email Verification Watchers ──────────────────────────────────────────

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
          // User typed back the original email — it's already verified
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

  // ─── Tab Navigation ───────────────────────────────────────────────────────

  setActiveTab(tab: 'basic' | 'estudiantes' | 'organizaciones' | 'deportivo'): void {
    this.activeTab = tab;
  }

  // ─── puedeReservarGratis helper ───────────────────────────────────────────

  private updatePuedeReservarGratis(): void {
    const esElite = this.editForm.get('esDeportistaElite')?.value;
    const tieneEstudiantes = this.estudiantesTemporales.length > 0;
    const tieneOrgGratis = this.organizacionesTemporales.some((o) => o.permiteReservarGratis);
    this.editForm.patchValue({ puedeReservarGratis: esElite || tieneEstudiantes || tieneOrgGratis });
  }

  // ─── Estudiantes CRUD ─────────────────────────────────────────────────────

  toggleEstudianteForm(): void {
    this.showEstudianteForm = !this.showEstudianteForm;
    if (!this.showEstudianteForm) {
      this.estudianteForm.reset({ activo: true, fechaInscripcion: new Date().toISOString().split('T')[0] });
      this.editingEstudianteIndex = -1;
    }
  }

  addOrUpdateEstudiante(): void {
    if (this.estudianteForm.invalid) {
      this.markAllFieldsAsTouched(this.estudianteForm);
      this.notify('Complete todos los campos requeridos del estudiante', 'warning');
      return;
    }
    const data = this.estudianteForm.getRawValue();
    if (this.editingEstudianteIndex >= 0) {
      this.estudiantesTemporales[this.editingEstudianteIndex] = data;
    } else {
      this.estudiantesTemporales.push(data);
    }
    this.updatePuedeReservarGratis();
    this.toggleEstudianteForm();
  }

  editEstudiante(index: number): void {
    const est = this.estudiantesTemporales[index];
    this.estudianteForm.patchValue({
      ...est,
      fechaNacimiento: this.toDateInputValue(est.fechaNacimiento),
      fechaInscripcion: this.toDateInputValue(est.fechaInscripcion),
    });
    this.editingEstudianteIndex = index;
    this.showEstudianteForm = true;
  }

  removeEstudiante(index: number): void {
    Swal.fire({
      title: '¿Eliminar estudiante?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f06548',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.estudiantesTemporales.splice(index, 1);
        this.updatePuedeReservarGratis();
        this.notify('Estudiante eliminado', 'info');
      }
    });
  }

  // ─── Organizaciones CRUD ──────────────────────────────────────────────────

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
      title: '¿Eliminar organización?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f06548',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.organizacionesTemporales.splice(index, 1);
        this.updatePuedeReservarGratis();
        this.notify('Organización eliminada', 'info');
      }
    });
  }

  // ─── Accessors ────────────────────────────────────────────────────────────

  get form() { return this.editForm.controls; }
  get organizacion() { return this.organizacionForm.controls; }
  get estudiante() { return this.estudianteForm.controls; }
  get sanction() { return this.sanctionForm.controls; }
  get searchForm() { return this.searchRuatForm.controls; }

  // ─── RUAT Field Locking ───────────────────────────────────────────────────

  private disableRuatVerifiedFields(): void {
    ['tipoContribuyente', 'nombre', 'primerApellido', 'segundoApellido',
     'tipoDocumento', 'numeroDocumento', 'expedido'].forEach((f) =>
      this.editForm.get(f)?.disable()
    );
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  async saveData(): Promise<void> {
    this.submitted = true;

    // getRawValue() captures disabled fields — no need to enable the form,
    // which would otherwise permanently unlock RUAT-verified fields on validation failure.
    const formData = this.editForm.getRawValue();

    const userName = (formData.userName || '').trim() || (formData.numeroDocumento || '').trim();
    const password = (formData.password || '').trim() || (formData.numeroDocumento || '').trim();
    this.editForm.patchValue({ userName, password, cpassword: password });

    // ── Email verification ──────────────────────────────────────────────────
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

    // ── Deportista Elite ────────────────────────────────────────────────────
    if (formData.esDeportistaElite && !formData.registroUnicoDeportivo) {
      this.notify('Deportista Elite requiere Registro Único Deportivo', 'error');
      this.setActiveTab('deportivo');
      this.submitted = false;
      return;
    }

    // ── Wait for any pending async validators ───────────────────────────────
    await this.waitForAsyncValidation(this.editForm);

    if (this.editForm.invalid) {
      this.markAllFieldsAsTouched(this.editForm);
      const fields = this.getInvalidFields().map((f) => `\n• ${this.getFieldDisplayName(f)}`).join('');
      this.notify(`Por favor complete los siguientes campos requeridos:${fields}`, 'error');
      this.setActiveTab('basic');
      this.submitted = false;
      return;
    }

    // ── Final user status ───────────────────────────────────────────────────
    let estadoFinal = formData.estadoUsuario;
    if (this.accion === '') {
      estadoFinal = formData.verificadoRuat ? EstadoUsuario.ACTIVO : EstadoUsuario.PENDIENTE_VERIFICACION;
    }

    // ── Attach back-references so backend can link FK relationships ─────────
    const contribuyenteUuid = formData.uuid;
    const contribuyenteRef = contribuyenteUuid
      ? ({ uuid: contribuyenteUuid } as Contribuyente)
      : undefined;

    const estudiantesPreparados = this.estudiantesTemporales.map((est) => ({
      ...est,
      ...(contribuyenteRef ? { contribuyenteDto: contribuyenteRef } : {}),
    }));
    const organizacionesPreparadas = this.organizacionesTemporales.map((org) => ({
      ...org,
      ...(contribuyenteRef ? { representanteDto: contribuyenteRef } : {}),
    }));

    const puedeReservarGratis =
      formData.esDeportistaElite ||
      estudiantesPreparados.length > 0 ||
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
      // Always send arrays (even empty) so the backend can clear removed records
      estudianteEnEscuelas: estudiantesPreparados,
      organizacionesRepresentadas: organizacionesPreparadas,
    };

    try {
      if (formData.uuid) {
        await this.updateData(datos, this.buildUpdateSuccessMessage());
      } else {
        if (!datos.verificadoRuat) {
          const ruatResponse = await this.registerContribuyenteInRuat(datos);
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

  // ─── RUAT Integration ─────────────────────────────────────────────────────

  private async registerContribuyenteInRuat(datos: Contribuyente): Promise<any> {
    const codigoAlcaldia =
      this.systemConfigList.find((c) => c.clave === ClaveConfiguracion.CODIGO_ALCALDIA_RUAT)?.valorTexto || '';
    const codigoUsuario =
      this.systemConfigList.find((c) => c.clave === ClaveConfiguracion.CODIGO_USUARIO_RUAT)?.valorTexto || '';
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
    const ruatResp = await this.registerContribuyente(codigoAlcaldia, codigoUsuario, ruatData);
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
      const codigoAlcaldia =
        this.systemConfigList.find((c) => c.clave === ClaveConfiguracion.CODIGO_ALCALDIA_RUAT)?.valorTexto || '';
      const ruatResp = await this.searchContribuyenteInRuat(codigoAlcaldia, this.searchRuatForm.value);
      if (this.ruatService.canContinue(ruatResp)) {
        this.ruatDataFound = ruatResp;
        this.fillFormFromRuat(ruatResp);
        this.notify('Datos encontrados en RUAT', 'success');
      } else {
        this.notify(this.ruatService.getResponseMessage(ruatResp, 'No se encontraron datos en RUAT. Puede continuar con registro manual'), 'info');
        this.fillFormManually();
      }
    } catch {
      this.notify('Error al consultar RUAT. Puede continuar con registro manual', 'warning');
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
      const codigoAlcaldia =
        this.systemConfigList.find((c) => c.clave === ClaveConfiguracion.CODIGO_ALCALDIA_RUAT)?.valorTexto || '';
      const codigoUsuario =
        this.systemConfigList.find((c) => c.clave === ClaveConfiguracion.CODIGO_USUARIO_RUAT)?.valorTexto || '';
      const ruatResp = await this.registerContribuyente(codigoAlcaldia, codigoUsuario, ruatData);
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
    } catch {
      this.notify('Error al verificar en RUAT', 'error');
    } finally {
      this.submitted = false;
    }
  }

  // ─── Email Verification ───────────────────────────────────────────────────

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
    // Ensure async emailTaken check has settled before sending
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

  // ─── Sanctions ────────────────────────────────────────────────────────────

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

  // ─── Block / Unblock ──────────────────────────────────────────────────────

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

  // ─── API Calls ────────────────────────────────────────────────────────────

  private getOrganizations(): void {
    this.organizationService.getAll().subscribe({
      next: (data: any) => { if (data['status'] === 'OK') this.organizationsList = data.payload; },
    });
  }

  private getEstudiantes(): void {
    this.estudianteEscuelaService.getAll().subscribe({
      next: (data: any) => { if (data['status'] === 'OK') this.estudiantesList = data.payload; },
    });
  }

  private getConfigsSystem(): void {
    this.systemConfigsService.getAll().subscribe({
      next: (data: any) => { if (data['status'] === 'OK') this.systemConfigList = data.payload; },
    });
  }

  private addData(datos: Contribuyente): Promise<any> {
    return new Promise((resolve, reject) => {
      this.contribuyentesService.save(datos).subscribe({
        next: (data: any) => {
          this.submitted = false;
          data['status'] === 'OK'
            ? resolve(data.payload)
            : (this.notify(this.getContribuyenteErrorMessage(data, datos), 'error'), resolve(null));
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
      next: (data: any) => {
        this.submitted = false;
        if (data.status === 'OK') {
          this.closeModal();
          this.emitList.emit();
          this.notify(data.payload, 'info');
        }
      },
      error: () => {
        this.submitted = false;
        this.notify('No se pudo eliminar el registro!', 'error');
      },
    });
  }

  private searchContribuyenteInRuat(codigoAlcaldia: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.ruatService
        .getContribuyentePorCi(codigoAlcaldia, data.numeroDocumento, data.tipoDocumento, data.expedido)
        .subscribe({
          next: (resp: any) => resolve(resp?.payload ?? null),
          error: (err) => reject(err),
        });
    });
  }

  private registerContribuyente(codigoAlcaldia: string, codigoUsuario: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.ruatService.registerContribuyente(codigoAlcaldia, codigoUsuario, data).subscribe({
        next: (resp: any) => {
          if (resp['status'] === 'OK') resolve(resp.payload);
          else { this.notify(this.ruatService.getResponseMessage(resp, 'No se pudo registrar en RUAT'), 'error'); resolve(null); }
        },
        error: (err) => reject(err),
      });
    });
  }

  // ─── Email Sending ────────────────────────────────────────────────────────

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

  // ─── Validators ───────────────────────────────────────────────────────────

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

  // ─── Private Helpers ──────────────────────────────────────────────────────

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
    const normalized = String(rawMessage).toLowerCase();

    if (
      error?.status === 422 ||
      error?.error?.status === 'UNPROCESSABLE_ENTITY' ||
      error?.status === 'UNPROCESSABLE_ENTITY' ||
      normalized.includes('constraintviolationexception') ||
      normalized.includes('constraint') ||
      normalized.includes('duplicate') ||
      normalized.includes('unique') ||
      normalized.includes('could not execute statement')
    ) {
      const existingMessage = this.getExistingContribuyenteMessage(datos);
      return existingMessage || 'Ya existe un contribuyente registrado con esos datos. Revise el documento, NIT, correo o usuario antes de guardar.';
    }

    return rawMessage || 'No se pudo guardar los datos del contribuyente. Intente nuevamente.';
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

  // ─── Display Helpers ──────────────────────────────────────────────────────

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

  // ─── Modal Close ──────────────────────────────────────────────────────────

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

  // ─── Notify ───────────────────────────────────────────────────────────────

  private notify(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    Swal.fire({ text: message, icon: type, timer: 5000, timerProgressBar: true });
  }
}
