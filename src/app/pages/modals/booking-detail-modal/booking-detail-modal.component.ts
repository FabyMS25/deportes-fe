import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EstadoReserva, StatusUtils } from 'src/app/core/constants/Estados';
import { Reserva } from 'src/app/core/models/reserva.model';
import { BookingRecurrentModalComponent } from '../modal-booking-recurrent/modal-booking-recurrent.component';
import { BookingOneTimeModalComponent } from '../modal-booking-one-time/modal-booking-one-time.component';

@Component({
  selector: 'app-booking-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './booking-detail-modal.component.html',
})

export class BookingDetailModalComponent {
  @Input() reserva!: Reserva;
  @Input() clickedDate?: Date;
  @Input() canActivate: string[] = [];
  @Output() emitList = new EventEmitter();
  @Input() horaInicio?: string;  
  @Input() horaFin?: string;

  EstadoReserva = EstadoReserva;

  constructor(
    public activeModal: NgbActiveModal,
    private modalService: NgbModal
  ) {}

  get isRecurrente(): boolean {
    return this.reserva?.tipoReserva === 'recurrente';
  }

  get isPuntual(): boolean {
    return this.reserva?.tipoReserva === 'puntual';
  }

  get occurrenceDate(): Date | undefined {
    return this.clickedDate;
  }

  get occurrenceHoraInicio(): string {
    if (this.isRecurrente) {
      return this.clickedDate
        ? this.clickedDate.toTimeString().substring(0, 5)
        : '';
    }
    return this.reserva?.reservaPuntualDto?.horaInicio || '';
  }

  get occurrenceHoraFin(): string {
    if (this.isRecurrente) {
      return this.reserva?.reservaRecurrenteDto?.tableroDto ? '' : '';
    }
    return this.reserva?.reservaPuntualDto?.horaFin || '';
  }

  getStatusBadgeClass(estado: string | undefined): string {
    return StatusUtils.getStatusBadgeClass(estado || '');
  }

  getStatusAlertClass(estado: string | undefined): string {
    return StatusUtils.getStatusAlertClass(estado || '');
  }

  openFullDetail(): void {
    this.activeModal.dismiss();
    if (this.isRecurrente) {
      const modalRef = this.modalService.open(BookingRecurrentModalComponent, {
        backdrop: 'static', size: 'lg'
      });
      modalRef.componentInstance.row = {
        ...this.reserva.reservaRecurrenteDto,
        reservaDto: this.reserva
      };
      modalRef.componentInstance.accion = 'show';
      modalRef.componentInstance.canActivate = this.canActivate;
      modalRef.componentInstance.highlightedDate = this.clickedDate;
      modalRef.componentInstance.openedFromCalendar = true;  // ← add this
      modalRef.componentInstance.calendarContext = {         // ← add this
        reserva: this.reserva,
        clickedDate: this.clickedDate,
        horaInicio: this.horaInicio,
        horaFin: this.horaFin,
        canActivate: this.canActivate
      };
      modalRef.componentInstance.emitList.subscribe(() => this.emitList.emit());
    } else {
      const modalRef = this.modalService.open(BookingOneTimeModalComponent, {
        backdrop: 'static', size: 'lg'
      });
      modalRef.componentInstance.row = {
        ...this.reserva.reservaPuntualDto,
        reservaDto: this.reserva
      };
      modalRef.componentInstance.accion = 'show';
      modalRef.componentInstance.canActivate = this.canActivate;
      modalRef.componentInstance.openedFromCalendar = true;  // ← add this
      modalRef.componentInstance.calendarContext = {         // ← add this
        reserva: this.reserva,
        clickedDate: this.clickedDate,
        horaInicio: this.horaInicio,
        horaFin: this.horaFin,
        canActivate: this.canActivate
      };
      modalRef.componentInstance.emitList.subscribe(() => this.emitList.emit());
    }
  }
}
