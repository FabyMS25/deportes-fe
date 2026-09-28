import { TipoOrganizacion } from './Features';
import type { Reserva } from '../models/reserva.model';

// Estados de Reserva (estadoReserva)
export enum EstadoReserva { 
  SOLICITADA = 'SOLICITADA',       // Requested, pending approval --> initial state when compljo is restricted and needs admin approval
  PENDIENTE = 'PENDIENTE',         // waiting for payment/confirmation -> initial state after creation
  PAGADA = 'PAGADA',               // Payment verified in RUAT (ready to use)
  EN_CURSO = 'EN_CURSO',           // Currently active during scheduled time -> updated by system after start time
  COMPLETADA = 'COMPLETADA',       // Completed by dates, except free school recurrent bases: manual closure with ACTUALIZAR.
  CANCELADA = 'CANCELADA',         // Cancelled reservation when paymet not completed so first check if is paid and then check timing -> updated by user/admin or system if not paid in time or in the deadline time and when esReservaGratuita is true then not cancelled automatically but only with user
  EXPIRADA = 'EXPIRADA',           // Didn't complete payment in time stipulated  -> updated by system after payment deadline // Payment deadline passed after approval (post-RUAT)
  NO_SHOW = 'NO_SHOW'              // User didn't show up for reservation -> updated by user
}
// Estados de Validación (estadoValidacion)
export enum EstadoValidacion {
  PENDIENTE  = 'PENDIENTE',   // Awaiting admin action
  APROBADA   = 'APROBADA',    // Approved → triggers RUAT registration
  RECHAZADA  = 'RECHAZADA',   // Rejected → triggers CANCELADA on reserva
  VENCIDA    = 'VENCIDA',     // Admin never acted before the reservation date passed
}
// Estados de Pago (estadoPago)
export enum EstadoPago {
  PENDIENTE = 'PENDIENTE',        // No pagado
  PAGADO = 'PAGADO',              // Pagado y verificado
  PARCIAL = 'PARCIAL',            // Pago parcial
  REEMBOLSADO = 'REEMBOLSADO',    // Devuelto por cancelación
  FALLIDO = 'FALLIDO',            // Intento de pago fallido
}
// Estados de Usuario (estadoUsuario)
export enum EstadoUsuario {
  PENDIENTE_VERIFICACION = 'PENDIENTE_VERIFICACION', // Registro en Ruat no verificado
  ACTIVO = 'ACTIVO',                                 // Usuario habilitado en Ruat y sistema
  INACTIVO = 'INACTIVO',                             // Usuario deshabilitado,, no podrá reservar ni acceder al sistema
  SANCIONADO = 'SANCIONADO',                         // Tiene sanción activa
  BLOQUEADO = 'BLOQUEADO'                            // Bloqueado por múltiples infracciones o alguna razón administrativa, no podrá reservar
}
export enum EstadoRuat {
  ACTIVO = 'ACTIVO', 
  BAJA = 'BAJA'
}
// Estados de Complejo y Campo Deportivo (estadoActual)
export enum EstadoActual {
  ACTIVO = 'ACTIVO',                       // Disponible para reservas
  MANTENIMIENTO = 'MANTENIMIENTO',         // En mantenimiento, no disponible
  CERRADO = 'CERRADO',                     // Cerrado temporalmente
  EVENTO_MUNICIPAL = 'EVENTO_MUNICIPAL'   // Reservado para evento prioritario
}

export enum TipoBeneficiarioReserva {
  CONTRIBUYENTE = 'CONTRIBUYENTE',
  ORGANIZACION = 'ORGANIZACION'
}

export enum TipoContribuyenteReserva {
  NATURAL = 'NA',
  JURIDICA = 'JU'
}

const RESERVATION_STATUS_LABELS: Record<EstadoReserva, string> = {
  [EstadoReserva.SOLICITADA]: 'Solicitada',
  [EstadoReserva.PENDIENTE]: 'Pendiente',
  [EstadoReserva.PAGADA]: 'Pagada',
  [EstadoReserva.EN_CURSO]: 'En curso',
  [EstadoReserva.COMPLETADA]: 'Completada',
  [EstadoReserva.CANCELADA]: 'Cancelada',
  [EstadoReserva.EXPIRADA]: 'Expirada',
  [EstadoReserva.NO_SHOW]: 'No show'
};

