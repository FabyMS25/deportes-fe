import { Tarifa } from "./tarifa.model";

export interface TarifaConcepto {
  uuid?: string;
  estado?:string;
  fechaCreacion?:Date;

  concepto: string;
  tipo:string;
  desde?:string;
  hasta?:string;

  valor:number;
  activo:boolean;
  
  tarifaDto: Tarifa;
}
