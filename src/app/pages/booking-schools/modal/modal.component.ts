import { Component, Input, Output, EventEmitter, OnInit, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef, TemplateRef, ViewChild, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal, NgbCollapseModule, NgbModal, NgbNavModule, NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { CommonModule, CurrencyPipe } from '@angular/common';
import { Organizacion } from 'src/app/core/models/organizacion.models';
import { EstudianteEscuela } from 'src/app/core/models/EstudianteEscuela.model';
import { Reserva } from 'src/app/core/models/reserva.models';
import { Tarifa } from 'src/app/core/models/tarifa.model';
import { EstadoReserva, EstadoValidacion, EstadoPago } from 'src/app/core/constants/Estados';
import { ReservaPeriodo } from 'src/app/core/models/reservaPeriodo.models';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ComplejosService } from 'src/app/core/services/api/conplejos.service';
import { CamposDeportivoService } from 'src/app/core/services/api/camposDeportivos.service';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { RuatRequestsService } from 'src/app/core/services/ruat/ruatRequest.service';
import { Router } from '@angular/router';
import { ReservaPeriodoService } from 'src/app/core/services/api/reserva-periodo.service';
import { EstudianteEscuelaService } from 'src/app/core/services/api/estudianteEscuela.service';
import { OrganizacionService } from 'src/app/core/services/api/organizacion.service';
import { ComplejoDeportivo } from 'src/app/core/models/complejoDeportivo.model';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { ReservaRecurrente } from 'src/app/core/models/reservaRecurrente.models';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { TipoOrganizacion } from 'src/app/core/constants/Features';
import { Pago } from 'src/app/core/models/pago.model';
import { PagoService } from 'src/app/core/services/api/pago.service';
import { TicketComponent } from '../../reports/ticket/ticket.component';
import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';
import { ClasificadorRuatService } from 'src/app/core/services/api/clasificadorRuat.service';
import { ClasificadorRuat } from 'src/app/core/models/clasificadorRuat.model';

