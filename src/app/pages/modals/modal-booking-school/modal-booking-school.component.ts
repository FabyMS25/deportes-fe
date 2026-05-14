import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
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
import { ConfiguracionSistemaService } from 'src/app/core/services/api/configuracionSistema.service';
import { ClasificadorRuatService } from 'src/app/core/services/api/clasificadorRuat.service';
import { RuatRequestsService } from 'src/app/core/services/ruatRequest.service';
import { ReservaPeriodoService } from 'src/app/core/services/api/reserva-periodo.service';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { EstudianteEscuelaService } from 'src/app/core/services/api/estudianteEscuela.service';
import { OrganizacionService } from 'src/app/core/services/api/organizacion.service';

import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { Reserva } from 'src/app/core/models/reserva.model';
import { ReservaPeriodo } from 'src/app/core/models/reservaPeriodo.model';
import { Pago } from 'src/app/core/models/pago.model';
import { ClasificadorRuat } from 'src/app/core/models/clasificadorRuat.model';
import { Organizacion } from 'src/app/core/models/organizacion.model';
import { EstudianteEscuela } from 'src/app/core/models/EstudianteEscuela.model';

import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';
import { TipoOrganizacion } from 'src/app/core/constants/Features';
import { EstadoReserva, EstadoValidacion, EstadoPago, StatusUtils } from 'src/app/core/constants/Estados';

import { TicketComponent } from '../../modules/reports/ticket/ticket.component';

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
export class BookingPeriodoModalComponent implements OnInit, AfterViewInit {
  @Input() accion!: string;
  @Input() row!: ReservaPeriodo;
  @Input() canActivate: any[] = [];
  @Input() estudiantes: EstudianteEscuela[] = [];

  @Output() emitList = new EventEmitter();
  @Output() reservaGenerada = new EventEmitter<Reserva>();

  @ViewChild('ticketModal') ticketModal!: TemplateRef<any>;
  @ViewChild('annularModal') annularModal!: TemplateRef<any>;

  isLoading = false;

  systemConfigList: { [key: string]: ConfiguracionSistema } = {};
  organizationsList: Organizacion[] = [];
  filteredEscuelas: Organizacion[] = [];
  availableReservasRecurrentes: Reserva[] = [];
  filteredReservasRecurrentes: Reserva[] = [];
  studentPeriodsRegistrations: ReservaPeriodo[] = [];
  availablePeriodos: { mes: number; año: number; label: string }[] = [];

  selectedEstudiante?: EstudianteEscuela;
  selectedEscuela?: Organizacion;
  selectedReservaRecurrente?: Reserva;
  selectedMensualidadExistente?: ReservaPeriodo;
  selectedMonth?: number;
  selectedYear?: number;
  viewingExistingFromCreate = false;
  private createStateBeforeDetail?: {
    row?: ReservaPeriodo;
    selectedEstudiante?: EstudianteEscuela;
    selectedEscuela?: Organizacion;
    selectedReservaRecurrente?: Reserva;
    selectedMonth?: number;
    selectedYear?: number;
    activeTab: number;
    createTab: number;
  };

  reservationForm!: FormGroup;
  validationForm!: FormGroup;
  validationSubmitted = false;

  clasificador!: ClasificadorRuat;
  userData!: any;

  motivo = '';
  observation = '';

  activeTab = 1;
  createTab = 1;

