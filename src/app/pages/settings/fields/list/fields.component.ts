import { Component, TemplateRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NgbModal, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import {  UntypedFormGroup } from '@angular/forms';

import { ngxCsv } from 'ngx-csv/ngx-csv';
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ModalFieldsComponent } from '../modal/modal.component';
import { campoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { CamposDeportivoService } from 'src/app/core/services/api/camposDeportivos.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { ModalScheduleComponent } from '../modal-schedule/modal-schedule.component';
import { ModalTarifaComponent } from '../modal-tarifa/modal-tarifa.component';
import { ModalImportComponent } from '../modal-import/modal-import.component';
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
    private categoriasService: CategoriasService,
    private authService: AuthenticationService, 
    private offcanvasService: NgbOffcanvas,
    private datePipe: DatePipe,) {
      this.canActivate = this.authService.hasPermission(this.title);
  }

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'Administracion' },
      { label: this.title, active: true }
    ];
    this.listaItems = [
      {name: 'Complejo', prop: 'complejoDto.nombre'},
      {name: 'Cancha', prop: 'codigo'},
      {name: 'Superficie',prop: 'superficieDto.descripcion'},
      {name: 'Tipo Cobro', prop: 'tipo', tag:true},
    ];
    this.getCategories();
    this.getFields()
  }

  selectedItems:any[] =[];
  getSelectedItems(items: any[]) {
    this.selectedItems = items;
  }
  
  /**
   * View Data Get
   * @param content modal content
   */
  viewDataGet(data: any) {
    this.dataSelected=data
  }

  // Search Data
  performSearch(): void {
    this.canchasList = this.temp.filter((item: any) => {
      return (
        item.codigo.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
        item.topo.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
        item.superficieDto.descripcion.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.complejoDto.nombre.toLowerCase().includes(this.searchTerm.toLowerCase())
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
   // Sort filter
   sortField: any;
   sortBy: any
   SortFilter(event: Event) {
     const selectedValue = (event.target as HTMLSelectElement).value;
     console.log('Selected value:', selectedValue);
    //  this.sortField = (document.getElementById("choices-single-default") as HTMLInputElement).value;
    //  if (this.sortField[0] == 'D') {
    //    this.sortBy = 'asc';
    //    this.sortField = this.sortField.replace(/D/g, '')
    //  }
   }
  
  //  Filter Offcanvas Set
  openEnd(content: TemplateRef<any>) {
    this.offcanvasService.open(content, { position: 'end' });
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

  camposImport: any[] =[];
  public openModalImport() {
    this.camposImport = [
      {prop: 'Complejo', name: 'Complejo'},
      {prop: 'Codigo', name: 'Codigo'},
      {prop: 'Superficie', name: 'Superficie'},
      {prop: 'Categorias', name: 'Categorias'},
      {prop: 'Tipo Cobro', name: 'Tipo Cobro'},
      {prop: 'Costo', name: 'Costo'},
      {prop: 'Desde', name: 'Desde'},
      {prop: 'Hasta', name: 'Hasta'},
      {prop: 'Lunes', name: 'Lunes'},
      {prop: 'Martes', name: 'Martes'},
      {prop: 'Miercoles', name: 'Miercoles'},
      {prop: 'Jueves', name: 'Jueves'},
      {prop: 'Viernes', name: 'Viernes'},
      {prop: 'Sabado', name: 'Sabado'},
      {prop: 'Domingo', name: 'Domingo'},
    ];
    const modalRef = this.modalService.open(ModalImportComponent, {
        size: 'lg',
        backdrop: 'static'
    });
    modalRef.componentInstance.titles = this.camposImport;
    modalRef.componentInstance.itemsList = this.canchasList;
    modalRef.componentInstance.listaItems.subscribe(() => {
        this.getFields();
    });
  }
  
  // Csv File Export
  csvFileExport() {    
    const lista = this.canchasList.map(item => ({
      complejo: item.complejoDto.nombre,
      codigo: item.codigo,
      superficie: item.superficieDto.descripcion,
      // tipo: item.tipo,
      categorias: "",
      tipo: item.tipo || '',
      costo: item.tarifaDto?.costo || '',
      desde: item.tarifaDto?.desde || '',
      hasta: item.tarifaDto?.hasta || '',
      horario: item.hroariosList || ''
    }));

    var data = {
      fieldSeparator: ',',
      quoteStrings: '"',
      decimalseparator: '.',
      showLabels: true,
      showTitle: true,
      title: 'Lista de Campos Deportivos',
      useBom: true,
      noDownload: false,
      headers: ["Complejo", "Codigo" , "Superficie",   "Categorias","Tipo Cobro",   "Costo","Desde","Hasta",    "Lunes","Martes","Miercoles","Jueves","Viernes","Sabado","Domingo"]
    };
    new ngxCsv(lista, "Lista de Campos Deportivos", data);
  }
  
  public openScheduleModal(row: campoDeportivo | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalScheduleComponent, {
        backdrop: 'static',
        size:size
    });
    modalRef.componentInstance.row = row;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.listaItems.subscribe(() => {
    this.getFields();
    });
  }

  public openTarifaModal(row: campoDeportivo | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalTarifaComponent, {
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

  /* API Services */
  private getCategories(){
    this.categoriasService.getAll().subscribe({
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
