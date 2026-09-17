import { Component, EventEmitter, Input, Output, OnInit, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormControl, UntypedFormBuilder, UntypedFormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { Organizacion } from 'src/app/core/models/organizacion.model';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { OrganizacionService } from 'src/app/core/services/api/organizacion.service';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { OrganizacionRepresentante } from 'src/app/core/models/organizacion-representante.model';
import { EstudianteEscuela } from 'src/app/core/models/EstudianteEscuela.model';
import { EstudianteEscuelaService } from 'src/app/core/services/api/estudianteEscuela.service';
import { ModalStudentComponent } from '../modal-student/modal-student.component';
import { CommonModule } from '@angular/common';
import { TipoOrganizacion } from 'src/app/core/constants/Features';
import { AuthenticationService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-modal-organization-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './modal-organization.component.html',
  styleUrl: './modal-organization.component.scss'
})
export class ModalOrganizationComponent implements OnInit {
  private readonly authService = inject(AuthenticationService);
  get canRegisterStudent(): boolean {
    if (!this.authService.hasPermission('/students').includes('CREAR')) return false;
    if (this.authService.getUserRole() !== 'Contribuyente') return true;
    return !!this.row?.representantesDto?.some(rep =>
      rep.contribuyenteDto?.uuid === this.authService.currentUser()?.uuid);
  }
  @Input() accion!: string;
  @Input() row!: Organizacion;
  @Input() contribuyentesList: Contribuyente[] = [];
  @Output() emitList = new EventEmitter();

  contentForm!: UntypedFormGroup;
  activeTab: 'datos' | 'representantes' | 'estudiantes' = 'datos';
  representantes: OrganizacionRepresentante[] = [];
  estudiantesInscritos: EstudianteEscuela[] = [];
  estudiantesExistentes: EstudianteEscuela[] = [];
  cargandoEstudiantes = false;
  personaBusqueda = '';
  get personasDisponibles(): Contribuyente[] {
    const q = this.personaBusqueda.trim().toLocaleLowerCase();
    return this.contribuyentesList.filter(p => p.estaActivo !== false &&
      !this.representantes.some(r => r.contribuyenteDto?.uuid === p.uuid) &&
      `${p.nombreCompleto || p.nombre + ' ' + p.primerApellido} ${p.numeroDocumento}`.toLocaleLowerCase().includes(q));
  }
  agregarRepresentante(persona: Contribuyente): void {
    if (this.representantes.some(r => r.contribuyenteDto?.uuid === persona.uuid)) return;
    this.representantes.push({ contribuyenteDto: persona });
    this.personaBusqueda = '';
  }
  quitarRepresentante(index: number): void {
    this.representantes.splice(index, 1);
  }
  submitted = false;
  showLoading = false;

  tiposOrganizacion = [
    { value: TipoOrganizacion.ASOCIACION, label: 'Asociación' },
    { value: TipoOrganizacion.CLUB, label: 'Club' },
    { value: TipoOrganizacion.ESCUELA_MUNICIPAL, label: 'Escuela Municipal' },
    { value: TipoOrganizacion.ORGANIZACION, label: 'Organización' }
  ];

  constructor(
    private modalService: NgbModal,
    private organizacionesService: OrganizacionService,
    private contribuyentesService: ContribuyentesService,
    private estudiantesService: EstudianteEscuelaService,
    private formBuilder: UntypedFormBuilder,
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.formDataSet();
    this.setupFormListeners();
    this.representantes = (this.row?.representantesDto || [])
      .map(r => ({...r}));
    this.contribuyentesService.getAll().subscribe({
      next: (data: any) => this.contribuyentesList = data?.content || data || [],
      error: () => this.notify('No se pudo cargar la lista de contribuyentes', 'error')
    });
    if (this.row?.uuid && this.row?.tipoOrganizacion === TipoOrganizacion.ESCUELA_MUNICIPAL) {
      this.loadEstudiantesInscritos();
      this.loadEstudiantesExistentes();
    }
  }

  private initializeForm(): void {
    this.contentForm = this.formBuilder.group({
      uuid: [''],
      tipoOrganizacion: ['', [Validators.required]],
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      telefono: ['', [Validators.pattern('^\\+?[0-9]{7,15}$')]],
      email: ['', [Validators.email]],
      direccion: ['', [Validators.maxLength(500)]],
      personeriaJuridica: ['', [Validators.maxLength(100)]],
      nroNit: ['', [Validators.maxLength(20)]],
      activo: [true],
      
      entrenador: [''],
      disciplina: [''],
      codigoEscuela: [''],
      
      requierePagoMensualidad: [false],
      tarifaMensual: [0, [Validators.min(0)]],
      permiteReservasGratuitas: [false]
    });
  }

