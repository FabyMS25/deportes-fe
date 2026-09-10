import { Component, OnInit, OnDestroy, EventEmitter, Output, Inject, ViewChild, TemplateRef } from '@angular/core';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { CookieService } from 'ngx-cookie-service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin, Subscription } from 'rxjs';
import { LanguageService } from '../../core/services/language.service';

import { EventService } from '../../core/services/event.service';
import { AuthenticationService } from '../../core/services/auth.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { NotificacionService } from '../../core/services/api/notificacion.service';
import { Notificacion, PrioridadNotificacion } from '../../core/models/notificacion.model';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})

export class TopbarComponent implements OnInit, OnDestroy {
  menuItems: any[] = [];
  userData: any;
  avatar = "default-profile1.png";
  userRole!: 'Contribuyente' | 'Admin' | 'Encargado';
  userFullName = '';
  
  messages: any;
  element: any;
  mode: string | undefined;
  @Output() mobileMenuButtonClicked = new EventEmitter();
  allnotifications: Notificacion[] = [];
  unreadNotificationCount = 0;
  usuarioUuid = '';
  canReceiveAdminNotifications = false;
  notificationToast: Notificacion | null = null;
  private notificationToastTimeout?: ReturnType<typeof setTimeout>;
  private notificationSubscriptions = new Subscription();
  flagvalue: any;
  valueset: any;
  countryName: any;
  cookieValue: any;
  total = 0;
  cart_length: any = 0;
  totalNotify: number = 0;
  newNotify: number = 0;
  readNotify: number = 0;
  isDropdownOpen = false;
  @ViewChild('removenotification') removenotification!: TemplateRef<any>;
  notifyId: any;

  constructor(
    @Inject(DOCUMENT) private document: any, 
    private eventService: EventService, 
    public languageService: LanguageService, 
    private modalService: NgbModal,
    public _cookiesService: CookieService, 
    public translate: TranslateService, 
    private authService: AuthenticationService, 
    private router: Router, 
    private storage: TokenStorageService,
    private notificacionService: NotificacionService
  ) { }

  ngOnInit(): void {
    this.menuItems =this.storage.getMenu();
    this.userData = this.authService.currentUser();
    this.avatar = this.authService.getAvatar();
    this.userRole = this.authService.getUserRole();
    this.userFullName = this.authService.getUserFullName();
    this.usuarioUuid = this.resolveUsuarioUuid();
    this.canReceiveAdminNotifications = this.authService
      .hasPermission('/admin/config')
      .includes('NOTIFICACIONES_ADMIN');
    this.startNotifications();

    this.element = document.documentElement;
    this.cookieValue = this._cookiesService.get('lang');
    const val = this.listLang.filter(x => x.lang === this.cookieValue);
    this.countryName = val.map(element => element.text);
    if (val.length === 0) {
      if (this.flagvalue === undefined) { this.valueset = 'assets/icons/flags/us.svg'; }
    } else {
      this.flagvalue = val.map(element => element.flag);
    }
  }

  ngOnDestroy(): void {
    this.notificationSubscriptions.unsubscribe();
    this.notificacionService.disconnect();
    if (this.notificationToastTimeout) {
      clearTimeout(this.notificationToastTimeout);
    }
  }

  getUserName(): string {
    if (!this.userData) return '';
    return this.userData.username || this.userData.userName || '';
  }

  getStatusBadgeClass(): string {
    const status = this.userData?.estadoUsuario?.toLowerCase();
    switch (status) {
      case 'activo':
        return 'bg-success';
      case 'pendiente verificación':
        return 'bg-warning';
      case 'inactivo':
        return 'bg-secondary';
      case 'sancionado':
        return 'bg-danger';
      case 'bloqueado':
        return 'bg-dark';
      default:
        return 'bg-info';
    }
  }

  toggleMobileMenu(event: any) {
    document.querySelector('.hamburger-icon')?.classList.toggle('open')
    event.preventDefault();
    this.mobileMenuButtonClicked.emit();
  }

