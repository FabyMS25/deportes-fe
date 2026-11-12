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

/** Normalizes a router URL: drops query/fragment and trailing slashes. */
export function normalizeRoute(value: string): string {
  const path = (value || '').split('?')[0].split('#')[0].trim();
  if (!path) return '';
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
  return withLeadingSlash.replace(/\/+$/, '') || '/';
}

/** Navigable routes granted by the server menu. */
export function menuRoutes(menu: MenuItem[]): string[] {
  const routes = new Set<string>();
  for (const item of flattenPermissions(menu)) {
    if (!item.accion || !item.permissionRoute) continue;
    if (item.ruta) routes.add(normalizeRoute(item.ruta));
    if (item.permissionRoute) routes.add(normalizeRoute(item.permissionRoute));
  }
  routes.delete('');
  return [...routes];
}

/**
 * Resolves the menu route that authorizes a URL. Uses the longest segment
 * boundary match so child and parameterized routes inherit their module's
 * permission without a second, hand-written rule.
 */
export function resolveMenuRoute(menu: MenuItem[], url: string): string | null {
  const target = normalizeRoute(url);
  if (!target || target === '/') return null;
  const matches = menuRoutes(menu)
    .filter(route => target === route || target.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length);
  return matches[0] ?? null;
}
