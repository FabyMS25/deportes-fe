import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import { ngxCsv } from 'ngx-csv';
import Swal from 'sweetalert2';

import { PaginationService } from 'src/app/core/services/pagination.service';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { RuatRequestsService } from 'src/app/core/services/ruatRequest.service';
import { PagoService } from 'src/app/core/services/api/pago.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { EstadoPago, EstadoReserva, EstadoUsuario } from 'src/app/core/constants/Estados';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { Reserva } from 'src/app/core/models/reserva.model';
import { Categoria } from 'src/app/core/models/categoria.model';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { Pago } from 'src/app/core/models/pago.model';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';
import { Organizacion } from 'src/app/core/models/organizacion.model';
import { OrganizacionService } from 'src/app/core/services/api/organizacion.service';
import { ReservaPeriodoService } from 'src/app/core/services/api/reserva-periodo.service';
import { ReservaPeriodo } from 'src/app/core/models/reservaPeriodo.model';
import { EstudianteEscuelaService } from 'src/app/core/services/api/estudianteEscuela.service';
import { EstudianteEscuela } from 'src/app/core/models/EstudianteEscuela.model';
import { TicketComponent } from '../reports/ticket/ticket.component';
import { BookingPeriodoModalComponent } from '../../modals/modal-booking-school/modal-booking-school.component';

@Component({
  selector: 'app-booking-periodo',
  templateUrl: './booking-periodo.component.html',
  styleUrl: './booking-periodo.component.scss'
})
export class BookingPeriodoComponent implements OnInit {

  isSubmitting = false;
  
  breadCrumbItems!: Array<{}>;
  title = 'Escuelas Municipales';
  canActivate: string[];
  itemsList: any[] = [];
  viewMode: 'table' | 'cards' = 'table';
  userData!: any;

  loading: boolean = true;
  serverSidePagination: boolean = true;
  currentPage: number = 1;
  pageSize: number = 5;
  reservasList: any[] = [];
  temp: any[] = [];
  escuelasList: Organizacion[] = [];
  estudiantesList: EstudianteEscuela[] = [];
  contribuyente!: Contribuyente;

  dataSelected!: any;
  selectedItems: ReservaPeriodo[] = [];
  consultResults: any[] = [];

  searchResults: any;
  searchTerm: string = '';
  periodoFiltro: string = '';
  estadoValidacion: string = '';
  estadoReserva: string = '';
  escuelaFiltro: string = '';

  systemConfigList: { [key: string]: ConfiguracionSistema } = {};
  get HorasValidacionPago(): number | undefined {
    return this.systemConfigList[ClaveConfiguracion.HORAS_VALIDACION_PAGO]?.valorNumerico;
  }  
  periodosDisponibles: string[] = [];
  
  categoryList: Categoria[] = [];
  date!: { from: Date, to: Date };
  categoria: string = '';

