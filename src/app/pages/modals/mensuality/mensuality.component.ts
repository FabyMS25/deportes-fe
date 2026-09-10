import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { MensualityWorkflow } from './mensuality-workflow';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-monthly-registration-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './mensuality.component.html',
  styleUrls: ['./mensuality.component.scss']
})
export class MensualityComponent extends MensualityWorkflow {
  private pageRouter = inject(Router);
  private pageRoute = inject(ActivatedRoute);
  private pageAuth = inject(AuthenticationService);
  completed = false;

  override ngOnInit(): void {
    this.initializePageContext();
    this.reservaGenerada.subscribe(() => this.completed = true);
    super.ngOnInit();
  }

  initializePageContext(): void {
    this.pageMode = true;
    this.accion = '';
    this.canActivate = this.pageAuth.hasPermission('/reservations/schools');
    const month = Number(this.pageRoute.snapshot.queryParamMap.get('mes'));
    const year = Number(this.pageRoute.snapshot.queryParamMap.get('anio'));
    this.defaultPeriodo = {
      mesFiltro: Number.isInteger(month) && month >= 1 && month <= 12 ? month : undefined,
      anioFiltro: Number.isInteger(year) && year >= 1900 && year <= 9999 ? year : undefined
    };
  }

  override onCloseModal(): void {
    this.backToList();
  }

  get hasPendingChanges(): boolean {
    return !this.completed && (
      this.reservationForm?.dirty || !!this.selection.school ||
      this.selection.students.length > 0 || this.selection.detailKeys.size > 0);
  }

  backToList(): void {
    if (!this.isLoading) void this.pageRouter.navigate(['/reservations/schools']);
  }

  async canLeave(): Promise<boolean> {
    if (this.isLoading) return false;
    if (!this.hasPendingChanges) return true;
    const result = await Swal.fire({
      title: '¿Salir del registro?',
      text: 'Se perderán la selección de estudiantes, los meses y los datos que aún no registró.',
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Salir sin registrar', cancelButtonText: 'Continuar registro',
      focusCancel: true
    });
    return result.isConfirmed;
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.isLoading || this.hasPendingChanges) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
