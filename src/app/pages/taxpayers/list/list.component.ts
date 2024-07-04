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


import { Store } from '@ngrx/store';
import { RootReducerState } from 'src/app/store';
import { PaginationService } from 'src/app/core/services/pagination.service';
import { cloneDeep } from 'lodash';
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

  // bread crumb items
  breadCrumbItems!: Array<{}>;
  submitted = false;
  masterSelected!: boolean;
  checkedList: any;

  searchTerm: any;
  filterDate: any;
  status: any = '';
  
  canActivate:string[];
  listaItems:any[]=[];
  contribuyentesList:any[]=[];
  temp:any[]=[];

  constructor(private modalService: NgbModal, 
     private authService: AuthenticationService,
     private contribuyentesService: ContribuyentesService,
  ) {
      this.canActivate = this.authService.hasPermissionModulo(this.title);
  }

  ngOnInit(): void {
    /**
    * BreadCrumb
    */
    this.breadCrumbItems = [
      { label: '' },
      { label: this.title, active: true }
    ];
    this.listaItems = [
      {name: 'Nombre', prop: 'nombre'},
      {name: 'Nro Carnet',prop: 'nroCarnet'},
      {name: 'Celular', prop: 'celular'},
      {name: 'Estado', prop: 'state',tag:true},
    ];

    this.getTaxpayers();
  }


  /**
   * View Data Get
   * @param content modal content
   */
  viewDataGet(data: any) {
    // this.dataSelected=data
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

  dateFilter() {
    this.contribuyentesList = this.temp.filter((item: any) => new Date(item.date) >= new Date(Object.values(this.dateFilter)[0]) && new Date(item.date) <= new Date(Object.values(this.dateFilter)[1]));
  }

  statusFilter() {
    if (this.status != '') {
      this.contribuyentesList = this.temp.filter((customer: any) => customer.status == this.status);
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
  * Multiple Delete
  */
  checkedValGet: any[] = [];
  deleteMultiple(content: any) {
    var checkboxes: any = document.getElementsByName('checkAll');
    var result
    var checkedVal: any[] = [];
    for (var i = 0; i < checkboxes.length; i++) {
      if (checkboxes[i].checked) {
        result = checkboxes[i].value;
        checkedVal.push(result);
      }
    }
    if (checkedVal.length > 0) {
      this.modalService.open(content, { centered: true });
    }
    else {
      Swal.fire({ text: 'Please select at least one checkbox', confirmButtonColor: '#299cdb', });
    }
    this.checkedValGet = checkedVal;
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
      headers: ["uuid", "Usuario","Contraseña","Nombre", "Apellido Paterno", "Apellido Materno", "Nro Carnet","Nro NIT","Expedido","Sexo","Dirección","email", "celular", "date", "status"]
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
