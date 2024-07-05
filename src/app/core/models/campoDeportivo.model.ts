import { Categoria } from "./categoria.model";
import { Complejo } from "./complejo.model";
import { Horario } from "./horario.model";
import { Tarifa } from "./tarifa.model";

export interface campoDeportivo {
  uuid?: string;
  estado?:string;

  codigo?:string;
  // techado?:string;
  superficie:string;
  tipo?:string;
  // totalxhora?:number;

  tarifasList?: Tarifa[];
  canchaDeportesList?:Categoria[]; //categorias
  horarioList?:Horario[];
  
  reservasList?:any[];
  
  complejoDto?: Complejo;

}
