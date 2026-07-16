import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  OnInit,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  AfterViewInit,
  CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule
} from '@angular/forms';
import { NgbModal, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { RuatRequestsService } from 'src/app/core/services/ruatRequest.service';
import { ReservaPeriodoService } from 'src/app/core/services/api/reserva-periodo.service';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { EstudianteEscuelaService } from 'src/app/core/services/api/estudianteEscuela.service';
import { OrganizacionService } from 'src/app/core/services/api/organizacion.service';
import { PagoService } from 'src/app/core/services/api/pago.service';

import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { Reserva } from 'src/app/core/models/reserva.model';
import { ReservaPeriodo } from 'src/app/core/models/reservaPeriodo.model';
import { Pago } from 'src/app/core/models/pago.model';
import { Organizacion } from 'src/app/core/models/organizacion.model';
import { EstudianteEscuela } from 'src/app/core/models/EstudianteEscuela.model';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';

import { TipoOrganizacion } from 'src/app/core/constants/Features';
import { EstadoReserva, EstadoValidacion, EstadoPago, StatusUtils } from 'src/app/core/constants/Estados';

import { TicketComponent } from '../../modules/reports/ticket/ticket.component';

type PeriodOption = { mes: number; año: number; label: string };

type ModalSelection = {
  student?: EstudianteEscuela;
  students: EstudianteEscuela[];
  payer?: Contribuyente;
  detailKeys: Set<string>;
  studentSearch: string;
  school?: Organizacion;
  baseReservation?: Reserva;
  existingReservationPeriod?: ReservaPeriodo;
  month?: number;
  year?: number;
};

type ModalCatalogs = {
  organizations: Organizacion[];
  schools: Organizacion[];
  recurrentReservations: Reserva[];
  filteredRecurrentReservations: Reserva[];
  periodRegistrations: ReservaPeriodo[];
  periods: PeriodOption[];
};

type DetailReturnState = {
  active: boolean;
  previousState?: {
    row?: Reserva;
    selection: ModalSelection;
    activeTab: number;
    createTab: number;
  };
};

@Component({
  selector: 'app-booking-periodo-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgbNavModule,
    FormsModule,
    TicketComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './modal-booking-school.component.html',
  styleUrl: './modal-booking-school.component.scss'
})
export class BookingPeriodoModalComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() accion!: string;
  @Input() row!: Reserva;
  @Input() canActivate: any[] = [];
  @Input() estudiantes: EstudianteEscuela[] = [];
  @Input() defaultPeriodo?: { mesFiltro?: number; anioFiltro?: number };

  @Output() emitList = new EventEmitter();
  @Output() reservaGenerada = new EventEmitter<Reserva>();

  @ViewChild('ticketModal') ticketModal!: TemplateRef<any>;
  @ViewChild('annularModal') annularModal!: TemplateRef<any>;

  isLoading = false;

  systemConfigList: { [key: string]: ConfiguracionSistema } = {};
  catalogs: ModalCatalogs = {
    organizations: [],
    schools: [],
    recurrentReservations: [],
    filteredRecurrentReservations: [],
    periodRegistrations: [],
    periods: []
  };

  selection: ModalSelection = {
    student: undefined,
    students: [],
    payer: undefined,
    detailKeys: new Set<string>(),
    studentSearch: '',
    school: undefined,
    baseReservation: undefined,
    existingReservationPeriod: undefined,
    month: undefined,
    year: undefined
  };

  detailReturn: DetailReturnState = {
    active: false,
    previousState: undefined
  };

  reservationForm!: FormGroup;
  validationForm!: FormGroup;
  validationSubmitted = false;

  userData!: any;
  userRole: 'Contribuyente' | 'Admin' | 'Encargado' = 'Contribuyente';

  motivo = '';
  observation = '';
  consultationResult?: any;
  isConsultingRuat = false;

  activeTab = 1;
  createTab = 1;

  historialFilter: 'todas' | 'pagadas' | 'pendientes' = 'todas';
  reservaBaseFilter: 'todas' | 'en_curso' | 'pagadas' | 'pendientes' | 'activas' = 'activas';
  hideCoveredReservations = false;

  years: number[] = [];
  months = [
    { value: 1, name: 'Enero' },
    { value: 2, name: 'Febrero' },
    { value: 3, name: 'Marzo' },
    { value: 4, name: 'Abril' },
    { value: 5, name: 'Mayo' },
    { value: 6, name: 'Junio' },
    { value: 7, name: 'Julio' },
    { value: 8, name: 'Agosto' },
    { value: 9, name: 'Septiembre' },
    { value: 10, name: 'Octubre' },
    { value: 11, name: 'Noviembre' },
    { value: 12, name: 'Diciembre' }
  ];

  EstadoReserva = EstadoReserva;
  EstadoPago = EstadoPago;

  constructor(
    private modalService: NgbModal,
    private formBuilder: FormBuilder,
    private authService: AuthenticationService,
    private ruatService: RuatRequestsService,
    private reservaService: ReservaService,
    private reservaPeriodoService: ReservaPeriodoService,
    private estudianteService: EstudianteEscuelaService,
    private organizationService: OrganizacionService,
    private pagoService: PagoService
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getUserRole();
    this.userData = this.authService.currentUser();
    if (this.userRole !== 'Contribuyente') {
      this.userData = this.userData.designacion.personaDto;
    }

    this.getConfigsSystem();
    this.getOrganizations();
    this.loadAllPeriodRegistrations();

    if (this.userRole === 'Contribuyente') {
      this.estudiantes = (this.estudiantes || []).filter(
        estudiante => estudiante.contribuyenteDto?.uuid === this.userData?.uuid
      );
    }

    if (!this.estudiantes.length) {
      this.getEstudiantes();
    }

    this.initializeForm();
    this.syncDefaultContribuyente();
    this.initializeYears();

    if (this.accion === 'show' && this.row) {
      this.loadReservaData();
      this.activeTab = 1;
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (!this.accion) return;
      switch (this.accion) {
        case 'annularModal':
          if (this.annularModal) {
            this.openDeleteModal(this.annularModal);
          }
          break;
        case 'ticketModal':
          this.openTicketModal(this.ticketModal);
          break;
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['row'] || changes['accion']) && this.accion === 'show' && this.row) {
      this.loadReservaData();
      this.activeTab = 1;
    }
  }
  
  get periodosUnicosActuales(): string[] {
    const detalles = this.row?.reservasPeriodoDtoList || [];
    return Array.from(new Set(
      detalles
        .map(detalle => this.formatPeriodoDetalle(detalle))
        .filter(periodo => periodo !== 'N/A')
    ));
  }
  get pagoPrincipal(): Pago | undefined {
    return (this.row?.pagosDtoList || [])[0];
  }
  get montoUnitarioActual(): number {
    const total = Number(this.row?.montoTotal || 0);
    const cantidad = this.row?.reservasPeriodoDtoList?.length || 1;
    return total / cantidad;
  }
  get responsablePagoActual(): Contribuyente | undefined {
    return this.row?.contribuyenteDto;
  }
  get observacionesActuales(): string {
    return (this.row as any)?.observaciones || '';
  }
  get validationFormControls() {
    return this.validationForm.controls;
  }
  get form() {
    return this.reservationForm.controls;
  }

  get estudiantesFiltrados(): EstudianteEscuela[] {
    const term = this.selection.studentSearch.trim().toLowerCase();
    return this.estudiantes
      .filter(estudiante => estudiante.activo !== false)
      .filter(estudiante => !term ||
        `${estudiante.nombreCompleto || ''} ${estudiante.matricula || ''} ${estudiante.numeroDocumento || ''}`
          .toLowerCase()
          .includes(term));
  }

  get contribuyentesDisponibles(): Contribuyente[] {
    if (this.userRole === 'Contribuyente') {
      return this.userData?.uuid ? [this.userData as Contribuyente] : [];
    }
    const candidates: (Contribuyente | undefined)[] = [
      this.selection.baseReservation?.contribuyenteDto,
      this.selection.school?.representanteDto,
      ...this.selection.students.map(estudiante => estudiante.contribuyenteDto)
    ];
    const unique = new Map<string, Contribuyente>();
    candidates.forEach(candidate => {
      if (candidate?.uuid) unique.set(candidate.uuid, candidate);
    });
    return Array.from(unique.values());
  }

  get selectedDetailsCount(): number {
    return this.getSelectedDetails().length;
  }

  get payerSectionTitle(): string {
    return this.userRole === 'Contribuyente'
      ? '2. Responsable de la tasa'
      : '2. Tutor responsable de la tasa';
  }

  get mensualidadesFiltradas(): ReservaPeriodo[] {
    let items = [...this.catalogs.periodRegistrations];

    if (this.selection.students.length) {
      const selected = new Set(this.selection.students.map(e => e.uuid));
      items = items.filter(m => selected.has(m.estudianteEscuelaDto?.uuid));
    }

    if (this.selection.school?.uuid) {
      items = items.filter(m => m.reservaDto?.organizacionDto?.uuid === this.selection.school?.uuid);
    }

    if (this.historialFilter === 'pagadas') {
      items = items.filter(
        m =>
          m.reservaDto?.estadoReserva === EstadoReserva.PAGADA ||
          m.reservaDto?.estadoReserva === EstadoReserva.COMPLETADA
      );
    }

    if (this.historialFilter === 'pendientes') {
      items = items.filter(m => m.reservaDto?.estadoReserva === EstadoReserva.PENDIENTE);
    }

    return items.sort((a, b) => {
      if (a.año !== b.año) return b.año - a.año;
      return b.mes - a.mes;
    });
  }

  /* =========================
     INIT
  ========================= */

  private initializeForm(): void {
    this.reservationForm = this.formBuilder.group({
      escuela: ['', Validators.required],
      reservaRecurrente: ['', Validators.required],
      contribuyente: ['', Validators.required],
      observaciones: ['']
    });
  }

  private initializeYears(): void {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 1; i <= currentYear + 1; i++) {
      this.years.push(i);
    }
  }

  private loadReservaData(): void {
    const reserva = this.row;
    const detalles = this.row?.reservasPeriodoDtoList || [];
    const primerDetalle = detalles[0];
    if (!reserva) return;

    this.selection.student = primerDetalle?.estudianteEscuelaDto;
    this.selection.school = reserva.organizacionDto;
    this.selection.baseReservation = reserva;
    this.selection.month = primerDetalle?.mes;
    this.selection.year = primerDetalle?.año;
  }

  /* =========================
     TABS
  ========================= */

  setActiveTab(tab: number): void {
    this.activeTab = tab;
  }

  setCreateTab(tab: number): void {
    this.createTab = tab;
  }

  /* =========================
     CREATE FLOW
  ========================= */

  onEstudianteChange(event: Event): void {
    const estudianteUuid = (event.target as HTMLSelectElement).value;
    const estudiante = this.estudiantes.find(e => e.uuid === estudianteUuid);
    if (estudiante) {
      this.onEstudianteSelected(estudiante);
    }
  }

  onEstudianteSelected(estudiante: EstudianteEscuela): void {
    this.selection.student = estudiante;
    this.reservationForm.patchValue({ estudiante: estudiante.uuid });

    this.catalogs.schools = this.catalogs.organizations.filter(
      org => org.tipoOrganizacion === TipoOrganizacion.ESCUELA_MUNICIPAL && org.activo
    );

    this.loadPeriodsByStudent();

    this.selection.school = undefined;
    this.selection.baseReservation = undefined;
    this.selection.existingReservationPeriod = undefined;
    this.catalogs.recurrentReservations = [];
    this.catalogs.filteredRecurrentReservations = [];
    this.catalogs.periods = [];

    this.reservationForm.patchValue({
      escuela: '',
      reservaRecurrente: ''
    });

    this.createTab = 1;
  }

  onEscuelaChange(event: Event): void {
    const escuelaUuid = (event.target as HTMLSelectElement).value;
    const escuela = this.catalogs.schools.find(e => e.uuid === escuelaUuid);
    if (escuela) {
      this.onEscuelaSelected(escuela);
    }
  }

  onEscuelaSelected(escuela: Organizacion): void {
    this.selection.school = escuela;
    this.reservationForm.patchValue({ escuela: escuela.uuid });
    this.selection.baseReservation = undefined;
    this.selection.existingReservationPeriod = undefined;
    this.catalogs.periods = [];
    this.selection.students = [];
    this.selection.detailKeys.clear();
    this.reservationForm.patchValue({ reservaRecurrente: '' });
    this.syncDefaultContribuyente();
    this.loadReservationsFromSchool(escuela);
  }

  onReservaRecurrenteChange(event: Event): void {
    const reservaUuid = (event.target as HTMLSelectElement).value;
    const reserva = this.catalogs.filteredRecurrentReservations.find(r => r.uuid === reservaUuid);

    if (reserva) {
      this.selectReservaRecurrente(reserva);
    }
  }

  onPeriodoChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (!value) return;

    const [yearStr, monthStr] = value.split('-');
    this.selection.year = Number(yearStr);
    this.selection.month = Number(monthStr);

    this.reservationForm.patchValue({
      año: this.selection.year,
      mes: this.selection.month
    });

    this.onMonthYearChange();
  }

  onMonthChange(event: Event): void {
    this.selection.month = parseInt((event.target as HTMLSelectElement).value, 10);
    this.reservationForm.patchValue({ mes: this.selection.month });
    this.onMonthYearChange();
  }

  onYearChange(event: Event): void {
    this.selection.year = parseInt((event.target as HTMLSelectElement).value, 10);
    this.reservationForm.patchValue({ año: this.selection.year });
    this.onMonthYearChange();
  }

  onMonthYearChange(): void {
    this.selection.month = this.reservationForm.get('mes')?.value;
    this.selection.year = this.reservationForm.get('año')?.value;
    this.resolveMensualidadExistente();
  }

  private loadReservationsFromSchool(escuela: Organizacion): void {
    const allReservas = escuela.reservasDtoList || [];

    this.catalogs.recurrentReservations = allReservas.filter(
      reserva =>
        reserva.tipoReserva === 'recurrente' &&
        reserva.estadoValidacion === EstadoValidacion.APROBADA &&
        reserva.reservaRecurrenteDto?.activo === true &&
        !!reserva.reservaRecurrenteDto?.fechaInicio &&
        !!reserva.reservaRecurrenteDto?.fechaFin
    );

    this.applyReservaBaseFilters();

    this.selection.baseReservation = undefined;
    this.reservationForm.patchValue({ reservaRecurrente: '' });

    this.autoSelectBestReservaBase();
  }

  applyReservaBaseFilters(): void {
    let list = [...this.catalogs.recurrentReservations];

    switch (this.reservaBaseFilter) {
      case 'en_curso':
        list = list.filter(r =>
          this.isDateWithinReserva(this.getReferenceDateForReservationFilter(), r)
        );
        break;
      case 'pagadas':
        list = list.filter(
          r =>
            r.estadoReserva === EstadoReserva.PAGADA ||
            r.estadoReserva === EstadoReserva.COMPLETADA
        );
        break;
      case 'pendientes':
        list = list.filter(r => r.estadoReserva === EstadoReserva.PENDIENTE);
        break;
      case 'activas':
        list = list.filter(
          r =>
            r.estadoReserva !== EstadoReserva.CANCELADA &&
            r.estadoReserva !== EstadoReserva.NO_SHOW
        );
        break;
      default:
        break;
    }

    if (this.hideCoveredReservations) {
      list = list.filter(r => !this.isReservaFullyCoveredForStudent(r));
    }

    this.catalogs.filteredRecurrentReservations = list;
  }

  private getReferenceDateForReservationFilter(): Date {
    if (this.selection.year && this.selection.month) {
      return new Date(this.selection.year, this.selection.month - 1, 1);
    }
    return new Date();
  }

  private autoSelectBestReservaBase(): void {
    if (!this.catalogs.filteredRecurrentReservations.length) return;

    const referenceDate = this.getReferenceDateForReservationFilter();
    const matchingReserva = this.catalogs.filteredRecurrentReservations.find(r =>
      this.isDateWithinReserva(referenceDate, r)
    );

    if (matchingReserva) {
      this.selectReservaRecurrente(matchingReserva);
      return;
    }

    this.selectReservaRecurrente(this.catalogs.filteredRecurrentReservations[0]);
  }

  private selectReservaRecurrente(reserva: Reserva): void {
    this.selection.baseReservation = reserva;
    this.reservationForm.patchValue({ reservaRecurrente: reserva.uuid });
    this.generateAvailablePeriods();
    this.applyDefaultPeriodoSelection();
    this.selection.detailKeys.clear();
    if (this.userRole !== 'Contribuyente') {
      this.selection.payer = undefined;
    }
    this.syncDefaultContribuyente();
  }

  private generateAvailablePeriods(): void {
    this.catalogs.periods = [];
    if (!this.selection.baseReservation?.reservaRecurrenteDto) return;

    const inicio = this.parseLocalDate(this.selection.baseReservation.reservaRecurrenteDto.fechaInicio);
    const fin = this.parseLocalDate(this.selection.baseReservation.reservaRecurrenteDto.fechaFin);

    let current = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const end = new Date(fin.getFullYear(), fin.getMonth(), 1);

    while (current <= end) {
      const mes = current.getMonth() + 1;
      const año = current.getFullYear();

      this.catalogs.periods.push({
        mes,
        año,
        label: `${this.getMonthName(mes)} ${año}`
      });

      current.setMonth(current.getMonth() + 1);
    }
  }

  private ensureSelectedPeriodoIsValid(): void {
    if (!this.catalogs.periods.length) {
      this.selection.month = undefined;
      this.selection.year = undefined;
      this.reservationForm.patchValue({ mes: '', año: '' });
      return;
    }

    const isValid = this.catalogs.periods.some(
      p => p.mes === this.selection.month && p.año === this.selection.year
    );

    if (!isValid) {
      const first = this.catalogs.periods[0];
      this.selection.month = first.mes;
      this.selection.year = first.año;
      this.reservationForm.patchValue({
        mes: first.mes,
        año: first.año
      });
    }
  }

  private resolveMensualidadExistente(): void {
    this.selection.existingReservationPeriod = this.getExistingMensualidad() || undefined;
  }

  private getExistingMensualidad(): ReservaPeriodo | null {
    if (!this.selection.student || !this.selection.school || !this.selection.month || !this.selection.year) {
      return null;
    }

    return (
      this.catalogs.periodRegistrations.find(
        m =>
          m.mes === this.selection.month &&
          m.año === this.selection.year &&
          m.estudianteEscuelaDto?.uuid === this.selection.student?.uuid &&
          m.reservaDto?.organizacionDto?.uuid === this.selection.school?.uuid
      ) || null
    );
  }

  private hasExistingMensualidad(): boolean {
    return !!this.getExistingMensualidad();
  }

  viewMensualidadExistente(): void {
    if (!this.selection.existingReservationPeriod) return;

    this.detailReturn.active = this.accion === '';
    if (this.detailReturn.active) {
      this.detailReturn.previousState = {
        row: this.row,
        selection: {
          ...this.selection,
          students: [...this.selection.students],
          detailKeys: new Set(this.selection.detailKeys)
        },
        activeTab: this.activeTab,
        createTab: this.createTab
      };
    }
    // show the parent Reserva (modal expects a Reserva of tipo 'periodo')
    this.row = this.selection.existingReservationPeriod.reservaDto as Reserva;
    this.accion = 'show';
    this.activeTab = 1;
    this.loadReservaData();
  }

  backToCreateFromDetail(): void {
    if (!this.detailReturn.active) return;

    const previousState = this.detailReturn.previousState;
    this.accion = '';
    this.row = previousState?.row as Reserva;
    if (previousState?.selection) {
      this.selection = {
        ...previousState.selection,
        students: [...previousState.selection.students],
        detailKeys: new Set(previousState.selection.detailKeys)
      };
    }
    this.activeTab = previousState?.activeTab || 1;
    this.createTab = previousState?.createTab || 1;
    this.detailReturn.active = false;
    this.detailReturn.previousState = undefined;
    this.resolveMensualidadExistente();
  }

  async onSubmit(): Promise<void> {
    if (this.reservationForm.invalid) {
      Swal.fire({
        title: 'Formulario incompleto',
        text: 'Por favor complete todos los campos requeridos.',
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    if (!this.selection.school || !this.selection.baseReservation || !this.selection.payer) {
      Swal.fire({
        title: 'Datos incompletos',
        text: 'Seleccione escuela, reserva recurrente y responsable de la tasa.',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    if (!this.getSelectedDetails().length) {
      Swal.fire({
        title: 'Sin mensualidades seleccionadas',
        text: 'Seleccione al menos una combinación de estudiante y período.',
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    if (this.userRole === 'Contribuyente' && (
      this.selection.payer.uuid !== this.userData?.uuid ||
      this.selection.students.some(
        estudiante => estudiante.contribuyenteDto?.uuid !== this.userData?.uuid
      )
    )) {
      this.handleError(
        'Operación no permitida',
        'Un contribuyente solo puede generar tasas a su nombre para estudiantes que estén a su cargo.'
      );
      return;
    }

    const tarifa = this.selection.baseReservation.tarifaDto;
    if (!tarifa?.uuid) {
      this.handleError(
        'Tarifa no configurada',
        'La reserva recurrente seleccionada no tiene una tarifa asociada y el backend la requiere.'
      );
      return;
    }

    const configurationErrors = this.validateMensualidadTariffConfiguration();
    if (configurationErrors.length > 0) {
      this.handleError(
        'Configuración de mensualidad inválida',
        configurationErrors.join('\n')
      );
      return;
    }

    try {
      this.isLoading = true;

      const reservaData = this.prepareReservaPeriodoData();
      const numeroTasa = await this.createTasaInRuat(reservaData);

      reservaData.numeroTasa = numeroTasa;

      const reservaGuardada = await this.saveReservaPeriodo(reservaData);

      this.isLoading = false;
      this.notify('Mensualidad registrada correctamente.', 'success');
      this.emitList.emit();
      this.reservaGenerada.emit(reservaGuardada);
      this.onCloseModal();
    } catch (error: any) {
      this.isLoading = false;
      this.handleError('Error', error?.message || 'No se pudo registrar la mensualidad.');
    }
  }

  /* =========================
     VALIDATE / SHOW ACTIONS
  ========================= */

  validateReservation(): void {
    this.validationSubmitted = true;

    if (!this.validationForm.valid) {
      this.notify('Por favor complete todos los campos de validación.', 'error');
      return;
    }

    this.isLoading = true;

    const validationData = this.validationForm.value;
    const isApproved = validationData.validationStatus === EstadoValidacion.APROBADA;
    const reservaUuid = this.row?.uuid;

    if (!reservaUuid) {
      this.isLoading = false;
      this.notify('No se pudo identificar la reserva.', 'error');
      return;
    }

    if (isApproved) {
      this.approveReserva(reservaUuid);
    } else {
      this.rejectReserva(reservaUuid, validationData.validationObservation);
    }
  }

  canValidateReservation(): boolean {
    const estadoValidacion = this.row?.estadoValidacion;
    const estadoReserva = this.row?.estadoReserva;

    return (
      estadoValidacion === EstadoValidacion.PENDIENTE &&
      estadoReserva === EstadoReserva.SOLICITADA &&
      this.canActivate?.includes('VALIDAR')
    );
  }

  canCancelReservation(): boolean {
    const estado = this.row?.estadoReserva;

    return (
      (estado === EstadoReserva.SOLICITADA || estado === EstadoReserva.PENDIENTE) &&
      this.canActivate?.includes('ANULAR')
    );
  }

  openDeleteModal(content: any): void {
    this.motivo = '';
    this.observation = '';
    this.modalService.open(content, { centered: true, size: 'md', backdrop: 'static' });
  }

  openTicketModal(content: any): void {
    this.modalService.open(content, { centered: true, size: 'md' });
  }

  annularData(formValues: any): void {
    const reserva = this.row;
    if (!formValues || !reserva) {
      this.notify('No se pudo obtener los datos de la mensualidad.', 'error');
      return;
    }

    const requestData = {
      numeroTasa: reserva.numeroTasa,
      motivo: formValues.motivo,
      observacion: formValues.observation
    };

    this.isLoading = true;

    this.ruatService.cancelTasa(requestData).subscribe({
      next: (resp: any) => {
        if (resp.status === 'OK') {
          this.cancelReservaLocal(
            reserva,
            requestData.motivo,
            this.ruatService.getResponseMessage(resp, 'Mensualidad anulada correctamente.'),
            'success'
          );
          return;
        }

        if (this.isRuatAlreadyAnnulmentRegistered(resp)) {
          this.cancelReservaLocal(
            reserva,
            requestData.motivo,
            this.ruatService.getResponseMessage(resp, 'La tasa ya tiene registrado un trámite de anulación. Se actualizó la mensualidad localmente.'),
            'warning'
          );
          return;
        }

        this.isLoading = false;
        this.notify(this.ruatService.getResponseMessage(resp, 'Error al anular en RUAT.'), 'error');
      },
      error: (error) => {
        if (this.isRuatAlreadyAnnulmentRegistered(error)) {
          this.cancelReservaLocal(
            reserva,
            requestData.motivo,
            this.ruatService.getResponseMessage(error, 'La tasa ya tiene registrado un trámite de anulación. Se actualizó la mensualidad localmente.'),
            'warning'
          );
          return;
        }

        this.isLoading = false;
        this.notify(this.ruatService.getResponseMessage(error, 'Error al realizar la anulación en RUAT.'), 'error');
      }
    });
  }

  private isRuatAlreadyAnnulmentRegistered(response: any): boolean {
    const message = this.ruatService.getResponseMessage(response, '').toLowerCase();
    const payload = JSON.stringify(this.ruatService.getResponsePayload(response) || {}).toLowerCase();
    return `${message} ${payload}`.includes('trámite de anulación') ||
      `${message} ${payload}`.includes('tramite de anulacion');
  }

  private cancelReservaLocal(
    reserva: Reserva,
    motivo: string,
    successMessage: string,
    notificationType: 'success' | 'warning'
  ): void {
    if (!reserva.uuid) {
      this.isLoading = false;
      this.notify('No se pudo identificar la mensualidad para actualizarla localmente.', 'error');
      return;
    }

    this.reservaService.cancelarReserva(reserva.uuid, motivo || 'Anulación de mensualidad').subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response?.status && response.status !== 'OK') {
          this.notify(response?.message || response?.payload || 'No se pudo actualizar la mensualidad localmente.', 'error');
          return;
        }
        this.notify(successMessage, notificationType);
        this.emitList.emit();
        this.onCloseModal();
      },
      error: () => {
        this.isLoading = false;
        this.notify(
          'La anulación fue aceptada por RUAT, pero hubo un error al actualizar la mensualidad localmente.',
          'warning'
        );
      }
    });
  }

  /* =========================
     FORMATTING
  ========================= */

  getMonthName(month: number): string {
    return this.months.find(m => m.value === month)?.name || '';
  }

  getReservaDetalles(): ReservaPeriodo[] {
    return this.row?.reservasPeriodoDtoList || [];
  }

  canConsultPayment(): boolean {
    return !!this.row?.numeroTasa &&
      this.canActivate?.includes('ACTUALIZAR') &&
      this.row?.estadoReserva !== EstadoReserva.CANCELADA;
  }

  async consultPaymentInModal(): Promise<void> {
    if (!this.row?.numeroTasa) {
      this.notify('La mensualidad no tiene número de tasa para consultar.', 'warning');
      return;
    }

    this.isConsultingRuat = true;
    this.consultationResult = undefined;
    this.activeTab = 2;

    try {
      const resp: any = await this.ruatService
        .consultaPagoTasa(this.row.numeroTasa)
        .toPromise();

      if (resp?.status !== 'OK') {
        this.consultationResult = {
          type: resp?.status === 'NOT_FOUND' ? 'info' : 'warning',
          text: this.ruatService.getResponseMessage(resp, 'No se encontraron pagos realizados para esta tasa.')
        };
        return;
      }

      if (!this.ruatService.canContinue(resp)) {
        this.consultationResult = {
          type: 'warning',
          text: this.ruatService.getResponseMessage(resp, 'No se puede continuar con el flujo.')
        };
        return;
      }

      const pagoTasa = this.ruatService.getResponseData(resp)?.pagoTasa;
      if (!pagoTasa) {
        this.consultationResult = {
          type: 'info',
          text: this.ruatService.getResponseMessage(resp, 'No se encontraron datos de pago.')
        };
        return;
      }

      if (!this.row.pagosDtoList?.some(pago =>
        pago.folio === pagoTasa.folio && pago.numeroTasa === pagoTasa.numeroTasa
      )) {
        await this.pagoService.save({
          numeroTasa: pagoTasa.numeroTasa,
          tipoTasa: 'TO',
          folio: pagoTasa.folio,
          formaPago: pagoTasa.formaPago,
          fechaPago: this.parseRuatPaymentDate(pagoTasa.fechaPago),
          entidadFinanciera: pagoTasa.entidadFinanciera,
          montoPagado: parseFloat(pagoTasa.montoPago) || 0,
          observaciones: pagoTasa.observacion,
          estadoPago: EstadoPago.PAGADO,
          ultimaConsulta: new Date(),
          respuestaCompletaRuat: JSON.stringify(resp),
          reservaDto: { uuid: this.row.uuid }
        }).toPromise();
      }

      this.consultationResult = {
        type: 'success',
        text: this.ruatService.getResponseMessage(resp, 'Pago verificado y registrado correctamente.'),
        pagoData: pagoTasa
      };
      this.emitList.emit();
    } catch (error) {
      this.consultationResult = {
        type: 'error',
        text: this.ruatService.getResponseMessage(error, 'Error al realizar la consulta al RUAT.')
      };
    } finally {
      this.isConsultingRuat = false;
    }
  }

  private parseRuatPaymentDate(fechaPago: string): Date | null {
    if (!fechaPago || !/^\d{2}\/\d{2}\/\d{4}$/.test(fechaPago)) {
      return null;
    }
    const parts = fechaPago.split('/').map(Number);
    return new Date(parts[2], parts[1] - 1, parts[0], 12, 0, 0, 0);
  }

  formatPeriodoDetalle(detalle?: ReservaPeriodo): string {
    if (!detalle?.mes || !detalle?.año) {
      return 'N/A';
    }
    return `${this.getMonthName(detalle.mes)} ${detalle.año}`;
  }

  getDocumentoContribuyente(contribuyente?: Contribuyente): string {
    if (!contribuyente) {
      return 'N/A';
    }
    return `${contribuyente.tipoDocumento || ''} ${contribuyente.numeroDocumento || 'N/A'}`.trim();
  }

  

  getPeriodosActualesResumen(): string {
    return this.periodosUnicosActuales.length ? this.periodosUnicosActuales.join(', ') : 'N/A';
  }

  getEstadoPagoActual(): string {
    return this.pagoPrincipal?.estadoPago || 'SIN PAGO';
  }

  getTotalAmount(): number {
    return (this.selection.school?.tarifaMensual || 0) * this.getSelectedDetails().length;
  }

  private getDefaultPeriodoMatch(): { mes: number; año: number; label: string } | undefined {
    if (!this.defaultPeriodo?.mesFiltro || !this.defaultPeriodo?.anioFiltro) {
      return undefined;
    }
    return this.catalogs.periods.find(periodo =>
      periodo.mes === Number(this.defaultPeriodo?.mesFiltro) &&
      periodo.año === Number(this.defaultPeriodo?.anioFiltro)
    );
  }

  private applyDefaultPeriodoSelection(): void {
    const defaultPeriodo = this.getDefaultPeriodoMatch();
    if (!defaultPeriodo) {
      return;
    }
    this.selection.month = defaultPeriodo.mes;
    this.selection.year = defaultPeriodo.año;
  }

  private getMonthlyAmount(): number {
    return Number(this.selection.school?.tarifaMensual || 0);
  }

  private validateMensualidadTariffConfiguration(): string[] {
    const errors: string[] = [];
    const tarifa = this.selection.baseReservation?.tarifaDto;
    const clasificadorRuat = tarifa?.clasificadorRuatDto;
    const monthlyAmount = this.getMonthlyAmount();
    const tariffBaseAmount = Number(tarifa?.precioBase || 0);

    if (!tarifa?.uuid) {
      errors.push('La reserva recurrente base no tiene una tarifa configurada.');
    }

    if (tarifa?.tipoCobro !== 'mensualidad') {
      errors.push('La tarifa de la reserva base debe ser de tipo "mensualidad" para registrar pagos mensuales de escuela.');
    }

    if (!clasificadorRuat?.codigo) {
      errors.push('La tarifa mensual no tiene código clasificador RUAT.');
    }

    if (!clasificadorRuat?.tipoArancel) {
      errors.push('La tarifa mensual no tiene tipo de arancel RUAT.');
    }

    if (clasificadorRuat && clasificadorRuat.activo === false) {
      errors.push('El clasificador RUAT de la tarifa mensual está inactivo.');
    }

    if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0) {
      errors.push('La escuela debe tener una tarifa mensual mayor a cero.');
    }

    if (!Number.isFinite(tariffBaseAmount) || tariffBaseAmount <= 0) {
      errors.push('La tarifa base mensual debe ser mayor a cero.');
    }

    if (
      Number.isFinite(monthlyAmount) &&
      Number.isFinite(tariffBaseAmount) &&
      monthlyAmount > 0 &&
      tariffBaseAmount > 0 &&
      monthlyAmount !== tariffBaseAmount
    ) {
      errors.push(`La tarifa mensual de la escuela (${monthlyAmount.toFixed(2)} Bs.) no coincide con la tarifa base mensual seleccionada (${tariffBaseAmount.toFixed(2)} Bs.).`);
    }

    return errors;
  }

  getReservaDisplayInfo(reserva: Reserva): string {
    const recurrente = reserva.reservaRecurrenteDto;
    if (!recurrente) return 'Reserva sin información';

    const campo = reserva.campoDeportivoDto?.nombre || 'Campo no especificado';
    const dias = recurrente.diasSemana || 'Días no especificados';
    const fechaInicio = this.parseLocalDate(recurrente.fechaInicio).toLocaleDateString('es-BO');
    const fechaFin = this.parseLocalDate(recurrente.fechaFin).toLocaleDateString('es-BO');

    return `${campo} - ${dias} (${fechaInicio} a ${fechaFin})`;
  }

  private parseLocalDate(value: Date | string | undefined): Date {
    if (!value) {
      return new Date();
    }
    if (typeof value === 'string') {
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      }
    }
    return new Date(value);
  }

  formatLocalDate(value: Date | string | undefined): string {
    return this.parseLocalDate(value).toLocaleDateString('es-BO');
  }

  getStatusBadgeClass(estado: string | undefined): string {
    return StatusUtils.getStatusBadgeClass(estado || '');
  }

  getStatusAlertClass(estado: string | undefined): string {
    return StatusUtils.getStatusAlertClass(estado || '');
  }

  getStatusDescription(estado: string | undefined): string {
    const descriptions: Record<string, string> = {
      [EstadoReserva.SOLICITADA]: 'Esperando validación administrativa',
      [EstadoReserva.PENDIENTE]: 'Mensualidad aprobada, pendiente de pago',
      [EstadoReserva.PAGADA]: 'Pago confirmado',
      [EstadoReserva.EN_CURSO]: 'Mensualidad en curso',
      [EstadoReserva.COMPLETADA]: 'Mensualidad completada',
      [EstadoReserva.CANCELADA]: 'Mensualidad cancelada',
      [EstadoReserva.NO_SHOW]: 'Sin uso registrado'
    };

    return descriptions[estado || ''] || 'Estado desconocido';
  }

  getValidationBadgeClass(estado: string): string {
    return StatusUtils.getStatusBadgeClass(estado);
  }

  getValidationDescription(estado: string): string {
    const descriptions: { [key: string]: string } = {
      PENDIENTE: 'Esperando validación administrativa',
      APROBADA: 'Mensualidad validada y aprobada',
      RECHAZADA: 'Mensualidad rechazada por validación'
    };

    return descriptions[estado] || 'Estado de validación desconocido';
  }

  /* =========================
     SERVICES / REQUESTS
  ========================= */

  private loadPeriodsByStudent(): void {
    if (!this.selection.student?.uuid) return;

    this.reservaPeriodoService.getByEstudiante(this.selection.student.uuid).subscribe({
      next: (response: any) => {
        if (response?.status === 'OK') {
          this.catalogs.periodRegistrations = Array.isArray(response.payload)
            ? response.payload
            : (response.payload?.content || []);
        } else {
          this.catalogs.periodRegistrations = [];
        }

        this.resolveMensualidadExistente();
      },
      error: () => {
        this.catalogs.periodRegistrations = [];
        this.selection.existingReservationPeriod = undefined;
      }
    });
  }

  private loadAllPeriodRegistrations(): void {
    this.reservaPeriodoService.getAllWithoutPagination().subscribe({
      next: (response: any) => {
        if (response?.status === 'OK') {
          this.catalogs.periodRegistrations = Array.isArray(response.payload)
            ? response.payload
            : (response.payload?.content || []);
        }
      },
      error: () => {
        this.catalogs.periodRegistrations = [];
      }
    });
  }

  private prepareReservaPeriodoData(): any {
    const formValue = this.reservationForm.value;
    const detalles = this.getSelectedDetails();

    return {
      fechaCreacion: new Date().toISOString(),
      fechaReserva: new Date().toISOString(),
      estadoValidacion: EstadoValidacion.APROBADA,
      estadoReserva: EstadoReserva.PENDIENTE,
      tipoReserva: 'periodo',
      montoTotal: this.getTotalAmount(),
      clasificadorRuatId:
        this.selection.baseReservation?.tarifaDto?.clasificadorRuatDto?.uuid,
      observaciones:
        formValue.observaciones ||
        `${detalles.length} mensualidad(es) - ${this.selection.school?.nombre}`,

      esReservaGratuita: false,
      motivoGratuidad: null,

      campoDeportivoDto: {
        uuid: this.selection.baseReservation?.campoDeportivoDto?.uuid
      },
      contribuyenteDto: {
        uuid: this.selection.payer?.uuid
      },
      organizacionDto: {
        uuid: this.selection.school?.uuid
      },
      tarifaDto: {
        uuid: this.selection.baseReservation?.tarifaDto?.uuid
      },
      reservasPeriodoDtoList: detalles
    };
  }

  onContribuyenteChange(event: Event): void {
    const uuid = (event.target as HTMLSelectElement).value;
    this.selection.payer = this.contribuyentesDisponibles.find(item => item.uuid === uuid);
  }

  toggleEstudiante(estudiante: EstudianteEscuela, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selection.students.some(item => item.uuid === estudiante.uuid)) {
        this.selection.students = [...this.selection.students, estudiante];
      }
      const defaultPeriodo = this.getDefaultPeriodoMatch();
      if (defaultPeriodo && !this.isPeriodoRegistrado(estudiante, defaultPeriodo)) {
        this.selection.detailKeys.add(this.getDetailKey(estudiante.uuid!, defaultPeriodo.año, defaultPeriodo.mes));
      }
    } else {
      this.selection.students = this.selection.students.filter(item => item.uuid !== estudiante.uuid);
      const prefix = `${estudiante.uuid}|`;
      Array.from(this.selection.detailKeys)
        .filter(key => key.startsWith(prefix))
        .forEach(key => this.selection.detailKeys.delete(key));
    }
    this.syncDefaultContribuyente();
  }

  isEstudianteSelected(estudiante: EstudianteEscuela): boolean {
    return this.selection.students.some(item => item.uuid === estudiante.uuid);
  }

  togglePeriodo(estudiante: EstudianteEscuela, periodo: { mes: number; año: number }, event: Event): void {
    const key = this.getDetailKey(estudiante.uuid!, periodo.año, periodo.mes);
    if ((event.target as HTMLInputElement).checked) {
      this.selection.detailKeys.add(key);
    } else {
      this.selection.detailKeys.delete(key);
    }
  }

  isPeriodoSelected(estudiante: EstudianteEscuela, periodo: { mes: number; año: number }): boolean {
    return this.selection.detailKeys.has(this.getDetailKey(estudiante.uuid!, periodo.año, periodo.mes));
  }

  isPeriodoRegistrado(estudiante: EstudianteEscuela, periodo: { mes: number; año: number }): boolean {
    return this.catalogs.periodRegistrations.some(item =>
      item.estudianteEscuelaDto?.uuid === estudiante.uuid &&
      item.reservaDto?.organizacionDto?.uuid === this.selection.school?.uuid &&
      item.mes === periodo.mes &&
      item.año === periodo.año &&
      item.reservaDto?.estadoReserva !== EstadoReserva.CANCELADA
    );
  }

  selectAvailablePeriods(estudiante: EstudianteEscuela): void {
    this.catalogs.periods.forEach(periodo => {
      if (!this.isPeriodoRegistrado(estudiante, periodo)) {
        this.selection.detailKeys.add(this.getDetailKey(estudiante.uuid!, periodo.año, periodo.mes));
      }
    });
  }

  clearStudentPeriods(estudiante: EstudianteEscuela): void {
    const prefix = `${estudiante.uuid}|`;
    Array.from(this.selection.detailKeys)
      .filter(key => key.startsWith(prefix))
      .forEach(key => this.selection.detailKeys.delete(key));
  }

  getSelectedPeriodCount(estudiante: EstudianteEscuela): number {
    const prefix = `${estudiante.uuid}|`;
    return Array.from(this.selection.detailKeys).filter(key => key.startsWith(prefix)).length;
  }

  private getDetailKey(estudianteUuid: string, año: number, mes: number): string {
    return `${estudianteUuid}|${año}-${mes}`;
  }

  private getSelectedDetails(): any[] {
    const details: any[] = [];
    this.selection.students.forEach(estudiante => {
      this.catalogs.periods.forEach(periodo => {
        if (this.isPeriodoSelected(estudiante, periodo)) {
          details.push({
            mes: periodo.mes,
            año: periodo.año,
            matricula: estudiante.matricula,
            disciplina: this.selection.school?.disciplina,
            entrenador: this.selection.school?.entrenador,
            estudianteEscuelaDto: { uuid: estudiante.uuid }
          });
        }
      });
    });
    return details;
  }

  private syncDefaultContribuyente(): void {
    const candidates = this.contribuyentesDisponibles;
    if (!this.selection.payer || !candidates.some(item => item.uuid === this.selection.payer?.uuid)) {
      this.selection.payer = candidates[0];
      this.reservationForm.patchValue({ contribuyente: this.selection.payer?.uuid || '' });
    }
  }

  private createTasaInRuat(reservaData: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const contribuyente = this.selection.payer;

      if (!contribuyente?.codigoContribuyente) {
        reject(new Error('Falta el código de contribuyente para registrar en RUAT.'));
        return;
      }

      const clasificadorRuat =
        this.selection.baseReservation?.tarifaDto?.clasificadorRuatDto;

      if (!clasificadorRuat?.codigo || !clasificadorRuat?.tipoArancel) {
        reject(new Error('La tarifa no tiene un clasificador RUAT válido.'));
        return;
      }

      const monthlyAmount = this.getMonthlyAmount();
      const selectedDetailsCount = this.getSelectedDetails().length;
      const totalAmount = monthlyAmount * selectedDetailsCount;

      const ruatData = {
        codigoContribuyente: contribuyente.codigoContribuyente,
        datosConcepto: [
          {
            numero: '1',
            codigoClasificador: clasificadorRuat.codigo,
            tipoArancel: clasificadorRuat.tipoArancel,
            monto: totalAmount.toFixed(2)
          }
        ],
        observacion: 'Reserva de Cancha Deportiva GAMQ'
      };

      const ruatValidationErrors = this.validateRuatRegistrationData(ruatData);
      if (ruatValidationErrors.length > 0) {
        reject(new Error(ruatValidationErrors.join('\n')));
        return;
      }

      this.ruatService.createTasa(ruatData, contribuyente.codigoContribuyente).subscribe({
        next: (response: any) => {
          if (response?.status !== 'OK') {
            reject(
              new Error(
                this.ruatService.getResponseMessage(response, 'No se pudo registrar la tasa en RUAT.')
              )
            );
            return;
          }

          const ruatData = this.ruatService.getResponseData(response);
          if (!this.ruatService.canContinue(response) || !ruatData?.numeroTasa) {
            reject(
              new Error(
                this.ruatService.getResponseMessage(response, 'RUAT no devolvió un número de tasa válido.')
              )
            );
            return;
          }

          resolve(ruatData.numeroTasa);
        },
        error: (error) => {
          reject(
            new Error(
              this.ruatService.getResponseMessage(error, 'Error de conexión con RUAT.')
            )
          );
        }
      });
    });
  }

  private saveReservaPeriodo(reservaData: any): Promise<Reserva> {
    return new Promise((resolve, reject) => {
      this.reservaService.create(reservaData).subscribe({
        next: (response: any) => {
          if (response?.status === 'OK') {
            resolve(response.payload);
          } else {
            reject(new Error(response?.message || response?.payload || 'No se pudo registrar la mensualidad.'));
          }
        },
        error: (error) => {
          reject(
            new Error(
              error?.error?.message ||
              error?.error?.payload ||
              error?.message ||
              'No se pudo registrar la mensualidad.'
            )
          );
        }
      });
    });
  }

  private validateRuatRegistrationData(ruatData: any): string[] {
    const errors: string[] = [];
    const concepts = Array.isArray(ruatData?.datosConcepto) ? ruatData.datosConcepto : [];

    if (!ruatData?.codigoContribuyente) {
      errors.push('Falta el código de contribuyente RUAT.');
    }

    if (concepts.length === 0) {
      errors.push('La tasa debe tener al menos un concepto.');
    }

    concepts.forEach((concepto: any, index: number) => {
      const item = `Concepto ${index + 1}`;
      const amount = Number(String(concepto?.monto ?? '').replace(',', '.'));

      if (!concepto?.numero) {
        errors.push(`${item}: falta el número secuencial.`);
      }

      if (!concepto?.codigoClasificador) {
        errors.push(`${item}: falta el clasificador RUAT.`);
      }

      if (!concepto?.tipoArancel) {
        errors.push(`${item}: falta el tipo de arancel.`);
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        errors.push(`${item}: el monto debe ser mayor a cero.`);
      }
    });

    if (!String(ruatData?.observacion || '').trim()) {
      errors.push('Falta la observación para el registro de la tasa.');
    }

    return errors;
  }

  private approveReserva(reservaUuid: string): void {
    const aprobadoPor = this.authService.currentUser()?.nombreCompleto || 'Sistema';

    this.reservaService.aprobarReserva(reservaUuid, aprobadoPor).subscribe({
      next: () => {
        this.isLoading = false;
        this.notify('Mensualidad aprobada exitosamente.', 'success');
        this.emitList.emit();
        this.openTicketModal(this.ticketModal);
      },
      error: (error) => {
        this.isLoading = false;
        this.notify(
          'Error al aprobar la mensualidad: ' + (error.error?.message || error.message),
          'error'
        );
      }
    });
  }

  private rejectReserva(reservaUuid: string, motivoRechazo: string): void {
    const aprobadoPor = this.authService.currentUser()?.nombreCompleto || 'Sistema';

    this.reservaService.rechazarReserva(reservaUuid, motivoRechazo, aprobadoPor).subscribe({
      next: () => {
        this.isLoading = false;
        this.notify('Mensualidad rechazada exitosamente.', 'success');
        this.emitList.emit();
        this.onCloseModal();
      },
      error: (error) => {
        this.isLoading = false;
        this.notify(
          'Error al rechazar la mensualidad: ' + (error.error?.message || error.message),
          'error'
        );
      }
    });
  }

  private isDateWithinReserva(date: Date, reserva: Reserva): boolean {
    const recurrente = reserva.reservaRecurrenteDto;
    if (!recurrente?.fechaInicio || !recurrente?.fechaFin) return false;

    const inicio = this.parseLocalDate(recurrente.fechaInicio);
    const fin = this.parseLocalDate(recurrente.fechaFin);

    inicio.setHours(0, 0, 0, 0);
    fin.setHours(23, 59, 59, 999);

    return date >= inicio && date <= fin;
  }

  private isReservaFullyCoveredForStudent(reserva: Reserva): boolean {
    if (!this.selection.school || !this.selection.student || !this.catalogs.periodRegistrations.length) {
      return false;
    }

    const recurrente = reserva.reservaRecurrenteDto;
    if (!recurrente?.fechaInicio || !recurrente?.fechaFin) {
      return false;
    }

    const paidSet = new Set(
      this.catalogs.periodRegistrations
        .filter(
          m =>
            m.estudianteEscuelaDto?.uuid === this.selection.student?.uuid &&
            m.reservaDto?.organizacionDto?.uuid === this.selection.school?.uuid &&
            (m.reservaDto?.estadoReserva === EstadoReserva.PAGADA ||
              m.reservaDto?.estadoReserva === EstadoReserva.COMPLETADA)
        )
        .map(m => `${m.año}-${String(m.mes).padStart(2, '0')}`)
    );

    let current = this.parseLocalDate(recurrente.fechaInicio);
    current = new Date(current.getFullYear(), current.getMonth(), 1);

    const endDate = this.parseLocalDate(recurrente.fechaFin);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (current <= end) {
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      if (!paidSet.has(key)) {
        return false;
      }
      current.setMonth(current.getMonth() + 1);
    }

    return true;
  }

  private getConfigsSystem(): void {
    this.systemConfigList = this.authService.getAllConfigs() || {};
  }
  private getOrganizations(): void {
    this.organizationService.getAll().subscribe({
      next: (response: any) => {
        this.catalogs.organizations = response.status === 'OK'
          ? (response.payload?.content || response.payload || [])
          : [];
        this.catalogs.schools = this.catalogs.organizations.filter(
          org => org.tipoOrganizacion === TipoOrganizacion.ESCUELA_MUNICIPAL && org.activo
        );
      },
      error: () => {
        this.catalogs.organizations = [];
      }
    });
  }

  private getEstudiantes(): void {
    const request = this.userRole === 'Contribuyente' && this.userData?.uuid
      ? this.estudianteService.getByContribuyente(this.userData.uuid)
      : this.estudianteService.getAll();
    request.subscribe({
      next: (response: any) => {
        this.estudiantes = response.status === 'OK'
          ? (response.payload?.content || response.payload || [])
          : [];
      },
      error: () => {
        this.estudiantes = [];
      }
    });
  }

  canEditReservation(): boolean {
    return (
      this.row?.estadoReserva === EstadoReserva.PENDIENTE &&
      this.canActivate?.includes('ACTUALIZAR')
    );
  }

  saveData(): void {
    if (this.reservationForm.valid) {
      this.isLoading = true;

      const detallePrincipal = (this.row?.reservasPeriodoDtoList || [])[0];
      const updatedData: any = {
        ...detallePrincipal,
        mes: this.reservationForm.value.mes,
        año: this.reservationForm.value.año,
        reservaDto: {
          ...this.row,
          observaciones: this.reservationForm.value.observaciones
        }
      };

      this.updateReservaPeriodo(updatedData);
    } else {
      this.notify(
        'Formulario Inválido! Por favor complete todos los campos requeridos.',
        'error'
      );
    }
  }

  private updateReservaPeriodo(data: ReservaPeriodo): void {
    this.reservaPeriodoService.update(data).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.status === 'OK') {
          this.notify('Mensualidad actualizada exitosamente', 'success');
          this.emitList.emit();
          this.onCloseModal();
        } else {
          throw new Error(response.message || 'Error al actualizar mensualidad');
        }
      },
      error: () => {
        this.isLoading = false;
        this.notify('Error al actualizar la mensualidad', 'error');
      }
    });
  }

  /* =========================
     MODAL / NOTIFICATIONS
  ========================= */

  public onCloseModal(): void {
    this.detailReturn.active = false;
    this.detailReturn.previousState = undefined;
    this.activeTab = 1;
    this.createTab = 1;
    if (this.reservationForm) {
      this.reservationForm.enable();
      this.reservationForm.reset();
    }
    // if (this.validationForm) {
    //   this.validationForm.enable();
    //   this.validationForm.reset();
    // }
    this.modalService.dismissAll();
  }

  private notify(message: string, type: any): void {
    Swal.fire({
      title: message,
      icon: type,
      timer: 4000,
      timerProgressBar: true,
      showConfirmButton: false
    });
  }

  private handleError(title: string, message: string): void {
    this.isLoading = false;
    Swal.fire({
      title,
      text: message,
      icon: 'error',
      confirmButtonText: 'Entendido'
    });
  }
}
