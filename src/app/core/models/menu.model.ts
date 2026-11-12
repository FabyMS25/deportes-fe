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
  /** Resolved taxpayer capability; it is not a raw system configuration. */
  organizationReservation?: 'DIRECT' | 'REQUEST';
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