  private setupFormListeners(): void {
    this.contentForm.get('tipoOrganizacion')?.valueChanges.subscribe(tipo => {
      this.handleTipoOrganizacionChange(tipo);
    });
    this.contentForm.get('requierePagoMensualidad')?.valueChanges.subscribe(requierePago => {
      this.handlePagoMensualidadChange(requierePago);
    });
  }

  private handleTipoOrganizacionChange(tipo: TipoOrganizacion): void {
    const escuelaMunicipalFields = ['entrenador', 'disciplina', 'codigoEscuela'];
    const paymentFields = ['requierePagoMensualidad', 'tarifaMensual', 'permiteReservasGratuitas'];
    
    escuelaMunicipalFields.forEach(field => {
      this.contentForm.get(field)?.setValue('');
    });
    
    if (tipo === TipoOrganizacion.ESCUELA_MUNICIPAL) {
      this.contentForm.get('requierePagoMensualidad')?.setValue(true);
      this.contentForm.get('permiteReservasGratuitas')?.setValue(true);
      
      escuelaMunicipalFields.forEach(field => {
        this.contentForm.get(field)?.setValidators([Validators.required]);
        this.contentForm.get(field)?.updateValueAndValidity();
      });
    } else {
      escuelaMunicipalFields.forEach(field => {
        this.contentForm.get(field)?.clearValidators();
        this.contentForm.get(field)?.updateValueAndValidity();
      });
      if (tipo === TipoOrganizacion.ASOCIACION || tipo === TipoOrganizacion.CLUB) {
        this.contentForm.get('permiteReservasGratuitas')?.setValue(true);
      }
    }
  }

  private handlePagoMensualidadChange(requierePago: boolean): void {
    if (requierePago) {
      this.contentForm.get('tarifaMensual')?.setValidators([Validators.required, Validators.min(0)]);
    } else {
      this.contentForm.get('tarifaMensual')?.clearValidators();
      this.contentForm.get('tarifaMensual')?.setValue(0);
    }
    this.contentForm.get('tarifaMensual')?.updateValueAndValidity();
  }

  get form() {
    return this.contentForm.controls;
  }

  get isEscuelaMunicipal(): boolean {
    return this.contentForm.get('tipoOrganizacion')?.value === TipoOrganizacion.ESCUELA_MUNICIPAL;
  }

  get mostrarTabEstudiantes(): boolean {
    return this.isEscuelaMunicipal || this.row?.tipoOrganizacion === TipoOrganizacion.ESCUELA_MUNICIPAL;
  }

  get isAsociacionOrClub(): boolean {
    const tipo = this.contentForm.get('tipoOrganizacion')?.value;
    return tipo === TipoOrganizacion.ASOCIACION || tipo === TipoOrganizacion.CLUB;
  }

  get requierePagoMensualidad(): boolean {
    return this.contentForm.get('requierePagoMensualidad')?.value;
  }

  private formDataSet() {
    if (this.accion !== '' && this.row) {
      this.contentForm.patchValue({
        uuid: this.row.uuid,
        tipoOrganizacion: this.row.tipoOrganizacion,
        nombre: this.row.nombre,
        telefono: this.row.telefono || '',
        email: this.row.email || '',
        direccion: this.row.direccion || '',
        personeriaJuridica: this.row.personeriaJuridica || '',
        nroNit: this.row.nroNit || '',
        activo: this.row.activo !== undefined ? this.row.activo : true,
        
        entrenador: this.row.entrenador || '',
        disciplina: this.row.disciplina || '',
        codigoEscuela: this.row.codigoEscuela || '',
        
        requierePagoMensualidad: this.row.requierePagoMensualidad || false,
        tarifaMensual: this.row.tarifaMensual || 0,
        permiteReservasGratuitas: this.row.permiteReservasGratuitas || false
      });

      if (this.accion === 'show') {
        this.contentForm.disable();
      }
    }
  }

  compareContribuyente(c1: Contribuyente, c2: Contribuyente): boolean {
    if (!c1 || !c2) {
      return c1 === c2;
    }
    if (c1.uuid && c2.uuid) {
      return c1.uuid === c2.uuid;
    }
    return c1.numeroDocumento === c2.numeroDocumento;
  }

