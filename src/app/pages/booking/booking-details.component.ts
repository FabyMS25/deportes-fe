import { Component, OnInit, ViewChild, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SlickCarouselComponent } from 'ngx-slick-carousel';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { ComplejoDeportivo } from 'src/app/core/models/complejoDeportivo.model';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { Tarifa } from 'src/app/core/models/tarifa.model';
import { Reserva } from 'src/app/core/models/reserva.models';
import { Contribuyente } from 'src/app/core/models/contribuyente.models';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { RuatRequestsService } from 'src/app/core/services/ruat/ruatRequest.service';
import { GlobalComponent } from 'src/app/global-component';
import { BookingType, ReservationType } from 'src/app/core/constants/TipoCobro';

export enum BookingStep {
  COMPLEJO_SELECTION = 0,
  CAMPO_SELECTION = 1,
  HORARIO_SELECTION = 2,
  RESERVATION_FORM = 3
}
interface BookingState {
  complejo?: ComplejoDeportivo;
  campo?: CampoDeportivo;
  tarifa?: Tarifa;
  horario?: PuntualSchedule;
  recurrentSchedule?: RecurrentSchedule;
  contribuyente?: Contribuyente;
}
interface PuntualSchedule {
  date: Date;
  start: string;
  end: string;
}
interface RecurrentSchedule {
  tipoRecurrencia: 'semanal' | 'mensual';
  fechaInicio: Date;
  fechaFin: Date;
  diasSeleccionados: any[];
  tablero: string[][];
  cantidadSesiones: number;
  duracionSesionHoras: number;
}

@Component({
  selector: 'app-booking-details',
  templateUrl: './booking-details.component.html',
  styleUrls: ['./booking-details.component.scss']
})
export class BookingDetailsComponent implements OnInit, OnDestroy {
  breadCrumbItems!: Array<{}>;

  readonly BookingStep = BookingStep;
  
  currentTime!: string;
  globalAdmin = GlobalComponent.admin_deportes;
  VALID_HOURS = GlobalComponent.VALID_HOURS;
  ANTICIPATION_HOURS! :number;
  
  step: BookingStep = BookingStep.COMPLEJO_SELECTION;
  bookingType!: BookingType;
  bookingState: BookingState = {};
  reservationsList: Reserva[] = [];
  
  isLoading = false;
  isRuatAuthenticated = false;
  
  get dataComplejo(): ComplejoDeportivo | undefined { return this.bookingState.complejo;}
  get dataField(): CampoDeportivo |undefined { return this.bookingState.campo;}
  get selectedTariff(): Tarifa | undefined { return this.bookingState.tarifa;}
  get selectedSchedule(): PuntualSchedule | undefined { return this.bookingState.horario;}
  get contribuyente(): Contribuyente | undefined { return this.bookingState.contribuyente;}
  get recurrentSchedule(): RecurrentSchedule | undefined { return this.bookingState.recurrentSchedule;}
  get reservationType(): ReservationType | undefined { return this.selectedTariff?.tipoCobro as ReservationType;}
  get isEventReservation(): boolean { return this.reservationType === 'por_evento';}
  get isPuntualReservation(): boolean { return this.bookingType === 'puntual';}
  get isRecurrentReservation(): boolean { return this.bookingType === 'recurrente';}

  // Private Properties
  private destroy$ = new Subject<void>();

  @ViewChild('slickModal') slickModal!: SlickCarouselComponent;
  defaultImages = [
    'assets/images/fields/img-1.png',
    'assets/images/fields/img-2.png',
    'assets/images/fields/img-3.png',
    'assets/images/fields/img-4.png'
  ];
  config = {
    infinite: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    arrows: false
  };
  slidesConfig = {
    infinite: true,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true
  };

  constructor(
    private modalService: NgbModal,
    private reservaService: ReservaService,
    private ruatService: RuatRequestsService,
    private router: Router,
    private cdRef: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.breadCrumbItems = [
      { label: 'Complejo' },
      { label: 'Reserva', active: true }
    ];
    this.currentTime = new Date().toLocaleTimeString();
    this.initializeFromNavigation();
    this.initializeUserData();
    await this.authenticateRuat();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.modalService.dismissAll();
  }

  private initializeFromNavigation(): void {
    const navigationData = history.state;
    
    if (navigationData.data) {
      this.bookingState.complejo = navigationData.data;
      this.bookingType = navigationData.tipoReserva || 'puntual';
      this.step = BookingStep.CAMPO_SELECTION;
    } else if (navigationData.tipoReserva) {
      this.bookingType = navigationData.tipoReserva;
      this.step = BookingStep.COMPLEJO_SELECTION;
    } else {
      this.step = BookingStep.COMPLEJO_SELECTION;
    }
  }
  
