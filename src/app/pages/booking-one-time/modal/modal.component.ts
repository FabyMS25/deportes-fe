import { Component, EventEmitter, Input, Output, OnInit, TemplateRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, NgbNavChangeEvent, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import emailjs from 'emailjs-com';

import { ReservaPuntual } from 'src/app/core/models/reservaPuntual.models';
import { ReservaPuntualService } from 'src/app/core/services/api/reserva-puntual.service';
import { RuatRequestsService } from 'src/app/core/services/ruat/ruatRequest.service';
import { PagoService } from 'src/app/core/services/api/pago.service';
import { CityAcronym } from 'src/app/core/constants/Places';
import { EstadoReserva, EstadoValidacion } from 'src/app/core/constants/Estados';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { Reserva } from 'src/app/core/models/reserva.models';
import { ConfiguracionSistemaService } from 'src/app/core/services/api/configuracionSistema.service';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { TicketComponent } from '../../reports/ticket/ticket.component';

@Component({
  selector: 'app-booking-one-time-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,
        NgbNavModule, FormsModule, TicketComponent
  ],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
})

export class BookingOneTimeModalComponent implements OnInit, AfterViewInit {

  @Input() accion!: string;
  @Input() row!: ReservaPuntual;
  @Input() canActivate!: any[];
  @Output() emitList = new EventEmitter();

  systemConfigList: ConfiguracionSistema[] = [];
  CityAcronym = CityAcronym;
  EstadoReserva = EstadoReserva;
  userData!:any
  submitted = false;
  reservationForm!: FormGroup;
  validationSubmitted = false;
  validationForm!: FormGroup;
  showLoading = false;
  
  motivo: string = '';
  observation: string = '';

  @ViewChild('validationModal') validationModal!: TemplateRef<any>;
  @ViewChild('ticketModal') ticketModal!: TemplateRef<any>;
  @ViewChild('annularModal') annularModal!: TemplateRef<any>;

  constructor(
    private modalService: NgbModal,
    private formBuilder: FormBuilder,
    private systemConfigsService: ConfiguracionSistemaService,
    private ruatService: RuatRequestsService,
    private pagoService: PagoService,
    private router: Router,
    private reservaPuntualService: ReservaPuntualService,
    private reservaService: ReservaService
  ) {}

