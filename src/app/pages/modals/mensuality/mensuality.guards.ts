import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import type { MensualityComponent } from './mensuality.component';

export const monthlyRegistrationAccess: CanActivateFn = () =>
  inject(AuthenticationService).hasPermission('/reservations/schools').includes('CREAR') ||
  inject(Router).createUrlTree(['/reservations/schools']);

export const leaveMonthlyRegistration: CanDeactivateFn<MensualityComponent> = page => page.canLeave();