@Component({
  selector: 'app-booking-periodo-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbNavModule,
    NgbCollapseModule,
    NgbTypeaheadModule,
    CurrencyPipe,
    TicketComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class BookingPeriodoModalComponent implements OnInit, AfterViewInit {
  breadCrumbItems!: Array<{}>;
  currentTime!: string;

  @Input() accion!: string;
  @Input() row!: ReservaPeriodo;
  @Input() canActivate!: any[];
  @Output() emitList = new EventEmitter();
  @Output() reservaGenerada = new EventEmitter<Reserva>();

  userRole: 'Contribuyente' | 'Representante' | 'Encargado' | 'Admin' = 'Contribuyente';
  isLoading = false;
  isRuatAuthenticated = false;
  systemConfigList: { [key: string]: ConfiguracionSistema } = {};
  reservationsList: Reserva[] = [];
  complejosList: ComplejoDeportivo[] = [];
  camposDeportivosList: CampoDeportivo[] = [];
  organizationsList: Organizacion[] = [];
  estudiantesList: EstudianteEscuela[] = [];
  mensualidadesEstudiante: ReservaPeriodo[] = [];
  
  reservaForm!: FormGroup;
  validationForm!: FormGroup;
  submitted = false;
  validationSubmitted = false;
  
  filteredEscuelas: Organizacion[] = [];
  availableReservasRecurrentes: Reserva[] = [];
  
  clasificador!:ClasificadorRuat;
  selectedEstudiante?: EstudianteEscuela;
  selectedEscuela?: Organizacion;
  selectedReservaRecurrente?: Reserva;
  selectedMonth?: number;
  selectedYear?: number;

  motivo: string = '';
  observation: string = '';
  validationObservation: string = '';
  validationStatus: string = 'APROBADA';

  months = [
    { value: 1, name: 'Enero' },
    { value: 2, name: 'Febrero' },
    { value: 3, name: 'Marzo' },
    { value: 4, name: 'Abril' },
    { value: 5, name: 'Mayo' },
    { value: 6, name: 'Junio' },
    { value: 7, name: 'Julio' },
    { value: 8, name: 'Agosto' },
    { value: 9, name: 'Septiembre' },
    { value: 10, name: 'Octubre' },
    { value: 11, name: 'Noviembre' },
    { value: 12, name: 'Diciembre' }
  ];

  years: number[] = [];

  @ViewChild('validationModel') validationModel!: TemplateRef<any>;
  @ViewChild('ticketModal') ticketModal!: TemplateRef<any>;
  @ViewChild('annularModal') annularModal!: TemplateRef<any>;

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private router: Router,
    private cdRef: ChangeDetectorRef,
    private modalService: NgbModal,
    private authenticationService: AuthenticationService,
    private complejoService: ComplejosService,
    private campoService: CamposDeportivoService,
    private reservaService: ReservaService,
    private ruatService: RuatRequestsService,
    private reservaPeriodoService: ReservaPeriodoService,
    private estudianteService: EstudianteEscuelaService,
    private organizationService: OrganizacionService,
    private pagoService: PagoService,
    private ClasificadorService: ClasificadorRuatService
  ) {}

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'Complejo' },
      { label: 'Reserva Período', active: true }
    ];
    this.currentTime = new Date().toLocaleTimeString(); 
    this.systemConfigList = this.authenticationService.getAllConfigs();
    
    this.initializeForm();
    this.initializeYears();
    this.getClasificador();
    this.getEstudiantes();
    this.getOrganizations();
    
    if (this.accion === 'validarModal') {
      this.initValidationForm();
    } else if (this.accion === 'edit') {
      this.initEditForm();
    } else if (this.accion === 'show') {
      this.loadReservaData();
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

  private initializeForm(): void {
    this.reservaForm = this.fb.group({
      estudiante: ['', Validators.required],
      escuela: ['', Validators.required],
      reservaRecurrente: ['', Validators.required],
      mes: ['', Validators.required],
      año: ['', Validators.required],
      observaciones: ['']
    });

    const currentDate = new Date();
    this.reservaForm.patchValue({
      mes: currentDate.getMonth() + 1,
      año: currentDate.getFullYear()
    });

    this.selectedMonth = currentDate.getMonth() + 1;
    this.selectedYear = currentDate.getFullYear();
  }

  private initEditForm(): void {
    if (!this.row?.reservaDto) return;
    
    this.reservaForm = this.fb.group({
      estudiante: [{value: this.row.reservaDto.estudianteEscuelaDto?.uuid || '', disabled: true}, Validators.required],
      escuela: [{value: this.row.reservaDto.organizacionDto?.uuid || '', disabled: true}, Validators.required],
      reservaRecurrente: [{value: this.row.reservaDto.uuid || '', disabled: true}, Validators.required],
      mes: [this.row.mes, Validators.required],
      año: [this.row.año, Validators.required],
      observaciones: ['']
    });

    this.selectedMonth = this.row.mes;
    this.selectedYear = this.row.año;
    this.selectedEstudiante = this.row.reservaDto.estudianteEscuelaDto;
    this.selectedEscuela = this.row.reservaDto.organizacionDto;
    this.selectedReservaRecurrente = this.row.reservaDto;
  }

  private initValidationForm(): void {
    this.validationForm = this.fb.group({
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

  private initializeYears(): void {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 1; i <= currentYear + 1; i++) {
      this.years.push(i);
    }
  }

  private loadReservaData(): void {
    if (!this.row?.reservaDto) return;
    
    this.selectedEstudiante = this.row.reservaDto.estudianteEscuelaDto;
    this.selectedEscuela = this.row.reservaDto.organizacionDto;
    this.selectedReservaRecurrente = this.row.reservaDto;
    this.selectedMonth = this.row.mes;
    this.selectedYear = this.row.año;
  }

  onEstudianteChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const estudianteUuid = target.value;
    const estudiante = this.estudiantesList.find(e => e.uuid === estudianteUuid);    
    if (estudiante) {
      this.onEstudianteSelected(estudiante);
    }
  }

  onEstudianteSelected(estudiante: EstudianteEscuela): void {
    this.selectedEstudiante = estudiante;
    this.reservaForm.patchValue({ estudiante: estudiante.uuid });
    this.filteredEscuelas = this.organizationsList.filter(org => 
      org.tipoOrganizacion === TipoOrganizacion.ESCUELA_MUNICIPAL && 
      org.activo
    );
    this.loadMensualidadesEstudiante();
    this.selectedEscuela = undefined;
    this.selectedReservaRecurrente = undefined;
    this.availableReservasRecurrentes = [];
    this.reservaForm.patchValue({ 
      escuela: '',
      reservaRecurrente: '' 
    });
  }

  onEscuelaChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const escuelaUuid = target.value;
    const escuela = this.filteredEscuelas.find(e => e.uuid === escuelaUuid);    
    if (escuela) {
      this.onEscuelaSelected(escuela);
    }
  }

  onEscuelaSelected(escuela: Organizacion): void {
    this.selectedEscuela = escuela;
    this.reservaForm.patchValue({ escuela: escuela.uuid });
    this.loadReservasRecurrentesFromEscuela(escuela);
    this.selectedReservaRecurrente = undefined;
    this.reservaForm.patchValue({ reservaRecurrente: '' });
  }

  onReservaRecurrenteChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const reservaUuid = target.value;
    const reserva = this.availableReservasRecurrentes.find(r => r.uuid === reservaUuid);
    
    if (reserva) {
      this.onReservaRecurrenteSelected(reserva);
    }
  }

  onReservaRecurrenteSelected(reserva: Reserva): void {
    this.selectedReservaRecurrente = reserva;
    this.reservaForm.patchValue({ reservaRecurrente: reserva.uuid });
  }

  onMonthChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedMonth = parseInt(target.value);
    this.reservaForm.patchValue({ mes: this.selectedMonth });
    this.onMonthYearChange();
  }

  onYearChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedYear = parseInt(target.value);
    this.reservaForm.patchValue({ año: this.selectedYear });
    this.onMonthYearChange();
  }

  onMonthYearChange(): void {
    this.selectedMonth = this.reservaForm.get('mes')?.value;
    this.selectedYear = this.reservaForm.get('año')?.value;
    if (this.selectedEscuela) {
      this.filterReservasBySelectedMonth();
    }    
    this.checkExistingMensualidad();
  }

  onSubmit(): void {
    if (this.reservaForm.invalid) {
        Swal.fire({
            title: 'Formulario Incompleto',
            text: 'Por favor complete todos los campos requeridos',
            icon: 'warning',
            confirmButtonText: 'Entendido'
        });
        return;
    }

    if (!this.selectedEstudiante || !this.selectedEscuela || !this.selectedReservaRecurrente) {
        Swal.fire({
            title: 'Error',
            text: 'Seleccione estudiante, escuela y reserva recurrente',
            icon: 'error',
            confirmButtonText: 'Entendido'
        });
        return;
    }
    this.isLoading = true;
    const reservaData = this.prepareReservaPeriodoData();
    this.registerReservaPeriodoInRuat(reservaData);
  }

  saveData(): void {
    this.submitted = true;
    if (this.reservaForm.valid) {
      this.isLoading = true;
      
      const updatedData:any = {
        ...this.row,
        mes: this.reservaForm.value.mes,
        año: this.reservaForm.value.año,
        reservaDto: {
          ...this.row.reservaDto,
          observaciones: this.reservaForm.value.observaciones
        }
      };
      
      this.updateReservaPeriodo(updatedData);
    } else {
      this.notify('Formulario Inválido! Por favor complete todos los campos requeridos.', 'error');
    }
  }

  validateReservation(): void {
    this.validationSubmitted = true;
    this.updateObservationValidation(this.validationForm.value.validationStatus);
    
    if (this.validationForm.valid) {
      this.isLoading = true;
      
      const validationData = this.validationForm.value;
      const isApproved = validationData.validationStatus === EstadoValidacion.APROBADA;
      const reservaUuid = this.row.reservaDto?.uuid;

      if (!reservaUuid) {
        this.isLoading = false;
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

  annularData(formValues: any): void {
    if (!formValues || !this.row.reservaDto) {
      this.notify('No se pudo obtener los datos de la reserva', 'error');
      return;
    }
    
    const codigoAlcaldia =this.systemConfigList[ClaveConfiguracion.CODIGO_ALCALDIA_RUAT]?.valorTexto || 'QUI';
    const codigoUsuario = this.systemConfigList[ClaveConfiguracion.CODIGO_USUARIO_RUAT]?.valorTexto || '';
    const requestData = {
      numeroTasa: this.row.reservaDto.numeroTasa,
      motivo: formValues.motivo,
      observacion: formValues.observation
    };

    this.isLoading = true;

    this.ruatService.cancelTasa(codigoAlcaldia, codigoUsuario, requestData).subscribe({
      next: (resp: any) => {
        this.isLoading = false;

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
        this.isLoading = false;
        console.error('Error:', error);
        this.notify('Error al realizar la anulación en RUAT', 'error');
      },
    });
  }

  // Modal Methods
  openValidationModal(content: any): void {
    this.initValidationForm();
    const modalRef = this.modalService.open(content, { 
      centered: true, 
      size: 'md',
      backdrop: 'static'
    });
    
    modalRef.dismissed.subscribe((reason) => {
      this.onCloseModal();
    });
  }

  openDeleteModal(content: any): void {
    this.accion = 'annularModal';
    this.motivo = '';
    this.observation = '';
    this.modalService.open(content, { centered: true, size: 'md' });
  }

  openTicketModal(content: any): void {
    this.modalService.open(content, { centered: true, size: 'md' });
  }

  onCancel(): void {
    this.activeModal.dismiss('cancel');
  }

  onCloseModal(): void {
    this.accion = '';    
    if (this.reservaForm) {
      this.reservaForm.enable();
      this.reservaForm.reset();
    }
    if (this.validationForm) {
      this.validationForm.enable();
      this.validationForm.reset();
    }
    this.modalService.dismissAll();
    this.activeModal.dismiss();
  }

  // Helper Methods
  private approveReserva(reservaUuid: any, observaciones: string = ''): void {
    const aprobadoPor = this.authenticationService.currentUser()?.nombreCompleto || 'Sistema';
    
    this.reservaService.aprobarReserva(reservaUuid, aprobadoPor).subscribe({
      next: async (data: any) => {
        try {
          this.isLoading = false;
          await this.registerReservationInRuat(data.payload);
          this.openTicketModal(this.ticketModal);
          this.notify('Mensualidad aprobada exitosamente y registrada en RUAT', 'success');
          this.emitList.emit();
        } catch (error) {
          this.isLoading = false;
          console.error('Error in approval process:', error);
          this.notify('Reserva aprobada pero error en proceso adicional: ' + error, 'warning');
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error approving reservation:', error);
        this.notify('Error al aprobar la reserva: ' + (error.error?.message || error.message), 'error');
      }
    });
  }

  private rejectReserva(reservaUuid: any, motivoRechazo: string = ''): void {
    const aprobadoPor = this.authenticationService.currentUser()?.nombreCompleto || 'Sistema';
    
    this.reservaService.rechazarReserva(reservaUuid, motivoRechazo, aprobadoPor).subscribe({
      next: async (data: any) => {
        try {
          this.isLoading = false;
          this.openTicketModal(this.ticketModal);
          this.notify('Mensualidad rechazada exitosamente', 'success');
          this.emitList.emit();
        } catch (error) {
          this.isLoading = false;
          console.error('Error in rejection process:', error);
          this.notify('Reserva rechazada pero error en proceso adicional', 'warning');
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error rejecting reservation:', error);
        this.notify('Error al rechazar la reserva: ' + (error.error?.message || error.message), 'error');
      }
    });
  }

  private loadReservasRecurrentesFromEscuela(escuela: Organizacion): void {
    if (!escuela.reservasDtoList || escuela.reservasDtoList.length === 0) {
      this.availableReservasRecurrentes = [];
      return;
    }

    this.availableReservasRecurrentes = escuela.reservasDtoList.filter(reserva => 
      reserva.tipoReserva === 'recurrente' &&
      reserva.estadoValidacion === EstadoValidacion.APROBADA &&
      reserva.reservaRecurrenteDto?.activo === true
    );

    this.filterReservasBySelectedMonth();
  }

  private filterReservasBySelectedMonth(): void {
    if (!this.selectedMonth || !this.selectedYear) return;
    
    this.availableReservasRecurrentes = this.availableReservasRecurrentes.filter(reserva => 
      this.isReservaInSelectedMonth(reserva)
    );
  }

  private isReservaInSelectedMonth(reserva: Reserva): boolean {
    if (!this.selectedMonth || !this.selectedYear || !reserva.reservaRecurrenteDto) return false;
    const recurrente = reserva.reservaRecurrenteDto;
    const reservaStart = new Date(recurrente.fechaInicio);
    const reservaEnd = new Date(recurrente.fechaFin);
    const selectedDateStart = new Date(this.selectedYear, this.selectedMonth - 1, 1);
    const selectedDateEnd = new Date(this.selectedYear, this.selectedMonth, 0);
    return reservaStart <= selectedDateEnd && reservaEnd >= selectedDateStart;
  }

  private checkExistingMensualidad(): void {
    if (!this.selectedEstudiante || !this.selectedMonth || !this.selectedYear) return;
    const existingMensualidad = this.mensualidadesEstudiante.find(m => 
      m.mes === this.selectedMonth && m.año === this.selectedYear
    );
    if (existingMensualidad) {
      Swal.fire({
        title: 'Mensualidad Existente',
        text: `El estudiante ya tiene una mensualidad registrada para ${this.getMonthName(this.selectedMonth)} ${this.selectedYear}`,
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
    }
  }

  private loadMensualidadesEstudiante(): void {
    if (!this.selectedEstudiante?.uuid) return;
    this.reservaPeriodoService.getMensualidadesByEstudiante(this.selectedEstudiante.uuid).subscribe({
      next: (response: any) => {
        if (response.status === 'OK' && response.payload && response.payload.content) {
          this.mensualidadesEstudiante = response.payload.content;
        } else {
          this.mensualidadesEstudiante = [];
        }
      },
      error: (error) => {
        console.error('Error loading monthly payments:', error);
        this.mensualidadesEstudiante = [];
      }
    });
  }
  
  get form() {
    return this.reservaForm.controls;
  }
  get validationFormControls() {
    return this.validationForm.controls;
  }

  getMonthName(month: number): string {
    return this.months.find(m => m.value === month)?.name || '';
  }

  getTotalAmount(): number {
    return this.selectedEscuela?.tarifaMensual || 0;
  }

  getReservaDisplayInfo(reserva: Reserva): string {
    const recurrente = reserva.reservaRecurrenteDto;
    if (!recurrente) return 'Reserva sin información';
    const campo = reserva.campoDeportivoDto?.nombre || 'Campo no especificado';
    const dias = recurrente.diasSemana || 'Días no especificados';
    const horario = recurrente.duracionSesionHoras ? `${recurrente.duracionSesionHoras}h` : 'Horario no especificado';
    const fechaInicio = new Date(recurrente.fechaInicio).toLocaleDateString();
    const fechaFin = new Date(recurrente.fechaFin).toLocaleDateString();

    return `${campo} - ${dias} - ${horario} (${fechaInicio} a ${fechaFin})`;
  }

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
      [EstadoReserva.BORRADOR]: 'Mensualidad en proceso de creación',
      [EstadoReserva.SOLICITADA]: 'Esperando validación administrativa',
      [EstadoReserva.PENDIENTE]: 'Mensualidad aprobada, pendiente de pago',
      [EstadoReserva.PAGADA]: 'Pago confirmado, mensualidad activa',
      [EstadoReserva.EN_CURSO]: 'Mensualidad en curso',
      [EstadoReserva.COMPLETADA]: 'Mensualidad finalizada exitosamente',
      [EstadoReserva.CANCELADA]: 'Mensualidad cancelada',
      [EstadoReserva.RECHAZADA]: 'Mensualidad rechazada por validación',
      [EstadoReserva.EXPIRADA]: 'Tiempo de pago expirado',
      [EstadoReserva.NO_SHOW]: 'Estudiante no se presentó'
    };
    return descriptions[estado] || 'Estado desconocido';
  }

  getValidationDescription(estado: string): string {
    const descriptions: { [key: string]: string } = {
      'PENDIENTE': 'Esperando validación administrativa',
      'APROBADA': 'Mensualidad validada y aprobada',
      'RECHAZADA': 'Mensualidad rechazada por validación'
    };
    return descriptions[estado] || 'Estado de validación desconocido';
  }

  canValidateReservation(): boolean {
    const estadoValidacion = this.row?.reservaDto?.estadoValidacion;
    const estadoReserva = this.row?.reservaDto?.estadoReserva;
    return (estadoValidacion === 'PENDIENTE' && 
            estadoReserva === EstadoReserva.PENDIENTE && 
            this.canActivate.includes('VALIDAR'));
  }

  canEditReservation(): boolean {
    return this.row?.reservaDto?.estadoReserva === EstadoReserva.PENDIENTE && 
           this.canActivate.includes('ACTUALIZAR');
  }

  canCancelReservation(): boolean {
    const estado = this.row?.reservaDto?.estadoReserva;
    return (estado === EstadoReserva.SOLICITADA || estado === EstadoReserva.PENDIENTE) && 
           this.canActivate.includes('ANULAR');
  }

  private prepareReservaPeriodoData(): any {
    const formValue = this.reservaForm.value;
    
    const reservaPayload = {
        fechaCreacion: new Date().toISOString(),
        fechaReserva: new Date().toISOString(),
        estadoValidacion: EstadoValidacion.APROBADA,
        estadoReserva: EstadoReserva.PENDIENTE,
        tipoReserva: 'periodo',
        montoTotal: this.getTotalAmount(),
        clasificadorRuatId: this.clasificador.codigo,
        observaciones: formValue.observaciones || `Mensualidad para ${this.selectedEstudiante?.nombreCompleto} - ${this.selectedEscuela?.nombre}`,
        campoDeportivoDto: { 
            uuid: this.selectedReservaRecurrente?.campoDeportivoDto?.uuid 
        },
        contribuyenteDto: { 
            uuid: this.selectedEstudiante?.contribuyenteDto?.uuid 
        },
        estudianteEscuelaDto: {
            uuid: this.selectedEstudiante?.uuid
        },
        organizacionDto: {
            uuid: this.selectedEscuela?.uuid
        },
        tarifaDto: null,
        
        reservaPeriodoDto: {
            mes: formValue.mes,
            año: formValue.año,
            matricula: this.selectedEstudiante?.matricula,
            disciplina: this.selectedEscuela?.disciplina,
            entrenador: this.selectedEscuela?.entrenador
        }
    };

    return reservaPayload;
  }

  private registerReservaPeriodoInRuat(reservaData: any): void {
    const contribuyente = this.selectedEstudiante?.contribuyenteDto;
    
    if (!contribuyente?.codigoContribuyente) {
        this.handleError('Datos incompletos', 'Falta el código de contribuyente para registrar en RUAT');
        return;
    }

    const ruatData = {
        codigoAlcaldia:this.systemConfigList[ClaveConfiguracion.CODIGO_ALCALDIA_RUAT]?.valorTexto || 'QUI',
        codigoUsuario:this.systemConfigList[ClaveConfiguracion.CODIGO_USUARIO_RUAT]?.valorTexto || '',
        codigoContribuyente: contribuyente.codigoContribuyente,
        servicioMunicipal: this.systemConfigList[ClaveConfiguracion.SERVICIO_MUNICIPAL_RUAT]?.valorTexto || '2174',
        datosConcepto: [{
            numero: '1',
            codigoClasificador: reservaData.clasificadorRuatId,
            tipoArancel: 'DI',
            monto: reservaData.montoTotal.toFixed(2)
        }],
        observacion: reservaData.observaciones || 'Mensualidad Escuela Municipal'
    };

    this.ruatService.createTasa(
       this.systemConfigList[ClaveConfiguracion.CODIGO_ALCALDIA_RUAT]?.valorTexto || 'QUI',
      this.systemConfigList[ClaveConfiguracion.CODIGO_USUARIO_RUAT]?.valorTexto || '',
        this.systemConfigList[ClaveConfiguracion.SERVICIO_MUNICIPAL_RUAT]?.valorTexto || '2174',
        ruatData,
        contribuyente.codigoContribuyente
    ).subscribe({
        next: (response: any) => {
            if (response.status === 'OK' && response.payload.continuarFlujo) {
                reservaData.numeroTasa = response.payload.numeroTasa;
                this.saveReservaPeriodo(reservaData);
            } else {
                this.handleError('Error en RUAT', response.payload?.mensaje || 'No se pudo registrar la tasa');
            }
        },
        error: (error) => {
            this.isLoading = false;
            this.handleError('Error de conexión con RUAT', error.error?.mensaje || error.message);
        }
    });
  }

  private saveReservaPeriodo(reservaData: any): void {
    this.reservaService.create(reservaData).subscribe({
        next: (response: any) => {
            this.isLoading = false;
            if (response.status === 'OK') {
                Swal.fire({
                    title: '¡Éxito!',
                    text: 'Mensualidad registrada correctamente',
                    icon: 'success',
                    confirmButtonText: 'Aceptar'
                });
                this.reservaGenerada.emit(response.payload);
                this.activeModal.close('success');
            } else {
                throw new Error(response.message || 'Error al crear reserva');
            }
        },
        error: (error) => {
            this.isLoading = false;
            console.error('Error creating reservation:', error);
            let errorMessage = 'No se pudo registrar la mensualidad. Por favor, intente nuevamente.';
            
            if (error.error && error.error.message) {
                errorMessage = error.error.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            Swal.fire({
                title: 'Error',
                text: errorMessage,
                icon: 'error',
                confirmButtonText: 'Entendido'
            });
        }
    });
  }

  private updateReservaPeriodo(data: ReservaPeriodo): void {
    this.reservaPeriodoService.update(data).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.status === 'OK') {
          this.notify('Mensualidad actualizada exitosamente', 'success');
          this.emitList.emit();
          this.onCloseModal();
        } else {
          throw new Error(response.message || 'Error al actualizar mensualidad');
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error updating periodo reservation:', error);
        this.notify('Error al actualizar la mensualidad', 'error');
      }
    });
  }

  private registerReservationInRuat(reservaData: Reserva): void {
    const codigoAlcaldia =this.systemConfigList[ClaveConfiguracion.CODIGO_ALCALDIA_RUAT]?.valorTexto || 'QUI';
    const codigoUsuario = this.systemConfigList[ClaveConfiguracion.CODIGO_USUARIO_RUAT]?.valorTexto || '';
    const servicioMunicipal = this.systemConfigList[ClaveConfiguracion.SERVICIO_MUNICIPAL_RUAT]?.valorTexto || '2174';
    
    const ruatData = {
      codigoAlcaldia: codigoAlcaldia,
      codigoUsuario: codigoUsuario,
      codigoContribuyente: reservaData.contribuyenteDto.codigoContribuyente,
      servicioMunicipal: servicioMunicipal,
      datosConcepto: [{
        numero: '1',
        codigoClasificador: this.clasificador.codigo || reservaData.clasificadorRuatId,
        tipoArancel: "DI",
        monto: reservaData.montoTotal
      }],
      observacion: 'Mensualidad Escuela Municipal'
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

  private handleError(title: string, message: string): void {
      this.isLoading = false;
      Swal.fire({
          title: title,
          text: message,
          icon: 'error',
          confirmButtonText: 'Entendido'
      });
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

  /* API REQUESTS */
  private getClasificador(): void {
    this.ClasificadorService.getAll().subscribe({
      next: (response: any) => {
        if (response.status === 'OK') {
          const list = response.payload
          this.clasificador = list.find((item:ClasificadorRuat)=>
            item.nombre==='RESERVA CAMPOS DEPORTIVOS POR PERSONA'
          )
        }
      },
      error: (error) => {
        console.error('Error loading organizations:', error);
        this.organizationsList = [];
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar las organizaciones. Por favor, intente nuevamente.',
          icon: 'error',
          confirmButtonText: 'Entendido'
        });
      }
    });
  }
  private getOrganizations(): void {
    this.organizationService.getAll().subscribe({
      next: (response: any) => {
        if (response.status === 'OK') {
          this.organizationsList = response.payload.content || [];
        } else {
          this.organizationsList = [];
        }
      },
      error: (error) => {
        console.error('Error loading organizations:', error);
        this.organizationsList = [];
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar las organizaciones. Por favor, intente nuevamente.',
          icon: 'error',
          confirmButtonText: 'Entendido'
        });
      }
    });
  }

  private getEstudiantes(): void {
    this.estudianteService.getAll().subscribe({
      next: (response: any) => {
        if (response.status === 'OK') {
          this.estudiantesList = response.payload;
        } else {
          this.estudiantesList = [];
        }
      },
      error: (error) => {
        console.error('Error loading students:', error);
        this.estudiantesList = [];
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los estudiantes. Por favor, intente nuevamente.',
          icon: 'error',
          confirmButtonText: 'Entendido'
        });
      }
    });
  }
}