  ngOnInit(): void { 
    const currentUser = window.sessionStorage.getItem("currentUser");
      this.userData= currentUser ?JSON.parse(currentUser):null;
    if (window.sessionStorage.getItem("auth-token") !== 'isContribuyente') {
      this.userData=this.userData.designacion.personaDto
    } 
    this.getConfigsSystem(); 
    this.initForm();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {      
    if (!this.accion) return;
    switch (this.accion) {
      case 'validarModal':this.openValidationModal(this.validationModal);
        break;
      case 'annularModal':
        if (this.annularModal) {
          this.openDeleteModal(this.annularModal);
        }
        break;
      case 'ticketModal': this.openTicketModal(this.ticketModal);
        break;
    }
    });
  }
  private initForm() {
    this.reservationForm = this.formBuilder.group({
      fechaUso: [
        this.row?.fechaUso ? new Date(this.row.fechaUso).toISOString().split('T')[0] : '', 
        Validators.required
      ],
      horaInicio: [this.row?.horaInicio || '', Validators.required],
      horaFin: [this.row?.horaFin || '', Validators.required],
      observaciones: [this.row?.observaciones || '']
    });
  }
  private initValidationForm() {
    this.validationForm = this.formBuilder.group({
      validationStatus: [EstadoValidacion.APROBADA, Validators.required],
      validationObservation: ['']
    });
    this.validationForm.get('validationStatus')?.valueChanges.subscribe(status => {
      this.updateObservationValidation(status);
    });
  }
  private updateObservationValidation(status: string): void {
    const observationControl = this.validationForm.get('validationObservation');
    if (status === EstadoValidacion.RECHAZADA) {
      observationControl?.setValidators([Validators.required]);
      observationControl?.updateValueAndValidity();
    } else {
      observationControl?.clearValidators();
      observationControl?.updateValueAndValidity();
    }
  }

  get form() {
    return this.reservationForm.controls;
  }
  get validationFormControls() {
    return this.validationForm.controls;
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
      };      
      this.updateReservaPuntual(datos);
    } else {
      this.notify('Formulario Inválido! Por favor complete todos los campos requeridos.', 'error');
    }
  }

  /**
   * Open modals
   */
  openValidationModal(content: any) {
    this.initValidationForm();
    this.modalService.open(content, { centered: true, size: 'md' });
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
  openDeleteModal(content: any) {
    this.accion = content;
    this.motivo = '';
    this.observation = '';
  }
  openTicketModal(content:any) {
    this.modalService.open(content, { centered: true, size: 'md' });
    this.emitList.emit();
  }
  confirmUsage() {
    Swal.fire({
      title: 'Confirmar Uso',
      text: '¿Estás seguro de que la reserva se ha utilizado completamente?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#299cdb',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
        this.showLoading = true;
        const updatedReserva:any = {
          ...this.row,
          reservaDto: {
            ...this.row.reservaDto,
            estadoReserva: EstadoReserva.COMPLETADA,
          }
        };      
        this.updateReservaPuntual(updatedReserva).then(() => {
          this.showLoading = false;
          this.notify('Reserva marcada como completada exitosamente', 'success');
          this.emitList.emit();
          this.onCloseModal();
        }).catch(error => {
          this.showLoading = false;
          this.notify('Error al actualizar la reserva: ' + error, 'error');
        });
      }
    });
  }
  validateReservation() {
    this.validationSubmitted = true;
    this.updateObservationValidation(this.validationForm.value.validationStatus);    
    if (this.validationForm.valid) {
      this.showLoading = true;
      const validationData = this.validationForm.value;
      const isApproved = validationData.validationStatus === EstadoValidacion.APROBADA;
      const reservaUuid = this.row.reservaDto?.uuid;      
      if (!reservaUuid) {
        this.showLoading = false;
        this.notify('Error: No se pudo identificar la reserva', 'error');
        return;
      }      
      if (isApproved) {
        this.approveReserva(reservaUuid, validationData.validationObservation);
      } else {
        this.rejectReserva(reservaUuid, validationData.validationObservation);
      }
    } else {
      this.notify('Por favor complete todos los campos de validación', 'error');
    }
  }

  /* API REQUESTS */  
  private getConfigsSystem() {
    this.systemConfigsService.getAll().subscribe({
      next: (data: any) => {
          if (data['status'] === 'OK') {
            this.systemConfigList = data.payload;
          }
        }
      });
  }
  private approveReserva(reservaUuid: any, observaciones: string = '') {
    const aprobadoPor = this.userData.nombreCompleto || this.userData.fullName
    this.reservaService.aprobarReserva(reservaUuid, aprobadoPor).subscribe({
      next: async (data: any) => {
        try {
          this.showLoading = false;
          await this.registerReservationInRuat(data.payload);
          this.openTicketModal(this.ticketModal)
          this.notify('Reserva aprobada exitosamente y registrada en Ruat', 'success');
          // const updatedReservaPuntual = {
          //   ...this.row,
          //   reservaDto: {
          //     ...this.row.reservaDto,
          //     ...reservaActualizada,
          //     observacionesValidacion: observaciones
          //   }
          // };
          // await this.sendValidationEmail(updatedReservaPuntual, true,'');
          // this.emitList.emit();
          // this.modalService.dismissAll();
          // this.onCloseModal();
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
  private rejectReserva(reservaUuid: any, motivoRechazo: string = '') {
    const aprobadoPor = this.userData.nombreCompleto || this.userData.fullName;
    this.reservaService.rechazarReserva(reservaUuid, motivoRechazo, aprobadoPor).subscribe({
      next: async (data: any) => {
        try {
          this.showLoading = false;
          this.openTicketModal(this.ticketModal)
          // const updatedReservaPuntual = {
          //   ...this.row,
          //   reservaDto: {
          //     ...this.row.reservaDto,
          //     ...reservaActualizada,
          //     observacionesValidacion: motivoRechazo
          //   }
          // };
          // await this.sendValidationEmail(updatedReservaPuntual, false,'');          
          this.notify('Reserva rechazada exitosamente y notificación enviada al contribuyente', 'success');
          // this.emitList.emit();
          // this.modalService.dismissAll();
          // this.onCloseModal();
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
  private registerReservationInRuat(reservaData: Reserva): void {
    const codigoAlcaldia = this.systemConfigList.find(config => config.clave === 'CODIGO_ALCALDIA_RUAT')?.valorTexto || '';
    const codigoUsuario = this.systemConfigList.find(config => config.clave === 'CODIGO_USUARIO_RUAT')?.valorTexto || '';
    const servicioMunicipal = this.systemConfigList.find(config => config.clave === 'SERVICIO_MUNICIPAL_RUAT')?.valorTexto || '';
    
    const ruatData = {
      codigoAlcaldia: codigoAlcaldia,
      codigoUsuario: reservaData.contribuyenteDto.codigoContribuyente,
      codigoContribuyente: reservaData.contribuyenteDto.codigoContribuyente,
      servicioMunicipal: servicioMunicipal,
      datosConcepto: [{
        numero: '1',
        codigoClasificador: reservaData.tarifaDto.clasificadorRuatDto.codigo,
        tipoArancel: reservaData.tarifaDto.clasificadorRuatDto.tipoArancel || "DI",
        monto: reservaData.montoTotal
      }],
      observacion: reservaData.reservaPuntualDto?.observaciones || reservaData.reservaRecurrenteDto?.observaciones || 'Reserva de Cancha Deportiva GAMQ'
    };
    
    const code = reservaData.contribuyenteDto.codigoContribuyente || '';
    
    this.ruatService.createTasa(codigoAlcaldia,codigoUsuario, servicioMunicipal, ruatData, code)
    .subscribe({
      next: (response: any) => {
        if (response.status === 'OK' ) {
          if(response.payload.continuarFlujo){
            reservaData.numeroTasa = response.payload.numeroTasa;
            this.updateReserva(reservaData);
          } else {
            this.handleError('Error en RUAT', response.payload.mensaje || 'No se pudo registrar la tasa');
          }
        } else {
          this.handleError('Error en RUAT', response.mensaje || 'No se pudo registrar la tasa');
        }
      },
      error: (error) => {
        this.handleError('Error de conexión con RUAT', error.error?.mensaje || error.message);
      }
    });
  }

  updateReservaPuntual(data: ReservaPuntual): Promise<ReservaPuntual> {
    return new Promise((resolve, reject) => {
      this.reservaPuntualService.update(data).subscribe({
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
  updateReserva(data: Reserva): Promise<Reserva> {
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


  /* RUAT REQUESTS */
  annularData(formValues: any) {
    if (!formValues || !this.row.reservaDto?.numeroTasa) {
      this.notify('No se pudo obtener los datos de la reserva', 'error');
      return;
    }
    const codigoAlcaldia = this.systemConfigList.find(config => config.clave === 'CODIGO_ALCALDIA_RUAT')?.valorTexto || '';
    const codigoUsuario = this.systemConfigList.find(config => config.clave === 'CODIGO_USUARIO_RUAT')?.valorTexto || '';
    const requestData = {
      numeroTasa: this.row.reservaDto.numeroTasa,
      motivo: formValues.motivo,
      observacion: formValues.observation
    };
    this.showLoading = true;
    this.ruatService.cancelTasa(codigoAlcaldia,codigoUsuario,requestData).subscribe({
      next: (resp: any) => {
        this.showLoading = false;
        if (resp['status'] === 'OK') {
          const text = resp.payload['mensajeConfirmacion'];
          const updatedReserva:any = {
            // ...this.row,
            // reservaDto: {
              ...this.row.reservaDto,
              estadoReserva: EstadoReserva.CANCELADA
            // }
          };
          this.reservaService.update(updatedReserva).subscribe({
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

  /* Status Helper Methods */
  getStatusBadgeClass(estado: string| undefined): string {
    switch (estado) {
      case EstadoReserva.BORRADOR:
        return 'bg-secondary-subtle text-secondary';
      case EstadoReserva.SOLICITADA:
        return 'bg-warning-subtle text-warning';
      case EstadoReserva.PENDIENTE:
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

  getStatusDescription(estado: any): string {
    const descriptions: { [key: string]: string } = {
      [EstadoReserva.BORRADOR]: 'Reserva en proceso de creación',
      [EstadoReserva.SOLICITADA]: 'Esperando validación administrativa',
      [EstadoReserva.PENDIENTE]: 'Reserva aprobada, pendiente de pago',
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

  /* Common functions */ 
  public onCloseModal() {
    if (this.reservationForm) {
      this.reservationForm.enable();
      this.reservationForm.reset();
    }
    if(this.validationForm){
      this.validationForm.enable();
      this.validationForm.reset()
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
    private handleError(title: string, error: any): void {
      Swal.fire({
        title: title,
        text: error.message || 'Por favor, intente nuevamente.',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    }
}