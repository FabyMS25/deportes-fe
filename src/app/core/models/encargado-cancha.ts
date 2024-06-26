import { Cancha } from "./cancha.model";

export interface  EncargadoCancha{

    uuid?: String;
    estado?:boolean;

    userUuid: String;

    fechaInicio?: Date;
    fechaFin?:Date;
    
    horaEntrada: string; // "HH:mm:ss"
    horaSalida: string; // "HH:mm:ss"
    // nombreCompleto: string;
    telefono?:string;
    canchasDto: Cancha;

  }
  