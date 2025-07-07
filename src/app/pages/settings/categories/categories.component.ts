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
import { ModalImportComponent } from 'src/app/shared/modal-import/modal-import.component';
import { TipoCobro } from 'src/app/core/constants/TipoCobro';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss']
})
/**
 * Leads Component
 */
export class CategoriesComponent {
  breadCrumbItems!: Array<{}>;
  title="Categorias";
  canActivate:string[];
  itemsList:any[]=[];
  temp:any[]=[];
  viewMode: 'table' | 'cards' = 'table';

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
    private categoriesService: CategoriasService,
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

    this.itemsList = [
      {name: 'Codigo', prop: 'codigo',visible:false},
      {name: 'Nombre', prop: 'nombre',visible:true},
      {name: 'Tipo Cobro', prop: 'tipo',  visible:true},
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
        item.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.codigo.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.tipo.toLowerCase().includes(this.searchTerm.toLowerCase())
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

  headersImport = ['Código','Nombre', 'Tipo Cobro'];
  public openModalImport() {
    const modalRef = this.modalService.open(ModalImportComponent, {
      size: 'lg', backdrop: 'static'
    });
    modalRef.componentInstance.titles = this.headersImport.map(header => 
      ({ prop: header, name: header, visible: true}));
    modalRef.componentInstance.itemsList = this.temp;
    modalRef.componentInstance.lookupData = {
      typeList: TipoCobro
    };
      modalRef.componentInstance.checkExistsFn = (registro:Categoria) =>
        this.temp.some(item =>
          item.nombre === registro.nombre
        );
      modalRef.componentInstance.mapRowFn = (row: any, lookupData: any): Categoria => {
        const value = (row['Tipo Cobro'] || '').trim();
        const type = lookupData.typeList.find(
          (t: any) => t.trim() === value
        );
        const missingFields = [];
        if (!type) missingFields.push('TipoCobro');
        if (missingFields.length > 0) {
          throw { missingFields };
        }
        return {
          codigo: '' + row['Código'],
          nombre: '' + row['Nombre'],
          tipo: type
        };
      };
    modalRef.componentInstance.createRecordFn = (record:Categoria) =>
      this.categoriesService.save(record).toPromise();
    modalRef.componentInstance.actionCompleted.subscribe(() => {
      this.getCategories();
    });
  }

  // Csv File Export
  public csvFileExport() {
    const lista = this.selectedItems.flatMap((item: Categoria) => {
    return {
      code: item.codigo,
      name: item.nombre,
      type: item.tipo
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
    this.categoriesService.getAll().subscribe({
        next: (data: any) => {
          this.loading = false;
          if (data['status'] === 'OK') {
            this.categoryList = data.payload;
            this.temp = this.categoryList
          }
        },
        error: (error) => {
          this.loading = false;
          Swal.fire({ text: 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb' });
        }
      });
  }
  private addData(datos:Categoria){
    this.categoriesService.save(datos).subscribe({
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
  private updateData(datosUnit:Categoria) {
      this.categoriesService.update(datosUnit).subscribe({
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
    this.categoriesService.delete(uuid).subscribe({
      next: (data:any) => {
            this.submitted = false;
            if(data['status'] === 'OK') {
              this.notify(data.payload, 'info')
            }
            this.closeModal();
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
