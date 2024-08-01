import { Component, QueryList, ViewChildren, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { UntypedFormBuilder, UntypedFormGroup, UntypedFormArray, UntypedFormControl, Validators } from '@angular/forms';

// Date Format
import { DatePipe } from '@angular/common';
// Csv File Export
import { ngxCsv } from 'ngx-csv/ngx-csv';

// Rest Api Service
import { GlobalComponent } from '../../../global-component';

// Sweet Alert
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ModalEmployeeComponent } from './modal/modalEmployee.component';
import { UserService } from 'src/app/core/services/api-users/users.service';
import { UserRol } from 'src/app/core/constants/UserData';
import { EncargadoService } from 'src/app/core/services/api/encargado.service';
import { ModalImportComponent } from './modal-import/modal-import.component';

@Component({
  selector: 'app-employees',
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.scss']
})

/**
 * Contacts Component
 */
export class EmployeesComponent implements OnInit {
  title='Encargados'
  // bread crumb items
  breadCrumbItems!: Array<{}>;
  submitted = false;
  contentForm!: UntypedFormGroup;
  masterSelected!: boolean;
  checkedList: any;

  userRol =UserRol;
  // Api Data
  econtent?: any;
  url = GlobalComponent.API_URL;
  allcontent: any;
  searchTerm: any;


  
  canActivate:string[];
  listaItems:any[]=[];
  // userRol =UserRol;
  userList:any;
  employeesList:any[]= [];//Employees;
  temp: any[] = [];
  funcionarioSelected!:any;
  // loading:boolean=false;


