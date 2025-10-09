import { Component } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { NgbModal} from '@ng-bootstrap/ng-bootstrap';

// Sweet Alert
import Swal from 'sweetalert2';
import { ngxCsv } from 'ngx-csv';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { ModalImportComponent } from 'src/app/shared/modal-import/modal-import.component';
import { ClasificadorRuat } from 'src/app/core/models/clasificadorRuat.model';
import { ClasificadorRuatService } from 'src/app/core/services/api/clasificadorRuat.service';

@Component({
  selector: 'app-clasificadores-ruat',
  templateUrl: './clasificadores-ruat.component.html',
  styleUrls: ['./clasificadores-ruat.component.scss']
})
/**
 * Clasificadores Ruat Component
 */
export class ClasificadoresRuatComponent {
  breadCrumbItems!: Array<{}>;
  title="Clasificadores Ruat";
  canActivate:string[];
  itemsList:any[]=[];
  temp:any[]=[];
  viewMode: 'table' | 'cards' = 'table';

  clasificadorList:any[]=[];
  submitted = false;
  contentForm!: UntypedFormGroup;
  clasificadorData!: ClasificadorRuat;
  checkedList: any;
  searchResults: any;
  searchTerm: any;

  // Add these arrays for dropdown options
  tipoArancelOptions = [
    { value: 'por_hora', label: 'Por Hora' },
    { value: 'por_persona', label: 'Por Persona' },
    { value: 'por_evento', label: 'Por Evento' },
    { value: 'por_sesion', label: 'Por Sesión' },
    { value: 'mensualidad', label: 'Mensualidad' },
    { value: 'por_club', label: 'Por Club' }
  ];

  constructor(private modalService: NgbModal,
    private authService: AuthenticationService,
    public translate: TranslateService,
    private clasificadoresService: ClasificadorRuatService,
    private formBuilder: UntypedFormBuilder,) {
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

    // Update itemsList - remove tipoReserva since it's commented out
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
      // Remove tipoReserva since it's commented out in the interface
      // tipoReserva: ['', [Validators.required]],
      tipoArancel: ['', [Validators.required]],
      activo: [true]
    });
    this.getClasificadores();
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
      // Remove tipoReserva
      // tipoReserva: row.tipoReserva,
      tipoArancel: row.tipoArancel,
      activo: row.activo
    });
  }

  selectedItems: any[] = [];
  getSelectedItems(items: any[]) {
    this.selectedItems = items;
  }

  // Search Data - Remove tipoReserva from search
  performSearch(): void {
    this.clasificadorList = this.temp.filter((item: any) => {
      return (
        item.nombre?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.codigo?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.descripcion?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        // Remove tipoReserva from search
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
      // Reset form for new entry
      this.contentForm.patchValue({
        activo: true
      });
    }
    this.modalService.open(content, { size: 'md', centered: true });
  }

  // Update headersImport - remove Tipo Reserva
  headersImport = ['Código', 'Nombre', 'Descripción', 'Tipo Arancel', 'Activo'];
  
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
      // Remove tipoReserva validation
      if (!row['Tipo Arancel']) missingFields.push('Tipo Arancel');

      if (missingFields.length > 0) {
        throw { missingFields };
      }

      let codigo = row['Código'];
      if (codigo !== null && codigo !== undefined) {
        codigo = codigo.toString().replace(/[^\d]/g, '');
      }

      return {
        codigo: codigo,
        nombre: row['Nombre'],
        descripcion: row['Descripción'] ? row['Descripción'] : '',
        activo: row['Activo'] ? ('' + row['Activo']).toLowerCase() === 'true' : true,
        tipoArancel: row['Tipo Arancel']
      };
    };
    modalRef.componentInstance.createRecordFn = (record: ClasificadorRuat) =>
      this.clasificadoresService.save(record).toPromise();
    modalRef.componentInstance.actionCompleted.subscribe(() => {
      this.getClasificadores();
    });
  }

  // Csv File Export - Update to remove tipoReserva
  public csvFileExport() {
    const lista = this.selectedItems.flatMap((item: ClasificadorRuat) => {
      return {
        code: item.codigo,
        name: item.nombre,
        description: item.descripcion || '',
        tariffType: item.tipoArancel,
        active: item.activo ? 'Sí' : 'No'
      };
    });
    var data = {
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
        // Remove tipoReserva
        // tipoReserva: this.contentForm.value.tipoReserva,
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
  private getClasificadores() {
    this.clasificadoresService.getAll().subscribe({
      next: (data: any) => {
        this.loading = false;
        if (data['status'] === 'OK') {
          this.clasificadorList = data.payload;
          this.temp = this.clasificadorList;
        }
      },
      error: (error) => {
        this.loading = false;
        Swal.fire({ text: 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb' });
      }
    });
  }

  private addData(datos: ClasificadorRuat) {
    this.clasificadoresService.save(datos).subscribe({
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

  private updateData(datosUnit: ClasificadorRuat) {
    this.clasificadoresService.update(datosUnit).subscribe({
      next: (data: ClasificadorRuat) => {
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
    this.clasificadoresService.delete(uuid).subscribe({
      next: (data: any) => {
        this.submitted = false;
        if (data['status'] === 'OK') {
          this.notify(data.payload, 'info')
        }
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
    this.getClasificadores();
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