const RESERVATION_STATUS_PLURAL_LABELS: Record<EstadoReserva, string> = {
  [EstadoReserva.SOLICITADA]: 'Solicitadas',
  [EstadoReserva.PENDIENTE]: 'Pendientes',
  [EstadoReserva.PAGADA]: 'Pagadas',
  [EstadoReserva.EN_CURSO]: 'En curso',
  [EstadoReserva.COMPLETADA]: 'Completadas',
  [EstadoReserva.CANCELADA]: 'Canceladas',
  [EstadoReserva.EXPIRADA]: 'Expiradas',
  [EstadoReserva.NO_SHOW]: 'No show'
};

const RESERVATION_STATUS_DESCRIPTIONS: Record<EstadoReserva, string> = {
  [EstadoReserva.SOLICITADA]: 'Esperando validación administrativa',
  [EstadoReserva.PENDIENTE]: 'Reserva aprobada, pendiente de pago',
  [EstadoReserva.PAGADA]: 'Pago confirmado, reserva activa',
  [EstadoReserva.EN_CURSO]: 'Reserva en curso',
  [EstadoReserva.COMPLETADA]: 'Reserva finalizada exitosamente',
  [EstadoReserva.CANCELADA]: 'Reserva cancelada',
  [EstadoReserva.EXPIRADA]: 'Tiempo de pago expirado',
  [EstadoReserva.NO_SHOW]: 'El usuario no se presentó'
};

const VALIDATION_STATUS_DESCRIPTIONS: Record<EstadoValidacion, string> = {
  [EstadoValidacion.PENDIENTE]: 'Esperando validación administrativa',
  [EstadoValidacion.APROBADA]: 'Reserva validada y aprobada',
  [EstadoValidacion.RECHAZADA]: 'Reserva rechazada durante la validación',
  [EstadoValidacion.VENCIDA]: 'El plazo de validación venció'
};


