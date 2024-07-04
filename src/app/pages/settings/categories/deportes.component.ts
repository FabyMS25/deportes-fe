import { Component, QueryList, ViewChildren, TemplateRef } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { NgbModal, NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { UntypedFormBuilder, UntypedFormGroup, FormArray, Validators } from '@angular/forms';

// Date Format
import { DatePipe } from '@angular/common';

// Sweet Alert
import Swal from 'sweetalert2';

import { RootReducerState } from 'src/app/store';
import { Store } from '@ngrx/store';
import { PaginationService } from 'src/app/core/services/pagination.service';
import { DeportesService } from 'src/app/core/services/api/deporte.service';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { Categoria } from 'src/app/core/models/categoria.model';


@Component({
  selector: 'app-deportes',
  templateUrl: './deportes.component.html',
  styleUrls: ['./deportes.component.scss']
})
/**
 * Leads Component
 */
export class DeportesComponent {

  // bread crumb items
  breadCrumbItems!: Array<{}>;
  title="Categorias";
  submitted = false;
  contentForm!: UntypedFormGroup;
  deporteData!: Categoria;
  masterSelected!: boolean;
  checkedList: any;

  // Api Data
  // content?: any;
  leads?: any;
  // econtent?: any;

  closeResult: any;
  allleads: any;
  searchResults: any;
  searchTerm: any;

  listaItems:any[]=[];
  categoryList:any[]=[];
  temp:any[]=[];


  canActivate:string[];

  constructor(private modalService: NgbModal,
    private authService: AuthenticationService,
    private deportesService: DeportesService,
    public service: PaginationService,
    private formBuilder: UntypedFormBuilder,
    private store: Store<{ data: RootReducerState }>,
    private offcanvasService: NgbOffcanvas,
    private datePipe: DatePipe) {
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
      {name: 'Nombre', prop: 'nombre'},
      {name: 'Estado', prop: 'estado'},
      {name: 'Canchas',prop: 'canchas'},
    ];
    /**
     * Form Validation
     */
    this.contentForm = this.formBuilder.group({
      uuid: [''],
      estado:[''],
      nombre: ['', [Validators.required]]
    });

    /**
     * fetches data
     */
    this.getDeportes();
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
    this.categoryList = this.temp.filter((item: any) => {
      return (
        item.nombre.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    });
  }

  /* API Services */
  loading: boolean = true;
  private getDeportes(){
    this.deportesService.getAll().subscribe({
        next: (data: any) => {
          this.loading = false;
          if (data['status'] === 'OK') {
            this.categoryList = data.payload;
            this.temp = this.categoryList
          }else{
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
        let datos: Categoria = {
          nombre: this.contentForm.value.nombre,
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
      
  addData(datos:Categoria){
    this.deportesService.save(datos).subscribe({
      next:(data:Categoria)=>{
        this.submitted=false;
        this.notify('Datos Registrados exitosamente!','success'); 
        this.closeModal();
        this.getDeportes();
        // this.listaItems.emit();       
      },
      error: (error) => {
        this.notify('No se pudo Guardar los datos! '+error, 'error');
      }
    })
  }
  updateData(datosUnit:Categoria) {
      this.deportesService.update(datosUnit).subscribe({
          next: (data: Categoria) => {
            this.submitted = false;
            this.closeModal();
            this.getDeportes();
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
      this.deportesService.delete(id).subscribe({
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