  saveData() {
    this.submitted = true;
    if (this.contentForm.valid) {
      this.showLoading = true;
      const formData = this.contentForm.value;
      
      if (!this.representantes.length) {
        this.notify('Agregue al menos un representante', 'warning');
        this.activeTab = 'representantes';
        this.showLoading = false;
        return;
      }
      let datos: Organizacion = {
        tipoOrganizacion: formData.tipoOrganizacion,
        nombre: formData.nombre.trim(),
        telefono: formData.telefono?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        direccion: formData.direccion?.trim() || undefined,
        personeriaJuridica: formData.personeriaJuridica?.trim() || undefined,
        nroNit: formData.nroNit?.trim() || undefined,
        activo: formData.activo,
        
        entrenador: formData.entrenador?.trim() || undefined,
        disciplina: formData.disciplina?.trim() || undefined,
        codigoEscuela: formData.codigoEscuela?.trim() || undefined,
        
        requierePagoMensualidad: formData.requierePagoMensualidad,
        tarifaMensual: formData.requierePagoMensualidad ? formData.tarifaMensual : undefined,
        permiteReservasGratuitas: formData.permiteReservasGratuitas,
        representantesDto: this.representantes,
      };

      if (formData.uuid) {
        datos.uuid = formData.uuid;
        this.updateData(datos);
      } else {
        this.addData(datos);
      }
    } else {
      this.notify('Por favor, complete todos los campos requeridos correctamente', 'error');
      this.activeTab = 'datos';
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.contentForm.controls).forEach(key => {
      this.contentForm.get(key)?.markAsTouched();
    });
  }

  /* API Requests */
  private addData(datos: Organizacion) {
    this.organizacionesService.save(datos).subscribe({
      next: (data: any) => {
        this.showLoading = false;
        this.submitted = false;
        this.notify('Organización registrada exitosamente', 'success');
        this.closeModal();
        this.emitList.emit();
      },
      error: (error) => {
        this.showLoading = false;
        this.submitted = false;
        const errorMessage = error?.error?.message || error.message || 'Error desconocido';
        this.notify(`Error al registrar la organización: ${errorMessage}`, 'error');
      }
    });
  }

  private updateData(datos: Organizacion) {
    this.organizacionesService.update(datos).subscribe({
      next: (data: any) => {
        this.showLoading = false;
        this.submitted = false;
        this.notify('Organización actualizada exitosamente', 'success');
        this.closeModal();
        this.emitList.emit();
      },
      error: (error) => {
        this.showLoading = false;
        this.submitted = false;
        const errorMessage = error?.error?.message || error.message || 'Error desconocido';
        this.notify(`Error al actualizar la organización: ${errorMessage}`, 'error');
      }
    });
  }

  loadEstudiantesInscritos(): void {
    if (!this.row?.uuid) return;
    this.cargandoEstudiantes = true;
    this.estudiantesService.getBySchool(this.row.uuid, false).subscribe({
      next: (data: any) => {
        this.estudiantesInscritos = data?.content || data || [];
        this.cargandoEstudiantes = false;
      },
      error: () => {
        this.estudiantesInscritos = [];
        this.cargandoEstudiantes = false;
        this.notify('No se pudo cargar los estudiantes inscritos', 'error');
      }
    });
  }

  loadEstudiantesExistentes(): void {
    this.estudiantesService.getAll().subscribe({
      next: (data: any) => this.estudiantesExistentes = data?.content || data || [],
      error: () => this.estudiantesExistentes = []
    });
  }

  abrirInscripcionEstudiante(): void {
    if (!this.row?.uuid || !this.canRegisterStudent) return;
    const modalRef = this.modalService.open(ModalStudentComponent, {
      backdrop: 'static',
      size: 'lg'
    });
    modalRef.componentInstance.accion = '';
    modalRef.componentInstance.escuelas = [this.row];
    modalRef.componentInstance.tutores = this.contribuyentesList;
    modalRef.componentInstance.estudiantesExistentes = this.estudiantesExistentes;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.loadEstudiantesInscritos();
      this.loadEstudiantesExistentes();
      this.emitList.emit();
    });
  }

  estudianteTutorLabel(estudiante: EstudianteEscuela): string {
    return String(estudiante.contribuyenteDto?.nombreCompleto || 'Sin responsable');
  }

  deleteData(uuid: string) {
    this.organizacionesService.delete(uuid).subscribe({
      next: (message: string) => {
        this.submitted = false;
        this.notify(message || 'Organización eliminada exitosamente', 'success');
        this.modalService.dismissAll();
        this.emitList.emit();
        this.closeModal();
      },
      error: err => {
        this.submitted = false;
        this.notify('No se pudo anular el registro!', 'error');
      }
    });
  }

  public closeModal() {
    this.submitted = false;
    this.showLoading = false;
    this.contentForm.enable();
    this.contentForm.reset();
    this.modalService.dismissAll();
  }

  private notify(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    const config = {
      success: { icon: 'success' as const, timer: 3000 },
      error: { icon: 'error' as const, timer: 5000 },
      warning: { icon: 'warning' as const, timer: 4000 },
      info: { icon: 'info' as const, timer: 3000 }
    };
    Swal.fire({
      text: message,
      icon: config[type].icon,
      timer: config[type].timer,
      timerProgressBar: true,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  }

  getTipoOrganizacionLabel(tipo: string): string {
    const tipoObj = this.tiposOrganizacion.find(t => t.value === tipo);
    return tipoObj ? tipoObj.label : tipo;
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

