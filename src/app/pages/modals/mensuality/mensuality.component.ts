import { UserRoleName, UserRoles } from 'src/app/core/constants/UserData';

import { Component, HostListener, inject, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { RuatRequestsService } from 'src/app/core/services/ruatRequest.service';
import { ReservaPeriodoService } from 'src/app/core/services/api/reserva-periodo.service';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { EstudianteEscuelaService } from 'src/app/core/services/api/estudianteEscuela.service';
import { OrganizacionService } from 'src/app/core/services/api/organizacion.service';

import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { Reserva } from 'src/app/core/models/reserva.model';
import { ReservaPeriodo } from 'src/app/core/models/reservaPeriodo.model';

import { Organizacion } from 'src/app/core/models/organizacion.model';
import { EstudianteEscuela } from 'src/app/core/models/EstudianteEscuela.model';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';

import { TipoOrganizacion } from 'src/app/core/constants/Features';
import { EstadoReserva, EstadoValidacion } from 'src/app/core/constants/Estados';

import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

type PeriodOption = { mes: number; año: number; label: string };

type MensualitySelection = {
  student?: EstudianteEscuela;
  students: EstudianteEscuela[];
  payer?: Contribuyente;
  detailKeys: Set<string>;
  studentSearch: string;
  school?: Organizacion;
  entrenador?: string;
  baseReservation?: Reserva;
  existingReservationPeriod?: ReservaPeriodo;
  month?: number;
  year?: number;
};

type MensualityCatalogs = {
  organizations: Organizacion[];
  schools: Organizacion[];
  recurrentReservations: Reserva[];
  filteredRecurrentReservations: Reserva[];
  periodRegistrations: ReservaPeriodo[];
  periods: PeriodOption[];
};

@Component({
  selector: 'app-monthly-registration-page', standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './mensuality.component.html',
  styleUrls: ['./mensuality.component.scss']
})
export class MensualityComponent implements OnInit {
  @Input() row!: Reserva;

  @Input() canActivate: any[] = [];

  @Input() estudiantes: EstudianteEscuela[] = [];

  @Input() defaultPeriodo?: { mesFiltro?: number; anioFiltro?: number };

  @Output() emitList = new EventEmitter();

  @Output() reservaGenerada = new EventEmitter<Reserva>();

  isLoading = false;

  systemConfigList: { [key: string]: ConfiguracionSistema } = {};

  catalogs: MensualityCatalogs = {
    organizations: [],
    schools: [],
    recurrentReservations: [],
    filteredRecurrentReservations: [],
    periodRegistrations: [],
    periods: []
  };

  selection: MensualitySelection = {
    student: undefined,
    students: [],
    payer: undefined,
    detailKeys: new Set<string>(),
    studentSearch: '',
    school: undefined,
    entrenador: undefined,
    baseReservation: undefined,
    existingReservationPeriod: undefined,
    month: undefined,
    year: undefined
  };

  reservationForm!: FormGroup;

  userData!: any;

  userRole: UserRoleName = UserRoles.CONTRIBUYENTE;

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

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthenticationService,
    private ruatService: RuatRequestsService,
    private reservaService: ReservaService,
    private reservaPeriodoService: ReservaPeriodoService,
    private estudianteService: EstudianteEscuelaService,
    private organizationService: OrganizacionService
  ) {}

  ngOnInit(): void {
    this.initializePageContext();
    this.reservaGenerada.subscribe(() => this.completed = true);
    this.userRole = this.authService.getUserRole();
    this.userData = this.authService.currentUser();
    if (this.userRole !== 'Contribuyente') this.userData = this.userData.designacion.personaDto;
    this.getConfigsSystem();
    this.getOrganizations();
    this.loadAllPeriodRegistrations();
    if (this.userRole === 'Contribuyente' || !this.estudiantes.length) this.getStudents();
    this.initializeForm();
    this.syncDefaultContribuyente();
    this.initializeYears();
  }

  get form() {
    return this.reservationForm.controls;
  }

  get estudiantesFiltrados(): EstudianteEscuela[] {
    const term = this.selection.studentSearch.trim().toLowerCase();
    return this.estudiantes
      .filter(estudiante => this.studentBelongsToBaseReservation(estudiante))
      .filter(estudiante => !this.selection.school?.uuid ||
        estudiante.organizacionDto?.uuid === this.selection.school.uuid)
      .filter(estudiante => !term ||
        `${estudiante.nombreCompleto || ''} ${estudiante.matricula || ''} ${estudiante.numeroDocumento || ''}`
          .toLowerCase()
          .includes(term));
  }

  private studentBelongsToBaseReservation(estudiante: EstudianteEscuela): boolean {
    const reservationContributorUuid = this.selection.baseReservation?.contribuyenteDto?.uuid;
    return !!this.selection.baseReservation && !!this.selection.school?.uuid &&
      !!reservationContributorUuid && estudiante.activo !== false &&
      estudiante.organizacionDto?.uuid === this.selection.school.uuid &&
      estudiante.contribuyenteDto?.uuid === reservationContributorUuid &&
      (this.userRole !== 'Contribuyente' || this.currentContributorCanManageStudent(estudiante));
  }

  get contribuyentesDisponibles(): Contribuyente[] {
    const currentUser = this.userData as Contribuyente | undefined;
    if (this.userRole === 'Contribuyente') {
      return currentUser?.uuid ? [currentUser] : [];
    }
    const candidates: (Contribuyente | undefined)[] = [
      this.selection.baseReservation?.contribuyenteDto,
      ...this.getSchoolRepresentatives(this.selection.school),
      ...this.selection.students.map(estudiante => estudiante.contribuyenteDto)
    ];
    return this.uniqueContribuyentes(candidates);
  }

  get entrenadoresDisponibles(): string[] {
    const representatives = this.getSchoolRepresentatives(this.selection.school)
      .map(representative => this.getRepresentativeDisplayName(representative))
      .filter((nombre): nombre is string => !!nombre.trim());

    return representatives.length
      ? Array.from(new Set(representatives))
      : (this.getConfiguredEntrenador() ? [this.getConfiguredEntrenador()!] : []);
  }

  get entrenadorFijado(): boolean {
    const representatives = this.getSchoolRepresentatives(this.selection.school);
    return representatives.length === 1 && this.singleRepresentativeMatchesTrainer(representatives[0]);
  }

  get selectedDetailsCount(): number {
    return this.getSelectedDetails().length;
  }

  get payerSectionTitle(): string {
    return 'Responsable de pago de la tasa';
  }

  get canChoosePayer(): boolean {
    return this.userRole !== 'Contribuyente';
  }

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

  onEscuelaChange(event: Event): void {
    const escuelaUuid = (event.target as HTMLSelectElement).value;
    const escuela = this.catalogs.schools.find(e => e.uuid === escuelaUuid);
    if (escuela) {
      this.onEscuelaSelected(escuela);
    }
  }

  onEscuelaSelected(escuela: Organizacion): void {
    this.selection.school = escuela;
    this.selection.entrenador = this.getDefaultEntrenador();
    this.reservationForm.patchValue({ escuela: escuela.uuid });
    this.selection.baseReservation = undefined;
    this.selection.existingReservationPeriod = undefined;
    this.catalogs.periods = [];
    this.selection.students = [];
    this.selection.detailKeys.clear();
    this.reservationForm.patchValue({ reservaRecurrente: '' });
    this.syncDefaultContribuyente();
    void this.loadReservationsFromSchool(escuela);
  }

  onEntrenadorChange(event: Event): void {
    const nombre = (event.target as HTMLSelectElement).value;
    this.selection.entrenador = this.entrenadoresDisponibles.includes(nombre) ? nombre : undefined;
  }

  onReservaRecurrenteChange(event: Event): void {
    const reservaUuid = (event.target as HTMLSelectElement).value;
    const reserva = this.catalogs.filteredRecurrentReservations.find(r => r.uuid === reservaUuid);

    if (reserva) {
      this.selectReservaRecurrente(reserva);
    }
  }

  private async loadReservationsFromSchool(escuela: Organizacion): Promise<void> {
    const schoolUuid = escuela.uuid;
    const setReservations = (reservations: Reserva[]): void => {
      if (this.selection.school?.uuid !== schoolUuid) return;
      // The fresh response is authoritative; embedded school data may still show a closed base as open.
      this.catalogs.recurrentReservations = reservations;
      this.applyReservaBaseFilters();
      this.autoSelectBestReservaBase();
    };

    this.selection.baseReservation = undefined;
    this.catalogs.recurrentReservations = [];
    this.catalogs.filteredRecurrentReservations = [];
    this.reservationForm.patchValue({ reservaRecurrente: '' });

    if (!schoolUuid) {
      setReservations([]);
      return;
    }

    try {
      setReservations(await this.getAvailableBaseReservations(schoolUuid));
    } catch {
      setReservations([]);
    }
  }

  private async getAvailableBaseReservations(schoolUuid: string): Promise<Reserva[]> {
    const reservations: Reserva[] = [];
    // Use the same authorized list as the selector, including any additional pages of school history.
    // This lookup only reads states; it must not trigger another RUAT review before registering a fee.
    let page = 0;
    while (true) {
      const response = await this.reservaService.getAll(page, 1000, {
        typeReserva: 'recurrente', estadoValidacion: EstadoValidacion.APROBADA,
        organization: schoolUuid, revisarEstados: false
      }).toPromise();
      if (!response || !Array.isArray(response.content) || !Number.isInteger(response.totalPages) || response.totalPages < 0) {
        throw new Error('No se pudieron consultar las reservas base.');
      }
      reservations.push(...response.content.filter(reserva =>
        reserva.organizacionDto?.uuid === schoolUuid && this.isAvailableBaseReservation(reserva)));
      page++;
      if (page >= response.totalPages || response.content.length === 0) return reservations;
    }
  }

  applyReservaBaseFilters(): void {
    let list = this.catalogs.recurrentReservations.filter(reserva => this.isAvailableBaseReservation(reserva));

    switch (this.reservaBaseFilter) {
      case 'en_curso':
        list = list.filter(r =>
          this.isDateWithinReserva(this.getReferenceDateForReservationFilter(), r)
        );
        break;
      case 'pagadas':
        list = list.filter(
          r =>
            r.estadoReserva === EstadoReserva.PAGADA
        );
        break;
      case 'pendientes':
        list = list.filter(r => r.estadoReserva === EstadoReserva.PENDIENTE);
        break;
      case 'activas':
        list = list.filter(
          r =>
            r.estadoReserva !== EstadoReserva.CANCELADA &&
            r.estadoReserva !== EstadoReserva.EXPIRADA &&
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

  private isAvailableBaseReservation(reserva?: Reserva): boolean {
    return reserva?.tipoReserva === 'recurrente' && reserva.estadoValidacion === EstadoValidacion.APROBADA &&
      [EstadoReserva.PENDIENTE, EstadoReserva.PAGADA, EstadoReserva.EN_CURSO].includes(reserva.estadoReserva) &&
      reserva.reservaRecurrenteDto?.activo === true && !!reserva.reservaRecurrenteDto.fechaInicio &&
      !!reserva.reservaRecurrenteDto.fechaFin;
  }

  private getReferenceDateForReservationFilter(): Date {
    if (this.selection.year && this.selection.month) {
      return new Date(this.selection.year, this.selection.month - 1, 1);
    }
    return new Date();
  }

  private autoSelectBestReservaBase(): void {
    if (!this.catalogs.filteredRecurrentReservations.length) return;

    if (this.userRole === 'Contribuyente') {
      const userUuid = this.userData?.uuid;
      const ownReservations = this.catalogs.filteredRecurrentReservations.filter(reserva =>
        !!userUuid && reserva.contribuyenteDto?.uuid === userUuid
      );

      const latestOwnReservation = [...(ownReservations.length ? ownReservations : this.catalogs.filteredRecurrentReservations)].sort((first, second) =>
        this.getReservationSortTime(second) - this.getReservationSortTime(first)
      )[0];
      this.selectReservaRecurrente(latestOwnReservation);
      return;
    }

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

  private getReservationSortTime(reserva: Reserva): number {
    const dateValue = reserva.fechaCreacion || reserva.fechaReserva;
    const timestamp = dateValue ? new Date(dateValue).getTime() : 0;
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  private selectReservaRecurrente(reserva: Reserva): void {
    if (!this.isAvailableBaseReservation(reserva)) return;
    this.selection.baseReservation = reserva;
    this.selection.entrenador = this.getDefaultEntrenador();
    this.selection.students = this.selection.students.filter(student =>
      this.studentBelongsToBaseReservation(student)
    );
    this.selection.detailKeys = new Set(
      Array.from(this.selection.detailKeys).filter(key =>
        this.selection.students.some(student => key.startsWith(`${student.uuid}|`))
      )
    );
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

  async onSubmit(): Promise<void> {
    if (this.isLoading) return;
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

    if (!this.selection.entrenador) {
      Swal.fire({
        title: 'Entrenador requerido',
        text: 'Seleccione el responsable que corresponde a esta mensualidad.',
        icon: 'warning',
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

    if (this.userRole === 'Contribuyente' && !this.canCurrentContributorRegisterSelection()) {
      this.handleError(
        'Operación no permitida',
        'Solo puede registrar mensualidades de estudiantes a su cargo o de escuelas que representa.'
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

    try {
      this.isLoading = true;

      // A different authorized user may have closed the base while this form was open.
      const schoolUuid = this.selection.school.uuid!;
      const baseUuid = this.selection.baseReservation.uuid;
      const basesActuales = await this.getAvailableBaseReservations(schoolUuid);
      const baseActual = basesActuales.find(reserva => reserva.uuid === baseUuid);
      if (!baseActual || schoolUuid !== this.selection.school?.uuid || baseUuid !== this.selection.baseReservation?.uuid) {
        throw new Error('La reserva base ya no está disponible para registrar mensualidades. Vuelva a seleccionar una reserva.');
      }
      this.selection.baseReservation = baseActual;
      const configurationErrors = this.validateMensualidadTariffConfiguration();
      if (configurationErrors.length > 0) throw new Error(configurationErrors.join('\n'));
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

  getMonthName(month: number): string {
    return this.months.find(m => m.value === month)?.name || '';
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

  private loadAllPeriodRegistrations(): void {
    this.reservaPeriodoService.getAllWithoutPagination().subscribe({
      next: (response: any) => {
        this.catalogs.periodRegistrations = Array.isArray(response)
          ? response
          : (response?.content || []);
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
      cancelacionAutomatica: false,
      fechaLimitePago: null,
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
    if (checked && !this.studentBelongsToBaseReservation(estudiante)) return;
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

  selectAllVisibleStudents(): void {
    if (!this.selection.school || !this.selection.baseReservation || this.isLoading) return;
    for (const estudiante of this.estudiantesFiltrados) {
      if (!this.isEstudianteSelected(estudiante)) {
        this.toggleEstudiante(estudiante, { target: { checked: true } } as unknown as Event);
      }
    }
  }

  clearAllStudents(): void {
    this.selection.students = [];
    this.selection.detailKeys.clear();
    this.syncDefaultContribuyente();
  }

  get allVisibleStudentsSelected(): boolean {
    const visible = this.estudiantesFiltrados;
    return visible.length > 0 && visible.every(student => this.isEstudianteSelected(student));
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
            entrenador: this.selection.entrenador,
            estudianteEscuelaDto: { uuid: estudiante.uuid }
          });
        }
      });
    });
    return details;
  }

  private syncDefaultContribuyente(): void {
    const candidates = this.contribuyentesDisponibles;
    if (this.userRole === 'Contribuyente') {
      this.selection.payer = candidates[0];
      this.reservationForm.patchValue({ contribuyente: this.selection.payer?.uuid || '' });
      return;
    }
    const reservationContributor = this.selection.baseReservation?.contribuyenteDto;
    const defaultPayer = reservationContributor?.uuid
      ? candidates.find(item => item.uuid === reservationContributor.uuid)
      : undefined;

    if (defaultPayer) {
      this.selection.payer = defaultPayer;
    } else if (!this.selection.payer || !candidates.some(item => item.uuid === this.selection.payer?.uuid)) {
      this.selection.payer = candidates[0];
    }
    this.reservationForm.patchValue({ contribuyente: this.selection.payer?.uuid || '' });
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
          resolve(response);
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

  private getConfiguredEntrenador(): string | undefined {
    return this.selection.baseReservation?.organizacionDto?.entrenador?.trim() ||
      this.selection.school?.entrenador?.trim();
  }

  private getDefaultEntrenador(): string | undefined {
    const representatives = this.getSchoolRepresentatives(this.selection.school);

    const reservationContributor = this.selection.baseReservation?.contribuyenteDto;
    const reservationRepresentative = representatives.find(representative =>
      this.samePerson(representative, reservationContributor)
    );
    if (reservationRepresentative) {
      return this.getRepresentativeDisplayName(reservationRepresentative);
    }

    if (representatives.length === 1 && this.singleRepresentativeMatchesTrainer(representatives[0])) {
      return this.getRepresentativeDisplayName(representatives[0]);
    }
    if (!representatives.length) {
      return this.getConfiguredEntrenador();
    }
    return undefined;
  }

  private singleRepresentativeMatchesTrainer(representative?: Contribuyente): boolean {
    const trainerTokens = this.normalizePersonName(this.getConfiguredEntrenador()).split(' ');
    const representativeTokens = this.normalizePersonName(this.getRepresentativeDisplayName(representative)).split(' ');

    return trainerTokens.length >= 2 && representativeTokens.length >= 2 &&
      trainerTokens[0] === representativeTokens[0] && trainerTokens[1] === representativeTokens[1];
  }

  private getRepresentativeDisplayName(representative?: Contribuyente): string {
    return String(representative?.nombreCompleto ||
      `${representative?.nombre || ''} ${representative?.primerApellido || ''} ${representative?.segundoApellido || ''}`)
      .trim()
      .replace(/\s+/g, ' ');
  }

  private samePerson(first?: Contribuyente, second?: Contribuyente): boolean {
    if (!first || !second) return false;
    if (first.uuid && second.uuid) return first.uuid === second.uuid;

    return this.normalizePersonName(this.getRepresentativeDisplayName(first)) ===
      this.normalizePersonName(this.getRepresentativeDisplayName(second));
  }

  private normalizePersonName(value?: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  private uniqueContribuyentes(candidates: (Contribuyente | undefined)[]): Contribuyente[] {
    const unique = new Map<string, Contribuyente>();
    candidates.forEach(candidate => {
      if (candidate?.uuid) unique.set(candidate.uuid, candidate);
    });
    return Array.from(unique.values());
  }

  private getSchoolRepresentatives(school?: Organizacion): Contribuyente[] {
    const representatives = (school?.representantesDto || [])
      .map(rep => rep.contribuyenteDto)
      .filter((rep): rep is Contribuyente => !!rep?.uuid);
    return representatives;
  }

  private currentUserRepresentsSelectedSchool(): boolean {
    const userUuid = this.userData?.uuid;
    const school = this.selection.school;
    if (!userUuid || !school) {
      return false;
    }
    return this.getSchoolRepresentatives(school).some(rep => rep.uuid === userUuid) ||
      (this.userData?.organizacionesRepresentadas || []).some((org: Organizacion) => org.uuid === school.uuid);
  }

  private currentContributorCanManageStudent(estudiante: EstudianteEscuela): boolean {
    const userUuid = this.userData?.uuid;
    if (!userUuid) {
      return false;
    }
    return estudiante.contribuyenteDto?.uuid === userUuid || this.currentUserRepresentsSelectedSchool();
  }

  private canCurrentContributorRegisterSelection(): boolean {
    const userUuid = this.userData?.uuid;
    const payerUuid = this.selection.payer?.uuid;
    if (!userUuid || !payerUuid || !this.selection.students.length) {
      return false;
    }
    const canManageStudents = this.selection.students.every(estudiante =>
      this.currentContributorCanManageStudent(estudiante)
    );
    if (!canManageStudents) {
      return false;
    }
    return payerUuid === userUuid;
  }

  private getOrganizations(): void {
    this.organizationService.getAll().subscribe({
      next: (response: any) => {
        this.catalogs.organizations = response?.content || response || [];
        this.catalogs.schools = this.catalogs.organizations.filter(
          org => org.tipoOrganizacion === TipoOrganizacion.ESCUELA_MUNICIPAL && org.activo
        );
      },
      error: () => {
        this.catalogs.organizations = [];
      }
    });
  }

  private getStudents(): void {
    this.estudianteService.getAll().subscribe({
      next: (response: any) => {
        this.estudiantes = response?.content || response || [];
        if (this.userRole === 'Contribuyente' && !this.estudiantes.some(student => student.activo !== false)) {
          this.handleError('No puede registrar mensualidades',
            'Su usuario no tiene estudiantes a cargo, por lo que no puede registrar mensualidades.');
        }
      },
      error: () => {
        this.estudiantes = [];
      }
    });
  }

  onCloseModal(): void { this.backToList(); }

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

    private pageRouter = inject(Router);
  private pageRoute = inject(ActivatedRoute);
  private pageAuth = inject(AuthenticationService);
  completed = false;

  initializePageContext(): void {
    this.canActivate = this.pageAuth.hasPermission('/reservations/schools');
    const month = Number(this.pageRoute.snapshot.queryParamMap.get('mes'));
    const year = Number(this.pageRoute.snapshot.queryParamMap.get('anio'));
    this.defaultPeriodo = {
      mesFiltro: Number.isInteger(month) && month >= 1 && month <= 12 ? month : undefined,
      anioFiltro: Number.isInteger(year) && year >= 1900 && year <= 9999 ? year : undefined
    };
  }

  get hasPendingChanges(): boolean {
    return !this.completed && (
      this.reservationForm?.dirty || !!this.selection.school ||
      this.selection.students.length > 0 || this.selection.detailKeys.size > 0);
  }

  backToList(): void {
    if (!this.isLoading) void this.pageRouter.navigate(['/reservations/schools']);
  }

  async canLeave(): Promise<boolean> {
    if (this.isLoading) return false;
    if (!this.hasPendingChanges) return true;
    const result = await Swal.fire({
      title: '¿Salir del registro?',
      text: 'Se perderán la selección de estudiantes, los meses y los datos que aún no registró.',
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Salir sin registrar', cancelButtonText: 'Continuar registro',
      focusCancel: true
    });
    return result.isConfirmed;
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.isLoading || this.hasPendingChanges) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

}
