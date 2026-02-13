import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import { ngxCsv } from 'ngx-csv';
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { PaginationService } from 'src/app/core/services/pagination.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { PagoService } from 'src/app/core/services/api/pago.service';
import { ReservaPuntualService } from 'src/app/core/services/api/reserva-puntual.service';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { RuatRequestsService } from 'src/app/core/services/ruatRequest.service';
import { EstadoPago, EstadoReserva, EstadoUsuario, EstadoValidacion } from 'src/app/core/constants/Estados';
import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';
import { Categoria } from 'src/app/core/models/categoria.model';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { ReservaPuntual } from 'src/app/core/models/reservaPuntual.model';
import { Reserva } from 'src/app/core/models/reserva.model';
import { Pago } from 'src/app/core/models/pago.model';
import { TicketComponent } from '../reports/ticket/ticket.component';
import { BookingOneTimeModalComponent } from '../../modals/modal-booking-one-time/modal-booking-one-time.component';

@Component({
  selector: 'app-booking-one-time',
  templateUrl: './booking-one-time.component.html',
  styleUrls: ['./booking-one-time.component.scss']
})
export class BookingOneTimeComponent implements OnInit {
  title = 'Reservas Puntuales';
  breadCrumbItems!: Array<{}>;
  itemsList: any[] = [];
  viewMode: 'table' | 'cards' = 'table';
  serverSidePagination: boolean = true;
  currentPage: number = 1;
  pageSize: number = 5;
  
  canActivate: string[];
  userRole: 'Contribuyente' | 'Representante' | 'Encargado' | 'Admin' = 'Contribuyente';
  userData!:any;
  contribuyente!: Contribuyente;

  loading: boolean = true;
  reservasList: any;
  temp: any[] = [];
  categoryList: Categoria[] = [];
  selectedItems: ReservaPuntual[] = [];
  dataSelected!: any;
  consultResults: any[] = [];
  searchResults: any;

  // searchTerm: string = '';
  date!: { from: Date, to: Date };
  // estadoValidacion: string = '';
  // estadoReserva: string = '';
  // categoria: string = '';

  filters = {
    searchTerm: '',
    estadoReserva: '',
    estadoValidacion: '',
    categoria: '',
    fromDate: null as Date | null,
    toDate: null as Date | null,
    tab: 0
  };

