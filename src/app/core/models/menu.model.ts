export interface MenuItem {
  estado?: boolean;
  modulo?: string;
  codigo?:string;

  orden:number;
  nombreMenu:string;
  accion?:string;
  icono?: string;
  ruta?: string;
  permissionRoute?: string;
  /** Authorization entry nested under its navigable module, never rendered. */
  permissionOnly?: boolean;
  permisoHijoListDto: MenuItem[];
  permisoPadreDto?: any;
  subNivel?:boolean;

  isTitle?: boolean;
  badge?: any;
  isLayout?: boolean;
  isCollapsed?: any;
}
