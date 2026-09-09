import { hasMenuRoute, permissionActions } from './menu-permissions';
import { MenuItem } from '../models/menu.model';

describe('cached backend menu permissions', () => {
  const view = { nombreMenu: 'Escuelas Municipales', accion: 'VER', ruta: '/reservations/schools' } as MenuItem;
  const update = { ...view, accion: 'ACTUALIZAR' } as MenuItem;

  it('reads nested actions and removes duplicates without consulting an API', () => {
    const menu = [view, { permisoHijoListDto: [view, update] } as MenuItem];
    expect(permissionActions(menu, 'Escuelas Municipales')).toEqual(['VER', 'ACTUALIZAR']);
    expect(hasMenuRoute(menu, '/reservations/schools')).toBeTrue();
  });

  it('does not infer missing actions from parent metadata or user type', () => {
    const menu = [{ ...view, permisoPadreDto: update } as MenuItem];
    expect(permissionActions(menu, 'Escuelas Municipales')).toEqual(['VER']);
    expect(permissionActions(menu, 'Estudiantes')).toEqual([]);
    expect(hasMenuRoute([], '/reservations/schools')).toBeFalse();
    expect(hasMenuRoute([{ ruta: '/admin/config', accion: '' } as MenuItem], '/admin/config')).toBeFalse();
  });
});
