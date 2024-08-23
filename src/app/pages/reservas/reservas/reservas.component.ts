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
import { Reserva } from 'src/app/core/models/reserva.models';
import { Pago } from 'src/app/core/models/pago.model';
import { PagoService } from 'src/app/core/services/api/pago.service';

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
    private pagoService: PagoService,
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
  // showModal(content: any, data: any) {
  deleteModal(content: any, data: any) {
    console.log(content,data)
    this.dataSelected = data;
    // this.modalService.open(content, { centered: true });
  }
 
  selectedItems:any[] =[];
  getSeleccionados(items: any[]) {
    // console.log(items)
    items.length > 0 ? (document.getElementById("remove-actions") as HTMLElement).style.display = "block" : (document.getElementById("remove-actions") as HTMLElement).style.display = "none";
    this.selectedItems = items;
  } 

  consultModal(content: any, data: any) {
    this.consultData(data)
    this.modalService.open(content, { centered: true });
  }

  checkedMultiple(content:any) {
    var result
    if(this.selectedItems){
      this.selectedItems.forEach((item:any) => {
        this.consultData(item)
      });
    }
    else {
      Swal.fire({ text: 'Porfavor seleccione almenos un checkbox', confirmButtonColor: '#299cdb', });
    }
    this.modalService.open(content, { centered: true });
  }

  pago!:any
  consultData(data: any) {
    let text: string = '';
    if (data) {
      const nroTasa = data.numeroTasa;
      this.ruatService.consultaPagoTasa(nroTasa).subscribe({
        next: (resp: any) => {
          if (resp['status'] === 'OK') {
            console.log(resp.payload)
            if(resp.payload.continuarFlujo){
              text = resp.payload.observacion;              
              this.pago= resp.payload.pagoTasa
              data.estadoReserva = 'Pagado';
              this.updateData(data);
              this.registerPago(resp.payload.pagoTasa, data);
            }
          } else {
            text = resp.payload;
          }
          // this.modelTitle('Se realizo la Consulta!', text, 'success')
          this.dataSelected = '';
          // this.modalService.dismissAll('close click');
        },
        error: (error) => {
          console.error('Error:', error);
          text = 'Error al realizar la consulta';
          this.modelTitle('Error!', text, 'error')
        },
      });
    } else {
      text = 'No se pudo obtener el dato seleccionado';
      this.modelTitle('Error!', text, 'error')
    }
  }
  /**
   * Confirm sweet alert
   * @param confirm modal content
   */
  modelTitle(title:string,text:string,tipo:any) {
    let timerInterval: any;
    let html=text
    if(this.pago){
      html=
        '<b>Fecha de Pago:</b>'+this.pago.fechaPago+', <br/>' +
        '<b>Nro Tasa:</b>'+this.pago.numeroTasa+', <br/>' +
        '<b>Monto Pagado:</b>'+this.pago.montoPago+', <br/>' +
        '<b>Forma de Pago:</b>'+this.pago.formaPago+', <br/>' +
        '<b>Entidad Financiera:</b>'+this.pago.entidadFinanciera+', <br/>' +
        '<b>Observacion:</b>'+this.pago.observacion+', <br/>'
    };

    Swal.fire({
      title: title,
      text: text,
      icon: tipo,
    //   showCancelButton: true,
    //   confirmButtonColor: '#364574',
    //   cancelButtonColor: 'rgb(243, 78, 78)',
    //   confirmButtonText: 'Yes, delete it!'
    // }).then(result => {
    //   if (result.value) {
    //     Swal.fire({title: 'Deleted!', text:'Your file has been deleted.', confirmButtonColor: '#364574',icon: 'success',});
    //   }
    // });
  
      // title: '<strong>HTML <u>example</u></strong>',
      // icon: 'info',
      html:html,
      showCloseButton: true,
      showCancelButton: false,
      focusConfirm: false,
      // confirmButtonText: '<i class="fa fa-thumbs-up"></i> Great!',
      // confirmButtonAriaLabel: 'Thumbs up, great!',
      // cancelButtonAriaLabel: 'Thumbs down',
      // confirmButtonColor: 'rgb(71, 189, 154)',
      // cancelButtonColor: 'rgb(243, 78, 78)',
      // confirmButtonColor: '#d33',
        confirmButtonColor: '#364574',
        timerProgressBar: true,
        willClose: () => {
          clearInterval(timerInterval);
        },
    });
  }
  annularData(data: any) {    
    const requestData = {
        numeroTasa : data.numeroTasa,
        motivo:"A SOLICITUD DEL CONTRIBUYENTE",
        observacion: "data.observaciones"
      }
    let text: string = '';
    if (data) {
      this.ruatService.cancelTasa(requestData).subscribe({
        next: (resp: any) => {
          if (resp['status'] === 'OK') {
            text = resp.payload['mensaje'];
            data.estadoReserva = 'Anulado'
            // this.reservasService.update(data).subscribe()
            this.updateData(data)
          } else {
            text = resp.payload;
            this.updateData(data)
          }
          let timerInterval: any;
          Swal.fire({
            title: 'Anulado!',
            // text: 'Se Anulo la reserva',
            text: text,
            icon: 'success',
            confirmButtonColor: '#299cdb',
            timer: 5000,
            timerProgressBar: true,
            willClose: () => {
              clearInterval(timerInterval);
            },
          });
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
  
  updateData(data:Reserva, ) {
    this.reservasService.update(data).subscribe({
        next: (resp: Reserva) => {
          console.log("is updated",resp)
        },
        error: (error) => {
        }
    })
  }

  registerPago(pago:any, reserva: any) {
    const [day, month, year] = pago.fechaPago.split('/');
    let datos: any = {      
      fechaPago: `${year}-${month}-${day}`,//pago.fechaPago,
      montoPago: pago.montoPago,
      nroTasa: pago.numeroTasa,
      estadoPago:'pagado',
      // numeroTasa: string;//"21987", 
      entidadFinanciera: pago.entidadFinanciera,//"BANCO SOLIDARIO S.A.-COCHABAMBA-QUILLACOLLO"
      folio: pago.folio,//"2870093262146", 
      formaPago: pago.formaPago,//"PAGO ORIGINAL TOTAL",
      observacion: pago.observacion,//"CONSOLIDADO"
      reservasDto: reserva ,
    };
    this.pagoService.save(datos).subscribe({
      next: (resp: any) => {
        console.log("is updated", resp)
      },
      error: (error) => {
      }
    })
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
