import { campoDeportivo } from "./campoDeportivo.model";
import { Contribuyente } from "./contribuyente.models";
import { Pago } from "./pago.model";

 export interface PassResets{
  uuid?: String;
  estado?:boolean;

  email:String;
  exprires_at:Date;
  token:string;
  
}
