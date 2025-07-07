import { Component, QueryList, ViewChildren, OnInit, ViewChild, ElementRef } from '@angular/core';
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
import { campoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { Encargado } from 'src/app/core/models/encargado';

@Component({
  selector: 'app-employees',
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.scss']
})

export class EmployeesComponent implements OnInit {
  title='Encargados'
  breadCrumbItems!: Array<{}>;
  
  canActivate:string[];
  itemsList:any[]=[];
  temp: any[] = [];
  viewMode: 'table' | 'cards' = 'table';

  submitted = false;

  userRol =UserRol;
  userList:any;
  employeesList:Encargado[]= [];//Employees;
  funcionarioSelected!:any;

  @ViewChild('viewModel') viewModel!: ElementRef;
  constructor(private modalService: NgbModal,
    private authService: AuthenticationService,
    private usersService: UserService,
    private employeesService: EncargadoService,
  ) {
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
      {name: 'Nombre', prop: 'nombre', avatar:true,visible:true},
      {name: 'Complejo',prop: 'complejoDto.nombre',visible:true},
      {name: 'Telefono', prop: 'telefono',visible:true},
      {name: 'Entrada', prop: 'horaEntrada',visible:false},
      {name: 'Salida', prop: 'horaSalida',visible:false},
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
   */
  viewDataGet(data: any) {
    this.funcionarioSelected=data;    
    const element = this.viewModel.nativeElement;
    const elementTop = element.getBoundingClientRect().top + window.scrollY;
    const middleOffset = elementTop - (window.innerHeight / 2) + (element.offsetHeight / 2);    
    window.scrollTo({top: middleOffset, behavior: 'smooth' });
  }  

  /**
   * Open modal
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
    const lista = this.selectedItems.flatMap((item:Encargado) => {
      const data = {
        user: item.userUuid,
        name: item.nombre,
        phone: item.telefono,
        avatar: item.avatar,
        Complejo:item.complejoDto.nombre,
        checkIn:item.horaEntrada,
        checkOut:item.horaSalida
      };    
      return [{...data}];      
    });
    var xlsxData = {
      fieldSeparator: ',',
      quoteStrings: '"',
      decimalseparator: '.',
      showLabels: true,
      showTitle: true,
      title: 'Lista de '+ this.title,
      useBom: true,
      noDownload: false,
      headers: ["userUuid", "Nombre","Telefono","avatar" , 
          "Complejo","Hora Entrada", "Hora Salida"]
    };
    new ngxCsv(this.selectedItems, "Lista de "+ this.title, xlsxData);
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
