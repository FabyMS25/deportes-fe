import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import type { MensualityComponent } from './mensuality.component';

export const monthlyRegistrationAccess: CanActivateFn = () => {
  const authService = inject(AuthenticationService);
  const role = authService.getUserRole();
  return authService.hasPermission('/reservations/schools').includes('CREAR') ||
    (role === 'Contribuyente' && authService.currentUser()?.estadoUsuario === 'ACTIVO') ||
    inject(Router).createUrlTree(['/reservations/schools']);
};

export const leaveMonthlyRegistration: CanDeactivateFn<MensualityComponent> = page => page.canLeave();
