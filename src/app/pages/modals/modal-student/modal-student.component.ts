import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { EstudianteEscuela } from 'src/app/core/models/EstudianteEscuela.model';
import { Organizacion } from 'src/app/core/models/organizacion.model';
import { EstudianteEscuelaService } from 'src/app/core/services/api/estudianteEscuela.service';

@Component({
  selector: 'app-modal-student',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgSelectModule],
  templateUrl: './modal-student.component.html',
  styleUrl: './modal-student.component.scss'
})
export class ModalStudentComponent implements OnInit, OnDestroy {
  @Input() accion: '' | 'edit' | 'show' = '';
  @Input() row?: EstudianteEscuela;
  @Input() escuelas: Organizacion[] = [];
  @Input() tutores: Contribuyente[] = [];
  @Input() estudiantesExistentes: EstudianteEscuela[] = [];
  @Output() emitList = new EventEmitter<void>();

  submitted = false;
  showLoading = false;
  selectedExistingStudent = false;
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
    }
    if (this.accion === 'show') this.form.disable({ emitEvent: false });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
      personalControls.forEach(control => control.disable({ emitEvent: false }));
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
            ? 'Estudiante e inscripción actualizados correctamente.'
            : `Estudiante inscrito correctamente. Matrícula: ${saved.matricula ?? 'generada'}`,
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
