import { Component, QueryList, ViewChildren } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
// Csv File Export
import { ngxCsv } from 'ngx-csv/ngx-csv';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { ModalComponent } from '../modal/modal.component';
import { CityAcronym } from 'src/app/core/constants/Places';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})

export class ListComponent {
  title="Contribuyentes";
  breadCrumbItems!: Array<{}>;
  canActivate:string[];
  itemsList:any[]=[];
  temp:any[]=[];
  viewMode: 'table' | 'cards' = 'table';

  contribuyentesList:any[]=[];

  masterSelected!: boolean;

  searchTerm: any;
  filterDate: any;
  status: any = '';
  
  constructor(private modalService: NgbModal, 
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
      {name: 'Nombre Completo', prop: 'nombreCompleto',visible:true},
      {name: 'Nombre', prop: 'nombre',visible:false},
      {name: 'Primer Apellido', prop: 'primerApellido',visible:false},
      {name: 'Segundo Apellido', prop: 'segundoApellido',visible:false},
      {name: 'Apellido Esposo', prop: 'apellidoEsposo',visible:false},
      {name: 'Tipo Contribuyente', prop: 'tipoContribuyente',visible:false},
      {name: 'Nro Documento',prop: 'numeroDocumento',visible:true},
      {name: 'Expedido', prop: 'expedido',visible:false},
      {name: 'NIT', prop: 'nroNit',visible:false},
      {name: 'Genero', prop: 'genero',visible:false},
      {name: 'Estado Civil', prop: 'estadoCivil',visible:false},
      {name: 'Fecha Nacimiento', prop: 'fechaNacimiento',visible:false},
      {name: 'Teléfono', prop: 'telefono',visible:true},
      {name: 'Email', prop: 'email',visible:false},
      {name: 'Dirección', prop: 'direccion',visible:false},
      {name: 'Estado Usuario', prop: 'estadoUsuario',tag:true,visible:true},
      {name: 'Estado Ruat', prop: 'estadoRuat',visible:true,tag:true},
      
      {name: 'Es Deportista Elite', prop: 'esDeportistaElite',visible:false,tag:true},
      // {name: '', prop: 'perteneceEscuelaMunicipal',visible:true},
      // {name: '', prop: 'registroUnicoDeportivo',visible:true},
      // {name: '', prop: 'fechaUltimoUsoGratuito',visible:true},
      // {name: '', prop: 'observacionesMunicipales',visible:true},
      // {name: '', prop: 'descuentoAplicable',visible:true},
      // {name: '', prop: 'puedeReservarGratis',visible:true},

      {name: 'Fecha Creacion', prop: 'fechaCreacion',visible:false, date:true},
      {name: 'Fecha Actualización', prop: 'fechaActualizacion',visible:false, date:true},
      {name: 'Estado Sancionado', prop: 'estaSancionado',visible:false},
      {name: 'Fecha fin Sancion', prop: 'fechaFinSancion',visible:false, date:false},
      {name: 'Motivo', prop: 'motivoSancion',visible:false},
    ];
    this.getTaxpayers();
  }

  selectedItems:any[] =[];
  getSelectedItems(items: any[]) {
    this.selectedItems = items;
  }
  toggleColumn(column: any) {
    column.visible = !column.visible;
  }

  // Search Data
  performSearch(): void {
    this.contribuyentesList = this.temp.filter((item: any) => {
      return (
        item.nombreCompleto.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.primerApellido.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.segundoApellido.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.numeroDocumento.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.estadoUsuario.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    });
  }
 
  statusFilter() {
    if (this.status != '') {
      this.contribuyentesList = this.temp.filter((item: any) => item.estadoUsuario == this.status);
    } else {
      this.contribuyentesList = this.temp
    }
  }
  
  /**
  * Open modal
  * @param content modal content
  */
  public openModal(content: any | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalComponent, {
        backdrop: 'static',
        size:size
    });
    modalRef.componentInstance.row = content;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.clientsList = this.contribuyentesList;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getTaxpayers();
    });
  }

  // Csv File Export
  csvFileExport() {
    const lista = this.selectedItems.flatMap((item: any) => {
      const city = CityAcronym.find(city => city.id === item.ciExpedido);   ;
      const baseData = {
        nombre: item.nombre,
        apPaterno: item.apPaterno,
        apMaterno: item.apMaterno,
        fechaNacimiento: item.fechaNac,
        genero: item.sexo,
        carnet: item.nroCarnet,
        nit: item.nroNit,
        expedido: city ? city.value : '',
        direccion: item.direccion,
        celular: item.celular,
        email: item.correo,
        tipoContribuyente: item.tipoContribuyente,
        codigoContribuyente: item.codigoContribuyente,
        estadoCivil: item.estadoCivil,
        estadoUsuario: item.estadoUsuario,
      };    
      return [{...baseData}];      
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
      headers: ["Nombre", "Apellido Paterno", "Apellido Materno",, "Fecha Nacimiento","Genero", "Nro Carnet","Nro NIT","Expedido",
        "Dirección","Celular", "Email", "Tipo Contribuyente", "Codigo Contribuyente", "Estado Civil","Estado Usuario"]
    };
    new ngxCsv(lista, "contribuyentes", data);
  }

  
  /* API Services */
  loading: boolean = true;
  private getTaxpayers(){
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
      }
    });
  }
}
