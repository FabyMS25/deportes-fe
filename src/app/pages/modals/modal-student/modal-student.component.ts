import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, inject, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal, NgbPaginationModule, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { forkJoin, Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { EstudianteEscuela } from 'src/app/core/models/EstudianteEscuela.model';
import { Organizacion } from 'src/app/core/models/organizacion.model';
import { EstudianteEscuelaService } from 'src/app/core/services/api/estudianteEscuela.service';

import { ReservaPeriodoService } from 'src/app/core/services/api/reserva-periodo.service';
import { ReservaPeriodo } from 'src/app/core/models/reservaPeriodo.model';
import { TicketComponent } from '../../modules/reports/ticket/ticket.component';

@Component({
  selector: 'app-modal-student',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgSelectModule, NgbPaginationModule],
  templateUrl: './modal-student.component.html',
  styleUrl: './modal-student.component.scss'
})
export class ModalStudentComponent implements OnInit, OnDestroy {
  @Input() accion: '' | 'edit' | 'show' = '';
  @Input() row?: EstudianteEscuela;
  @Input() relacionesEstudiante: EstudianteEscuela[] = [];
  @Input() escuelas: Organizacion[] = [];
  @Input() tutores: Contribuyente[] = [];
  @Input() estudiantesExistentes: EstudianteEscuela[] = [];
  @Output() emitList = new EventEmitter<void>();

  private readonly monthlyService = inject(ReservaPeriodoService);
  private readonly modalService = inject(NgbModal);
  monthlyHistory: ReservaPeriodo[] = [];
  monthlyLoading = false;
  monthlyError = '';
  monthlyLoaded = false;
  monthlyPage = 1;
  readonly monthlyPageSize = 8;

  openMonthlyHistory(): void {
    if (this.accion !== 'show') return;
    this.activeTab = 'mensualidades';
    if (this.monthlyLoaded || this.monthlyLoading) return;
    const uuids = [...new Set([this.row, ...this.relacionesEstudiante].map(item => item?.uuid).filter((uuid): uuid is string => !!uuid))];
    if (!uuids.length) { this.monthlyLoaded = true; return; }
    this.monthlyLoading = true;
    this.monthlyError = '';
    forkJoin(uuids.map(uuid => this.monthlyService.getStudentHistory(uuid))).pipe(takeUntil(this.destroy$)).subscribe({
      next: results => {
        const unique = new Map<string, ReservaPeriodo>();
        results.flat().forEach(item => unique.set(item.uuid || [item.reservaDto?.uuid, item.estudianteEscuelaDto?.uuid, item.año, item.mes].join('|'), item));
        this.monthlyHistory = [...unique.values()].sort((a, b) => b.año - a.año || b.mes - a.mes);
        this.monthlyPage = 1;
        this.monthlyLoaded = true;
        this.monthlyLoading = false;
      },
      error: error => {
        this.monthlyLoading = false;
        this.monthlyError = error?.message || 'No se pudieron cargar las mensualidades. Intente nuevamente.';
      }
    });
  }

  get visibleMonthlyHistory(): ReservaPeriodo[] {
    return this.monthlyHistory.slice((this.monthlyPage - 1) * this.monthlyPageSize, this.monthlyPage * this.monthlyPageSize);
  }

  openMonthlyTicket(item: ReservaPeriodo): void {
    if (this.accion !== 'show' || !item.reservaDto?.uuid) return;
    const modalRef = this.modalService.open(TicketComponent, { size: 'lg', windowClass: 'ticket-modal' });
    modalRef.componentInstance.reservationData = item.reservaDto;
    modalRef.componentInstance.bookingType = 'periodo';
    modalRef.componentInstance.autoLoad = true;
    modalRef.componentInstance.showAsModal = true;
  }

  submitted = false;
  showLoading = false;
  selectedExistingStudent = false;
  activeTab: 'personal' | 'relacion' | 'mensualidades' = 'personal';
  studentSearchResults: EstudianteEscuela[] = [];
  readonly studentTypeahead = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  readonly form = this.formBuilder.group({
    existingStudentUuid: [''],
    nombreCompleto: ['', [Validators.required, Validators.maxLength(255)]],
    fechaNacimiento: [''],
    genero: [''],
    numeroDocumento: ['', [Validators.maxLength(20)]],
    telefono: ['', [Validators.maxLength(20)]],
    email: ['', [Validators.email, Validators.maxLength(255)]],
    organizacionUuid: ['', Validators.required],
    contribuyenteUuid: [''],
    fechaInscripcion: [this.today(), Validators.required]
  });

