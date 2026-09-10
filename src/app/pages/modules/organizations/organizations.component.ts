import { Component, OnInit } from '@angular/core';
import { NgbModal, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { OrganizacionService } from 'src/app/core/services/api/organizacion.service';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { Organizacion } from 'src/app/core/models/organizacion.model';
import { ModalOrganizationComponent } from '../../modals/modal-organization/modal-organization.component';
import { CsvColumn } from 'src/app/shared/data-header/data-header.component';
import { BreadCrumbItem } from 'src/app/shared/breadcrumbs/breadcrumbs.component';
import { TipoOrganizacion } from 'src/app/core/constants/Features';
@Component({
  selector: 'app-organizations',
  templateUrl: './organizations.component.html',
  styleUrl: './organizations.component.scss'
})
export class OrganizationsComponent implements OnInit {
  breadCrumbItems: BreadCrumbItem[] =[];
  viewMode: 'table' | 'cards' = 'table';
  canActivate: string[];
  itemsList: any[] = [];
  temp: Organizacion[] = [];
  organizacionesList: Organizacion[] = [];

  loading: boolean = true;
  contribuyentesList: any[] = []; 
  contribuyente!:Contribuyente;
  
  selectedItems: Organizacion[] = [];
  searchTerm = '';
  estado = '';
  tieneNit = '';
  tienePersoneriaJuridica = '';
  tipoOrganizacion = 'TODAS';
  tipoOrganizacionList = Object.values(TipoOrganizacion);

  readonly CSV_COLUMNS: CsvColumn<Organizacion>[] = [
    { header: 'Nombre', value: item => item.nombre ?? '' },
    { header: 'Tipo Organización', value: item => item.tipoOrganizacion ?? '' },
    { header: 'Teléfono', value: item => item.telefono ?? '' },
    { header: 'Email', value: item => item.email ?? '' },
    { header: 'Dirección', value: item => item.direccion ?? '' },
    { header: 'Personería Jurídica', value: item => item.personeriaJuridica ?? '' },
    { header: 'NIT', value: item => item.nroNit ?? '' },
    { header: 'Estado', value: item => item.activo ? 'Activo' : 'Inactivo' },
    { header: 'Representantes', value: item => item.representantesTexto ?? ''},
    { header: 'Documentos Representantes', value: item => item.representantesDocumentos ?? ''},
    { header: 'Emails Representantes', value: item => item.representantesEmails ?? ''},
    { header: 'Teléfonos Representantes', value: item => item.representantesTelefonos ?? ''},
    { header: 'Fecha Creación', value: item =>    item.fechaCreacion
          ? new Date(item.fechaCreacion).toLocaleDateString('es-BO') : '' }
  ];

  constructor(
    private modalService: NgbModal, 
    private authService: AuthenticationService,
    private organizacionesService: OrganizacionService,
    private contribuyentesService: ContribuyentesService,
  ) {
    this.canActivate = this.authService.hasPermission('/organizations');
  }

  ngOnInit(): void {
    const savedViewMode = localStorage.getItem('dataTableViewMode');
    if (savedViewMode === 'table' || savedViewMode === 'cards') {
      this.viewMode = savedViewMode;
    }
    this.breadCrumbItems = [
      { label: '' },
      { label: 'Organizaciones', active: true }
    ];
    const currentUser = this.authService.currentUser();
    if (this.authService.getUserRole() === 'Contribuyente') {
      this.contribuyente =currentUser;
    }    
    this.itemsList = [
      { name: 'Nombre', prop: 'nombre', visible: true, truncate: 70 },
      { name: 'Tipo Organización', prop: 'tipoOrganizacion', visible: true },
      { name: 'Teléfono', prop: 'telefono', visible: false },
      { name: 'Email', prop: 'email', visible: false },
      { name: 'Dirección', prop: 'direccion', visible: false, truncate: 90 },
      { name: 'Personería Jurídica', prop: 'personeriaJuridica', visible: false },
      { name: 'NIT', prop: 'nroNit', visible: false },
      { name: 'Estado', prop: 'activo', tag: true, visible: true },
      { name: 'Representantes', prop: 'representantesTexto', visible: true, truncate: 85 },
      { name: 'Documentos Representantes', prop: 'representantesDocumentos', visible: false },
      { name: 'Emails Representantes', prop: 'representantesEmails', visible: false, truncate: 85 },
      { name: 'Teléfonos Representantes', prop: 'representantesTelefonos', visible: false },
      { name: 'Fecha Creación', prop: 'fechaCreacion', visible: false, date: true },
    ];
    this.getOrganizations();
    this.getContribuyentesForRepresentatives();
  }
  getSelectedItems(items: Organizacion[]): void {
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
    this.tipoOrganizacion = String(event.nextId);
    this.applyFilters();
  }
  getTabCount(organizationType: string ): number {
    return this.temp.filter(item =>
      this.matchesFilters(item, organizationType)
    ).length;
  }
  clearFilters(): void {
    this.searchTerm = '';
    this.estado = '';
    this.tipoOrganizacion = 'TODAS';
    this.tieneNit = '';
    this.tienePersoneriaJuridica = '';
    this.selectedItems = [];
    this.applyFilters();
  }

  applyFilters(): void {
    this.organizacionesList = this.temp.filter(item =>
      this.matchesFilters(item, this.tipoOrganizacion)
    );
    this.selectedItems = this.selectedItems.filter(selected =>
      this.organizacionesList.some(
        item => item.uuid === selected.uuid
      )
    );
  }
  private matchesFilters(
    item: Organizacion,
    organizationType: string
  ): boolean {
    const search = this.normalizeFilterText(this.searchTerm);

    const hasNit =
      this.normalizeFilterText(item.nroNit) !== '';

    const hasLegalStatus =
      this.normalizeFilterText(item.personeriaJuridica) !== '';

    const matchesSearch =
      !search ||
      [
        item.nombre,
        item.tipoOrganizacion,
        item.telefono,
        item.email,
        item.direccion,
        item.personeriaJuridica,
        item.nroNit,
        item.representantesTexto,
        item.representantesDocumentos,
        item.representantesEmails,
        item.representantesTelefonos
      ].some(value =>
        this.normalizeFilterText(value).includes(search)
      );

    const matchesStatus =
      !this.estado ||
      (this.estado === 'ACTIVO' && item.activo === true) ||
      (this.estado === 'INACTIVO' && item.activo === false);

    const matchesNit =
      !this.tieneNit ||
      (this.tieneNit === 'SI' && hasNit) ||
      (this.tieneNit === 'NO' && !hasNit);

    const matchesLegalStatus =
      !this.tienePersoneriaJuridica ||
      (
        this.tienePersoneriaJuridica === 'SI' &&
        hasLegalStatus
      ) ||
      (
        this.tienePersoneriaJuridica === 'NO' &&
        !hasLegalStatus
      );

    const matchesOrganizationType =
      organizationType === 'TODAS' ||
      item.tipoOrganizacion === organizationType;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesNit &&
      matchesLegalStatus &&
      matchesOrganizationType
    );
  }
  private withRepresentativeSummary(item: Organizacion): Organizacion {
    const reps = item.representantesDto?.map(value => value.contribuyenteDto).filter(Boolean) || [];
    const unique = (values: Array<string | undefined>) => [...new Set(values.map(value => String(value ?? '').trim()).filter(Boolean))].join(', ');
    return {
      ...item,
      representantesTexto: unique(reps.map(rep => String(rep?.nombreCompleto || [rep?.nombre, rep?.primerApellido, rep?.segundoApellido].filter(Boolean).join(' ')))),
      representantesDocumentos: unique(reps.map(rep => rep?.numeroDocumento)),
      representantesEmails: unique(reps.map(rep => rep?.email)),
      representantesTelefonos: unique(reps.map(rep => rep?.telefono))
    };
  }

  private normalizeFilterText(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private searchInOrganization(item: any, searchTerm: string): boolean {
    if (!searchTerm) return true;    
    const term = searchTerm.toLowerCase();
    return (
      item.nombre?.toLowerCase().includes(term) ||
      item.tipoOrganizacion?.toLowerCase().includes(term) ||
      item.telefono?.toLowerCase().includes(term) ||
      item.email?.toLowerCase().includes(term) ||
      item.direccion?.toLowerCase().includes(term) ||
      item.personeriaJuridica?.toLowerCase().includes(term) ||
      item.nroNit?.toLowerCase().includes(term) ||
      item.representantesTexto?.toLowerCase().includes(term) ||
      item.representantesDocumentos?.toLowerCase().includes(term) ||
      item.representantesEmails?.toLowerCase().includes(term) ||
      item.representantesTelefonos?.toLowerCase().includes(term)
    );
  }


  public openModal(content: any | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalOrganizationComponent, {
      backdrop: 'static',
      size: size
    });
    modalRef.componentInstance.row = content;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.contribuyentesList = this.contribuyentesList;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getOrganizations();
    });
  }

  /* API Services */  
  private getOrganizations(): void {
    this.loading = true;

    this.organizacionesService.getAll().subscribe({
      next: (data: any) => {
        let organizations: Organizacion[] =
          data?.content ?? data ?? [];

        organizations = organizations.map(item => this.withRepresentativeSummary(item));

        if (this.contribuyente) {
          organizations = organizations.filter(item =>
            item.representantesDto?.some(r => r.contribuyenteDto?.uuid === this.contribuyente.uuid)
          );
        }

        this.temp = organizations;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;

        Swal.fire({
          text: 'Error al obtener las organizaciones',
          icon: 'error',
          confirmButtonColor: '#299cdb'
        });
      }
    });
  }

  private getContribuyentesForRepresentatives() {
    this.contribuyentesService.getAll().subscribe({
      next: (data: any) => {
        this.contribuyentesList = data;
      }
    });
  }
}
