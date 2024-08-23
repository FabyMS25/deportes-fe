import { Component, QueryList, ViewChildren } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { UntypedFormBuilder, UntypedFormGroup, FormArray, Validators } from '@angular/forms';
// Date Format
import { DatePipe } from '@angular/common';

// Sweet Alert
import Swal from 'sweetalert2';

// Csv File Export
import { ngxCsv } from 'ngx-csv/ngx-csv';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})

/**
 * Customers Component
 */
export class ListComponent {
  title="Contribuyentes";
  breadCrumbItems!: Array<{}>;
  canActivate:string[];
  listaItems:any[]=[];
  temp:any[]=[];
  contribuyentesList:any[]=[];

  masterSelected!: boolean;
  checkedList: any;

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
    this.listaItems = [
      {name: 'Nombre', prop: 'nombre'},
      {name: 'Nro Carnet',prop: 'nroCarnet'},
      {name: 'Celular', prop: 'celular'},
      {name: 'Estado', prop: 'estadoUsuario',tag:true},
    ];
    this.getTaxpayers();
  }

  // Search Data
  performSearch(): void {
    this.contribuyentesList = this.temp.filter((item: any) => {
      return (
        item.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.apPaterno.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.apMaterno.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.nroCarnet.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.correo.toLowerCase().includes(this.searchTerm.toLowerCase())
        // item.status.toLowerCase().includes(this.searchTerm.toLowerCase())
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
  * Confirmation mail model
  */
  deleteId: any;
  confirm(content: any, id: any) {
    this.deleteId = id;
    this.modalService.open(content, { centered: true });
  }

  // Delete Data
  deleteData(id: any) {
    if (id) {
      // this.store.dispatch(deleteCustomer({ id: this.deleteId.toString() }));
    } else {
      // this.store.dispatch(deleteCustomer({ id: this.checkedValGet.toString() }));
    }
    this.deleteId = ''
    this.masterSelected = false
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
    modalRef.componentInstance.listaItems.subscribe(() => {
      this.getTaxpayers();
    });
  }

  // Csv File Export
  csvFileExport() {
    var data = {
      fieldSeparator: ',',
      quoteStrings: '"',
      decimalseparator: '.',
      showLabels: true,
      showTitle: true,
      title: 'Lista de Contribuyentes',
      useBom: true,
      noDownload: false,
      headers: ["uuid", "Usuario","Contraseña","Nombre", "Apellido Paterno", "Apellido Materno", "Nro Carnet","Nro NIT","Expedido","Sexo","Dirección","Celular", "Email", "Tipo Contribuyente", "Codigo Contribuyente", "Estado Civil", "Fecha Nacimiento","Estado Usuario"]
    };
    new ngxCsv(this.contribuyentesList, "contribuyentes", data);
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
