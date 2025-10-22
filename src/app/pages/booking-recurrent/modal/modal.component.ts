import { Component, EventEmitter, Input, Output, OnInit, TemplateRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, NgbNavChangeEvent, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import emailjs from 'emailjs-com';

import { ReservaRecurrente } from 'src/app/core/models/reservaRecurrente.models';
import { Reserva } from 'src/app/core/models/reserva.models';
import { ReservaRecurrenteService } from 'src/app/core/services/api/reserva-recurrente.service';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { CamposDeportivoService } from 'src/app/core/services/api/camposDeportivos.service';
import { RuatRequestsService } from 'src/app/core/services/ruat/ruatRequest.service';
import { PagoService } from 'src/app/core/services/api/pago.service';
import { CityAcronym } from 'src/app/core/constants/Places';
import { EstadoReserva, EstadoValidacion } from 'src/app/core/constants/Estados';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-booking-recurrent-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbNavModule, FormsModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalRecurrentComponent implements OnInit, AfterViewInit {

  @Input() accion!: string;
  @Input() row!: ReservaRecurrente;
  @Input() canActivate!: any[];
  @Output() emitList = new EventEmitter();

  CityAcronym = CityAcronym;
  EstadoReserva = EstadoReserva;

  reservationForm!: FormGroup;
  validationForm!: FormGroup;
  submitted = false;
  validationSubmitted = false;
  showLoading = false;

  canchasList: any[] = [];
  contribuyentesList: any[] = [];
  selectedItems: any[] = [];
  consultResults: any[] = [];
  
  motivo: string = '';
  observation: string = '';
  validationObservation: string = '';
  validationStatus: string = 'APROBADA';
  
  diasSemanaOptions = [
    { value: 'LUNES', label: 'Lunes' },
    { value: 'MARTES', label: 'Martes' },
    { value: 'MIERCOLES', label: 'Miércoles' },
    { value: 'JUEVES', label: 'Jueves' },
    { value: 'VIERNES', label: 'Viernes' },
    { value: 'SABADO', label: 'Sábado' },
    { value: 'DOMINGO', label: 'Domingo' }
  ];

  tipoRecurrenciaOptions = [
    { value: 'SEMANAL', label: 'Semanal' },
    { value: 'MENSUAL', label: 'Mensual' }
  ];

  @ViewChild('validationModel') validationModel!: TemplateRef<any>;

  constructor(
    private modalService: NgbModal,
    private formBuilder: FormBuilder,
    private reservaRecurrenteService: ReservaRecurrenteService,
    private reservaService: ReservaService,
    private canchasService: CamposDeportivoService,
    private contribuyentesService: ContribuyentesService,
    private ruatService: RuatRequestsService,
    private pagoService: PagoService,
    private router: Router
  ) {}

  ngOnInit(): void {    
    this.getFields();
    this.getTaxpayers();
    
    if (this.accion === 'validar') {
      this.initValidationForm();
    } else if (this.accion === 'edit') {
      this.initForm();
    }
  }

  ngAfterViewInit(): void {
    if (this.accion === 'validar' && this.validationModel) {
      setTimeout(() => {
        this.openValidationModal(this.validationModel);
      });
    }
  }

  private initForm() {
    const today = new Date();
    const minDate = today.toISOString().split('T')[0];
    const maxDate = new Date();
    maxDate.setFullYear(today.getFullYear() + 1); // 1 year max for recurrent reservations

    this.reservationForm = this.formBuilder.group({
      fechaInicio: [
        this.row?.fechaInicio ? new Date(this.row.fechaInicio).toISOString().split('T')[0] : '', 
        Validators.required
      ],
      fechaFin: [
        this.row?.fechaFin ? new Date(this.row.fechaFin).toISOString().split('T')[0] : '', 
        Validators.required
      ],
      tipoRecurrencia: [this.row?.tipoRecurrencia || '', Validators.required],
      diasSemana: [this.row?.diasSemana ? this.row.diasSemana.split(',') : [], Validators.required],
      duracionSesionHoras: [this.row?.duracionSesionHoras || '', [Validators.required, Validators.min(0.5)]],
      cantidadPersonas: [this.row?.cantidadPersonas || '', [Validators.required, Validators.min(1)]],
      observaciones: [this.row?.observaciones || '']
    });
  }

  private initValidationForm() {
    this.validationForm = this.formBuilder.group({
      validationStatus: [EstadoValidacion.APROBADA, Validators.required],
      validationObservation: ['', Validators.required]
    });
  }

  get form() {
    return this.reservationForm.controls;
  }

  get validationFormControls() {
    return this.validationForm.controls;
  }

  onDiaSemanaChange(event: any, diaValue: string) {
    const diasArray = [...this.reservationForm.value.diasSemana];
    if (event.target.checked) {
      diasArray.push(diaValue);
    } else {
      const index = diasArray.indexOf(diaValue);
      if (index > -1) {
        diasArray.splice(index, 1);
      }
    }
    this.reservationForm.patchValue({ diasSemana: diasArray });
  }
  /**
   * Save reservation changes
   */
  saveData() {
    this.submitted = true;
    if (this.reservationForm.valid) {
      let datos: any = {
        ...this.row,
        ...this.reservationForm.value,
        diasSemana: this.reservationForm.value.diasSemana.join(',')
      };
      
      this.updateData(datos);
    } else {
      this.notify('Formulario Inválido! Por favor complete todos los campos requeridos.', 'error');
    }
  }

  /**
   * Validate reservation (Approve/Reject) using dedicated services
   */
  validateReservation() {
    this.validationSubmitted = true;
    if (this.validationForm.valid) {
      this.showLoading = true;
      
      const validationData = this.validationForm.value;
      const isApproved = validationData.validationStatus === EstadoValidacion.APROBADA;
      const reservaUuid = this.row.reservaDto?.uuid;
      const currentUser = this.getCurrentUser();

      if (!reservaUuid) {
        this.showLoading = false;
        this.notify('Error: No se pudo identificar la reserva', 'error');
        return;
      }

      if (isApproved) {
        this.approveReserva(reservaUuid, currentUser,validationData.validationObservation);
      } else {
        this.rejectReserva(reservaUuid, validationData.validationObservation, currentUser);
      }
    } else {
      this.notify('Por favor complete todos los campos de validación', 'error');
    }
  }

  /**
   * Approve reservation using dedicated service
   */
  private approveReserva(reservaUuid: String, aprobadoPor: string, observaciones: string) {
    this.reservaService.aprobarReserva(reservaUuid, aprobadoPor).subscribe({
      next: async (reservaActualizada: Reserva) => {
        try {
          // Update local row data with the updated reserva
          const updatedReservaRecurrente = {
            ...this.row,
            reservaDto: {
              ...this.row.reservaDto,
              ...reservaActualizada,
              observacionesValidacion: observaciones
            }
          };

          // Send email notification
          await this.sendValidationEmail(updatedReservaRecurrente, true);
          
          this.showLoading = false;
          this.notify('Reserva recurrente aprobada exitosamente y notificación enviada al contribuyente', 'success');
          this.emitList.emit();
          this.modalService.dismissAll();
          this.onCloseModal();
        } catch (emailError) {
          this.showLoading = false;
          console.error('Error sending email:', emailError);
          this.notify('Reserva aprobada exitosamente, pero error al enviar notificación por email', 'warning');
          this.emitList.emit();
          this.modalService.dismissAll();
          this.onCloseModal();
        }
      },
      error: (error) => {
        this.showLoading = false;
        console.error('Error approving reservation:', error);
        this.notify('Error al aprobar la reserva: ' + (error.error?.message || error.message), 'error');
      }
    });
  }

  /**
   * Reject reservation using dedicated service
   */
  private rejectReserva(reservaUuid: String, motivoRechazo: string, aprobadoPor: string) {
    this.reservaService.rechazarReserva(reservaUuid, motivoRechazo, aprobadoPor).subscribe({
      next: async (reservaActualizada: Reserva) => {
        try {
          // Update local row data with the updated reserva
          const updatedReservaRecurrente = {
            ...this.row,
            reservaDto: {
              ...this.row.reservaDto,
              ...reservaActualizada,
              observacionesValidacion: motivoRechazo
            }
          };

          // Send email notification
          await this.sendValidationEmail(updatedReservaRecurrente, false);
          
          this.showLoading = false;
          this.notify('Reserva recurrente rechazada exitosamente y notificación enviada al contribuyente', 'success');
          this.emitList.emit();
          this.modalService.dismissAll();
          this.onCloseModal();
        } catch (emailError) {
          this.showLoading = false;
          console.error('Error sending email:', emailError);
          this.notify('Reserva rechazada exitosamente, pero error al enviar notificación por email', 'warning');
          this.emitList.emit();
          this.modalService.dismissAll();
          this.onCloseModal();
        }
      },
      error: (error) => {
        this.showLoading = false;
        console.error('Error rejecting reservation:', error);
        this.notify('Error al rechazar la reserva: ' + (error.error?.message || error.message), 'error');
      }
    });
  }

  /**
   * Get current user for aprobadoPor field
   */
  private getCurrentUser(): string {
    const currentUserStr = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    if (currentUserStr) {
      try {
        const currentUser = JSON.parse(currentUserStr);
        return currentUser.username || currentUser.nombre || 'Sistema';
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    return 'Sistema';
  }

  /**
   * Open validation modal
   */
  openValidationModal(content: any) {
    this.validationForm.reset({
      validationStatus: EstadoValidacion.APROBADA,
      validationObservation: ''
    });
    this.validationSubmitted = false;
    
    const modalRef = this.modalService.open(content, { 
      centered: true, 
      size: 'md',
      backdrop: 'static'
    });

    modalRef.dismissed.subscribe((reason) => {
      if (this.accion === 'validar') {
        this.onCloseModal();
      }
    });

    modalRef.closed.subscribe((result) => {
      if (this.accion === 'validar') {
        this.onCloseModal();
      }
    });
  }

  /**
   * Open consultation modal
   */
  async consultModal(content: any, data: any) {
    if (this.selectedItems.length === 0) {
      this.selectedItems.push(this.row); 
    }    
    this.consultResults = [];
    
    for (const item of this.selectedItems) {
      this.showLoading = true;      
      try {
        const result = await this.consultData(item); 
        this.consultResults.push(result);
      } catch (error) {
        console.error("Error during consultation:", error);
        this.consultResults.push({ 
          item, 
          text: 'Error al realizar la consulta', 
          type: 'error' 
        });
      } finally {
        this.showLoading = false;
      }
    }
    
    this.modalService.open(content, { centered: true, size: 'lg' });
    this.selectedItems = [];
    this.emitList.emit();
  }

  /**
   * Open cancel modal
   */
  deleteModal(content: any, data: any) {
    this.accion = content;
    this.motivo = '';
    this.observation = '';
  }

  /**
   * Generate ticket
   */
  generateTicket() {
    this.router.navigate(['/reservations/ticket'], { 
      state: { data: this.row } 
    });
    this.onCloseModal();
  }

  /* API REQUESTS */
  private getFields() {
    this.canchasService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.canchasList = data.payload;
        } else {
          Swal.fire({ text: data.payload, confirmButtonColor: '#299cdb'});
        }
      },
      error: (error) => {
        console.error('Error fetching fields:', error);
        Swal.fire({ text: 'Error al cargar los campos deportivos', icon: 'error' });
      }
    });
  }

  private getTaxpayers() {
    this.contribuyentesService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.contribuyentesList = data.payload;
        } else {
          Swal.fire({ text: data.payload, confirmButtonColor: '#299cdb'});
        }
      },
      error: (error) => {
        console.error('Error fetching taxpayers:', error);
        Swal.fire({ text: 'Error al cargar los contribuyentes', icon: 'error' });
      }
    });
  }

  updateReservaRecurrente(data: ReservaRecurrente): Promise<ReservaRecurrente> {
    return new Promise((resolve, reject) => {
      this.reservaRecurrenteService.update(data).subscribe({
        next: (resp: any) => {
          if (resp['status'] === 'OK') {
            resolve(resp.payload);
          } else {
            reject(resp.payload);
          }
        },
        error: (error) => {
          console.error("Error updating reserva recurrente:", error);
          reject(error);
        }
      });
    });
  }

  updateData(datosUnit: ReservaRecurrente) {
    this.showLoading = true;
    this.reservaRecurrenteService.update(datosUnit).subscribe({
      next: (data: any) => {
        this.showLoading = false;
        this.Editposition();
        this.submitted = false;
        this.onCloseModal();
        this.emitList.emit();
        this.notify('Reserva recurrente actualizada exitosamente!', 'success');
      },
      error: (error) => {
        this.showLoading = false;
        this.notify('No se pudo actualizar la reserva recurrente! ' + error, 'error');
      }
    });
  }

  /* RUAT REQUESTS */
  annularData(formValues: any) {
    if (!formValues || !this.row.reservaDto?.numeroTasa) {
      this.notify('No se pudo obtener los datos de la reserva', 'error');
      return;
    }

    const requestData = {
      numeroTasa: this.row.reservaDto.numeroTasa,
      motivo: formValues.motivo,
      observacion: formValues.observation
    };

    this.showLoading = true;

    this.ruatService.cancelTasa(requestData).subscribe({
      next: (resp: any) => {
        this.showLoading = false;

        if (resp['status'] === 'OK') {
          const text = resp.payload['mensaje'];
          const updatedReservaRecurrente: any = {
            ...this.row,
            reservaDto: {
              ...this.row.reservaDto,
              estadoReserva: EstadoReserva.CANCELADA
            }
          };
          
          this.reservaRecurrenteService.update(updatedReservaRecurrente).subscribe({
            next: () => {
              Swal.fire({
                title: 'Anulado!',
                text: text,
                icon: 'success',
                confirmButtonColor: '#299cdb',
                timer: 5000,
                timerProgressBar: true,
              });
              this.emitList.emit();
              this.modalService.dismissAll('close click');
            },
            error: (error) => {
              console.error('Error updating reservation:', error);
              this.notify('Reserva anulada en RUAT pero error al actualizar localmente', 'warning');
            }
          });
        } else {
          this.notify(resp.payload || 'Error al anular en RUAT', 'error');
        }
      },
      error: (error) => {
        this.showLoading = false;
        console.error('Error:', error);
        this.notify('Error al realizar la anulación en RUAT', 'error');
      },
    });
  }

  async consultData(item: any): Promise<any> {
    if (!item || !item.reservaDto?.numeroTasa) {
      return { item, text: 'No se pudo obtener el dato seleccionado', type: 'warning' };
    }  
    
    try {
      const nroTasa = item.reservaDto.numeroTasa;
      const resp: any = await this.ruatService.consultaPagoTasa(nroTasa).toPromise();

      if (resp['status'] !== 'OK') {
        return { item, text: "La Tasa y Otro Ingreso no tiene pagos", type: 'warning' };
      }
      
      if (!resp.payload.continuarFlujo) {
        return { item, text: resp.payload.observacion, type: 'warning' };
      }

      const text = resp.payload.observacion;  
      if (item.reservaDto?.estadoReserva === EstadoReserva.PENDIENTE || 
          item.reservaDto?.estadoReserva === EstadoReserva.CONFIRMADA) {
        const pago = resp.payload.pagoTasa;
        const [day, month, year] = pago.fechaPago.split('/');
        pago.fechaPago = `${year}-${month}-${day}`;
        pago.reservasDto = item;  
        
        try {
          const pagoResp: any = await this.pagoService.save(pago).toPromise();
          if (pagoResp.status === 'OK') {
            // Update reservation status to PAGADA
            const updatedReservaRecurrente = {
              ...item,
              reservaDto: {
                ...item.reservaDto,
                estadoReserva: EstadoReserva.PAGADA
              }
            };
            await this.updateReservaRecurrente(updatedReservaRecurrente);
            return { item: updatedReservaRecurrente, text, type: 'success' };
          }
        } catch (error) {
          console.error('Error saving pago:', error);
          return { item, text: 'Error al guardar el pago', type: 'error' };
        }
      }
      return { item, text, type: 'info' };
    } catch (error) {
      console.error('Error:', error);
      return { item, text: 'Error al realizar la consulta en RUAT', type: 'error' };
    }
  }

  /* Helper Methods */
  getStatusBadgeClass(estado: string | undefined): string {
    switch (estado) {
      case EstadoReserva.BORRADOR:
        return 'bg-secondary-subtle text-secondary';
      case EstadoReserva.PENDIENTE:
        return 'bg-warning-subtle text-warning';
      case EstadoReserva.CONFIRMADA:
        return 'bg-info-subtle text-info';
      case EstadoReserva.PAGADA:
        return 'bg-primary-subtle text-primary';
      case EstadoReserva.EN_CURSO:
        return 'bg-success-subtle text-success';
      case EstadoReserva.COMPLETADA:
        return 'bg-success-subtle text-success';
      case EstadoReserva.CANCELADA:
        return 'bg-danger-subtle text-danger';
      case EstadoReserva.RECHAZADA:
        return 'bg-danger-subtle text-danger';
      case EstadoReserva.EXPIRADA:
        return 'bg-dark-subtle text-dark';
      case EstadoReserva.NO_SHOW:
        return 'bg-dark-subtle text-dark';
      default:
        return 'bg-secondary-subtle text-secondary';
    }
  }

  getValidationBadgeClass(estado: string): string {
    switch (estado) {
      case 'PENDIENTE':
        return 'bg-warning-subtle text-warning';
      case 'APROBADA':
        return 'bg-success-subtle text-success';
      case 'RECHAZADA':
        return 'bg-danger-subtle text-danger';
      default:
        return 'bg-secondary-subtle text-secondary';
    }
  }

  getStatusAlertClass(estado: string | undefined): string {
    switch (estado) {
      case EstadoReserva.PENDIENTE:
        return 'alert-warning';
      case EstadoReserva.CONFIRMADA:
        return 'alert-info';
      case EstadoReserva.PAGADA:
        return 'alert-primary';
      case EstadoReserva.EN_CURSO:
      case EstadoReserva.COMPLETADA:
        return 'alert-success';
      case EstadoReserva.CANCELADA:
      case EstadoReserva.RECHAZADA:
      case EstadoReserva.EXPIRADA:
      case EstadoReserva.NO_SHOW:
        return 'alert-danger';
      default:
        return 'alert-secondary';
    }
  }

  getStatusDescription(estado: any): string {
    const descriptions: { [key: string]: string } = {
      [EstadoReserva.BORRADOR]: 'Reserva en proceso de creación',
      [EstadoReserva.PENDIENTE]: 'Esperando validación administrativa',
      [EstadoReserva.CONFIRMADA]: 'Reserva aprobada, pendiente de pago',
      [EstadoReserva.PAGADA]: 'Pago confirmado, reserva activa',
      [EstadoReserva.EN_CURSO]: 'Reserva en curso',
      [EstadoReserva.COMPLETADA]: 'Reserva finalizada exitosamente',
      [EstadoReserva.CANCELADA]: 'Reserva cancelada por el usuario',
      [EstadoReserva.RECHAZADA]: 'Reserva rechazada por validación',
      [EstadoReserva.EXPIRADA]: 'Tiempo de pago expirado',
      [EstadoReserva.NO_SHOW]: 'Usuario no se presentó'
    };
    return descriptions[estado] || 'Estado desconocido';
  }

  getValidationDescription(estado: string): string {
    const descriptions: { [key: string]: string } = {
      'PENDIENTE': 'Esperando validación administrativa',
      'APROBADA': 'Reserva validada y aprobada',
      'RECHAZADA': 'Reserva rechazada por validación'
    };
    return descriptions[estado] || 'Estado de validación desconocido';
  }

  getCityDescription(cityId: string | undefined): string {
    if (!cityId) return 'N/A';
    const city = this.CityAcronym.find(c => '' + c.id === cityId);
    return city ? city.value : 'Desconocido';
  }

  getDiasSemanaLabels(diasString: string): string {
    if (!diasString) return 'N/A';
    const diasArray = diasString.split(',');
    return diasArray.map(dia => {
      const option = this.diasSemanaOptions.find(d => d.value === dia);
      return option ? option.label : dia;
    }).join(', ');
  }

  getRecurrenceDescription(tipoRecurrencia: string): string {
    return tipoRecurrencia === 'SEMANAL' ? 'Semanal' : 'Mensual';
  }

  /* Common functions */ 
  public onCloseModal() {
    this.accion = '';    
    if (this.reservationForm) {
      this.reservationForm.enable();
      this.reservationForm.reset();
    }  
    this.modalService.dismissAll();
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

  /**
   * Check if reservation can be validated
   */
  canValidateReservation(): boolean {
    const estadoValidacion = this.row?.reservaDto?.estadoValidacion;
    const estadoReserva = this.row?.reservaDto?.estadoReserva;
    return (estadoValidacion === 'PENDIENTE' && 
            estadoReserva === EstadoReserva.PENDIENTE && 
            this.canActivate.includes('VALIDAR'));
  }

  /**
   * Check if reservation can be edited
   */
  canEditReservation(): boolean {
    return this.row?.reservaDto?.estadoReserva === EstadoReserva.PENDIENTE && 
           this.canActivate.includes('CAMBIAR-HORARIO');
  }

  /**
   * Check if reservation can be cancelled
   */
  canCancelReservation(): boolean {
    const estado = this.row?.reservaDto?.estadoReserva;
    return (estado === EstadoReserva.PENDIENTE || estado === EstadoReserva.CONFIRMADA) && 
           this.canActivate.includes('ANULAR');
  }

  /**
   * Check if reservation can be consulted
   */
  canConsultReservation(): boolean {
    const estado = this.row?.reservaDto?.estadoReserva;
    return (estado === EstadoReserva.PENDIENTE || estado === EstadoReserva.CONFIRMADA) && 
           this.canActivate.includes('ACTUALIZAR');
  }

  /**
   * Send email notification for validation result
   */
  private async sendValidationEmail(
    reserva: ReservaRecurrente, 
    isApproved: boolean
  ): Promise<void> {
    try {
      const contribuyente = reserva.reservaDto?.contribuyenteDto;
      const campoDeportivo = reserva.reservaDto?.campoDeportivoDto;
      
      const templateParams = {
        subject: isApproved ? 
          `Reserva Recurrente Aprobada - ${campoDeportivo?.nombre}` : 
          `Reserva Recurrente Rechazada - ${campoDeportivo?.nombre}`,
        to_email: contribuyente?.email,
        cc_email: '',
        bcc_email: '',
        send_date: this.formatDate(new Date()),

        // Reservation Information
        reserva_number: reserva.reservaDto?.numeroTasa,
        estado_reserva: isApproved ? 'APROBADA' : 'RECHAZADA',
        validation_observation: this.reservationForm.value.observaciones,
        
        // Contribuyente Information
        contribuyente_name: contribuyente?.nombreCompleto || 
                           `${contribuyente?.nombre} ${contribuyente?.primerApellido} ${contribuyente?.segundoApellido}`,
        contribuyente_document: contribuyente?.numeroDocumento,
        contribuyente_phone: contribuyente?.telefono,

        // Recurrent Reservation Details
        complejo_name: campoDeportivo?.complejoDto.nombre,
        campo_deportivo: campoDeportivo?.nombre,
        superficie: reserva.superficie,
        categoria: reserva.categoria,
        tipo_recurrencia: this.getRecurrenceDescription(reserva.tipoRecurrencia),
        fecha_inicio: this.formatDate(new Date(reserva.fechaInicio)),
        fecha_fin: this.formatDate(new Date(reserva.fechaFin)),
        dias_semana: this.getDiasSemanaLabels(reserva.diasSemana),
        duracion_sesion: `${reserva.duracionSesionHoras} horas`,
        cantidad_sesiones: reserva.cantidadSesiones,
        cantidad_personas: reserva.cantidadPersonas,
        monto_total: `Bs. ${reserva.reservaDto?.montoTotal}`,

        // Contact Information
        phone: '+(591) 4-1234567',
        email: 'deportes@gamq.gov.bo',
        address: 'Calle Principal #123, Quillacollo',
        
        // Conditional content based on approval/rejection
        is_approved: isApproved,
        is_rejected: !isApproved,
        
        // Approval specific content
        approval_instructions: isApproved ? 
          `Para completar su reserva recurrente, proceda con el pago de la tasa ${reserva.reservaDto?.numeroTasa} en cualquier entidad financiera autorizada.` :
          '',
        
        // Rejection specific content
        next_steps_rejected: !isApproved ?
          `Puede contactarnos para más información o realizar una nueva reserva ajustándose a las observaciones proporcionadas.` :
          ''
      };

      const templateId = environment.EmailJS.idTemplate;

      const response = await emailjs.send(
        environment.EmailJS.idService,
        templateId,
        templateParams,
        environment.EmailJS.publicKey
      );

      if (response.status === 200) {
        console.log(`Email de ${isApproved ? 'aprobación' : 'rechazo'} enviado exitosamente`);
      } else {
        console.error(`EmailJS responded with status ${response.status}`);
        throw new Error(`EmailJS responded with status ${response.status}`);
      }

    } catch (error: any) {
      console.error('Error sending validation email:', error);
      
      if (error?.status === 429) {
        throw new Error('Límite de envíos de email alcanzado. Por favor intente más tarde.');
      } else if (error?.status === 400) {
        throw new Error('Error en la configuración del email. Verifique los datos.');
      } else {
        throw new Error('Error inesperado al enviar la notificación por email');
      }
    }
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private calculatePaymentDeadline(validationDate: Date): Date {
    const deadline = new Date(validationDate);
    deadline.setHours(deadline.getHours() + 24);
    return deadline;
  }

  /**
   * Model Position Set
   */
  position() {
    Swal.fire({
      position: 'center',
      icon: 'success',
      title: 'Evento guardado',
      showConfirmButton: false,
      timer: 1000,
    });
  }

  /**
   * Model Edit Position Set
   */
  Editposition() {
    Swal.fire({
      position: 'center',
      icon: 'success',
      title: 'Evento actualizado',
      showConfirmButton: false,
      timer: 1000,
    });
  }
}