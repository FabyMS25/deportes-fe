import { EstadoRuat, EstadoUsuario } from "../constants/Estados";
import { Organizacion } from "./organizacion.models";
import { Reserva } from "./reserva.models";
export interface Contribuyente {
  uuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;
  fechaActualizacion?:Date;

  userName: string;
  password: string;
  estadoUsuario: EstadoUsuario;
  verificationCode?: string; //no en bk

  tipoContribuyente:string; // NA=Natural, JU=Juridica
  codigoContribuyente?:string;
  tipoDocumento: string; // CI, CE
  numeroDocumento: string; 
  expedido?: string; // Department code 1-9
  nroNit?: string;

  nombre: String;
  primerApellido: String; 
  segundoApellido?: String; 
  apellidoEsposo?: String;
  fechaNacimiento?: string;
  genero?: string; //F,M
  estadoCivil?: string; // SO, CA, VI, DI
  telefono?: string;
  email: string;
  direccion?: string;

  nombreCompleto?:String;
  puedeReservarGratis?:boolean;
  
  estadoRuat: EstadoRuat;
  verificadoRuat:boolean;// = false;
  fechaVerificacionRuat?:Date|string;
//    private boolean forAsociacion;
  esDeportistaElite:boolean;// = false;
  perteneceEscuelaMunicipal:boolean;// = false;
  registroUnicoDeportivo?:string;
  fechaUltimoUsoGratuito?:Date|string;
  observacionesMunicipales?:string;
  descuentoAplicable:number;// = 0.0;

  estaSancionado:boolean;// = false;
  fechaFinSancion?:Date|string;
  motivoSancion?:string;

  reservasList?: Reserva[];
  organizacionesRepresentadas?: Organizacion[];

//area:string;
//distrito:string;
//tipoLugar:string;
//nombreLugar:string;
//numeroPuerta:string;
//direccionDescriptiva:string;
//nombreEdificio:string;
//bloque:string;
//piso:string;
//departamento:string;
}