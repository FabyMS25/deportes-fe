import { Component } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
// Sweet Alert
import Swal from 'sweetalert2';
import { ngxCsv } from 'ngx-csv';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { SuperficiesService } from 'src/app/core/services/api/superficies.service';
import { Superficie } from 'src/app/core/models/superficie.model';
import { ModalImportComponent } from 'src/app/shared/modal-import/modal-import.component';

@Component({
  selector: 'app-surfaces',
  templateUrl: './surfaces.component.html',
  styleUrls: ['./surfaces.component.scss']
})

export class SurfacesComponent {

  breadCrumbItems!: Array<{}>;
  title="Superficies";
  canActivate:string[];
  itemsList:any[]=[];
  temp:any[]=[];
  viewMode: 'table' | 'cards' = 'table';

  submitted = false;
  contentForm!: UntypedFormGroup;
  superficiesList:any[]=[];
  selectedItems:any[] =[];

  constructor(private modalService: NgbModal,
    private authService: AuthenticationService,
    private superficiesService: SuperficiesService,
    private formBuilder: UntypedFormBuilder) {
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
      {name: 'Descripción', prop: 'descripcion',visible:true},
    ];
    this.contentForm = this.formBuilder.group({
      uuid: [''],
      estado:[''],
      descripcion: ['', [Validators.required]]
    });
    this.getSurfaces();
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

  private formDataSet(row:any) {
        this.contentForm.patchValue({
            uuid:row.uuid,
            descripcion: row.descripcion,
        });
  }

  get form() {
    return this.contentForm.controls;
  }

  // Search Data
  searchResults: any;
  searchTerm: any;
  performSearch(): void {
    this.superficiesList = this.temp.filter((item: any) => {
      return (
        item.descripcion.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    });
  }

  /**
   * Open modal
   * @param content modal content
   */
  accion='';
  openModal(data:any,content: any,accion:string) {
    this.accion=accion;
    if (data) {
      this.formDataSet(data);
      if(accion==='show'){
        this.contentForm.disable()
      }
    }
    this.modalService.open(content, { size: 'md', centered: true });
  }

  /**
   * Delete model
   */
  deleteId!: string;
  deleteModal(content: any, data: any) {
    this.deleteId = data.uuid;
    this.modalService.open(content, { centered: true });
  }
  headersImport = ['Descripcion'];
  public openModalImport() {
    const modalRef = this.modalService.open(ModalImportComponent, {
      size: 'lg', backdrop: 'static'
    });
    modalRef.componentInstance.titles = this.headersImport.map(header => 
      ({ prop: header, name: header, visible: true}));
    modalRef.componentInstance.itemsList = this.temp;
    modalRef.componentInstance.checkExistsFn = (registro:Superficie) =>
      this.temp.some(item =>
        item.descripcion === registro.descripcion
      );
    modalRef.componentInstance.mapRowFn = (row: any, lookupData: any): Superficie => {
      return {
        descripcion: '' + row['Descripcion'],
      };
    };
    modalRef.componentInstance.createRecordFn = (record:Superficie) =>
      this.superficiesService.save(record).toPromise();
    modalRef.componentInstance.actionCompleted.subscribe(() => {
      this.getSurfaces();
    });
  }
  // Csv File Export
  public csvFileExport() {
    const lista = this.selectedItems.flatMap((item: Superficie) => {
    return {
      value: item.descripcion
    };});
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

  /**
  * Save
  */
  saveData() {
    this.submitted = true;
    if (this.contentForm.valid) {
      this.contentForm.enable()
      let datos: Superficie = {
        descripcion: this.contentForm.value.descripcion,
      };
      if (this.contentForm.get('uuid')?.value) {
        datos.uuid=this.contentForm.value.uuid,
          this.updateData(datos);
      } else {
          this.addData(datos);
      }
    }else {
        this.notify('Formulario Invalido!', 'error');
    }
  }

  /* API Services */
  loading: boolean = true;
  private getSurfaces(){
    this.superficiesService.getAll().subscribe({
        next: (data: any) => {
          this.loading = false;
          if (data['status'] === 'OK') {
            this.superficiesList = data.payload;
            this.temp = this.superficiesList
          }
        },
        error: (error) => {
          this.loading = false;
          Swal.fire({ text: 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb' });
        }
      });
  }

  private addData(datos:Superficie){
    this.superficiesService.save(datos).subscribe({
      next:(data:Superficie)=>{
        this.submitted=false;
        this.notify('Datos Registrados exitosamente!','success');
        this.closeModal();
        this.getSurfaces();
      },
      error: (error) => {
        this.notify('No se pudo Guardar los datos! '+error, 'error');
      }
    })
  }
  private updateData(datosUnit:Superficie) {
      this.superficiesService.update(datosUnit).subscribe({
          next: (data: Superficie) => {
            this.submitted = false;
            this.closeModal();
            this.getSurfaces();
            // this.itemsList.emit();
            this.notify('Datos Actualizados exitosamente!', 'success');
          },
          error: (error) => {
            this.notify('No se pudo Actualizar los datos! '+error, 'error');
          }
      })
  }
  // Delete Data
  deleteData() {
    let uuid = this.deleteId;
    this.superficiesService.delete(uuid).subscribe({
      next: (data:any) => {
            this.submitted = false;
            if(data['status'] === 'OK') {
              this.notify(data.payload, 'info')
              this.getSurfaces();
            }
            this.closeModal();
       },
      error: err => {
        this.submitted = false;
        this.notify('No se pudo eliminar el registro!','error')
      }
    });
  }

  /* common functions */
  public closeModal() {
    this.modalService.dismissAll();
    this.contentForm.reset();
    this.contentForm.enable();
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
