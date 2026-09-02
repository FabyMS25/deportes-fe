import { Component, OnInit } from '@angular/core';
import { NgbModal, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { SystemConfigurationService } from 'src/app/core/services/api/system-configuration.service';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { CsvColumn } from 'src/app/shared/data-header/data-header.component';
import { SystemConfigurationModalComponent } from '../../modals/modal-system-configuration/modal-system-configuration.component';
import { BreadCrumbItem } from 'src/app/shared/breadcrumbs/breadcrumbs.component';


@Component({
  selector: 'app-system-configurations',
  templateUrl: './system-configurations.component.html',
  styleUrl: './system-configurations.component.scss'
})
export class SystemConfigurationsComponent implements OnInit {
  breadCrumbItems: BreadCrumbItem[] =[];
  viewMode: 'table' | 'cards' = 'table';
  canActivate: string[];
  itemsList: any[] = [];
  temp: ConfiguracionSistema[] = [];
  configuracionesList: ConfiguracionSistema[] = [];
  categoriasList: string[] = [];

  // Search filters
  searchTerm: string = '';
  estado: string = '';
  categoria: string = '';
  modificable: string = '';

  selectedItems: any[] = [];
  readonly CSV_COLUMNS: CsvColumn<ConfiguracionSistema>[] = [
    { header: 'Clave', value: item => item.clave || '-' },
    { header: 'Nombre', value: item => item.nombre || '-' },
    { header: 'Categoría', value: item => item.categoria || '-' },
    { header: 'Valor Texto', value: item => item.valorTexto || '-' },
    { header: 'Valor Numérico', value: item => item.valorNumerico ?? '-' },
    { header: 'Valor Boolean', value: item => item.valorBoolean ? 'Sí' : 'No' },
    { header: 'Unidad Medida', value: item => item.unidadMedida || '-' },
    { header: 'Descripción', value: item => item.descripcion || '-' },
    { header: 'Nivel de edición', value: item => item.modificablePorUsuario ? 'Estándar' : 'Protegida' },
    { header: 'Estado', value: item => item.activo ? 'Activo' : 'Inactivo' },
    { header: 'Aplica A', value: item => item.aplicaA || '-' },
    { header: 'Referencia UUID', value: item => item.referenciaUuid || '-' },
    { header: 'Fecha Creación', value: item => item.fechaCreacion || '-' },
  ];

  constructor(
    private modalService: NgbModal, 
    private authService: AuthenticationService,
    private configuracionSistemaService: SystemConfigurationService,
  ) {
    this.canActivate = this.authService.hasPermission('Configuraciones de Sistema');
  }

  ngOnInit(): void {
    const savedViewMode = localStorage.getItem('dataTableViewMode');
    if (savedViewMode === 'table' || savedViewMode === 'cards') {
      this.viewMode = savedViewMode;
    }
    this.breadCrumbItems = [
      { label: 'Administración' },
      { label: 'Configuraciones de Sistema', active: true }
    ];
    
    this.itemsList = [
      { name: 'Clave', prop: 'clave', visible: true },
      { name: 'Nombre', prop: 'nombre', visible: true },
      { name: 'Categoría', prop: 'categoria', visible: true },
      { name: 'Valor', prop: 'valorTexto', visible: true },
      { name: 'Valor Numérico', prop: 'valorNumerico', visible: false },
      { name: 'Valor Boolean', prop: 'valorBoolean', visible: false },
      { name: 'Unidad', prop: 'unidadMedida', visible: false },
      { name: 'Estado', prop: 'activo', tag: true, visible: true },
      { name: 'Edición estándar', prop: 'modificablePorUsuario', tag: true, visible: false },
      { name: 'Aplica A', prop: 'aplicaA', visible: false },
      { name: 'Fecha Creación', prop: 'fechaCreacion', visible: false, date: true },
    ];
    
    this.getConfigurations();
    this.getCategories();
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

  applyFilters() {
    if (!this.temp || this.temp.length === 0) return;

    this.configuracionesList = this.temp.filter(item => {
      const searchMatch = !this.searchTerm || this.searchInConfiguracion(item, this.searchTerm);
      const estadoMatch = !this.estado || 
        (this.estado === 'ACTIVO' && item.activo) ||
        (this.estado === 'INACTIVO' && !item.activo);
      const categoriaMatch = !this.categoria || item.categoria === this.categoria;
      const modificableMatch = !this.modificable || 
        (this.modificable === 'SI' && item.modificablePorUsuario) ||
        (this.modificable === 'NO' && !item.modificablePorUsuario);
      
      return searchMatch && estadoMatch && categoriaMatch && modificableMatch;
    });
  }

  private searchInConfiguracion(item: any, searchTerm: string): boolean {
    if (!searchTerm) return true;    
    const term = searchTerm.toLowerCase();
    return (
      item.clave?.toLowerCase().includes(term) ||
      item.nombre?.toLowerCase().includes(term) ||
      item.categoria?.toLowerCase().includes(term) ||
      item.valorTexto?.toLowerCase().includes(term) ||
      item.descripcion?.toLowerCase().includes(term) ||
      item.unidadMedida?.toLowerCase().includes(term) ||
      item.aplicaA?.toLowerCase().includes(term)
    );
  }

  onNavChange(changeEvent: NgbNavChangeEvent) {
    switch (changeEvent.nextId) {
      case 1: 
        this.configuracionesList = this.temp;
        break;
      case 2:
        this.configuracionesList = this.temp.filter(item => item.activo === true);
        break;
      case 3:
        this.configuracionesList = this.temp.filter(item => item.modificablePorUsuario === true);
        break;
      case 4:
        this.configuracionesList = this.temp.filter(item => item.aplicaA === 'global');
        break;
    }
  }

  public openModal(content: any | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(SystemConfigurationModalComponent, {
      backdrop: 'static',
      size: size
    });
    modalRef.componentInstance.row = content;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.categoriasList = this.categoriasList;
    modalRef.componentInstance.permissions = this.canActivate;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getConfigurations();
      this.getCategories();
    });
  }

  /* API Services */
  loading: boolean = true;
  
  private getConfigurations() {
    this.configuracionSistemaService.getAll().subscribe({
      next: (data: any) => {
        this.loading = false;
        this.configuracionesList = data;
        this.temp = this.configuracionesList;
      },
      error: (error) => {
        this.loading = false;
        Swal.fire({ text: 'Error al obtener las configuraciones', icon: 'error', confirmButtonColor: '#299cdb' });
      }
    });
  }

  private getCategories() {
    this.configuracionSistemaService.getCategories().subscribe({
      next: (data: any) => {
        this.categoriasList = data;
      },
    });
  }
}
