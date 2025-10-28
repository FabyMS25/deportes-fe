import { Component, OnInit, EventEmitter, Output, Inject, ViewChild, TemplateRef } from '@angular/core';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { CookieService } from 'ngx-cookie-service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../core/services/language.service';

import { EventService } from '../../core/services/event.service';
import { AuthenticationService } from '../../core/services/auth.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { EstadoUsuario } from 'src/app/core/constants/Estados';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})

export class TopbarComponent implements OnInit {
  menuItems: any[] = [];
  avatar = "default-profile1.png";
  
  messages: any;
  element: any;
  mode: string | undefined;
  @Output() mobileMenuButtonClicked = new EventEmitter();
  allnotifications: any;
  flagvalue: any;
  valueset: any;
  countryName: any;
  cookieValue: any;
  userData: any;
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
    private tokenStorageService: TokenStorageService
  ) { }

  ngOnInit(): void {
    this.userData = this.authService.currentUser();
    console.log('User data:', this.userData);
    this.element = document.documentElement;

    this.avatar = this.authService.getAvatar();
    const menu = localStorage.getItem('menu');
    this.menuItems = menu ? JSON.parse(menu) : null;

    this.cookieValue = this._cookiesService.get('lang');
    const val = this.listLang.filter(x => x.lang === this.cookieValue);
    this.countryName = val.map(element => element.text);
    if (val.length === 0) {
      if (this.flagvalue === undefined) { this.valueset = 'assets/icons/flags/us.svg'; }
    } else {
      this.flagvalue = val.map(element => element.flag);
    }
  }

  isContribuyenteUser(): boolean {
    return this.userData && this.userData.tipoContribuyente !== undefined;
  }
  isExternalUser(): boolean {
    return this.userData && this.userData.designacion !== undefined;
  }

  getUserFullName(): string {
    if (!this.userData) return '';
    
    if (this.isExternalUser()) {
      return this.userData.designacion?.personaDto?.fullName || 
             (this.userData.designacion?.personaDto?.nombre + ' ' + 
              this.userData.designacion?.personaDto?.apPaterno) || 
             this.userData.username || 
             'Usuario';
    } else if (this.isContribuyenteUser()) {
      return this.userData.nombreCompleto || 
             (this.userData.nombre + ' ' + this.userData.primerApellido + 
              (this.userData.segundoApellido ? ' ' + this.userData.segundoApellido : '')) || 
             this.userData.userName || 
             'Contribuyente';
    }
    
    return this.userData.username || this.userData.userName || 'Usuario';
  }

  getUserRole(): string {
    if (!this.userData) return 'Usuario';
    if (this.isContribuyenteUser()) {
      return 'Contribuyente';
    }
    if (this.isExternalUser()) {
      if (this.userData.modulos && this.userData.modulos.length > 0) {
          return 'Admin';
      }
      return 'Empleado';
    }    
    return 'Usuario';
  }

  getUserStatus(): string {
    if (!this.userData) return '';
    
    if (this.isContribuyenteUser()) {
      const estado = this.userData.estadoUsuario;
      switch (estado) {
        case EstadoUsuario.ACTIVO:
          return 'Activo';
        case EstadoUsuario.PENDIENTE_VERIFICACION:
          return 'Pendiente Verificación';
        case EstadoUsuario.INACTIVO:
          return 'Inactivo';
        case EstadoUsuario.SANCIONADO:
          return 'Sancionado';
        case EstadoUsuario.BLOQUEADO:
          return 'Bloqueado';
        default:
          return estado || 'Desconocido';
      }
    }
    
    return '';
  }

  getUserName(): string {
    if (!this.userData) return '';
    return this.userData.username || this.userData.userName || '';
  }

  shouldShowStatus(): boolean {
    return this.isContribuyenteUser() && !!this.getUserStatus();
  }

  getStatusBadgeClass(): string {
    const status = this.getUserStatus().toLowerCase();
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

  checkedValGet: any[] = [];
  onCheckboxChange(event: any, id: any) {
    this.notifyId = id;
    var result;
    if (id == '1') {
      var checkedVal: any[] = [];
      for (var i = 0; i < this.allnotifications.length; i++) {
        if (this.allnotifications[i].state == true) {
          result = this.allnotifications[i].id;
          checkedVal.push(result);
        }
      }
      this.checkedValGet = checkedVal;
    } else {
      var checkedVal: any[] = [];
      for (var i = 0; i < this.messages.length; i++) {
        if (this.messages[i].state == true) {
          result = this.messages[i].id;
          checkedVal.push(result);
        }
      }
      this.checkedValGet = checkedVal;
    }
    checkedVal.length > 0 ? (document.getElementById("notification-actions") as HTMLElement).style.display = 'block' : (document.getElementById("notification-actions") as HTMLElement).style.display = 'none';
  }

  notificationDelete() {
    if (this.notifyId == '1') {
      for (var i = 0; i < this.checkedValGet.length; i++) {
        for (var j = 0; j < this.allnotifications.length; j++) {
          if (this.allnotifications[j].id == this.checkedValGet[i]) {
            this.allnotifications.splice(j, 1);
          }
        }
      }
    } else {
      for (var i = 0; i < this.checkedValGet.length; i++) {
        for (var j = 0; j < this.messages.length; j++) {
          if (this.messages[j].id == this.checkedValGet[i]) {
            this.messages.splice(j, 1);
          }
        }
      }
    }
    this.calculatenotification();
    this.modalService.dismissAll();
  }

  calculatenotification() {
    this.totalNotify = 0;
    this.checkedValGet = [];

    this.checkedValGet.length > 0 ? (document.getElementById("notification-actions") as HTMLElement).style.display = 'block' : (document.getElementById("notification-actions") as HTMLElement).style.display = 'none';
    if (this.totalNotify == 0) {
      document.querySelector('.empty-notification-elem')?.classList.remove('d-none');
    }
  }
}