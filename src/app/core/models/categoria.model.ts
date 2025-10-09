export interface Categoria {
  uuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;

  codigo:String;
  nombre:String;
  descripcion?:String;
  activo: boolean;
  // maxDuracionAutoAprobacion?:number;
  // maxPersonasAutoAprobacion?:number;

  tipo?:String;
  forAsociacion?:boolean; 
}
