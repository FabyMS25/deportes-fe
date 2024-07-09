export interface Contribuyente {
  uuid?: number;
  userName?: string;
  password?: string;
  codigoContribuyente?:string;
  estadoUsuario: string;
  nombre: string;
  apPaterno: string;
  apMaterno?: string;
  nroCarnet: string;
  nroNit?: string;
  ciExpedido: string;
  sexo: string;
  direccion?: string;
  celular?: string;
  correo: string;
}
