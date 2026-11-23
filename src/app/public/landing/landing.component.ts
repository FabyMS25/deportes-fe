import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { ComplejoDeportivo } from 'src/app/core/models/complejoDeportivo.model';
import { FacilitiesService } from 'src/app/core/services/api/facilities.service';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { WidgetModule } from 'src/app/shared/widget/widget.module';

interface Campo { name: string; sport: string; icon: string; }
interface Complejo { name: string; campos: Campo[]; categories: string[]; photo: string; photoTry: number; }
interface RegStep { icon: string; title: string; text: string; screen: string; }
interface Step { icon: string; title: string; text: string; state: string; color: string; }
interface Audience { icon: string; label: string; title: string; items: string[]; }
interface Feature { id: string; icon: string; title: string; text: string; who: string; }
interface Faq { q: string; a: string; }
interface TicketType { id: 'puntual' | 'recurrente' | 'mensualidad'; icon: string; title: string; text: string; }
interface QrStep { icon: string; title: string; text: string; }
interface CalCell { n: number; ev: { t: string; c: string }[]; }

@Component({
  selector: 'app-landing',
  imports: [CommonModule, RouterModule, WidgetModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  standalone: true
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {

  currentSection = 'hero';
  readonly currentYear = new Date().getFullYear();
  // Official RUAT search route for tasas y otros ingresos. The former
  // /pagosqr/InicioBusquedaTasa.jsf endpoint intermittently redirects to
  // RUAT's own ErrorAplicacion page.
  readonly ruatQrUrl = 'https://www.ruat.gob.bo/tasas/consultadeuda/InicioBusquedaTasa.jsf';
  private readonly previousTheme = document.documentElement.getAttribute('data-bs-theme');

  /* ---------- Catálogo público (datos reales) ---------- */
  complejos: Complejo[] = [];
  loadingCampos = true;
  camposLoadError = false;

  /* Foto de cada complejo: assets/images/fields/<nombre del complejo>.<ext>
     Reduce photoExts a tu extensión real para evitar peticiones de más. */
  private readonly photoBase = 'assets/images/fields/';
  private readonly photoExts = ['jpg', 'png', 'jpeg', 'webp'];
  private readonly fallbackPhoto = 'assets/images/fields/img-1.png';

  /* ---------- Sesión y menú ---------- */
  guidesOpen = false;

  /* ---------- Simulador de reserva (horarios de demostración) ---------- */
  readonly hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  days: { label: string; day: string }[] = [];
  selectedComplejo = 0;
  selectedCampo = 0;
  selectedDay = 0;
  selected = new Set<number>();

  /* ---------- Registro de contribuyentes ---------- */
  readonly regSteps: RegStep[] = [
    { icon: 'ri-id-card-line', title: 'Verifica tus datos', screen: 'Verificar datos',
      text: 'Elige tu tipo de documento, escribe tu número (con el complemento si corresponde, por ejemplo 12345678-1C) y el lugar de expedición. El sistema verifica tus datos en el Gobierno Municipal antes de continuar.' },
    { icon: 'ri-user-add-line', title: 'Completa tu registro', screen: 'Crear cuenta nueva',
      text: 'Llena el formulario de contribuyente: nombres, fecha de nacimiento, celular y un correo al que tengas acceso, porque ahí llegará el código de confirmación. Acepta los Términos y las Políticas de Seguridad.' },
    { icon: 'ri-mail-check-line', title: 'Confirma tu correo', screen: 'Verifique su correo',
      text: 'Ingresa los 4 dígitos que enviamos a tu correo. Si no llegó, usa "Reenviar"; si te equivocaste de dato, vuelve al registro.' },
    { icon: 'ri-login-circle-line', title: 'Ingresa y reserva', screen: 'Cuenta lista',
      text: 'Con tu cuenta creada, inicia sesión, revisa el mapa y haz tu primera reserva. Lo que puedes hacer depende del menú de tu perfil y de tu estado de verificación.' }
  ];
  regStep = 0;

  /* ---------- Funcionalidades ---------- */
  readonly features: Feature[] = [
    { id: 'mapa', icon: 'ri-map-pin-2-line', title: 'Mapa de complejos', who: 'Contribuyentes y personal',
      text: 'Ubica cada complejo, revisa sus campos, horarios y tarifas e inicia la reserva desde el mismo punto.' },
    { id: 'calendario', icon: 'ri-calendar-2-line', title: 'Calendario operativo', who: 'Personal municipal',
      text: 'Ocupación por mes, semana o día con el estado de cada reserva, de un vistazo.' },
    { id: 'reservas', icon: 'ri-calendar-check-line', title: 'Reserva puntual y recurrente', who: 'Contribuyentes y organizaciones',
      text: 'Un día o un rango de fechas, con validación de disponibilidad, tarifa y plazo de pago.' },
    { id: 'escuelas', icon: 'ri-graduation-cap-line', title: 'Escuelas y mensualidades', who: 'Tutores y representantes',
      text: 'Estudiantes, entrenadores y mensualidades por período, solo con relaciones vigentes.' },
    { id: 'reportes', icon: 'ri-bar-chart-box-line', title: 'Tickets y reportes', who: 'Personal y administración',
      text: 'Ticket al confirmar el pago y reportes de ingresos, puntuales, recurrentes y mensuales.' }
  ];
  activeFeature = 0;

  readonly calHeader = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
  readonly calCells: CalCell[] = Array.from({ length: 28 }, (_, i) => {
    const n = i + 1;
    const ev: { t: string; c: string }[] = [];
    if (n % 7 !== 0) { ev.push({ t: '08:00', c: 'bg-primary' }); }
    if (n % 3 === 0) { ev.push({ t: '15:00', c: 'bg-success' }); }
    if (n % 5 === 0) { ev.push({ t: '19:00', c: 'bg-secondary' }); }
    return { n, ev };
  });
  readonly bars = [38, 52, 44, 70, 60, 84, 76, 96];

  /* ---------- Flujo ---------- */
  readonly steps: Step[] = [
    { icon: 'ri-map-pin-2-line', title: 'Elige el campo',
      text: 'Explora complejos y campos con sus horarios, tarifas y disponibilidad. Solo se ofrecen campos operativos.',
      state: 'Sin reserva', color: 'secondary' },
    { icon: 'ri-calendar-event-line', title: 'Fecha y horario',
      text: 'Selecciona el día y la franja. El sistema comprueba horarios fijos, excepciones, mantenimiento y reservas existentes.',
      state: 'Disponibilidad verificada', color: 'info' },
    { icon: 'ri-user-star-line', title: 'Beneficiario y tarifa',
      text: 'Reserva a nombre propio o de una organización vigente y elige la tarifa compatible con el campo.',
      state: 'Reserva creada', color: 'primary' },
    { icon: 'ri-shield-check-line', title: 'Validación',
      text: 'Cuando la operación lo requiere, el personal habilitado aprueba o rechaza la solicitud.',
      state: 'SOLICITADA', color: 'warning' },
    { icon: 'ri-bank-card-line', title: 'Pago con RUAT',
      text: 'Se genera la tasa en RUAT. Paga en cualquier banco o con código QR dentro del plazo.',
      state: 'PENDIENTE de pago', color: 'warning' },
    { icon: 'ri-ticket-2-line', title: 'Ticket de reserva',
      text: 'Con el pago confirmado en RUAT, la reserva pasa a pagada y se habilita tu ticket.',
      state: 'PAGADA', color: 'success' }
  ];

  /* ---------- Público ---------- */
  readonly audiences: Audience[] = [
    { icon: 'ri-user-smile-line', label: 'Contribuyentes', title: 'Reserva por tu cuenta',
      items: ['Verifica tu cuenta con RUAT', 'Reservas puntuales o recurrentes según tu menú',
        'Paga la tasa y descarga tu ticket', 'Tutores: mensualidades de estudiantes a su cargo'] },
    { icon: 'ri-team-line', label: 'Organizaciones y escuelas', title: 'Reservas para grupos y escuelas',
      items: ['Representantes con organizaciones vigentes', 'Rango de fechas, días y sesiones',
        'Estudiantes, entrenadores y mensualidades', 'Solo relaciones activas del usuario'] },
    { icon: 'ri-government-line', label: 'Personal municipal', title: 'Control de complejos y campos',
      items: ['Calendario con ocupación y estados', 'Validar, rechazar, anular y cambiar horarios',
        'Encargados con complejo asignado', 'Catálogos, tarifas y reportes de ingresos'] }
  ];

  /* ---------- Pagos ---------- */
  paid = false;

  /* Guía de pago por QR (portal RUAT) */
  readonly qrSteps: QrStep[] = [
    { icon: 'ri-global-line', title: 'Entra al portal de RUAT',
      text: 'Ve a ruat.gob.bo, elige "Pagos QR" y luego "Tasas y Otros Ingresos". También puedes abrir directamente la página de búsqueda de tasas con el botón de abajo.' },
    { icon: 'ri-hashtag', title: 'Escribe tu N° de tasa',
      text: 'Deja el criterio "Tasa y otro ingreso/valorados" e ingresa el número de tasa de tu reserva. Lo ves en el detalle de la reserva.' },
    { icon: 'ri-government-line', title: 'Elige Quillacollo',
      text: 'En "Gobierno Municipal" selecciona QUILLACOLLO.' },
    { icon: 'ri-shield-keyhole-line', title: 'Verificación y Buscar',
      text: 'Escribe los caracteres de la imagen (puedes pulsar "Actualizar" si no se leen) y presiona Buscar.' },
    { icon: 'ri-qr-code-line', title: 'Genera el QR y paga',
      text: 'Genera el código QR y págalo desde la app de tu banco. Según indica RUAT, puedes generarlo hasta las 21:30 hrs y pagarlo hasta las 22:00 hrs.' }
  ];
  qrStep = 0;
  qrTab: 'guia' | 'portal' = 'guia';
  loadRuat = false;
  tasaDemo = '';
  readonly ruatSafeUrl: SafeResourceUrl;
  readonly qrCells: { x: number; y: number }[] = this.buildQr();

  /* Tickets (formato de los comprobantes oficiales) */
  readonly ticketTypes: TicketType[] = [
    { id: 'puntual', icon: 'ri-calendar-check-line', title: 'Ticket de reserva puntual',
      text: 'Fecha de uso, escenario, ingreso, salida, precio por hora y total.' },
    { id: 'recurrente', icon: 'ri-repeat-line', title: 'Ticket de reserva recurrente',
      text: 'Rango de fechas, sesiones, horarios programados por día y resumen de horas.' },
    { id: 'mensualidad', icon: 'ri-graduation-cap-line', title: 'Ticket de mensualidad',
      text: 'Estudiantes, matrícula, disciplina y entrenador, período y mensualidad.' }
  ];
  ticketType: 'puntual' | 'recurrente' | 'mensualidad' = 'puntual';
  readonly today = new Date().toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  readonly conditions = 'Mencionar y aclarar que esta autorización puede ser modificada en caso de que ocurra algún evento de improviso o repentino que tenga que cubrir el Gobierno Autónomo Municipal de Quillacollo. La parte solicitante será responsable de cualquier daño o perjuicio ocasionado u ocurrido dentro del mismo y deberá dejar los ambientes deportivos solicitados en buen estado de limpieza. Ser puntuales en el horario de ingreso, así como también en el horario de salida. Se prohíbe terminantemente el cobro del ingreso a dicho escenario deportivo por parte del solicitante según ordenanza municipal N° 128/2013. En todo caso se aplicará el art. 14 del Reglamento para la administración de infraestructuras deportivas, equivalente al 10% del total recaudado, así mismo la venta de cualquier alimento o producto dentro del campo deportivo.';

  readonly faqs: Faq[] = [
    { q: '¿Quién puede reservar?',
      a: 'Los usuarios activos y autorizados. Los contribuyentes deben tener su cuenta verificada con RUAT cuando el sistema lo requiere. Lo que cada usuario puede hacer depende del menú y los permisos de su perfil.' },
    { q: '¿Cuándo se genera el ticket?',
      a: 'Solo cuando el pago está confirmado en RUAT y registrado en el sistema. Una reserva aprobada puede seguir pendiente de pago: aprobación y pago son controles distintos.' },
    { q: '¿Qué pasa si no pago a tiempo?',
      a: 'Las reservas tienen una fecha límite de pago. Si el pago no se confirma dentro del plazo, la reserva puede expirar y cancelarse automáticamente.' },
    { q: '¿Cómo se paga?',
      a: 'Con la tasa generada por el sistema puedes pagar en cualquier banco habilitado o con código QR desde el portal de pagos QR de RUAT.' },
    { q: '¿Puedo cambiar el horario o anular una reserva?',
      a: 'Esas acciones las realiza el personal con el permiso correspondiente. Cada cambio se valida como una reserva nueva y la anulación conserva el historial; si hay una tasa en RUAT, también se anula allí.' },
    { q: 'Hice el pago pero no veo el ticket, ¿qué hago?',
      a: 'No repitas la operación. La confirmación se consulta por número de tasa o folio, así se evitan pagos duplicados. Si persiste, comunícate con el personal del complejo.' }
  ];
  openFaq = 0;

  private revealObserver?: IntersectionObserver;
  private spyObserver?: IntersectionObserver;

  constructor(
    private readonly host: ElementRef<HTMLElement>,
    private readonly facilitiesService: FacilitiesService,
    private readonly sanitizer: DomSanitizer,
    private readonly auth: AuthenticationService
  ) {
    this.ruatSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.ruatQrUrl);
  }

  ngOnInit(): void {
    document.documentElement.setAttribute('data-bs-theme', 'light');
    document.documentElement.setAttribute('data-body-image', 'none');
    this.buildDays();
    this.loadPublicSportsFields();
  }

  ngAfterViewInit(): void {
    this.initReveal();
    this.initSpy();
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
    this.spyObserver?.disconnect();
    if (this.previousTheme) { document.documentElement.setAttribute('data-bs-theme', this.previousTheme); }
  }

  /* ---------- Sesión ---------- */
  get isLoggedIn(): boolean { return this.auth.isLoggedIn(); }
  get entryLink(): string { return this.isLoggedIn ? this.auth.getDashboardRoute() : '/auth/login'; }
  get guideActive(): boolean { return ['register', 'flow', 'payment', 'tickets'].includes(this.currentSection); }

  goGuide(section: string) { this.guidesOpen = false; this.scrollTo(section); }
  goReg(i: number) { this.regStep = Math.max(0, Math.min(this.regSteps.length - 1, i)); }

  @HostListener('document:click')
  closeMenus() { this.guidesOpen = false; }

  /* ---------- Fotos de complejos ---------- */
  private photoUrl(name: string, i: number): string {
    return `${this.photoBase}${encodeURIComponent(name.trim())}.${this.photoExts[i]}`;
  }

  /** Si no existe la foto con esa extensión prueba la siguiente; al final usa la imagen por defecto. */
  onPhotoError(c: Complejo | undefined) {
    if (!c) { return; }
    const next = c.photoTry + 1;
    if (next < this.photoExts.length) {
      c.photoTry = next;
      c.photo = this.photoUrl(c.name, next);
    } else if (c.photo !== this.fallbackPhoto) {
      c.photo = this.fallbackPhoto;
    }
  }

  /* ---------- Datos derivados ---------- */
  get complejo(): Complejo | undefined { return this.complejos[this.selectedComplejo]; }
  get campos(): Campo[] { return this.complejo?.campos ?? []; }
  get camposCount(): number { return this.complejos.reduce((t, c) => t + c.campos.length, 0); }
  get categoriesCount(): number { return new Set(this.complejos.flatMap(c => c.categories)).size; }
  get hasData(): boolean { return !this.loadingCampos && !this.camposLoadError && this.complejos.length > 0; }

  /* ---------- Navegación ---------- */
  windowScroll() {
    const scrolled = document.body.scrollTop > 40 || document.documentElement.scrollTop > 40;
    document.getElementById('navbar')?.classList.toggle('is-sticky', scrolled);
    const backTop = document.getElementById('back-to-top');
    if (backTop) {
      backTop.style.display = (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) ? 'block' : 'none';
    }
  }

  topFunction() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

  scrollTo(section: string, offset: number = -80) {
    const el = document.getElementById(section);
    if (el) {
      window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset + offset, behavior: 'smooth' });
    }
    document.getElementById('navbarSupportedContent')?.classList.remove('show');
    this.currentSection = section;
  }

  onHeroMove(event: MouseEvent) {
    const hero = event.currentTarget as HTMLElement;
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--dp-mx', `${event.clientX - r.left}px`);
    hero.style.setProperty('--dp-my', `${event.clientY - r.top}px`);
  }

  scrollRail(dir: number) {
    document.getElementById('dp-rail')?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  }

  /* ---------- Simulador ---------- */
  private buildDays() {
    const today = new Date();
    this.days = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i + 1);
      return {
        label: d.toLocaleDateString('es-BO', { weekday: 'short' }).replace('.', ''),
        day: d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' }).replace('.', '')
      };
    });
  }

  onComplejo(event: Event) {
    this.selectedComplejo = Number((event.target as HTMLSelectElement).value);
    this.selectedCampo = 0;
    this.selected.clear();
  }

  onCampo(event: Event) {
    this.selectedCampo = Number((event.target as HTMLSelectElement).value);
    this.selected.clear();
  }

  chooseComplejo(i: number) {
    this.selectedComplejo = i;
    this.selectedCampo = 0;
    this.selected.clear();
    this.scrollTo('hero', 0);
  }

  pickDay(i: number) { this.selectedDay = i; this.selected.clear(); }

  isBusy(h: number): boolean {
    return (h * 7 + this.selectedComplejo * 2 + this.selectedCampo * 3 + this.selectedDay * 5) % 4 === 0;
  }

  toggleSlot(h: number) {
    if (!this.hasData || this.isBusy(h)) { return; }
    this.selected.has(h) ? this.selected.delete(h) : this.selected.add(h);
  }

  get selectedSlots(): number[] { return Array.from(this.selected).sort((a, b) => a - b); }
  get selectedText(): string { return this.selectedSlots.map(h => this.hourLabel(h)).join(' · '); }
  hourLabel(h: number): string { return `${String(h).padStart(2, '0')}:00`; }

  private loadPublicSportsFields(): void {
    this.facilitiesService.getPublicWithSportsFields().subscribe({
      next: complejos => {
        this.complejos = this.toComplejos(complejos);
        this.selectedComplejo = 0;
        this.selectedCampo = 0;
        this.loadingCampos = false;
      },
      error: () => {
        this.complejos = [];
        this.camposLoadError = true;
        this.loadingCampos = false;
      }
    });
  }

  private toComplejos(complejos: ComplejoDeportivo[]): Complejo[] {
    return complejos
      .map(c => {
        const campos: Campo[] = (c.camposDeportivosDtoList ?? []).map(campo => ({
          name: campo.nombre,
          sport: campo.categoria || 'Campo deportivo',
          icon: this.fieldIcon(campo.categoria)
        }));
        const categories = Array.from(new Set(campos.map(x => x.sport)));
        return { name: c.nombre, campos, categories, photo: this.photoUrl(c.nombre, 0), photoTry: 0 };
      })
      .filter(c => c.campos.length > 0);
  }

  private fieldIcon(categoria?: string): string {
    const value = (categoria ?? '').toLowerCase();
    if (value.includes('basquet') || value.includes('básquet')) return 'ri-basketball-line';
    if (value.includes('voley') || value.includes('voleibol')) return 'ri-volleyball-line';
    if (value.includes('tenis')) return 'ri-racket-line';
    return 'ri-football-line';
  }

  /* ---------- Guía QR ---------- */
  get ticketTitle(): string {
    return { puntual: 'Ticket de reserva puntual', recurrente: 'Ticket de reserva recurrente', mensualidad: 'Ticket de mensualidad - Escuela municipal' }[this.ticketType];
  }

  goQr(i: number) { this.qrStep = Math.max(0, Math.min(this.qrSteps.length - 1, i)); }

  onTasaInput(event: Event) {
    this.tasaDemo = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 8);
  }

  /** Patrón decorativo tipo QR (no es un código válido). */
  private buildQr(): { x: number; y: number }[] {
    const n = 21;
    const cells: { x: number; y: number }[] = [];
    let seed = 11;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (!inFinder(x, y) && rnd() > 0.52) { cells.push({ x, y }); }
      }
    }
    for (const [ox, oy] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          const edge = i === 0 || j === 0 || i === 6 || j === 6;
          const core = i >= 2 && i <= 4 && j >= 2 && j <= 4;
          if (edge || core) { cells.push({ x: ox + i, y: oy + j }); }
        }
      }
    }
    return cells;
  }

  /* ---------- Varios ---------- */
  toggleFaq(i: number) { this.openFaq = this.openFaq === i ? -1 : i; }

  private prefersReducedMotion(): boolean {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  private initReveal(): void {
    if (!('IntersectionObserver' in window) || this.prefersReducedMotion()) { return; }
    const items = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('[data-reveal]'));
    this.revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          this.revealObserver?.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(el => { el.classList.add('dp-reveal'); this.revealObserver?.observe(el); });
  }

  /** Marca en el menú la sección visible (reemplaza a appScrollspy). */
  private initSpy(): void {
    if (!('IntersectionObserver' in window)) { return; }
    const sections = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('section[id]'));
    this.spyObserver = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { this.currentSection = e.target.id; } });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => this.spyObserver?.observe(s));
  }
}
