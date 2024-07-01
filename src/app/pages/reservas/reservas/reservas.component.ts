import { DecimalPipe } from '@angular/common';
import { Component, OnInit, QueryList, ViewChildren } from '@angular/core';
import { NgbModal, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import { Observable } from 'rxjs';
import { UntypedFormBuilder, Validators, UntypedFormGroup, UntypedFormArray, AbstractControl } from '@angular/forms';

// Sweet Alert
import Swal from 'sweetalert2';
import { RootReducerState } from 'src/app/store';
import { Store } from '@ngrx/store';
import { addApplication, deleteApplication, fetchApplicationData, updateApplication } from 'src/app/store/Jobs/jobs_action';
import { selectJobsData, selectJobsLoading } from 'src/app/store/Jobs/jobs_selector';
import { cloneDeep } from 'lodash';
import { PaginationService } from 'src/app/core/services/pagination.service';
import { application } from 'src/app/core/data';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-reservas',
  templateUrl: './reservas.component.html',
  styleUrls: ['./reservas.component.scss']
})
export class ReservasComponent implements OnInit {

  title='Reservas';
  // bread crumb items
  breadCrumbItems!: Array<{}>;
  applications: any ;
  masterSelected!: boolean;
  // Form
  applicationData!: UntypedFormGroup;
  submitted = false;
  allapplications: any;
  searchTerm: any;
  searchResults: any;
  date: any;
  status: any = '';
  type: any = '';


  usuariosList:any[]=[];
  funcionarioSelected!:any;
  
  canActivate:string[];
  listaItems:any[]=[];
  reservasList:any[]=[];
  temp:any[]=[];

  constructor(public service: PaginationService,
    public formBuilder: UntypedFormBuilder,
    private authService: AuthenticationService,
    private reservasService: ReservaService,
    private store: Store<{ data: RootReducerState }>,
    public modalService: NgbModal) {
      this.canActivate = this.authService.hasPermissionModulo(this.title);
  }

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: '' },
      { label: this.title, active: true }
    ];

    this.listaItems = [
      {name: 'Codigo', prop: 'codigo'},
      {name: 'Fecha',prop: 'fechaReserva', date:true},
      {name: 'Contribuyente', prop: 'contribuyenteDto.nombre'},
      {name: 'Cancha',prop: 'canchasDto.nombre'},
      {name: 'Hora',prop: 'horaEntrada'},
      {name: 'Estado', prop: 'estado', tag:true},
    ];
    this.getReservas();

    
  }


  // Filter
  statusFilter() {
    if (this.status != '') {
      this.applications = this.allapplications.filter((app: any) => {
        return app.status === this.status;
      });
    } else {
      this.applications = this.service.changePage(this.allapplications,8)
    }
  }

  typeFilter() {
    if (this.type != '') {
      this.applications = this.allapplications.filter((app: any) => {
        return app.type === this.type;
      });
    } else {
      this.applications = this.service.changePage(this.allapplications,8)
    }
  }

  // Search Data
  performSearch(): void {
    this.searchResults = this.allapplications.filter((item: any) => {
      return (
        item.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    });
    this.applications = this.service.changePage(this.searchResults,8)
  }

  onNavChange(changeEvent: NgbNavChangeEvent) {

    if (changeEvent.nextId === 1) {
      this.reservasList = this.temp;
      // this.applications = this.service.changePage(this.allapplications,8)
    }
    if (changeEvent.nextId === 2) {
      this.reservasList = this.temp.filter((item:any) => item.status == 'Nuevo');
    }
    if (changeEvent.nextId === 3) {
      this.reservasList = this.temp.filter((item:any) => item.status == 'Pending');
    }
    if (changeEvent.nextId === 4) {
      this.reservasList = this.temp.filter((item:any) => item.status == 'Vencido');
    }
    if (changeEvent.nextId === 5) {
      this.reservasList = this.temp.filter((item:any) => item.status == 'Rechazado');
    }
  }

  // activeFilter='';
  // selectedState: string = '';
  // applyFilterStatus(selectedState: string): void {
  //   this.activeFilter = selectedState;
  //   if (selectedState === '') {
  //     this.reservasList = this.temp;
  //   } else {
  //     const filteredDataList = this.temp.filter(item => {
  //       return (
  //         item.estadoContrato === selectedState 
  //       );
  //     });
  //     this.reservasList= filteredDataList
  //   }
  // } 

  // Open add Model
  // openModel(content: any) {
  //   this.modalService.open(content, { size: 'md', centered: true });
  // }
  public openModel(content: any | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalComponent, {
        backdrop: 'static',
        size:size
    });
    modalRef.componentInstance.row = content;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.listaItems.subscribe(() => {
      this.getReservas();
    });
  }


  /**
   * Delete Model Open
   */
  deleteId: any;
  confirm(content: any, id: any) {
    this.deleteId = id;
    this.modalService.open(content, { centered: true });
  }

  // Delete Data
  deleteData(id: any) {
    if (id) {
      this.store.dispatch(deleteApplication({ id: this.deleteId.toString() }));
    } else {
      // this.store.dispatch(deleteApplication({ id: this.checkedValGet.toString() }));
    }
    this.masterSelected = false;
    this.deleteId = '';
    this.modalService.dismissAll('close click')
    let timerInterval: any;
    Swal.fire({
      title: 'Deleted!',
      text: 'Your data has been deleted.',
      icon: 'success',
      confirmButtonColor: '#299cdb',
      timer: 2000,
      timerProgressBar: true,
      willClose: () => {
        clearInterval(timerInterval);
      },
    });
  }

  /* API Services */
  loading: boolean = true;
  private getReservas() {
    this.reservasService.getAll().subscribe({
      next: (data: any) => {
        this.loading = false;
        if (data['status'] === 'OK') {
          this.reservasList = data.payload;
          this.temp = data.payload;
        } else {
          Swal.fire({ text: data.status, confirmButtonColor: '#299cdb' });
        }
      },
      error: (error) => {
        this.loading = false;
      }
    });
  }

}
