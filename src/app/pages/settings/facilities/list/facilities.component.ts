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
import { ModalFacilitiesComponent } from '../modal/modal.component';
import { Complejo } from 'src/app/core/models/complejo.model';
import { ComplejosService } from 'src/app/core/services/api/conplejos.service';
import { Districts } from 'src/app/core/constants/Distritos';
import { Ceiling } from 'src/app/core/constants/Techados';
@Component({
  selector: 'app-facilities',
  templateUrl: './facilities.component.html',
  styleUrls: ['./facilities.component.scss']
})

/**
 * Companies Component
 */
export class FacilitiesComponent {
  title="Complejos Deportivos";
  // bread crumb items
  breadCrumbItems!: Array<{}>;
  distictList=Districts
  ceilingList=Ceiling

  submitted = false;
  fieldsForm!: UntypedFormGroup;
  CustomersData!: any;
  masterSelected!: boolean;
  checkedList: any;

  searchTerm: any;

  canActivate:string[];
  categoryList:any[]=[];
  listaItems:any[]=[];
  complejosList:any[]=[];
  temp:any[]=[];
  
  dataSelected!:Complejo;
  constructor(private modalService: NgbModal,
    private complejosService: ComplejosService,
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
      {name: 'Nombre', prop: 'nombre'},
      {name: 'Techado', prop: 'techado'},
      {name: 'Distrito',prop: 'distrito'},
      {name: 'Encargado', prop: 'encargado'},
    ];
    /**
     * fetches data
     */
    this.getCategories();
    this.getFacilities()
  }

  // changePage() {
  //   this.company = this.service.changePage(this.allcompany)
  // }

  // Search Data
  performSearch(): void {
    this.complejosList = this.temp.filter((item: any) => {
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
  public openModal(row: Complejo | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalFacilitiesComponent, {
        backdrop: 'static',
        size:size
    });
    modalRef.componentInstance.row = row;
    modalRef.componentInstance.categoryList = this.categoryList;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.listaItems.subscribe(() => {
    this.getFacilities();
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
    this.complejosList.forEach((x: { state: any; }) => x.state = ev.target.checked)
    var checkedVal: any[] = [];
    var result
    for (var i = 0; i < this.complejosList.length; i++) {
      if (this.complejosList[i].state == true) {
        result = this.complejosList[i];
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
    for (var i = 0; i < this.complejosList.length; i++) {
      if (this.complejosList[i].state == true) {
        result = this.complejosList[i];
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
      title: 'Lista de Complejos',
      useBom: true,
      noDownload: false,
      headers: ["Uuid", "Techado","Dirección", "Distrito", "Latitud", "Longitud", "Nombre", "Estado"]
    };
    new ngxCsv(this.complejosList, "Lista de Complejos", data);
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
  private getFacilities(){
    this.complejosService.getAll().subscribe({
      next: (data: any) => {
        this.loading = false;
        if (data['status'] === 'OK') {
          this.complejosList = data.payload;
          this.temp = data.payload;
          if (this.complejosList) {
              this.dataSelected = this.complejosList[0];
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
