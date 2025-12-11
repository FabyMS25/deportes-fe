import { Component, OnInit } from '@angular/core';
import { NgbModal, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { ngxCsv } from 'ngx-csv/ngx-csv';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { OrganizacionService } from 'src/app/core/services/api/organizacion.service';
import { ModalComponent } from './modal/modal.component';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { Organizacion } from 'src/app/core/models/organizacion.models';

@Component({
  selector: 'app-organizations',
  templateUrl: './organizations.component.html',
  styleUrl: './organizations.component.scss'
})
export class OrganizationsComponent implements OnInit {
  title = "Organizaciones";
  breadCrumbItems!: Array<{}>;
  canActivate: string[];
  itemsList: any[] = [];
  temp: any[] = [];
  viewMode: 'table' | 'cards' = 'table';

  loading: boolean = true;
  organizacionesList: any[] = [];
  contribuyentesList: any[] = []; 
  contribuyente!:Contribuyente;
  
  searchTerm: string = '';
  estado: string = '';
  tipoOrganizacion: string = '';
  tieneNit: string = '';
  tienePersoneriaJuridica: string = '';
  selectedItems: any[] = [];

  constructor(
    private modalService: NgbModal, 
    private authService: AuthenticationService,
    private organizacionesService: OrganizacionService,
    private contribuyentesService: ContribuyentesService,
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
    const currentUser = this.authService.currentUser();
    if (this.authService.getUserRole() === 'Contribuyente') {
      this.contribuyente =currentUser;
    }    
    this.itemsList = [
      { name: 'Nombre', prop: 'nombre', visible: true },
      { name: 'Tipo Organización', prop: 'tipoOrganizacion', visible: true },
      { name: 'Teléfono', prop: 'telefono', visible: true },
      { name: 'Email', prop: 'email', visible: false },
      { name: 'Dirección', prop: 'direccion', visible: false },
      { name: 'Personería Jurídica', prop: 'personeriaJuridica', visible: false },
      { name: 'NIT', prop: 'nroNit', visible: false },
      { name: 'Estado', prop: 'activo', tag: true, visible: true },
      { name: 'Representante', prop: 'representanteDto.nombreCompleto', visible: true },
      { name: 'Documento Representante', prop: 'representanteDto.numeroDocumento', visible: false },
      { name: 'Email Representante', prop: 'representanteDto.email', visible: false },
      { name: 'Teléfono Representante', prop: 'representanteDto.telefono', visible: false },
      { name: 'Fecha Creación', prop: 'fechaCreacion', visible: false, date: true },
    ];
    this.getOrganizaciones();
    this.getContribuyentesForRepresentatives();
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

    this.organizacionesList = this.temp.filter(item => {
      const searchMatch = !this.searchTerm || this.searchInOrganizacion(item, this.searchTerm);
      const estadoMatch = !this.estado || 
        (this.estado === 'ACTIVO' && item.activo) ||
        (this.estado === 'INACTIVO' && !item.activo);
      const tipoOrganizacionMatch = !this.tipoOrganizacion || 
        item.tipoOrganizacion?.toLowerCase().includes(this.tipoOrganizacion.toLowerCase());
      const tieneNitMatch = !this.tieneNit || 
        (this.tieneNit === 'SI' && item.nroNit) ||
        (this.tieneNit === 'NO' && !item.nroNit);
      const tienePersoneriaMatch = !this.tienePersoneriaJuridica || 
        (this.tienePersoneriaJuridica === 'SI' && item.personeriaJuridica) ||
        (this.tienePersoneriaJuridica === 'NO' && !item.personeriaJuridica);
      return searchMatch && estadoMatch && tipoOrganizacionMatch && 
             tieneNitMatch && tienePersoneriaMatch;
    });
  }

  private searchInOrganizacion(item: any, searchTerm: string): boolean {
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
      item.representanteNombre?.toLowerCase().includes(term) ||
      item.representanteDocumento?.toLowerCase().includes(term) ||
      item.representanteEmail?.toLowerCase().includes(term) ||
      item.representanteTelefono?.toLowerCase().includes(term)
    );
  }

  onNavChange(changeEvent: NgbNavChangeEvent) {
    switch (changeEvent.nextId) {
      case 1: 
        this.organizacionesList = this.temp;
        break;
      case 2:
        this.organizacionesList = this.temp.filter(item => item.activo === true);
        break;
      case 3:
        this.organizacionesList = this.temp.filter(item => item.activo === false);
        break;
      case 4:
        this.organizacionesList = this.temp.filter(item => item.nroNit && item.nroNit.trim() !== '');
        break;
      case 5:
        this.organizacionesList = this.temp.filter(item => item.personeriaJuridica && item.personeriaJuridica.trim() !== '');
        break;
      case 6:
        this.organizacionesList = this.temp.filter(item => !item.representanteDto || !item.representanteNombre);
        break;
    }
  }

  public openModal(content: any | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalComponent, {
      backdrop: 'static',
      size: size
    });
    modalRef.componentInstance.row = content;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.contribuyentesList = this.contribuyentesList;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getOrganizaciones();
    });
  }

  // Csv File Export
  csvFileExport() {
    const lista = this.selectedItems.flatMap((item: any) => {
      const baseData = {
        nombre: item.nombre,
        tipoOrganizacion: item.tipoOrganizacion,
        telefono: item.telefono,
        email: item.email,
        direccion: item.direccion,
        personeriaJuridica: item.personeriaJuridica,
        nroNit: item.nroNit,
        activo: item.activo ? 'Activo' : 'Inactivo',
        representante: item.representanteNombre,
        documentoRepresentante: item.representanteDocumento,
        emailRepresentante: item.representanteEmail,
        telefonoRepresentante: item.representanteTelefono,
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
      title: 'Lista de Organizaciones',
      useBom: true,
      noDownload: false,
      headers: [
        "Nombre", 
        "Tipo Organización", 
        "Teléfono", 
        "Email", 
        "Dirección", 
        "Personería Jurídica", 
        "NIT", 
        "Estado", 
        "Representante", 
        "Documento Representante",
        "Email Representante",
        "Teléfono Representante", 
        "Fecha Creación"
      ]
    };
    new ngxCsv(lista, "organizaciones", data);
  }

  /* API Services */  
  private getOrganizaciones() {
    this.organizacionesService.getAll().subscribe({
      next: (data: any) => {
        this.loading = false;
        if (data['status'] === 'OK') {
          this.organizacionesList = data.payload.content;
          if(this.contribuyente){
            this.organizacionesList = this.organizacionesList.filter((item:Organizacion)=>
              item.representanteDto.uuid === this.contribuyente.uuid
            );
          }
          this.temp = this.organizacionesList;
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error loading organizations:', error);
        Swal.fire({ text: 'Error al obtener las organizaciones', icon: 'error', confirmButtonColor: '#299cdb' });
      }
    });
  }

  private getContribuyentesForRepresentatives() {
    this.contribuyentesService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.contribuyentesList = data.payload;
        }
      },
      error: (error) => {
        console.error('Error loading contribuyentes for representatives:', error);
      }
    });
  }
}