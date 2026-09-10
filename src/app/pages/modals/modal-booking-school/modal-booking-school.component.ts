import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { TicketComponent } from '../../modules/reports/ticket/ticket.component';
import { MensualityWorkflow } from '../mensuality/mensuality-workflow';

/** Existing detail, consultation and cancellation dialogs share the mensualidad operations. */
@Component({
  selector: 'app-booking-periodo-modal', standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgbNavModule, TicketComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './modal-booking-school.component.html',
  styleUrls: ['./modal-booking-school.component.scss']
})
export class BookingPeriodoModalComponent extends MensualityWorkflow {}