  private initializeUserData(): void {
    const authToken = window.sessionStorage.getItem('auth-token');
    const currentUserStr = window.sessionStorage.getItem('currentUser');
    
    if (authToken === 'isContribuyente' && currentUserStr) {
      try {
        this.bookingState.contribuyente = JSON.parse(currentUserStr);
        if (!this.bookingType) {
          this.bookingType = 'puntual';
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        this.showNotification(
          'Error al cargar datos del usuario. Por favor, inicie sesión nuevamente.','error'
        );
      }
    }
  }

  private async authenticateRuat(): Promise<void> {
    try {
      const response = await this.ruatService.authenticate()
        .pipe(takeUntil(this.destroy$))
        .toPromise();
      
      if (response?.token) {
        window.sessionStorage.setItem('ruatToken', response.token);
        this.isRuatAuthenticated = true;
      }
    } catch (error) {
      console.error('Error authenticating with RUAT:', error);
      this.showNotification(
        'Advertencia: No se pudo conectar con el RUAT. Algunas funcionalidades podrían estar limitadas.',
        'warning'
      );
    }
  }

  onComplejoSelected(complejo: ComplejoDeportivo): void {
    if (!complejo) {
      this.showNotification('Datos de complejo inválidos', 'error');
      return;
    }
    this.bookingState.complejo = complejo;
    this.step = BookingStep.CAMPO_SELECTION;
    this.cdRef.detectChanges();
  }

  async onCampoSelected(selection: { field: CampoDeportivo; tariff: Tarifa }): Promise<void> {
    if (!selection?.field || !selection?.tariff) {
      this.showNotification('Datos de selección inválidos', 'error');
      return;
    }
    console.log(selection)
    this.bookingState.campo = selection.field;
    this.bookingState.tarifa = selection.tariff;
    if(this.bookingState.tarifa.tipoCobro === 'por_hora'|| this.bookingState.tarifa.tipoCobro === 'por_persona'){
       this.ANTICIPATION_HOURS = GlobalComponent.ANTICIPATION_PUNTUAL_HOURS
    }else{if(this.bookingState.tarifa.tipoCobro === 'por_evento'){
       this.ANTICIPATION_HOURS = GlobalComponent.ANTICIPATION_EVENT_HOURS
    }else{
       this.ANTICIPATION_HOURS = GlobalComponent.ANTICIPATION_RECURRENT_DAYS
    }}
   this.isLoading = true;    
    try {
      await this.loadReservationsByField(selection.field.uuid!);
      if (this.isEventReservation) {
        this.step = BookingStep.RESERVATION_FORM;
      } else {
        this.step = BookingStep.HORARIO_SELECTION;
      }
    } catch (error) {
      console.error('Error loading reservations:', error);
      this.showNotification('Error al cargar las reservas existentes', 'error');
    } finally {
      this.isLoading = false;
      this.cdRef.detectChanges();
    }
  }

  onHorarioSelected(horario: PuntualSchedule): void {
    if (!this.validatePuntualSchedule(horario)) {
      return;
    }
    
    this.bookingState.horario = horario;
    this.modalService.dismissAll();
    this.step = BookingStep.RESERVATION_FORM;
    this.cdRef.detectChanges();
  }

  onRecurrentScheduleCompleted(scheduleData: RecurrentSchedule): void {
    if (!this.validateRecurrentSchedule(scheduleData)) {
      return;
    }

    this.bookingState.recurrentSchedule = scheduleData;
    this.step = BookingStep.RESERVATION_FORM;
    this.cdRef.detectChanges();
  }

  onReservationCompleted(reservaData: Reserva): void {
    this.isLoading = false;
    
    // Handle successful reservation creation
    this.showSuccessModal(reservaData);
    
    // Navigate to appropriate view or reset state
    // Implementation depends on your flow requirements
  }

  // ==================== NAVIGATION ====================

  next(): void {
    if (!this.canProceedToNextStep()) {
      return;
    }

    this.step++;
    this.cdRef.detectChanges();
  }

  back(): void {
    if (this.step > BookingStep.COMPLEJO_SELECTION) {
      this.step--;
      this.clearForwardStepData();      
      this.cdRef.detectChanges();
    } else {
      this.navigateToHome();
    }
  }

  private canProceedToNextStep(): boolean {
    const validations: Record<BookingStep, () => boolean> = {
      [BookingStep.COMPLEJO_SELECTION]: () => {
        if (!this.dataComplejo) {
          this.showNotification('Por favor seleccione un complejo deportivo', 'warning');
          return false;
        }
        return true;
      },
      [BookingStep.CAMPO_SELECTION]: () => {
        if (!this.dataField || !this.selectedTariff) {
          this.showNotification('Por favor seleccione una cancha y tarifa', 'warning');
          return false;
        }
        return true;
      },
      [BookingStep.HORARIO_SELECTION]: () => {
        const hasValidSchedule = this.isPuntualReservation 
          ? !!this.selectedSchedule 
          : !!this.recurrentSchedule;
        
        if (!hasValidSchedule) {
          this.showNotification('Por favor seleccione un horario', 'warning');
          return false;
        }
        return true;
      },
      [BookingStep.RESERVATION_FORM]: () => true
    };

    return validations[this.step]?.() ?? false;
  }

  private clearForwardStepData(): void {
    switch (this.step) {
      case BookingStep.COMPLEJO_SELECTION:
        this.bookingState.campo = undefined;
        this.bookingState.tarifa = undefined;
        this.bookingState.horario = undefined;
        this.bookingState.recurrentSchedule = undefined;
        this.reservationsList = [];
        break;
      case BookingStep.CAMPO_SELECTION:
        this.bookingState.horario = undefined;
        this.bookingState.recurrentSchedule = undefined;
        break;
      case BookingStep.HORARIO_SELECTION:
        break;
    }
  }

  private navigateToHome(): void {
    this.router.navigate(['/inicio/taxpayer']);
  }

  private validatePuntualSchedule(horario: PuntualSchedule): boolean {
    if (!horario?.date) {
      this.showNotification('Por favor seleccione una fecha válida', 'warning');
      return false;
    }
    if (!horario?.start || !horario?.end) {
      this.showNotification('Por favor seleccione un horario válido', 'warning');
      return false;
    }
    if (horario.start >= horario.end) {
      this.showNotification('La hora de fin debe ser posterior a la hora de inicio', 'warning');
      return false;
    }
    return true;
  }

  private validateRecurrentSchedule(schedule: RecurrentSchedule): boolean {
    if (!schedule?.fechaInicio || !schedule?.fechaFin) {
      this.showNotification('Por favor seleccione un rango de fechas válido', 'warning');
      return false;
    }
    if (schedule.fechaInicio >= schedule.fechaFin) {
      this.showNotification('La fecha de fin debe ser posterior a la fecha de inicio', 'warning');
      return false;
    }
    if (!schedule.tablero?.length) {
      this.showNotification('Por favor configure el horario recurrente', 'warning');
      return false;
    }
    if (!schedule.cantidadSesiones || schedule.cantidadSesiones < 1) {
      this.showNotification('Debe tener al menos una sesión programada', 'warning');
      return false;
    }
    return true;
  }


  openScheduleModal(content: any): void {
    if (!this.dataField) {
      this.showNotification('Primero debe seleccionar una cancha', 'warning');
      return;
    }    
    this.modalService.open(content, { 
      size: 'md', 
      centered: true,
      backdrop: 'static'
    });
  }

  // ==================== CAROUSEL METHODS ====================

  slickChange(event: any): void {
    const swiper = document.querySelectorAll('.swiperlist');
    // TODO: Implementar lógica si es necesaria
  }

  slidePreview(id: number, event: any): void {
    const slides = document.querySelectorAll('.swiperlist');
    
    slides.forEach((el: Element) => {
      el.classList.remove('swiper-slide-thumb-active');
    });
    
    event.target.closest('.swiperlist')?.classList.add('swiper-slide-thumb-active');
    this.slickModal?.slickGoTo(id);
  }

  private async loadReservationsByField(fieldUuid: string): Promise<void> {
    if (!fieldUuid) {
      throw new Error('UUID del campo es requerido');
    }

    return new Promise((resolve, reject) => {
      this.reservaService.getByCampoDeportivo(fieldUuid)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response?.status === 'OK') {
              this.reservationsList = response.payload || [];
              resolve();
            } else {
              reject(new Error(response?.payload || 'Error al cargar reservas'));
            }
          },
          error: (error) => {
            console.error('Error fetching reservations:', error);
            reject(error);
          }
        });
    });
  }

  private showNotification(
    message: string, 
    type: 'success' | 'error' | 'warning' | 'info'
  ): void {
    Swal.fire({
      title: message,
      icon: type,
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  }

  private showSuccessModal(reservaData: Reserva): void {
    const paymentDeadlineMessage = this.VALID_HOURS > 1 
      ? `${this.VALID_HOURS} horas` 
      : `${this.VALID_HOURS} hora`;

    Swal.fire({
      title: '¡Reserva Creada Exitosamente!',
      html: `
        <div class="text-start">
          <p class="mb-2">Su reserva ha sido registrada correctamente.</p>
          <div class="alert alert-warning mb-0">
            <strong>Importante:</strong> Debe realizar el pago dentro de las próximas 
            <strong>${paymentDeadlineMessage}</strong>, de lo contrario la reserva será 
            cancelada automáticamente.
          </div>
        </div>
      `,
      icon: 'success',
      confirmButtonText: 'Ver Comprobante',
      confirmButtonColor: '#3085d6',
      showCancelButton: true,
      cancelButtonText: 'Ver Mis Reservas',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
        this.navigateToTicket(reservaData);
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        this.navigateToReservations();
      }
    });
  }

  private navigateToTicket(reservaData: Reserva): void {
    this.router.navigate(['/reservations/ticket'], { 
      state: { data: reservaData } 
    });
  }

  private navigateToReservations(): void {
    this.router.navigate(['/reservations/list']);
  }
}