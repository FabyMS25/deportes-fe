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
import { restApiService } from "../../../core/services/rest-api.service";
import { GlobalComponent } from '../../../global-component';

// Sweet Alert
import Swal from 'sweetalert2';

import { Store } from '@ngrx/store';
import { RootReducerState } from 'src/app/store';
// import { addContact, deleteContact, fetchCrmContactData, updateContact } from 'src/app/store/CRM/crm_action';
// import { selectCRMLoading, selectContactData } from 'src/app/store/CRM/crm_selector';
import { cloneDeep } from 'lodash';
import { PaginationService } from 'src/app/core/services/pagination.service';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { Employees } from 'src/app/core/data/employees';
import { EncargadoCanchaService } from 'src/app/core/services/api/encargado-cancha.service';
import { ModalEmployeeComponent } from './modal/modalEmployee.component';
import { UserService } from 'src/app/core/services/api-users/users.service';
import { UserRol } from 'src/app/core/constants/UserRol';

@Component({
  selector: 'app-employees',
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.scss']
})

/**
 * Contacts Component
 */
export class EmployeesComponent implements OnInit {

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
    private employeesService: EncargadoCanchaService,

    public service: PaginationService,
    private formBuilder: UntypedFormBuilder,
    private store: Store<{ data: RootReducerState }>,
    private datePipe: DatePipe) {
      this.canActivate = this.authService.hasPermissionModulo('Empleados');
  }

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'Administración' },
      { label: 'Empleados', active: true }
    ];
    this.listaItems = [
      {name: 'Nombre', prop: 'nombreCompleto', avatar:true},
      {name: 'Cancha',prop: 'canchasDto.nombre'},
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

  // The master checkbox will check/ uncheck all items
  checkUncheckAll(ev: any) {
    this.employeesList.forEach((x: { state: any; }) => x.state = ev.target.checked)
    var checkedVal: any[] = [];
    var result
    for (var i = 0; i < this.employeesList.length; i++) {
      if (this.employeesList[i].state == true) {
        result = this.employeesList[i];
        checkedVal.push(result);
      }
    }
    this.checkedValGet = checkedVal
    checkedVal.length > 0 ? (document.getElementById("remove-actions") as HTMLElement).style.display = "block" : (document.getElementById("remove-actions") as HTMLElement).style.display = "none";

  }
  isAllChecked() {
    return this.employeesList.every((_: { state: any; }) => _.state);
  }

  /**
  * Multiple Default Select2
  */
  selectValue = ['Lead', 'Partner', 'Exiting', 'Long-term'];

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
      headers: ["uuid", "userUuid", "Hora Entrado", "Hora Salida","Telefono", "Estado", "Cancha", "Nombre Completo","avatar"]
    };
    new ngxCsv(this.employeesList, "Encargados", orders);
  }

  // Select Checkbox value Get
  onCheckboxChange(e: any) {
    const checkArray: UntypedFormArray = this.contentForm.get('subItem') as UntypedFormArray;
    checkArray.push(new UntypedFormControl(e.target.value));
    var checkedVal: any[] = [];
    var result
    for (var i = 0; i < this.employeesList.length; i++) {
      if (this.employeesList[i].state == true) {
        result = this.employeesList[i];
        checkedVal.push(result);
      }
    }
    this.checkedValGet = checkedVal
    checkedVal.length > 0 ? (document.getElementById("remove-actions") as HTMLElement).style.display = "block" : (document.getElementById("remove-actions") as HTMLElement).style.display = "none";
  }

  /**
   * Confirmation mail model
   */
  deleteId: any;
  confirm(content: any, id: any) {
    this.deleteId = id;
    this.modalService.open(content, { centered: true });
  }

  // Delete Data
  deleteData(id: any) {
    if (id) {
      // this.store.dispatch(deleteContact({ id: this.deleteId.toString() }));
    } else {
      // this.store.dispatch(deleteContact({ id: this.checkedValGet.toString() }));
    }
    this.deleteId = '';
    this.masterSelected = false;
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
    }
    else {
      Swal.fire({ text: 'Please select at least one checkbox', confirmButtonColor: '#299cdb', });
    }
    this.checkedValGet = checkedVal;
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
              nombreCompleto: this.getFullName(employee),
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
