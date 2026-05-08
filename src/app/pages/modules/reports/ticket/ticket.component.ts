import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgbDropdownModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { FlatpickrModule } from 'angularx-flatpickr';
import Swal from 'sweetalert2';
import emailjs from 'emailjs-com';

import { ReportsService } from 'src/app/core/services/api/reportes.service';
import { GlobalComponent } from 'src/app/global-component';
import { Reserva } from 'src/app/core/models/reserva.model';
import { environment } from 'src/environments/environment';
import { BookingType } from 'src/app/core/constants/Features';
import { AuthenticationService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-ticket',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbDropdownModule,
    TranslateModule,
    FlatpickrModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './ticket.component.html',
  styleUrls: ['./ticket.component.scss']
})
export class TicketComponent implements OnChanges {
  @Input() bookingType: BookingType = 'puntual';
  @Input() reservationData!: Reserva;
  @Input() autoLoad: boolean = false;
  @Input() showAsModal: boolean = false;

  currentTime!: string;
  contribuyente: any;
  showLoading = false;
  errorMessage: string = '';
  sendingEmail = false;
  
  @ViewChild('pdfViewer') pdfViewer!: ElementRef;

  constructor(
    private modalService: NgbModal,
    private reportsService: ReportsService,
    private route: ActivatedRoute,
        private authService: AuthenticationService
    ) {}
    
  async ngOnInit(): Promise<void> { 
    this.currentTime = (new Date()).toLocaleTimeString();   
    if (this.authService.tokenUser() !== 'CONTRIBUYENTE_SESSION') {
        this.contribuyente = this.authService.currentUser();
    } else {    
      this.contribuyente = null;
    }
    if (this.autoLoad && this.reservationData?.uuid) {
      this.loadTicket();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reservationData'] && this.autoLoad && this.reservationData?.uuid) {
      this.loadTicket();
    }
  }

  async loadTicket(): Promise<void> {
    if (!this.reservationData?.uuid) {
      this.errorMessage = 'No hay datos de reserva disponibles para generar el ticket.';
      return;
    }
    this.showLoading = true;
    this.errorMessage = '';
    try {
      await this.generarReportePDF(this.reservationData);
    } catch (error) {
      this.errorMessage = 'Error al cargar el ticket. Por favor, intente nuevamente.';
      this.showLoading = false;
    }
  }

  private async generarReportePDF(reserva: any) {
    let observable;
    if (reserva.tipoReserva === 'periodo') {
          observable = this.reportsService.getTicketByPeriodo(reserva.uuid);
    } else if (reserva.tipoReserva === 'puntual') {
      switch (reserva.tarifaDto?.tipoCobro) {
        case 'por_evento':
          observable = this.reportsService.getTicketReservaEvento(reserva.uuid);
          break;
        case 'por_persona':
          observable = this.reportsService.getTicketReservaPersona(reserva.uuid);
          break;
        default:
          observable = this.reportsService.getTicketReservaPuntual(reserva.uuid);
      }
    } else if (reserva.tipoReserva === 'recurrente') {
      switch (reserva.tarifaDto?.tipoCobro) {
        case 'por_sesion':
          observable = this.reportsService.getTicketRecurrenteSesion(reserva.uuid);
          break;
        case 'mensualidad':
          observable = this.reportsService.getTicketRecurrenteMensualidad(reserva.uuid);
          break;
        case 'por_persona':
          observable = this.reportsService.getTicketRecurrentePersona(reserva.uuid);
          break;
        default:
          observable = this.reportsService.getTicketRecurrenteSesion(reserva.uuid);
      }
    } else {
      observable = this.reportsService.getTicketReservaPuntual(reserva.uuid);
    }
    observable.subscribe({
      next: (data: ArrayBuffer) => {
        const blob = new Blob([data], { type: 'application/pdf' });
        const fileURL = URL.createObjectURL(blob);
        if (this.pdfViewer?.nativeElement) {
          this.pdfViewer.nativeElement.data = fileURL;
        }        
        this.showLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Error al generar el ticket PDF.';
        this.showLoading = false;
      }
    });
  }

