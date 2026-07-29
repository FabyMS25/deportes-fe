import { Component } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { NgbModal} from '@ng-bootstrap/ng-bootstrap';

// Sweet Alert
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { Categoria } from 'src/app/core/models/categoria.model';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { TranslateService } from '@ngx-translate/core';
import { ModalImportComponent } from 'src/app/shared/modal-import/modal-import.component';
import { TipoCobro } from 'src/app/core/constants/TipoCobro';
import { CsvColumn } from 'src/app/shared/data-header/data-header.component';
import { BreadCrumbItem } from 'src/app/shared/breadcrumbs/breadcrumbs.component';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss']
})
/**
 * Leads Component
 */
export class CategoriesComponent {
  breadCrumbItems: BreadCrumbItem[] =[];
  viewMode: 'table' | 'cards' = 'table';
  canActivate: string[];
  itemsList: any[] = [];
  temp: Categoria[] = [];

  typeList=TipoCobro
  categoryList:any[]=[];
  submitted = false;
  contentForm!: UntypedFormGroup;
  deporteData!: Categoria;
  checkedList: any;
  searchResults: any;
  searchTerm: any;
  selectedItems: any[] = [];

  constructor(private modalService: NgbModal,
    private authService: AuthenticationService,
    public translate: TranslateService,
    private categoriesService: CategoriasService,
    private formBuilder: UntypedFormBuilder,) {
      this.canActivate = this.authService.hasPermission('Categorias');
  }

