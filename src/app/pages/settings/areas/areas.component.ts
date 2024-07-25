import { Component } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
// Sweet Alert
import Swal from 'sweetalert2';
import { ngxCsv } from 'ngx-csv';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { SuperficiesService } from 'src/app/core/services/api/superficies.service';
import { Superficie } from 'src/app/core/models/superficie.model';


@Component({
  selector: 'app-areas',
  templateUrl: './areas.component.html',
  styleUrls: ['./areas.component.scss']
})
/**
 * Leads Component
 */
export class AreasComponent {

  // bread crumb items
  breadCrumbItems!: Array<{}>;
  title="Superficies";
  submitted = false;
  contentForm!: UntypedFormGroup;
  // deporteData!: Categoria;
  checkedList: any;

  searchResults: any;
  searchTerm: any;

  superficiesList:any[]=[];
  temp:any[]=[];
  listaItems:any[]=[];
  canActivate:string[];

  constructor(private modalService: NgbModal,
    private authService: AuthenticationService,
    private superficiesService: SuperficiesService,
    private formBuilder: UntypedFormBuilder) {
      this.canActivate = this.authService.hasPermissionModulo(this.title);
  }

  ngOnInit(): void {
    /**
    * BreadCrumb
    */
    this.breadCrumbItems = [
      { label: 'Administracion' },
      { label: this.title, active: true }
    ];

    this.listaItems = [
      {name: 'Descripción', prop: 'descripcion'},
      {name: 'Canchas',prop: 'canchas'},
    ];
    /**
     * Form Validation
     */
    this.contentForm = this.formBuilder.group({
      uuid: [''],
      estado:[''],
      descripcion: ['', [Validators.required]]
    });

    /**
     * fetches data
     */
    this.getSurfaces();
  }

  /**
   * Open modal
   * @param content modal content
   */
  accion='';
  openModal(data:any,content: any,accion:string) {
    this.accion=accion;
    if(data){
      this.formDataSet(data);
      if(accion==='show'){
        this.contentForm.disable()
      }
    }
    this.modalService.open(content, { size: 'md', centered: true });
  }
  private formDataSet(row:any) {
        this.contentForm.patchValue({
            uuid:row.uuid,
            // image_src: [''],
            nombre: row.nombre,
            // tarifa: row.totalxhora,
        });
  }
  /**
   * Form data get
   */
  get form() {
    return this.contentForm.controls;
  }


  // Search Data
  performSearch(): void {
    this.superficiesList = this.temp.filter((item: any) => {
      return (
        item.nombre.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    });
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
  
      setTimeout(() => {
        // this.contentForm.reset();
      }, 2000);
      // this.submitted = true
    }
      
  addData(datos:Superficie){
    this.superficiesService.save(datos).subscribe({
      next:(data:Superficie)=>{
        this.submitted=false;
        this.notify('Datos Registrados exitosamente!','success'); 
        this.closeModal();
        this.getSurfaces();
        // this.listaItems.emit();       
      },
      error: (error) => {
        this.notify('No se pudo Guardar los datos! '+error, 'error');
      }
    })
  }
  updateData(datosUnit:Superficie) {
      this.superficiesService.update(datosUnit).subscribe({
          next: (data: Superficie) => {
            this.submitted = false;
            this.closeModal();
            this.getSurfaces();
            // this.listaItems.emit();
            this.notify('Datos Actualizados exitosamente!', 'success');
          },
          error: (error) => {
            this.notify('No se pudo Actualizar los datos! '+error, 'error');
          }
      })
  }

  /**
   * Delete model
   */
  deleteId: any;
  confirm(content: any, data: any) {
    this.deleteId = data.uuid;
    this.modalService.open(content, { centered: true });
  }

  // Delete Data
  deleteData(id: any) {
    if (id) {
      this.superficiesService.delete(id).subscribe({
        next: (data:any) => {
              this.submitted = false;
              this.closeModal();
              // this.listaItems.emit();
              this.notify('registro Eliminado exitosamente!','success')
         },
        error: err => {
          this.submitted = false;
          this.notify('No se pudo eliminar el registro!','error')
        }
      });
    }
  }
  /**
   * Multiple Delete
   */
  checkedValGet: any[] = [];
  deleteMultiple(content: any) {
    var checkboxes: any = document.getElementsByName('checkAll');
    var result
    var checkedVal: any[] = [];
    for (var i = 0; i < checkboxes.length; i++) {
      if (checkboxes[i].checked) {
        result = checkboxes[i].value;
        checkedVal.push(result);
      }
    }
    if (checkedVal.length > 0) {
      this.modalService.open(content, { centered: true });
      // checkedVal.forEach(uuid => {
      //     this.deleteData(uuid)
      // });
    }
    else {
      Swal.fire({ text: 'Porfavor seleccione almenos un checkbox', confirmButtonColor: '#299cdb', });
    }
    this.checkedValGet = checkedVal;
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
    new ngxCsv(this.superficiesList, "superficies", data);
  }
  public closeModal() {
    // this.accion = '';
    this.modalService.dismissAll();
    this.contentForm.reset();
    this.contentForm.enable();
  }
  private notify(message: any, type: any): void {
    let timerInterval: any;
    Swal.fire({
      title: message,
      icon: type,
      timer: 2000,
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
