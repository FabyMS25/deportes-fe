import { Complejo } from "./complejo.model";

export interface  Encargado{

    uuid?: String;
    estado?:boolean;

    userUuid: String;

    fechaInicio?: Date;
    fechaFin?:Date;
    
    horaEntrada: string; // "HH:mm:ss"
    horaSalida: string; // "HH:mm:ss"
    nombre: string;
    telefono?:string;
    complejoDto: {uuid:string}

  }
  