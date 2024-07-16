export interface Contribuyente {
  uuid?: number;
  userName: string;
  password: string;
  tipoContribuyente?:string;
  codigoContribuyente?:string;
  estadoUsuario: string; 
  verificationCode?: string; //no en bk
  nombre: string;
  apPaterno: string; //primerApellido
  apMaterno?: string; //segundoApellido
  fechaNacimiento: Date;
  estadoCivil: string;
  tipoDocumento: string;
  nroCarnet: string; //nroDocumento
  nroNit?: string;
  ciExpedido: string; //expedido
  sexo: string; //genero
  celular: string;
  correo: string;
  direccion?: string;
}