  constructor(private modalService: NgbModal,
    private authService: AuthenticationService,
    private usersService: UserService,
    private employeesService: EncargadoService,
  ) {
      this.canActivate = this.authService.hasPermissionModulo(this.title);
  }

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'Administracion' },
      { label: this.title, active: true }
    ];
    this.listaItems = [
      {name: 'Nombre', prop: 'nombre', avatar:true},
      {name: 'Complejo',prop: 'complejoDto.nombre'},
      {name: 'Telefono', prop: 'telefono'},
    ];

    this.loadData();
  }
  
  loading: boolean = true;
  private async loadData() {
    await this.getUsers();
    await this.getEmployees();
  }

  // Search Data
  performSearch(): void {
    this.employeesList = this.temp.filter((item: any) => {
      return (
        item.nombreCompleto.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.canchasDto.nombre.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    });
  }

  /**
   * Open modal
   * @param content modal content
   */

  public openModal(row: any, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalEmployeeComponent, {
        backdrop: 'static',
        size:size
    });
    modalRef.componentInstance.row = row;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.listaItems.subscribe(() => {
    this.loadData();
    });
  }

  /**
   * Delete model
   */
  deleteModal(content: any, data: any) {
    this.checkedValGet.push(data.uuid);
    this.modalService.open(content, { centered: true });
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
    this.checkedValGet = checkedVal;
    if (checkedVal.length > 0) {
      this.modalService.open(content, { centered: true });
    }
    else {
      Swal.fire({ text: 'Porfavor seleccione almenos un checkbox', confirmButtonColor: '#299cdb', });
    }
  }

  /**
  * Form data get
  */
  get form() {
    return this.contentForm.controls;
  }

  // File Upload
  imageURL: string | undefined;
  fileChange(event: any) {
    let fileList: any = (event.target as HTMLInputElement);
    let file: File = fileList.files[0];
    document.getElementById('')
    this.contentForm.patchValue({
      // image_src: file.name
      image_src: 'avatar-8.jpg'
    });
    const reader = new FileReader();
    reader.onload = () => {
      this.imageURL = reader.result as string;
      (document.getElementById('customer-img') as HTMLImageElement).src = this.imageURL;
    }
    reader.readAsDataURL(file)
  }

  /**
   * View Data Get
   * @param content modal content
   */
  viewDataGet(data: any) {
    this.funcionarioSelected=data
  }

  camposImport: any[] =[];
  public abrirModalImport() {
    this.camposImport = [
        {prop: 'userUuid', name: 'userUuid'},
        {prop: 'Nombre', name: 'Nombre'},
        {prop: 'Telefono', name: 'Telefono'},
        {prop: 'Hora Entrada', name: 'Hora Entrada'},
        {prop: 'Hora Salida', name: 'Hora Salida'},
        {prop: 'Complejo', name: 'Complejo'},
    ];
    const modalRef = this.modalService.open(ModalImportComponent, {
        size: 'lg',
        backdrop: 'static'
    });
    modalRef.componentInstance.titles = this.camposImport;
    modalRef.componentInstance.itemsList = this.employeesList;
    modalRef.componentInstance.listaItems.subscribe(() => {
        this.getEmployees();
    });
  }

  // Csv File Export
  csvFileExport() {
    var orders = {
      fieldSeparator: ',',
      quoteStrings: '"',
      decimalseparator: '.',
      showLabels: true,
      showTitle: true,
      title: 'Lista de Encargados',
      useBom: true,
      noDownload: false,
      headers: ["uuid", "userUuid", "Hora Entrada", "Hora Salida","Telefono","Nombre", "Estado", "Complejo", "avatar"]
    };
    new ngxCsv(this.employeesList, "Encargados", orders);
  }


  // Sort filter
  sortField: any;
  sortBy: any
  SortFilter() {
    this.sortField = (document.getElementById("choices-single-default") as HTMLInputElement).value;
    if (this.sortField[0] == 'A') {
      this.sortBy = 'desc';
      this.sortField = this.sortField.replace(/A/g, '')
    }
    if (this.sortField[0] == 'D') {
      this.sortBy = 'asc';
      this.sortField = this.sortField.replace(/D/g, '')
    }
  }


  /* API Services */
  private getUsers(){
    this.usersService.getAllUsers().subscribe((data)=>{
      this.userList = data;
    })
  }
  private getEmployees(): void {
    setTimeout(() => {
      this.employeesService.getAll().subscribe({
        next: (data: any) => {
          this.loading = false;
          if (data.status === 'OK') {
            this.employeesList = data.payload.map((employee: any) => ({
              ...employee,
              // nombreCompleto: this.getFullName(employee),
              avatar: this.getAvatar(employee)
            }));
            this.temp = this.employeesList;
            if (this.employeesList.length > 0) {
              this.funcionarioSelected = this.employeesList[0];
            }
          } else {
            Swal.fire({ text: data.payload, confirmButtonColor: '#299cdb' });
          }
        },
        error: () => {
          this.loading = false;
          Swal.fire({ text: 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb' });
        }
      });
      document.getElementById('elmLoader')?.classList.add('d-none');
    }, 1200);
  }
    // Delete Data
    deleteData() {
      this.checkedValGet.forEach(uuid => {
        this.employeesService.delete(uuid).subscribe({
          next: (data:any) => {
                this.submitted = false;
                // this.closeModal();
                // this.notify('registro Eliminado exitosamente!','success')
              Swal.fire({ text: 'registro Eliminado exitosamente!', confirmButtonColor: 'success' });
           },
          error: err => {
            this.submitted = false;
            // this.notify('No se pudo eliminar el registro!','error')
          Swal.fire({ text: 'No se pudo eliminar el registro!', confirmButtonColor: 'success' });
          }
        });
      });
    }

  private getFullName(employee: any): string {
    const user = this.userList.find((user: any) => user.uuid === employee.userUuid);
    return user ? user.designacionFuncionarioDto.personaDto.fullName : '';
  }

  private getAvatar(employee: any): string {
    let avatar = '';
    const user = this.userList.find((user: any) => user.uuid === employee.userUuid);
    const foundItem = this.userRol.find(item => item.tipo === 1);
    if (foundItem) {
      avatar = foundItem.avatarM;
      if (user && user.designacionFuncionarioDto.personaDto.sexo === 'F') {
        avatar = foundItem.avatarF;
      }
    }
    return avatar;
  }
  
}
