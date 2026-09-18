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
import { ReservaFilters, ReservaService } from 'src/app/core/services/api/reserva.service';
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
import { Pago } from 'src/app/core/models/pago.model';
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
  private readonly cancelListRequest = new Subject<void>();
  private requestVersion = 0;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private searchTimer?: ReturnType<typeof setTimeout>;
  private readonly statusChecks = new Map<string, Promise<Reserva>>();
  breadCrumbItems: BreadCrumbItem[] =[];
  viewMode: 'table' | 'cards' = 'table';
  canActivate: string[];
  itemsList: any[] = [];
  temp: any[] = [];
  serverSidePagination = true;
  currentPage = 1;
  pageSize = 5;

  userRole: 'Contribuyente' | 'Representante' | 'Encargado' | 'Admin' = 'Contribuyente';
  userData!: any;
  contribuyente!: Contribuyente;

  estadoReservaOptions = StatusUtils.getReservationStatusOptions();

  loading = true;
  reservasList: any = {
    content: [],
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
    pageable: { pageNumber: 0, pageSize: 5 }
  };
  escuelasList: Organizacion[] = [];
  estudiantesList: EstudianteEscuela[] = [];
  selectedItems: Reserva[] = [];
  readonly CSV_COLUMNS: CsvColumn<Reserva>[] = [
    { header: 'Estudiante',
      value: item => this.getStudentsSummary(item)
    },
    { header: 'Matrícula',
      value: item => this.getMatriculasResumen(item)
    },
    { header: 'Escuela',
      value: item => item.organizacionDto?.nombre ?? ''
    },
    { header: 'Período',
      value: item => this.getPeriodosResumen(item)
    },
    { header: 'Disciplina',
      value: item => item.organizacionDto?.disciplina ??
        item.reservasPeriodoDtoList?.[0]?.disciplina ?? ''
    },
    { header: 'Entrenador',
      value: item => item.reservasPeriodoDtoList?.[0]?.entrenador ??
        item.organizacionDto?.entrenador ?? ''
    },
    { header: 'Mes',
      value: item => item.reservasPeriodoDtoList?.[0]?.mes ?? ''
    },
    { header: 'Año',
      value: item => item.reservasPeriodoDtoList?.[0]?.año ?? ''
    },
    { header: 'Monto Total',
      value: item => item.montoTotal ?? ''
    },
    { header: 'Estado Validación',
      value: item => item.estadoValidacion ?? ''
    },
    { header: 'Estado Reserva',
      value: item => item.estadoReserva ?? ''
    },
    { header: 'Número Reserva',
      value: item => item.numeroReserva ?? ''
    },
    { header: 'Número Tasa',
      value: item => item.numeroTasa ?? ''
    },
    { header: 'Fecha Creación',
      value: item => item.fechaCreacion
          ? new Date(item.fechaCreacion).toLocaleDateString()
          : ''
    },
    { header: 'Fecha Pago',
      value: item => item.pagosDtoList?.[0]?.fechaPago
          ? new Date(
              item.pagosDtoList[0].fechaPago
            ).toLocaleDateString()
          : ''
    },
    { header: 'Complejo',
      value: item => item.campoDeportivoDto
          ?.complejoDto?.nombre ?? ''
    },
    { header: 'Campo Deportivo',
      value: item => item.campoDeportivoDto?.nombre ?? ''
    }
  ];
  csvExportItems: Reserva[] = [];
  searchResults: any;
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
  
  filters: ReservaFilters = {
    tab: 0,
    searchTerm: '',
    typeReserva: 'periodo',
    estadoReserva: '',
    estadoValidacion: '',
    esReservaGratuita: undefined,
    organization: '',
    periodoFiltro: undefined
  };
  
  systemConfigList: { [key: string]: ConfiguracionSistema } = {};
  get HorasValidacionPago(): number | undefined {
    return obtenerHorasValidacionPago(this.systemConfigList, 'recurrente', undefined);
  }

  constructor(
    private router: Router,
    private authService: AuthenticationService,
    public paginationService: PaginationService,
    public modalService: NgbModal,
    public formBuilder: UntypedFormBuilder,
    private reservaService: ReservaService,
    private ruatService: RuatRequestsService,
    private pagoService: PagoService,
    private organizacionesService: OrganizacionService,
    private estuduanteService: EstudianteEscuelaService,
  ) {
    this.canActivate = this.authService.hasPermission('/reservations/schools');
  }

  async ngOnInit() {
    this.breadCrumbItems = [
      { label: 'Mensualidades de Escuelas Municipales', active: true }
    ];
    this.itemsList = [
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
      { name: 'Observaciones', prop: 'observaciones', visible: false },
      { name: 'Fecha Creación', prop: 'fechaCreacion', date: true, visible: false },
    ];
    const sortableColumns = new Set([
      'numeroReserva', 'contribuyenteDto.nombreCompleto', 'organizacionDto.nombre',
      'montoTotal', 'numeroTasa', 'estadoReserva', 'fechaCreacion'
    ]);
    this.itemsList = this.itemsList.map(column => ({
      ...column,
      sortable: sortableColumns.has(column.prop)
    }));

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
    this.loadSchools();
    this.loadStudents();
    void this.getReservations();
    this.refreshTimer = setInterval(() => {
      if (!this.loading) void this.getReservations();
    }, 5 * 60 * 1000);
  }
  ngOnDestroy(): void {
    ++this.requestVersion;
    this.cancelListRequest.next();
    this.cancelListRequest.complete();
    clearInterval(this.refreshTimer);
    clearTimeout(this.searchTimer);
  }

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
    this.getReservations();
  }
  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.getReservations();
  }

  onSortChange(event: { column: string; direction: 'asc' | 'desc' }): void {
    const sortBy: Record<string, string> = {
      numeroReserva: 'numeroReserva',
      'contribuyenteDto.nombreCompleto': 'contribuyente',
      'organizacionDto.nombre': 'organizacion',
      montoTotal: 'montoTotal',
      numeroTasa: 'numeroTasa',
      estadoReserva: 'estadoReserva',
      fechaCreacion: 'fechaCreacion'
    };
    const resolvedSort = sortBy[event.column];
    if (!resolvedSort) return;
    this.filters = {
      ...this.filters,
      sortBy: resolvedSort,
      sortDirection: event.direction
    };
    this.currentPage = 1;
    void this.getReservations();
  }
  onNavChange(changeEvent: NgbNavChangeEvent) {
    this.filters.estadoReserva = '';
    this.filters.tab = changeEvent.nextId;
    this.currentPage = 1;
    this.getReservations();
  }
  onReservationStatusChange(): void {
    this.filters.tab = 0;
    this.applyFilters();
  }

  applyFilters() {
    this.currentPage = 1;
    this.getReservations();
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
  
  clearFilters() {
    clearTimeout(this.searchTimer);
    this.selectedMesFiltro = undefined;
    this.selectedAnioFiltro = undefined;
    this.filters = {
      tab: 0,
      searchTerm: '',
      typeReserva: 'periodo',
      estadoReserva: '',
      estadoValidacion: '',
      esReservaGratuita: undefined,
      organization: '',
      periodoFiltro: undefined
    };
    
    this.currentPage = 1;
    this.getReservations();
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

  private getReservationForPeriodExport(item: any): Reserva {
    return item?.reservaDto || item;
  }

  private getReservaPeriodoDetails(item: any): any[] {
    const reserva = this.getReservationForPeriodExport(item);
    return reserva?.reservasPeriodoDtoList?.length ? reserva.reservasPeriodoDtoList : [item];
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

  get hasResultsForPeriodo(): boolean {
    return (this.reservasList?.content?.length || 0) > 0;
  }

  get canCreateMonthlyPayment(): boolean {
    return this.canActivate.includes('CREAR') ||
      (this.authService.getUserRole() === 'Contribuyente' &&
        this.contribuyente?.estadoUsuario === EstadoUsuario.ACTIVO);
  }

  get emptyStateMessage(): string {
    if (!this.filters.periodoFiltro) {
      return 'No hay mensualidades registradas.';
    }
    return `No hay mensualidades registradas para ${this.getPeriodoDisplay(this.filters.periodoFiltro)}.`;
  }

  public createNewMonthlyPayment(): void {
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

  private hasMonthlyRegistrationContext(): boolean {
    const userUuid = this.contribuyente?.uuid;
    return !!userUuid && this.estudiantesList.some(student =>
      student.activo !== false && (student.contribuyenteDto?.uuid === userUuid ||
        student.organizacionDto?.representantesDto?.some(rep => rep.contribuyenteDto?.uuid === userUuid) ||
        (this.contribuyente?.organizacionesRepresentadas || []).some(org =>
          org.uuid === student.organizacionDto?.uuid))
    );
  }

  private parseRuatPaymentDate(fechaPago: string): Date | null {
    if (!fechaPago || !/^\d{2}\/\d{2}\/\d{4}$/.test(fechaPago)) {
      return null;
    }
    const [day, month, year] = fechaPago.split('/').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  /* NAVIGATIONS & MODALS */
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
  
  public openModal(data: any | undefined, accion: string, size: string) {
    if (!accion) { this.createNewMonthlyPayment(); return; }
    const modalRef = this.modalService.open(BookingPeriodoModalComponent, {
      backdrop: 'static',
      size: size
    });
    modalRef.componentInstance.row = data;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.canActivate = this.canActivate;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getReservations();
    });
  }
  /* BUSINESS LOGIC */
  private async refreshReservationStatuses(list: Reserva[], version: number): Promise<void> {
    for (const reserva of list) {
      if (version !== this.requestVersion) return;
      const key = reserva.uuid;
      if (!key) continue;
      let check = this.statusChecks.get(key);
      if (!check) {
        check = this.checkAndUpdateSingleReservationStatus(reserva);
        this.statusChecks.set(key, check);
      }
      let updated: Reserva;
      try {
        updated = await check;
      } finally {
        if (this.statusChecks.get(key) === check) this.statusChecks.delete(key);
      }
      if (version !== this.requestVersion) return;
      const content = this.reservasList.content.map((item: Reserva) =>
        item.uuid === key ? updated : item);
      this.reservasList = { ...this.reservasList, content: this.enrichReservationsForDisplay(content) };
      this.temp = this.reservasList.content;
      this.csvExportItems = this.reservasList.content;
    }
  }
  private async checkAndUpdateSingleReservationStatus(
    reserva: Reserva
  ): Promise<Reserva> {

    const terminalStates = [
      EstadoReserva.COMPLETADA,
      EstadoReserva.NO_SHOW,
      EstadoReserva.CANCELADA,
      EstadoReserva.EXPIRADA
    ];

    if (terminalStates.includes(reserva.estadoReserva)) {
      return reserva;
    }

    try {

      if (reserva.estadoReserva === EstadoReserva.PENDIENTE) {

        const consultResult = await this.consultData(reserva, { silent: true });

        if (consultResult.consultationSuccessful && consultResult.hasPayment) {

          return await this.updateReservation(reserva, {
            estadoReserva: EstadoReserva.PAGADA,
            fechaActualizacion: new Date()
          });

        }

        return reserva;
      }

      if (
        reserva.estadoReserva === EstadoReserva.PAGADA &&
        this.isUsageDatePassed(reserva)
      ) {

        return await this.updateReservation(reserva, {
          estadoReserva: EstadoReserva.COMPLETADA,
          fechaActualizacion: new Date()
        });

      }

      return reserva;

    } catch {
      return reserva;
    }
  }
  private isUsageDatePassed(reserva: Reserva): boolean {

    const periodo = reserva.reservasPeriodoDtoList?.[0];

    if (!periodo) {
      return false;
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    if (periodo.año < currentYear) {
      return true;
    }
    if (periodo.año === currentYear && periodo.mes < currentMonth) {
      return true;
    }
    return false;
  }

  /* API RUAT Services */
  private async consultData(
    item: Reserva,
    options: { silent?: boolean } = {}
  ): Promise<any> {
    try {
      const nroTasa = item.numeroTasa;
      if (!nroTasa) {
        return {
          item,
          text: 'No hay número de tasa asociado',
          type: 'warning',
          hasPayment: false,
          consultationSuccessful: false,
          errorCode: 'NO_TASA'
        };
      }
      const resp: any = await this.ruatService.checkFeePayment(nroTasa).toPromise();
      if (!this.ruatService.canContinue(resp)) {
        return {
          item,
          text: this.ruatService.getResponseMessage(resp, 'No se puede continuar con el flujo'),
          type: 'warning',
          hasPayment: false,
          consultationSuccessful: true,
          ruatResponse: resp,
          errorCode: 'RUAT_FLOW_STOPPED'
        };
      }
      const pagoTasa = this.ruatService.getResponseData(resp)?.pagoTasa;
      if (!pagoTasa) {
        return {
          item,
          text: this.ruatService.getResponseMessage(resp, 'No se encontraron datos de pago'),
          type: 'info',
          hasPayment: false,
          consultationSuccessful: true,
          ruatResponse: resp,
          errorCode: 'PAYMENT_NOT_FOUND'
        };
      }
      const text = this.ruatService.getResponseMessage(resp, 'La tasa se encuentra pagada');
      try {
        const fechaPagoLocal = this.parseRuatPaymentDate(pagoTasa.fechaPago);
        if (!fechaPagoLocal) {
          return {
            item,
            text: 'RUAT devolvió una fecha de pago inválida. No se registró el pago.',
            type: 'error',
            hasPayment: false,
            consultationSuccessful: false,
            ruatResponse: resp,
            errorCode: 'INVALID_RESPONSE'
          };
        }
        const existingPayment = item.pagosDtoList?.find(pago =>
          pago.folio === pagoTasa.folio && pago.numeroTasa === pagoTasa.numeroTasa
        );
        if (!existingPayment) {
          const nuevoPago: Pago = {
            numeroTasa: pagoTasa.numeroTasa,
            tipoTasa: 'TO',
            folio: pagoTasa.folio,
            formaPago: pagoTasa.formaPago,
            fechaPago: fechaPagoLocal,
            entidadFinanciera: pagoTasa.entidadFinanciera,
            montoPagado: parseFloat(pagoTasa.montoPago) || 0,
            observaciones: pagoTasa.observacion,
            estadoPago: EstadoPago.PAGADO,
            ultimaConsulta: new Date(),
            respuestaCompletaRuat: JSON.stringify(resp),
            reservaDto: item
          };
          await this.pagoService.save(nuevoPago).toPromise();
        }
        return {
          item,
          text,
          type: 'success',
          hasPayment: true,
          pagoData: pagoTasa,
          consultationSuccessful: true,
          ruatResponse: resp
        };
      } catch (error) {
        return {
          item,
          text: 'El pago fue encontrado en RUAT, pero no pudo registrarse en el sistema.',
          type: 'error',
          hasPayment: false,
          consultationSuccessful: false,
          ruatResponse: resp,
          errorCode: 'PAYMENT_SAVE_ERROR'
        };
      }
    } catch (error) {
      return {
        item,
        text: this.ruatService.getResponseMessage(error, 'Error al realizar la consulta al RUAT'),
        type: 'error',
        hasPayment: false,
        consultationSuccessful: false,
        ruatResponse: error,
        errorCode: 'RUAT_EXCEPTION'
      };
    }
  }

  /* API Services */
  
  private async getReservations() {
    clearTimeout(this.searchTimer);
    const version = ++this.requestVersion;
    this.cancelListRequest.next();
    this.loading = true;
    try {
      const data = await firstValueFrom(this.reservaService.getAll(
        this.currentPage - 1, this.pageSize, this.filters
      ).pipe(takeUntil(this.cancelListRequest)));
      if (version !== this.requestVersion) return;
      const list = this.enrichReservationsForDisplay(
        Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : []
      );
      this.reservasList = { ...data, content: list };
      this.temp = list;
      this.csvExportItems = list;
      this.loading = false;
      void this.refreshReservationStatuses(list, version);
    } catch (error: any) {
      if (version !== this.requestVersion) return;
      this.handleError(error, 'Error al obtener las mensualidades');
      this.reservasList = {
        content: [], totalElements: 0, totalPages: 0, first: true, last: true,
        pageable: { pageNumber: 0, pageSize: this.pageSize }
      };
      this.temp = [];
      this.csvExportItems = [];
    } finally {
      if (version === this.requestVersion) this.loading = false;
    }
  }

  readonly loadExportItems = async (): Promise<Reserva[]> => {
    try {
      const data = await firstValueFrom(this.reservaService.getAll(
        0, Math.max(1, this.reservasList.totalElements), this.filters
      ));
      const list = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
      return this.enrichReservationsForDisplay(list);
    } catch (error) {
      this.handleError(error, 'Error al obtener las mensualidades para exportar');
      return [];
    }
  };

  private async updateReservation(
    reserva: Reserva,
    updates: Partial<Reserva>
  ): Promise<Reserva> {

    const updatedReserva: Reserva = {
      ...reserva,
      ...updates,
      fechaActualizacion: new Date()
    };

    try {

      const response: any = await this.reservaService.update(updatedReserva).toPromise();
      if (!response || response.estadoReserva !== updates.estadoReserva) {
        throw new Error('El backend no confirmó el cambio de estado de la reserva');
      }
      return response;

    } catch (error) {
      console.error('No se pudo actualizar el estado de la mensualidad después de consultar RUAT', error);
      return reserva;

    }

  }

  private loadSchools() {
    this.organizacionesService.getAll().subscribe({
      next: (data: any) => {
        this.escuelasList = data.content || data;
      },
      error: (error) => {
        console.error('Error loading organizations:', error);
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
