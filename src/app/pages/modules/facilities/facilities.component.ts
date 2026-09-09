import { Component, ElementRef, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { FacilitiesService } from 'src/app/core/services/api/facilities.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { Districts } from 'src/app/core/constants/Places';
// import { ModalFacilitiesComponent } from '../modal/modal.component';
import { ModalImportComponent } from 'src/app/shared/modal-import/modal-import.component';
import { ComplejoDeportivo } from 'src/app/core/models/complejoDeportivo.model';
import { TipoEstructura } from 'src/app/core/constants/Features';
import { EstadoActual, StatusUtils } from 'src/app/core/constants/Estados';
import { LeafletComponent } from 'src/app/shared/map/leaflet.component';
import { ModalFacilitiesComponent } from '../../modals/modal-facility/modal-facility.component';
import { CsvColumn } from 'src/app/shared/data-header/data-header.component';
import { BreadCrumbItem } from 'src/app/shared/breadcrumbs/breadcrumbs.component';

@Component({
  selector: 'app-facilities',
  templateUrl: './facilities.component.html',
  styleUrls: ['./facilities.component.scss']
})

export class FacilitiesComponent {
  breadCrumbItems: BreadCrumbItem[] =[];
  viewMode: 'table' | 'cards' = 'table';
  canActivate: string[];
  itemsList: any[] = [];
  temp: ComplejoDeportivo[] = [];
  dataSelected!:ComplejoDeportivo;

  categoryList:any[]=[];
  facilitiesList:any[]=[]
  distictList=Districts
  tipoEstructuraList = Object.values(TipoEstructura);
  estadoActualList = Object.values(EstadoActual);
  selectedItems:any[] =[];

  @ViewChild('viewModel') viewModel!: ElementRef;

  constructor(private modalService: NgbModal,
    private complejosService: FacilitiesService,
    private categoriasService: CategoriasService,
    private authService: AuthenticationService,
    private datePipe: DatePipe,) {
      this.canActivate = this.authService.hasPermission('Complejos Deportivos');
  }

  ngOnInit(): void {
    const savedViewMode = localStorage.getItem('dataTableViewMode');
    if (savedViewMode === 'table' || savedViewMode === 'cards') {
      this.viewMode = savedViewMode;
    }
    this.breadCrumbItems = [
      { label: 'Administración' },
      { label: 'Complejos Deportivos', active: true }
    ];
    this.itemsList = [
      {name: 'Nombre', prop: 'nombre', visible:true},
      {name: 'Tipo Estructura', prop: 'tipoEstructura', visible:true},
      {name: 'Estado', prop: 'estadoActual', visible:true, tag:true},
      {name: 'Teléfono', prop: 'telefonoPrincipal', visible:false},
      {name: 'Distrito', prop: 'distrito', visible:false},
      {name: 'Ubicación', prop: 'ubicacion', visible:false},
      {name: 'Iluminación', prop: 'tieneIluminacion', visible:false},
      {name: 'Vestuarios', prop: 'tieneVestuarios', visible:false},
      {name: 'Gradarías', prop: 'tieneGraderias', visible:false},
    ];
    this.getCategories();
    this.getFacilities()
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

  // Search Data
  searchTerm: any;
  applyFilters(): void {
    this.facilitiesList = this.temp.filter((item: any) => {
      return (
        item.nombre?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.tipoEstructura?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.distrito?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.estadoActual?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.telefonoPrincipal?.toLowerCase().includes(this.searchTerm.toLowerCase())
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
    this.dataSelected = data;
    const element = this.viewModel.nativeElement;
    const elementTop = element.getBoundingClientRect().top + window.scrollY;
    const middleOffset = elementTop - (window.innerHeight / 2) + (element.offsetHeight / 2);
    window.scrollTo({top: middleOffset, behavior: 'smooth' });
  }

  /**
   * Open modal
   * @param content modal content
   */  
  public openModal(row: any | undefined, action: string, size: string) {
    const modalRef = this.modalService.open(ModalFacilitiesComponent, {
        backdrop: 'static', size:size
    });
    modalRef.componentInstance.row = row;
    modalRef.componentInstance.accion = action;
    modalRef.componentInstance.itemsList = this.temp;
    modalRef.componentInstance.emitList.subscribe(()=>{
      this.getFacilities();
    })
  }
  public openMapModal(complejo: any) {
    const modalRef = this.modalService.open(LeafletComponent, {
      backdrop: 'static',
      size: 'lg',
      keyboard: false
    });
    
    modalRef.componentInstance.title = `Ubicación - ${complejo.nombre}`;
    modalRef.componentInstance.form = false; 
    modalRef.componentInstance.latitud = complejo.latitud;
    modalRef.componentInstance.longitud = complejo.longitud;
    modalRef.componentInstance.direccion = complejo.ubicacion;
    modalRef.componentInstance.latLngEmitter.subscribe((data: any) => {
    });
  }
  deleteId!: string;
  deleteModal(content: any, data: any) {
    this.deleteId = data.uuid;
    this.modalService.open(content, { centered: true });
  }

  headersImport = ['Nombre', 'Tipo Estructura', 'Estado', 'Teléfono Principal', 'Distrito', 'Ubicación', 'Latitud', 'Longitud', 'Iluminación', 'Vestuarios', 'Gradarías'];
  readonly CSV_COLUMNS: CsvColumn<any>[] = [
    { header: 'Nombre', value: item => item.nombre || '-' },
    { header: 'Tipo Estructura', value: item => item.tipoEstructura || '-' },
    { header: 'Estado', value: item => item.estadoActual || '-' },
    { header: 'Teléfono Principal', value: item => item.telefonoPrincipal || '-' },
    { header: 'Distrito', value: item => item.distrito || '-' },
    { header: 'Ubicación', value: item => item.ubicacion || '-' },
    { header: 'Latitud', value: item => item.latitud || '-' },
    { header: 'Longitud', value: item => item.longitud || '-' },
    { header: 'Iluminación', value: item => item.tieneIluminacion ? 'SI' : 'NO' },
    { header: 'Vestuarios', value: item => item.tieneVestuarios ? 'SI' : 'NO' },
    { header: 'Gradarías', value: item => item.tieneGraderias ? 'SI' : 'NO' },
    { header: 'Observaciones', value: item => item.observaciones || '-' },
    { header: 'Encargado(Nombre)', value: item => this.getEncargadosForExport(item).map(encargado => encargado.nombre || '-') },
    { header: 'Encargado(Teléfono)', value: item => this.getEncargadosForExport(item).map(encargado => encargado.telefono || '-') },
  ];
  public openModalImport() {
    const modalRef = this.modalService.open(ModalImportComponent, {
      size: 'lg', backdrop: 'static'
    });
    modalRef.componentInstance.titles = this.headersImport.map(header => 
      ({ prop: header, name: header, visible: true}));
    modalRef.componentInstance.itemsList = this.temp;
    modalRef.componentInstance.lookupData = {
      tipoEstructuraList: this.tipoEstructuraList,
      estadoActualList: this.estadoActualList,
      districtsList: Districts
    };
    modalRef.componentInstance.checkExistsFn = (registro: ComplejoDeportivo) =>
      this.temp.some(item =>
        item.nombre === registro.nombre
      );
    modalRef.componentInstance.mapRowFn = (row: any, lookupData: any): ComplejoDeportivo => {
      const tipoEstructuraValue = (row['Tipo Estructura'] || '').trim();
      const estadoActualValue = (row['Estado'] || '').trim();
      const distritoValue = (row['Distrito'] || '').trim();
      
      const tipoEstructura = lookupData.tipoEstructuraList.find(
        (t: any) => t.trim() === tipoEstructuraValue
      );
      const estadoActual = lookupData.estadoActualList.find(
        (e: any) => e.trim() === estadoActualValue
      );
      const distrito = lookupData.districtsList.find(
        (r: any) => r.value.trim() === distritoValue
      );
      const missingFields = [];
      if (!tipoEstructura) missingFields.push('Tipo Estructura');
      if (!estadoActual) missingFields.push('Estado');
      if (!distrito) missingFields.push('Distrito');
      if (missingFields.length > 0) {
        throw { missingFields };
      }

      return {
        nombre: '' + row['Nombre'],
        tipoEstructura: tipoEstructura,
        estadoActual: estadoActualValue,
        telefonoPrincipal: row['Teléfono Principal'],
        distrito: distrito.value,
        ubicacion: '' + row['Ubicación'],
        latitud: parseFloat(row['Latitud']) || 0,
        longitud: parseFloat(row['Longitud']) || 0,
        tieneIluminacion: this.parseBoolean(row['Iluminación']),
        tieneVestuarios: this.parseBoolean(row['Vestuarios']),
        tieneGraderias: this.parseBoolean(row['Gradarías']),
        observaciones: '' + (row['Observaciones'] || '')
      };
    };
    modalRef.componentInstance.createRecordFn = (record: ComplejoDeportivo) =>
      this.complejosService.save(record).toPromise();
    modalRef.componentInstance.actionCompleted.subscribe(() => {
      this.getFacilities();
    });
  }

  private parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value.toLowerCase() === 'si' || value === '1';
    }
    return false;
  }

  private getEncargadosForExport(item: any): any[] {
    const encargados = item.encargadosList || item.encargadosDtoList || [];
    return encargados.length ? encargados : [{}];
  }

  /* API Services */
  loading: boolean = true;
  private getFacilities(){
    this.complejosService.getAll().subscribe({
      next: (data: any) => {
        this.loading = false;
        this.facilitiesList = data;
        this.temp = data;
        if (this.facilitiesList && this.facilitiesList.length > 0) {
          this.dataSelected = this.facilitiesList[0];
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
        next: (data: any[]) => {
          this.categoryList = data;
        }
      });
  }

  deleteData() {
    let uuid = this.deleteId;
    this.complejosService.delete(uuid).subscribe({
      next: (message: string) => {
            this.notify(message || 'Complejo eliminado exitosamente', 'info')
            this.getFacilities();
            this.modalService.dismissAll();
       },
      error: err => {
        this.notify('No se pudo anular el registro!','error')
      }
    });
  }

  getBadgeClass(estado: string): string {
    return StatusUtils.getStatusColor(estado);
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
