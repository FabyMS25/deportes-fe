import { campoDeportivo } from "./campoDeportivo.model";

export interface Tarifa {
  uuid?: string;
  estado?:string;

  costo: number;
  tipo_cobro?:string;

  desde?: string;
  hasta?:string;
  allDay?: boolean;
  categoria?: string;
  descripcion?:string;

  canchasDto: campoDeportivo

}
