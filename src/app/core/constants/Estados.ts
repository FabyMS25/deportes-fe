// Estados de Reserva (estadoReserva)
export enum EstadoReserva { 
  SOLICITADA = 'SOLICITADA',       // Requested, pending approval --> initial state when compljo is restricted and needs admin approval
  // RECHAZADA = 'RECHAZADA',         // when is Solicitada and needs aproval but is Rejected by admin/manager but then is changed to CANCELADA so not more rechazada estado needed 
  PENDIENTE = 'PENDIENTE',         // waiting for payment/confirmation -> initial state after creation
  PAGADA = 'PAGADA',               // Payment verified in RUAT (ready to use)
  EN_CURSO = 'EN_CURSO',           // Currently active during scheduled time -> updated by system after start time
  COMPLETADA = 'COMPLETADA',       // Successfully completed --> updated by system after end time in puntual and after last date end in recurrent
  CANCELADA = 'CANCELADA',         // Cancelled reservation when paymet not completed so first check if is paid and then check timing -> updated by user/admin or system if not paid in time or in the deadline time and when esReservaGratuita is true then not cancelled automatically but only with user
  EXPIRADA = 'EXPIRADA',           // Didn't complete payment in time stipulated  -> updated by system after payment deadline
  NO_SHOW = 'NO_SHOW'              // User didn't show up for reservation -> updated by user
}
// Estados de Validación (estadoValidacion)
export enum EstadoValidacion {
  // NO_REQUIERE = 'NO_REQUIERE',     // Campo no requiere aprobación
  PENDIENTE = 'PENDIENTE',         // Esperando aprobación
  APROBADA = 'APROBADA',           // Aprobada por encargado/admin or automatic if complejo is open to automatic reservations
  RECHAZADA = 'RECHAZADA',         // when is Solicitada and needs aproval but is Rejected by admin/manager but then is changed to CANCELADA so not more rechazada estado needed 
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

