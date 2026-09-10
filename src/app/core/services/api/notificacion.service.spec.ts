import { NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { NotificacionService } from './notificacion.service';

describe('Notification session isolation', () => {
  let service: NotificacionService;
  let state: any;
  const notification = (uuid: string, usuarioUuid = 'a') => ({ uuid, usuarioUuid, estadoLectura: 'NO_LEIDA' });

  beforeEach(() => {
    service = new NotificacionService({} as any, {} as any, new NgZone({ enableLongStackTrace: false }));
    state = service as any;
    state.activeUsuarioUuid = 'a';
  });

  it('clears notifications and count on disconnect', () => {
    state.notificationsSubject.next([notification('1')]);
    state.unreadCountSubject.next(4);
    service.disconnect();
    expect(state.notificationsSubject.value).toEqual([]);
    expect(state.unreadCountSubject.value).toBe(0);
  });

  it('ignores old HTTP responses even after logging back into the same account', () => {
    const response = new Subject<any[]>();
    spyOn(service, 'getByUsuario').and.returnValue(response);
    service.loadLatest('a').subscribe();
    service.disconnect();
    state.activeUsuarioUuid = 'a';
    response.next([notification('old')]);
    expect(state.notificationsSubject.value).toEqual([]);
  });

  it('rejects another user and does not count repeated socket messages twice', () => {
    state.handleNotificationMessage({ body: JSON.stringify(notification('other', 'b')) });
    expect(state.notificationsSubject.value).toEqual([]);
    const message = { body: JSON.stringify(notification('1')) };
    state.handleNotificationMessage(message);
    state.handleNotificationMessage(message);
    expect(state.notificationsSubject.value.length).toBe(1);
    expect(state.unreadCountSubject.value).toBe(1);
  });

  it('preserves unread counts beyond the loaded page when marking an item read', () => {
    state.notificationsSubject.next([notification('1')]);
    state.unreadCountSubject.next(30);
    state.patchLocalReadState('1');
    state.patchLocalReadState('1');
    expect(state.unreadCountSubject.value).toBe(29);
  });
});
