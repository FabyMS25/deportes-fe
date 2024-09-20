import { Component, ElementRef, TemplateRef, ViewChild } from '@angular/core';
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
  itemsList:any[]=[];
  fieldsList:any[]=[];
  temp:any[]=[];
  
  dataSelected!:campoDeportivo;
  
  @ViewChild('viewModel') viewModel!: ElementRef;

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
    this.itemsList = [
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

  // Search Data
  performSearch(): void {
    this.fieldsList = this.temp.filter((item: any) => {
      return (
        item.codigo.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
        item.tipo.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
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
  
  //  Filter Offcanvas Set
  openEnd(content: TemplateRef<any>) {
    this.offcanvasService.open(content, { position: 'end' });
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
  public openModal(row: campoDeportivo | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalFieldsComponent, {
        backdrop: 'static',
        size:size
    });
    modalRef.componentInstance.row = row;
    modalRef.componentInstance.categoryList = this.categoryList;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.emitList.subscribe(() => {
    this.getFields();
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
    modalRef.componentInstance.itemsList = this.fieldsList;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getCategories();
      this.getFields()
    });
  }
  
  // Csv File Export
  csvFileExport() {
    const daysOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];    
    const lista = this.selectedItems.flatMap((item: any) => {
      const baseData = {
        complejo: item.complejoDto.nombre,
        codigo: item.codigo,
        superficie: item.superficieDto.descripcion,
        categorias: "",
        tipo: item.tipo || '',
      };
  
      const sortedHorarios = item.horarioDtoList.sort((a:any, b:any) => 
        daysOrder.indexOf(a.dia) - daysOrder.indexOf(b.dia)
      );
  
      const horarios: Record<string, string> = daysOrder.reduce((acc, day) => {
        const horario = sortedHorarios.find((h:any) => h.dia === day);
        acc[day] = horario ? `${horario.horaInicio}-${horario.horaFin}` : '';
        return acc;
      }, {} as Record<string, string>);
  
      if (!item.tarifasDtoList || item.tarifasDtoList.length === 0) {
        return [{
          ...baseData,
          costo: '',
          desde: '',
          hasta: '',
          ...horarios
        }];
      }
      return item.tarifasDtoList.map((tarifa:any) => ({
        ...baseData,
        costo: tarifa.costo || '',
        desde: tarifa.desde || '',
        hasta: tarifa.hasta || '',
        ...horarios
      }));
    });
  
    const data = {
      fieldSeparator: ',',
      quoteStrings: '"',
      decimalseparator: '.',
      showLabels: true,
      showTitle: true,
      title: 'Lista de Campos Deportivos',
      useBom: true,
      noDownload: false,
      headers: [
        "Complejo", "Codigo", "Superficie", "Categorias", "Tipo Cobro", 
        "Costo", "Desde", "Hasta", 
        "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"
      ]
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
    modalRef.componentInstance.itemsList.subscribe(() => {
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
    modalRef.componentInstance.itemsList.subscribe(() => {
    this.getFields();
    });
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
          this.fieldsList = data.payload;
          this.temp = data.payload;
          if (this.fieldsList) {
              this.dataSelected = this.fieldsList[0];
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
    // Delete Data
    deleteData() {
      let uuid = this.deleteId;
      this.fieldsService.delete(uuid).subscribe({
        next: (data:any) => {
              this.submitted = false;
              if(data['status'] === 'OK') {
                this.notify(data.payload, 'info')
                this.getFields();
                this.modalService.dismissAll();
              }
         },
        error: err => {
          this.submitted = false;
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
      if (result.dismiss === Swal.DismissReason.timer) {
      }
    });
  }
}
