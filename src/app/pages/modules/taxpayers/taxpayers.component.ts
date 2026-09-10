import { Component, OnInit } from '@angular/core';
import { NgbModal, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { CityAcronym } from 'src/app/core/constants/Places';
import { CsvColumn } from 'src/app/shared/data-header/data-header.component';
import { EstadoRuat, EstadoUsuario } from 'src/app/core/constants/Estados';
import { ModalTaxpayerComponent } from '../../modals/modal-taxpayer/modal-taxpayer.component';
import { BreadCrumbItem } from 'src/app/shared/breadcrumbs/breadcrumbs.component';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';

@Component({
  selector: 'app-taxpayers',
  templateUrl: './taxpayers.component.html',
  styleUrls: ['./taxpayers.component.scss']
})
export class TaxpayersComponent implements OnInit {
  breadCrumbItems: BreadCrumbItem[] =[];
  viewMode: 'table' | 'cards' = 'table';
  canActivate: string[];
  itemsList: any[] = [];
  temp: Contribuyente[] = [];
  contribuyentesList: Contribuyente[] = [];
  
  selectedTab = 'TODOS';
  searchTerm: string = '';
  estadoUsuario: EstadoUsuario | '' = '';
  estadoRuat: EstadoRuat | '' = '';
  verificadoRuat: '' | 'SI' | 'NO' = '';
  selectedItems: Contribuyente[] = [];
  readonly CSV_COLUMNS: CsvColumn<Contribuyente>[] = [
    { header: 'Nombre Completo', value: item => item.nombreCompleto?.toString() ?? '' },
    { header: 'Tipo Contribuyente', value: item => item.tipoContribuyente ?? '' },
    { header: 'Nro Documento', value: item => item.numeroDocumento ?? '' },
    {
      header: 'Expedido',
      value: item =>
        CityAcronym.find(
          city => String(city.id) === String(item.expedido)
        )?.value ??
        item.expedido ??
        ''
    },
    { header: 'NIT', value: item => item.nroNit ?? '' },
    { header: 'Teléfono', value: item => item.telefono ?? '' },
    { header: 'Email', value: item => item.email ?? '' },
    { header: 'Dirección', value: item => item.direccion ?? '' },
    { header: 'Estado Usuario', value: item => item.estadoUsuario ?? '' },
    { header: 'Estado RUAT', value: item => item.estadoRuat ?? '' },
    {
      header: 'Puede Reservar Gratis',
      value: item => item.puedeReservarGratis ? 'SI' : 'NO'
    },
    {
      header: 'Es Deportista Élite',
      value: item => item.esDeportistaElite ? 'SI' : 'NO'
    },
    {
      header: 'Registro Único Deportivo',
      value: item => item.registroUnicoDeportivo ?? ''
    },
    {
      header: 'Está Sancionado',
      value: item => item.estaSancionado ? 'SI' : 'NO'
    },
    {
      header: 'Fecha Fin Sanción',
      value: item => item.fechaFinSancion
        ? new Date(item.fechaFinSancion).toLocaleDateString('es-BO')
        : ''
    },
    { header: 'Motivo Sanción', value: item => item.motivoSancion ?? '' },
    {
      header: 'Fecha Creación',
      value: item => item.fechaCreacion
        ? new Date(item.fechaCreacion).toLocaleDateString('es-BO')
        : ''
    },
    {
      header: 'Fecha Actualización',
      value: item => item.fechaActualizacion
        ? new Date(item.fechaActualizacion).toLocaleDateString('es-BO')
        : ''
    }
  ];

  constructor(
    private modalService: NgbModal,
    private authService: AuthenticationService,
    private contribuyentesService: ContribuyentesService,
  ) {
    this.canActivate = this.authService.hasPermission('/taxpayers');
  }

  ngOnInit(): void {
    const savedViewMode = localStorage.getItem('dataTableViewMode');
    if (savedViewMode === 'table' || savedViewMode === 'cards') {
      this.viewMode = savedViewMode;
    }
    this.breadCrumbItems = [
      { label: '' },
      { label: 'Contribuyentes', active: true }
    ];    
    this.itemsList = [
      { name: 'Nombre Completo', prop: 'nombreCompleto', visible: true, truncate: 70 },
      { name: 'Nombre', prop: 'nombre', visible: false },
      { name: 'Primer Apellido', prop: 'primerApellido', visible: false },
      { name: 'Segundo Apellido', prop: 'segundoApellido', visible: false },
      { name: 'Apellido Esposo', prop: 'apellidoEsposo', visible: false },
      { name: 'Tipo Contribuyente', prop: 'tipoContribuyente', visible: false },
      { name: 'Nro Documento', prop: 'numeroDocumento', visible: true },
      { name: 'Expedido', prop: 'expedido', visible: false },
      { name: 'NIT', prop: 'nroNit', visible: false },
      { name: 'Genero', prop: 'genero', visible: false },
      { name: 'Estado Civil', prop: 'estadoCivil', visible: false },
      { name: 'Fecha Nacimiento', prop: 'fechaNacimiento', visible: false },
      { name: 'Teléfono', prop: 'telefono', visible: true },
      { name: 'Email', prop: 'email', visible: false },
      { name: 'Dirección', prop: 'direccion', visible: false, truncate: 90 },
      { name: 'Estado Usuario', prop: 'estadoUsuario', tag: true, visible: true },
      { name: 'Estado Ruat', prop: 'estadoRuat', visible: false, tag: true },
      { name: 'Es Deportista Elite', prop: 'esDeportistaElite', visible: false, tag: true },
      { name: 'Puede Reservar Gratis', prop: 'puedeReservarGratis', visible: false, tag: true },
      { name: 'Pertenece Escuela Municipal', prop: 'perteneceEscuelaMunicipal', visible: false, tag:true},
      { name: 'Registro Único Deportivo', prop: 'registroUnicoDeportivo', visible: false, truncate: 90 },
      { name: 'Fecha Último Uso Gratuito', prop: 'fechaUltimoUsoGratuito', visible: false, date: true },
      { name: 'Observaciones Municipales', prop: 'observacionesMunicipales', visible: false, truncate: 90 },
      { name: 'Descuento Aplicable', prop: 'descuentoAplicable', visible: false },
      { name: 'Fecha Creacion', prop: 'fechaCreacion', visible: false, date: true },
      { name: 'Fecha Actualización', prop: 'fechaActualizacion', visible: false, date: true },
      { name: 'Estado Sancionado', prop: 'estaSancionado', visible: false, tag: true },
      { name: 'Fecha fin Sancion', prop: 'fechaFinSancion', visible: false, date: false },
      { name: 'Motivo', prop: 'motivoSancion', visible: false, truncate: 90 },
    ];    
    this.getTaxpayers();
  }

  getSelectedItems(items: Contribuyente[]): void {
    this.selectedItems = items;
  }
  toggleColumn(column: any) {
      column.visible = !column.visible;
  }
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'cards' : 'table';
    localStorage.setItem('dataTableViewMode', this.viewMode);
  }
  onNavChange(event: NgbNavChangeEvent): void {
    this.selectedTab = String(event.nextId);
    this.applyFilters();
  }
  getTabCount(tab: string): number {
    return this.temp.filter(item =>
      this.matchesFilters(item, tab)
    ).length;
  }
  clearFilters(): void {
    this.searchTerm = '';
    this.estadoUsuario = '';
    this.estadoRuat = '';
    this.verificadoRuat = '';
    this.selectedTab = 'TODOS';
    this.selectedItems = [];
    this.applyFilters();
  }
  applyFilters(): void {
    this.contribuyentesList = this.temp.filter(item =>
      this.matchesFilters(item, this.selectedTab)
    );
    this.selectedItems = this.selectedItems.filter(selected =>
      this.contribuyentesList.some(
        item => item.uuid === selected.uuid
      )
    );
  }
  private matchesFilters(
    item: Contribuyente,
    tab: string
  ): boolean {
    const search = this.normalizeFilterText(this.searchTerm);

    const matchesSearch =
      !search ||
      [
        item.nombreCompleto,
        item.nombre,
        item.primerApellido,
        item.segundoApellido,
        item.apellidoEsposo,
        item.numeroDocumento,
        item.codigoContribuyente,
        item.nroNit,
        item.telefono,
        item.email,
        item.direccion,
        item.registroUnicoDeportivo,
        item.observacionesMunicipales,
        item.motivoSancion,
        item.estadoUsuario,
        item.estadoRuat,
        item.tipoContribuyente
      ].some(value =>
        this.normalizeFilterText(value).includes(search)
      );

    const matchesEstadoUsuario =
      !this.estadoUsuario ||
      item.estadoUsuario === this.estadoUsuario;

    const matchesEstadoRuat =
      !this.estadoRuat ||
      item.estadoRuat === this.estadoRuat;

    const matchesVerificacionRuat =
      !this.verificadoRuat ||
      (
        this.verificadoRuat === 'SI' &&
        item.verificadoRuat === true
      ) ||
      (
        this.verificadoRuat === 'NO' &&
        item.verificadoRuat === false
      );

    const matchesTab =
      tab === 'TODOS' ||
      (
        tab === 'NA' &&
        item.tipoContribuyente === 'NA'
      ) ||
      (
        tab === 'JU' &&
        item.tipoContribuyente === 'JU'
      ) ||
      (
        tab === 'GRATIS' &&
        item.puedeReservarGratis === true
      ) ||
      (
        tab === 'ELITE' &&
        item.esDeportistaElite === true
      ) ||
      (
        tab === 'SANCIONADOS' &&
        (
          item.estaSancionado === true ||
          item.estadoUsuario === EstadoUsuario.SANCIONADO
        )
      );

    return (
      matchesSearch &&
      matchesEstadoUsuario &&
      matchesEstadoRuat &&
      matchesVerificacionRuat &&
      matchesTab
    );
  }
  private normalizeFilterText(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  public openModal(content: any | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalTaxpayerComponent, {
      backdrop: 'static',
      size: size
    });
    modalRef.componentInstance.row = content;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.clientsList = this.contribuyentesList;
    modalRef.componentInstance.userPermissions = this.canActivate;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getTaxpayers();
    });
  }

  /* API Services */
  loading: boolean = true;
  private getTaxpayers(): void {
    this.loading = true;
    this.contribuyentesService.getAll().subscribe({
      next: (data: Contribuyente[]) => {
        this.temp = data ?? [];
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        Swal.fire({
          text: 'Error al obtener los contribuyentes',
          icon: 'error',
          confirmButtonColor: '#299cdb'
        });
      }
    });
  }
}
