import { Component } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { NgbModal} from '@ng-bootstrap/ng-bootstrap';


// Sweet Alert
import Swal from 'sweetalert2';
import { ngxCsv } from 'ngx-csv';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { Categoria } from 'src/app/core/models/categoria.model';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { TranslateService } from '@ngx-translate/core';
import { ModalImportComponent } from './modal-import/modal-import.component';


@Component({
  selector: 'app-categorias',
  templateUrl: './categorias.component.html',
  styleUrls: ['./categorias.component.scss']
})
/**
 * Leads Component
 */
export class CategoriasComponent {
  breadCrumbItems!: Array<{}>;
  title="Categorias";
  canActivate:string[];
  itemsList:any[]=[];
  temp:any[]=[];

  categoryList:any[]=[];
  submitted = false;
  contentForm!: UntypedFormGroup;
  deporteData!: Categoria;
  checkedList: any;
  searchResults: any;
  searchTerm: any;

  constructor(private modalService: NgbModal,
    private authService: AuthenticationService,
    public translate: TranslateService,
    private deportesService: CategoriasService,
    private formBuilder: UntypedFormBuilder,) {      
      this.canActivate = this.authService.hasPermission(this.title);
  }

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'Administracion' },
      { label: this.title, active: true }
    ];

    this.itemsList = [
      {name: 'Codigo', prop: 'codigo'},
      {name: 'Nombre', prop: 'nombre'},
      {name: 'Tipo Cobro', prop: 'tipo', tag:true},
    ];
    
    this.contentForm = this.formBuilder.group({
      uuid: [''],
      estado:[''],
      codigo: ['', [Validators.required]],
      nombre: ['', [Validators.required]],
      tipo: ['']
    });
    this.getCategories();
  }

  get form() {
    return this.contentForm.controls;
  }

  private formDataSet(row:any) {
        this.contentForm.patchValue({
            uuid:row.uuid,
            codigo: row.codigo,
            nombre: row.nombre,
            tipo: row.tipo,
        });
  }

  selectedItems:any[] =[];
  getSelectedItems(items: any[]) {
    this.selectedItems = items;
  }

  // Search Data
  performSearch(): void {
    this.categoryList = this.temp.filter((item: any) => {
      return (
        item.nombre.toLowerCase().includes(this.searchTerm.toLowerCase())
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
    if(data){
      this.formDataSet(data);
      if(accion ==='show'){
        this.contentForm.disable()
      }
    }
    this.modalService.open(content, { size: 'md', centered: true });
  }
  
  camposImport: any[] =[];
  public openModalImport() {
    this.camposImport = [
        {prop: 'Codigo', name: 'Codigo'},
        {prop: 'Tipo Cobro', name: 'Tipo Cobro'},
        {prop: 'Nombre', name: 'Nombre'},
    ];
    const modalRef = this.modalService.open(ModalImportComponent, {
        size: 'lg', backdrop: 'static'
    });
    modalRef.componentInstance.titles = this.camposImport;
    modalRef.componentInstance.itemsList = this.categoryList;
    modalRef.componentInstance.emitList.subscribe(() => {
        this.getCategories();
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
      title: 'Lista de Categorias',
      useBom: true,
      noDownload: false,
      headers: ["uuid", "Codigo","Tipo Cobro", "Nombre","estado"]
    };
    new ngxCsv(this.selectedItems, "Categorias", data);
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
      let datos: Categoria = {
        codigo: this.contentForm.value.codigo,
        nombre: this.contentForm.value.nombre,
        tipo: this.contentForm.value.tipo,
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
  private getCategories(){
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
  addData(datos:Categoria){
    this.deportesService.save(datos).subscribe({
      next:(data:any)=>{
        console.log(data)
        this.submitted=false;
        this.notify('Datos Registrados exitosamente!','success'); 
        this.closeModal();     
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
    this.deportesService.delete(uuid).subscribe({
      next: (data:any) => {
            this.submitted = false;
            this.closeModal();
            this.notify('registro Eliminado exitosamente!','success')
       },
      error: err => {
        this.submitted = false;
        this.notify('No se pudo eliminar el registro!','error')
      }
    });
  }


  /* commun functions */  
  public closeModal() {
    // this.accion = '';
    this.modalService.dismissAll();
    this.contentForm.reset();
    this.contentForm.enable();
    // this.itemsList.emit();
    this.getCategories();
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
