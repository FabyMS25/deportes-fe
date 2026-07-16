
// export interface ConfiguracionSistema {
//   uuid?: string;
//   estado?: boolean;
//   fechaCreacion?: Date;
//   fechaActualizacion?: Date;
  
//   // Identification
//   clave: ClaveConfiguracion;              // Unique key identifier
//   categoria: CategoriaConfiguracion;          // Group related configs
  
//   // Values (flexible storage)
//   valorNumerico?: number;     // For numeric values
//   valorTexto?: string;        // For text values
//   valorBoolean?: boolean;     // For boolean flags
//   valorJson?: string;         // For complex objects (JSON string)
  
//   // Metadata
//   nombre: string;             // Display name
//   descripcion?: string;       // What this config does
//   unidadMedida?: UnidadMedida;      // 'horas', 'dias', 'bolivianos', 'porcentaje'
  
//   // Validation
//   valorMinimo?: number;       // Min allowed value
//   valorMaximo?: number;       // Max allowed value
//   valoresPosibles?: string;   // JSON array of allowed values
  
//   // Control
//   modificablePorUsuario: boolean;  // Can users change this?
//   requiereAprobacion: boolean;     // Needs admin approval to change?
//   activo: boolean;                 // Is this config active?
  
//   // Audit
//   ultimaModificacion?: Date;
//   modificadoPor?: string;     // User UUID who modified
  
//   // Application scope
//   aplicaA?: AplicaAConfiguracion;           // 'global', 'usuario', ..
//   referenciaUuid?: string;    // UUID of related entity (if aplicaA != 'global')
// }
// export interface ClasificadorRuat {
//   uuid?: string;
//   estado?: boolean;
//   fechaCreacion?: Date;

//   codigo:string;
//   nombre:string;
//   descripcion?:string;
//   // tipoReserva:String; // por_hora , por_persona , por_evento , mensualidad , por_club
//   tipoArancel:string;
//   activo: boolean;
  
//   tarifasDtoList?:Tarifa[];
// }
// export interface ComplejoDeportivo {
//   uuid?: string;
//   estado?: boolean;
//   fechaCreacion?: Date;

//   estadoActual: EstadoActual;
//   nombre: string;
//   telefonoPrincipal?: string;
//   tipoEstructura: TipoEstructura;
//   tieneIluminacion: boolean;
//   tieneVestuarios: boolean;
//   tieneGraderias: boolean;
//   observaciones?: string;
  
//   distrito?: string;
//   ubicacion: string;
//   latitud: number;
//   longitud: number;
  
//   camposDeportivosDtoList?: CampoDeportivo[];  
//   encargadosDtoList?: EncargadoComplejo[];
// }
// export interface CampoDeportivo {
//   uuid?: string;
//   estado?: boolean;
//   fechaCreacion?: Date;

//   estadoActual: EstadoActual;
//   codigo?: string;
//   nombre: string;
//   categoria: CategoriaCampo;
//   dimensiones?: string;
//   capacidadPersonas?: number;
//   tieneIluminacion?: boolean;
//   accesoLibre: boolean; 
//   observaciones?: string;
  
//   requiereAprobacion:Boolean;// some campos may require validate any reserva but some not 
//   horasMinimaAprobacion?:number;
//   maxDuracionAutoAprobacion?:number;
//   maxPersonasAutoAprobacion?:number;

//   complejoDto: ComplejoDeportivo;
//   superficieDto: Superficie;
//   tarifasDtoList?: Tarifa[];
//   horariosFijosDtoList?: HorarioFijo[];
//   horariosExcepcionesDtoList?: HorarioExcepcion[];

//   reservasList?: Reserva[];
// }
// export interface HorarioFijo {
//   uuid?: string;
//   estado?: boolean;
//   fechaCreacion?: Date;

//   dia: Dia;
//   abierto: boolean;
//   horaApertura?: string; // "HH:mm:ss"
//   horaCierre?: string; // "HH:mm:ss"
//   observaciones?: string;
  
//   campoDeportivoDto: CampoDeportivo;
// }
// export interface HorarioExcepcion {
//   uuid?: string;
//   estado?: boolean;
//   fechaCreacion?: Date;

//   fecha: string; // ISO date string
//   tipoExcepcion: string; // 'cerrado', 'horario_especial', 'mantenimiento', 'evento_municipal'
//   horaApertura?: string; // "HH:mm:ss"
//   horaCierre?: string; // "HH:mm:ss"
//   motivo?: string;
  
//   campoDeportivoDto: CampoDeportivo;
// }
// export interface Superficie {
//   uuid?: string;
//   estado?: boolean;
  
