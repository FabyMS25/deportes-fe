// Estados de Reserva (estadoReserva)
export enum EstadoReserva { 
  SOLICITADA = 'SOLICITADA',       // Requested, pending approval --> initial state when compljo is restricted and needs admin approval
  PENDIENTE = 'PENDIENTE',         // waiting for payment/confirmation -> initial state after creation
  PAGADA = 'PAGADA',               // Payment verified in RUAT (ready to use)
  EN_CURSO = 'EN_CURSO',           // Currently active during scheduled time -> updated by system after start time
  COMPLETADA = 'COMPLETADA',       // Successfully completed --> updated by system after end time in puntual and after last date end in recurrent
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


export const StatusUtils = {
  getEstadoReservaOptions(): { value: string; label: string }[] {
    return Object.keys(EstadoReserva).map(key => ({
      value: EstadoReserva[key as keyof typeof EstadoReserva],
      label: this.formatEnumLabel(key)
    }));
  },
  getEstadoValidacionOptions(): { value: string; label: string }[] {
    return Object.keys(EstadoValidacion).map(key => ({
      value: EstadoValidacion[key as keyof typeof EstadoValidacion],
      label: this.formatEnumLabel(key)
    }));
  },
  getEstadoPagoOptions(): { value: string; label: string }[] {
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
      BORRADOR: 'secondary',

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