  constructor(
    private authService: AuthenticationService,
    public service: PaginationService,
    public formBuilder: UntypedFormBuilder,
    private reservaPeriodoService: ReservaPeriodoService,
    private reservaService: ReservaService,
    private pagoService: PagoService,
    private organizacionesService: OrganizacionService,
    private estuduanteService: EstudianteEscuelaService,
    private ruatService: RuatRequestsService,
    public modalService: NgbModal,
    private router: Router,
    private categoriesService: CategoriasService,
  ) {
    this.canActivate = this.authService.hasPermission(this.title);
  }
  async ngOnInit() {
    this.breadCrumbItems = [
      { label: '' },
      { label: this.title, active: true }
    ];
    
    this.initializeColumns();
    this.systemConfigList = this.authService.getAllConfigs();
    
    const currentUser = this.authService.currentUser();
    if (this.authService.getUserRole() === 'Contribuyente') {
      this.contribuyente = currentUser;
      if (this.contribuyente.estadoUsuario !== EstadoUsuario.ACTIVO) {
        this.canActivate = ["VER"];
      }
    } else {
      this.userData = currentUser.designacion.personaDto;
    }    
    this.loadEscuelas();
    this.loadEstudiantes();
    if (!this.authService.isRuatAuthenticated()) {
      await this.delay(1000);
    }    
    await this.getReservations();
    this.generatePeriodosDisponibles();
    setInterval(() => this.getReservations(), 5 * 60 * 1000);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private initializeColumns(): void {
    this.itemsList = [
      { name: 'Estudiante', prop: 'reservaDto.estudianteEscuelaDto.nombreCompleto', visible: true, fallbackProp: 'nombreCompleto' },
      { name: 'Matrícula', prop: 'reservaDto.estudianteEscuelaDto.matricula', visible: true, fallbackProp: 'matricula' },
      { name: 'Escuela', prop: 'reservaDto.organizacionDto.nombre', visible: true, fallbackProp: 'nombre' },
      { name: 'Período', prop: 'periodoDisplay', visible: true, fallbackProp: 'periodoDisplay' },
      { name: 'Disciplina', prop: 'reservaDto.organizacionDto.disciplina', visible: true, fallbackProp: 'disciplina' },
      { name: 'Entrenador', prop: 'reservaDto.organizacionDto.entrenador', visible: false, fallbackProp: 'entrenador' },
      { name: 'Mes', prop: 'mes', visible: false, fallbackProp: 'mes' },
      { name: 'Año', prop: 'año', visible: false, fallbackProp: 'año' },
      { name: 'Monto', prop: 'reservaDto.montoTotal', currency: true, visible: true, fallbackProp: 'montoTotal' },
      { name: 'Estado Validación', prop: 'reservaDto.estadoValidacion', tag: true, visible: false, fallbackProp: 'estadoValidacion' },
      { name: 'Estado Reserva', prop: 'reservaDto.estadoReserva', tag: true, visible: true, fallbackProp: 'estadoReserva' },
      { name: 'Número Reserva', prop: 'reservaDto.numeroReserva', visible: false, fallbackProp: 'numeroReserva' },
      { name: 'Número Tasa', prop: 'reservaDto.numeroTasa', visible: false, fallbackProp: 'numeroTasa' },
      { name: 'Fecha Creación', prop: 'reservaDto.fechaCreacion', date: true, visible: false, fallbackProp: 'fechaCreacion' },
      { name: 'Observaciones', prop: 'reservaDto.observaciones', visible: false, fallbackProp: 'observaciones' },
    ];
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
  
  private generatePeriodosDisponibles(): void {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;    
    this.periodosDisponibles = [];    
    for (let i = -6; i <= 6; i++) {
      const year = currentYear + Math.floor((currentMonth + i - 1) / 12);
      const month = ((currentMonth + i - 1) % 12 + 12) % 12 + 1;
      const periodo = `${year}-${month.toString().padStart(2, '0')}`;
      this.periodosDisponibles.push(periodo);
    }
  }

  getPeriodoDisplay(periodo: string): string {
    const [year, month] = periodo.split('-');
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  }
  getPeriodoDisplayForReserva(item: any): string {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${monthNames[item.mes - 1]} ${item.año}`;
  }

  applyFilters() {
    if (!this.temp || this.temp.length === 0) return;
    
    this.reservasList = this.temp.filter(item => {
      const searchMatch = !this.searchTerm || this.searchInReservaPeriodo(item, this.searchTerm);
      const periodoMatch = !this.periodoFiltro || this.matchesPeriodo(item, this.periodoFiltro);
      const estadoValidacionMatch = !this.estadoValidacion || item.reservaDto?.estadoValidacion === this.estadoValidacion;
      const estadoReservaMatch = !this.estadoReserva || item.reservaDto?.estadoReserva === this.estadoReserva;
      const escuelaMatch = !this.escuelaFiltro || item.reservaDto?.organizacionDto?.uuid === this.escuelaFiltro;
      
      return searchMatch && periodoMatch && estadoValidacionMatch && estadoReservaMatch && escuelaMatch;
    });
  }

  private searchInReservaPeriodo(item: any, searchTerm: string): boolean {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    if (item.reservaDto?.estudianteEscuelaDto?.nombreCompleto?.toLowerCase().includes(term) ||
        item.reservaDto?.estudianteEscuelaDto?.matricula?.toLowerCase().includes(term) ||
        item.reservaDto?.estudianteEscuelaDto?.numeroDocumento?.toLowerCase().includes(term)) {
      return true;
    }
    if (item.reservaDto?.organizacionDto?.nombre?.toLowerCase().includes(term) ||
        item.reservaDto?.organizacionDto?.disciplina?.toLowerCase().includes(term)) {
      return true;
    }
    if (item.reservaDto?.numeroReserva?.toLowerCase().includes(term) ||
        item.reservaDto?.numeroTasa?.toLowerCase().includes(term) ||
        item.reservaDto?.montoTotal?.toString().includes(term)) {
      return true;
    }
    const periodoDisplay = this.getPeriodoDisplayForReserva(item);
    if (periodoDisplay.toLowerCase().includes(term)) {
      return true;
    }    
    return false;
  }

  private matchesPeriodo(item: any, periodo: string): boolean {
    const reservaPeriodo = `${item.año}-${item.mes.toString().padStart(2, '0')}`;
    return reservaPeriodo === periodo;
  }

  onNavChange(changeEvent: NgbNavChangeEvent) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;    
    switch (changeEvent.nextId) {
      case 0: // Todas
        this.reservasList = this.temp;
        break;
      case 1: // Pendientes de Pago
        this.reservasList = this.temp.filter(item => 
          item.reservaDto?.estadoReserva === 'PENDIENTE'
        );
        break;
      case 2: // Pagadas
        this.reservasList = this.temp.filter(item => 
          item.reservaDto?.estadoReserva === 'PAGADA'
        );
        break;
      case 3: // Vencidas
        this.reservasList = this.temp.filter(item => 
          item.reservaDto?.estadoReserva === 'PENDIENTE' &&
          new Date(item.fechaPago) < currentDate
        );
        break;
      case 4: // Este Mes
        this.reservasList = this.temp.filter(item => 
          item.mes === currentMonth && 
          item.año === currentYear
        );
        break;
    }
  }

  public showTicket(data: any) {
    const modalRef = this.modalService.open(TicketComponent, { 
      size: 'lg',
      windowClass: 'ticket-modal'
    });
    modalRef.componentInstance.bookingType = 'periodo'
    modalRef.componentInstance.reservationData = data.reservaDto;
    modalRef.componentInstance.showAsModal = true;
    modalRef.componentInstance.autoLoad = true;
  }

  // public agregarReserva() {
  //   this.router.navigate(['/reservations/details'], { 
  //     state: { 
  //       tipoReserva: 'periodo'
  //     } 
  //   });
  // }
  generarNuevaMensualidad(): void {
    if (this.escuelasList.length === 0) {
      Swal.fire({
        title: 'No hay escuelas disponibles',
        text: 'No se encontraron escuelas municipales registradas en el sistema.',
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
      return;
    }
    const modalRef = this.modalService.open(BookingPeriodoModalComponent, {
      size: 'lg',
      centered: true,
      backdrop: 'static'
    });
    modalRef.componentInstance.accion = '';
    modalRef.componentInstance.estudiantes = this.estudiantesList;
    modalRef.componentInstance.reservaGenerada.subscribe((reserva: Reserva) => {
      this.procesarReservaGenerada(reserva);
    });
  }

  private async procesarReservaGenerada(reserva: Reserva): Promise<void> {
    try {
      this.loading = true;
      const response: any = await this.reservaService.create(reserva).toPromise();
      
      if (response.status === 'OK') {
        Swal.fire({
          title: '¡Mensualidad Generada!',
          text: 'La reserva de período se ha generado exitosamente',
          icon: 'success',
          confirmButtonText: 'Aceptar'
        });
        await this.getReservations();
      } else {
        throw new Error(response.message || 'Error al guardar la reserva');
      }
    } catch (error) {
      console.error('Error generating reservation:', error);
      Swal.fire({
        title: 'Error',
        text: 'No se pudo generar la mensualidad. Por favor, intente nuevamente.',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    } finally {
      this.loading = false;
    }
  }

  public openModal(data: any | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(BookingPeriodoModalComponent, {
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

  async consultModal(data: any, content: any, size: string) {
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
          console.error("Error during consultation for item:", error);
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
        this.getReservations();
      }
    }
  }

  /* API RUAT Services */
  private async consultData(item: ReservaPeriodo): Promise<any> {
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
          hasPayment: false,
          shouldNotUpdate: true 
        };
      }      
      const payload = resp.payload;
      if (!payload.continuarFlujo) {
        return { 
          item, 
          text: payload.mensaje || payload.observacion || "No se puede continuar con el flujo", 
          type: 'warning',
          hasPayment: false,
          shouldNotUpdate: true
        };
      }
      if (!payload.pagoTasa) {
        return { 
          item, 
          text: payload.mensaje || payload.observacion || "No se encontraron datos de pago", 
          type: 'info',
          hasPayment: false,
          shouldNotUpdate: true
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
            item.reservaDto = updatedReserva;
            
            return { 
              item: item, 
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
              hasPayment: true,
              shouldNotUpdate: true
            };
          }
        } catch (error) {
          console.error('Error saving pago:', error);
          return { 
            item, 
            text: 'Error al procesar el pago', 
            type: 'error',
            hasPayment: true,
            shouldNotUpdate: true
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
        hasPayment: false,
        shouldNotUpdate: true
      };
    }
  }
  private async checkAndUpdateReservationStatuses(reservas: ReservaPeriodo[]): Promise<ReservaPeriodo[]> {
    const updatePromises = reservas.map(async (reserva) => {
      if (!reserva.reservaDto) return reserva;
      const reservaDto = reserva.reservaDto;      
      try {
        if (reservaDto.estadoReserva === EstadoReserva.PENDIENTE) {
          const consultResult = await this.consultData(reserva);
          if (!consultResult.hasPayment) {
            if (this.isPaymentPeriodExpired(reserva)) {
              return await this.handleExpiredPendingReservation(reserva);
            }
          } else {
            return consultResult.item;
          }
        }
        if (reservaDto.estadoReserva === EstadoReserva.PAGADA && this.isUsageDatePassed(reserva)) {
          return await this.handleCompletedReservation(reserva);
        }
        return reserva;
      } catch (error) {
        return reserva;
      }
    });    
    return await Promise.all(updatePromises);
  }
  private isPaymentPeriodExpired(reserva: ReservaPeriodo): boolean {
    let horasValidacion = this.HorasValidacionPago;
    if (!horasValidacion) {
      console.warn('HorasValidacionPago not configured, using default 24 hours');
      horasValidacion = 24
    }    
    if (!reserva.reservaDto?.fechaCreacion) return false;    
    const fechaCreacion = new Date(reserva.reservaDto.fechaCreacion);
    const currentDate = new Date();
    const expirationDate = new Date(fechaCreacion);
    expirationDate.setHours(expirationDate.getHours() + horasValidacion);    
    return currentDate > expirationDate;
  }
  private isUsageDatePassed(reserva: ReservaPeriodo): boolean {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    if (reserva.año < currentYear) {
      return true;
    } else if (reserva.año === currentYear && reserva.mes < currentMonth) {
      return true;
    }    
    return false;
  }
  private async handleCompletedReservation(reserva: ReservaPeriodo): Promise<ReservaPeriodo> {
    const updatedReservaDto: any = {
      ...reserva.reservaDto,
      estadoReserva: EstadoReserva.COMPLETADA,
      fechaActualizacion: new Date()
    };    
    const updatedReserva = await this.reservaService.update(updatedReservaDto).toPromise();
    reserva.reservaDto = updatedReserva;
    return reserva;
  }
  private async handleExpiredPendingReservation(reserva: ReservaPeriodo): Promise<ReservaPeriodo> {
    const codigoAlcaldia = this.systemConfigList[ClaveConfiguracion.CODIGO_ALCALDIA_RUAT]?.valorTexto || 'QUI';
    const codigoUsuario = this.systemConfigList[ClaveConfiguracion.CODIGO_USUARIO_RUAT]?.valorTexto || '';
    if (reserva.reservaDto?.numeroTasa) {
      try {
        const requestData = {
          numeroTasa: reserva.reservaDto.numeroTasa,
          motivo: "NO SE EFECTUO EL PAGO EN EL DIA DE REGISTRO",
          observacion: "ANULADO AUTOMATICO, VENCIDO PLAZO DE RESERVA"
        };        
        await this.ruatService.cancelTasa(codigoAlcaldia, codigoUsuario, requestData).toPromise();
      } catch (error) {
        console.warn('Failed to cancel tasa in RUAT for expired period reservation:', error);
        return reserva;
      }
    }
    const updatedReservaDto: any = {
      ...reserva.reservaDto,
      estadoReserva: EstadoReserva.EXPIRADA,
      motivoRechazo: "NO SE EFECTUO EL PAGO EN EL DIA DE REGISTRO",
      fechaRechazo: new Date()
    };    
    const updatedReserva = await this.reservaService.update(updatedReservaDto).toPromise();
    reserva.reservaDto = updatedReserva;
    return reserva;
  }
  private showExpiredReservationsMessage(count: number): void {
    Swal.fire({
      title: 'Reservas Expiradas',
      text: `${count} reserva(s) pendiente(s) han expirado por falta de pago y han sido actualizadas automáticamente.`,
      icon: 'info',
      confirmButtonText: 'Entendido',
      timer: 5000,
      timerProgressBar: true
    });
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

  private loadEscuelas() {
    this.organizacionesService.getAll().subscribe({
      next: (data: any) => {
        this.loading = false;
        if (data['status'] === 'OK') {
          this.escuelasList = data.payload.content || data.payload;
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error loading organizations:', error);
        Swal.fire({ text: 'Error al obtener las organizaciones', icon: 'error', confirmButtonColor: '#299cdb' });
      }
    });
  }

  private loadEstudiantes() {
    this.estuduanteService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.estudiantesList = data.payload.content || data.payload;
        }
      },
      error: (error) => {
        Swal.fire({ text: 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb' });
      }
    });
  }
  private async getReservations() {
    try {
      this.loading = true;
      const data: any = await this.reservaPeriodoService.getAll().toPromise();      
      if (data && data['status'] === 'OK') {
        let list: ReservaPeriodo[] = [];        
        if (Array.isArray(data.payload)) {
          list = data.payload;
        } else if (data.payload && Array.isArray(data.payload.content)) {
          list = data.payload.content;
        } else {
          list = [];
        }        
        if (this.contribuyente) {
          list = list.filter((item: any) => 
            item.reservaDto?.contribuyenteDto?.uuid === this.contribuyente.uuid
          );
        }        
        const employee = this.authService.staff();
        if (employee) {
          list = list.filter((item: any) => 
            item.reservaDto?.campoDeportivoDto?.complejoDto?.uuid === employee.complejoDto?.uuid
          );
        }   
        const updatedList = await this.checkAndUpdateReservationStatuses(list);        
        const newlyExpiredCount = updatedList.filter(item => 
          item.reservaDto?.estadoReserva === EstadoReserva.EXPIRADA && 
          list.find(originalItem => 
            originalItem.reservaDto?.uuid === item.reservaDto?.uuid && 
            originalItem.reservaDto?.estadoReserva === EstadoReserva.PENDIENTE
          )
        ).length;        
        this.reservasList = updatedList.map(item => ({
          ...item,
          periodoDisplay: this.getPeriodoDisplayForReserva(item)
        }));        
        this.temp = this.reservasList;        
        if (newlyExpiredCount > 0) {
          this.showExpiredReservationsMessage(newlyExpiredCount);
        }
      } else {
        this.reservasList = [];
        this.temp = [];
      }
    } catch (error) {
      console.error('Error fetching reservas:', error);
      Swal.fire({ 
        text: 'Error al obtener las reservas', 
        icon: 'error', 
        confirmButtonColor: '#299cdb' 
      });
      this.reservasList = [];
      this.temp = [];
    } finally {
      this.loading = false;
    }
  }
  
  onPageChange(page: number): void {
    this.currentPage = page;
    this.getReservations();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.getReservations();
  }

  clearFilters() {
    this.searchTerm = '';
    this.date = { from: null!, to: null! };
    this.estadoValidacion = '';
    this.estadoReserva = '';
    this.escuelaFiltro = '';
    this.periodoFiltro = '';
    this.applyFilters();
  }

  // Csv File Export
  csvFileExport() {
    const lista = this.selectedItems.flatMap((item: any) => {
      const baseData = {
        estudiante: item.reservaDto?.estudianteEscuelaDto?.nombreCompleto || '-',
        matricula: item.reservaDto?.estudianteEscuelaDto?.matricula || '-',
        escuela: item.reservaDto?.organizacionDto?.nombre || '-',
        periodo: this.getPeriodoDisplayForReserva(item),
        disciplina: item.reservaDto?.organizacionDto?.disciplina || '-',
        entrenador: item.reservaDto?.organizacionDto?.entrenador || '-',
        mes: item.mes || '-',
        año: item.año || '-',
        montoTotal: item.reservaDto?.montoTotal || '-',
        estadoValidacion: item.reservaDto?.estadoValidacion || '-',
        estadoReserva: item.reservaDto?.estadoReserva || '-',
        numeroReserva: item.reservaDto?.numeroReserva || '-',
        numeroTasa: item.reservaDto?.numeroTasa || '-',
        fechaCreacion: item.reservaDto?.fechaCreacion ? new Date(item.reservaDto.fechaCreacion).toLocaleDateString() : '-',
        fechaPago: item.fechaPago ? new Date(item.fechaPago).toLocaleDateString() : '-',
        complejo: item.reservaDto?.campoDeportivoDto?.complejoDto?.nombre || '-',
        campoDeportivo: item.reservaDto?.campoDeportivoDto?.nombre || '-'
      };      
      return [{ ...baseData }];
    });
    
    const data = {
      fieldSeparator: ',',
      quoteStrings: '"',
      decimalseparator: '.',
      showLabels: true,
      showTitle: true,
      title: 'Lista de Mensualidades - Escuelas Municipales',
      useBom: true,
      noDownload: false,
      headers: [
        "Estudiante", "Matrícula", "Escuela", "Período", "Disciplina", "Entrenador",
        "Mes", "Año", "Monto Total", "Estado Validación", "Estado Reserva",
        "Número Reserva", "Número Tasa", "Fecha Creación", "Fecha Pago",
        "Complejo", "Campo Deportivo"
      ]
    };
    new ngxCsv(lista, `Mensualidades_Escuelas_${new Date().toISOString().split('T')[0]}`, data);
  }
}