  downloadTicket(): void {
    if (!this.reservationData.uuid) {
      this.errorMessage = 'No hay datos de reserva para descargar.';
      return;
    }
    const filename = `ticket_${this.reservationData.numeroReserva || this.reservationData.uuid}.pdf`;
    let observable;
    if (this.reservationData.tipoReserva === 'periodo') {
      observable = this.reportsService.getTicketByPeriodo(this.reservationData.uuid);
    } else if (this.reservationData.tipoReserva === 'puntual' && this.reservationData.uuid) {
      switch (this.reservationData.tarifaDto?.tipoCobro) {
        case 'por_evento':
          observable = this.reportsService.getTicketReservaEvento(this.reservationData.uuid);
          break;
        case 'por_persona':
          observable = this.reportsService.getTicketReservaPersona(this.reservationData.uuid);
          break;
        default:
          observable = this.reportsService.getTicketReservaPuntual(this.reservationData.uuid);
      }
    } else if (this.reservationData.tipoReserva === 'recurrente') {
      switch (this.reservationData.tarifaDto?.tipoCobro) {
        case 'por_sesion':
          observable = this.reportsService.getTicketRecurrenteSesion(this.reservationData.uuid);
          break;
        case 'mensualidad':
          observable = this.reportsService.getTicketRecurrenteMensualidad(this.reservationData.uuid);
          break;
        case 'por_persona':
          observable = this.reportsService.getTicketRecurrentePersona(this.reservationData.uuid);
          break;
        default:
          observable = this.reportsService.getTicketRecurrenteSesion(this.reservationData.uuid);
      }
    } else {
      observable = this.reportsService.getTicketReservaPuntual(this.reservationData.uuid);
    }

    this.reportsService.downloadPdf(observable, filename);
  }

  async sendTicketByEmail(): Promise<void> {
    this.sendingEmail = true;
    try {
      const templateParams = await this.prepareEmailData();      
      const response = await emailjs.send(
        environment.EmailJS.idServiceReservation,
        environment.EmailJS.idTemplateReservation,
        templateParams,
        environment.EmailJS.publicKeyReservation
      );
      if (response.status === 200) {
        this.notify('Ticket enviado por email exitosamente', 'success');
      } else {
        throw new Error(`EmailJS responded with status ${response.status}`);
      }
    } catch (error: any) {
      this.handleEmailError(error);
    } finally {
      this.sendingEmail = false;
    }
  }

  private async prepareEmailData(): Promise<any> {
    const reserva = this.reservationData;
    const contribuyente = reserva.contribuyenteDto;
    const campoDeportivo = reserva.campoDeportivoDto;
    const tarifa = reserva.tarifaDto;
    const organizacion = reserva.organizacionDto;
    const ticketUrl = this.generateTicketUrl(reserva);
    const scheduleInfo = this.getScheduleInformation(reserva);

    return {
      subject: `Ticket de Reserva - ${campoDeportivo?.nombre}`,
      to_email: contribuyente?.email,
      cc_email: organizacion?.email || '',
      bcc_email: '',
      send_date: this.formatDate(new Date()),

      reserva_number: reserva.numeroReserva,
      tasa_number: reserva.numeroTasa,
      estado_reserva: reserva.estadoReserva,
      tipo_reserva: this.getTipoReservaText(reserva.tipoReserva),
      observaciones: this.getObservaciones(reserva),
      requiere_aprobacion: campoDeportivo?.requiereAprobacion ? 'Sí' : 'No',
      is_puntual: reserva.tipoReserva === 'puntual',
      is_recurrente: reserva.tipoReserva === 'recurrente',
      has_organization: !!organizacion,

      contribuyente_name: contribuyente?.nombreCompleto || 
                         `${contribuyente?.nombre} ${contribuyente?.primerApellido} ${contribuyente?.segundoApellido}`,
      contribuyente_document: contribuyente?.numeroDocumento,
      contribuyente_phone: contribuyente?.telefono,
      contribuyente_email: contribuyente?.email,
      organizacion_name: organizacion?.nombre || 'N/A',
      organizacion_telefono: organizacion?.telefono || 'N/A',
      organizacion_nit: organizacion?.nroNit || 'N/A',
      complejo_name: campoDeportivo?.complejoDto?.nombre,
      campo_deportivo: campoDeportivo?.nombre,
      superficie: this.getSuperficie(reserva),
      categoria: this.getCategoria(reserva),

      ...scheduleInfo,

      tipo_cobro: this.formatTipoCobro(tarifa?.tipoCobro),
      tarifa_descripcion: tarifa?.descripcion || 'Tarifa estándar',
      monto_total: `Bs. ${reserva.montoTotal}`,
      duracion_total: this.getDuracionTotal(reserva),

      phone_contact: GlobalComponent.admin_deportes.phone,
      email_contact: GlobalComponent.admin_deportes.email,
      address_contact: GlobalComponent.admin_deportes.address,

      ticket_url: ticketUrl,
      ticket_download_text: 'Descargar Ticket PDF',
      logo_url: `${environment.assetsUrl}/assets/icons/logos/logo-sm.png`,
      regulations_url: `${environment.assetsUrl}/pages/terms-condition`,
    };
  }

