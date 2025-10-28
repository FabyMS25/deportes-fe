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
import { EstadoReserva, EstadoValidacion, EstadoPago } from 'src/app/core/constants/Estados';
import { environment } from 'src/environments/environment';
import { ConfiguracionSistemaService } from 'src/app/core/services/api/configuracionSistema.service';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { TicketComponent } from '../../reports/ticket/ticket.component';
import { Pago } from 'src/app/core/models/pago.model';

@Component({
  selector: 'app-booking-recurrent-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbNavModule, FormsModule, TicketComponent],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalRecurrentComponent implements OnInit, AfterViewInit {

  @Input() accion!: string;
  @Input() row!: ReservaRecurrente;
  @Input() canActivate!: any[];
  @Output() emitList = new EventEmitter();

  systemConfigList: ConfiguracionSistema[] = [];
  CityAcronym = CityAcronym;
  EstadoReserva = EstadoReserva;
  EstadoPago = EstadoPago;
  userData!: any;

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
  @ViewChild('ticketModal') ticketModal!: TemplateRef<any>;
  @ViewChild('annularModal') annularModal!: TemplateRef<any>;

  constructor(
    private modalService: NgbModal,
    private formBuilder: FormBuilder,
    private reservaRecurrenteService: ReservaRecurrenteService,
    private reservaService: ReservaService,
    private canchasService: CamposDeportivoService,
    private contribuyentesService: ContribuyentesService,
    private ruatService: RuatRequestsService,
    private systemConfigsService: ConfiguracionSistemaService,
    private pagoService: PagoService,
    private router: Router
  ) {}

  ngOnInit(): void {   
    const currentUser = window.sessionStorage.getItem("currentUser");
    this.userData = currentUser ? JSON.parse(currentUser) : null;
    
    if (window.sessionStorage.getItem("auth-token") !== 'isContribuyente') {
      this.userData = this.userData.designacion.personaDto;
    }
    
    this.getConfigsSystem(); 
    this.getFields();
    this.getTaxpayers();
    
    if (this.accion === 'validar') {
      this.initValidationForm();
    } else if (this.accion === 'edit') {
      this.initForm();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {      
      if (!this.accion) return;
      switch (this.accion) {
        case 'validarModal':
          this.openValidationModal(this.validationModel);
          break;
        case 'annularModal':
          if (this.annularModal) {
            this.openDeleteModal(this.annularModal);
          }
          break;
        case 'ticketModal': 
          this.openTicketModal(this.ticketModal);
          break;
      }
    });
  }

  private initForm() {
    const today = new Date();
    const minDate = today.toISOString().split('T')[0];
    const maxDate = new Date();
    maxDate.setFullYear(today.getFullYear() + 1);

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

  /**
   * Approve reservation using dedicated service
   */
  private approveReserva(reservaUuid: any, observaciones: string = '') {
    const aprobadoPor = this.userData.nombreCompleto || this.userData.fullName;
    
    this.reservaService.aprobarReserva(reservaUuid, aprobadoPor).subscribe({
      next: async (data: any) => {
        try {
          this.showLoading = false;
          await this.registerReservationInRuat(data.payload);
          this.openTicketModal(this.ticketModal);
          this.notify('Reserva recurrente aprobada exitosamente y registrada en RUAT', 'success');
        } catch (error) {
          this.showLoading = false;
          console.error('Error in approval process:', error);
          this.notify('Reserva aprobada pero error en proceso adicional: ' + error, 'warning');
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
  private rejectReserva(reservaUuid: any, motivoRechazo: string = '') {
    const aprobadoPor = this.userData.nombreCompleto || this.userData.fullName;
    
    this.reservaService.rechazarReserva(reservaUuid, motivoRechazo, aprobadoPor).subscribe({
      next: async (data: any) => {
        try {
          this.showLoading = false;
          this.openTicketModal(this.ticketModal);
          this.notify('Reserva recurrente rechazada exitosamente', 'success');
        } catch (error) {
          this.showLoading = false;
          console.error('Error in rejection process:', error);
          this.notify('Reserva rechazada pero error en proceso adicional', 'warning');
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
   * Register reservation in RUAT system
   */
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
      observacion: reservaData.reservaRecurrenteDto?.observaciones || 'Reserva Recurrente de Cancha Deportiva GAMQ'
    };
    
    const code = reservaData.contribuyenteDto.codigoContribuyente || '';
    
    this.ruatService.createTasa(codigoAlcaldia, codigoUsuario, servicioMunicipal, ruatData, code)
    .subscribe({
      next: (response: any) => {
        if (response.status === 'OK' && response.payload.continuarFlujo) {
          reservaData.numeroTasa = response.payload.numeroTasa;
          this.updateReserva(reservaData);
        } else {
          this.handleError('Error en RUAT', response.payload?.mensaje || 'No se pudo registrar la tasa');
        }
      },
      error: (error) => {
        this.handleError('Error de conexión con RUAT', error.error?.mensaje || error.message);
      }
    });
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
  }

  openDeleteModal(content: any) {
    this.accion = content;
    this.motivo = '';
    this.observation = '';
  }

  openTicketModal(content: any) {
    this.modalService.open(content, { centered: true, size: 'md' });
    this.emitList.emit();
  }

  /**
   * Confirm usage of recurrent reservation
   */
  confirmUsage() {
    Swal.fire({
      title: 'Confirmar Uso',
      text: '¿Estás seguro de que la reserva recurrente se ha utilizado completamente?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#299cdb',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
        this.showLoading = true;
        const updatedReserva: any = {
          ...this.row,
          reservaDto: {
            ...this.row.reservaDto,
            estadoReserva: EstadoReserva.COMPLETADA,
          }
        };      
        this.updateReservaRecurrente(updatedReserva).then(() => {
          this.showLoading = false;
          this.notify('Reserva recurrente marcada como completada exitosamente', 'success');
          this.emitList.emit();
          this.onCloseModal();
        }).catch(error => {
          this.showLoading = false;
          this.notify('Error al actualizar la reserva: ' + error, 'error');
        });
      }
    });
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

  updateData(datosUnit: ReservaRecurrente) {
    this.showLoading = true;
    this.reservaRecurrenteService.update(datosUnit).subscribe({
      next: (data: any) => {
        this.showLoading = false;
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
    
    const codigoAlcaldia = this.systemConfigList.find(config => config.clave === 'CODIGO_ALCALDIA_RUAT')?.valorTexto || '';
    const codigoUsuario = this.systemConfigList.find(config => config.clave === 'CODIGO_USUARIO_RUAT')?.valorTexto || '';
    const requestData = {
      numeroTasa: this.row.reservaDto.numeroTasa,
      motivo: formValues.motivo,
      observacion: formValues.observation
    };

    this.showLoading = true;

    this.ruatService.cancelTasa(codigoAlcaldia, codigoUsuario, requestData).subscribe({
      next: (resp: any) => {
        this.showLoading = false;

        if (resp['status'] === 'OK') {
          const text = resp.payload['mensajeConfirmacion'];
          const updatedReserva: any = {
            ...this.row.reservaDto,
            estadoReserva: EstadoReserva.CANCELADA
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

  /* Consultation functionality */
  async consultModal(content: any, data: any) {
    if (this.selectedItems.length === 0) {
      this.selectedItems.push(this.row); 
    }
    const codigoAlcaldia = this.systemConfigList.find(config => config.clave === 'CODIGO_ALCALDIA_RUAT')?.valorTexto || '';
    this.consultResults = [];
    
    for (const item of this.selectedItems) {
      this.showLoading = true;      
      try {
        const result = await this.consultData(codigoAlcaldia, item); 
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

  async consultData(codigoAlcaldia: string, item: any): Promise<any> {
    if (!item || !item.reservaDto?.numeroTasa) {
      return { item, text: 'No se pudo obtener el dato seleccionado', type: 'warning' };
    }  
    
    try {
      const nroTasa = item.reservaDto.numeroTasa;
      const resp: any = await this.ruatService.consultaPagoTasa(codigoAlcaldia, nroTasa).toPromise();

      if (resp['status'] !== 'OK') {
        return { item, text: "La Tasa y Otro Ingreso no tiene pagos", type: 'warning' };
      }
      
      if (!resp.payload.continuarFlujo) {
        return { item, text: resp.payload.observacion, type: 'warning' };
      }

      const text = resp.payload.observacion;  
      if (item.reservaDto?.estadoReserva === EstadoReserva.SOLICITADA || 
          item.reservaDto?.estadoReserva === EstadoReserva.PENDIENTE) {
        const pagoData = resp.payload.pagoTasa;
        
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
            // Update reservation status to PAGADA
            const updatedReservaRecurrente = {
              ...item,
              reservaDto: {
                ...item.reservaDto,
                estadoReserva: EstadoReserva.PAGADA
              }
            };
            await this.updateReservaRecurrente(updatedReservaRecurrente);
            return { 
              item: updatedReservaRecurrente, 
              text, 
              type: 'success',
              hasPayment: true,
              pagoData: pagoResp.payload
            };
          }
        } catch (error) {
          console.error('Error saving pago:', error);
          return { item, text: 'Error al guardar el pago', type: 'error', hasPayment: true };
        }
      }
      return { 
        item, 
        text, 
        type: 'info',
        hasPayment: true,
        pagoData: item.reservaDto?.pagosDtoList?.[0] || resp.payload.pagoTasa
      };
    } catch (error) {
      console.error('Error:', error);
      return { item, text: 'Error al realizar la consulta en RUAT', type: 'error', hasPayment: false };
    }
  }

  /* Helper Methods */
  getStatusBadgeClass(estado: string | undefined): string {
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

  getStatusAlertClass(estado: string | undefined): string {
    switch (estado) {
      case EstadoReserva.SOLICITADA:
        return 'alert-warning';
      case EstadoReserva.PENDIENTE:
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
    if (this.validationForm) {
      this.validationForm.enable();
      this.validationForm.reset();
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
    return (estado === EstadoReserva.SOLICITADA || estado === EstadoReserva.PENDIENTE) && 
           this.canActivate.includes('ANULAR');
  }

  /**
   * Check if reservation can be consulted
   */
  canConsultReservation(): boolean {
    const estado = this.row?.reservaDto?.estadoReserva;
    return (estado === EstadoReserva.SOLICITADA || estado === EstadoReserva.PENDIENTE) && 
           this.canActivate.includes('ACTUALIZAR');
  }
}