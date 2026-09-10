import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin, Observable, of } from 'rxjs';
import Swal from 'sweetalert2';

import { TipoOrganizacion } from 'src/app/core/constants/Features';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { EstudianteEscuela } from 'src/app/core/models/EstudianteEscuela.model';
import { Organizacion } from 'src/app/core/models/organizacion.model';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { EstudianteEscuelaService } from 'src/app/core/services/api/estudianteEscuela.service';
import { OrganizacionService } from 'src/app/core/services/api/organizacion.service';
import { BreadCrumbItem } from 'src/app/shared/breadcrumbs/breadcrumbs.component';
import { CsvColumn } from 'src/app/shared/data-header/data-header.component';
import { ModalStudentComponent } from '../../modals/modal-student/modal-student.component';

@Component({
  selector: 'app-students',
  templateUrl: './students.component.html',
  styleUrl: './students.component.scss'
})
export class StudentsComponent implements OnInit {
  breadCrumbItems: BreadCrumbItem[] = [];
  canActivate: string[] = [];
  loading = true;
  viewMode: 'table' | 'cards' = 'table';
  searchTerm = '';
  estado = '';
  escuelaUuid = '';

  inscripciones: EstudianteEscuela[] = [];
  todasLasInscripciones: EstudianteEscuela[] = [];
  inscripcionesFiltradas: EstudianteEscuela[] = [];
  escuelas: Organizacion[] = [];
  tutores: Contribuyente[] = [];
  estudiantesExistentes: EstudianteEscuela[] = [];
  selectedItems: EstudianteEscuela[] = [];
  isContributor = false;

  readonly itemsList = [
    { name: 'Nombre', prop: 'nombreCompleto', visible: true, primary: true },
    { name: 'Matrículas', prop: 'matriculasTexto', visible: true },
    { name: 'Escuelas / organizaciones', prop: 'escuelasTexto', visible: true, truncate: 85 },
    { name: 'Tutores / responsables', prop: 'responsablesTexto', visible: true, truncate: 85 },
    { name: 'Estado en escuelas', prop: 'estadoInscripcion', visible: true, tag: true },
    { name: 'Estado del estudiante', prop: 'estadoEstudiante', visible: true, tag: true }
  ];

  readonly CSV_COLUMNS: CsvColumn<EstudianteEscuela>[] = [
    { header: 'Nombre', value: item => item.nombreCompleto ?? '' },
    { header: 'Matrículas', value: item => item.matriculasTexto ?? item.matricula ?? '' },
    { header: 'Escuelas / organizaciones', value: item => item.escuelasTexto ?? item.organizacionDto?.nombre ?? '' },
    { header: 'Tutores / responsables', value: item => item.responsablesTexto ?? item.contribuyenteDto?.nombreCompleto ?? '' },
    { header: 'Documento', value: item => item.numeroDocumento ?? '' },
    { header: 'Estado en escuelas', value: item => item.estadoInscripcion ?? '' },
    { header: 'Estado estudiante', value: item => item.estadoEstudiante ?? '' }
  ];

  constructor(
    private modalService: NgbModal,
    private authService: AuthenticationService,
    private estudiantesService: EstudianteEscuelaService,
    private organizacionesService: OrganizacionService,
    private contribuyentesService: ContribuyentesService
  ) {}