  constructor(
    private formBuilder: FormBuilder,
    private activeModal: NgbActiveModal,
    private estudiantesService: EstudianteEscuelaService
  ) {}

  ngOnInit(): void {
    this.studentTypeahead.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => this.searchExistingStudents(term));

    if (!this.relacionesEstudiante.length && this.row) {
      this.relacionesEstudiante = this.row.relacionesEstudiante?.length ? this.row.relacionesEstudiante : [this.row];
    }

    if (this.row) {
      this.form.patchValue({
        nombreCompleto: this.row.nombreCompleto ?? '',
        fechaNacimiento: this.toDateInput(this.row.fechaNacimiento),
        genero: this.row.genero ?? '',
        numeroDocumento: this.row.numeroDocumento ?? '',
        telefono: this.row.telefono ?? '',
        email: this.row.email ?? '',
        organizacionUuid: this.row.organizacionDto?.uuid ?? '',
        contribuyenteUuid: this.row.contribuyenteDto?.uuid ?? '',
        fechaInscripcion: this.toDateInput(this.row.fechaInscripcion) || this.today()
      });
      this.form.controls.existingStudentUuid.disable({ emitEvent: false });
      this.form.controls.organizacionUuid.disable({ emitEvent: false });
    } else {
      if (this.escuelas.length === 1) {
        this.form.controls.organizacionUuid.setValue(this.escuelas[0].uuid ?? '', { emitEvent: false });
        this.onEscuelaChange();
      }
      if (this.tutores.length === 1) {
        this.form.controls.contribuyenteUuid.setValue(this.tutores[0].uuid ?? '', { emitEvent: false });
      }
    }
    if (this.accion === 'show') this.form.disable({ emitEvent: false });
  }

  get tutoresDisponibles(): Contribuyente[] {
    const escuelaUuid = this.form.controls.organizacionUuid.value;
    const escuela = this.escuelas.find(item => item.uuid === escuelaUuid);
    const representantes = (escuela?.representantesDto || [])
      .map(value => value.contribuyenteDto)
      .filter((value): value is Contribuyente => !!value);
    return representantes.length ? representantes : this.tutores;
  }

  onEscuelaChange(): void {
    const selectedTutor = this.form.controls.contribuyenteUuid.value;
    if (selectedTutor && !this.tutoresDisponibles.some(tutor => tutor.uuid === selectedTutor)) {
      this.form.controls.contribuyenteUuid.setValue('', { emitEvent: false });
    }
    if (!this.form.controls.contribuyenteUuid.value && this.tutoresDisponibles.length === 1) {
      this.form.controls.contribuyenteUuid.setValue(this.tutoresDisponibles[0].uuid ?? '', { emitEvent: false });
    }
  }

  registrarOtraRelacion(): void {
    const value = this.form.getRawValue();
    const estudianteUuid = this.row?.estudianteUuid || value.existingStudentUuid;
    this.row = undefined;
    this.accion = '';
    this.form.enable({ emitEvent: false });
    this.form.patchValue({
      existingStudentUuid: estudianteUuid || '',
      nombreCompleto: value.nombreCompleto || '',
      fechaNacimiento: value.fechaNacimiento || '',
      genero: value.genero || '',
      numeroDocumento: value.numeroDocumento || '',
      telefono: value.telefono || '',
      email: value.email || '',
      organizacionUuid: '',
      contribuyenteUuid: '',
      fechaInscripcion: this.today()
    });
    this.form.controls.existingStudentUuid.disable({ emitEvent: false });
    this.activeTab = 'relacion';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  enableEdit(): void {
    if (this.activeTab === 'mensualidades') this.activeTab = 'personal';
    this.accion = 'edit';
    this.form.enable({ emitEvent: false });
    this.form.controls.existingStudentUuid.disable({ emitEvent: false });
    if (this.row) this.form.controls.organizacionUuid.disable({ emitEvent: false });
  }

  onExistingStudentChange(estudianteUuid: string | null): void {
    const selected = this.estudiantesExistentes.find(item => item.estudianteUuid === estudianteUuid);
    this.selectedExistingStudent = !!selected;
    const personalControls = [
      this.form.controls.nombreCompleto,
      this.form.controls.fechaNacimiento,
      this.form.controls.genero,
      this.form.controls.numeroDocumento,
      this.form.controls.telefono,
      this.form.controls.email
    ];
    if (selected) {
      this.form.patchValue({
        nombreCompleto: selected.nombreCompleto ?? '',
        fechaNacimiento: this.toDateInput(selected.fechaNacimiento),
        genero: selected.genero ?? '',
        numeroDocumento: selected.numeroDocumento ?? '',
        telefono: selected.telefono ?? '',
        email: selected.email ?? ''
      });
      personalControls.forEach(control => control.enable({ emitEvent: false }));
    } else {
      this.form.patchValue({
        nombreCompleto: '', fechaNacimiento: '', genero: '',
        numeroDocumento: '', telefono: '', email: ''
      });
      personalControls.forEach(control => control.enable({ emitEvent: false }));
    }
  }

  save(): void {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.activeTab = this.form.controls.organizacionUuid.invalid || this.form.controls.fechaInscripcion.invalid
        ? 'relacion' : 'personal';
      return;
    }
    const value = this.form.getRawValue();
    const tutorUuid = value.contribuyenteUuid?.trim();
    const payload: EstudianteEscuela = {
      uuid: this.row?.uuid,
      estudianteUuid: this.row?.estudianteUuid || value.existingStudentUuid || undefined,
      nombreCompleto: value.nombreCompleto?.trim() || '',
      fechaNacimiento: value.fechaNacimiento || undefined,
      genero: value.genero || undefined,
      numeroDocumento: value.numeroDocumento?.trim() || undefined,
      telefono: value.telefono?.trim() || undefined,
      email: value.email?.trim() || undefined,
      fechaInscripcion: value.fechaInscripcion || this.today(),
      activo: this.row?.activo ?? true,
      organizacionDto: { uuid: value.organizacionUuid } as Organizacion,
      contribuyenteDto: tutorUuid ? ({ uuid: tutorUuid } as Contribuyente) : undefined
    };

    this.showLoading = true;
    const request = this.accion === 'edit'
      ? this.estudiantesService.update(payload)
      : this.estudiantesService.save(payload);
    const shouldUnlink = this.accion === 'edit' && !!this.row?.contribuyenteDto && !tutorUuid;
    const finalRequest = shouldUnlink
      ? request.pipe(switchMap(saved => this.estudiantesService.quitarResponsable(saved.uuid!)))
      : request;

    finalRequest.subscribe({
      next: saved => {
        this.showLoading = false;
        this.emitList.emit();
        this.activeModal.close(saved);
        Swal.fire({
          text: this.accion === 'edit'
            ? 'Estudiante y relación con escuela actualizados correctamente.'
            : `Estudiante registrado correctamente. Matrícula: ${saved.matricula ?? 'generada'}`,
          icon: 'success',
          confirmButtonColor: '#299cdb'
        });
      },
      error: error => {
        this.showLoading = false;
        Swal.fire({ text: error?.message || 'No se pudo guardar el estudiante', icon: 'error' });
      }
    });
  }

  close(): void {
    this.activeModal.dismiss();
  }

  tutorLabel(tutor: Contribuyente): string {
    const name = String(tutor.nombreCompleto ||
      [tutor.nombre, tutor.primerApellido, tutor.segundoApellido].filter(Boolean).join(' '));
    return tutor.numeroDocumento ? `${name} — ${tutor.numeroDocumento}` : name;
  }

  relationshipTutorLabel(relacion: EstudianteEscuela): string {
    return String(relacion.contribuyenteDto?.nombreCompleto || 'Sin tutor asignado');
  }

  existingStudentLabel(student: EstudianteEscuela): string {
    return student.numeroDocumento
      ? `${student.nombreCompleto} — ${student.numeroDocumento}`
      : String(student.nombreCompleto ?? '');
  }

  private searchExistingStudents(term: string): void {
    const search = this.normalize(term);
    if (search.length < 3) {
      this.studentSearchResults = [];
      return;
    }
    this.studentSearchResults = this.estudiantesExistentes
      .filter(student => [
        student.nombreCompleto,
        student.numeroDocumento,
        student.matricula
      ].some(value => this.normalize(value).includes(search)))
      .slice(0, 20);
  }

  private normalize(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private today(): string {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  private toDateInput(value?: Date | string): string {
    if (!value) return '';
    return typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  }
}
