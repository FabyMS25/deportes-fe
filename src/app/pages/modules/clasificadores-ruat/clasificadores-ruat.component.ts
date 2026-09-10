import { Component } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { NgbModal} from '@ng-bootstrap/ng-bootstrap';

import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { ModalImportComponent } from 'src/app/shared/modal-import/modal-import.component';
import { ClasificadorRuat } from 'src/app/core/models/clasificadorRuat.model';
import { ClasificadorRuatService } from 'src/app/core/services/api/clasificadorRuat.service';
import { CsvColumn } from 'src/app/shared/data-header/data-header.component';
import { BreadCrumbItem } from 'src/app/shared/breadcrumbs/breadcrumbs.component';

@Component({
  selector: 'app-clasificadores-ruat',
  templateUrl: './clasificadores-ruat.component.html',
  styleUrls: ['./clasificadores-ruat.component.scss']
})

export class ClasificadoresRuatComponent {
  breadCrumbItems: BreadCrumbItem[] =[];
  viewMode: 'table' | 'cards' = 'table';
  canActivate: string[];
  itemsList: any[] = [];
  temp: ClasificadorRuat[] = [];

  clasificadorList:any[]=[];
  submitted = false;
  contentForm!: UntypedFormGroup;
  clasificadorData!: ClasificadorRuat;
  checkedList: any;
  searchResults: any;
  searchTerm: any;
  selectedItems: any[] = [];

  constructor(private modalService: NgbModal,
    private authService: AuthenticationService,
    public translate: TranslateService,
    private clasificadoresService: ClasificadorRuatService,
    private formBuilder: UntypedFormBuilder,) {
      this.canActivate = this.authService.hasPermission('/admin/classifiers');
  }

