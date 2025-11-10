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
import { ReservaPuntualService } from 'src/app/core/services/api/reserva-puntual.service';
import { ReservaPuntual } from 'src/app/core/models/reservaPuntual.models';
import { EstadoPago, EstadoReserva, EstadoUsuario } from 'src/app/core/constants/Estados';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { ConfiguracionSistemaService } from 'src/app/core/services/api/configuracionSistema.service';
import { Reserva } from 'src/app/core/models/reserva.models';
import { TicketComponent } from '../../reports/ticket/ticket.component';
import { Categoria } from 'src/app/core/models/categoria.model';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { Pago } from 'src/app/core/models/pago.model';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';
import { Organizacion } from 'src/app/core/models/organizacion.models';
import { OrganizacionService } from 'src/app/core/services/api/organizacion.service';
import { ReservaPeriodoService } from 'src/app/core/services/api/reserva-periodo.service';
import { BookingPeriodoModalComponent } from '../modal/modal.component';
import { ReservaPeriodo } from 'src/app/core/models/reservaPeriodo.models';
import { EstudianteEscuelaService } from 'src/app/core/services/api/estudianteEscuela.service';
import { EstudianteEscuela } from 'src/app/core/models/EstudianteEscuela.model';

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

  searchResults: any;
  searchTerm: string = '';
  periodoFiltro: string = '';
  estadoValidacion: string = '';
  estadoReserva: string = '';
  escuelaFiltro: string = '';

  systemConfigList: { [key: string]: ConfiguracionSistema } = {};
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
    
    this.authRuat();
    await this.getReservations();
    this.generatePeriodosDisponibles();
    
    setInterval(() => this.getReservations(), 5 * 60 * 1000);
  }

  private initializeColumns(): void {
    this.itemsList = [
      { name: 'Estudiante', prop: 'reservaDto.estudianteEscuelaDto.nombreCompleto', visible: true, fallbackProp: 'nombreCompleto' },
      { name: 'Matrícula', prop: 'reservaDto.estudianteEscuelaDto.matricula', visible: true, fallbackProp: 'matricula' },
      { name: 'Escuela', prop: 'reservaDto.organizacionDto.nombre', visible: true, fallbackProp: 'nombre' },
      { name: 'Período', prop: 'periodoDisplay', visible: true, fallbackProp: 'periodoDisplay' },
      { name: 'Disciplina', prop: 'reservaDto.organizacionDto.disciplina', visible: true, fallbackProp: 'disciplina' },
      { name: 'Entrenador', prop: 'reservaDto.organizacionDto.entrenador', visible: true, fallbackProp: 'entrenador' },
      { name: 'Mes', prop: 'mes', visible: false, fallbackProp: 'mes' },
      { name: 'Año', prop: 'año', visible: false, fallbackProp: 'año' },
      { name: 'Monto', prop: 'reservaDto.montoTotal', currency: true, visible: true, fallbackProp: 'montoTotal' },
      { name: 'Estado Validación', prop: 'reservaDto.estadoValidacion', tag: true, visible: true, fallbackProp: 'estadoValidacion' },
      { name: 'Estado Reserva', prop: 'reservaDto.estadoReserva', tag: true, visible: true, fallbackProp: 'estadoReserva' },
      { name: 'Número Reserva', prop: 'reservaDto.numeroReserva', visible: false, fallbackProp: 'numeroReserva' },
      { name: 'Número Tasa', prop: 'reservaDto.numeroTasa', visible: false, fallbackProp: 'numeroTasa' },
      { name: 'Fecha Creación', prop: 'reservaDto.fechaCreacion', date: true, visible: false, fallbackProp: 'fechaCreacion' },
      { name: 'Observaciones', prop: 'reservaDto.observaciones', visible: false, fallbackProp: 'observaciones' },
    ];
  }

  // New method to generate periodos disponibles
  private generatePeriodosDisponibles(): void {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    this.periodosDisponibles = [];
    
    // Generate last 6 months and next 6 months
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

  // Helper method to get periodo display for a reservaPeriodo item
  getPeriodoDisplayForReserva(item: any): string {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${monthNames[item.mes - 1]} ${item.año}`;
  }

  selectedItems: ReservaPuntual[] = [];
  consultResults: any[] = [];
  getSelectedItems(items: any[]) {
    this.selectedItems = items;
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
    
    // Search in student information
    if (item.reservaDto?.estudianteEscuelaDto?.nombreCompleto?.toLowerCase().includes(term) ||
        item.reservaDto?.estudianteEscuelaDto?.matricula?.toLowerCase().includes(term) ||
        item.reservaDto?.estudianteEscuelaDto?.numeroDocumento?.toLowerCase().includes(term)) {
      return true;
    }
    
    // Search in school information
    if (item.reservaDto?.organizacionDto?.nombre?.toLowerCase().includes(term) ||
        item.reservaDto?.organizacionDto?.disciplina?.toLowerCase().includes(term)) {
      return true;
    }
    
    // Search in reservation information
    if (item.reservaDto?.numeroReserva?.toLowerCase().includes(term) ||
        item.reservaDto?.numeroTasa?.toLowerCase().includes(term) ||
        item.reservaDto?.montoTotal?.toString().includes(term)) {
      return true;
    }
    
    // Search in period information
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

  // New method to generate new monthly payment
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

    // For now, use the first school - you might want to let the user choose
    const escuelaSeleccionada = this.escuelasList[0];
    
    modalRef.componentInstance.organizacion = escuelaSeleccionada;
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

  private async getReservations(page: number = 0, size: number = 20) {
    try {
      this.loading = true;
      const data: any = await this.reservaPeriodoService.getAll().toPromise();      
      if (data && data['status'] === 'OK') {
        console.log('API Response:', data);
        let list: ReservaPeriodo[] = [];        
        // The API returns data.payload as an array directly
        if (Array.isArray(data.payload)) {
          list = data.payload;
        } else if (data.payload && Array.isArray(data.payload.content)) {
          list = data.payload.content;
        } else {
          list = [];
        }        
        console.log('Processed list:', list);

        // Filter by contribuyente if needed
        if (this.contribuyente) {
          list = list.filter((item: any) => 
            item.reservaDto?.contribuyenteDto?.uuid === this.contribuyente.uuid
          );
        }

        // Filter by employee assignment if needed
        const assignaments = localStorage.getItem("assignaments");
        const employee = assignaments ? JSON.parse(assignaments) : null;
        if (employee) {
          list = list.filter((item: any) => 
            item.reservaDto?.campoDeportivoDto?.complejoDto?.uuid === employee.complejoDto?.uuid
          );
        }
        
        // Add periodoDisplay to each item for easier display
        this.reservasList = list.map(item => ({
          ...item,
          periodoDisplay: this.getPeriodoDisplayForReserva(item)
        }));
        
        this.temp = this.reservasList;
        console.log('Final reservasList:', this.reservasList);
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