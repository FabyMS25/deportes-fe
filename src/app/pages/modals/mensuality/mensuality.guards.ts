import { CanDeactivateFn } from '@angular/router';
import type { MensualityComponent } from './mensuality.component';

/**
 * Only a navigation guard: it does not grant or deny access. Access to
 * /reservations/schools/new is already decided by the global AuthGuard using
 * the server-provided menu, and the backend enforces the business flags.
 */
export const leaveMonthlyRegistration: CanDeactivateFn<MensualityComponent> = page => page.canLeave();
