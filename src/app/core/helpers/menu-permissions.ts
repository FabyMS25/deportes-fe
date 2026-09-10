import { MenuItem } from '../models/menu.model';

/** Reads the cached server menu. Parent metadata must never grant access. */
export function flattenPermissions(menu: MenuItem[]): MenuItem[] {
  return (menu || []).flatMap(item => [item, ...flattenPermissions(item.permisoHijoListDto || [])]);
}

export function permissionActions(menu: MenuItem[], resourceRoute: string): string[] {
  return [...new Set(flattenPermissions(menu)
    .filter(item => item.permissionRoute === resourceRoute && !!item.accion)
    .map(item => String(item.accion)))];
}

export function hasMenuRoute(menu: MenuItem[], route: string): boolean {
  return !!route && flattenPermissions(menu).some(item => item.ruta === route && !!item.accion && !!item.permissionRoute);
}
