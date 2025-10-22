import { Component, EventEmitter, Input, Output, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, UntypedFormBuilder, UntypedFormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { ConfiguracionSistemaService } from 'src/app/core/services/api/configuracionSistema.service';
import { CategoriaConfiguracion , AplicaAConfiguracion,UnidadMedida, 
  ClaveConfiguracion, TipoValorConfiguracion,EstadoControlConfiguracion } from 'src/app/core/constants/Configurations';


@Component({
  selector: 'app-configuracion-sistema-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent implements OnInit {
  @Input() accion!: string;
  @Input() row!: ConfiguracionSistema;
  @Input() categoriasList: string[] = [];
  @Output() emitList = new EventEmitter();

  contentForm!: UntypedFormGroup;
  submitted = false;
  showLoading = false;

  categorias = Object.values(CategoriaConfiguracion);
  ambitosAplicacion = Object.values(AplicaAConfiguracion);
  unidadesMedida = Object.values(UnidadMedida);
  tiposValor = Object.values(TipoValorConfiguracion);
  clavesDisponibles = Object.values(ClaveConfiguracion);

  mostrarUnidadMedida = false;
  mostrarReferenciaUuid = false;

  constructor(
    private modalService: NgbModal,
    private configuracionSistemaService: ConfiguracionSistemaService,
    private formBuilder: UntypedFormBuilder,
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.formDataSet();
    this.setupFormListeners();
  }

  private initializeForm(): void {
    this.contentForm = this.formBuilder.group({
      uuid: [''],
      clave: ['', [Validators.required]],
      claveCustom: [''],
      categoria: ['', [Validators.required]],
      nombre: ['', [Validators.required, Validators.maxLength(200)]],
      descripcion: ['', [Validators.maxLength(500)]],
      tipoValor: ['', [Validators.required]],
      valorTexto: [''],
      valorNumerico: [null],
      valorBoolean: [false],
      valorJson: [''],
      unidadMedida: [''],
      valorMinimo: [null],
      valorMaximo: [null],
      valoresPosibles: [''],
      modificablePorUsuario: [false],
      requiereAprobacion: [false],
      activo: [true],
      aplicaA: ['global', [Validators.required]],
      referenciaUuid: ['']
    });
  }

  private setupFormListeners(): void {
    this.contentForm.get('tipoValor')?.valueChanges.subscribe(value => {
      this.onTipoValorChange();
    });
    this.contentForm.get('aplicaA')?.valueChanges.subscribe(value => {
      this.onAplicaAChange();
    });

    this.contentForm.get('clave')?.valueChanges.subscribe(value => {
      if (value === 'CUSTOM') {
        this.contentForm.get('claveCustom')?.setValidators([Validators.required, Validators.pattern('^[A-Z][A-Z0-9_]*$')]);
      } else {
        this.contentForm.get('claveCustom')?.clearValidators();
      }
      this.contentForm.get('claveCustom')?.updateValueAndValidity();
    });
  }

  onTipoValorChange(): void {
    const tipoValor = this.contentForm.get('tipoValor')?.value;
    this.mostrarUnidadMedida = tipoValor === 'NUMERICO';
    this.resetValorFields();
  }

  onAplicaAChange(): void {
    const aplicaA = this.contentForm.get('aplicaA')?.value;
    this.mostrarReferenciaUuid = aplicaA !== 'global';
    
    if (!this.mostrarReferenciaUuid) {
      this.contentForm.patchValue({ referenciaUuid: '' });
    }
  }

  private resetValorFields(): void {
    this.contentForm.patchValue({
      valorTexto: '',
      valorNumerico: null,
      valorBoolean: false,
      valorJson: ''
    });
  }

  /**
   * Form data get
   */
  get form() {
    return this.contentForm.controls;
  }

  private formDataSet() {
    if (this.accion !== '' && this.row) {
      let tipoValor = 'TEXTO';
      if (this.row.valorNumerico !== null && this.row.valorNumerico !== undefined) {
        tipoValor = 'NUMERICO';
      } else if (this.row.valorBoolean !== null && this.row.valorBoolean !== undefined) {
        tipoValor = 'BOOLEANO';
      } else if (this.row.valorJson) {
        tipoValor = 'JSON';
      }

      this.contentForm.patchValue({
        uuid: this.row.uuid,
        clave: this.row.clave,
        categoria: this.row.categoria,
        nombre: this.row.nombre,
        descripcion: this.row.descripcion || '',
        tipoValor: tipoValor,
        valorTexto: this.row.valorTexto || '',
        valorNumerico: this.row.valorNumerico,
        valorBoolean: this.row.valorBoolean !== null ? this.row.valorBoolean : false,
        valorJson: this.row.valorJson || '',
        unidadMedida: this.row.unidadMedida || '',
        valorMinimo: this.row.valorMinimo,
        valorMaximo: this.row.valorMaximo,
        valoresPosibles: this.row.valoresPosibles || '',
        modificablePorUsuario: this.row.modificablePorUsuario !== undefined ? this.row.modificablePorUsuario : false,
        requiereAprobacion: this.row.requiereAprobacion !== undefined ? this.row.requiereAprobacion : false,
        activo: this.row.activo !== undefined ? this.row.activo : true,
        aplicaA: this.row.aplicaA || 'global',
        referenciaUuid: this.row.referenciaUuid || ''
      });

      this.onTipoValorChange();
      this.onAplicaAChange();

      if (this.accion === 'show') {
        this.contentForm.disable();
      }
    }
  }

  // Métodos de ayuda para mostrar labels en el template
  getCategoriaLabel(categoria: string): string {
    const labels: { [key: string]: string } = {
      'PAYMENT': 'Pagos',
      'ANTICIPATION': 'Anticipación',
      'DURATION': 'Duración',
      'SLA': 'SLA',
      'TIMEOUT': 'Timeouts',
      'RECURRENT': 'Recurrentes',
      'RUAT': 'RUAT',
      'LIMITS': 'Límites',
      'NOTIFICATION': 'Notificaciones',
      'FINANCIAL': 'Financiero',
      'SANCTIONS': 'Sanciones',
      'FEATURES': 'Funcionalidades'
    };
    return labels[categoria] || categoria;
  }

  getAmbitoAplicacionLabel(ambito: string): string {
    const labels: { [key: string]: string } = {
      'global': 'Global',
      'campo_deportivo': 'Campo Deportivo',
      'complejo': 'Complejo',
      'tarifa': 'Tarifa',
      'usuario': 'Usuario',
      'organizacion': 'Organización'
    };
    return labels[ambito] || ambito;
  }

  getUnidadMedidaLabel(unidad: string): string {
    const labels: { [key: string]: string } = {
      'horas': 'Horas',
      'dias': 'Días',
      'minutos': 'Minutos',
      'segundos': 'Segundos',
      'meses': 'Meses',
      'bolivianos': 'Bolivianos',
      'porcentaje': 'Porcentaje',
      'cantidad': 'Cantidad',
      'personas': 'Personas',
      'dia_mes': 'Día del Mes',
      'intentos': 'Intentos'
    };
    return labels[unidad] || unidad;
  }

  getTipoValorLabel(tipo: string): string {
    const labels: { [key: string]: string } = {
      'NUMERICO': 'Numérico',
      'TEXTO': 'Texto',
      'BOOLEANO': 'Boolean',
      'JSON': 'JSON'
    };
    return labels[tipo] || tipo;
  }

  /**
   * Save configuration
   */
  saveData() {
    this.submitted = true;
    
    if (this.contentForm.valid) {
      this.showLoading = true;
      const formData = this.contentForm.value;
      const claveFinal = formData.clave === 'CUSTOM' ? formData.claveCustom : formData.clave;

      let datos: ConfiguracionSistema = {
        clave: claveFinal,
        categoria: formData.categoria,
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion?.trim() || undefined,
        // tipoValor: formData.tipoValor,
        valorTexto: formData.valorTexto?.trim() || undefined,
        valorNumerico: formData.valorNumerico !== null ? Number(formData.valorNumerico) : undefined,
        valorBoolean: formData.valorBoolean !== null ? Boolean(formData.valorBoolean) : undefined,
        valorJson: formData.valorJson?.trim() || undefined,
        unidadMedida: formData.unidadMedida?.trim() || undefined,
        valorMinimo: formData.valorMinimo !== null ? Number(formData.valorMinimo) : undefined,
        valorMaximo: formData.valorMaximo !== null ? Number(formData.valorMaximo) : undefined,
        valoresPosibles: formData.valoresPosibles?.trim() || undefined,
        modificablePorUsuario: formData.modificablePorUsuario,
        requiereAprobacion: formData.requiereAprobacion,
        activo: formData.activo,
        aplicaA: formData.aplicaA,
        referenciaUuid: formData.referenciaUuid?.trim() || undefined
      };

      if (formData.uuid) {
        datos.uuid = formData.uuid;
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

  /* API Requests */
  private addData(datos: ConfiguracionSistema) {
    this.configuracionSistemaService.save(datos).subscribe({
      next: (data: any) => {
        this.showLoading = false;
        this.submitted = false;
        this.notify('Configuración registrada exitosamente', 'success');
        this.closeModal();
        this.emitList.emit();
      },
      error: (error) => {
        this.showLoading = false;
        this.submitted = false;
        const errorMessage = error?.error?.message || error.message || 'Error desconocido';
        this.notify(`Error al registrar la configuración: ${errorMessage}`, 'error');
      }
    });
  }

  private updateData(datos: ConfiguracionSistema) {
    this.configuracionSistemaService.update(datos).subscribe({
      next: (data: any) => {
        this.showLoading = false;
        this.submitted = false;
        this.notify('Configuración actualizada exitosamente', 'success');
        this.closeModal();
        this.emitList.emit();
      },
      error: (error) => {
        this.showLoading = false;
        this.submitted = false;
        const errorMessage = error?.error?.message || error.message || 'Error desconocido';
        this.notify(`Error al actualizar la configuración: ${errorMessage}`, 'error');
      }
    });
  }

  deleteData(uuid: string) {
    this.configuracionSistemaService.delete(uuid).subscribe({
      next: (data: any) => {
        this.submitted = false;
        if (data['status'] === 'OK') {
          this.notify(data.payload, 'success');
          this.modalService.dismissAll();
          this.emitList.emit();
          this.closeModal();
        }
      },
      error: err => {
        this.submitted = false;
        this.notify('No se pudo eliminar el registro!', 'error');
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