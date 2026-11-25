import { UserRoleName, UserRoles } from 'src/app/core/constants/UserData';
import { Router } from '@angular/router';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { NgbModal, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { PaginationService } from 'src/app/core/services/pagination.service';
import { RuatRequestsService } from 'src/app/core/services/ruatRequest.service';
import { PagoService } from 'src/app/core/services/api/pago.service';
import { showReservationRevision } from 'src/app/core/services/api/reserva.service';
import { ReservaPeriodReservationFilters, ReservaPeriodoService } from 'src/app/core/services/api/reserva-periodo.service';
import { OrganizacionService } from 'src/app/core/services/api/organizacion.service';
import { EstudianteEscuelaService } from 'src/app/core/services/api/estudianteEscuela.service';
import { EstadoReserva, EstadoValidacion, EstadoPago, EstadoUsuario, EstadoRuat, EstadoActual, StatusUtils} from 'src/app/core/constants/Estados';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { obtenerHorasValidacionPago } from 'src/app/core/utils/configuracion-sistema.util';
import { EstudianteEscuela } from 'src/app/core/models/EstudianteEscuela.model';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { Organizacion } from 'src/app/core/models/organizacion.model';
import { ReservaPeriodo } from 'src/app/core/models/reservaPeriodo.model';
import { Reserva } from 'src/app/core/models/reserva.model';
import { TicketComponent } from '../reports/ticket/ticket.component';
import { BookingPeriodoModalComponent } from '../../modals/modal-booking-school/modal-booking-school.component';
import { CsvColumn } from 'src/app/shared/data-header/data-header.component';
import { BreadCrumbItem } from 'src/app/shared/breadcrumbs/breadcrumbs.component';
@Component({
  selector: 'app-booking-periodo',
  templateUrl: './booking-periodo.component.html',
  styleUrl: './booking-periodo.component.scss'
})
export class BookingPeriodoComponent implements OnInit, OnDestroy {
  private refreshTimer?: ReturnType<typeof setInterval>;
  private searchTimer?: ReturnType<typeof setTimeout>;
  private listRequestVersion = 0;
  private readonly statusChecks = new Map<string, Promise<Reserva>>();
  breadCrumbItems: BreadCrumbItem[] =[];
  viewMode: 'table' | 'cards' = 'table';
  canActivate: string[];
  columnsList: any[] = [];
  temp: any[] = [];
  loading = true;
  serverSidePagination = true;
  currentPage = 1;
  pageSize = 5;
  sortBy = 'fechaCreacion';
  sortDirection: 'asc' | 'desc' = 'desc';

  userRole: UserRoleName = UserRoles.CONTRIBUYENTE;
  userData!: any;
  contribuyente!: Contribuyente;
  systemConfigList: { [key: string]: ConfiguracionSistema } = {};
 
  mensualitiesList: any = {
    content: [],
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
    pageable: { pageNumber: 0, pageSize: 5 }
  };
  escuelasList: Organizacion[] = [];
  estudiantesList: EstudianteEscuela[] = [];
  readonly closeActionLabel = (row: any): string =>
    StatusUtils.reservationCloseAction(row?.reservaDto || row, this.canActivate)?.label || '';

  estadoReservaOptions = StatusUtils.getReservationStatusOptions();

  selectedItems: Reserva[] = [];
  csvExportItems: Reserva[] = [];
  searchResults: any;
  readonly CSV_COLUMNS: CsvColumn<Reserva>[] = [
    { header: 'Estudiante', value: item => this.getStudentsSummary(item)
    },
    { header: 'Matrícula', value: item => this.getMatriculasResumen(item)
    },
    { header: 'Escuela', value: item => item.organizacionDto?.nombre ?? ''},
    { header: 'Período', value: item => this.getPeriodosResumen(item)
    },
    { header: 'Disciplina', value: item => item.organizacionDto?.disciplina ??
        item.reservasPeriodoDtoList?.[0]?.disciplina ?? ''},
    { header: 'Entrenador', value: item => item.reservasPeriodoDtoList?.[0]?.entrenador ??
        item.organizacionDto?.entrenador ?? ''},
    { header: 'Mes', value: item => item.reservasPeriodoDtoList?.[0]?.mes ?? ''},
    { header: 'Año', value: item => item.reservasPeriodoDtoList?.[0]?.año ?? ''},
    { header: 'Monto Total', value: item => item.montoTotal ?? ''},
    { header: 'Estado Validación', value: item => item.estadoValidacion ?? ''},
    { header: 'Estado Reserva', value: item => item.estadoReserva ?? ''},
    { header: 'Número Reserva', value: item => item.numeroReserva ?? ''},
    { header: 'Número Tasa', value: item => item.numeroTasa ?? ''},
    { header: 'Fecha Creación', value: item => item.fechaCreacion
          ? new Date(item.fechaCreacion).toLocaleDateString()
          : ''},
    { header: 'Fecha Pago', value: item => item.pagosDtoList?.[0]?.fechaPago
          ? new Date(
              item.pagosDtoList[0].fechaPago
            ).toLocaleDateString()
          : ''},
    { header: 'Complejo', value: item => item.campoDeportivoDto
          ?.complejoDto?.nombre ?? ''},
    { header: 'Campo Deportivo', value: item => item.campoDeportivoDto?.nombre ?? ''}
  ];
  periodMonths = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];
  periodYears: number[] = [];
  selectedMesFiltro?: number;
  selectedAnioFiltro?: number;
  filters: ReservaPeriodReservationFilters = {
    tab: 0,
    searchTerm: '',
    estadoReserva: '',
    estadoValidacion: '',
    organization: '',
    periodoFiltro: undefined
  };

  constructor(
    private authService: AuthenticationService,
    public paginationService: PaginationService,
    private router: Router,
    public modalService: NgbModal,
    public formBuilder: UntypedFormBuilder,
    private reservaPeriodoService: ReservaPeriodoService,
    private organizacionesService: OrganizacionService,
    private estuduanteService: EstudianteEscuelaService,
  ) {
    this.canActivate = this.authService.hasPermission('/reservations/schools');
  }

  async ngOnInit() {
    this.breadCrumbItems = [
      { label: '' },
      { label: 'Mensualidades de Escuelas Municipales', active: true }
    ];
    this.columnsList = [
      { name: 'Número Reserva', prop: 'numeroReserva', nowrap: true, visible: true},
      { name: 'Contribuyente', prop: 'contribuyenteDto.nombreCompleto', sortable: true, visible: !this.contribuyente },
      { name: 'Complejo', prop: 'campoDeportivoDto.complejoDto.nombre', visible: false, },
      { name: 'Campo Deportivo', prop: 'campoDeportivoDto.nombre', visible: false },
      { name: 'Disciplina', prop: 'organizacionDto.disciplina', visible: false },
      { name: 'Escuela', prop: 'organizacionDto.nombre', sortable: true, visible: true },
      { name: 'Entrenador', prop: 'organizacionDto.entrenador', visible: false },
      { name: 'Monto', prop: 'montoTotal', sortable: true, currency: true, visible: true },
      { name: 'Número Tasa', prop: 'numeroTasa', nowrap: true, visible: true},
      { name: 'Estado Mensualidad', prop: 'estadoReserva', sortable: true, tag: true, visible: true },
      { name: 'Estado Pago', prop: 'pagosDtoList[0].estadoPago', tag: true, visible: true },
      { name: 'Fecha Creación', prop: 'fechaCreacion', date: true, visible: false },
    ];
    this.columnsList = this.columnsList.map(column => ({ ...column, sortable: true }));
    const savedViewMode = localStorage.getItem('dataTableViewMode');
    if (savedViewMode === 'table' || savedViewMode === 'cards') {
      this.viewMode = savedViewMode;
    }
    this.systemConfigList = this.authService.getAllConfigs();
    const currentUser = this.authService.currentUser();
    if (this.authService.getUserRole() === 'Contribuyente') {
      this.contribuyente = currentUser;
      if (this.contribuyente.estadoUsuario !== EstadoUsuario.ACTIVO) {
        this.canActivate = ['VER'];
      }
    } else {
      this.userData = currentUser.designacion.personaDto;
    }
    this.generatePeriodYears();
    await this.loadSchools();
    await this.loadStudents();
    await this.getMensualitiesList();
    this.refreshTimer = setInterval(() => {
      if (!this.loading) void this.getMensualitiesList();
    }, 5 * 60 * 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.refreshTimer);
    clearTimeout(this.searchTimer);
    ++this.listRequestVersion;
  }

  /* UI HANDLERS */
  onSearchChange(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.applyFilters(), 300);
  }

  getSelectedItems(items: any) {
    this.selectedItems = items;
  }
  toggleColumn(column: any) {
    column.visible = !column.visible;
  }
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'cards' : 'table';
    localStorage.setItem('dataTableViewMode', this.viewMode);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.getMensualitiesList(false);
  }
  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.getMensualitiesList(false);
  }

  onSortChange(event: { column: string; direction: 'asc' | 'desc' }): void {
    if (!this.columnsList.some(column => column.prop === event.column && column.sortable)) return;
    const resolvedSort = event.column;
    this.filters = {
      ...this.filters,
      sortBy: resolvedSort,
      sortDirection: event.direction
    };
    this.currentPage = 1;
    void this.getMensualitiesList(false);
  }
  onNavChange(changeEvent: NgbNavChangeEvent) {
    this.filters.estadoReserva = '';
    this.filters.tab = changeEvent.nextId;
    this.currentPage = 1;
    this.getMensualitiesList(false);
  }
  onReservationStatusChange(): void {
    this.filters.tab = 0;
    this.applyFilters();
  }

  applyFilters() {
    this.currentPage = 1;
    this.getMensualitiesList(false);
  }
  clearFilters() {
    clearTimeout(this.searchTimer);
    this.selectedMesFiltro = undefined;
    this.selectedAnioFiltro = undefined;
    this.filters = {
      tab: 0,
      searchTerm: '',
      estadoReserva: '',
      estadoValidacion: '',
      organization: '',
      periodoFiltro: undefined
    };
    this.currentPage = 1;
    this.getMensualitiesList(true);
  }

  applyPeriodoFilters(): void {
    if (this.selectedMesFiltro || this.selectedAnioFiltro) {
      this.filters.periodoFiltro = {
        mesFiltro: this.selectedMesFiltro,
        anioFiltro: this.selectedAnioFiltro
      };
    } else {
      this.filters.periodoFiltro = undefined;
    }
    this.applyFilters();
  }
  
  private generatePeriodYears(): void {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    this.periodYears = [];
    for (let year = currentYear - 3; year <= currentYear + 3; year++) {
      this.periodYears.push(year);
    }
  }
  getPeriodoDisplay(periodo: {
    mesFiltro?: number;
    anioFiltro?: number;
  }): string {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril',
      'Mayo', 'Junio', 'Julio', 'Agosto',
      'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    if (periodo.mesFiltro && periodo.anioFiltro) {
      return `${monthNames[periodo.mesFiltro - 1]} ${periodo.anioFiltro}`;
    }
    if (periodo.mesFiltro) {
      return monthNames[periodo.mesFiltro - 1];
    }
    if (periodo.anioFiltro) {
      return String(periodo.anioFiltro);
    }
    return 'todos los períodos';
  }

  getReservationPeriodDisplay(item: any): string {
    if (!item) {
      return '-';
    }
    if (Array.isArray(item.reservasPeriodoDtoList)) {
      return this.getPeriodosResumen(item);
    }
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    if (!item.mes || !item.año) {
      return '-';
    }
    return `${monthNames[item.mes - 1]} ${item.año}`;
  }

  getReservationDetails(reserva: Reserva | any): ReservaPeriodo[] {
    return reserva?.reservasPeriodoDtoList || [];
  }

  getFirstDetalle(reserva: Reserva | any): ReservaPeriodo | undefined {
    return this.getReservationDetails(reserva)[0];
  }

  getStudentsSummary(reserva: Reserva | any): string {
    const detalles = this.getReservationDetails(reserva);
    const names = Array.from(new Set(
      detalles
        .map(detalle => detalle.estudianteEscuelaDto?.nombreCompleto)
        .filter(Boolean)
    ));
    if (!names.length) {
      return '-';
    }
    return names.join(', ');
  }

  getMatriculasResumen(reserva: Reserva | any): string {
    const matriculas = Array.from(new Set(
      this.getReservationDetails(reserva)
        .map(detalle => detalle.estudianteEscuelaDto?.matricula || detalle.matricula)
        .filter(Boolean)
    ));
    return matriculas.length ? matriculas.join(', ') : '-';
  }

  getPeriodosResumen(reserva: Reserva | any): string {
    const periodos = Array.from(new Set(
      this.getReservationDetails(reserva)
        .map(detalle => this.getReservationPeriodDisplay(detalle))
        .filter(periodo => periodo !== '-')
    ));
    if (!periodos.length) {
      return '-';
    }
    return periodos.join(', ');
  }

  getStudentCount(reserva: Reserva | any): number {
    return new Set(
      this.getReservationDetails(reserva)
        .map(detalle => detalle.estudianteEscuelaDto?.uuid || detalle.estudianteEscuelaDto?.matricula)
        .filter(Boolean)
    ).size;
  }

  getMontoUnitario(reserva: Reserva | any): number {
    const detallesCount = this.getReservationDetails(reserva).length || 1;
    return Number(reserva?.montoTotal || 0) / detallesCount;
  }

  getPaymentStatus(reserva: Reserva | any): string {
    return reserva?.pagosDtoList?.[0]?.estadoPago || 'SIN PAGO';
  }

  private enrichReservationsForDisplay(list: Reserva[]): Reserva[] {
    return list.map(reserva => ({
      ...reserva,
      estudiantesResumen: this.getStudentsSummary(reserva),
      matriculasResumen: this.getMatriculasResumen(reserva),
      periodosResumen: this.getPeriodosResumen(reserva)
    } as Reserva));
  }

  get hasPeriodoSeleccionado(): boolean {
      return !!this.filters.periodoFiltro;
  }

  get emptyStateMessage(): string {
    if (!this.filters.periodoFiltro) {
      return 'No hay mensualidades registradas.';
    }
    return `No hay mensualidades registradas para ${this.getPeriodoDisplay(this.filters.periodoFiltro)}.`;
  }


  private hasMonthlyRegistrationContext(): boolean {
    const userUuid = this.contribuyente?.uuid;
    return !!userUuid && this.estudiantesList.some(student =>
      student.activo !== false && (student.contribuyenteDto?.uuid === userUuid ||
        student.organizacionDto?.representantesDto?.some(rep => rep.contribuyenteDto?.uuid === userUuid) ||
        (this.contribuyente?.organizacionesRepresentadas || []).some(org =>
          org.uuid === student.organizacionDto?.uuid))
    );
  }
  /* NAVIGATIONS & MODALS */
  public createNewMonthlyPayment(): void {
    if (!this.canActivate.includes('CREAR')) {
      Swal.fire({
        title: 'Funcionalidad deshabilitada',
        text: 'El registro de mensualidades no está habilitado para su usuario.',
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
      return;
    }
    if (this.authService.getUserRole() === 'Contribuyente' && !this.hasMonthlyRegistrationContext()) {
      Swal.fire({
        title: 'No puede registrar mensualidades',
        text: 'Su usuario no tiene estudiantes a cargo, por lo que no puede registrar mensualidades.',
        icon: 'info',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    if (this.escuelasList.length === 0) {
      Swal.fire({
        title: 'No hay escuelas disponibles',
        text: 'No se encontraron escuelas municipales registradas en el sistema.',
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
      return;
    }
    void this.router.navigate(['/reservations/schools/new'], {
      queryParams: {
        mes: this.filters.periodoFiltro?.mesFiltro,
        anio: this.filters.periodoFiltro?.anioFiltro
      }
    });
  }
  public openModal(data: any | undefined, accion: string, size: string) {
    if (!accion) { this.createNewMonthlyPayment(); return; }
    const modalRef = this.modalService.open(BookingPeriodoModalComponent, {
      backdrop: 'static',
      size: size
    });
    modalRef.componentInstance.selectedRows = Array.isArray(data) ? [...data] : [data];
    modalRef.componentInstance.row = Array.isArray(data) ? data[0] : data;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.canActivate = this.canActivate;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getMensualitiesList();
    });
  }
  public showTicket(data: any) {
    const modalRef = this.modalService.open(TicketComponent, { 
      size: 'lg',
      windowClass: 'ticket-modal'
    });
    modalRef.componentInstance.bookingType = 'periodo'
    modalRef.componentInstance.reservationData = data?.reservaDto || data;
    modalRef.componentInstance.showAsModal = true;
    modalRef.componentInstance.autoLoad = true;
  }
  
  
  /* API Services */
  private revisionEnCurso?: Promise<any>;
  private revisionesPendientes: any[] = [];

  private async getMensualitiesList(revisarEstados = true) {
    clearTimeout(this.searchTimer);
    const version = ++this.listRequestVersion;
    this.loading = true;
    try {
      if (this.revisionEnCurso) {
        await this.revisionEnCurso;
        if (version !== this.listRequestVersion) return;
        revisarEstados = false;
      }
      const request = firstValueFrom(this.reservaPeriodoService.getReservationList(this.currentPage - 1, this.pageSize,
        { ...this.getPaginationFilters(), revisarEstados }));
      if (revisarEstados) this.revisionEnCurso = request;
      let data: any;
      try {
        data = await request;
        if (data?.revision) this.revisionesPendientes.push(data.revision);
      }
      finally { if (this.revisionEnCurso === request) this.revisionEnCurso = undefined; }
      if (version !== this.listRequestVersion) return;
      if (!data) throw new Error('Respuesta inválida del servidor');
      const list = this.enrichReservationsForDisplay(Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : []);
      this.mensualitiesList = { ...data, content: list };
      this.temp = list;
      this.csvExportItems = list;
      this.loading = false;
      for (const revision of this.revisionesPendientes.splice(0)) {
        await showReservationRevision(revision);
      }
    } catch (error: any) {
      if (version !== this.listRequestVersion) return;
      this.handleError(error, 'Error al obtener las mensualidades');
      this.mensualitiesList = { content: [], totalElements: 0, totalPages: 0, first: true, last: true,
        pageable: { pageNumber: 0, pageSize: this.pageSize } };
      this.temp = [];
      this.csvExportItems = [];
    } finally {
      if (version === this.listRequestVersion) this.loading = false;
    }
  }

  private getPaginationFilters(): ReservaPeriodReservationFilters {
    return {
      tab: this.filters.tab,
      searchTerm: this.filters.searchTerm,
      estadoReserva: this.filters.estadoReserva,
      estadoValidacion: this.filters.estadoValidacion,
      organization: this.filters.organization,
      periodoFiltro: this.filters.periodoFiltro,
      sortBy: this.sortBy,
      sortDirection: this.sortDirection
    };
  }

  readonly loadExportItems = async (): Promise<Reserva[]> => {
    try {
      const data = await firstValueFrom(this.reservaPeriodoService.getReservationList(
        0, Math.max(1, this.mensualitiesList.totalElements),
        { ...this.getPaginationFilters(), revisarEstados: false }
      ));
      const list = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
      return this.enrichReservationsForDisplay(list);
    } catch (error) {
      this.handleError(error, 'Error al obtener las mensualidades para exportar');
      return [];
    }
  };

  private loadSchools() {
    this.organizacionesService.getAll().subscribe({
      next: (data: any) => {
        this.escuelasList = data.content || data;
      },
      error: (error) => {
        Swal.fire({ text: 'Error al obtener las organizaciones', icon: 'error', confirmButtonColor: '#299cdb' });
      }
    });
  }
  private loadStudents() {
    this.estuduanteService.getAll().subscribe({
      next: (data: any) => {
        this.estudiantesList = data.content || data;
      },
      error: (error) => {
        Swal.fire({ text: 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb' });
      }
    });
  }

  private handleError(error: any, defaultMessage: string): void {
    Swal.fire({ 
        text: error?.message || defaultMessage, 
        icon: 'error', 
        confirmButtonColor: '#299cdb' 
    });
  }
}