  ngOnInit(): void {
    this.canActivate = this.authService.hasPermission('/students');
    this.isContributor = this.authService.getUserRole() === 'Contribuyente';
    this.breadCrumbItems = [
      { label: '' },
      {
        label: 'Estudiantes',
        active: true,
      }
    ];
    const savedViewMode = localStorage.getItem('dataTableViewMode');
    if (savedViewMode === 'table' || savedViewMode === 'cards') this.viewMode = savedViewMode;
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    const currentUser = this.authService.currentUser();
    const organizacionesRequest: Observable<unknown> = this.isContributor
      ? this.organizacionesService.getByRepresentante(currentUser?.uuid)
      : this.organizacionesService.getByType(TipoOrganizacion.ESCUELA_MUNICIPAL);
    const tutoresRequest: Observable<unknown> = this.isContributor
      ? of(currentUser ? [currentUser] : [])
      : this.contribuyentesService.getAll();
    forkJoin({
      inscripciones: this.estudiantesService.getAll(),
      organizaciones: organizacionesRequest,
      tutores: tutoresRequest
    }).subscribe({
      next: ({ inscripciones, organizaciones, tutores }) => {
        const inscripcionesList = this.extractList<EstudianteEscuela>(inscripciones);
        const organizacionesList = this.extractList<Organizacion>(organizaciones);
        this.escuelas = organizacionesList.filter(item =>
          item.activo !== false && item.tipoOrganizacion === TipoOrganizacion.ESCUELA_MUNICIPAL
        );
        const escuelasGestionadas = new Set(this.escuelas.map(item => item.uuid));
        this.todasLasInscripciones = this.addCalculatedStatuses(inscripcionesList, escuelasGestionadas);
        this.inscripciones = this.groupStudentsForList(this.todasLasInscripciones);
        this.tutores = this.extractList<Contribuyente>(tutores);
        this.estudiantesExistentes = this.uniqueStudents(this.todasLasInscripciones);
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.showError(error, 'No se pudo cargar la administración de estudiantes');
      }
    });
  }

  openModal(row?: EstudianteEscuela, accion: '' | 'edit' | 'show' = ''): void {
    const modalRef = this.modalService.open(ModalStudentComponent, {
      backdrop: 'static',
      size: 'lg'
    });
    const relaciones = row?.relacionesEstudiante?.length ? row.relacionesEstudiante : (row ? [row] : []);
    modalRef.componentInstance.row = relaciones[0] || row;
    modalRef.componentInstance.relacionesEstudiante = relaciones;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.escuelas = this.escuelas;
    modalRef.componentInstance.tutores = this.tutores;
    modalRef.componentInstance.estudiantesExistentes = this.estudiantesExistentes;
    modalRef.componentInstance.emitList.subscribe(() => this.loadData());
  }

  async darDeBaja(row: EstudianteEscuela): Promise<void> {
    const target = await this.pickRelationship(row, 'Seleccione la escuela que desea dar de baja', item => !!item.uuid && item.activo);
    if (!target?.uuid) return;
    const result = await Swal.fire({
      title: 'Dar de baja de la escuela',
      html: `<p class="mb-2"><strong>${this.escapeHtml(target.nombreCompleto)}</strong> dejará de estar activo en <strong>${this.escapeHtml(target.organizacionDto?.nombre)}</strong>.</p><small>El estudiante, la matrícula y el historial no se eliminarán.</small>`,
      input: 'textarea',
      inputLabel: 'Motivo de baja (opcional)',
      inputPlaceholder: 'Escriba el motivo...',
      inputAttributes: { maxlength: '500' },
      showCancelButton: true,
      confirmButtonText: 'Dar de baja',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    });
    if (!result.isConfirmed) return;
    this.estudiantesService.darDeBaja(target.uuid, String(result.value ?? '')).subscribe({
      next: () => {
        Swal.fire('Inscripción inactiva', 'La baja fue registrada y el historial se conservó.', 'success');
        this.loadData();
      },
      error: error => this.showError(error, 'No se pudo dar de baja la inscripción')
    });
  }

