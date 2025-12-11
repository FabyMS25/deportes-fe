import { Component, ElementRef, ViewChild } from '@angular/core';
import { NgbModal, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import { UntypedFormGroup } from '@angular/forms';

import { ngxCsv } from 'ngx-csv/ngx-csv';
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ModalFieldsComponent } from '../modal/modal.component';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { CamposDeportivoService } from 'src/app/core/services/api/camposDeportivos.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { ModalScheduleComponent } from '../modal-schedule/modal-schedule.component';
import { ModalTarifaComponent } from '../modal-tarifa/modal-tarifa.component';
import { ModalImportComponent } from '../modal-import/modal-import.component';
import { EstadoActual } from 'src/app/core/constants/Estados';
import { HorarioExcepcion } from 'src/app/core/models/horarioExcepcion.model';
import { TarifaConcepto } from 'src/app/core/models/tarifaConcepto.model';
import { Tarifa } from 'src/app/core/models/tarifa.model';
import { ComplejosService } from 'src/app/core/services/api/conplejos.service';
import { SuperficiesService } from 'src/app/core/services/api/superficies.service';
import { CategoriaCampo } from 'src/app/core/constants/Features';
import { ComplejoDeportivo } from 'src/app/core/models/complejoDeportivo.model';
import { Superficie } from 'src/app/core/models/superficie.model';

@Component({
  selector: 'app-fields',
  templateUrl: './fields.component.html',
  styleUrls: ['./fields.component.scss']
})
export class FieldsComponent {
  breadCrumbItems!: Array<{}>;
  title = "Campos Deportivos";
  canActivate: string[];
  viewMode: 'table' | 'cards' = 'table';
  itemsList: any[] = [];
  temp: CampoDeportivo[] = [];
  fieldsList: CampoDeportivo[] = [];

  submitted = false;
  fieldsForm!: UntypedFormGroup;
  dataSelected!: CampoDeportivo;
  searchTerm: any;
  categoryList = Object.values(CategoriaCampo);
  complejosList: ComplejoDeportivo[] = [];
  superficiesList: Superficie[] = [];

  selectedComplejo: string = '';
  selectedSuperficie: string = '';
  selectedCategoria: string = '';
  selectedItems: any[] = [];

  @ViewChild('viewModel') viewModel!: ElementRef;