  ngOnInit(): void {
    const savedViewMode = localStorage.getItem('dataTableViewMode');
    if (savedViewMode === 'table' || savedViewMode === 'cards') {
      this.viewMode = savedViewMode;
    }
    this.breadCrumbItems = [
      { label: 'Administración' },
      { label: 'Clasificadores Ruat', active: true }
    ];
    this.itemsList = [
      {name: 'Código', prop: 'codigo', visible: true},
      {name: 'Nombre', prop: 'nombre', visible: true},
      {name: 'Descripción', prop: 'descripcion', visible: false},
      {name: 'Tipo Arancel', prop: 'tipoArancel', visible: true},
      {name: 'Estado', prop: 'activo', visible: true, tag:true},
    ];
    this.contentForm = this.formBuilder.group({
      uuid: [''],
      estado: [''],
      codigo: ['', [Validators.required]],
      nombre: ['', [Validators.required]],
      descripcion: [''],
      tipoArancel: ['', [Validators.required]],
      activo: [true]
    });
    this.getClassifiers();
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
      tipoArancel: row.tipoArancel,
      activo: row.activo
    });
  }

  performSearch(): void {
    this.clasificadorList = this.temp.filter((item: any) => {
      return (
        item.nombre?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.codigo?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.descripcion?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.tipoArancel?.toLowerCase().includes(this.searchTerm.toLowerCase())
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
      this.contentForm.patchValue({
        activo: true
      });
    }
    this.modalService.open(content, { size: 'md', centered: true });
  }

  headersImport = ['Código', 'Nombre', 'Descripción', 'Tipo Arancel', 'Activo'];
  readonly CSV_COLUMNS: CsvColumn<ClasificadorRuat>[] = [
    { header: 'Código', value: item => item.codigo || '-' },
    { header: 'Nombre', value: item => item.nombre || '-' },
    { header: 'Descripción', value: item => item.descripcion || '-' },
    { header: 'Tipo Arancel', value: item => item.tipoArancel || '-' },
    { header: 'Activo', value: item => item.activo ? 'SI' : 'NO' },
  ];
  public openModalImport() {
    const modalRef = this.modalService.open(ModalImportComponent, {
      size: 'lg', backdrop: 'static'
    });
    modalRef.componentInstance.titles = this.headersImport.map(header => 
      ({ prop: header, name: header, visible: true }));
    modalRef.componentInstance.itemsList = this.temp;
    modalRef.componentInstance.lookupData = { };
    modalRef.componentInstance.checkExistsFn = (registro: ClasificadorRuat) =>
      this.temp.some(item => !item.estado &&
        (item.nombre === registro.nombre || item.codigo === registro.codigo)
      );
    
    modalRef.componentInstance.mapRowFn = (row: any, lookupData: any): ClasificadorRuat => {
      const missingFields = [];
      if (!row['Código']) missingFields.push('Código');
      if (!row['Nombre']) missingFields.push('Nombre');
      if (!row['Tipo Arancel']) missingFields.push('Tipo Arancel');

      if (missingFields.length > 0) {
        throw { missingFields };
      }
      let codigo = row['Código'];
      if (codigo !== null && codigo !== undefined) {
        // codigo = codigo.toString().trim();
        codigo = codigo.toString().replace(/[^\d]/g, '');
      } else {
        codigo = '';
      }
      let activo = true;
      const activoValue = row['Activo'];
      if (activoValue !== null && activoValue !== undefined) {
        const activoStr = activoValue.toString().toLowerCase().trim();
        activo = activoStr === 'sí' || activoStr === 'si' || activoStr === 'yes' || 
                activoStr === 'true' || activoStr === '1' || activoStr === 'verdadero' ||
                activoStr === 'activo' || activoStr === 's';
      }
      return {
        codigo: codigo,
        nombre: row['Nombre'] ? row['Nombre'].toString().trim() : '',
        descripcion: row['Descripción'] ? row['Descripción'].toString().trim() : '',
        activo: activo,
        tipoArancel: row['Tipo Arancel'] ? row['Tipo Arancel'].toString().trim() : 'DI'
      };
    };    
    modalRef.componentInstance.createRecordFn = (record: ClasificadorRuat) =>
      this.clasificadoresService.save(record).toPromise();
    modalRef.componentInstance.actionCompleted.subscribe(() => {
      this.getClassifiers();
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

  /**
  * Save Form
  */
  saveData() {
    this.submitted = true;
    if (this.contentForm.valid) {
      this.contentForm.enable()
      let datos: ClasificadorRuat = {
        codigo: this.contentForm.value.codigo,
        nombre: this.contentForm.value.nombre,
        descripcion: this.contentForm.value.descripcion,
        tipoArancel: this.contentForm.value.tipoArancel,
        activo: this.contentForm.value.activo
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
  private getClassifiers() {
    this.clasificadoresService.getAll().subscribe({
      next: (data: ClasificadorRuat[]) => {
        this.loading = false;
        this.clasificadorList = data;
        this.temp = this.clasificadorList;
      },
      error: (error) => {
        this.loading = false;
        Swal.fire({ text: error?.message || 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb' });
      }
    });
  }

  private addData(datos: ClasificadorRuat) {
    this.clasificadoresService.save(datos).subscribe({
      next: () => {
        this.submitted = false;
        this.notify('Datos registrados exitosamente!', 'success');
        this.closeModal();
      },
      error: (error) => {
        console.error('Error saving data:', error);
        const errorMessage = this.getErrorMessage(error);
        this.notify('No se pudo guardar los datos: ' + errorMessage, 'error');
      }
    });
  }

  private updateData(datosUnit: ClasificadorRuat) {
    this.clasificadoresService.update(datosUnit).subscribe({
      next: () => {
        this.submitted = false;
        this.closeModal();
        this.notify('Datos actualizados exitosamente!', 'success');
      },
      error: (error) => {
        const errorMessage = this.getErrorMessage(error);
        this.notify('No se pudo actualizar los datos: ' + errorMessage, 'error');
      }
    });
  }


  // Delete Data
  deleteData() {
    let uuid = this.deleteId;
    this.clasificadoresService.delete(uuid).subscribe({
      next: (message: string) => {
        this.submitted = false;
        this.notify(message || 'Registro eliminado correctamente', 'info')
        this.closeModal();
      },
      error: err => {
        this.submitted = false;
        this.notify('No se pudo anular el registro!', 'error')
      }
    });
  }

  /* commun functions */
  public closeModal() {
    this.modalService.dismissAll();
    this.contentForm.reset();
    this.contentForm.enable();
    this.getClassifiers();
  }

  private getErrorMessage(error: any): string {
    if (error.error && error.error.payload) {
      return error.error.payload;
    } else if (error.error && typeof error.error === 'string') {
      return error.error;
    } else if (error.message) {
      return error.message;
    } else if (error.status === 409) {
      return 'El código ya existe en el sistema';
    } else if (error.status === 404) {
      return 'Registro no encontrado';
    } else if (error.status === 400) {
      return 'Datos inválidos';
    } else {
      return 'Error de conexión con el servidor';
    }
  }

  private notify(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    Swal.fire({
      title: message,
      icon: type,
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false
    });
  }
}
