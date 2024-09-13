import { Component, OnInit, QueryList, ViewChildren } from '@angular/core';
import { UntypedFormBuilder, Validators, UntypedFormGroup, UntypedFormArray, AbstractControl } from '@angular/forms';
import { NgbModal, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { ngxCsv } from 'ngx-csv';

import { PaginationService } from 'src/app/core/services/pagination.service';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { RuatRequestsService } from 'src/app/core/services/ruat/ruatRequest.service';
import { PagoService } from 'src/app/core/services/api/pago.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { ModalComponent } from '../modal/modal.component';
import { Reserva } from 'src/app/core/models/reserva.models';

@Component({
  selector: 'app-reservations',
  templateUrl: './reservations.component.html',
  styleUrls: ['./reservations.component.scss']
})
export class ReservationsComponent implements OnInit {

  breadCrumbItems!: Array<{}>;
  title='Reservas';
  canActivate:string[];
  listaItems:any[]=[];

  reservasList:any[]=[];
  temp:any[]=[];
  categoryList:any[]=[];
  dataSelected!:any;
  contribuyente!:any;

  constructor(public service: PaginationService,
    public formBuilder: UntypedFormBuilder,
    private authService: AuthenticationService,
    private reservasService: ReservaService,
    private pagoService: PagoService,
    private categoriesService: CategoriasService,
    private ruatService: RuatRequestsService,
    public modalService: NgbModal) {
      this.canActivate = this.authService.hasPermission(this.title);
  }

  async ngOnInit() {
    
    if (window.sessionStorage.getItem("auth-token") === 'isContribuyente') {
      const currentUser = window.sessionStorage.getItem("currentUser");
      this.contribuyente = currentUser ? JSON.parse(currentUser) : null;
    }  
    await this.getReservations();
    await this.getCategories();
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
    setInterval(() => this.getReservations(), 5 * 60 * 1000);// checks periodically (e.g., every 5 minutes)
  }

  // Search filter
  searchResults: any;
  searchTerm: string = '';
  date!: { from: Date, to: Date };
  status: string = '';
  category: string = '';
  applyFilters() {
    this.reservasList = this.temp.filter(item => {
      // Search term filter
      const searchMatch = !this.searchTerm || 
        Object.values(item).some((val:any) => 
          val.toString().toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        item.canchasDto.complejoDto.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.contribuyenteDto.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.contribuyenteDto.apPaterno.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.contribuyenteDto.apMaterno.toLowerCase().includes(this.searchTerm.toLowerCase());

      //date filter
      let dateMatch = true;
      if (this.date && this.date.from && this.date.to) {
        const itemDate = new Date(item.fechaReserva);
        const fromDate = new Date(this.date.from);
        const toDate = new Date(this.date.to);
        itemDate.setHours(0, 0, 0, 0);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(0, 0, 0, 0);
        dateMatch = itemDate >= fromDate && itemDate <= toDate;
      }

      // Status filter
      const statusMatch = !this.status || item.estadoReserva === this.status;
      
      // category filter
      const categoryMatch = !this.category || 
      item.canchasDto.tarifasDtoList.some((tarifa: any) => 
        tarifa.categoriaDtoList.some((cat: any) => 
          cat.categoriaDto.nombre === this.category
        )
      );

      return searchMatch && dateMatch && statusMatch && categoryMatch;
    });
  }
 
  performSearch(): void {
    this.searchResults = this.temp.filter((item: any) => {
      return ( 
        Object.values(item).some((val:any) => 
          val.toString().toLowerCase().includes(this.searchTerm.toLowerCase())) ||
          item.canchasDto.complejoDto.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          item.contribuyenteDto.nombre.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    });
    this.reservasList = this.service.changePage(this.searchResults,8)
  }

  onNavChange(changeEvent: NgbNavChangeEvent) {
    if (changeEvent.nextId === 1) {
      this.reservasList = this.temp;
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

  selectedItems: any[] = [];
  consultResults: any[] = [];
  getSeleccionados(items: any[]) {
    const removeActions = document.getElementById("remove-actions") as HTMLElement;
    removeActions.style.display = items.length > 0 ? "block" : "none";
    this.selectedItems = items;
  }

  public openModal(content: any | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalComponent, {
        backdrop: 'static',
        size:size
    });
    modalRef.componentInstance.row = content;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getReservations();
    });
  }
  
  deleteModal(content: any, data: any) {
    this.motivo ='';
    this.dataSelected = data;
    this.modalService.open(content, { centered: true });
  } 

  async consultModal(content: any, data: any) {
    if (this.selectedItems.length === 0) {
      this.selectedItems.push(data);
    }  
    this.consultResults = [];  
    for (const item of this.selectedItems) {
      const result = await this.consultData(item);
      this.consultResults.push(result);
    }    
    this.modalService.open(content, { centered: true });
    this.selectedItems = [];
    this.getReservations();
  }

  async consultData(item: any): Promise<any> {
    if (!item) {
      return { item, text: 'No se pudo obtener el dato seleccionado', type: 'warning' };
    }  
    try {
      const nroTasa = item.numeroTasa;
      const resp: any = await this.ruatService.consultaPagoTasa(nroTasa).toPromise();
  
      if (resp['status'] !== 'OK') {
        return { item, text: "La Tasa y Otro Ingreso no tiene pagos", type: 'warning' };
      }
      if (!resp.payload.continuarFlujo) {
        return { item, text: resp.payload.observacion, type: 'warning' };
      }
  
      let text = resp.payload.observacion;  
      if (item.estadoReserva === 'Pendiente') {
        let pago = resp.payload.pagoTasa;
        const [day, month, year] = pago.fechaPago.split('/');
        pago.fechaPago = `${year}-${month}-${day}`;
        pago.reservasDto = item;  
        try {
          const pagoResp: any = await this.pagoService.save(pago).toPromise();
          if (pagoResp.status === 'OK') {
            item.estadoReserva = 'Pagado';
            item = await this.updateReserva(item);
            return { item, text, type:'success' };
          }
        } catch (error) {
          console.error('Error saving pago:', error);
          return { item, text: 'Error al guardar el pago', type: 'error' };
        }
      }
      return { item, text, type:'info' };
    } catch (error) {
      console.error('Error:', error);
      return { item, text: 'Error al realizar la consulta', type: 'error' };
    }
  }

  updateReserva(data: Reserva): Promise<Reserva> {
    return new Promise((resolve, reject) => {
      this.reservasService.update(data).subscribe({
        next: (resp: any) => {
          if (resp['status'] === 'OK') {
            resolve(resp.payload);
          }else{
            reject(resp.payload);
          }
          resolve(resp);
        },
        error: (error) => {
          console.error("Error updating reserva:", error);
          reject(error);
        }
      });
    });
  }
    
  motivo: string = '';
  observation: string = '';
  annularData(formValues: any) {    
    let text: string = '';
    const requestData = {
        numeroTasa: this.dataSelected.numeroTasa,  
        motivo: formValues.motivo,
        observacion: formValues.observation
    };
    if (formValues) {
        this.ruatService.cancelTasa(requestData).subscribe({
          next: (resp: any) => {
            if (resp['status'] === 'OK') {
              text = resp.payload['mensaje'];
              this.dataSelected.estadoReserva = 'Anulado'
              this.reservasService.update(this.dataSelected).subscribe()
              // this.updateReserva(this.dataSelected)
            } else {
              text = resp.payload;
              // this.updateReserva(this.dataSelected)
            }
            let timerInterval: any;
            Swal.fire({
              title: 'Anulado!',
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

    
    

  private async checkAndUpdateExpiredReservas(reservas: Reserva[]): Promise<Reserva[]> {
    const updatedReservas: Reserva[] = [];  
    for (const reserva of reservas) {
      if (this.isReservaExpired(reserva) && reserva.estadoReserva === 'Pendiente') {
        reserva.estadoReserva = 'Vencido';
        try {
          const requestData = {
              numeroTasa : reserva.numeroTasa,
              motivo:"NO SE EFECTUO EL PAGO EN EL DIA DE REGISTRO",
              observacion: "ANULADO AUTOMATICO, VENCIDO PLAZO DE RESERVA"
            }
          await this.ruatService.cancelTasa(requestData).toPromise();
          const updatedReserva = await this.reservasService.update(reserva).toPromise();
          if (updatedReserva) {
            updatedReservas.push(updatedReserva);
          } else {
            updatedReservas.push(reserva); 
          }
        } catch (error) {
          console.error('Error updating expired reserva:', error);
          updatedReservas.push(reserva); 
        }
      } else {
        updatedReservas.push(reserva);
      }
    }  
    return updatedReservas;
  }

  private isReservaExpired(reserva: Reserva): boolean {
    const now = new Date();  
    const fechaCreated = new Date(reserva.fechaCreated);
    const fourHoursLater = new Date(fechaCreated.getTime() + 4 * 60 * 60 * 1000);
    return now > fourHoursLater;  // This line remains unchanged
  }
  
  /* API Services */
  loading: boolean = true;
  private async getReservations() {
    try {
      this.loading = true;
      const data: any = await this.reservasService.getAll().toPromise();      
      if (data['status'] === 'OK') {  
        let list: Reserva[] = data.payload;
        if(this.contribuyente){
          list = data.payload.filter((item: any) => item.contribuyenteDto.uuid === this.contribuyente.uuid);
        }      
        let employee:any = localStorage.getItem("assignaments");
        if(employee){
          employee = employee ? JSON.parse(employee) : null;
          list = data.payload.filter((item: any) => item.canchasDto.complejoDto.uuid === employee.complejoDto.uuid);
        }
        const updatedReservas = await this.checkAndUpdateExpiredReservas(list);
        this.reservasList = updatedReservas;
        this.temp = updatedReservas;
      } else {
        Swal.fire({ text: data.status, confirmButtonColor: '#299cdb' });
      }
    } catch (error) {
      console.error('Error fetching reservas:', error);
      Swal.fire({ text: 'Error al obtener las reservas', icon: 'error', confirmButtonColor: '#299cdb' });
    } finally {
      this.loading = false;
    }
  }
  
  private getCategories(){
    this.categoriesService.getAll().subscribe({
        next: (data: any) => {
          if (data['status'] === 'OK') {
            this.categoryList = data.payload;
          }else{
            Swal.fire({ text: data.payload, confirmButtonColor: '#299cdb'});
          }
        },
        error: (error) => {
          Swal.fire({ text: 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb' });
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
          Swal.fire({ text: 'Falla en la coneccion con el RUAT',
            title: 'Error!',icon: 'error',confirmButtonColor: '#d33'});
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