  fullscreen() {
    document.body.classList.toggle('fullscreen-enable');
    if (
      !document.fullscreenElement && !this.element.mozFullScreenElement &&
      !this.element.webkitFullscreenElement) {
      if (this.element.requestFullscreen) {
        this.element.requestFullscreen();
      } else if (this.element.mozRequestFullScreen) {
        this.element.mozRequestFullScreen();
      } else if (this.element.webkitRequestFullscreen) {
        this.element.webkitRequestFullscreen();
      } else if (this.element.msRequestFullscreen) {
        this.element.msRequestFullscreen();
      }
    } else {
      if (this.document.exitFullscreen) {
        this.document.exitFullscreen();
      } else if (this.document.mozCancelFullScreen) {
        this.document.mozCancelFullScreen();
      } else if (this.document.webkitExitFullscreen) {
        this.document.webkitExitFullscreen();
      } else if (this.document.msExitFullscreen) {
        this.document.msExitFullscreen();
      }
    }
  }

  openModal(content: any) {
    this.modalService.open(content, { centered: true });
  }

  changeMode(mode: string) {
    this.mode = mode;
    this.eventService.broadcast('changeMode', mode);

    switch (mode) {
      case 'light':
        document.documentElement.setAttribute('data-bs-theme', "light");
        break;
      case 'dark':
        document.documentElement.setAttribute('data-bs-theme', "dark");
        break;
      default:
        document.documentElement.setAttribute('data-bs-theme', "light");
        break;
    }
  }

  listLang = [
    { text: 'English', flag: 'assets/icons/flags/us.svg', lang: 'en' },
    { text: 'Español', flag: 'assets/icons/flags/spain.svg', lang: 'es' },
  ];

  setLanguage(text: string, lang: string, flag: string) {
    this.countryName = text;
    this.flagvalue = flag;
    this.cookieValue = lang;
    this.languageService.setLanguage(lang);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  windowScroll() {
    if (document.body.scrollTop > 80 || document.documentElement.scrollTop > 80) {
      (document.getElementById("back-to-top") as HTMLElement).style.display = "block";
      document.getElementById('page-topbar')?.classList.add('topbar-shadow');
    } else {
      (document.getElementById("back-to-top") as HTMLElement).style.display = "none";
      document.getElementById('page-topbar')?.classList.remove('topbar-shadow');
    }
  }

  deleteItem(event: any, id: any) {
    var price = event.target.closest('.dropdown-item').querySelector('.item_price').innerHTML;
    var Total_price = this.total - price;
    this.total = Total_price;
    this.cart_length = this.cart_length - 1;
    this.total > 1 ? (document.getElementById("empty-cart") as HTMLElement).style.display = "none" : (document.getElementById("empty-cart") as HTMLElement).style.display = "block";
    document.getElementById('item_' + id)?.remove();
  }

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  Search() {
    const searchOptions = document.getElementById("search-close-options") as HTMLElement;
    const dropdown = document.getElementById("search-dropdown") as HTMLElement;
    const input = document.getElementById("search-options") as HTMLInputElement;
    const filter = input.value.toUpperCase();
    const inputLength = filter.length;
  
    if (inputLength > 0) {
      dropdown.classList.add("show");
      searchOptions.classList.remove("d-none");
  
      const notifyItems = document.getElementsByClassName("notify-item") as HTMLCollectionOf<HTMLElement>;
  
      Array.from(notifyItems).forEach((element) => {
        const spanText = element.querySelector("span")?.innerText.toLowerCase() || '';
        element.style.display = spanText.includes(filter.toLowerCase()) ? "block" : "none";
      });
    } else {
      dropdown.classList.remove("show");
      searchOptions.classList.add("d-none");
    }
  }

  closeBtn() {
    var searchOptions = document.getElementById("search-close-options") as HTMLAreaElement;
    var dropdown = document.getElementById("search-dropdown") as HTMLAreaElement;
    var searchInputReponsive = document.getElementById("search-options") as HTMLInputElement;
    dropdown.classList.remove("show");
    searchOptions.classList.add("d-none");
    searchInputReponsive.value = "";
  }

  checkedValGet: string[] = [];

  onCheckboxChange(event: Event, uuid: string): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.checkedValGet = checked
      ? Array.from(new Set([...this.checkedValGet, uuid]))
      : this.checkedValGet.filter(item => item !== uuid);
  }

  onNotificationClick(notification: Notificacion, event?: Event): void {
    event?.preventDefault();
    this.markAsRead(notification);
    const targetUrl = this.getNotificationTargetUrl(notification);
    if (!targetUrl) return;
    this.router.navigateByUrl(targetUrl);
  }

  markAsRead(notification: Notificacion): void {
    if (notification.estadoLectura === 'LEIDA') return;
    this.notificacionService.markAsRead(notification.uuid).subscribe();
  }

  markAllNotificationsAsRead(): void {
    if (!this.usuarioUuid || this.unreadNotificationCount === 0) return;
    this.notificacionService.markAllAsRead(this.usuarioUuid).subscribe();
  }

