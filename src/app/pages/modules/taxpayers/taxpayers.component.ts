import { Component, OnInit } from '@angular/core';
import { NgbModal, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { ngxCsv } from 'ngx-csv/ngx-csv';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { CityAcronym } from 'src/app/core/constants/Places';
import { EstadoRuat, EstadoUsuario } from 'src/app/core/constants/Estados';
import { ModalTaxpayerComponent } from '../../modals/modal-taxpayer/modal-taxpayer.component';

@Component({
  selector: 'app-taxpayers',
  templateUrl: './taxpayers.component.html',
  styleUrls: ['./taxpayers.component.scss']
})
export class TaxpayersComponent implements OnInit {
  title = "Contribuyentes";
  breadCrumbItems!: Array<{}>;
  canActivate: string[];
  itemsList: any[] = [];
  temp: any[] = [];
  viewMode: 'table' | 'cards' = 'table';

  contribuyentesList: any[] = [];

  searchTerm: string = '';
  estadoUsuario: string = '';
  estadoRuat: string = '';
  tipoContribuyente: string = '';
  puedeReservarGratis: string = '';
  esDeportistaElite: string = '';

  selectedItems: any[] = [];

  constructor(
    private modalService: NgbModal,
    private authService: AuthenticationService,
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
    this.itemsList = [
      { name: 'Nombre Completo', prop: 'nombreCompleto', visible: true },
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
      { name: 'Dirección', prop: 'direccion', visible: false },
      { name: 'Estado Usuario', prop: 'estadoUsuario', tag: true, visible: true },
      { name: 'Estado Ruat', prop: 'estadoRuat', visible: false, tag: true },
      { name: 'Es Deportista Elite', prop: 'esDeportistaElite', visible: false, tag: true },
      { name: 'Puede Reservar Gratis', prop: 'puedeReservarGratis', visible: false, tag: true },
      { name: 'Pertenece Escuela Municipal', prop: 'perteneceEscuelaMunicipal', visible: false, tag:true},
      { name: 'Registro Único Deportivo', prop: 'registroUnicoDeportivo', visible: false },
      { name: 'Fecha Último Uso Gratuito', prop: 'fechaUltimoUsoGratuito', visible: false, date: true },
      { name: 'Observaciones Municipales', prop: 'observacionesMunicipales', visible: false },
      { name: 'Descuento Aplicable', prop: 'descuentoAplicable', visible: false },
      { name: 'Fecha Creacion', prop: 'fechaCreacion', visible: false, date: true },
      { name: 'Fecha Actualización', prop: 'fechaActualizacion', visible: false, date: true },
      { name: 'Estado Sancionado', prop: 'estaSancionado', visible: false, tag: true },
      { name: 'Fecha fin Sancion', prop: 'fechaFinSancion', visible: false, date: false },
      { name: 'Motivo', prop: 'motivoSancion', visible: false },
    ];    
    this.getTaxpayers();
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
    this.contribuyentesList = this.temp.filter(item => {
      const searchMatch = !this.searchTerm || this.searchInContribuyente(item, this.searchTerm);
      const estadoUsuarioMatch = !this.estadoUsuario || 
        item.estadoUsuario === this.estadoUsuario;
      const estadoRuatMatch = !this.estadoRuat || 
        item.estadoRuat === this.estadoRuat;
      const tipoContribuyenteMatch = !this.tipoContribuyente || 
        item.tipoContribuyente === this.tipoContribuyente;
      const puedeReservarGratisMatch = !this.puedeReservarGratis || 
        (this.puedeReservarGratis === 'SI' && item.puedeReservarGratis) ||
        (this.puedeReservarGratis === 'NO' && !item.puedeReservarGratis);
      const esDeportistaEliteMatch = !this.esDeportistaElite || 
        (this.esDeportistaElite === 'SI' && item.esDeportistaElite) ||
        (this.esDeportistaElite === 'NO' && !item.esDeportistaElite);
      return searchMatch && estadoUsuarioMatch && estadoRuatMatch && 
             tipoContribuyenteMatch && puedeReservarGratisMatch && esDeportistaEliteMatch;
    });
  }

  private searchInContribuyente(item: any, searchTerm: string): boolean {
    if (!searchTerm) return true;    
    const term = searchTerm.toLowerCase();    
    return (
      item.nombreCompleto?.toLowerCase().includes(term) ||
      item.nombre?.toLowerCase().includes(term) ||
      item.primerApellido?.toLowerCase().includes(term) ||
      item.segundoApellido?.toLowerCase().includes(term) ||
      item.apellidoEsposo?.toLowerCase().includes(term) ||
      item.numeroDocumento?.toLowerCase().includes(term) ||
      item.nroNit?.toLowerCase().includes(term) ||
      item.telefono?.toLowerCase().includes(term) ||
      item.email?.toLowerCase().includes(term) ||
      item.direccion?.toLowerCase().includes(term) ||
      item.registroUnicoDeportivo?.toLowerCase().includes(term) ||
      item.observacionesMunicipales?.toLowerCase().includes(term) ||
      item.motivoSancion?.toLowerCase().includes(term) ||
      item.estadoUsuario?.toLowerCase().includes(term) ||
      item.estadoRuat?.toLowerCase().includes(term) ||
      item.tipoContribuyente?.toLowerCase().includes(term)
    );
  }

  onNavChange(changeEvent: NgbNavChangeEvent) {
    switch (changeEvent.nextId) {
      case 1: 
        this.contribuyentesList = this.temp;
        break;
      case 2:
        this.contribuyentesList = this.temp.filter(item => item.tipoContribuyente === 'NA');
        break;
      case 3: 
        this.contribuyentesList = this.temp.filter(item => item.tipoContribuyente === 'JU');
        break;
      case 4:
        this.contribuyentesList = this.temp.filter(item => item.puedeReservarGratis === true);
        break;
      case 5:
        this.contribuyentesList = this.temp.filter(item => item.esDeportistaElite === true);
        break;
      case 6:
        this.contribuyentesList = this.temp.filter(item => item.estaSancionado === true);
        break;
    }
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

  // Csv File Export
  csvFileExport() {
    const lista = this.selectedItems.flatMap((item: any) => {
      const city = CityAcronym.find(city => city.id === item.expedido);
      const baseData = {
        nombreCompleto: item.nombreCompleto,
        tipoContribuyente: item.tipoContribuyente,
        numeroDocumento: item.numeroDocumento,
        expedido: city ? city.value : item.expedido,
        nroNit: item.nroNit,
        telefono: item.telefono,
        email: item.email,
        direccion: item.direccion,
        estadoUsuario: item.estadoUsuario,
        estadoRuat: item.estadoRuat,
        puedeReservarGratis: item.puedeReservarGratis ? 'SI' : 'NO',
        esDeportistaElite: item.esDeportistaElite ? 'SI' : 'NO',
        perteneceEscuelaMunicipal: item.perteneceEscuelaMunicipal ? 'SI' : 'NO',
        registroUnicoDeportivo: item.registroUnicoDeportivo,
        descuentoAplicable: item.descuentoAplicable,
        estaSancionado: item.estaSancionado ? 'SI' : 'NO',
        fechaFinSancion: item.fechaFinSancion,
        motivoSancion: item.motivoSancion,
        fechaCreacion: item.fechaCreacion,
        fechaActualizacion: item.fechaActualizacion
      };
      return [{ ...baseData }];
    });

    var data = {
      fieldSeparator: ',',
      quoteStrings: '"',
      decimalseparator: '.',
      showLabels: true,
      showTitle: true,
      title: 'Lista de Contribuyentes',
      useBom: true,
      noDownload: false,
      headers: [
        "Nombre Completo", "Tipo Contribuyente", "Nro Documento", "Expedido", "NIT",
        "Teléfono", "Email", "Dirección", "Estado Usuario", "Estado Ruat",
        "Puede Reservar Gratis", "Es Deportista Elite", "Pertenece Escuela Municipal",
        "Registro Único Deportivo", "Descuento Aplicable", "Está Sancionado",
        "Fecha Fin Sanción", "Motivo Sanción", "Fecha Creación", "Fecha Actualización"
      ]
    };
    new ngxCsv(lista, "contribuyentes", data);
  }

  /* API Services */
  loading: boolean = true;
  private getTaxpayers() {
    this.contribuyentesService.getAll().subscribe({
      next: (data: any) => {
        this.loading = false;
        if (data['status'] === 'OK') {
          this.contribuyentesList = data.payload;
          this.temp = data.payload;
        }
      },
      error: (error) => {
        this.loading = false;
        Swal.fire({ text: 'Error al obtener los contribuyentes', icon: 'error', confirmButtonColor: '#299cdb' });
      }
    });
  }
}