  systemConfigList: { [key: string]: ConfiguracionSistema } = {};
  get HorasValidacionPago(): number | undefined {
    return this.systemConfigList[ClaveConfiguracion.HORAS_VALIDACION_PAGO]?.valorNumerico;
  } 
  get MinutosGraciaNoShow(): number | undefined {
    return this.systemConfigList[ClaveConfiguracion.MINUTOS_GRACIA_NO_SHOW]?.valorNumerico;
  }
  constructor(
    private authService: AuthenticationService,
    public paginationService: PaginationService,
    private router: Router,
    public modalService: NgbModal,
    public formBuilder: UntypedFormBuilder,
    private categoriesService: CategoriasService,
    private reservaPuntualService: ReservaPuntualService,
    private reservaService: ReservaService,
    private ruatService: RuatRequestsService,
    private pagoService: PagoService,
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
    if (!this.authService.isRuatAuthenticated()) {
      await this.delay(1000);
    }
    await this.getPuntualReservations();
    await this.getCategories();
    setInterval(() => this.getPuntualReservations(), 5 * 60 * 1000);
  }
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /* UI HANDLERS */
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
  onPageChange(page: number): void {
    this.currentPage = page
    this.getPuntualReservations();
  }
  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.getPuntualReservations();
  }
  private readonly TAB_FILTERS: { [key: number]: (item: any) => boolean } = {
      0: () => true,
      1: (item) => item.reservaDto?.estadoReserva === EstadoReserva.SOLICITADA,
      2: (item) => item.reservaDto?.estadoReserva === EstadoReserva.PENDIENTE,
      3: (item) => item.reservaDto?.estadoReserva === EstadoReserva.PAGADA,
      4: (item) => item.reservaDto?.estadoReserva === EstadoReserva.EN_CURSO,
      5: (item) => item.reservaDto?.estadoReserva === EstadoReserva.COMPLETADA,
      6: (item) => item.reservaDto?.estadoReserva === EstadoReserva.CANCELADA || 
                  item.reservaDto?.estadoReserva === EstadoReserva.EXPIRADA ||
                  item.reservaDto?.estadoReserva === EstadoReserva.NO_SHOW,
  };
  onNavChange(changeEvent: NgbNavChangeEvent) {
    this.filters.tab = changeEvent.nextId;
    this.currentPage = 1;
    this.getPuntualReservations();
  }

  applyFilters() {
    this.currentPage = 1;
    this.getPuntualReservations();
  }

  clearFilters() {
    this.filters = {
      searchTerm: '',
      estadoReserva: '',
      estadoValidacion: '',
      categoria: '',
      fromDate: null,
      toDate: null,
      tab: 0
    };
    this.currentPage = 1;
    this.getPuntualReservations();
  }
  // onNavChange(changeEvent: NgbNavChangeEvent) {
  //     const filterFn = this.TAB_FILTERS[changeEvent.nextId];
  //     if (filterFn) {
  //         this.reservasList = this.temp.filter(filterFn);
  //     }
  // }
  // clearFilters() {
  //   this.searchTerm = '';
  //   this.date = { from: null!, to: null! };
  //   this.estadoValidacion = '';
  //   this.estadoReserva = '';
  //   this.categoria = '';
  //   this.applyFilters();
  // }
  // applyFilters() {
  //   if (!this.temp || this.temp.length === 0) return;
  //   this.reservasList = this.temp.filter(item => {
  //     const searchMatch = !this.searchTerm || this.searchInReserva(item, this.searchTerm);
  //     let dateMatch = true;
  //     if (this.date && this.date.from && this.date.to) {
  //       const itemDate = new Date(item.fechaUso);
  //       const fromDate = new Date(this.date.from);
  //       const toDate = new Date(this.date.to);
  //       itemDate.setHours(0, 0, 0, 0);
  //       fromDate.setHours(0, 0, 0, 0);
  //       toDate.setHours(0, 0, 0, 0);        
  //       dateMatch = itemDate >= fromDate && itemDate <= toDate;
  //     }
  //     const estadoValidacionMatch = !this.estadoValidacion || 
  //       item.reservaDto?.estadoValidacion === this.estadoValidacion;
  //     const estadoReservaMatch = !this.estadoReserva || 
  //       item.reservaDto?.estadoReserva === this.estadoReserva;
  //     const categoriaMatch = !this.categoria || 
  //       item.categoria?.toLowerCase().includes(this.categoria.toLowerCase());
  //     return searchMatch && dateMatch && estadoValidacionMatch && estadoReservaMatch && categoriaMatch;
  //   });
  // }
  // private searchInReserva(item: ReservaPuntual, searchTerm: string): boolean {
  //   if (!searchTerm) return true;
  //   const term = searchTerm.toLowerCase();
  //   if (item.categoria?.toLowerCase().includes(term) ||
  //       item.superficie?.toLowerCase().includes(term) ||
  //       item.observaciones?.toLowerCase().includes(term) ||
  //       item.horaInicio?.toLowerCase().includes(term) ||
  //       item.horaFin?.toLowerCase().includes(term)) {
  //     return true;
  //   }
  //   if (item.reservaDto) {
  //     const reserva = item.reservaDto;      
  //     if (reserva.numeroTasa?.toLowerCase().includes(term) ||
  //         reserva.numeroReserva?.toLowerCase().includes(term) ||
  //         reserva.montoTotal?.toString().includes(term)) {
  //       return true;
  //     }
  //     if (reserva.campoDeportivoDto) {
  //       if (reserva.campoDeportivoDto.nombre?.toLowerCase().includes(term) ||
  //           reserva.campoDeportivoDto.complejoDto.nombre.toLowerCase().includes(term) ||
  //           reserva.campoDeportivoDto.complejoDto?.nombre?.toLowerCase().includes(term)) {
  //         return true;
  //       }
  //     }
  //     if (reserva.contribuyenteDto) {
  //       const contrib = reserva.contribuyenteDto;
  //       if (contrib.nombreCompleto?.toLowerCase().includes(term) ||
  //           contrib.nombre?.toLowerCase().includes(term) ||
  //           contrib.primerApellido?.toLowerCase().includes(term) ||
  //           contrib.segundoApellido?.toLowerCase().includes(term) ||
  //           contrib.numeroDocumento?.toLowerCase().includes(term) ||
  //           contrib.email?.toLowerCase().includes(term) ||
  //           contrib.telefono?.toLowerCase().includes(term)) {
  //         return true;
  //       }
  //     }
  //   }
  //   return false;
  // }

  /* NAVIGATIONS & MODALS */
  public agregarReserva() {
    this.router.navigate(['/reservations/details'], { 
      state: { 
        tipoReserva: 'puntual'
      } 
    });
  }
  public showTicket(data: ReservaPuntual) {
    const modalRef = this.modalService.open(TicketComponent, { 
      size: 'lg',
      windowClass: 'ticket-modal'
    });
    modalRef.componentInstance.bookingType = 'puntual'
    modalRef.componentInstance.reservationData = data.reservaDto;
    modalRef.componentInstance.showAsModal = true;
    modalRef.componentInstance.autoLoad = true;
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
      this.getPuntualReservations();
    });
  }
  public async consultModal(data: any, content: any, size: string) {
    if (this.selectedItems.length === 0) {
      this.selectedItems.push(data);
    }    
    this.consultResults = [];
    this.dataSelected = null;
    this.loading = true;    
    let shouldRefreshData = false;    
    try {
      for (const item of this.selectedItems) {
        try {
          const result = await this.consultData(item);
          this.consultResults.push(result);
          if (!this.dataSelected && result.hasPayment && result.pagoData && !result.shouldNotUpdate) {
            this.dataSelected = {
              reserva: result.item,
              pago: result.pagoData,
              ruatResponse: result.ruatResponse
            };
          }
          if (!result.shouldNotUpdate && result.hasPayment) {
            shouldRefreshData = true;
          }
        } catch (error) {
          this.consultResults.push({ 
            item, 
            text: 'Error durante la consulta', 
            type: 'error',
            hasPayment: false,
            shouldNotUpdate: true
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
      if (shouldRefreshData) {
        this.getPuntualReservations();
      }
    }
  }
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
        fechaAprobacion: item.reservaDto?.fechaAprobacion ? new Date(item.reservaDto.fechaAprobacion).toLocaleDateString() : '-',
        fechaRechazo: item.reservaDto?.fechaRechazo ? new Date(item.reservaDto.fechaRechazo).toLocaleDateString() : '-',
        motivoRechazo: item.reservaDto?.motivoRechazo || '-',
        aprobadoPor: item.reservaDto?.aprobadoPor || '-',        
        tipoContribuyente: item.reservaDto?.contribuyenteDto?.tipoContribuyente || '-',
        contribuyente: item.reservaDto?.contribuyenteDto?.nombreCompleto || 
                    `${item.reservaDto?.contribuyenteDto?.nombre || ''} ${item.reservaDto?.contribuyenteDto?.primerApellido || ''} ${item.reservaDto?.contribuyenteDto?.segundoApellido || ''}`.trim(),
        carnet: item.reservaDto?.contribuyenteDto?.numeroDocumento || '-',        
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



  /* BUSINESS LOGIC */
  private async checkAndUpdateReservationStatuses(list: ReservaPuntual[]): Promise<ReservaPuntual[]> {
    const updatePromises = list.map(async (reservaPun:ReservaPuntual) => {
      if (!reservaPun.reservaDto) return reservaPun;
      const reservaDto : Reserva = reservaPun.reservaDto;
      const terminalStates = [
        EstadoReserva.COMPLETADA, EstadoReserva.NO_SHOW,
        EstadoReserva.CANCELADA, EstadoReserva.EXPIRADA,        
      ];
      if (terminalStates.includes(reservaDto.estadoReserva)) {
        return reservaPun;
      }
      try {
        if (reservaDto.estadoReserva === EstadoReserva.PENDIENTE || 
            reservaDto.estadoReserva === EstadoReserva.SOLICITADA) {
          if (reservaDto.esReservaGratuita) {
            if (reservaDto.estadoValidacion === EstadoValidacion.APROBADA) {
              if (this.isTimeCompleted(reservaPun)) {
                return await this.updateReservationByPR(reservaPun, {
                  estadoReserva: EstadoReserva.COMPLETADA
                });
              } else if (this.isCurrentlyActive(reservaPun)) {
                return await this.updateReservationByPR(reservaPun, {
                  estadoReserva: EstadoReserva.EN_CURSO
                });
              }
              return reservaPun;
            } else if(reservaDto.estadoValidacion === EstadoValidacion.RECHAZADA) {
              return await this.updateReservationByPR(reservaPun, {
                  estadoReserva: EstadoReserva.CANCELADA
              });
            }
            return reservaPun;
          }          
          const consultResult = await this.consultData(reservaPun);
          if (consultResult.hasPayment) {
            if (this.isTimeCompleted(reservaPun)) {
              return await this.updateReservationByPR(reservaPun, {
                estadoReserva: EstadoReserva.COMPLETADA,
              });
            } else if (this.isCurrentlyActive(reservaPun)) {
              return await this.updateReservationByPR(reservaPun, {
                estadoReserva: EstadoReserva.EN_CURSO,
              });
            } else {
              return await this.updateReservationByPR(reservaPun, {
                estadoReserva: EstadoReserva.PAGADA,
              });
            }
            
          } else {
            if (this.isPeriodExpired(reservaPun)) {
              return await this.handleExpiredgReservation(reservaPun);
            }
          }
        }
        if (reservaDto.estadoReserva === EstadoReserva.PAGADA || 
            reservaDto.estadoReserva === EstadoReserva.EN_CURSO) {
          if (this.isTimeCompleted(reservaPun)) {
            return await this.updateReservationByPR(reservaPun, { 
              estadoReserva: EstadoReserva.COMPLETADA 
            });
          }
          if (this.isCurrentlyActive(reservaPun) && 
          (reservaDto.estadoReserva !== EstadoReserva.EN_CURSO)) {
            return await this.updateReservationByPR(reservaPun, { 
              estadoReserva: EstadoReserva.EN_CURSO 
            });
          }
        }             
        return reservaPun;
      } catch (error) { return reservaPun;}
    });    
      
    return await Promise.all(updatePromises);
  }
  private isCurrentlyActive(reserva: ReservaPuntual): boolean {
    const now = new Date();    
    if (reserva.fechaUso && reserva.horaInicio && reserva.horaFin) {
      let startTime: Date;
      let endTime: Date;      
      if (reserva.fechaUso instanceof Date) {
        const usoDate = new Date(reserva.fechaUso);
        const [startHours, startMinutes, startSeconds = 0] = reserva.horaInicio.split(':').map(Number);
        startTime = new Date(usoDate);
        startTime.setHours(startHours, startMinutes, startSeconds, 0);
        const [endHours, endMinutes, endSeconds = 0] = reserva.horaFin.split(':').map(Number);
        endTime = new Date(usoDate);
        endTime.setHours(endHours, endMinutes, endSeconds, 0);
      } else {
        const fechaUsoStr = reserva.fechaUso as string;
        const [year, month, day] = fechaUsoStr.split('-').map(Number);
        const [startHours, startMinutes, startSeconds = 0] = reserva.horaInicio.split(':').map(Number);
        startTime = new Date(year, month - 1, day, startHours, startMinutes, startSeconds);
        const [endHours, endMinutes, endSeconds = 0] = reserva.horaFin.split(':').map(Number);
        endTime = new Date(year, month - 1, day, endHours, endMinutes, endSeconds);
      }      
      return now >= startTime && now <= endTime;
    }    
    return false;
  }
  private isTimeCompleted(reserva: ReservaPuntual): boolean {
    const now = new Date();    
    if (reserva.fechaUso && reserva.horaFin) {
      let endTime: Date;      
      if (reserva.fechaUso instanceof Date) {
        const usoDate = new Date(reserva.fechaUso);
        const [hours, minutes, seconds = 0] = reserva.horaFin.split(':').map(Number);
        endTime = new Date(usoDate);
        endTime.setHours(hours, minutes, seconds, 0);
      } else {
        const fechaUsoStr = reserva.fechaUso as string;
        const [year, month, day] = fechaUsoStr.split('-').map(Number);
        const [hours, minutes, seconds = 0] = reserva.horaFin.split(':').map(Number);
        endTime = new Date(year, month - 1, day, hours, minutes, seconds);
      }
      
      return endTime < now;
    }    
    return false;
  }
  private isPeriodExpired(reserva: ReservaPuntual): boolean {
    if(!reserva.reservaDto) return false;
    if(reserva.reservaDto.esReservaGratuita){
      return false;
    }
    const horasValidacion = this.HorasValidacionPago || 24;
    const fechaCreacion = new Date(reserva.reservaDto.fechaCreacion);
    const now = new Date();
    const expirationDate = new Date(fechaCreacion);
    expirationDate.setHours(expirationDate.getHours() + horasValidacion);    
    return now > expirationDate;
  }
  private parseDate(dateInput: string | Date): Date {
    if (dateInput instanceof Date) {
      return dateInput;
    }
    if (typeof dateInput === 'string') {
      if (dateInput.includes('T')) {
        return new Date(dateInput);
      }
      return new Date(dateInput + 'T00:00:00');
    }
    return new Date();
  }



  /* API RUAT Services */
  private async consultData(item: ReservaPuntual): Promise<any> {
    try {
      const nroTasa = item.reservaDto?.numeroTasa;
      if (!nroTasa) {
        return { item, text: "No hay número de tasa asociado", 
          type: 'warning', hasPayment: false };
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
            } else {
              errorMessage = resp.payload || errorMessage;
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
      if (!resp.payload.continuarFlujo) {
        return { 
          item, 
          text: resp.payload.mensaje || resp.payload.observacion || "No se puede continuar con el flujo", 
          type: 'warning',
          hasPayment: false,
        };
      }
      const pagoTasa = resp.payload.pagoTasa;
      if (!pagoTasa) {
        return { 
          item, 
          text: resp.payload.mensaje || resp.payload.observacion || "No se encontraron datos de pago", 
          type: 'info',
          hasPayment: false, 
        };
      }
      
      let text = resp.payload.mensaje || resp.payload.observacion || "La tasa se encuentra pagada";
      try {
        const [day, month, year] = pagoTasa.fechaPago.split('/');
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const existingPayment = item.reservaDto?.pagosDtoList?.find(pago => 
          pago.folio === pagoTasa.folio && pago.numeroTasa === pagoTasa.numeroTasa
        );
        if (!existingPayment && item.reservaDto) {
          const nuevoPago: Pago = {
            numeroTasa: pagoTasa.numeroTasa,
            tipoTasa: "TO",
            folio: pagoTasa.folio,
            formaPago: pagoTasa.formaPago,
            fechaPago: new Date(formattedDate),
            entidadFinanciera: pagoTasa.entidadFinanciera,
            montoPagado: parseFloat(pagoTasa.montoPago) || 0,
            observaciones: pagoTasa.observacion,
            estadoPago: EstadoPago.PAGADO,
            ultimaConsulta: new Date(),
            respuestaCompletaRuat: JSON.stringify(resp),
            reservaDto: item.reservaDto
          };            
          await this.pagoService.save(nuevoPago).toPromise();
        }
        return { 
          item, 
          text: `${text} - Pago verificado`, 
          type: 'success',
          hasPayment: true,
          pagoData: pagoTasa,
        };          
      // if (item.reservaDto?.estadoReserva === EstadoReserva.PENDIENTE) {
      //   try {
      //     const nuevoPago: Pago = {
      //       numeroTasa: pagoData.numeroTasa,
      //       tipoTasa: "TO",
      //       folio: pagoData.folio,
      //       formaPago: pagoData.formaPago,
      //       fechaPago: new Date(formattedDate),
      //       entidadFinanciera: pagoData.entidadFinanciera,
      //       montoPagado: parseFloat(pagoData.montoPago) || 0,
      //       observaciones: pagoData.observacion,
      //       estadoPago: EstadoPago.PAGADO,
      //       ultimaConsulta: new Date(),
      //       respuestaCompletaRuat: JSON.stringify(resp),
      //       reservaDto: item.reservaDto
      //     };
          
      //     const pagoResp: any = await this.pagoService.save(nuevoPago).toPromise();
          
      //     if (pagoResp.status === 'OK') {
      //       item.reservaDto.estadoReserva = EstadoReserva.PAGADA;
      //       const updatedReserva = await this.updateReservation(item.reservaDto);
      //       return { 
      //         item: updatedReserva.reservaPuntualDto, 
      //         text: `${text} - Pago registrado exitosamente`, 
      //         type: 'success',
      //         hasPayment: true,
      //         pagoData: pagoResp.payload
      //       };
      //     } else {
      //       return { 
      //         item, 
      //         text: 'Error al guardar el pago en el sistema', 
      //         type: 'error',
      //         hasPayment: true,
      //         shouldNotUpdate: true
      //       };
      //     }
      //   } catch (error) {
      //     console.error('Error saving pago:', error);
      //     return { 
      //       item, 
      //       text: 'Error al procesar el pago', 
      //       type: 'error',
      //       hasPayment: true,
      //       shouldNotUpdate: true
      //     };
      //   }
      // } else {
      //   return { 
      //     item, 
      //     text: `${text} - Reserva en estado: ${item.reservaDto?.estadoReserva}`, 
      //     type: 'info',
      //     hasPayment: true,
      //     pagoData: pagoData
      //   };
      // }
      } catch (error) {
        return { 
          item, 
          text: 'Error al guardar el pago', 
          type: 'error',
          hasPayment: true,
        };
      }
    } catch (error) {
      return { 
        item, 
        text: 'Error al realizar la consulta al RUAT', 
        type: 'error',
        hasPayment: false,
      };
    }
  }
  private async handleExpiredgReservation(reserva: ReservaPuntual): Promise<ReservaPuntual> {
    const codigoAlcaldia = this.systemConfigList[ClaveConfiguracion.CODIGO_ALCALDIA_RUAT]?.valorTexto || 'QUI';
    const codigoUsuario = this.systemConfigList[ClaveConfiguracion.CODIGO_USUARIO_RUAT]?.valorTexto || '';
    if (reserva.reservaDto?.numeroTasa) {
      try {
        const requestData = {
          numeroTasa: reserva.reservaDto.numeroTasa,
          motivo: "NO SE EFECTUO EL PAGO EN EL DIA DE REGISTRO",
          observacion: "ANULADO AUTOMATICO, VENCIDO PLAZO DE RESERVA"
        };
        if (!this.ruatService.isTokenAvailable()) {
          console.warn('RUAT token not available, skipping tasa cancellation');
        } else {
          await this.ruatService.cancelTasa(codigoAlcaldia, codigoUsuario, requestData).toPromise();
        }
      } catch (error) {
        console.warn('Failed to cancel tasa in RUAT for expired reservation:', error);
        return reserva;
      }
    }
    return await this.updateReservationByPR(reserva, {
      estadoReserva: EstadoReserva.EXPIRADA,
      motivoRechazo: "NO SE EFECTUO EL PAGO EN EL DIA DE REGISTRO",
      fechaRechazo: new Date()
    });
  }
  /* API Services */
  private async updateReservationByPR(reserva: ReservaPuntual, updates: any): Promise<ReservaPuntual> {
    if (!reserva.reservaDto) return reserva;    
    const updatedReservaDto: Reserva = {
      ...reserva.reservaDto,
      ...updates,
      fechaActualizacion: new Date(),
    };
    try {
      const response: any = await this.reservaService.update(updatedReservaDto).toPromise();
      if (response && response.status === 'OK') {
        reserva.reservaDto = response.payload;
      } else {
        console.warn('Failed to update reservation:', response?.payload || 'Unknown error');
      }
      return reserva;
    } catch (error) { return reserva;}
  }
  private updateReservation(data: Reserva): Promise<Reserva> {
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
          reject(error);
        }
      });
    });
  }
  private async getPuntualReservations() {
    try {
      this.loading = true;
      const data: any = await this.reservaPuntualService.getAll(
        this.currentPage - 1,
        this.pageSize,
        {
          tab: this.filters.tab,
          searchTerm: this.filters.searchTerm,
          estadoReserva: this.filters.estadoReserva,
          estadoValidacion: this.filters.estadoValidacion,
          categoria: this.filters.categoria,
          fromDate: this.filters.fromDate?.toISOString(),
          toDate: this.filters.toDate?.toISOString(),
        }
      ).toPromise();     
      if (!data || data['status'] !== 'OK') {
        throw new Error(data?.payload || 'Respuesta inválida del servidor');
      }
      let list: ReservaPuntual[] = [];   
      if (data.payload?.content && Array.isArray(data.payload.content)) {
        list = data.payload.content;
      } else if (Array.isArray(data.payload)) {
        list = data.payload;
      }
      const employee = this.authService.staff();
      if(employee?.complejoDto){
          list = list.filter((item: any) => 
            item.reservaDto?.campoDeportivoDto?.complejoDto?.uuid === employee.complejoDto?.uuid
          );
      }
      if (this.contribuyente) {
        list = list.filter((item: any) =>
            item.reservaDto?.contribuyenteDto?.uuid === this.contribuyente.uuid
        );
      }
      const updatedList = await this.checkAndUpdateReservationStatuses(list);
      this.notifyAboutExpiredReservations(list, updatedList);
      this.reservasList ={
        ...data.payload,
        content: updatedList
      } ;
      this.temp = updatedList;
    } catch (error) {
      this.loading = false;
      this.handleError(error, 'Error al obtener las reservas');
      this.reservasList = { content: [], totalElements: 0, pageable: { pageNumber: 0, pageSize: 20 } };
      this.temp = [];
    } finally {
      this.loading = false;
    }
  }
  private getCategories() {
    this.categoriesService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.categoryList = data.payload;
        }
      },
      error: (error) => {
        this.handleError(error, 'Error al obtener las Categorías');
      }
    });
  }

  /* NOTIFICATIONS */
  private notifyAboutExpiredReservations(originalList: ReservaPuntual[], updatedList: ReservaPuntual[]): void {
    const newlyExpired = updatedList.filter(item => {
      const originalItem = originalList.find(item => 
        item.reservaDto?.uuid === item.reservaDto?.uuid
      );
      return originalItem?.reservaDto?.estadoReserva === EstadoReserva.PENDIENTE &&
            item.reservaDto?.estadoReserva === EstadoReserva.EXPIRADA;
    });    
    if (newlyExpired.length > 0) {      
      const expiredCount = newlyExpired.length;
      const message = expiredCount === 1 
        ? '1 reserva ha expirado por falta de pago y ha sido cancelada automáticamente' 
        : `${expiredCount} reservas han expirado por falta de pago y han sido canceladas automáticamente`;
      Swal.fire({
        title: 'Reservas Expiradas',
        html: `
          <p>${message}</p>
          <p class="text-sm text-muted mt-2">
            <i class="fas fa-info-circle me-1"></i>
          </p>
        `,
        icon: 'warning',
        iconColor: '#f8bb86',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#299cdb',
        timer: 7000,
        timerProgressBar: true,
        showCloseButton: true,
        backdrop: true,
        allowOutsideClick: false
      });
    }
  }
  private handleError(error: any, defaultMessage: string): void {
    Swal.fire({ 
        text: error?.message || defaultMessage, 
        icon: 'error', 
        confirmButtonColor: '#299cdb' 
    });
  } 
}