  historialFilter: 'todas' | 'pagadas' | 'pendientes' = 'todas';
  reservaBaseFilter: 'todas' | 'en_curso' | 'pagadas' | 'pendientes' | 'activas' = 'en_curso';
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
    private systemConfigsService: ConfiguracionSistemaService,
    private ruatService: RuatRequestsService,
    private reservaService: ReservaService,
    private reservaPeriodoService: ReservaPeriodoService,
    private estudianteService: EstudianteEscuelaService,
    private organizationService: OrganizacionService,
    private clasificadorService: ClasificadorRuatService
  ) {}

  ngOnInit(): void {
    this.userData = this.authService.currentUser();
    if (this.authService.tokenUser() !== 'CONTRIBUYENTE_SESSION') {
      this.userData = this.userData.designacion.personaDto;
    }

    this.getConfigsSystem();
    this.getClasificador();
    this.getOrganizations();

    if (!this.estudiantes?.length) {
      this.getEstudiantes();
    }

    this.initializeForm();
    this.initializeYears();

    if (this.accion === 'show' && this.row?.reservaDto) {
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

  /* =========================
     GETTERS / UI HELPERS
  ========================= */
  get reservaActual(): Reserva | undefined {
    return this.row?.reservaDto;
  }
  get escuelaActual(): Organizacion | undefined {
    return this.row?.reservaDto?.organizacionDto;
  }
  get estudianteActual(): EstudianteEscuela | undefined {
    return this.row?.reservaDto?.estudianteEscuelaDto;
  }
  get pagosActuales(): Pago[] {
    return this.row?.reservaDto?.pagosDtoList || [];
  }
  get validationFormControls() {
    return this.validationForm.controls;
  }
  get form() {
    return this.reservationForm.controls;
  }

  get mensualidadesFiltradas(): ReservaPeriodo[] {
    let items = [...this.studentPeriodsRegistrations];

    if (this.selectedEscuela?.uuid) {
      items = items.filter(m => m.reservaDto?.organizacionDto?.uuid === this.selectedEscuela?.uuid);
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
      estudiante: ['', Validators.required],
      escuela: ['', Validators.required],
      reservaRecurrente: ['', Validators.required],
      mes: ['', Validators.required],
      año: ['', Validators.required],
      observaciones: ['']
    });

    // this.validationForm = this.formBuilder.group({
    //   validationStatus: [''],
    //   validationObservation: ['']
    // });

    const currentDate = new Date();
    const mes = currentDate.getMonth() + 1;
    const año = currentDate.getFullYear();

    this.reservationForm.patchValue({ mes, año });
    this.selectedMonth = mes;
    this.selectedYear = año;
  }

  private initializeYears(): void {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 1; i <= currentYear + 1; i++) {
      this.years.push(i);
    }
  }

  private loadReservaData(): void {
    if (!this.row?.reservaDto) return;

    this.selectedEstudiante = this.row.reservaDto.estudianteEscuelaDto;
    this.selectedEscuela = this.row.reservaDto.organizacionDto;
    this.selectedReservaRecurrente = this.row.reservaDto;
    this.selectedMonth = this.row.mes;
    this.selectedYear = this.row.año;
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
    this.selectedEstudiante = estudiante;
    this.reservationForm.patchValue({ estudiante: estudiante.uuid });

    this.filteredEscuelas = this.organizationsList.filter(
      org => org.tipoOrganizacion === TipoOrganizacion.ESCUELA_MUNICIPAL && org.activo
    );

    this.loadPeriodsByStudent();

    this.selectedEscuela = undefined;
    this.selectedReservaRecurrente = undefined;
    this.selectedMensualidadExistente = undefined;
    this.availableReservasRecurrentes = [];
    this.filteredReservasRecurrentes = [];
    this.availablePeriodos = [];

    this.reservationForm.patchValue({
      escuela: '',
      reservaRecurrente: ''
    });

    this.createTab = 1;
  }

  onEscuelaChange(event: Event): void {
    const escuelaUuid = (event.target as HTMLSelectElement).value;
    const escuela = this.filteredEscuelas.find(e => e.uuid === escuelaUuid);
    if (escuela) {
      this.onEscuelaSelected(escuela);
    }
  }

  onEscuelaSelected(escuela: Organizacion): void {
    this.selectedEscuela = escuela;
    this.reservationForm.patchValue({ escuela: escuela.uuid });

    this.loadReservationsFromSchool(escuela);

    this.selectedReservaRecurrente = undefined;
    this.selectedMensualidadExistente = undefined;
    this.availablePeriodos = [];

    this.reservationForm.patchValue({ reservaRecurrente: '' });

    this.resolveMensualidadExistente();
  }

  onReservaRecurrenteChange(event: Event): void {
    const reservaUuid = (event.target as HTMLSelectElement).value;
    const reserva = this.filteredReservasRecurrentes.find(r => r.uuid === reservaUuid);

    if (reserva) {
      this.selectReservaRecurrente(reserva);
    }
  }

  onPeriodoChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (!value) return;

    const [yearStr, monthStr] = value.split('-');
    this.selectedYear = Number(yearStr);
    this.selectedMonth = Number(monthStr);

    this.reservationForm.patchValue({
      año: this.selectedYear,
      mes: this.selectedMonth
    });

    this.onMonthYearChange();
  }

  onMonthChange(event: Event): void {
    this.selectedMonth = parseInt((event.target as HTMLSelectElement).value, 10);
    this.reservationForm.patchValue({ mes: this.selectedMonth });
    this.onMonthYearChange();
  }

  onYearChange(event: Event): void {
    this.selectedYear = parseInt((event.target as HTMLSelectElement).value, 10);
    this.reservationForm.patchValue({ año: this.selectedYear });
    this.onMonthYearChange();
  }

  onMonthYearChange(): void {
    this.selectedMonth = this.reservationForm.get('mes')?.value;
    this.selectedYear = this.reservationForm.get('año')?.value;
    this.resolveMensualidadExistente();
  }

  private loadReservationsFromSchool(escuela: Organizacion): void {
    const allReservas = escuela.reservasDtoList || [];

    this.availableReservasRecurrentes = allReservas.filter(
      reserva =>
        reserva.tipoReserva === 'recurrente' &&
        reserva.estadoValidacion === EstadoValidacion.APROBADA &&
        reserva.reservaRecurrenteDto?.activo === true &&
        !!reserva.reservaRecurrenteDto?.fechaInicio &&
        !!reserva.reservaRecurrenteDto?.fechaFin
    );

    this.applyReservaBaseFilters();

    this.selectedReservaRecurrente = undefined;
    this.reservationForm.patchValue({ reservaRecurrente: '' });

    this.autoSelectBestReservaBase();
  }

  applyReservaBaseFilters(): void {
    let list = [...this.availableReservasRecurrentes];

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

    this.filteredReservasRecurrentes = list;
  }

  private getReferenceDateForReservationFilter(): Date {
    if (this.selectedYear && this.selectedMonth) {
      return new Date(this.selectedYear, this.selectedMonth - 1, 1);
    }
    return new Date();
  }

  private autoSelectBestReservaBase(): void {
    if (!this.filteredReservasRecurrentes.length) return;

    const referenceDate = this.getReferenceDateForReservationFilter();
    const matchingReserva = this.filteredReservasRecurrentes.find(r =>
      this.isDateWithinReserva(referenceDate, r)
    );

    if (matchingReserva) {
      this.selectReservaRecurrente(matchingReserva);
      return;
    }

    this.selectReservaRecurrente(this.filteredReservasRecurrentes[0]);
  }

  private selectReservaRecurrente(reserva: Reserva): void {
    this.selectedReservaRecurrente = reserva;
    this.reservationForm.patchValue({ reservaRecurrente: reserva.uuid });
    this.generateAvailablePeriods();
    this.ensureSelectedPeriodoIsValid();
    this.resolveMensualidadExistente();
  }

  private generateAvailablePeriods(): void {
    this.availablePeriodos = [];
    if (!this.selectedReservaRecurrente?.reservaRecurrenteDto) return;

    const inicio = new Date(this.selectedReservaRecurrente.reservaRecurrenteDto.fechaInicio);
    const fin = new Date(this.selectedReservaRecurrente.reservaRecurrenteDto.fechaFin);

    let current = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const end = new Date(fin.getFullYear(), fin.getMonth(), 1);

    while (current <= end) {
      const mes = current.getMonth() + 1;
      const año = current.getFullYear();

      this.availablePeriodos.push({
        mes,
        año,
        label: `${this.getMonthName(mes)} ${año}`
      });

      current.setMonth(current.getMonth() + 1);
    }
  }

  private ensureSelectedPeriodoIsValid(): void {
    if (!this.availablePeriodos.length) {
      this.selectedMonth = undefined;
      this.selectedYear = undefined;
      this.reservationForm.patchValue({ mes: '', año: '' });
      return;
    }

    const isValid = this.availablePeriodos.some(
      p => p.mes === this.selectedMonth && p.año === this.selectedYear
    );

    if (!isValid) {
      const first = this.availablePeriodos[0];
      this.selectedMonth = first.mes;
      this.selectedYear = first.año;
      this.reservationForm.patchValue({
        mes: first.mes,
        año: first.año
      });
    }
  }

  private resolveMensualidadExistente(): void {
    this.selectedMensualidadExistente = this.getExistingMensualidad() || undefined;
  }

  private getExistingMensualidad(): ReservaPeriodo | null {
    if (!this.selectedEstudiante || !this.selectedEscuela || !this.selectedMonth || !this.selectedYear) {
      return null;
    }

    return (
      this.studentPeriodsRegistrations.find(
        m =>
          m.mes === this.selectedMonth &&
          m.año === this.selectedYear &&
          m.reservaDto?.estudianteEscuelaDto?.uuid === this.selectedEstudiante?.uuid &&
          m.reservaDto?.organizacionDto?.uuid === this.selectedEscuela?.uuid
      ) || null
    );
  }

  private hasExistingMensualidad(): boolean {
    return !!this.getExistingMensualidad();
  }

  viewMensualidadExistente(): void {
    if (!this.selectedMensualidadExistente) return;

    this.viewingExistingFromCreate = this.accion === '';
    if (this.viewingExistingFromCreate) {
      this.createStateBeforeDetail = {
        row: this.row,
        selectedEstudiante: this.selectedEstudiante,
        selectedEscuela: this.selectedEscuela,
        selectedReservaRecurrente: this.selectedReservaRecurrente,
        selectedMonth: this.selectedMonth,
        selectedYear: this.selectedYear,
        activeTab: this.activeTab,
        createTab: this.createTab
      };
    }

    this.row = this.selectedMensualidadExistente;
    this.accion = 'show';
    this.activeTab = 1;
    this.loadReservaData();
  }

  backToCreateFromDetail(): void {
    if (!this.viewingExistingFromCreate) return;

    const previousState = this.createStateBeforeDetail;
    this.accion = '';
    this.row = previousState?.row as ReservaPeriodo;
    this.selectedEstudiante = previousState?.selectedEstudiante;
    this.selectedEscuela = previousState?.selectedEscuela;
    this.selectedReservaRecurrente = previousState?.selectedReservaRecurrente;
    this.selectedMonth = previousState?.selectedMonth;
    this.selectedYear = previousState?.selectedYear;
    this.activeTab = previousState?.activeTab || 1;
    this.createTab = previousState?.createTab || 1;
    this.viewingExistingFromCreate = false;
    this.createStateBeforeDetail = undefined;
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

    if (!this.selectedEstudiante || !this.selectedEscuela || !this.selectedReservaRecurrente) {
      Swal.fire({
        title: 'Datos incompletos',
        text: 'Seleccione estudiante, escuela y reserva recurrente base.',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    if (this.hasExistingMensualidad()) {
      Swal.fire({
        title: 'Mensualidad existente',
        text: `Ya existe una mensualidad para ${this.getMonthName(this.selectedMonth!)} ${this.selectedYear}.`,
        icon: 'info',
        confirmButtonText: 'Entendido'
      });
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
    const reservaUuid = this.row.reservaDto?.uuid;

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
    const estadoValidacion = this.row?.reservaDto?.estadoValidacion;
    const estadoReserva = this.row?.reservaDto?.estadoReserva;

    return (
      estadoValidacion === EstadoValidacion.PENDIENTE &&
      estadoReserva === EstadoReserva.SOLICITADA &&
      this.canActivate?.includes('VALIDAR')
    );
  }

  canCancelReservation(): boolean {
    const estado = this.row?.reservaDto?.estadoReserva;

    return (
      (estado === EstadoReserva.SOLICITADA || estado === EstadoReserva.PENDIENTE) &&
      this.canActivate?.includes('ANULAR')
    );
  }

  openDeleteModal(content: any): void {
    this.accion = 'annularModal';
    this.motivo = '';
    this.observation = '';
  }

  openTicketModal(content: any): void {
    this.modalService.open(content, { centered: true, size: 'md' });
  }

  annularData(formValues: any): void {
    if (!formValues || !this.row?.reservaDto) {
      this.notify('No se pudo obtener los datos de la mensualidad.', 'error');
      return;
    }

    const codigoAlcaldia =
      this.systemConfigList[ClaveConfiguracion.CODIGO_ALCALDIA_RUAT]?.valorTexto || 'QUI';
    const codigoUsuario =
      this.systemConfigList[ClaveConfiguracion.CODIGO_USUARIO_RUAT]?.valorTexto || '';

    const requestData = {
      numeroTasa: this.row.reservaDto.numeroTasa,
      motivo: formValues.motivo,
      observacion: formValues.observation
    };

    this.isLoading = true;

    this.ruatService.cancelTasa(codigoAlcaldia, codigoUsuario, requestData).subscribe({
      next: (resp: any) => {
        if (resp.status === 'OK') {
          const updatedReserva = {
            ...this.row.reservaDto,
            estadoReserva: EstadoReserva.CANCELADA
          } as Reserva;

          this.reservaService.update(updatedReserva).subscribe({
            next: () => {
              this.isLoading = false;
              this.notify(
                this.ruatService.getResponseMessage(resp, 'Mensualidad anulada correctamente.'),
                'success'
              );
              this.emitList.emit();
              this.onCloseModal();
            },
            error: () => {
              this.isLoading = false;
              this.notify(
                'Mensualidad anulada en RUAT, pero hubo un error al actualizar localmente.',
                'warning'
              );
            }
          });
        } else {
          this.isLoading = false;
          this.notify(this.ruatService.getResponseMessage(resp, 'Error al anular en RUAT.'), 'error');
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.notify(this.ruatService.getResponseMessage(error, 'Error al realizar la anulación en RUAT.'), 'error');
      }
    });
  }

  /* =========================
     FORMATTING
  ========================= */

  getMonthName(month: number): string {
    return this.months.find(m => m.value === month)?.name || '';
  }

  getTotalAmount(): number {
    return this.selectedEscuela?.tarifaMensual || 0;
  }

  getReservaDisplayInfo(reserva: Reserva): string {
    const recurrente = reserva.reservaRecurrenteDto;
    if (!recurrente) return 'Reserva sin información';

    const campo = reserva.campoDeportivoDto?.nombre || 'Campo no especificado';
    const dias = recurrente.diasSemana || 'Días no especificados';
    const fechaInicio = new Date(recurrente.fechaInicio).toLocaleDateString();
    const fechaFin = new Date(recurrente.fechaFin).toLocaleDateString();

    return `${campo} - ${dias} (${fechaInicio} a ${fechaFin})`;
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
    if (!this.selectedEstudiante?.uuid) return;

    this.reservaPeriodoService.getByEstudiante(this.selectedEstudiante.uuid).subscribe({
      next: (response: any) => {
        if (response?.status === 'OK') {
          this.studentPeriodsRegistrations = Array.isArray(response.payload)
            ? response.payload
            : (response.payload?.content || []);
        } else {
          this.studentPeriodsRegistrations = [];
        }

        this.resolveMensualidadExistente();
      },
      error: () => {
        this.studentPeriodsRegistrations = [];
        this.selectedMensualidadExistente = undefined;
      }
    });
  }

  private prepareReservaPeriodoData(): any {
    const formValue = this.reservationForm.value;

    return {
      fechaCreacion: new Date().toISOString(),
      fechaReserva: new Date().toISOString(),
      estadoValidacion: EstadoValidacion.APROBADA,
      estadoReserva: EstadoReserva.PENDIENTE,
      tipoReserva: 'periodo',
      montoTotal: this.getTotalAmount(),
      clasificadorRuatId: this.clasificador?.codigo,
      observaciones:
        formValue.observaciones ||
        `Mensualidad para ${this.selectedEstudiante?.nombreCompleto} - ${this.selectedEscuela?.nombre}`,

      esReservaGratuita: false,
      motivoGratuidad: null,

      campoDeportivoDto: {
        uuid: this.selectedReservaRecurrente?.campoDeportivoDto?.uuid
      },
      contribuyenteDto: {
        uuid: this.selectedEstudiante?.contribuyenteDto?.uuid
      },
      estudianteEscuelaDto: {
        uuid: this.selectedEstudiante?.uuid
      },
      organizacionDto: {
        uuid: this.selectedEscuela?.uuid
      },

      reservaPeriodoDto: {
        mes: formValue.mes,
        año: formValue.año,
        matricula: this.selectedEstudiante?.matricula,
        disciplina: this.selectedEscuela?.disciplina,
        entrenador: this.selectedEscuela?.entrenador
      }
    };
  }

  private createTasaInRuat(reservaData: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const contribuyente = this.selectedEstudiante?.contribuyenteDto;

      if (!contribuyente?.codigoContribuyente) {
        reject(new Error('Falta el código de contribuyente para registrar en RUAT.'));
        return;
      }

      if (!reservaData?.clasificadorRuatId) {
        reject(new Error('No se encontró el clasificador RUAT para la mensualidad.'));
        return;
      }

      const codigoAlcaldia =
        this.systemConfigList[ClaveConfiguracion.CODIGO_ALCALDIA_RUAT]?.valorTexto || '';
      const codigoUsuario =
        this.systemConfigList[ClaveConfiguracion.CODIGO_USUARIO_RUAT]?.valorTexto || '';
      const servicioMunicipal =
        this.systemConfigList[ClaveConfiguracion.SERVICIO_MUNICIPAL_RUAT]?.valorTexto || '';

      if (!codigoAlcaldia) {
        reject(new Error('Falta la configuración CODIGO_ALCALDIA_RUAT.'));
        return;
      }

      if (!codigoUsuario) {
        reject(new Error('Falta la configuración CODIGO_USUARIO_RUAT.'));
        return;
      }

      if (!servicioMunicipal) {
        reject(new Error('Falta la configuración SERVICIO_MUNICIPAL_RUAT.'));
        return;
      }

      const ruatData = {
        codigoAlcaldia,
        codigoUsuario,
        codigoContribuyente: contribuyente.codigoContribuyente,
        servicioMunicipal,
        datosConcepto: [
          {
            numero: '1',
            codigoClasificador: reservaData.clasificadorRuatId,
            tipoArancel: 'DI',
            monto: Number(reservaData.montoTotal || 0)
          }
        ],
        observacion: reservaData.observaciones || 'Mensualidad Escuela Municipal'
      };

      this.ruatService.createTasa(
        codigoAlcaldia,
        codigoUsuario,
        servicioMunicipal,
        ruatData,
        contribuyente.codigoContribuyente
      ).subscribe({
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

    const inicio = new Date(recurrente.fechaInicio);
    const fin = new Date(recurrente.fechaFin);

    inicio.setHours(0, 0, 0, 0);
    fin.setHours(23, 59, 59, 999);

    return date >= inicio && date <= fin;
  }

  private isReservaFullyCoveredForStudent(reserva: Reserva): boolean {
    if (!this.selectedEscuela || !this.selectedEstudiante || !this.studentPeriodsRegistrations.length) {
      return false;
    }

    const recurrente = reserva.reservaRecurrenteDto;
    if (!recurrente?.fechaInicio || !recurrente?.fechaFin) {
      return false;
    }

    const paidSet = new Set(
      this.studentPeriodsRegistrations
        .filter(
          m =>
            m.reservaDto?.estudianteEscuelaDto?.uuid === this.selectedEstudiante?.uuid &&
            m.reservaDto?.organizacionDto?.uuid === this.selectedEscuela?.uuid &&
            (m.reservaDto?.estadoReserva === EstadoReserva.PAGADA ||
              m.reservaDto?.estadoReserva === EstadoReserva.COMPLETADA)
        )
        .map(m => `${m.año}-${String(m.mes).padStart(2, '0')}`)
    );

    let current = new Date(recurrente.fechaInicio);
    current = new Date(current.getFullYear(), current.getMonth(), 1);

    const endDate = new Date(recurrente.fechaFin);
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
    this.systemConfigsService.getAll().subscribe({
      next: (data: any) => {
        if (data?.status === 'OK' && Array.isArray(data.payload)) {
          this.systemConfigList = data.payload.reduce(
            (acc: { [key: string]: ConfiguracionSistema }, item: ConfiguracionSistema) => {
              acc[item.clave] = item;
              return acc;
            },
            {}
          );
        }
      }
    });
  }
  private getClasificador(): void {
    this.clasificadorService.getAll().subscribe({
      next: (response: any) => {
        if (response.status === 'OK') {
          const list = response.payload;
          this.clasificador = list.find(
            (item: ClasificadorRuat) =>
              item.nombre === 'RESERVA CAMPOS DEPORTIVOS POR PERSONA'
          );
        }
      }
    });
  }

  private getOrganizations(): void {
    this.organizationService.getAll().subscribe({
      next: (response: any) => {
        this.organizationsList =
          response.status === 'OK' ? response.payload?.content || [] : [];
      },
      error: () => {
        this.organizationsList = [];
      }
    });
  }

  private getEstudiantes(): void {
    this.estudianteService.getAll().subscribe({
      next: (response: any) => {
        this.estudiantes = response.status === 'OK' ? response.payload || [] : [];
      },
      error: () => {
        this.estudiantes = [];
      }
    });
  }

  canEditReservation(): boolean {
    return (
      this.row?.reservaDto?.estadoReserva === EstadoReserva.PENDIENTE &&
      this.canActivate?.includes('ACTUALIZAR')
    );
  }

  saveData(): void {
    if (this.reservationForm.valid) {
      this.isLoading = true;

      const updatedData: any = {
        ...this.row,
        mes: this.reservationForm.value.mes,
        año: this.reservationForm.value.año,
        reservaDto: {
          ...this.row.reservaDto,
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
    this.viewingExistingFromCreate = false;
    this.createStateBeforeDetail = undefined;
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
