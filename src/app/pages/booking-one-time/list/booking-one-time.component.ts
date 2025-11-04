import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import { ngxCsv } from 'ngx-csv';
import Swal from 'sweetalert2';

import { PaginationService } from 'src/app/core/services/pagination.service';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { RuatRequestsService } from 'src/app/core/services/ruat/ruatRequest.service';
import { PagoService } from 'src/app/core/services/api/pago.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { BookingOneTimeModalComponent } from '../modal/modal.component';
import { ReservaPuntualService } from 'src/app/core/services/api/reserva-puntual.service';
import { ReservaPuntual } from 'src/app/core/models/reservaPuntual.models';
import { EstadoPago, EstadoReserva, EstadoUsuario } from 'src/app/core/constants/Estados';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { ConfiguracionSistemaService } from 'src/app/core/services/api/configuracionSistema.service';
import { Reserva } from 'src/app/core/models/reserva.models';
import { TicketComponent } from '../../reports/ticket/ticket.component';
import { Categoria } from 'src/app/core/models/categoria.model';
import { Contribuyente } from 'src/app/core/models/contribuyente.models';
import { Pago } from 'src/app/core/models/pago.model';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';
@Component({
  selector: 'app-booking-one-time',
  templateUrl: './booking-one-time.component.html',
  styleUrls: ['./booking-one-time.component.scss']
})
export class BookingOneTimeComponent implements OnInit {

  breadCrumbItems!: Array<{}>;
  title = 'Reservas Puntuales';
  canActivate: string[];
  itemsList: any[] = [];
  viewMode: 'table' | 'cards' = 'table';
  userData!:any;

  loading: boolean = true;
  serverSidePagination: boolean = true;
  currentPage: number = 1;
  pageSize: number = 5;
  reservasList: any;
  temp: any[] = [];
  categoryList: Categoria[] = [];
  contribuyente!: Contribuyente;

  dataSelected!: any;

  searchResults: any;
  searchTerm: string = '';
  date!: { from: Date, to: Date };
  estadoValidacion: string = '';
  estadoReserva: string = '';
  categoria: string = '';

  systemConfigList: { [key: string]: ConfiguracionSistema } = {};
  get enableRecurrentBooking(): boolean | undefined{
    return this.systemConfigList[ClaveConfiguracion.HABILITAR_RESERVAS_RECURRENTES]?.valorBoolean ?? true;
  }
  get HorasValidacionPago(): number | undefined {
    return this.systemConfigList[ClaveConfiguracion.HORAS_VALIDACION_PAGO]?.valorNumerico;
  } 
  
  constructor(
    private authService: AuthenticationService,
    public service: PaginationService,
    public formBuilder: UntypedFormBuilder,
    private reservaPuntualService: ReservaPuntualService,
    private reservaService: ReservaService,
    private pagoService: PagoService,
    private categoriesService: CategoriasService,
    private ruatService: RuatRequestsService,
    public modalService: NgbModal,
    private router: Router,
  ) {
    this.canActivate = this.authService.hasPermission(this.title);
  }

  async ngOnInit() {
    this.breadCrumbItems = [
      { label: '' },
      { label: this.title, active: true }
    ];
    this.itemsList = [
      { name: 'Contribuyente', prop: 'reservaDto.contribuyenteDto.nombreCompleto', visible: !this.contribuyente },
      { name: 'Complejo', prop: 'reservaDto.campoDeportivoDto.complejoDto.nombre', visible: true },
      { name: 'Campo Deportivo', prop: 'reservaDto.campoDeportivoDto.nombre', visible: false },
      { name: 'Superficie', prop: 'superficie', visible: false },
      { name: 'Categoría', prop: 'categoria', visible: false , tag:true},
      { name: 'Fecha Creación', prop: 'reservaDto.fechaCreacion', date: true, visible: false },
      { name: 'Fecha Uso', prop: 'fechaUso', date: true, visible: true },
      { name: 'Hora Inicio', prop: 'horaInicio', visible: false },
      { name: 'Hora Fin', prop: 'horaFin', visible: false },
      { name: 'Duración', prop: 'duracionHoras', visible: false },
      { name: 'Cant. Personas', prop: 'cantidadPersonas', visible: false },
      { name: 'Tasa', prop: 'reservaDto.numeroTasa', visible: false },
      { name: 'Estado Validación', prop: 'reservaDto.estadoValidacion', tag: true, visible: true },
      { name: 'Estado Reserva', prop: 'reservaDto.estadoReserva', tag: true, visible: true },
      { name: 'Monto Total', prop: 'reservaDto.montoTotal', visible: false },
      { name: 'Observaciones', prop: 'observaciones', visible: false },
    ];
    const savedViewMode = localStorage.getItem('dataTableViewMode');
    if (savedViewMode === 'table' || savedViewMode === 'cards') {
      this.viewMode = savedViewMode;
    }
    this.systemConfigList = this.authService.getAllConfigs()
    const currentUser = this.authService.currentUser();
    if (this.authService.getUserRole() === 'Contribuyente') {
      this.contribuyente = currentUser;
      if (this.contribuyente.estadoUsuario !== EstadoUsuario.ACTIVO) {
        this.canActivate = ["VER"];
      }
    } else {
      this.userData = currentUser.designacion.personaDto;
    }
    
    // const expiredCount = await this.checkAllExpiredReservations();
    // console.log(expiredCount)
    // if (expiredCount > 0) {
    //   this.showExpiredReservationsMessage(expiredCount);
    // }
    this.authRuat()
    await this.getReservations();
    await this.getCategories();
    setInterval(() => this.getReservations(), 5 * 60 * 1000);
  }

