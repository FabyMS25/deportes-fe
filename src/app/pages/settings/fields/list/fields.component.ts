import { Component, ElementRef, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
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

export class FieldsComponent {
  breadCrumbItems!: Array<{}>;
  title="Campos Deportivos";
  canActivate:string[];
  temp:any[]=[];
  itemsList:any[]=[];
  viewMode: 'table' | 'cards' = 'table';

  submitted = false;
  fieldsForm!: UntypedFormGroup;
  searchTerm: any;
  categoryList:any[]=[];
  fieldsList:any[]=[];
  dataSelected!:campoDeportivo;

  @ViewChild('viewModel') viewModel!: ElementRef;

  constructor(private modalService: NgbModal,
    private fieldsService: CamposDeportivoService,
    private categoriasService: CategoriasService,
    private authService: AuthenticationService, ) {
      this.canActivate = this.authService.hasPermission(this.title);
  }

  ngOnInit(): void {
    const savedViewMode = localStorage.getItem('dataTableViewMode');
    if (savedViewMode === 'table' || savedViewMode === 'cards') {
      this.viewMode = savedViewMode;
    }
    this.breadCrumbItems = [
      { label: 'Administración' },
      { label: this.title, active: true }
    ];
    this.itemsList = [
      {name: 'Complejo', prop: 'complejoDto.nombre', visible:true},
      {name: 'Cancha Codigo', prop: 'codigo', visible:false},
      {name: 'Superficie',prop: 'superficieDto.descripcion', visible:true},
      {name: 'Tipo Cobro', prop: 'tipo', tag:true, visible:true},
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

  public openScheduleModal(row: campoDeportivo | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalScheduleComponent, {
        backdrop: 'static',
        size:size
    });
    modalRef.componentInstance.row = row;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.emitList.subscribe(() => {
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
    modalRef.componentInstance.emitList.subscribe(() => {
    this.getFields();
    });
  }

  headersImport = ['Complejo','Codigo', 'Superficie', 'Categorias',
    'Tipo Cobro','Costo','Desde','Hasta',
    'Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  public openModalImport() {
    const modalRef = this.modalService.open(ModalImportComponent, {
        size: 'lg', backdrop: 'static'
      });
    modalRef.componentInstance.titles = this.headersImport.map(header => 
      ({ prop: header, name: header, visible: true}));
    modalRef.componentInstance.itemsList = this.temp;
    
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

    var data = {
      fieldSeparator: ',',
      quoteStrings: '"',
      decimalseparator: '.',
      showLabels: true,
      showTitle: true,
      title: 'Lista de '+ this.title,
      useBom: true,
      noDownload: false,
      headers: this.headersImport
    };
    new ngxCsv(lista, this.title, data);
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
        }
      },
      error: (error) => {
        this.loading = false;
        Swal.fire({ text: 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb', });
      }
    });
  }
  
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
/* commun functions */
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
