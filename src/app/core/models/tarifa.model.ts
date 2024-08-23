import { campoDeportivo } from "./campoDeportivo.model";

export interface Tarifa {
  uuid?: string;
  estado?:string;

  costo: number;
  tipo:string;

  desde?: string;
  hasta?:string;
  descripcion?:string;

  canchasDto: campoDeportivo
  categoriaDtoList: any[];
}
