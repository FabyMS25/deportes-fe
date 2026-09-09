import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, catchError, interval, map, of, startWith, Subscription, tap } from 'rxjs';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

import { environment } from 'src/environments/environment';
import { Notificacion, EstadoLecturaNotificacion } from '../../models/notificacion.model';
import { TokenStorageService } from '../token-storage.service';
import { apiDelete, apiGet, apiPatch, apiPost, PageResponse } from '../apiResponses';

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private readonly apiUrl = `${environment.backendUrl}/notificaciones`;
  private readonly socketUrl = `${environment.backendUrl.replace(/\/api\/?$/, '')}/ws-notificaciones`;
  private readonly fallbackRefreshMs = 45000;

  private stompClient?: Client;
  private notificationSubscription?: StompSubscription;
  private counterSubscription?: StompSubscription;
  private fallbackSubscription?: Subscription;
  private activeUsuarioUuid = '';

  private notificationsSubject = new BehaviorSubject<Notificacion[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private incomingNotificationSubject = new Subject<Notificacion>();
  private connectionStateSubject = new BehaviorSubject<boolean>(false);

  notifications$ = this.notificationsSubject.asObservable();
  unreadCount$ = this.unreadCountSubject.asObservable();
  incomingNotification$ = this.incomingNotificationSubject.asObservable();
  connectionState$ = this.connectionStateSubject.asObservable();

  constructor(
    private http: HttpClient,
    private storageService: TokenStorageService,
    private zone: NgZone
  ) { }

  initialize(usuarioUuid: string): void {
    if (!usuarioUuid) return;

    if (this.activeUsuarioUuid === usuarioUuid) {
      this.refreshCounter(usuarioUuid).subscribe();
      return;
    }

    this.disconnect();
    this.activeUsuarioUuid = usuarioUuid;
    this.loadLatest(usuarioUuid).subscribe();
    this.refreshCounter(usuarioUuid).subscribe();
    this.connect(usuarioUuid);
    this.startFallbackRefresh(usuarioUuid);
  }

  getByUsuario(usuarioUuid: string, page = 0, size = 20): Observable<Notificacion[]> {
    return apiGet<PageResponse<Notificacion>>(
      this.http,
      `${this.apiUrl}/usuario/${usuarioUuid}`,
      `obtener notificaciones (${usuarioUuid})`,
      { params: { page, size } }
    ).pipe(map(response => response.content));
  }

  getUnread(usuarioUuid: string): Observable<Notificacion[]> {
    return apiGet<Notificacion[]>(
      this.http,
      `${this.apiUrl}/usuario/${usuarioUuid}/no-leidas`,
      `obtener notificaciones no leídas (${usuarioUuid})`
    );
  }

  getUnreadCount(usuarioUuid: string): Observable<number> {
    return apiGet<number>(
      this.http,
      `${this.apiUrl}/usuario/${usuarioUuid}/contador-no-leidas`,
      `contar notificaciones no leídas (${usuarioUuid})`
    );
  }

  syncAdminNotifications(usuarioUuid: string): Observable<Notificacion[]> {
    return apiPost<Notificacion[]>(
      this.http,
      `${this.apiUrl}/admin/sincronizar/${usuarioUuid}`,
      {},
      `sincronizar notificaciones administrativas (${usuarioUuid})`
    );
  }

  markAsRead(uuid: string): Observable<Notificacion | null> {
    return apiPatch<Notificacion>(this.http, `${this.apiUrl}/${uuid}/leer`, {}, `marcar notificación como leída (${uuid})`)
      .pipe(
        tap(notification => this.patchLocalReadState(uuid, notification))
      );
  }

  markAllAsRead(usuarioUuid: string): Observable<Notificacion[]> {
    return apiPatch<Notificacion[]>(this.http, `${this.apiUrl}/usuario/${usuarioUuid}/leer-todas`, {}, `marcar notificaciones como leídas (${usuarioUuid})`)
      .pipe(tap(() => {
        this.notificationsSubject.next(
          this.notificationsSubject.value.map(item => ({ ...item, estadoLectura: 'LEIDA' as EstadoLecturaNotificacion }))
        );
        this.unreadCountSubject.next(0);
      }));
  }

  delete(uuid: string): Observable<string> {
    return apiDelete<string>(this.http, `${this.apiUrl}/${uuid}`, `anular notificación (${uuid})`)
      .pipe(tap(() => {
        const removed = this.notificationsSubject.value.find(item => item.uuid === uuid);
        this.notificationsSubject.next(this.notificationsSubject.value.filter(item => item.uuid !== uuid));
        if (removed?.estadoLectura === 'NO_LEIDA') {
          this.unreadCountSubject.next(Math.max(this.unreadCountSubject.value - 1, 0));
        }
      }));
  }

  loadLatest(usuarioUuid: string): Observable<Notificacion[]> {
    return this.getByUsuario(usuarioUuid).pipe(
      tap(notifications => this.notificationsSubject.next(notifications)),
      catchError(() => of([]))
    );
  }

  refreshCounter(usuarioUuid: string): Observable<number> {
    return this.getUnreadCount(usuarioUuid).pipe(
      tap(count => this.unreadCountSubject.next(count)),
      catchError(() => of(this.unreadCountSubject.value))
    );
  }

  disconnect(): void {
    this.activeUsuarioUuid = '';
    this.notificationSubscription?.unsubscribe();
    this.counterSubscription?.unsubscribe();
    this.notificationSubscription = undefined;
    this.counterSubscription = undefined;
    this.fallbackSubscription?.unsubscribe();
    this.fallbackSubscription = undefined;
    this.connectionStateSubject.next(false);

    if (this.stompClient) {
      this.stompClient.reconnectDelay = 0;
    }
    if (this.stompClient?.active) {
      this.stompClient.deactivate();
    }
    this.stompClient = undefined;
  }

  private connect(usuarioUuid: string): void {
    const token = this.storageService.getToken();

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(this.socketUrl),
      reconnectDelay: 5000,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      beforeConnect: async () => {
        const currentToken = this.storageService.getToken();
        if (!currentToken && this.stompClient) {
          this.stompClient.reconnectDelay = 0;
          throw new Error('No authenticated Deportes session');
        }
        if (this.stompClient && currentToken) {
          this.stompClient.connectHeaders = { Authorization: `Bearer ${currentToken}` };
        }
      },
      onConnect: () => this.zone.run(() => {
        this.connectionStateSubject.next(true);
        this.notificationSubscription = this.stompClient?.subscribe(
          `/topic/notificaciones/${usuarioUuid}`,
          message => this.handleNotificationMessage(message)
        );
        this.counterSubscription = this.stompClient?.subscribe(
          `/topic/notificaciones/${usuarioUuid}/contador`,
          message => this.handleCounterMessage(message)
        );
      }),
      onStompError: () => this.zone.run(() => this.connectionStateSubject.next(false)),
      onWebSocketClose: () => this.zone.run(() => {
        if (!this.storageService.getToken() && this.stompClient) {
          this.stompClient.reconnectDelay = 0;
        }
        this.connectionStateSubject.next(false);
      })
    });

    this.stompClient.activate();
  }

  private startFallbackRefresh(usuarioUuid: string): void {
    this.fallbackSubscription = interval(this.fallbackRefreshMs)
      .pipe(startWith(0))
      .subscribe(() => this.refreshCounter(usuarioUuid).subscribe());
  }

  private handleNotificationMessage(message: IMessage): void {
    const notification = this.parseBody<Notificacion>(message.body);
    if (!notification?.uuid) return;

    const existing = this.notificationsSubject.value.filter(item => item.uuid !== notification.uuid);
    this.notificationsSubject.next([notification, ...existing].slice(0, 20));
    if (notification.estadoLectura === 'NO_LEIDA') {
      this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
      this.incomingNotificationSubject.next(notification);
    }
  }

  private handleCounterMessage(message: IMessage): void {
    const count = Number(this.parseBody<number>(message.body));
    this.unreadCountSubject.next(Number.isFinite(count) ? count : 0);
  }

  private patchLocalReadState(uuid: string, notification?: Notificacion): void {
    const notifications = this.notificationsSubject.value.map(item => {
      if (item.uuid !== uuid) return item;
      return {
        ...item,
        ...notification,
        estadoLectura: notification?.estadoLectura || 'LEIDA'
      };
    });
    this.notificationsSubject.next(notifications);
    this.unreadCountSubject.next(notifications.filter(item => item.estadoLectura === 'NO_LEIDA').length);
  }

  private parseBody<T>(body: string): T {
    try {
      return JSON.parse(body) as T;
    } catch {
      return body as T;
    }
  }
}
