import { Cancha } from "./cancha.model";

export interface  Horario{

    uuid?: String;
    estado?:boolean;

    dia: String;
    horaInicio: string; // "HH:mm:ss"
    horaFin: string; // "HH:mm:ss"

    canchasDto: Cancha;
  }
  