  deleteNotification(notification: Notificacion, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.notificacionService.delete(notification.uuid).subscribe(() => {
      this.checkedValGet = this.checkedValGet.filter(uuid => uuid !== notification.uuid);
    });
  }

  notificationDelete(): void {
    if (this.checkedValGet.length === 0) {
      this.modalService.dismissAll();
      return;
    }

    forkJoin(this.checkedValGet.map(uuid => this.notificacionService.delete(uuid))).subscribe(() => {
      this.checkedValGet = [];
      this.modalService.dismissAll();
    });
  }

  refreshNotifications(): void {
    if (!this.usuarioUuid) return;
    if (this.canReceiveAdminNotifications) {
      this.notificacionService.syncAdminNotifications(this.usuarioUuid).subscribe(() => {
        this.notificacionService.loadLatest(this.usuarioUuid).subscribe();
        this.notificacionService.refreshCounter(this.usuarioUuid).subscribe();
      });
      return;
    }
    this.notificacionService.loadLatest(this.usuarioUuid).subscribe();
    this.notificacionService.refreshCounter(this.usuarioUuid).subscribe();
  }

  getPriorityClass(priority: PrioridadNotificacion): string {
    switch (priority) {
      case 'SUCCESS':
        return 'success';
      case 'WARNING':
        return 'warning';
      case 'ERROR':
        return 'danger';
      case 'INFO':
      default:
        return 'info';
    }
  }

  getPriorityIcon(priority: PrioridadNotificacion): string {
    switch (priority) {
      case 'SUCCESS':
        return 'bx-check-circle';
      case 'WARNING':
        return 'bx-error';
      case 'ERROR':
        return 'bx-x-circle';
      case 'INFO':
      default:
        return 'bx-info-circle';
    }
  }

  getPriorityLabel(priority: PrioridadNotificacion): string {
    switch (priority) {
      case 'SUCCESS': return 'Confirmada';
      case 'WARNING': return 'Atención';
      case 'ERROR': return 'Error';
      case 'INFO':
      default: return 'Información';
    }
  }

  getReadStateLabel(notification: Notificacion): string {
    return notification.estadoLectura === 'LEIDA' ? 'Leída' : 'No leída';
  }

  dismissNotificationToast(): void {
    this.notificationToast = null;
    if (this.notificationToastTimeout) {
      clearTimeout(this.notificationToastTimeout);
    }
  }

  get importantNotifications(): Notificacion[] {
    return this.allnotifications.filter(item => item.prioridad === 'WARNING' || item.prioridad === 'ERROR');
  }

  private startNotifications(): void {
    if (!this.usuarioUuid) return;

    this.notificationSubscriptions.add(
      this.notificacionService.notifications$.subscribe(notifications => {
        this.allnotifications = notifications;
        this.checkedValGet = this.checkedValGet.filter(uuid => notifications.some(item => item.uuid === uuid));
      })
    );
    this.notificationSubscriptions.add(
      this.notificacionService.unreadCount$.subscribe(count => this.unreadNotificationCount = count)
    );
    this.notificationSubscriptions.add(
      this.notificacionService.incomingNotification$.subscribe(notification => this.showIncomingNotification(notification))
    );

    if (this.canReceiveAdminNotifications) {
      this.notificacionService.syncAdminNotifications(this.usuarioUuid)
        .subscribe(() => this.notificacionService.initialize(this.usuarioUuid));
      return;
    }
    this.notificacionService.initialize(this.usuarioUuid);
  }

  private showIncomingNotification(notification: Notificacion): void {
    this.notificationToast = notification;
    if (this.notificationToastTimeout) {
      clearTimeout(this.notificationToastTimeout);
    }
    this.notificationToastTimeout = setTimeout(() => this.notificationToast = null, 7000);
  }

  private getNotificationTargetUrl(notification: Notificacion): string {
    const rawUrl = (notification.accionUrl || '').trim();

    if (!rawUrl || rawUrl === '/' || rawUrl === '#') {
      return this.authService.getDashboardRoute();
    }

    if (/^https?:\/\//i.test(rawUrl)) {
      return this.authService.getDashboardRoute();
    }

    return rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  }

  private resolveUsuarioUuid(): string {
    const user = this.userData;
    if (!user) return '';
    return user.uuid || user.usuarioUuid || user.userUuid || user.designacion?.usuarioDto?.uuid || '';
  }
}
