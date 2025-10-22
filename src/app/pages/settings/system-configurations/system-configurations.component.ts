import { Component, OnInit } from '@angular/core';
import { NgbModal, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { ngxCsv } from 'ngx-csv/ngx-csv';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ConfiguracionSistemaService } from 'src/app/core/services/api/configuracionSistema.service';
import { ModalComponent } from './modal/modal.component';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';


@Component({
  selector: 'app-system-configurations',
  templateUrl: './system-configurations.component.html',
  styleUrl: './system-configurations.component.scss'
})
export class SystemConfigurationsComponent implements OnInit {
  title = "Configuraciones de Sistema";
  breadCrumbItems!: Array<{}>;
  canActivate: string[];
  itemsList: any[] = [];
  viewMode: 'table' | 'cards' = 'table';

  configuracionesList: ConfiguracionSistema[] = [];
  temp: ConfiguracionSistema[] = [];
  categoriasList: string[] = [];

  // Search filters
  searchTerm: string = '';
  estado: string = '';
  categoria: string = '';
  modificable: string = '';

  selectedItems: any[] = [];

  constructor(
    private modalService: NgbModal, 
    private authService: AuthenticationService,
    private configuracionSistemaService: ConfiguracionSistemaService,
  ) {
    this.canActivate = this.authService.hasPermission(this.title);
  }

  ngOnInit(): void {
    const savedViewMode = localStorage.getItem('dataTableViewMode');
    if (savedViewMode === 'table' || savedViewMode === 'cards') {
      this.viewMode = savedViewMode;
    }
    this.breadCrumbItems = [
      { label: '' },
      { label: this.title, active: true }
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
      { name: 'Modificable', prop: 'modificablePorUsuario', tag: true, visible: true },
      { name: 'Requiere Aprobación', prop: 'requiereAprobacion', tag: true, visible: false },
      { name: 'Aplica A', prop: 'aplicaA', visible: false },
      { name: 'Fecha Creación', prop: 'fechaCreacion', visible: false, date: true },
    ];
    
    this.getConfiguraciones();
    this.getCategorias();
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

  performSearch(): void {
    this.applyFilters();
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

  getSelectedItems(items: any[]) {
    this.selectedItems = items;
  }

  toggleColumn(column: any) {
    column.visible = !column.visible;
  }

  public openModal(content: any | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalComponent, {
      backdrop: 'static',
      size: size
    });
    modalRef.componentInstance.row = content;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.categoriasList = this.categoriasList;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getConfiguraciones();
      this.getCategorias();
    });
  }

  // Csv File Export
  csvFileExport() {
    const lista = this.selectedItems.flatMap((item: any) => {
      const baseData = {
        clave: item.clave,
        nombre: item.nombre,
        categoria: item.categoria,
        valorTexto: item.valorTexto,
        valorNumerico: item.valorNumerico,
        valorBoolean: item.valorBoolean ? 'Sí' : 'No',
        unidadMedida: item.unidadMedida,
        descripcion: item.descripcion,
        modificablePorUsuario: item.modificablePorUsuario ? 'Sí' : 'No',
        requiereAprobacion: item.requiereAprobacion ? 'Sí' : 'No',
        activo: item.activo ? 'Activo' : 'Inactivo',
        aplicaA: item.aplicaA,
        referenciaUuid: item.referenciaUuid,
        fechaCreacion: item.fechaCreacion,
      };
      return [{...baseData}];
    });

    var data = {
      fieldSeparator: ',',
      quoteStrings: '"',
      decimalseparator: '.',
      showLabels: true,
      showTitle: true,
      title: 'Lista de Configuraciones del Sistema',
      useBom: true,
      noDownload: false,
      headers: [
        "Clave", 
        "Nombre", 
        "Categoría", 
        "Valor Texto", 
        "Valor Numérico", 
        "Valor Boolean", 
        "Unidad Medida", 
        "Descripción", 
        "Modificable por Usuario", 
        "Requiere Aprobación",
        "Estado",
        "Aplica A",
        "Referencia UUID", 
        "Fecha Creación"
      ]
    };
    new ngxCsv(lista, "configuraciones_sistema", data);
  }

  /* API Services */
  loading: boolean = true;
  
  private getConfiguraciones() {
    this.configuracionSistemaService.getAll().subscribe({
      next: (data: any) => {
        this.loading = false;
        if (data['status'] === 'OK') {
          this.configuracionesList = data.payload;
          this.temp = this.configuracionesList;
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error loading configurations:', error);
        Swal.fire({ text: 'Error al obtener las configuraciones', icon: 'error', confirmButtonColor: '#299cdb' });
      }
    });
  }

  private getCategorias() {
    this.configuracionSistemaService.getCategorias().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.categoriasList = data.payload;
        }
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }
}