  constructor(
    private modalService: NgbModal,
    private authService: AuthenticationService,
    private fieldsService: CamposDeportivoService,
    private complejoService: ComplejosService,
    private superficieService: SuperficiesService,
  ) {
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
      { name: 'Complejo', prop: 'complejoDto.nombre', visible: true },
      { name: 'Cancha Codigo', prop: 'codigo', visible: false },
      { name: 'Nombre', prop: 'nombre', visible: true },
      { name: 'Categoría', prop: 'categoria', tag: true, visible: true },
      { name: 'Superficie', prop: 'superficieDto.descripcion', visible: true },
      { name: 'Iluminación', prop: 'tieneIluminacion', tag: true, visible: false },
      { name: 'Acceso Libre', prop: 'accesoLibre', tag: true, visible: false },
      { name: 'Requiere Aprobación', prop: 'requiereAprobacion', tag: true, visible: false },
      { name: 'Estado', prop: 'estadoActual', tag: true, visible: false },
      { name: 'Dimensiones', prop: 'dimensiones', visible: false },
      { name: 'Capacidad', prop: 'capacidadPersonas', visible: false },
      { name: 'Observaciones', prop: 'observaciones', visible: false },
      { name: 'Fecha Creación', prop: 'fechaCreacion', date: true, visible: false },
    ];
    this.getComplejos();
    this.getSuperficies();
    this.getFields();
  }

  getSelectedItems(items: any) {
    this.selectedItems = items;
  }
  toggleColumn(column: any) {
      column.visible = !column.visible;
  }
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'cards' : 'table';
    localStorage.setItem('dataTableViewMode', this.viewMode);
  }
  
  applyFilters(): void {
    console.log(this.selectedCategoria)
    this.fieldsList = this.temp.filter((item: any) => {
      const matchesSearch = !this.searchTerm || 
        item.codigo?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.nombre?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.categoria?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.superficieDto?.descripcion?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.complejoDto?.nombre?.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesComplejo = !this.selectedComplejo || 
        item.complejoDto?.uuid === this.selectedComplejo;
      const matchesSuperficie = !this.selectedSuperficie || 
        item.superficieDto?.uuid === this.selectedSuperficie;
      const matchesCategoria = !this.selectedCategoria || 
        item.categoria === this.selectedCategoria;
      return matchesSearch && matchesComplejo && matchesSuperficie && 
             matchesCategoria ;
    });
  }
  onNavChange(newTabId: string) {
    this.selectedCategoria = newTabId;
    this.applyFilters(); // Apply ALL filters including the new tab
  }
  // Clear all filters
  clearFilters(): void {
    this.selectedComplejo = '';
    this.selectedSuperficie = '';
    this.selectedCategoria = '';
    this.searchTerm = '';
    this.applyFilters();
  }


  viewDataGet(data: any) {
    this.dataSelected = data;
    const element = this.viewModel.nativeElement;
    const elementTop = element.getBoundingClientRect().top + window.scrollY;
    const middleOffset = elementTop - (window.innerHeight / 2) + (element.offsetHeight / 2);
    window.scrollTo({ top: middleOffset, behavior: 'smooth' });
  }
  /**
   * Open modal
   * @param content modal content
   */
  public openModal(row: CampoDeportivo | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalFieldsComponent, {
      backdrop: 'static',
      size: size
    });
    modalRef.componentInstance.row = row;
    modalRef.componentInstance.categoryList = this.categoryList;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getFields();
    });
  }

  deleteId!: string;
  deleteModal(content: any, data: any) {
    this.deleteId = data.uuid;
    this.modalService.open(content, { centered: true });
  }

  public openScheduleModal(row: CampoDeportivo | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalScheduleComponent, {
      backdrop: 'static',
      size: size
    });
    modalRef.componentInstance.row = row;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getFields();
    });
  }

  public openTarifaModal(row: CampoDeportivo | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalTarifaComponent, {
      backdrop: 'static',
      size: size
    });
    modalRef.componentInstance.row = row;
    modalRef.componentInstance.categoryList = this.categoryList;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getFields();
    });
  }

  headersImport = [
    'Complejo', 'Codigo', 'Nombre', 'Categorias', 'Superficie', 'Dimensiones', 
    'Capacidad', 'Iluminacion', 'Acceso Libre', 'Requiere Aprobacion', 'Estado',
    'Clasificador Ruat','Tipo Cobro', 'Descripcion Tarifa', 'Costo Base', 'Desde Tarifa', 'Hasta Tarifa', 'Categorias de Tarifa',
    'Fecha Inicio', 'Fecha Fin', 'Lista de Tarifas Concepto',
    'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo',
    'Lista de Excepciones'
  ];
  public openModalImport() {
    const modalRef = this.modalService.open(ModalImportComponent, {
      size: 'lg', backdrop: 'static'
    });
    modalRef.componentInstance.titles = this.headersImport.map(header =>
      ({ prop: header, name: header, visible: true }));
    modalRef.componentInstance.itemsList = this.temp;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getFields();
    });
  }

  // Csv File Export
  csvFileExport() {
    const daysOrder = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
    const dayMapping: { [key: string]: string[] } = {
      'lunes_viernes': ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'],
      'lunes': ['Lunes'],
      'martes': ['Martes'],
      'miercoles': ['Miercoles'],
      'jueves': ['Jueves'],
      'viernes': ['Viernes'],
      'sabado': ['Sabado'],
      'domingo': ['Domingo']
    };

    const lista = this.selectedItems.flatMap((item) => {
      const baseData = {
        Complejo: item.complejoDto?.nombre || '',
        Codigo: item.codigo || '',
        Nombre: item.nombre || '',
        Categorias: item.categoria || '',
        Superficie: item.superficieDto?.descripcion || '',
        Dimensiones: item.dimensiones || '',
        Capacidad: item.capacidadPersonas || '',
        Iluminacion: item.tieneIluminacion ? 'SI' : 'NO',
        'Acceso Libre': item.accesoLibre ? 'SI' : 'NO',
        'Requiere Aprobacion': item.requiereAprobacion ? 'SI' : 'NO',
        Estado: item.estadoActual || '',
      };      
      const horarios: Record<string, string> = {};
      daysOrder.forEach(day => {
        horarios[day] = '';
      });
      item.horariosFijosDtoList?.forEach((horario: any) => {
        const targetDays = dayMapping[horario.dia] || [horario.dia];
        const scheduleText = horario.abierto 
          ? `${horario.horaApertura || ''}-${horario.horaCierre || ''}`
          : 'CERRADO';
        targetDays.forEach(day => {
          if (daysOrder.includes(day)) {
            horarios[day] = scheduleText;
          }
        });
      });      
      const excepciones = item.horariosExcepcionesDtoList?.map((ex: HorarioExcepcion) =>
        `${ex.fecha}: ${ex.tipoExcepcion}${ex.motivo ? ` (${ex.motivo})` : ''}${ex.horaApertura ? ` ${ex.horaApertura}-${ex.horaCierre}` : ''}`
      ).join('; ') || '';      
      if (!item.tarifasDtoList || item.tarifasDtoList.length === 0) {
        return [{
          ...baseData,
          'Clasificador Ruat':'',
          'Tipo Cobro': '',
          'Descripcion Tarifa': '',
          'Costo Base': '',
          'Desde Tarifa': '',
          'Hasta Tarifa': '',
          'Categorias de Tarifa': '',
          'Fecha Inicio': '',
          'Fecha Fin': '',
          'Lista de Tarifas Concepto': '',
          ...horarios,
          'Lista de Excepciones': excepciones
        }];
      }      
      return item.tarifasDtoList.map((tarifa: Tarifa) => {
        const categoriasTarifa = tarifa.categoriasDtoList?.map((cat: any) => 
          cat.categoriaDto?.nombre || ''
        ).filter((nombre: string) => nombre !== '').join('; ') || '';
        const conceptos = tarifa.conceptosDtos?.map((concepto: TarifaConcepto) =>
          `${concepto.concepto || ''}${concepto.tipo ? ` [${concepto.tipo}]` : ''}${concepto.valor ? `: ${concepto.valor}` : ''}${concepto.desde ? ` (${concepto.desde}-${concepto.hasta || ''})` : ''}`
        ).join('; ') || '';        
        return {
          ...baseData,
          'Clasificador Ruat': tarifa.clasificadorRuatDto.nombre,
          'Tipo Cobro': tarifa.tipoCobro || '',
          'Descripcion Tarifa': tarifa.descripcion || '',
          'Costo Base': tarifa.precioBase || '',
          'Desde Tarifa': tarifa.desde || '',
          'Hasta Tarifa': tarifa.hasta || '',
          'Categorias de Tarifa': categoriasTarifa,
          'Fecha Inicio': tarifa.fechaInicio || '',
          'Fecha Fin': tarifa.fechaFin || '',
          'Lista de Tarifas Concepto': conceptos,
          ...horarios,
          'Lista de Excepciones': excepciones
        };
      });
    });
    const data = {
      fieldSeparator: ',',
      quoteStrings: '"',
      decimalseparator: '.',
      showLabels: true,
      showTitle: true,
      title: 'Lista de ' + this.title,
      useBom: true,
      noDownload: false,
      headers: this.headersImport
    };

    new ngxCsv(lista, this.title, data);
  }

  /* API Services */
  private getComplejos() {
    this.complejoService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.complejosList = data.payload;
        }
      }
    });
  }
  private getSuperficies() {
    this.superficieService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.superficiesList = data.payload;
        }
      }
    });
  }

  loading: boolean = true;
  private getFields() {
    this.fieldsService.getAll().subscribe({
      next: (data: any) => {
        this.loading = false;
        if (data['status'] === 'OK') {
          this.fieldsList = data.payload;
          this.temp = data.payload;
          if (this.fieldsList && this.fieldsList.length > 0) {
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
      next: (data: any) => {
        this.submitted = false;
        if (data['status'] === 'OK') {
          this.notify(data.payload, 'info')
          this.getFields();
          this.modalService.dismissAll();
        }
      },
      error: err => {
        this.submitted = false;
        this.notify('No se pudo eliminar el registro!', 'error')
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

  getBadgeClass(estado: string): string {
    switch (estado) {
      case EstadoActual.ACTIVO:
        return 'success';
      case EstadoActual.MANTENIMIENTO:
        return 'warning';
      case EstadoActual.CERRADO:
        return 'danger';
      case EstadoActual.EVENTO_MUNICIPAL:
        return 'info';
      default:
        return 'secondary';
    }
  }
}