export const StatusUtils = {
  reservationCloseAction(reserva: Reserva | undefined, permissions: readonly string[] = []): { kind: 'reject' | 'annul' | 'cancel'; label: string } | null {
    if (!reserva) return null;
    const hasTax = !!reserva.numeroTasa?.trim();
    if (reserva.estadoReserva === EstadoReserva.SOLICITADA) {
      return reserva.tipoReserva !== 'periodo' && !hasTax &&
        reserva.estadoValidacion === EstadoValidacion.PENDIENTE && permissions.includes('VALIDAR')
        ? { kind: 'reject', label: 'Rechazar solicitud' } : null;
    }
    if (!permissions.includes('ANULAR') || reserva.estadoValidacion !== EstadoValidacion.APROBADA) return null;
    if (reserva.estadoReserva === EstadoReserva.PENDIENTE && hasTax) {
      return { kind: 'annul', label: 'Anular tasa y reserva' };
    }
    if (reserva.tipoReserva !== 'periodo' && reserva.esReservaGratuita && !hasTax &&
        [EstadoReserva.PENDIENTE, EstadoReserva.PAGADA, EstadoReserva.EN_CURSO].includes(reserva.estadoReserva as EstadoReserva)) {
      return { kind: 'cancel', label: 'Cancelar reserva' };
    }
    return null;
  },
  esRecurrenteGratuitaDeEscuela(reserva?: Reserva): boolean {
    return reserva?.tipoReserva === 'recurrente' && reserva.esReservaGratuita === true &&
      reserva.organizacionDto?.tipoOrganizacion === TipoOrganizacion.ESCUELA_MUNICIPAL;
  },

  puedeCompletarReservaEscuela(reserva?: Reserva): boolean {
    return this.esRecurrenteGratuitaDeEscuela(reserva) && reserva?.estadoValidacion === EstadoValidacion.APROBADA &&
      [EstadoReserva.PENDIENTE, EstadoReserva.PAGADA, EstadoReserva.EN_CURSO].includes(reserva.estadoReserva);
  },

  getReservationStatusOptions(): { value: string; label: string }[] {
    return Object.values(EstadoReserva).map(status => ({
      value: status,
      label: RESERVATION_STATUS_LABELS[status]
    }));
  },
  getReservationStatusLabel(status: EstadoReserva | string, plural = false): string {
    const labels = plural ? RESERVATION_STATUS_PLURAL_LABELS : RESERVATION_STATUS_LABELS;
    return labels[status as EstadoReserva] || this.formatEnumLabel(status);
  },
  getReservationStatusDescription(status?: EstadoReserva | string): string {
    return status
      ? RESERVATION_STATUS_DESCRIPTIONS[status as EstadoReserva] || 'Estado desconocido'
      : 'Estado desconocido';
  },
  getValidationStatusDescription(status?: EstadoValidacion | string): string {
    return status
      ? VALIDATION_STATUS_DESCRIPTIONS[status as EstadoValidacion] || 'Estado de validación desconocido'
      : 'Estado de validación desconocido';
  },
  isCriticalReservationStatus(status?: EstadoReserva | string): boolean {
    return !!status && [
      EstadoReserva.CANCELADA,
      EstadoReserva.EXPIRADA,
      EstadoReserva.NO_SHOW
    ].includes(status as EstadoReserva);
  },
  getEstadoValidacionOptions(): { value: string; label: string }[] {
    return Object.keys(EstadoValidacion).map(key => ({
      value: EstadoValidacion[key as keyof typeof EstadoValidacion],
      label: this.formatEnumLabel(key)
    }));
  },
  getPaymentStatusOptions(): { value: string; label: string }[] {
    return Object.keys(EstadoPago).map(key => ({
      value: EstadoPago[key as keyof typeof EstadoPago],
      label: this.formatEnumLabel(key)
    }));
  },
  getEstadoUsuarioOptions(): { value: string; label: string }[] {
    return Object.keys(EstadoUsuario).map(key => ({
      value: EstadoUsuario[key as keyof typeof EstadoUsuario],
      label: this.formatEnumLabel(key)
    }));
  },
  getEstadoActualOptions(): { value: string; label: string }[] {
    return Object.keys(EstadoActual).map(key => ({
      value: EstadoActual[key as keyof typeof EstadoActual],
      label: this.formatEnumLabel(key)
    }));
  },
  formatEnumLabel(key: string): string {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },
  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      // EstadoReserva
      SOLICITADA: 'warning',
      PENDIENTE: 'warning',
      PAGADA: 'success',
      EN_CURSO: 'primary',
      COMPLETADA: 'success',
      CANCELADA: 'danger',
      EXPIRADA: 'secondary',
      NO_SHOW: 'danger',
      // EstadoValidacion
      APROBADA: 'success',
      RECHAZADA: 'danger',
      VENCIDA: 'secondary',

      // EstadoPago
      PAGADO: 'success',
      PARCIAL: 'warning',
      REEMBOLSADO: 'info',
      FALLIDO: 'danger',

      // EstadoUsuario
      ACTIVO: 'success',
      INACTIVO: 'secondary',
      PENDIENTE_VERIFICACION: 'warning',
      SANCIONADO: 'danger',
      BLOQUEADO: 'danger',

      // EstadoActual / EstadoRUAT
      MANTENIMIENTO: 'warning',
      CERRADO: 'danger',
      EVENTO_MUNICIPAL: 'info',
      BAJA: 'secondary'
    };

    return colorMap[status] || 'secondary';
  },
  getStatusTextClass(status: string): string {
    return `text-${this.getStatusColor(status)}`;
  },
  getStatusBgClass(status: string): string {
    return `bg-${this.getStatusColor(status)}`;
  },
  getStatusBadgeClass(status: string): string {
    const color = this.getStatusColor(status);
    return `bg-${color}-subtle text-${color}`;
  },
  getStatusAlertClass(status: string): string {
    return `alert-${this.getStatusColor(status)}`;
  },
  getStatusRibbonClass(status: string): string {
    return `ribbon-${this.getStatusColor(status)}`;
  }
};
