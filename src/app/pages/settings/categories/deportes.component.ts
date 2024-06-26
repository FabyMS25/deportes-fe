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
import { Deporte } from 'src/app/core/models/deporte.model';
import { DeportesService } from 'src/app/core/services/api/deporte.sservice';
import { AuthenticationService } from 'src/app/core/services/auth.service';


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
  deporteData!: Deporte;
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
    // this.store.dispatch(fetchCrmLeadData());
    // this.store.select(selectCRMLoading).subscribe((data) => {
    //   if (data == false) {
    //     document.getElementById('elmLoader')?.classList.add('d-none');
    //   }
    // });

    // this.store.select(selectLeadData).subscribe((data) => {
    //   this.leads = data;
    //   this.allleads = cloneDeep(data);
    //   this.leads = this.service.changePage(this.allleads)
    // });

  }

  /**
   * Open modal
   * @param content modal content
   */
  openModal(data:any,content: any,accion:string) {
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



  // The master checkbox will check/ uncheck all items
  checkUncheckAll(ev: any) {
    this.leads.forEach((x: { state: any; }) => x.state = ev.target.checked)
    var checkedVal: any[] = [];
    var result
    for (var i = 0; i < this.leads.length; i++) {
      if (this.leads[i].state == true) {
        result = this.leads[i];
        checkedVal.push(result);
      }
    }
    this.checkedValGet = checkedVal
    checkedVal.length > 0 ? (document.getElementById("remove-actions") as HTMLElement).style.display = "block" : (document.getElementById("remove-actions") as HTMLElement).style.display = "none";

  }

  // Select Checkbox value Get
  onCheckboxChange(e: any) {
    var checkedVal: any[] = [];
    var result
    for (var i = 0; i < this.leads.length; i++) {
      if (this.leads[i].state == true) {
        result = this.leads[i];
        checkedVal.push(result);
      }
    }
    this.checkedValGet = checkedVal
    checkedVal.length > 0 ? (document.getElementById("remove-actions") as HTMLElement).style.display = "block" : (document.getElementById("remove-actions") as HTMLElement).style.display = "none";
  }



  changePage() {
    this.leads = this.service.changePage(this.categoryList)
  }

  // Search Data
  performSearch(): void {
    this.categoryList = this.temp.filter((item: any) => {
      return (
        item.nombre.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    });
    this.leads = this.service.changePage(this.categoryList)
  }

  onSort(column: any) {
    this.leads = this.service.onSort(column, this.leads)
  }

  /* API Services */
  private getDeportes(){
    this.deportesService.getAll().subscribe({
        next: (data: any) => {
          if (data['status'] === 'OK') {
            this.categoryList = data.payload;
            this.temp = this.categoryList
          }else{
            Swal.fire({ text: data.payload, confirmButtonColor: '#299cdb'});
          }
        },
        error: (error) => {
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
        let datos: Deporte = {
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
      
  addData(datos:Deporte){
    this.deportesService.save(datos).subscribe({
      next:(data:Deporte)=>{
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
  updateData(datosUnit:Deporte) {
      this.deportesService.update(datosUnit).subscribe({
          next: (data: Deporte) => {
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