  private generateTicketUrl(reserva: any): string {
    console.log('Generando URL para ticket con reserva:', reserva);
    const baseUrl = environment.backendUrl;
    let endpoint = '';
    if (reserva.tipoReserva === 'periodo') {
      endpoint = '/reporte/ticket-mensual';
    } else if (reserva.tipoReserva === 'puntual') {
      switch (reserva.tarifaDto?.tipoCobro) {
        case 'por_evento':
          endpoint = '/reporte/ticket-reser-ev';
          break;
        case 'por_persona':
          endpoint = '/reporte/ticket-reser-per';
          break;
        default:
          endpoint = '/reporte/ticket-reservap';
      }
    } else {
      switch (reserva.tarifaDto?.tipoCobro) {
        case 'por_sesion':
          endpoint = '/reporte/ticket-recuses';
          break;
        case 'mensualidad':
          endpoint = '/reporte/ticket-recumes';
          break;
        case 'por_persona':
          endpoint = '/reporte/ticket-recuper';
          break;
        default:
          endpoint = '/reporte/ticket-recuses';
      }
    }
    return `${baseUrl}${endpoint}?uuid=${reserva.uuid}`;
  }

  private getScheduleInformation(reserva: any): any {
    if (reserva.tipoReserva === 'puntual') {
      const puntual = reserva.reservaPuntualDto;
      return {
        fecha_uso: this.formatDate(new Date(puntual?.fechaUso)),
        hora_inicio: puntual?.horaInicio,
        hora_fin: puntual?.horaFin,
        duracion_horas: puntual?.duracionHoras,
        cantidad_personas: puntual?.cantidadPersonas
      };
    } else if (reserva.tipoReserva === 'periodo') {
      const periodo = reserva.reservaPeriodoDto;
      return {
        fecha_inicio: this.formatDate(new Date(periodo?.fechaInicio)),
        fecha_fin: this.formatDate(new Date(periodo?.fechaFin)),
        dias_semana: this.formatDiasSemana(periodo?.diasSemana),
        duracion_sesion: periodo?.duracionSesionHoras,
        cantidad_sesiones: periodo?.cantidadSesiones,
        cantidad_personas: periodo?.cantidadPersonas
      };
    } else {
      const recurrente = reserva.reservaRecurrenteDto;
      return {
        fecha_inicio: this.formatDate(new Date(recurrente?.fechaInicio)),
        fecha_fin: this.formatDate(new Date(recurrente?.fechaFin)),
        dias_semana: this.formatDiasSemana(recurrente?.diasSemana),
        duracion_sesion: recurrente?.duracionSesionHoras,
        cantidad_sesiones: recurrente?.cantidadSesiones,
        cantidad_personas: recurrente?.cantidadPersonas
      };
    }
  }
  private getSuperficie(reserva: any): string {
    if (reserva.tipoReserva === 'puntual') {
      return reserva.reservaPuntualDto?.superficie || 'N/A';
    } else if (reserva.tipoReserva === 'periodo') {
      return reserva.reservaPeriodoDto?.superficie || 'N/A';
    } else {
      return reserva.reservaRecurrenteDto?.superficie || 'N/A';
    }
  }
  private getCategoria(reserva: any): string {
    if (reserva.tipoReserva === 'puntual') {
      return reserva.reservaPuntualDto?.categoria || 'N/A';
    } else if (reserva.tipoReserva === 'periodo') {
      return reserva.reservaPeriodoDto?.categoria || 'N/A';
    } else {
      return reserva.reservaRecurrenteDto?.categoria || 'N/A';
    }
  }
  private getDuracionTotal(reserva: any): string {
    if (reserva.tipoReserva === 'puntual') {
      return `${reserva.reservaPuntualDto?.duracionHoras || 0} horas`;
    } else if (reserva.tipoReserva === 'periodo') {
      const periodo = reserva.reservaPeriodoDto;
      return `${periodo?.cantidadSesiones || 0} sesiones de ${periodo?.duracionSesionHoras || 0} horas cada una`;
    } else {
      const recurrente = reserva.reservaRecurrenteDto;
      return `${recurrente?.cantidadSesiones || 0} sesiones de ${recurrente?.duracionSesionHoras || 0} horas cada una`;
    }
  }
  private getObservaciones(reserva: any): string {
    if (reserva.tipoReserva === 'puntual') {
      return reserva.reservaPuntualDto?.observaciones || 'Ninguna';
    } else if (reserva.tipoReserva === 'periodo') {
      return reserva.reservaPeriodoDto?.observaciones || 'Ninguna';
    } else {
      return reserva.reservaRecurrenteDto?.observaciones || 'Ninguna';
    }
  }

