import { campoDeportivo } from "./campoDeportivo.model";

export interface  Horario{

    uuid?: String;
    estado?:boolean;

    dia: string;
    horaInicio: string; // "HH:mm:ss"
    horaFin: string; // "HH:mm:ss"
    abierto: boolean

    canchasDto?: campoDeportivo;
  }
  