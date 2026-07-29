import { Component, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, Input, Output, TemplateRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder,FormArray, FormGroup, UntypedFormBuilder,UntypedFormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators, FormControl } from '@angular/forms';
import { NgbDatepickerModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import Swal from 'sweetalert2';

import { UserService } from 'src/app/core/services/api-users/users.service';
import { EncargadoComplejo } from 'src/app/core/models/encargadoComplejo.model';
import { EncargadoService } from 'src/app/core/services/api/encargado.service';
import { ComplejosService } from 'src/app/core/services/api/conplejos.service';
import { UserRol } from 'src/app/core/constants/UserData';

@Component({
  selector: 'app-modal-employee',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbDatepickerModule,
    TranslateModule    
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './modal-employee.component.html',
  styleUrl: './modal-employee.component.scss'
})
export class ModalEmployeeComponent {
  @Input() accion!: string;
  @Input() row!: EncargadoComplejo;
  @Output() itemsList = new EventEmitter();

  contentForm!: UntypedFormGroup;
  submitted = false;
  canchasList!: any[];
  usersList!: any[];
  user: any;

  avatarOptions = [
    {
      value: 'avatar-admin-m.png',
      label: 'Administrador Masculino',
      category: 'admin',
      gender: 'M'
    },
    {
      value: 'avatar-admin-w.png',
      label: 'Administradora Femenino',
      category: 'admin',
      gender: 'F'
    },
    {
      value: 'avatar-op-m.png',
      label: 'Operador Masculino',
      category: 'operator',
      gender: 'M'
    },
    {
      value: 'avatar-op-w.png',
      label: 'Operadora Femenino',
      category: 'operator',
      gender: 'F'
    },
    {
      value: 'avatar-super-m.png',
      label: 'Supervisor Masculino',
      category: 'supervisor',
      gender: 'M'
    },
    {
      value: 'avatar-super-w.png',
      label: 'Supervisora Femenino',
      category: 'supervisor',
      gender: 'F'
    },
    {
      value: 'default-profile1.png',
      label: 'Perfil Predeterminado 1',
      category: 'default',
      gender: 'U'
    },
    {
      value: 'multi-user.jpg',
      label: 'Usuario Múltiple',
      category: 'default',
      gender: 'U'
    },
    {
      value: 'user-dummy-img.jpg',
      label: 'Usuario Genérico',
      category: 'default',
      gender: 'U'
    }
  ];

  showAvatarSelection = false;
  selectedAvatar = 'multi-user.jpg';

  constructor(
    private modalService: NgbModal,
    private usuariosService: UserService,
    private complejosService: ComplejosService,
    private encargadoCanchaService: EncargadoService,
    private formBuilder: UntypedFormBuilder,
  ) {}

  ngOnInit(): void {
    this.getUsers();
    this.getFields();
    this.initializeForm();
  }

  private initializeForm(): void {
    this.contentForm = this.formBuilder.group({
      uuid: [''],
      avatar: ['multi-user.jpg', [Validators.required]],
      userUuid: ['', [Validators.required]],
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      telefono: ['', [Validators.pattern('^\\+?[0-9]{7,15}$'), Validators.minLength(7), Validators.maxLength(15)]],
      activo: [true],
      fechaAsignacion: [new Date(), [Validators.required]],
      fechaFinAsignacion: [''],
      horaEntrada: ['', [Validators.required]],
      horaSalida: ['', [Validators.required]],
      complejoDto: new FormControl(null, [Validators.required]),
    });
    this.contentForm.setValidators(this.timeRangeValidator);
    this.formDataSet();
  }
  private timeRangeValidator = (control: AbstractControl): { [key: string]: any } | null => {
    if (!(control instanceof UntypedFormGroup)) {
      return null;
    }
    
    const horaEntrada = control.get('horaEntrada')?.value;
    const horaSalida = control.get('horaSalida')?.value;
    
    if (horaEntrada && horaSalida && horaEntrada >= horaSalida) {
      return { invalidTimeRange: true };
    }
    return null;
  }

  /**
   * Form data get
   */
  get form() {
    return this.contentForm.controls;
  }

  private formDataSet() {
    if (this.accion !== '' && this.row) {
      const fechaAsignacion = this.row.fechaAsignacion ? 
        this.formatDateForInput(this.row.fechaAsignacion) : '';
      const fechaFinAsignacion = this.row.fechaFinAsignacion ? 
        this.formatDateForInput(this.row.fechaFinAsignacion) : '';
      this.selectedAvatar = this.row.avatar || 'multi-user.jpg';
      this.contentForm.patchValue({
        uuid: this.row.uuid,
        avatar: this.selectedAvatar,
        userUuid: this.row.userUuid,
        nombre: this.row.nombre,
        telefono: this.row.telefono || '',
        activo: this.row.activo !== undefined ? this.row.activo : true,
        fechaAsignacion: fechaAsignacion,
        fechaFinAsignacion: fechaFinAsignacion,
        horaEntrada: this.row.horaEntrada || '',
        horaSalida: this.row.horaSalida || '',
        complejoDto: this.row.complejoDto
      });
    }
  }

  private formatDateForInput(date: Date | string): string {
    if (!date) return '';    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString().split('T')[0];
  }

  onUserSelectHandler(event: any) {
    const selectedUuid = event.target.value;
    const selectedUser = this.usersList.find(user => user.uuid === selectedUuid);
    if (selectedUser) {
      this.user = selectedUser;
      const suggestedAvatar = this.getSuggestedAvatar(selectedUser);
      const fullName = selectedUser.designacionFuncionarioDto?.personaDto?.fullName || 
                      selectedUser.username || '';
      this.selectedAvatar = suggestedAvatar;
      this.contentForm.patchValue({
        nombre: fullName,
        avatar: suggestedAvatar
      });
    }
  }

  private getSuggestedAvatar(user: any): string {
    const type = user.permisoDtos?.find((menu: any) => 
      menu.modulo === 'DEPORTESAPP' && menu.nombreMenu === 'Administracion') ? 0 : 1;    
    const foundItem = UserRol.find(item => item.tipo === type);
    if (foundItem) {
      const gender = user.designacionFuncionarioDto?.personaDto?.sexo;
      return gender === 'F' ? foundItem.avatarF : foundItem.avatarM;
    }
    
    return 'multi-user.jpg';
  }

  toggleAvatarSelection() {
    this.showAvatarSelection = !this.showAvatarSelection;
  }
  selectAvatar(avatar: string) {
    this.selectedAvatar = avatar;
    this.contentForm.patchValue({ avatar: avatar });
    this.showAvatarSelection = false;
  }
  getAvatarsByCategory(category: string) {
    return this.avatarOptions.filter(option => option.category === category);
  }

  getCurrentAvatarInfo() {
    return this.avatarOptions.find(option => option.value === this.selectedAvatar) || 
           { value: this.selectedAvatar, label: 'Avatar personalizado', category: 'custom' };
  }

  /* API Service functions */
  private getUsers() {
    this.usuariosService.getAllUsers().subscribe({
      next: (data: any) => {
        this.usersList = data.sort((a: any, b: any) => {
          const nameA = a.designacionFuncionarioDto?.personaDto?.fullName || a.username || '';
          const nameB = b.designacionFuncionarioDto?.personaDto?.fullName || b.username || '';
          return nameA.localeCompare(nameB);
        });
      },
      error: (error) => {
        this.notify('Error al cargar los usuarios', 'error');
      }
    });
  }

  private getFields() {
    this.complejosService.getAll().subscribe({
      next: (data: any) => {
        this.canchasList = data.sort((a: any, b: any) => 
          a.nombre.localeCompare(b.nombre));
      },
      error: (error) => {
        this.notify('Error al cargar los complejos deportivos', 'error');
      }
    });
  }

  /**
   * Save user with enhanced validation
   */
  saveData() {
    this.submitted = true;
    
    if (this.contentForm.valid) {
      this.contentForm.enable();
      if (this.contentForm.errors?.['invalidTimeRange']) {
        this.notify('La hora de entrada debe ser menor que la hora de salida', 'error');
        return;
      }
      const fechaAsignacion = this.contentForm.value.fechaAsignacion ?
        new Date(this.contentForm.value.fechaAsignacion).toISOString() : undefined;
      
      const fechaFinAsignacion = this.contentForm.value.fechaFinAsignacion ?
        new Date(this.contentForm.value.fechaFinAsignacion).toISOString() : undefined;

      let datos: EncargadoComplejo = {
        userUuid: this.contentForm.value.userUuid,
        avatar: this.selectedAvatar,
        nombre: this.contentForm.value.nombre.trim(),
        telefono: this.contentForm.value.telefono?.trim(),
        activo: this.contentForm.value.activo,
        fechaAsignacion: fechaAsignacion,
        fechaFinAsignacion: fechaFinAsignacion,
        horaEntrada: this.contentForm.value.horaEntrada,
        horaSalida: this.contentForm.value.horaSalida,
        complejoDto: this.contentForm.value.complejoDto
      };

      if (this.contentForm.get('uuid')?.value) {
        datos.uuid = this.contentForm.value.uuid;
        this.updateData(datos);
      } else {
        this.addData(datos);
      }
    } else {
      this.notify('Por favor, complete todos los campos requeridos correctamente', 'error');
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.contentForm.controls).forEach(key => {
      this.contentForm.get(key)?.markAsTouched();
    });
  }

  /* API Requests*/
  private addData(datos: EncargadoComplejo) {
    this.encargadoCanchaService.save(datos).subscribe({
      next: (data: EncargadoComplejo) => {
        this.submitted = false;
        this.notify('Encargado registrado exitosamente', 'success');
        this.closeModal();
        this.itemsList.emit();
      },
      error: (error) => {
        this.submitted = false;
        const errorMessage = error?.error?.message || error.message || 'Error desconocido';
        this.notify(`Error al registrar el encargado: ${errorMessage}`, 'error');
      }
    });
  }

  private updateData(datos: EncargadoComplejo) {
    this.encargadoCanchaService.update(datos).subscribe({
      next: (data: EncargadoComplejo) => {
        this.submitted = false;
        this.notify('Encargado actualizado exitosamente', 'success');
        this.closeModal();
        this.itemsList.emit();
      },
      error: (error) => {
        this.submitted = false;
        const errorMessage = error?.error?.message || error.message || 'Error desconocido';
        this.notify(`Error al actualizar el encargado: ${errorMessage}`, 'error');
      }
    });
  }
  deleteData(uuid:string) {
    this.encargadoCanchaService.delete(uuid).subscribe({
      next: (message: string) => {
        this.submitted = false;
        this.getUsers();
        this.notify(message || 'Encargado eliminado exitosamente', 'success');
        this.modalService.dismissAll();
      },
      error: err => {
        this.submitted = false;
        this.notify(err.message || 'No se pudo eliminar el registro!', 'error');
      }
    });
  }

  public closeModal() {
    this.accion = '';
    this.submitted = false;
    this.showAvatarSelection = false;
    this.contentForm.enable();
    this.contentForm.reset();
    this.selectedAvatar = 'multi-user.jpg';
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
      title: message,
      icon: config[type].icon,
      timer: config[type].timer,
      timerProgressBar: true,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  }
  compareComplejo(c1: any, c2: any): boolean {
    if (!c1 || !c2) {
      return c1 === c2;
    }
    if (c1.uuid && c2.uuid) {
      return c1.uuid === c2.uuid;
    }
    return c1.nombre === c2.nombre;
  }
  
  isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[0-9]{7,15}$/;
    return phoneRegex.test(phone);
  }

  formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+591')) {
      const number = cleaned.substring(4);
      if (number.length === 8) {
        return `+591 ${number.substring(0, 4)} ${number.substring(4)}`;
      }
    }
    
    return cleaned;
  }
}