  selectedItems: ReservaPuntual[] = [];
  consultResults: any[] = [];
  getSelectedItems(items: any[]) {
    this.selectedItems = items;
  }

  applyFilters() {
    if (!this.temp || this.temp.length === 0) return;
    this.reservasList = this.temp.filter(item => {
      const searchMatch = !this.searchTerm || this.searchInReserva(item, this.searchTerm);
      let dateMatch = true;
      if (this.date && this.date.from && this.date.to) {
        const itemDate = new Date(item.fechaUso);
        const fromDate = new Date(this.date.from);
        const toDate = new Date(this.date.to);
        itemDate.setHours(0, 0, 0, 0);
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(0, 0, 0, 0);
        
        dateMatch = itemDate >= fromDate && itemDate <= toDate;
      }
      const estadoValidacionMatch = !this.estadoValidacion || 
        item.reservaDto?.estadoValidacion === this.estadoValidacion;
      const estadoReservaMatch = !this.estadoReserva || 
        item.reservaDto?.estadoReserva === this.estadoReserva;
      const categoriaMatch = !this.categoria || 
        item.categoria?.toLowerCase().includes(this.categoria.toLowerCase());
      return searchMatch && dateMatch && estadoValidacionMatch && estadoReservaMatch && categoriaMatch;
    });
  }

  private searchInReserva(item: ReservaPuntual, searchTerm: string): boolean {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    if (item.categoria?.toLowerCase().includes(term) ||
        item.superficie?.toLowerCase().includes(term) ||
        item.observaciones?.toLowerCase().includes(term) ||
        item.horaInicio?.toLowerCase().includes(term) ||
        item.horaFin?.toLowerCase().includes(term)) {
      return true;
    }
    if (item.reservaDto) {
      const reserva = item.reservaDto;      
      if (reserva.numeroTasa?.toLowerCase().includes(term) ||
          reserva.numeroReserva?.toLowerCase().includes(term) ||
          reserva.montoTotal?.toString().includes(term)) {
        return true;
      }
      if (reserva.campoDeportivoDto) {
        if (reserva.campoDeportivoDto.nombre?.toLowerCase().includes(term) ||
            reserva.campoDeportivoDto.complejoDto.nombre.toLowerCase().includes(term) ||
            reserva.campoDeportivoDto.complejoDto?.nombre?.toLowerCase().includes(term)) {
          return true;
        }
      }
      if (reserva.contribuyenteDto) {
        const contrib = reserva.contribuyenteDto;
        if (contrib.nombreCompleto?.toLowerCase().includes(term) ||
            contrib.nombre?.toLowerCase().includes(term) ||
            contrib.primerApellido?.toLowerCase().includes(term) ||
            contrib.segundoApellido?.toLowerCase().includes(term) ||
            contrib.numeroDocumento?.toLowerCase().includes(term) ||
            contrib.email?.toLowerCase().includes(term) ||
            contrib.telefono?.toLowerCase().includes(term)) {
          return true;
        }
      }
    }

    return false;
  }

