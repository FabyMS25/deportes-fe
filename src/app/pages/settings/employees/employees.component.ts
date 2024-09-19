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
  breadCrumbItems!: Array<{}>;
  
  canActivate:string[];
  itemsList:any[]=[];
  temp: any[] = [];

  submitted = false;

  userRol =UserRol;
  userList:any;
  employeesList:any[]= [];//Employees;
  funcionarioSelected!:any;

  constructor(private modalService: NgbModal,
    private authService: AuthenticationService,
    private usersService: UserService,
    private employeesService: EncargadoService,
  ) {
      this.canActivate = this.authService.hasPermission(this.title);
  }

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'Administracion' },
      { label: this.title, active: true }
    ];
    this.itemsList = [
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

  selectedItems:any[] =[];
  getSelectedItems(items: any[]) {
    this.selectedItems = items;
  }
  
  // Search Data
  searchTerm: any;
  performSearch(): void {
    this.employeesList = this.temp.filter((item: any) => {
      return (
        item.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.complejoDto.nombre.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    });
  }

  /**
   * View Data Get
   * @param content modal content
   */
  viewDataGet(data: any) {
    this.funcionarioSelected=data
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
    modalRef.componentInstance.itemsList.subscribe(() => {
    this.loadData();
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

  camposImport: any[] =[];
  public openModalImport() {
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
    modalRef.componentInstance.itemsList.subscribe(() => {
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
    new ngxCsv(this.selectedItems, "Encargados", orders);
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
    let uuid = this.deleteId;
    this.employeesService.delete(uuid).subscribe({
      next: (data:any) => {
            this.submitted = false;
            if(data.status=='OK'){
              this.loadData();
              Swal.fire({ text: data.payload, confirmButtonColor: 'success' });
              this.modalService.dismissAll();
            }
       },
      error: err => {
        this.submitted = false;
      Swal.fire({ text: 'No se pudo eliminar el registro!', confirmButtonColor: 'success' });
      }
    });
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
