import { Categoria } from "./categoria.model";
import { Complejo } from "./complejo.model";
import { Horario } from "./horario.model";
import { Superficie } from "./superficie.model";
import { Tarifa } from "./tarifa.model";

export interface campoDeportivo {
  uuid?: string;
  estado?:string;

  codigo:string;
  tipo:string;

  tarifasDtoList?: Tarifa[];
  // canchaDeportesList?:Categoria[]; //categorias
  horarioDtoList?:Horario[];
  
  reservasList?:any[];
  
  complejoDto: Complejo;
  superficieDto:Superficie;

}