  private getTipoReservaText(tipoReserva: string): string {
    const mapping: { [key: string]: string } = {
      puntual: 'Puntual',
      recurrente: 'Recurrente',
      periodo: 'Periodo'
    };
    return mapping[tipoReserva] || tipoReserva;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private formatDiasSemana(diasSemana: string): string {
    if (!diasSemana) return 'N/A';    
    const diasMap: { [key: string]: string } = {
      'LUN': 'Lunes',
      'MAR': 'Martes',
      'MIE': 'Miércoles',
      'JUE': 'Jueves',
      'VIE': 'Viernes',
      'SAB': 'Sábado',
      'DOM': 'Domingo'
    };    
    return diasSemana.split(',').map(dia => diasMap[dia.trim()] || dia.trim()).join(', ');
  }
  formatTipoCobro(tipoCobro: string): string {
    const mapping: { [key: string]: string } = {
      'por_hora': 'Por Hora',
      'por_persona': 'Por Persona',
      'por_evento': 'Por Evento',
      'por_sesion': 'Por Sesión',
      'mensualidad': 'Mensualidad',
      'por_club': 'Por Club'
    };    
    return mapping[tipoCobro] || tipoCobro;
  }
  getReservationTypeText(): string {
    if (!this.reservationData) return '';    
    const tipoReserva = this.getTipoReservaText(this.reservationData.tipoReserva);
    const tipoCobro = this.reservationData.tarifaDto?.tipoCobro || 'No especificado';
    return `${tipoReserva} - ${this.formatTipoCobro(tipoCobro)}`;
  }
  private handleEmailError(error: any): void {
    if (error?.status === 429) {
      this.notify('Límite de envíos de email alcanzado. Por favor intente más tarde.', 'error');
    } else if (error?.status === 400) {
      this.notify('Error en la configuración del email. Verifique los datos.', 'error');
    } else {
      this.notify('Error inesperado al enviar el email: ' + error.message, 'error');
    }
  }

  private notify(message: string, type: any): void {
    Swal.fire({
      title: message,
      icon: type,
      timer: 4000,
      timerProgressBar: true,
      showConfirmButton: false
    });
  }

  closeModal(): void {
    if (this.showAsModal) {
      this.modalService.dismissAll()
    }
  }
}
