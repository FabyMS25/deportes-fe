import { Component } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
// Sweet Alert
import Swal from 'sweetalert2';
import { ngxCsv } from 'ngx-csv';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { SuperficiesService } from 'src/app/core/services/api/superficies.service';
import { Superficie } from 'src/app/core/models/superficie.model';
import { ModalImportComponent } from './modal-import/modal-import.component';


@Component({
  selector: 'app-surfaces',
  templateUrl: './surfaces.component.html',
  styleUrls: ['./surfaces.component.scss']
})
/**
 * Leads Component
 */
export class SurfacesComponent {

  breadCrumbItems!: Array<{}>;
  title="Superficies";
  canActivate:string[];
  itemsList:any[]=[];
  temp:any[]=[];

  submitted = false;
  contentForm!: UntypedFormGroup;
  superficiesList:any[]=[];

  constructor(private modalService: NgbModal,
    private authService: AuthenticationService,
    private superficiesService: SuperficiesService,
    private formBuilder: UntypedFormBuilder) {
      this.canActivate = this.authService.hasPermission(this.title);
  }

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'Administracion' },
      { label: this.title, active: true }
    ];

    this.itemsList = [
      {name: 'Descripción', prop: 'descripcion'},
    ];
    this.contentForm = this.formBuilder.group({
      uuid: [''],
      estado:[''],
      descripcion: ['', [Validators.required]]
    });

    this.getSurfaces();
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

  selectedItems:any[] =[];
  getSelectedItems(items: any[]) {
    this.selectedItems = items;
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

  camposImport: any[] =[];
  public openModalImport() {
    this.camposImport = [
        {prop: 'Descripcion', name: 'Descripcion'},
    ];
    const modalRef = this.modalService.open(ModalImportComponent, {
        size: 'lg',
        backdrop: 'static'
    });
    modalRef.componentInstance.titles = this.camposImport;
    modalRef.componentInstance.itemsList = this.superficiesList;
    modalRef.componentInstance.emitList.subscribe(() => {
        this.getSurfaces();
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
      title: 'Lista de Superficies',
      useBom: true,
      noDownload: false,
      headers: ["uuid", "Descripcion", "status"]
    };
    new ngxCsv(this.selectedItems, "Superficies", data);
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
          }else{
            this.loading = false;
            Swal.fire({ text: data.payload, confirmButtonColor: '#299cdb'});
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
