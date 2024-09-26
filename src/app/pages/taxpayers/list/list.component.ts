import { Component, QueryList, ViewChildren } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
// Csv File Export
import { ngxCsv } from 'ngx-csv/ngx-csv';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { ModalComponent } from '../modal/modal.component';
import { CityAcronym } from 'src/app/core/data/Places';

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
    this.breadCrumbItems = [
      { label: '' },
      { label: this.title, active: true }
    ];
    this.itemsList = [
      {name: 'Nombre', prop: 'nombre',visible:true},
      {name: 'Primer Apellido', prop: 'apPaterno',visible:false},
      {name: 'Segundo Apellido', prop: 'apMaterno',visible:false},
      {name: 'Nro Carnet',prop: 'nroCarnet',visible:true},
      {name: 'Celular', prop: 'celular',visible:true},
      {name: 'NIT', prop: 'nroNit',visible:false},
      {name: 'Genero', prop: 'sexo',visible:false},
      {name: 'Estado Civil', prop: 'estadoCivil',visible:false},
      {name: 'Fecha Nacimiento', prop: 'fechaNac',visible:false},
      {name: 'Direccion', prop: 'direccion',visible:false},
      {name: 'Estado', prop: 'estadoUsuario',tag:true,visible:true},
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
        item.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.apPaterno.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.apMaterno.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.nroCarnet.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.correo.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
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
    modalRef.componentInstance.itemsList.subscribe(() => {
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
        expedido: city ? city.description : '',
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
        }else{
          Swal.fire({ text: data.payload, confirmButtonColor: '#299cdb'});
        }
      },
      error: (error) => {
        this.loading = false;
      }
    });
  }
}
