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
import { RuatRequestsService } from 'src/app/core/services/ruat/ruatRequest.service';

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
  dataSelected ='';

  searchTerm: any;
  searchResults: any;
  date: any;
  status: any = '';
  type: any = '';
  

  constructor(public service: PaginationService,
    public formBuilder: UntypedFormBuilder,
    private authService: AuthenticationService,
    private reservasService: ReservaService,
    private ruatService: RuatRequestsService,
    public modalService: NgbModal) {
      this.canActivate = this.authService.hasPermission(this.title);
  }

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: '' },
      { label: this.title, active: true }
    ];
    this.listaItems = [
      {name: 'Complejo  ',prop: 'canchasDto.complejoDto.nombre'},
      // {name: 'Contribuyente', prop: 'contribuyenteDto.nombre'},
      {name: 'Superficie', prop: 'superficie'},
      {name: 'Fecha Reserva',prop: 'fechaReserva', date:true},
      {name: 'Estado', prop: 'estadoReserva', tag:true},
      {name: 'Hora',prop: 'horaEntrada'},
    ];
    
    this.authRuat();    
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

  showModal(content: any, data: any) {
    // this.checkedValGet.push(data.uuid);
    this.dataSelected = data;
    this.modalService.open(content, { centered: true });
  }

  // Filter
  statusFilter() {
    if (this.status != '') {
      this.reservasList = this.temp.filter((app: any) => {
        return app.status === this.status;
      });
    } else {
      this.reservasList = this.service.changePage(this.temp,8)
    }
  }

  typeFilter() {
    if (this.type != '') {
      this.reservasList = this.temp.filter((app: any) => {
        return app.type === this.type;
      });
    } else {
      this.reservasList = this.service.changePage(this.temp,8)
    }
  }

  // Search Data
  performSearch(): void {
    this.searchResults = this.temp.filter((item: any) => {
      return (
        item.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    });
    this.reservasList = this.service.changePage(this.searchResults,8)
  }

  onNavChange(changeEvent: NgbNavChangeEvent) {

    if (changeEvent.nextId === 1) {
      this.reservasList = this.temp;
      // this.reservasList = this.service.changePage(this.temp,8)
    }
    if (changeEvent.nextId === 2) {
      this.reservasList = this.temp.filter((item:any) => item.estadoReserva == 'Pendiente');
    }
    if (changeEvent.nextId === 3) {
      this.reservasList = this.temp.filter((item:any) => item.estadoReserva == 'Pagado');
    }
    if (changeEvent.nextId === 4) {
      this.reservasList = this.temp.filter((item:any) => item.estadoReserva == 'Vencido');
    }
    if (changeEvent.nextId === 5) {
      this.reservasList = this.temp.filter((item:any) => item.estadoReserva == 'Anulado');
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
  confirm(content: any, id: any) {
    console.log(id)
    // this.bookId = id;
    this.modalService.open(content, { centered: true });
  }

  // Delete Data
  annularData(data: any) {
    console.log(data)
    if (data) {
      // this.store.dispatch(deleteApplication({ id: this.deleteId.toString() }));
    } else {
      // this.store.dispatch(deleteApplication({ id: this.checkedValGet.toString() }));
    }
    this.dataSelected = '';
    this.modalService.dismissAll('close click')
    let timerInterval: any;
    Swal.fire({
      title: 'Anulado!',
      text: 'Se Anulo la reserva',
      icon: 'success',
      confirmButtonColor: '#299cdb',
      timer: 3000,
      timerProgressBar: true,
      willClose: () => {
        clearInterval(timerInterval);
      },
    });
  }
  consultData(data: any) {
    let text: string = '';
    if (data) {
      const nroTasa = data.numeroTasa;
      this.ruatService.consultaPagoTasa(nroTasa).subscribe({
        next: (resp: any) => {
          if (resp['status'] === 'OK') {
            text = resp.payload['mensaje'];
          } else {
            console.log(resp.payload);
            text = resp.payload;
          }
  
          // Move Swal.fire here to ensure the text is updated
          let timerInterval: any;
          Swal.fire({
            title: 'Se realizo la Consulta!',
            text: text,
            icon: 'success',
            confirmButtonColor: '#299cdb',
            timer: 5000,
            timerProgressBar: true,
            willClose: () => {
              clearInterval(timerInterval);
            },
          });
  
          // Optionally clear the selected data and close the modal
          this.dataSelected = '';
          this.modalService.dismissAll('close click');
        },
        error: (error) => {
          console.error('Error:', error);
          text = 'Error al realizar la consulta';
          Swal.fire({
            title: 'Error!',
            text: text,
            icon: 'error',
            confirmButtonColor: '#d33',
          });
        },
      });
    } else {
      text = 'No se pudo obtener el dato seleccionado';
      Swal.fire({
        title: 'Error!',
        text: text,
        icon: 'error',
        confirmButtonColor: '#d33',
      });
    }
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
  /* API RUAT Services */
  private authRuat() {
    this.ruatService.authenticate().subscribe({
      next: (response) => {          
        window.sessionStorage.setItem('ruatToken', response.token);
      },
      error: (error) => {
        // this.notify("Falla en la coneccion con el RUAT, porfavor intente mas tarde",'error')
      }
    });
}
}
