import { Component, ElementRef, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
// Csv File Export
import { ngxCsv } from 'ngx-csv/ngx-csv';
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ComplejosService } from 'src/app/core/services/api/conplejos.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { Complejo } from 'src/app/core/models/complejo.model';
import { Districts } from 'src/app/core/constants/Places';
import { Ceiling } from 'src/app/core/constants/Features';
import { ModalFacilitiesComponent } from '../modal/modal.component';
import { ModalImportComponent } from '../modal-import/modal-import.component';

@Component({
  selector: 'app-facilities',
  templateUrl: './facilities.component.html',
  styleUrls: ['./facilities.component.scss']
})

export class FacilitiesComponent {
  title="Complejos Deportivos";
  breadCrumbItems!: Array<{}>;
  canActivate:string[];
  itemsList:any[]=[];
  temp:any[]=[];
  dataSelected!:Complejo;
 
  categoryList:any[]=[]; 
  facilitiesList:any[]=[]
  distictList=Districts
  ceilingList=Ceiling

  @ViewChild('viewModel') viewModel!: ElementRef;
  
  constructor(private modalService: NgbModal,
    private complejosService: ComplejosService,
    private categoriasService: CategoriasService,
    private authService: AuthenticationService, 
    private datePipe: DatePipe,) {
      this.canActivate = this.authService.hasPermission(this.title);
  }

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'Administracion' },
      { label: this.title, active: true }
    ];
    this.itemsList = [
      {name: 'Nombre', prop: 'nombre', visible:true},
      {name: 'Techado', prop: 'techado', visible:true},
      {name: 'Distrito',prop: 'distrito', visible:true},
      {name: 'Direccion',prop: 'ubicacion', visible:false},
    ];
    this.getCategories();
    this.getFacilities()
  }
  
  selectedItems:any[] =[];
  getSelectedItems(items: any[]) {
    this.selectedItems = items;
  }
  toggleColumn(column: any) {
    column.visible = !column.visible;
  }

  get visibleColumns(): string[] {
    return this.itemsList.filter(col => col.visible).map(col => col.prop);
  }

  // Search Data
  searchTerm: any;
    performSearch(): void {
      this.facilitiesList = this.temp.filter((item: any) => {
        return (
          item.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          item.techado.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          item.distrito.toLowerCase().includes(this.searchTerm.toLowerCase())
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
   * View Data Get
   */
  viewDataGet(data: any) {
    this.dataSelected=data;    
    const element = this.viewModel.nativeElement;
    const elementTop = element.getBoundingClientRect().top + window.scrollY;
    const middleOffset = elementTop - (window.innerHeight / 2) + (element.offsetHeight / 2);    
    window.scrollTo({top: middleOffset, behavior: 'smooth' });
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
    modalRef.componentInstance.itemsList = this.facilitiesList;
    modalRef.componentInstance.emitList.subscribe(() => {
        this.getFacilities();
    });
  }
  // Csv File Export
  csvFileExport() {
    const lista = this.selectedItems.flatMap((item: any) => {
      const baseData = {
        nombre: item.nombre,
        techado: item.techado,
        direccion: item.direccion,
        distrito: item.distrito,
        latitud: item.latitud,
        longitud: item.longitud,
      };
    
      if (!item.encargadosDtoList || item.encargadosDtoList.length === 0) {
        return [{
          ...baseData,
          encargado: '',
          telefono: '',
        }];
      }
      return item.encargadosDtoList.map((encargado:any) => ({
        ...baseData,
        encargado: encargado.nombre || '',
        telefono: encargado.telefono || '',
      }));
    });
  
    var data = {
      fieldSeparator: ',',
      quoteStrings: '"',
      decimalseparator: '.',
      showLabels: true,
      showTitle: true,
      title: 'Lista de Complejos',
      useBom: true,
      noDownload: false,
      headers: [ "Nombre","Techado","Dirección", "Distrito", "Latitud", "Longitud",  
                "Encargado(Nombre)","Encargado(Teléfono)"]
    };
    new ngxCsv(lista, "Lista de Complejos", data);
  }

  /* API Services */
  loading: boolean = true;
  private getFacilities(){
    this.complejosService.getAll().subscribe({
      next: (data: any) => {
        this.loading = false;
        if (data['status'] === 'OK') {
          this.facilitiesList = data.payload;
          this.temp = data.payload;
          if (this.facilitiesList) {
              this.dataSelected = this.facilitiesList[0];
          }
        }else{
          this.notify(data.payload,'error')
        }
      },
      error: (error) => {
        this.loading = false;
        this.notify('No se pudo recuperar los registros!','error')
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
      timer: 3000,
      timerProgressBar: true,
      willClose: () => {
        clearInterval(timerInterval);
      },
    }).then((result) => {
      if (result.dismiss === Swal.DismissReason.timer) { }
    });
  }
}