  async desvincularTutor(row: EstudianteEscuela): Promise<void> {
    const target = await this.pickRelationship(row, 'Seleccione la relación donde desea quitar el tutor', item => !!item.uuid && !!item.contribuyenteDto);
    if (!target?.uuid || !target.contribuyenteDto) return;
    const result = await Swal.fire({
      title: 'Desvincular tutor',
      text: `Se quitará a ${target.contribuyenteDto.nombreCompleto ?? 'este tutor'} como responsable de esta inscripción. El estudiante seguirá activo en la escuela.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Desvincular',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    this.estudiantesService.quitarResponsable(target.uuid).subscribe({
      next: () => {
        Swal.fire('Tutor desvinculado', 'La inscripción continúa activa y ahora no tiene tutor asignado.', 'success');
        this.loadData();
      },
      error: error => this.showError(error, 'No se pudo desvincular al tutor')
    });
  }

  async habilitar(row: EstudianteEscuela): Promise<void> {
    const target = await this.pickRelationship(row, 'Seleccione la inscripción que desea habilitar', item => !!item.uuid && !item.activo && !item.reactivacionBloqueada);
    if (!target?.uuid) return;
    const result = await Swal.fire({
      title: 'Habilitar estudiante',
      text: 'Se creará una nueva inscripción activa y una nueva matrícula. La inscripción anterior permanecerá en el historial.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Habilitar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    this.estudiantesService.reactivar(target.uuid).subscribe({
      next: () => {
        Swal.fire('Estudiante habilitado', 'La nueva inscripción fue creada correctamente.', 'success');
        this.loadData();
      },
      error: error => this.showError(error, 'No se pudo habilitar al estudiante')
    });
  }

  applyFilters(): void {
    const term = this.normalize(this.searchTerm);
    this.inscripcionesFiltradas = this.inscripciones.filter(item => {
      const matchesSearch = !term || [
        item.nombreCompleto,
        item.matricula,
        item.matriculasTexto,
        item.numeroDocumento,
        item.organizacionDto?.nombre,
        item.escuelasTexto,
        item.contribuyenteDto?.nombreCompleto,
        item.responsablesTexto
      ].some(value => this.normalize(value).includes(term));
      const matchesStatus = !this.estado || item.estadoInscripcion === this.estado;
      const matchesSchool = !this.escuelaUuid || item.escuelaUuids?.includes(this.escuelaUuid) || item.organizacionDto?.uuid === this.escuelaUuid;
      return matchesSearch && matchesStatus && matchesSchool;
    });
    this.selectedItems = this.selectedItems.filter(selected =>
      this.inscripcionesFiltradas.some(item => item.uuid === selected.uuid));
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.estado = '';
    this.escuelaUuid = '';
    this.applyFilters();
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'cards' : 'table';
    localStorage.setItem('dataTableViewMode', this.viewMode);
  }

  getSelectedItems(items: EstudianteEscuela[]): void {
    this.selectedItems = items;
  }

  get canCreateStudent(): boolean {
    return this.canActivate.includes('CREAR') && this.escuelas.length > 0;
  }

  private addCalculatedStatuses(
    items: EstudianteEscuela[],
    escuelasGestionadas: Set<string | undefined>
  ): EstudianteEscuela[] {
    const activeStudents = new Set(items.filter(item => item.activo).map(item => item.estudianteUuid));
    return items.map(item => ({
      ...item,
      estadoInscripcion: item.activo ? 'ACTIVA' : 'INACTIVA',
      estadoEstudiante: activeStudents.has(item.estudianteUuid) ? 'ACTIVO' : 'INACTIVO',
      puedeGestionar: !this.isContributor || escuelasGestionadas.has(item.organizacionDto?.uuid),
      reactivacionBloqueada: !item.activo && items.some(other =>
        other.uuid !== item.uuid &&
        other.activo === true &&
        other.estudianteUuid === item.estudianteUuid &&
        other.organizacionDto?.uuid === item.organizacionDto?.uuid)
    }));
  }

  private groupStudentsForList(items: EstudianteEscuela[]): EstudianteEscuela[] {
    const groups = new Map<string, EstudianteEscuela[]>();
    items.forEach(item => {
      const key = item.estudianteUuid || item.uuid || `${item.nombreCompleto}|${item.numeroDocumento}`;
      const list = groups.get(key) || [];
      list.push(item);
      groups.set(key, list);
    });

    return [...groups.values()].map(relaciones => {
      const ordered = [...relaciones].sort((a, b) => Number(b.activo) - Number(a.activo));
      const base = ordered[0];
      const escuelas = this.uniqueText(ordered.map(item => {
        const nombre = item.organizacionDto?.nombre;
        if (!nombre) return '';
        return `${nombre} (${item.activo ? 'Activa' : 'Inactiva'})`;
      }));
      const responsables = this.uniqueText(ordered.map(item => String(item.contribuyenteDto?.nombreCompleto || 'Sin tutor asignado')));
      const matriculas = this.uniqueText(ordered.map(item => item.matricula));
      const hasActive = ordered.some(item => item.activo);
      return {
        ...base,
        relacionesEstudiante: ordered,
        escuelasTexto: escuelas.join(', '),
        responsablesTexto: responsables.join(', '),
        matriculasTexto: matriculas.join(', '),
        escuelaUuids: this.uniqueText(ordered.map(item => item.organizacionDto?.uuid)),
        estadoInscripcion: (hasActive ? 'ACTIVA' : 'INACTIVA') as 'ACTIVA' | 'INACTIVA',
        estadoEstudiante: (hasActive ? 'ACTIVO' : 'INACTIVO') as 'ACTIVO' | 'INACTIVO',
        puedeGestionar: ordered.some(item => item.puedeGestionar)
      };
    }).sort((a, b) => String(a.nombreCompleto ?? '').localeCompare(String(b.nombreCompleto ?? ''), 'es'));
  }

  private uniqueStudents(items: EstudianteEscuela[]): EstudianteEscuela[] {
    const unique = new Map<string, EstudianteEscuela>();
    items.forEach(item => {
      if (item.estudianteUuid && !unique.has(item.estudianteUuid)) unique.set(item.estudianteUuid, item);
    });
    return [...unique.values()].sort((a, b) =>
      String(a.nombreCompleto ?? '').localeCompare(String(b.nombreCompleto ?? ''), 'es'));
  }

  private uniqueText(values: Array<string | undefined | null>): string[] {
    return [...new Set(values.map(value => String(value ?? '').trim()).filter(Boolean))];
  }

  private relationshipsFor(row: EstudianteEscuela): EstudianteEscuela[] {
    return row.relacionesEstudiante?.length ? row.relacionesEstudiante : [row];
  }

  private async pickRelationship(
    row: EstudianteEscuela,
    title: string,
    predicate: (item: EstudianteEscuela) => boolean
  ): Promise<EstudianteEscuela | undefined> {
    const relaciones = this.relationshipsFor(row).filter(predicate);
    if (relaciones.length === 0) {
      await Swal.fire('Sin relación disponible', 'No hay una relación que pueda procesarse con esta acción.', 'info');
      return undefined;
    }
    if (relaciones.length === 1) return relaciones[0];
    const inputOptions = relaciones.reduce((options, item) => {
      if (item.uuid) {
        options[item.uuid] = `${item.organizacionDto?.nombre ?? 'Escuela'} - ${item.matricula ?? 'sin matrícula'} - ${item.activo ? 'Activa' : 'Inactiva'}`;
      }
      return options;
    }, {} as Record<string, string>);
    const result = await Swal.fire({
      title,
      input: 'select',
      inputOptions,
      inputPlaceholder: 'Seleccione una relación',
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed || !result.value) return undefined;
    return relaciones.find(item => item.uuid === result.value);
  }

  private extractList<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];
    if (!value || typeof value !== 'object') return [];
    const container = value as { content?: unknown; items?: unknown };
    if (Array.isArray(container.content)) return container.content as T[];
    if (Array.isArray(container.items)) return container.items as T[];
    return [];
  }

  private normalize(value: unknown): string {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
    }[char] ?? char));
  }

  private showError(error: any, fallback: string): void {
    Swal.fire({ text: error?.message || fallback, icon: 'error', confirmButtonColor: '#299cdb' });
  }
}
