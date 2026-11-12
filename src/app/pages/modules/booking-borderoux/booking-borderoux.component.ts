import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';
import { NgbModal, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { PaginationService } from 'src/app/core/services/pagination.service';
import { ReservaFilters, ReservaService } from 'src/app/core/services/api/reserva.service';
import { OrganizacionService } from 'src/app/core/services/api/organizacion.service';
import { SportsFieldsService } from 'src/app/core/services/api/sports-fields.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';
import { EstadoReserva, EstadoUsuario, StatusUtils } from 'src/app/core/constants/Estados';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { Organizacion } from 'src/app/core/models/organizacion.model';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { Categoria } from 'src/app/core/models/categoria.model';
import { Reserva } from 'src/app/core/models/reserva.model';
import { BorderouxPorcentajePreset } from 'src/app/core/models/reservaBorderoux.model';
import { CsvColumn } from 'src/app/shared/data-header/data-header.component';
import { ColumnDefinition } from 'src/app/shared/data-table/data-table.component';
import { BreadCrumbItem } from 'src/app/shared/breadcrumbs/breadcrumbs.component';
import { BorderouxFormComponent } from '../../modals/borderoux-form/borderoux-form.component';

@Component({
  selector: 'app-booking-borderoux',
  templateUrl: './booking-borderoux.component.html',
  styleUrls: ['./booking-borderoux.component.scss']
})
export class BookingBorderouxComponent implements OnInit, OnDestroy {
  private readonly cancelListRequest = new Subject<void>();
  private requestVersion = 0;

  breadCrumbItems: BreadCrumbItem[] = [];
  canActivate: string[] = [];
  itemsList: ColumnDefinition[] = [];
  viewMode: 'table' | 'cards' = 'table';
  serverSidePagination = true;
  currentPage = 1;
  pageSize = 5;
  loading = true;

  contribuyente!: Contribuyente;
  escuelasList: Organizacion[] = [];
  camposList: CampoDeportivo[] = [];
  categoriasList: Categoria[] = [];

  selectedItems: Reserva[] = [];
  csvExportItems: Reserva[] = [];
  reservasList: any = {
    content: [],
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
    pageable: { pageNumber: 0, pageSize: 5 }
  };

  estadoReservaOptions = StatusUtils.getReservationStatusOptions();
  EstadoReserva = EstadoReserva;

  filters: ReservaFilters = {
    tab: 0,
    searchTerm: '',
    typeReserva: 'borderoux',
    estadoReserva: '',
    organization: ''
  };

  readonly CSV_COLUMNS: CsvColumn<Reserva>[] = [
    { header: 'Número Reserva', value: item => item.numeroReserva ?? '' },
    { header: 'Organización', value: item => item.organizacionDto?.nombre ?? '' },
    { header: 'Contribuyente', value: item => item.contribuyenteDto?.nombreCompleto ?? '' },
    { header: 'Porcentaje Borderoux', value: item => this.porcentajeReserva(item) },
    { header: 'Actividades', value: item => String(item.borderouxActividadesDtoList?.length ?? 0) },
    { header: 'Monto a Liquidar', value: item => item.montoTotal ?? '' },
    { header: 'Número Tasa', value: item => item.numeroTasa ?? '' },
    { header: 'Estado Reserva', value: item => item.estadoReserva ?? '' },
    { header: 'Fecha Creación', value: item => item.fechaCreacion
        ? new Date(item.fechaCreacion).toLocaleDateString()
        : '' }
  ];

  constructor(
    private router: Router,
    private authService: AuthenticationService,
    public paginationService: PaginationService,
    public modalService: NgbModal,
    private reservaService: ReservaService,
    private organizacionesService: OrganizacionService,
    private sportsFieldsService: SportsFieldsService,
    private categoriasService: CategoriasService
  ) {
    this.canActivate = [...new Set([
      ...this.authService.hasPermission('/reservations/borderoux'),
      ...this.authService.hasPermission('/reservations/schools')
    ])];
  }

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'Liquidaciones Borderoux', active: true }
    ];

    this.itemsList = [
      { name: 'Número Reserva', prop: 'numeroReserva', sortable: true, visible: true, nowrap: true },
      { name: 'Organización', prop: 'organizacionDto.nombre', sortable: true, visible: true },
      { name: 'Contribuyente', prop: 'contribuyenteDto.nombreCompleto', sortable: true, visible: true },
      {
        name: 'Porcentaje Borderoux',
        // Derived from the activities; the percentage is not stored on reservas.
        prop: 'porcentajeReserva',
        visible: true,
        value: row => this.porcentajeReserva(row as Reserva)
      },
      {
        name: 'Actividades',
        prop: 'actividadesCount',
        number: true,
        visible: true,
        value: row => (row as any)?.borderouxActividadesDtoList?.length || 0
      },
      { name: 'Monto a Liquidar', prop: 'montoTotal', sortable: true, currency: true, visible: true },
      { name: 'Número Tasa', prop: 'numeroTasa', sortable: true, visible: true, nowrap: true },
      { name: 'Estado Liquidación', prop: 'estadoReserva', sortable: true, tag: true, visible: true },
      { name: 'Fecha Creación', prop: 'fechaCreacion', sortable: true, date: true, visible: false }
    ];

    const savedViewMode = localStorage.getItem('dataTableViewMode');
    if (savedViewMode === 'table' || savedViewMode === 'cards') {
      this.viewMode = savedViewMode;
    }

    if (this.esContribuyente) {
      this.contribuyente = this.authService.currentUser();
    }

    this.loadOrganizations();
    this.loadFields();
    this.loadCategorias();
    void this.getReservations(true);
  }

  ngOnDestroy(): void {
    ++this.requestVersion;
    this.cancelListRequest.next();
    this.cancelListRequest.complete();
  }

  get esContribuyente(): boolean {
    return this.authService.getUserRole() === 'Contribuyente';
  }

  trackByColumn = (_: number, column: ColumnDefinition): string => column.prop || column.name;

  get canCreate(): boolean {
    return this.canActivate.includes('CREAR');
  }

  get porcentajes(): BorderouxPorcentajePreset[] {
    const config = this.authService.getAllConfigs()?.[ClaveConfiguracion.BORDEROUX_PORCENTAJES];
    const raw = config?.valorJson as unknown;
    if (!raw) return [];
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed)
        ? parsed
            .filter(item => item && item.porcentaje !== null && item.porcentaje !== undefined)
            .map(item => ({
              etiqueta: String(item.etiqueta || 'Porcentaje'),
              tipoOrganizacion: item.tipoOrganizacion,
              porcentaje: Number(item.porcentaje)
            }))
        : [];
    } catch {
      return [];
    }
  }

  get emptyStateMessage(): string {
    return 'No hay liquidaciones Borderoux registradas.';
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  getSelectedItems(items: any): void {
    this.selectedItems = items;
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'cards' : 'table';
    localStorage.setItem('dataTableViewMode', this.viewMode);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    void this.getReservations(false);
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    void this.getReservations(false);
  }

  onSortChange(event: { column: string; direction: 'asc' | 'desc' }): void {
    if (!this.itemsList.some(column => column.prop === event.column && column.sortable)) return;
    this.filters = { ...this.filters, sortBy: event.column, sortDirection: event.direction };
    this.currentPage = 1;
    void this.getReservations(false);
  }

  onNavChange(changeEvent: NgbNavChangeEvent): void {
    this.filters.estadoReserva = '';
    this.filters.tab = changeEvent.nextId;
    this.currentPage = 1;
    void this.getReservations(false);
  }

  applyFilters(): void {
    this.currentPage = 1;
    void this.getReservations(false);
  }

  clearFilters(): void {
    this.filters = {
      tab: 0,
      searchTerm: '',
      typeReserva: 'borderoux',
      estadoReserva: '',
      organization: ''
    };
    this.currentPage = 1;
    void this.getReservations(true);
  }

  goToSchools(): void {
    void this.router.navigate(['/reservations/schools']);
  }

  openForm(row?: Reserva): void {
    if (!row && !this.canCreate) {
      Swal.fire({
        title: 'Funcionalidad deshabilitada',
        text: 'El registro de liquidaciones Borderoux no está habilitado para su usuario.',
        icon: 'warning',
        confirmButtonColor: '#299cdb'
      });
      return;
    }

    const modalRef = this.modalService.open(BorderouxFormComponent, {
      size: 'xl',
      backdrop: 'static',
      windowClass: 'borderoux-modal'
    });
    modalRef.componentInstance.mode = row ? 'view' : 'create';
    modalRef.componentInstance.reserva = row;
    modalRef.componentInstance.escuelasList = this.escuelasList;
    modalRef.componentInstance.camposList = this.camposList;
    modalRef.componentInstance.categoriasList = this.categoriasList;
    modalRef.componentInstance.presets = this.porcentajes;
    modalRef.componentInstance.contribuyente = this.contribuyente;

    modalRef.result
      .then(saved => {
        if (saved) void this.getReservations(false);
      })
      .catch(() => {});
  }

  private async getReservations(revisarEstados = true): Promise<void> {
    const version = ++this.requestVersion;
    this.loading = true;
    this.cancelListRequest.next();
    try {
      const data = await firstValueFrom(
        this.reservaService.getAll(this.currentPage - 1, this.pageSize,
          { ...this.filters, revisarEstados }).pipe(takeUntil(this.cancelListRequest))
      );
      if (version !== this.requestVersion) return;
      const list = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
      this.reservasList = { ...data, content: list };
      this.csvExportItems = list;
      this.loading = false;
    } catch (error: any) {
      if (version !== this.requestVersion) return;
      this.handleError(error, 'Error al obtener las liquidaciones Borderoux');
      this.reservasList = {
        content: [],
        totalElements: 0,
        totalPages: 0,
        first: true,
        last: true,
        pageable: { pageNumber: 0, pageSize: this.pageSize }
      };
      this.csvExportItems = [];
    } finally {
      if (version === this.requestVersion) this.loading = false;
    }
  }

  readonly loadExportItems = async (): Promise<Reserva[]> => {
    try {
      const data = await firstValueFrom(this.reservaService.getAll(
        0,
        Math.max(1, this.reservasList.totalElements),
        { ...this.filters, revisarEstados: false }
      ));
      return Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
    } catch (error) {
      this.handleError(error, 'Error al obtener las liquidaciones para exportar');
      return [];
    }
  };

  private loadOrganizations(): void {
    this.organizacionesService.getAll().subscribe({
      next: (data: any) => {
        const organizations: Organizacion[] = data?.content || data || [];
        this.escuelasList = this.esContribuyente
          ? organizations.filter(org => this.puedeRepresentar(org))
          : organizations;
      },
      error: () => {
        Swal.fire({
          text: 'Error al obtener las organizaciones',
          icon: 'error',
          confirmButtonColor: '#299cdb'
        });
      }
    });
  }

  private loadFields(): void {
    this.sportsFieldsService.getAll().subscribe({
      next: (data: any) => {
        this.camposList = data?.content || data || [];
      },
      error: () => {
        Swal.fire({
          text: 'Error al obtener los campos deportivos',
          icon: 'error',
          confirmButtonColor: '#299cdb'
        });
      }
    });
  }

  private loadCategorias(): void {
    if (!this.authService.hasPermission('/admin/categories')) {
      return;
    }
    this.categoriasService.getAll().subscribe({
      next: (data: any) => {
        const categorias: Categoria[] = data?.content || data || [];
        this.categoriasList = categorias.filter(categoria => categoria.activo !== false);
      },
      error: () => {
        this.categoriasList = [];
      }
    });
  }

  private porcentajeReserva(item: Reserva): string {
    const valores = (item.borderouxActividadesDtoList || [])
      .map(actividad => actividad.porcentajeAplicado)
      .filter((valor): valor is number => valor !== null && valor !== undefined)
      .map(valor => Number(valor));
    if (!valores.length) return '-';
    const unicos = Array.from(new Set(valores));
    return unicos.map(valor => `${valor}%`).join(' / ');
  }

  private puedeRepresentar(org: Organizacion): boolean {    const uuid = this.contribuyente?.uuid;
    if (!uuid) return false;
    if (org.representantesDto?.some(rep => rep.contribuyenteDto?.uuid === uuid)) {
      return true;
    }
    return (this.contribuyente?.organizacionesRepresentadas || [])
      .some(representada => representada.uuid === org.uuid);
  }

  private handleError(error: any, defaultMessage: string): void {
    Swal.fire({
      text: error?.message || defaultMessage,
      icon: 'error',
      confirmButtonColor: '#299cdb'
    });
  }
}