//   descripcion: string; 
//   campoDeportivosDtoList?:CampoDeportivo[];
// }
// export interface Categoria {
//   uuid?: string;
//   estado?: boolean;
//   fechaCreacion?: Date;

//   codigo:String;
//   nombre:String;
//   descripcion?:String;
//   activo: boolean;
//   // maxDuracionAutoAprobacion?:number;
//   // maxPersonasAutoAprobacion?:number;

//   tipo?:String;
//   forAsociacion?:boolean; 
// }

// export interface TarifaCategoria {
//   uuid?: string;
//   estado?:string;

//   tarifaDto:Tarifa;
//   categoriaDto:Categoria;
// }

// export interface Tarifa {
//   uuid?: string;
//   estado?:string;
//   fechaCreacion?:Date;
  
//   precioBase: number;
//   fechaInicio:Date|string;
//   fechaFin?:Date|string;
//   desde?: string;  // Time range for tariff application
//   hasta?:string;
//   activo:boolean;
//   descripcion?:string;
//   observaciones?:string;
//   // typeRegister:String; // puntual , recurente 
//   // forOrganization:boolean; //tarifas validad for Organizations 
//   tipoCobro: ReservationType;// 'por_hora' | 'por_persona' | 'por_evento' | 'por_sesion' | 'mensualidad' | 'por_club';
//   frecuencia?: 'diaria' | 'semanal' | 'mensual'; // For recurring calculations
//   sesionesIncluidas?: number; // For 'mensualidad' or 'por_club' types

//   campoDeportivoDto: CampoDeportivo;
//   clasificadorRuatDto:ClasificadorRuat;

//   conceptosDtos?: TarifaConcepto[];
//   categoriasDtoList?: TarifaCategoria[];
// }

// export interface TarifaConcepto {
//   uuid?: string;
//   estado?:string;
//   fechaCreacion?:Date;

//   concepto: string;
//   tipo:string;
//   desde?:string;
//   hasta?:string;

//   valor:number;
//   activo:boolean;
  
//   tarifaDto: Tarifa;
// }

// export interface EncargadoComplejo {
//   uuid?: string;
//   estado?: boolean;
//   fechaCreacion?: Date;

//   userUuid: string; // uuid referencial to external user system
//   avatar:string;
//   activo: boolean;
//   nombre: string;
//   telefono?: string;
//   fechaAsignacion?: Date|string; // ISO date string
//   fechaFinAsignacion?: Date|string; // ISO date string
//   horaEntrada?: string; // "HH:mm:ss"
//   horaSalida?: string; // "HH:mm:ss"
  
//   complejoDto?: ComplejoDeportivo;
// }
// export interface Contribuyente {
//   uuid?: string;
//   estado?: boolean;
//   fechaCreacion?: Date;
//   fechaActualizacion?:Date;

//   userName: string;
//   password: string;
//   estadoUsuario: EstadoUsuario;
//   verificationCode?: string; //no en bk

//   estadoRuat: EstadoRuat;
//   verificadoRuat:boolean;// = false;
//   fechaVerificacionRuat?:Date|string;
//   tipoContribuyente:string; // NA=Natural, JU=Juridica
//   codigoContribuyente?:string;
//   tipoDocumento: string; // CI, CE
//   numeroDocumento: string; 
//   expedido?: string; // Department code 1-9

//   nroNit?: string;
//   nombre: String;
//   primerApellido: String; 
//   segundoApellido?: String; 
//   apellidoEsposo?: String;
//   fechaNacimiento?: string;
//   estadoCivil?: string; // SO, CA, VI, DI
//   genero?: string; //F,M
//   telefono?: string;
//   email: string;
//   direccion?: string;
    
//   esDeportistaElite:boolean;// = false;
//   registroUnicoDeportivo?:string;
//   fechaUltimoUsoGratuito?:Date|string;
//   observacionesMunicipales?:string;

//   estaSancionado:boolean;// = false;
//   fechaFinSancion?:Date|string;
//   motivoSancion?:string;

//   nombreCompleto?:String;
//   puedeReservarGratis?:boolean;

//   reservasList?: Reserva[];
//   organizacionesRepresentadas?: Organizacion[];
//   estudianteEnEscuelas?: EstudianteEscuela[];
// }
// export interface Organizacion {
//   uuid?: string;
//   estado?: boolean;
//   fechaCreacion?: Date;

//   activo:boolean;

//   tipoOrganizacion:TipoOrganizacion; 
//   personeriaJuridica?: string;
//   nombre:string;
//   telefono?:string;
//   email?: string;
//   direccion?: string; 
//   nroNit?: string;

//   entrenador?: string;
//   disciplina?: string;
//   codigoEscuela?: string;
  
