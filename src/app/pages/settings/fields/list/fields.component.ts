import { Component, TemplateRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NgbModal, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import {  UntypedFormGroup } from '@angular/forms';

// Csv File Export
import { ngxCsv } from 'ngx-csv/ngx-csv';

// Sweet Alert
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { DeportesService } from 'src/app/core/services/api/deporte.service';
import { ModalFieldsComponent } from '../modal/modal.component';
import { campoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { CamposDeportivoService } from 'src/app/core/services/api/camposDeportivos.service';
@Component({
  selector: 'app-fields',
  templateUrl: './fields.component.html',
  styleUrls: ['./fields.component.scss']
})

/**
 * Companies Component
 */
export class FieldsComponent {
  title="Campos Deportivos";
  // bread crumb items
  breadCrumbItems!: Array<{}>;
  submitted = false;
  fieldsForm!: UntypedFormGroup;
  CustomersData!: any;
  masterSelected!: boolean;
  checkedList: any;

  searchTerm: any;

  canActivate:string[];
  categoryList:any[]=[];
  listaItems:any[]=[];
  canchasList:any[]=[];
  temp:any[]=[];
  
  dataSelected!:campoDeportivo;
  constructor(private modalService: NgbModal,
    private fieldsService: CamposDeportivoService,
    private deportesService: DeportesService,
    private authService: AuthenticationService, 
    private offcanvasService: NgbOffcanvas,
    private datePipe: DatePipe,) {
      this.canActivate = this.authService.hasPermissionModulo(this.title);
  }

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'Administracion' },
      { label: this.title, active: true }
    ];
    this.listaItems = [
      {name: 'Complejo', prop: 'complejoDto.nombre'},
      {name: 'Superficie',prop: 'superficie'},
      {name: 'tipo', prop: 'tipo'},
      {name: 'Categoria(s)', prop: 'totalxhora'},
    ];
    /**
     * fetches data
     */
    this.getCategories();
    this.getFields()
  }


  // Search Data
  performSearch(): void {
    this.canchasList = this.temp.filter((item: any) => {
      return (
        item.nombre.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    });
  }


  // Filtering
  isstatus?: any
  leads:any
  SearchData() {
    var date = document.getElementById("isDate") as HTMLInputElement;
    var dateVal = date.value ? this.datePipe.transform(new Date(date.value), "yyyy-MM-dd") : '';

    if (dateVal != '') {
      this.leads = this.temp.filter((order: any) => {
        return this.datePipe.transform(new Date(order.date), "yyyy-MM-dd") == dateVal;
      });
    }
    else {
      this.leads = this.categoryList;
    }
  }
  /**
   * Open modal
   * @param content modal content
   */
  public openModal(row: campoDeportivo | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalFieldsComponent, {
        backdrop: 'static',
        size:size
    });
    modalRef.componentInstance.row = row;
    modalRef.componentInstance.categoryList = this.categoryList;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.listaItems.subscribe(() => {
    this.getFields();
    });
  }
  /**
   * Form data get
   */
  get form() {
    return this.fieldsForm.controls;
  }

  //  Filter Offcanvas Set
  openEnd(content: TemplateRef<any>) {
    this.offcanvasService.open(content, { position: 'end' });
  }
  /**
   * View Data Get
   * @param content modal content
   */
  viewDataGet(data: any) {
    this.dataSelected=data
  }



  /**
  * Delete model
  */
  deleteId: any;
  confirm(content: any, id: any) {
    this.deleteId = id;
    this.modalService.open(content, { centered: true });
  }

  // Delete Data
  deleteData(id: any) {
    if (id) {
      // this.store.dispatch(deleteCompany({ id: this.deleteId.toString() }));
    } else {
      // this.store.dispatch(deleteCompany({ id: this.checkedValGet.toString() }));
    }
    this.deleteId = '';
    this.masterSelected = false;
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

  // The master checkbox will check/ uncheck all items
  checkUncheckAll(ev: any) {
    this.canchasList.forEach((x: { state: any; }) => x.state = ev.target.checked)
    var checkedVal: any[] = [];
    var result
    for (var i = 0; i < this.canchasList.length; i++) {
      if (this.canchasList[i].state == true) {
        result = this.canchasList[i];
        checkedVal.push(result);
      }
    }
    this.checkedValGet = checkedVal
    checkedVal.length > 0 ? (document.getElementById("remove-actions") as HTMLElement).style.display = "block" : (document.getElementById("remove-actions") as HTMLElement).style.display = "none";

  }

  // Select Checkbox value Get
  onCheckboxChange(e: any) {
    var checkedVal: any[] = [];
    var result
    for (var i = 0; i < this.canchasList.length; i++) {
      if (this.canchasList[i].state == true) {
        result = this.canchasList[i];
        checkedVal.push(result);
      }
    }
    this.checkedValGet = checkedVal
    checkedVal.length > 0 ? (document.getElementById("remove-actions") as HTMLElement).style.display = "block" : (document.getElementById("remove-actions") as HTMLElement).style.display = "none";
  }

  // Csv File Export
  csvFileExport() {
    var data = {
      fieldSeparator: ',',
      quoteStrings: '"',
      decimalseparator: '.',
      showLabels: true,
      showTitle: true,
      title: 'Lista de Campos Deportivos',
      useBom: true,
      noDownload: false,
      headers: ["Uuid", "Techado", "Superficie", "Dirección", "Distrito", "Tarifa", "Latitud", "Longitud", "Nombre", "Estado"]
    };
    new ngxCsv(this.canchasList, "Lista de Campos Deportivos", data);
  }


  // Sort filter
  sortField: any;
  sortBy: any
  SortFilter(event: Event) {
    const selectedValue = (event.target as HTMLSelectElement).value;
    console.log('Selected value:', selectedValue);
    this.sortField = (document.getElementById("choices-single-default") as HTMLInputElement).value;
    if (this.sortField[0] == 'D') {
      this.sortBy = 'asc';
      this.sortField = this.sortField.replace(/D/g, '')
    }
  }

  /* API Services */
  private getCategories(){
    this.deportesService.getAll().subscribe({
        next: (data: any) => {
          if (data['status'] === 'OK') {
            this.categoryList = data.payload;
          }
        }
      });
  }
  loading: boolean = true;
  private getFields(){
    this.fieldsService.getAll().subscribe({
      next: (data: any) => {
        this.loading = false;
        if (data['status'] === 'OK') {
          this.canchasList = data.payload;
          this.temp = data.payload;
          if (this.canchasList) {
              this.dataSelected = this.canchasList[0];
          }
        }else{
          Swal.fire({ text: data.payload, confirmButtonColor: '#299cdb'});
        }
      },
      error: (error) => {
        this.loading = false;
        Swal.fire({ text: 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb', });
      }
    });
  }
}
