import { Component, QueryList, ViewChildren, OnInit, ViewChild, ElementRef } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DatePipe } from '@angular/common';
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { UserService } from 'src/app/core/services/api-users/users.service';
import { UserRole } from 'src/app/core/constants/UserData';
import { EncargadoService } from 'src/app/core/services/api/encargado.service';
import { EncargadoComplejo } from 'src/app/core/models/encargadoComplejo.model';
import { FacilitiesService } from 'src/app/core/services/api/facilities.service';
import { ModalEmployeeComponent } from '../../modals/employee/modal-employee/modal-employee.component';
import { ModalImportComponent } from '../../modals/employee/modal-import/modal-import.component';
import { CsvColumn } from 'src/app/shared/data-header/data-header.component';
import { BreadCrumbItem } from 'src/app/shared/breadcrumbs/breadcrumbs.component';

@Component({
  selector: 'app-employees',
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.scss']
})

export class EmployeesComponent implements OnInit {
  breadCrumbItems: BreadCrumbItem[] =[];
  viewMode: 'table' | 'cards' = 'table';
  canActivate: string[];
  itemsList: any[] = [];
  temp: EncargadoComplejo[] = [];

  submitted = false;

  userRol = UserRole;
  userList: any;
  employeesList: EncargadoComplejo[] = [];
  funcionarioSelected!: any;
  complejosList: any[] = [];
  selectedItems: any[] = [];
  readonly CSV_COLUMNS: CsvColumn<EncargadoComplejo>[] = [
    { header: 'Nombre', value: item => item.nombre || '-' },
    { header: 'Telefono', value: item => item.telefono || '-' },
    { header: 'Activo', value: item => item.activo ? 'Activo' : 'Inactivo' },
    { header: 'Fecha Asignación', value: item => this.formatDate(item.fechaAsignacion) || '-' },
    { header: 'Fecha Fin', value: item => this.formatDate(item.fechaFinAsignacion) || '-' },
    { header: 'Hora Entrada', value: item => item.horaEntrada || '-' },
    { header: 'Hora Salida', value: item => item.horaSalida || '-' },
    { header: 'Complejo', value: item => item.complejoDto?.nombre || '-' },
  ];

  @ViewChild('viewModel') viewModel!: ElementRef;

  constructor(
    private modalService: NgbModal,
    private authService: AuthenticationService,
    private usersService: UserService,
    private employeesService: EncargadoService,
    private complejosService: FacilitiesService,
    private datePipe: DatePipe
  ) {
    this.canActivate = this.authService.hasPermission('/admin/employees');
  }

  ngOnInit(): void {
    const savedViewMode = localStorage.getItem('dataTableViewMode');
    if (savedViewMode === 'table' || savedViewMode === 'cards') {
      this.viewMode = savedViewMode;
    }
    this.breadCrumbItems = [
      { label: 'Administración' },
      { label: 'Encargado', active: true }
    ];
    this.itemsList = [
      { name: 'Nombre', prop: 'nombre', avatar: true, visible: true },
      { name: 'Complejo', prop: 'complejoDto.nombre', visible: true },
      { name: 'Telefono', prop: 'telefono', visible: true },
      { name: 'Activo', prop: 'activo', visible: true , tag:true},
      { name: 'Fecha Asignación', prop: 'fechaAsignacion', visible: false },
      { name: 'Fecha Fin', prop: 'fechaFinAsignacion', visible: false },
      { name: 'Hora Entrada', prop: 'horaEntrada', visible: false },
      { name: 'Hora Salida', prop: 'horaSalida', visible: false },
    ];
    this.loadData();
  }
  
  loading: boolean = true;
  private async loadData() {
    await this.getUsers();
    await this.getFacilities();
    await this.getEmployees();
  }

  getSelectedItems(items: any) {
    this.selectedItems = items;
  }
  toggleColumn(column: any) {
      column.visible = !column.visible;
  }
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'cards' : 'table';
    localStorage.setItem('dataTableViewMode', this.viewMode);
  }
  
  searchTerm = '';
  performSearch(): void {
    const normalize = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    const term = normalize(this.searchTerm);
    this.employeesList = this.temp.filter((item: any) => ['activo', 'inactivo'].includes(term) ? item.activo === (term === 'activo') :
      !term || [item.nombre, item.telefono, item.complejoDto?.nombre].some(value => normalize(value).includes(term)));
  }

  /**
   * View Data Get
   */
  viewDataGet(data: any) {
    this.funcionarioSelected = data;    
    const element = this.viewModel.nativeElement;
    const elementTop = element.getBoundingClientRect().top + window.scrollY;
    const middleOffset = elementTop - (window.innerHeight / 2) + (element.offsetHeight / 2);    
    window.scrollTo({ top: middleOffset, behavior: 'smooth' });
  }  

  /**
   * Open modal
   */
  public openModal(row: any, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalEmployeeComponent, {
      backdrop: 'static',
      size: size
    });
    modalRef.componentInstance.row = row;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.complejosList = this.complejosList;
    modalRef.componentInstance.usersList = this.userList;
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

  headersImport = ['Nombre', 'Telefono', 'Complejo', 'Activo', 'Fecha Asignación', 'Fecha Fin', 'Hora Entrada', 'Hora Salida'];
  public openModalImport() {
    const camposImport = [
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
    modalRef.componentInstance.titles = camposImport;
    modalRef.componentInstance.itemsList = this.employeesList;
    modalRef.componentInstance.itemsList.subscribe(() => {
        this.getEmployees();
    });
  }

  formatDate(date: any): string {
    if (!date) return '';
    const dateObj = new Date(date);
    return this.datePipe.transform(dateObj, 'yyyy-MM-dd') || '';
  }

  /* API Services */
  private getUsers() {
    this.usersService.getAllUsers().subscribe((data) => {
      this.userList = data;
    });
  }

  private getFacilities() {
    this.complejosService.getAll().subscribe({
      next: (data: any) => {
        this.complejosList = data;
      }
    });
  }

  private getEmployees(): void {
    this.loading = true;
    this.employeesService.getAll().subscribe({
      next: (data: any) => {
        this.loading = false;
        this.employeesList = data
        this.temp = this.employeesList;
        if (this.employeesList.length > 0) {
          this.funcionarioSelected = this.employeesList[0];
        }
      },
      error: () => {
        this.loading = false;
        this.notify('No se pudo recuperar los registros', 'error');
      }
    });
  }

  deleteData() {
    let uuid = this.deleteId;
    this.employeesService.delete(uuid).subscribe({
      next: (message: string) => {
        this.submitted = false;
        this.loadData();
        this.notify(message || 'Encargado eliminado exitosamente', 'success');
        this.modalService.dismissAll();
      },
      error: err => {
        this.submitted = false;
        this.notify('No se pudo anular el registro!', 'error');
      }
    });
  }
   
  private getAvatar(employee: any): string {
    let avatar = 'default-avatar.png';
    const user = this.userList?.find((user: any) => user.uuid === employee.userUuid);
    const foundItem = this.userRol.find(item => item.tipo === 1);
    
    if (foundItem) {
      avatar = foundItem.avatarM;
      if (user && user.designacionFuncionarioDto?.personaDto?.sexo === 'F') {
        avatar = foundItem.avatarF;
      }
    }
    return avatar;
  }

  private notify(message: string, type: any): void {
    Swal.fire({
      title: message,
      icon: type,
      timer: 3000,
      timerProgressBar: true,
    });
  }
}