  onNavChange(changeEvent: NgbNavChangeEvent) {
    if (changeEvent.nextId === 0) {
      this.reservasList = this.temp;
    }
    if (changeEvent.nextId === 1) {
      this.reservasList = this.temp.filter((item: any) => 
        item.reservaDto?.estadoReserva === EstadoReserva.SOLICITADA
      );
    }
    if (changeEvent.nextId === 2) {
      this.reservasList = this.temp.filter((item: any) => 
        item.reservaDto?.estadoReserva === EstadoReserva.PENDIENTE
      );
    }
    if (changeEvent.nextId === 3) {
      this.reservasList = this.temp.filter((item: any) => 
        item.reservaDto?.estadoReserva === EstadoReserva.PAGADA
      );
    }
    if (changeEvent.nextId === 4) {
      this.reservasList = this.temp.filter((item: any) => 
        item.reservaDto?.estadoReserva === EstadoReserva.EN_CURSO
      );
    }
    if (changeEvent.nextId === 5) {
      this.reservasList = this.temp.filter((item: any) => 
        item.reservaDto?.estadoReserva === EstadoReserva.COMPLETADA
      );
    }
    if (changeEvent.nextId === 6) {
      this.reservasList = this.temp.filter((item: any) => 
        item.reservaDto?.estadoReserva === EstadoReserva.CANCELADA || 
        item.reservaDto?.estadoReserva === EstadoReserva.RECHAZADA ||
        item.reservaDto?.estadoReserva === EstadoReserva.EXPIRADA ||
        item.reservaDto?.estadoReserva === EstadoReserva.NO_SHOW
      );
    }
  }

  public showTicket(data: ReservaPuntual) {
    // this.router.navigate(['/reservations/ticket'], { state: { data: data.reservaDto } });
    const modalRef = this.modalService.open(TicketComponent, { 
      size: 'lg',
      windowClass: 'ticket-modal'
    });
    modalRef.componentInstance.reservationData = data.reservaDto;
    modalRef.componentInstance.showAsModal = true;
    modalRef.componentInstance.autoLoad = true;
  }

  public agregarReserva() {
    this.router.navigate(['/reservations/details'], { 
      state: { 
        tipoReserva: 'puntual'
      } 
    });
  }