  ngOnInit(): void {
    const savedViewMode = localStorage.getItem('dataTableViewMode');
    if (savedViewMode === 'table' || savedViewMode === 'cards') {
      this.viewMode = savedViewMode;
    }
    this.breadCrumbItems = [
      { label: 'Administración' },
      { label: 'Categorias', active: true }
    ];

    this.itemsList = [
      {name: 'Codigo', prop: 'codigo', visible: false},
      {name: 'Nombre', prop: 'nombre', visible: true},
      {name: 'Descripción', prop: 'descripcion', visible: true},
      {name: 'Tipo Cobro', prop: 'tipo', visible: true},
      {name: 'Activo', prop: 'activo', visible: true, tag:true},
      {name: 'Para Asociación', prop: 'forAsociacion', visible: true, tag:true},
    ];

    this.contentForm = this.formBuilder.group({
      uuid: [''],
      estado: [''],
      codigo: ['', [Validators.required]],
      nombre: ['', [Validators.required]],
      descripcion: [''],
      tipo: ['', [Validators.required]],
      activo: [true],
      forAsociacion: [false],
      requiereAprobacion: [false],
      maxDuracionAutoAprobacion:[],
      maxPersonasAutoAprobacion:[],
    });
    this.getCategories();
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

  get form() {
    return this.contentForm.controls;
  }

  private formDataSet(row: any) {
    this.contentForm.patchValue({
      uuid: row.uuid,
      codigo: row.codigo,
      nombre: row.nombre,
      descripcion: row.descripcion || '',
      tipo: row.tipo,
      activo: row.activo,
      forAsociacion: row.forAsociacion || false,
      requiereAprobacion: row.requiereAprobacion,
      maxDuracionAutoAprobacion:row.maxDuracionAutoAprobacion,
      maxPersonasAutoAprobacion:row.maxPersonasAutoAprobacion,
    });
  }

  // Search Data
  performSearch(): void {
    this.categoryList = this.temp.filter((item: any) => {
      return (
        item.nombre?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.codigo?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.descripcion?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.tipo?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    });
  }

  /**
   * Open modal
   * @param content modal content
   */
  accion='';
  openModal(data: any, content: any, accion: string) {
    this.accion = accion;
    if (data) {
      this.formDataSet(data);
      if (accion === 'show') {
        this.contentForm.disable()
      }
    } else {
      // Reset form for new entry
      this.contentForm.patchValue({
        activo: true,
        forAsociacion: false
      });
    }
    this.modalService.open(content, { size: 'md', centered: true });
  }

  headersImport = ['Código', 'Nombre', 'Descripción', 'Tipo Cobro', 'Activo', 'Para Asociación','Requiere Aprobacion','Max Duración', 'Max Personas'];
  readonly CSV_COLUMNS: CsvColumn<Categoria>[] = [
    { header: 'Código', value: item => item.codigo || '-' },
    { header: 'Nombre', value: item => item.nombre || '-' },
    { header: 'Descripción', value: item => item.descripcion || '-' },
    { header: 'Tipo Cobro', value: item => item.tipo || '-' },
    { header: 'Activo', value: item => item.activo ? 'Sí' : 'No' },
    { header: 'Para Asociación', value: item => item.forAsociacion ? 'Sí' : 'No' },
  ];
  public openModalImport() {
    const modalRef = this.modalService.open(ModalImportComponent, {
      size: 'lg', backdrop: 'static'
    });
    modalRef.componentInstance.titles = this.headersImport.map(header => 
      ({ prop: header, name: header, visible: true }));
    modalRef.componentInstance.itemsList = this.temp;
    modalRef.componentInstance.lookupData = {
      typeList: TipoCobro
    };
    modalRef.componentInstance.checkExistsFn = (registro: Categoria) =>
      this.temp.some(item =>
        item.nombre === registro.nombre
      );
    modalRef.componentInstance.mapRowFn = (row: any, lookupData: any): Categoria => {
      const value = (row['Tipo Cobro'] || '').trim();
      const normalizedValue = value.toUpperCase().replace(/\s+/g, ' ');
      const type = lookupData.typeList.find((t: any) => {
        const tipoValue = t.value.toUpperCase();
        const tipoLabel = t.label.toUpperCase();
        const normalizedValue = value.toUpperCase().trim();
        return tipoValue === normalizedValue ||
              tipoLabel === normalizedValue ||
              tipoValue.includes(normalizedValue) ||
              tipoLabel.includes(normalizedValue) ||
              normalizedValue.includes(tipoValue.replace('POR_', '')) ||
              normalizedValue.includes(tipoLabel.replace('POR ', '')) ||
              tipoValue.replace('POR_', '') === normalizedValue ||
              tipoLabel.replace('POR ', '') === normalizedValue ||
              tipoValue === 'POR_' + normalizedValue ||
              tipoLabel === 'POR ' + normalizedValue;
      });

      if (!type) {
        const availableOptions = lookupData.typeList.map((t: any) => `${t.label} (${t.value})`).join(', ');          
        const missingFields = ['TipoCobro'];
        throw { 
          missingFields,
          message: `TipoCobro "${value}" no encontrado. Opciones disponibles: ${availableOptions}`
        };
      }

      return {
        codigo: '' + row['Código'],
        nombre: '' + row['Nombre'],
        descripcion: row['Descripción'] ? '' + row['Descripción'] : '',
        activo: row['Activo'] ? ('' + row['Activo']).toLowerCase() === 'Activo' : true,
        forAsociacion: row['Para Asociación'] ? ('' + row['Para Asociación']).toLowerCase() === 'true' : false,
        tipo: type.value,
      };
    };
    modalRef.componentInstance.createRecordFn = (record: Categoria) =>
      this.categoriesService.save(record).toPromise();
    modalRef.componentInstance.actionCompleted.subscribe(() => {
      this.getCategories();
    });
  }

  // Csv File Export
  /**
   * Delete model
   */
  deleteId!: string;
  deleteModal(content: any, data: any) {
    this.deleteId = data.uuid;
    this.modalService.open(content, { centered: true });
  }

  /**
  * Save Form
  */
  saveData() {
    this.submitted = true;
    if (this.contentForm.valid) {
      this.contentForm.enable()
      let datos: Categoria = {
        codigo: this.contentForm.value.codigo,
        nombre: this.contentForm.value.nombre,
        descripcion: this.contentForm.value.descripcion,
        tipo: this.contentForm.value.tipo,
        activo: this.contentForm.value.activo,
        forAsociacion: this.contentForm.value.forAsociacion,
      };
      if (this.contentForm.get('uuid')?.value) {
        datos.uuid = this.contentForm.value.uuid;
        this.updateData(datos);
      } else {
        this.addData(datos);
      }
    } else {
      this.notify('Formulario Inválido!', 'error');
    }
  }

  /* API Services */
  loading: boolean = true;
  private getCategories() {
    this.categoriesService.getAll().subscribe({
      next: (data: Categoria[]) => {
        this.loading = false;
        this.categoryList = data;
        this.temp = this.categoryList;
      },
      error: (error) => {
        this.loading = false;
        Swal.fire({ text: error?.message || 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb' });
      }
    });
  }

  private addData(datos: Categoria) {
    this.categoriesService.save(datos).subscribe({
      next: (data: any) => {
        this.submitted = false;
        this.notify('Datos Registrados exitosamente!', 'success');
        this.closeModal();
      },
      error: (error) => {
        this.notify('No se pudo Guardar los datos! ' + error, 'error');
      }
    })
  }

  private updateData(datosUnit: Categoria) {
    this.categoriesService.update(datosUnit).subscribe({
      next: (data: Categoria) => {
        this.submitted = false;
        this.closeModal();
        this.notify('Datos Actualizados exitosamente!', 'success');
      },
      error: (error) => {
        this.notify('No se pudo Actualizar los datos! ' + error, 'error');
      }
    })
  }

  // Delete Data
  deleteData() {
    let uuid = this.deleteId;
    this.categoriesService.delete(uuid).subscribe({
      next: (message: string) => {
        this.submitted = false;
        this.notify(message || 'Registro eliminado correctamente', 'info')
        this.closeModal();
      },
      error: err => {
        this.submitted = false;
        this.notify('No se pudo eliminar el registro!', 'error')
      }
    });
  }

  /* commun functions */
  public closeModal() {
    this.modalService.dismissAll();
    this.contentForm.reset();
    this.contentForm.enable();
    this.getCategories();
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
