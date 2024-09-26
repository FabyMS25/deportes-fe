export interface MenuItem {
  uuid?: string;
  estado?:boolean;
  modulo?: string;
  codigo?:string;

  orden:number;
  nombreMenu:string;
  accion?:string;
  icono?: string;
  ruta?: string;
  permisoHijoListDto?: any;
  permisoPadreDto?: any;
  
  isTitle?: boolean;
  badge?: any;
  isLayout?: boolean;
  isCollapsed?: boolean;
  subNivel?:boolean
}