  public openModal(data: any | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(BookingOneTimeModalComponent, {
      backdrop: 'static',
      size: size
    });
    modalRef.componentInstance.row = data;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.canActivate = this.canActivate;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getReservations();
    });
  }

  async consultModal(data: any, content: any,size:string) {
    if (this.selectedItems.length === 0) {
      this.selectedItems.push(data);
    }    
    this.consultResults = [];
    this.dataSelected = null;
    this.loading = true;
    try {
      for (const item of this.selectedItems) {
        try {
          const result = await this.consultData(item);
          this.consultResults.push(result);
          if (!this.dataSelected && result.hasPayment && result.pagoData) {
            this.dataSelected = {
              reserva: result.item,
              pago: result.pagoData,
              ruatResponse: result.ruatResponse
            };
          }
        } catch (error) {
          console.error("Error during consultation for item:", error);
          this.consultResults.push({ 
            item, 
            text: 'Error durante la consulta', 
            type: 'error',
            hasPayment: false 
          });
        }
      }
    } finally {
      this.loading = false;
      if (this.consultResults.length > 0) {
        if (this.dataSelected) {
          this.modalService.open(content, { 
            centered: true, 
            size: size
          });
        } else {
          this.modalService.open(content, { centered: true });
        }
      }    
      this.selectedItems = [];
      this.getReservations();
    }
  }
  
  private async checkAndUpdateExpiredReservas(reservas: ReservaPuntual[]): Promise<ReservaPuntual[]> {
    const updatedReservas: ReservaPuntual[] = [];
    const codigoAlcaldia = this.systemConfigList[ClaveConfiguracion.CODIGO_ALCALDIA_RUAT]?.valorTexto || 'QUI';
    const codigoUsuario = this.systemConfigList[ClaveConfiguracion.CODIGO_USUARIO_RUAT]?.valorTexto || '';
    const updatePromises = reservas.map(async (reserva) => {
      if (this.isReservaExpired(reserva) && reserva.reservaDto?.estadoReserva === EstadoReserva.PENDIENTE) {
        try {
          const requestData = {
            numeroTasa: reserva.reservaDto.numeroTasa,
            motivo: "NO SE EFECTUO EL PAGO EN EL DIA DE REGISTRO",
            observacion: "ANULADO AUTOMATICO, VENCIDO PLAZO DE RESERVA"
          };        
          await this.ruatService.cancelTasa(codigoAlcaldia, codigoUsuario, requestData).toPromise();
          reserva.reservaDto.estadoReserva = EstadoReserva.EXPIRADA;
          reserva.reservaDto.motivoRechazo = requestData.motivo;
          reserva.reservaDto.fechaRechazo = new Date();
          const updatedReserva = await this.reservaService.update(reserva.reservaDto).toPromise();
          reserva.reservaDto = updatedReserva;        
          return reserva;
        } catch (error) {
          console.error('Error updating expired reserva:', error);
          return reserva; 
        }
      } else {
        return reserva;
      }
    });
    const results = await Promise.all(updatePromises);
    return results;
  }
  private isReservaExpired(reserva: ReservaPuntual): boolean {
    const now = new Date();      
    if (!reserva.reservaDto?.fechaCreacion) {
      return false;
    }    
    const fechaCreated = new Date(reserva.reservaDto.fechaCreacion);    
    const horasTimeout = this.HorasValidacionPago ?? 24;    
    const expirationTime = new Date(fechaCreated.getTime() + horasTimeout * 60 * 60 * 1000);      
    return now > expirationTime;
  }
  private showExpiredReservationsMessage(expiredCount: number): void {
    const message = expiredCount === 1 
      ? '1 reserva ha sido cancelada por expiración' 
      : `${expiredCount} reservas han sido canceladas por expiración`;
    
    Swal.fire({
      title: 'Reservas Expiradas',
      text: message,
      icon: 'info',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#299cdb',
      timer: 5000,
      timerProgressBar: true,
      showCloseButton: true
    });
  }
  /* API RUAT Services */
  private authRuat() {
    const usuario = this.systemConfigList[ClaveConfiguracion.USUARIO_RUAT]?.valorTexto;
    const clave = this.systemConfigList[ClaveConfiguracion.CLAVE_RUAT]?.valorTexto;
    if(usuario && clave){
      this.ruatService.authenticate(usuario,clave).subscribe({
        next: (response) => {
          window.sessionStorage.setItem('ruatToken', response.token);
        },
        error: (error) => {
          Swal.fire({
            text: 'Falla en la coneccion con el RUAT',
            title: 'Error!', icon: 'error', confirmButtonColor: '#d33'
          });
        }
      });
    }
  }
  private async consultData(item: any): Promise<any> {
    if (!item) {
      return { item, text: 'No se pudo obtener el dato seleccionado', type: 'warning' };
    }
    try {
      const nroTasa = item.reservaDto?.numeroTasa;
      if (!nroTasa) {
        return { item, text: "No hay número de tasa asociado", type: 'warning' };
      }
      const codigoAlcaldia = this.systemConfigList[ClaveConfiguracion.CODIGO_ALCALDIA_RUAT]?.valorTexto || 'QUI';
      const resp: any = await this.ruatService.consultaPagoTasa(codigoAlcaldia, nroTasa).toPromise();
      if (resp['status'] !== 'OK') {
        let errorMessage = 'Error en la consulta al RUAT';
        if (typeof resp.payload === 'string') {
          try {
            const jsonMatch = resp.payload.match(/\{.*\}/);
            if (jsonMatch) {
              const jsonPayload = JSON.parse(jsonMatch[0]);
              errorMessage = jsonPayload.mensaje || errorMessage;
            }
          } catch (e) {
            errorMessage = resp.payload || errorMessage;
          }
        }
        return { 
          item, 
          text: errorMessage, 
          type: 'error',
          hasPayment: false
        };
      }
      const payload = resp.payload;
      if (!payload.continuarFlujo) {
        return { 
          item, 
          text: payload.mensaje || payload.observacion || "No se puede continuar con el flujo", 
          type: 'warning',
          hasPayment: false
        };
      }
      if (!payload.pagoTasa) {
        return { 
          item, 
          text: payload.mensaje || payload.observacion || "No se encontraron datos de pago", 
          type: 'info',
          hasPayment: false
        };
      }
      const pagoData = payload.pagoTasa;
      let text = payload.mensaje || payload.observacion || "La tasa se encuentra pagada";    
      if (item.reservaDto?.estadoReserva === EstadoReserva.PENDIENTE) {
        try {
          const [day, month, year] = pagoData.fechaPago.split('/');
          const formattedDate = `${year}-${month}-${day}`;
          const nuevoPago: Pago = {
            numeroTasa: pagoData.numeroTasa,
            tipoTasa: "TO",
            folio: pagoData.folio,
            formaPago: pagoData.formaPago,
            fechaPago: new Date(formattedDate),
            entidadFinanciera: pagoData.entidadFinanciera,
            montoPagado: parseFloat(pagoData.montoPago) || 0,
            observaciones: pagoData.observacion,
            estadoPago: EstadoPago.PAGADO,
            ultimaConsulta: new Date(),
            respuestaCompletaRuat: JSON.stringify(resp),
            reservaDto: item.reservaDto
          };
          const pagoResp: any = await this.pagoService.save(nuevoPago).toPromise();
          if (pagoResp.status === 'OK') {
            item.reservaDto.estadoReserva = EstadoReserva.PAGADA;
            const updatedReserva = await this.updateReserva(item.reservaDto);
            return { 
              item: updatedReserva, 
              text: `${text} - Pago registrado exitosamente`, 
              type: 'success',
              hasPayment: true,
              pagoData: pagoResp.payload
            };
          } else {
            return { 
              item, 
              text: 'Error al guardar el pago en el sistema', 
              type: 'error',
              hasPayment: true
            };
          }
        } catch (error) {
          console.error('Error saving pago:', error);
          return { 
            item, 
            text: 'Error al procesar el pago', 
            type: 'error',
            hasPayment: true
          };
        }
      } else {
        return { 
          item, 
          text: `${text} - Reserva en estado: ${item.reservaDto?.estadoReserva}`, 
          type: 'info',
          hasPayment: true,
          pagoData: pagoData
        };
      }
    } catch (error) {
      console.error('Error in consultData:', error);
      return { 
        item, 
        text: 'Error al realizar la consulta al RUAT', 
        type: 'error',
        hasPayment: false
      };
    }
  }
  /* API Services */
  private updateReserva(data: Reserva): Promise<Reserva> {
    return new Promise((resolve, reject) => {
      this.reservaService.update(data).subscribe({
        next: (resp: any) => {
          if (resp['status'] === 'OK') {
            resolve(resp.payload);
          } else {
            reject(resp.payload);
          }
        },
        error: (error) => {
          console.error("Error updating reserva:", error);
          reject(error);
        }
      });
    });
  }
  private getCategories() {
    this.categoriesService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.categoryList = data.payload;
        }
      },
      error: (error) => {
        Swal.fire({ text: 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb' });
      }
    });
  }
  private async getReservations(page: number = 0, size: number = 20) {
    try {
      this.loading = true;
      const data: any = await this.reservaPuntualService.getAll(page, size).toPromise();      
      if (data && data['status'] === 'OK') {
        let list: ReservaPuntual[] = [];        
        if (data.payload && data.payload.content && Array.isArray(data.payload.content)) {
          list = data.payload.content;
          this.currentPage = data.payload.number + 1;
        } else if (Array.isArray(data.payload)) {
          list = data.payload;
        }        
        if (this.contribuyente) {
          list = list.filter((item: any) => 
            item.reservaDto?.contribuyenteDto?.uuid === this.contribuyente.uuid
          );
        }
        const assignaments = localStorage.getItem("assignaments");
        const employee = assignaments ? JSON.parse(assignaments) : null;
        if (employee) {
          list = list.filter((item: any) => 
            item.reservaDto?.campoDeportivoDto?.complejoDto?.uuid === employee.complejoDto?.uuid
          );
        }
        const originalPendingCount = list.filter(item => 
          item.reservaDto?.estadoReserva === EstadoReserva.PENDIENTE
        ).length;
        const updatedList = await this.checkAndUpdateExpiredReservas(list);
        const newlyExpiredCount = updatedList.filter(item => 
          item.reservaDto?.estadoReserva === EstadoReserva.EXPIRADA && 
          list.find(originalItem => 
            originalItem.reservaDto?.uuid === item.reservaDto?.uuid && 
            originalItem.reservaDto?.estadoReserva === EstadoReserva.PENDIENTE
          )
        ).length;
        this.reservasList = updatedList;
        this.temp = this.reservasList;
        if (newlyExpiredCount > 0) {
          this.showExpiredReservationsMessage(newlyExpiredCount);
        }
      }
    } catch (error) {
      console.error('Error fetching reservas:', error);
      Swal.fire({ 
        text: 'Error al obtener las reservas', 
        icon: 'error', 
        confirmButtonColor: '#299cdb' 
      });
      this.reservasList = { content: [], totalElements: 0, pageable: { pageNumber: 0, pageSize: 20 } };
      this.temp = [];
    } finally {
      this.loading = false;
    }
  }
  
  onPageChange(page: number): void {
      const pageIndex = page - 1;
      this.getReservations(pageIndex, this.pageSize);
  }
  onPageSizeChange(size: number): void {
      this.pageSize = size;
      this.currentPage = 1;
      this.getReservations(0, size);
  }
  clearFilters() {
    this.searchTerm = '';
    this.date = { from: null!, to: null! };
    this.estadoValidacion = '';
    this.estadoReserva = '';
    this.categoria = '';
    this.applyFilters();
  }
  // Csv File Export
  csvFileExport() {
    const lista = this.selectedItems.flatMap((item: ReservaPuntual) => {
      const baseData = {
        complejo: item.reservaDto?.campoDeportivoDto?.complejoDto?.nombre || '-',
        campo: item.reservaDto?.campoDeportivoDto?.nombre || '-',
        superficie: item.superficie || '-',
        categoria: item.categoria || '-',
        
        fechaUso: item.fechaUso ? new Date(item.fechaUso).toLocaleDateString() : '-',
        horaInicio: item.horaInicio || '-',
        horaFin: item.horaFin || '-',
        duracion: item.duracionHoras ? `${item.duracionHoras} hrs` : '-',
        cantidadPersonas: item.cantidadPersonas || '-',
        // fechaUsoReal: item.fechaUsoReal ? new Date(item.fechaUsoReal).toLocaleDateString() : '-',
        fechaCreacion: item.reservaDto?.fechaCreacion ? new Date(item.reservaDto.fechaCreacion).toLocaleDateString() : '-',
        // fechaActualizacion: item.reservaDto?.fechaActualizacion ? new Date(item.reservaDto.fechaActualizacion).toLocaleDateString() : '-',
        tipoReserva: item.reservaDto?.tipoReserva || '-',
        tipoCobro: item.reservaDto?.tarifaDto?.tipoCobro || '-',
        numeroReserva: item.reservaDto?.numeroReserva || '-',
        tasa: item.reservaDto?.numeroTasa || '-',
        montoTotal: item.reservaDto?.montoTotal || '-',        
        estadoValidacion: item.reservaDto?.estadoValidacion || '-',
        estadoReserva: item.reservaDto?.estadoReserva || '-',
        observaciones: item.observaciones || '-',        
        // Approval information
        fechaAprobacion: item.reservaDto?.fechaAprobacion ? new Date(item.reservaDto.fechaAprobacion).toLocaleDateString() : '-',
        fechaRechazo: item.reservaDto?.fechaRechazo ? new Date(item.reservaDto.fechaRechazo).toLocaleDateString() : '-',
        motivoRechazo: item.reservaDto?.motivoRechazo || '-',
        aprobadoPor: item.reservaDto?.aprobadoPor || '-',
        // contributor information
        tipoContribuyente: item.reservaDto?.contribuyenteDto?.tipoContribuyente || '-',
        contribuyente: item.reservaDto?.contribuyenteDto?.nombreCompleto || 
                    `${item.reservaDto?.contribuyenteDto?.nombre || ''} ${item.reservaDto?.contribuyenteDto?.primerApellido || ''} ${item.reservaDto?.contribuyenteDto?.segundoApellido || ''}`.trim(),
        carnet: item.reservaDto?.contribuyenteDto?.numeroDocumento || '-',
        // Organization information (if applicable)
        esOrganizacion: item.reservaDto?.organizacionDto ? 'SI' : 'NO',
        nombreOrganizacion: item.reservaDto?.organizacionDto?.nombre || '-',
      };      
      return [{ ...baseData }];
    });
    
    const data = {
      fieldSeparator: ',',
      quoteStrings: '"',
      decimalseparator: '.',
      showLabels: true,
      showTitle: true,
      title: 'Lista de Reservas Puntuales',
      useBom: true,
      noDownload: false,
      headers: [
        "Complejo", "Campo Deportivo", "Superficie","Categoría",        
        "Fecha Uso", "Hora Inicio", "Hora Fin", "Duración", "Cant. Personas",/* "Fecha Uso Real", */                  
        "Fecha Creación", /* "Fecha Actualización", */ "Tipo Reserva", "Tipo Cobro", 
        "Número Reserva", "Número Tasa", "Monto Total",/* "Clasificador RUAT", */
        "Estado Validación", "Estado Reserva", "Observaciones",
        "Fecha Aprobación", "Fecha Rechazo", "Motivo Rechazo", "Aprobado Por",  
        "Tipo Contribuyente", "Contribuyente", "Carnet",
        "Es Para Organización", "Nombre Organización",
      ]
    };
    new ngxCsv(lista, `Reservas_Puntuales_${new Date().toISOString().split('T')[0]}`, data);
  }
}