//   // Payment configuration
//   requierePagoMensualidad: boolean;
//   tarifaMensual?: number;
//   permiteReservasGratuitas: boolean;

//   representanteDto: Contribuyente;
//   reservasDtoList?: Reserva[];
//   // estudiantesDtoList?: EstudianteEscuela[];
// }
// export interface EstudianteEscuela {
//   uuid?: string;
//   estado?: boolean;
//   fechaCreacion?: Date;
  
//   nombreCompleto?: string;
//   fechaNacimiento?: Date;
//   genero?: string;
//   numeroDocumento?: string;
//   telefono?: string;
//   email?: string;

//   fechaInscripcion: Date;
//   fechaBaja?: Date;
//   matricula: string;
//   activo: boolean;
    
//   contribuyenteDto: Contribuyente;

//   // Monthly payments
//   mensualidadesDtoList?: Reserva[];
// }

// export interface Reserva{
//   uuid?: string;
//   estado?:boolean;
//   fechaCreacion:Date;
//   fechaActualizacion?:Date;

//   fechaReserva:Date ;
//   fechaAprobacion?:Date;
//   fechaRechazo?:Date;
//   motivoRechazo?:string;
//   aprobadoPor?:string;
//   estadoValidacion:EstadoValidacion;  
//   estadoReserva:EstadoReserva;

//   tipoReserva:BookingType; //puntual / recurente / periodo 
//   numeroReserva:string;
//   numeroTasa?:string;
//   montoTotal:number;
//   clasificadorRuatId:string; //saved to identify later 

//   esReservaGratuita: boolean;
//   motivoGratuidad?: string; // 'ESCUELA_MUNICIPAL', 'ORGANIZACION', 'EVENTO_ESPECIAL'

//   organizacionDto?:Organizacion;
//   contribuyenteDto:Contribuyente;
//   campoDeportivoDto:CampoDeportivo;
//   tarifaDto: Tarifa;
//   reservaPuntualDto?:ReservaPuntual;
//   reservaRecurrenteDto?:ReservaRecurrente;  
//   reservasPeriodoDtoList?: ReservaPeriodo[];

//   pagosDtoList?:Pago[];
//   auditoriasDtoList?:ReservaAuditoria;
// }
// export interface ReservaRecurrente {
//   uuid?: string;
//   estado?: boolean;
//   fechaCreacion?: Date;

//   tipoRecurrencia:string; //menusal / semanal .. 
//   fechaInicio: Date;
//   fechaFin: Date;
//   diasSemana:string;
//   duracionSesionHoras:number;
//   cantidadPersonas?:number;
//   cantidadSesiones:number;
//   tarifaMensual?:number;
//   activo:Boolean;
//   categoria?: string; //saved concatenado to show later like categoria1, categoria 2
//   superficie?: string; //saved to show later
//   observaciones?: string;
  
//   tableroDto: Tablero;
//   reservaDto?: Reserva;
// }
// export interface ReservaPuntual {
//   uuid?: string;
//   estado?: boolean;
//   fechaCreacion?: Date;

//   fechaUso: Date;
//   fechaUsoReal?: Date;
//   horaInicio:string; // "HH:mm:ss"
//   horaFin:string; // "HH:mm:ss"
//   duracionHoras?:number;
//   cantidadPersonas?:number;
//   // periodo?:string;
//   categoria: string;
//   superficie: string;
//   observaciones?: string;  
//   reservaDto?: Reserva;
// }
// export interface ReservaPeriodo {
//   uuid?: string;
//   estado?: boolean;
//   fechaCreacion?: Date;
  
//   // Period information
//   mes: number; // 1-12
//   año: number;
  
//   // School context
//   matricula?: string;
//   disciplina?: string;
//   entrenador?: string;
  
  
//   reservaDto?: Reserva;
// }
// export interface  Pago{
//     uuid?: String;
//     estado?:boolean;
//     fechaCreacion?: Date;
//     fechaActualizacion?:Date;

//     numeroTasa: string; //"21987", 
//     tipoTasa: string; // = "TO";
//     folio: string;//"2870093262146", 
//     formaPago: string;//"PAGO ORIGINAL TOTAL",
//     fechaPago: Date; // DD/MM/YYYY format
//     entidadFinanciera: string;//"BANCO SOLIDARIO S.A.-COCHABAMBA-QUILLACOLLO"
//     montoPagado: number;
//     observaciones?: string//"CONSOLIDADO"
  
//     estadoPago:string;// = "pendiente";
//     ultimaConsulta?: Date;
//     respuestaCompletaRuat?:string;

//     reservaDto: Reserva;
//   }
