import { DecimalPipe } from '@angular/common';
import { Component, OnInit, QueryList, ViewChildren } from '@angular/core';
import { NgbModal, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import { Observable } from 'rxjs';
import { UntypedFormBuilder, Validators, UntypedFormGroup, UntypedFormArray, AbstractControl } from '@angular/forms';

// Sweet Alert
import Swal from 'sweetalert2';
import { PaginationService } from 'src/app/core/services/pagination.service';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { ModalComponent } from '../modal/modal.component';
import { ngxCsv } from 'ngx-csv';

@Component({
  selector: 'app-reservas',
  templateUrl: './reservas.component.html',
  styleUrls: ['./reservas.component.scss']
})
export class ReservasComponent implements OnInit {

  breadCrumbItems!: Array<{}>;
  title='Reservas';
  canActivate:string[];
  listaItems:any[]=[];

  reservasList:any[]=[];
  temp:any[]=[];

  applications: any ;
  masterSelected!: boolean;
  allapplications: any;
  searchTerm: any;
  searchResults: any;
  date: any;
  status: any = '';
  type: any = '';
  

  constructor(public service: PaginationService,
    public formBuilder: UntypedFormBuilder,
    private authService: AuthenticationService,
    private reservasService: ReservaService,
    public modalService: NgbModal) {
      this.canActivate = this.authService.hasPermissionModulo(this.title);
  }

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: '' },
      { label: this.title, active: true }
    ];
    this.listaItems = [
      {name: 'Complejo  ',prop: 'canchasDto.complejoDto.nombre'},
      {name: 'Contribuyente', prop: 'contribuyenteDto.nombre'},
      {name: 'Fecha Reserva',prop: 'fechaReserva', date:true},
      {name: 'Hora',prop: 'horaEntrada'},
      // {name: 'Estado', prop: 'estado', tag:true},
    ];
    this.getReservas();    
  }

  public openModal(content: any | undefined, accion: string, size: string) {
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
      // this.store.dispatch(deleteApplication({ id: this.deleteId.toString() }));
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

  
  // Csv File Export
  csvFileExport() {
    var data = {
      fieldSeparator: ',',
      quoteStrings: '"',
      decimalseparator: '.',
      showLabels: true,
      showTitle: true,
      title: 'Lista de Reservas',
      useBom: true,
      noDownload: false,
      headers: ["uuid", "Fecha Reserva","Desde","Hasta", "Total Pago", "Categoria", "Superficie","Total Personas","","Cancha","Contribuyente","Celular", "Email", "Tipo Contribuyente", "Codigo Contribuyente", "Estado Civil", "Fecha Nacimiento","Estado Usuario"]
    };
    new ngxCsv(this.reservasList, "Reservas", data);
  }

}
