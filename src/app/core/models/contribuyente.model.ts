import { EstadoRuat, EstadoUsuario } from "../constants/Estados";
import { EstudianteEscuela } from "./EstudianteEscuela.model";
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

  estadoRuat: EstadoRuat;
  verificadoRuat:boolean;// = false;
  fechaVerificacionRuat?:Date|string;
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
  estadoCivil?: string; // SO, CA, VI, DI
  genero?: string; //F,M
  telefono?: string;
  email: string;
  direccion?: string;
    
  esDeportistaElite:boolean;// = false;
  registroUnicoDeportivo?:string;
  fechaUltimoUsoGratuito?:Date|string;
  observacionesMunicipales?:string;

  estaSancionado:boolean;// = false;
  fechaFinSancion?:Date|string;
  motivoSancion?:string;

  nombreCompleto?:String;
  puedeReservarGratis?:boolean;

  reservasList?: Reserva[];
  organizacionesRepresentadas?: Organizacion[];
  estudianteEnEscuelas?: EstudianteEscuela[];

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