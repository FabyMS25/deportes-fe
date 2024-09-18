import { Component, TemplateRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NgbModal, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';

// Csv File Export
import { ngxCsv } from 'ngx-csv/ngx-csv';

// Sweet Alert
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ModalFacilitiesComponent } from '../modal/modal.component';
import { Complejo } from 'src/app/core/models/complejo.model';
import { ComplejosService } from 'src/app/core/services/api/conplejos.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { ModalImportComponent } from '../modal-import/modal-import.component';
import { Districts } from 'src/app/core/constants/Places';
import { Ceiling } from 'src/app/core/constants/Features';
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
  breadCrumbItems!: Array<{}>;
  canActivate:string[];
  itemsList:any[]=[];
  temp:any[]=[];
 
  categoryList:any[]=[]; 
  complejosList:any[]=[]
  distictList=Districts
  ceilingList=Ceiling

  dataSelected!:Complejo;

  constructor(private modalService: NgbModal,
    private complejosService: ComplejosService,
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
    this.itemsList = [
      {name: 'Nombre', prop: 'nombre'},
      {name: 'Techado', prop: 'techado'},
      {name: 'Distrito',prop: 'distrito'}
    ];
    this.getCategories();
    this.getFacilities()
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

  //  Filter Offcanvas Set
  openEnd(content: TemplateRef<any>) {
    this.offcanvasService.open(content, { position: 'end' });
  }
    // Search Data
  searchTerm: any;
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
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getFacilities();
    });
  }  

  /**
   * Delete model
   */
  deleteId!: string;
  deleteModal(content: any, data: any) {
    this.deleteId = data.uuid;
    this.modalService.open(content, { centered: true });
  }

  camposImport: any[] =[];
  public openModalImport() {
    this.camposImport = [
        {prop: 'Nombre', name: 'Nombre'},
        {prop: 'Techado', name: 'Techado'},
        {prop: 'Distrito', name: 'Distrito'},
        {prop: 'Ubicacion', name: 'Ubicacion'},
        {prop: 'Latitud', name: 'Latitud'},
        {prop: 'Longitud', name: 'Longitud'},
    ];
    const modalRef = this.modalService.open(ModalImportComponent, {
        size: 'lg',
        backdrop: 'static'
    });
    modalRef.componentInstance.titles = this.camposImport;
    modalRef.componentInstance.itemsList = this.complejosList;
    modalRef.componentInstance.emitList.subscribe(() => {
        this.getFacilities();
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
      title: 'Lista de Complejos',
      useBom: true,
      noDownload: false,
      headers: ["Uuid", "Nombre","Techado","Dirección", "Distrito", "Latitud", "Longitud", "Estado"]
    };
    new ngxCsv(this.complejosList, "Lista de Complejos", data);
  }


  /* API Services */
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
  private getCategories(){
    this.categoriasService.getAll().subscribe({
        next: (data: any) => {
          if (data['status'] === 'OK') {
            this.categoryList = data.payload;
          }
        }
      });
  }

  deleteData() {
    let uuid = this.deleteId;
    this.complejosService.delete(uuid).subscribe({
      next: (data:any) => {
            if(data['status'] === 'OK') {
              this.notify(data.payload, 'info')
              this.getFacilities();
              this.modalService.dismissAll();
            }
       },
      error: err => {
        this.notify('No se pudo eliminar el registro!','error')
      }
    });
  }
  private notify(message: any, type: any): void {
    let timerInterval: any;
    Swal.fire({
      title: message,
      icon: type,
      timer: 2000,
      timerProgressBar: true,
      willClose: () => {
        clearInterval(timerInterval);
      },
    }).then((result) => {
      if (result.dismiss === Swal.DismissReason.timer) {
      }
    });
  }
}
