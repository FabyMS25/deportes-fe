import { Component, EventEmitter, Input, Output, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup, ValidationErrors, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { ConfiguracionSistemaService } from 'src/app/core/services/api/configuracionSistema.service';
import { CategoriaConfiguracion , AplicaAConfiguracion,UnidadMedida, 
  AdminDeportesConfig, ClaveConfiguracion, TipoValorConfiguracion, obtenerLabelConfiguracion } from 'src/app/core/constants/Configurations';


@Component({
  selector: 'app-configuracion-sistema-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './modal-system-configuration.component.html',
  styleUrl: './modal-system-configuration.component.scss'
})
export class SystemConfigurationModalComponent implements OnInit {
  @Input() accion!: string;
  @Input() row!: ConfiguracionSistema;
  @Input() categoriasList: string[] = [];
  @Input() permissions: string[] = [];
  @Output() emitList = new EventEmitter();

  contentForm!: UntypedFormGroup;
  submitted = false;
  showLoading = false;
  hasEditableFields = true;

  categorias = Object.values(CategoriaConfiguracion);
  ambitosAplicacion = Object.values(AplicaAConfiguracion);
  unidadesMedida = Object.values(UnidadMedida);
  tiposValor = Object.values(TipoValorConfiguracion);
  clavesDisponibles = Object.values(ClaveConfiguracion);
  readonly TipoValorConfiguracion = TipoValorConfiguracion;
  readonly ClaveConfiguracion = ClaveConfiguracion;
  readonly CategoriaConfiguracion = CategoriaConfiguracion;
  private readonly ambitosConReferencia: AplicaAConfiguracion[] = [
    AplicaAConfiguracion.CAMPO_DEPORTIVO,
    AplicaAConfiguracion.COMPLEJO,
    AplicaAConfiguracion.TARIFA,
    AplicaAConfiguracion.ORGANIZACION
  ];

  mostrarUnidadMedida = false;
  mostrarReferenciaUuid = false;
  tipoValorActual = TipoValorConfiguracion.TEXTO;
  adminEditorMode: 'form' | 'json' = 'form';
  adminDeportesView: AdminDeportesConfig | null = null;
  valoresPosiblesView: string[] = [];

  constructor(
    private modalService: NgbModal,
    private configuracionSistemaService: ConfiguracionSistemaService,
    private formBuilder: UntypedFormBuilder,
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.formDataSet();
    this.setupFormListeners();
    this.applyPermissionControls();
  }

  private applyPermissionControls(): void {
    if (this.accion === 'show') {
      this.contentForm.disable({ emitEvent: false });
      return;
    }

    if (this.accion === '') {
      return;
    }

    const canUpdateProtected = this.permissions.includes('ACTUALIZAR_PROTEGIDA');
    const canUpdateValue = canUpdateProtected ||
      (this.row?.modificablePorUsuario === true && this.permissions.includes('ACTUALIZAR'));
    const canUpdateControl = this.permissions.includes('ACTUALIZAR_CONTROL');
    this.hasEditableFields = canUpdateValue || canUpdateControl;
    this.contentForm.get('uuid')?.disable({ emitEvent: false });

    const valueControls = [
      'valorTexto', 'valorNumerico', 'valorBoolean', 'valorJson',
      'valorMinimo', 'valorMaximo', 'valoresPosibles',
      'adminName', 'adminRole', 'adminPhone', 'adminEmail', 'adminAddress', 'adminAvatar'
    ];
    const descriptiveControls = ['nombre', 'descripcion'];
    const controlControls = [
      'clave', 'claveCustom', 'categoria', 'unidadMedida', 'modificablePorUsuario',
      'requiereAprobacion', 'activo', 'aplicaA', 'referenciaUuid'
    ];

    if (!canUpdateValue) {
      valueControls.forEach(name =>
        this.contentForm.get(name)?.disable({ emitEvent: false })
      );
    }
    if (!canUpdateValue && !canUpdateControl) {
      descriptiveControls.forEach(name =>
        this.contentForm.get(name)?.disable({ emitEvent: false })
      );
    }
    if (!canUpdateControl) {
      controlControls.forEach(name =>
        this.contentForm.get(name)?.disable({ emitEvent: false })
      );
    }
    if (!(canUpdateValue && canUpdateControl)) {
      this.contentForm.get('tipoValor')?.disable({ emitEvent: false });
    }
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
      adminName: [''],
      adminRole: [''],
      adminPhone: [''],
      adminEmail: [''],
      adminAddress: [''],
      adminAvatar: [''],
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

    const updateClaveCustomValidators = (value: string) => {
      if (value === 'CUSTOM') {
        this.contentForm.get('claveCustom')?.setValidators([Validators.required, Validators.pattern('^[A-Z][A-Z0-9_]*$')]);
      } else {
        this.contentForm.get('claveCustom')?.clearValidators();
      }
      this.contentForm.get('claveCustom')?.updateValueAndValidity({ emitEvent: false });
    };

    this.contentForm.get('clave')?.valueChanges.subscribe(value => {
      updateClaveCustomValidators(value);
      this.applyAdminDeportesValidators(value);
    });
    updateClaveCustomValidators(this.contentForm.get('clave')?.value);
    this.applyAdminDeportesValidators(this.contentForm.get('clave')?.value);
  }

  onTipoValorChange(): void {
    const tipoValor = this.contentForm.get('tipoValor')?.value;
    this.tipoValorActual = tipoValor;
    this.mostrarUnidadMedida = tipoValor === TipoValorConfiguracion.NUMERICO;
    this.applyValueValidators(tipoValor);
    this.resetValorFields();
  }

  private applyValueValidators(tipoValor: string): void {
    const valorTexto = this.contentForm.get('valorTexto');
    const valorNumerico = this.contentForm.get('valorNumerico');
    const valorJson = this.contentForm.get('valorJson');
    const valoresPosibles = this.contentForm.get('valoresPosibles');

    valorTexto?.clearValidators();
    valorNumerico?.clearValidators();
    valorJson?.clearValidators();
    valoresPosibles?.clearValidators();

    if (tipoValor === TipoValorConfiguracion.TEXTO) {
      valorTexto?.setValidators([Validators.required]);
      valoresPosibles?.setValidators([this.optionalJsonArrayValidator]);
    }
    if (tipoValor === TipoValorConfiguracion.NUMERICO) {
      valorNumerico?.setValidators([Validators.required]);
    }
    if (tipoValor === TipoValorConfiguracion.JSON) {
      valorJson?.setValidators(
        this.isAdminDeportesSelected() && this.adminEditorMode === 'json'
          ? [Validators.required, this.adminDeportesJsonValidator]
          : !this.isAdminDeportesSelected()
            ? [Validators.required, this.jsonObjectOrArrayValidator]
            : []
      );
    }

    valorTexto?.updateValueAndValidity();
    valorNumerico?.updateValueAndValidity();
    valorJson?.updateValueAndValidity();
    valoresPosibles?.updateValueAndValidity();
  }

  onAplicaAChange(): void {
    const aplicaA = this.contentForm.get('aplicaA')?.value;
    this.mostrarReferenciaUuid = this.ambitosConReferencia.includes(aplicaA);
    
    if (!this.mostrarReferenciaUuid) {
      this.contentForm.patchValue({ referenciaUuid: '' });
    }
  }

  private resetValorFields(): void {
    this.contentForm.patchValue({
      valorTexto: '',
      valorNumerico: null,
      valorBoolean: false,
      valorJson: '',
      adminName: '',
      adminRole: '',
      adminPhone: '',
      adminEmail: '',
      adminAddress: '',
      adminAvatar: '',
      valoresPosibles: ''
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
      const clavePredefinida = this.clavesDisponibles.includes(this.row.clave as ClaveConfiguracion);
      let tipoValor = 'TEXTO';
      if (this.row.valorJson) {
        tipoValor = 'JSON';
      } else if (this.row.valorNumerico !== null && this.row.valorNumerico !== undefined) {
        tipoValor = 'NUMERICO';
      } else if (this.row.valorBoolean !== null && this.row.valorBoolean !== undefined) {
        tipoValor = 'BOOLEANO';
      }

      const adminConfig = this.row.clave === ClaveConfiguracion.ADMIN_DEPORTES
        ? this.parseAdminDeportesConfig(this.row.valorJson)
        : null;
      this.adminDeportesView = adminConfig;
      this.valoresPosiblesView = this.parsePossibleValues(this.row.valoresPosibles);

      this.contentForm.patchValue({
        uuid: this.row.uuid,
        clave: clavePredefinida ? this.row.clave : 'CUSTOM',
        claveCustom: clavePredefinida ? '' : this.row.clave,
        categoria: this.row.categoria,
        nombre: this.row.nombre,
        descripcion: this.row.descripcion || '',
        tipoValor: tipoValor,
        valorTexto: this.row.valorTexto || '',
        valorNumerico: this.row.valorNumerico,
        valorBoolean: this.row.valorBoolean !== null ? this.row.valorBoolean : false,
        valorJson: this.row.valorJson || '',
        adminName: adminConfig?.name || '',
        adminRole: adminConfig?.role || '',
        adminPhone: adminConfig?.phone || '',
        adminEmail: adminConfig?.email || '',
        adminAddress: adminConfig?.address || '',
        adminAvatar: adminConfig?.avatar || '',
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

      this.tipoValorActual = tipoValor as TipoValorConfiguracion;
      this.mostrarUnidadMedida = tipoValor === TipoValorConfiguracion.NUMERICO;
      this.applyValueValidators(tipoValor);
      this.applyAdminDeportesValidators(this.row.clave);
      this.onAplicaAChange();

      if (this.accion === 'show') {
        this.contentForm.disable();
      }
    }
  }

  getCategoriaLabel(categoria: string): string {
    return obtenerLabelConfiguracion(categoria, 'categoria');
  }

  getAmbitoAplicacionLabel(ambito: string): string {
    return obtenerLabelConfiguracion(ambito, 'aplicaA');
  }

  getUnidadMedidaLabel(unidad: string): string {
    return obtenerLabelConfiguracion(unidad, 'unidadMedida');
  }

  getTipoValorLabel(tipo: string): string {
    return obtenerLabelConfiguracion(tipo, 'tipoValor');
  }

  formatJsonField(controlName: 'valorJson' | 'valoresPosibles'): void {
    const control = this.contentForm.get(controlName);
    const value = control?.value?.trim();
    if (!value) return;

    try {
      control?.setValue(JSON.stringify(JSON.parse(value), null, 2));
    } catch {
      control?.markAsTouched();
      control?.updateValueAndValidity();
      this.notify('El JSON no tiene un formato válido', 'warning');
    }
  }

  displayJson(value: string | undefined): string {
    if (!value) return '';
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  private jsonObjectOrArrayValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value?.trim();
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      if (parsed === null || typeof parsed !== 'object') {
        return { jsonStructure: true };
      }
      return null;
    } catch {
      return { jsonInvalid: true };
    }
  }

  private optionalJsonArrayValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value?.trim();
    if (!value) return null;
    try {
      return Array.isArray(JSON.parse(value)) ? null : { jsonArray: true };
    } catch {
      return { jsonInvalid: true };
    }
  }

  private isAdminDeportesSelected(): boolean {
    return this.contentForm.get('clave')?.value === ClaveConfiguracion.ADMIN_DEPORTES;
  }

  private applyAdminDeportesValidators(clave: string): void {
    const controls = ['adminName', 'adminRole', 'adminPhone', 'adminEmail', 'adminAddress', 'adminAvatar'];
    controls.forEach(name => this.contentForm.get(name)?.clearValidators());

    if (clave === ClaveConfiguracion.ADMIN_DEPORTES && this.adminEditorMode === 'form') {
      this.contentForm.get('adminName')?.setValidators([Validators.required, Validators.maxLength(150)]);
      this.contentForm.get('adminRole')?.setValidators([Validators.maxLength(100)]);
      this.contentForm.get('adminPhone')?.setValidators([
        Validators.maxLength(25),
        Validators.pattern(/^[0-9+()\-\s]*$/)
      ]);
      this.contentForm.get('adminEmail')?.setValidators([Validators.email, Validators.maxLength(150)]);
      this.contentForm.get('adminAddress')?.setValidators([Validators.maxLength(300)]);
      this.contentForm.get('adminAvatar')?.setValidators([Validators.maxLength(255)]);
    }

    if (clave === ClaveConfiguracion.ADMIN_DEPORTES) {
      this.contentForm.get('tipoValor')?.setValue(TipoValorConfiguracion.JSON, { emitEvent: false });
      this.tipoValorActual = TipoValorConfiguracion.JSON;
    }
    this.applyValueValidators(this.contentForm.get('tipoValor')?.value);

    controls.forEach(name => this.contentForm.get(name)?.updateValueAndValidity({ emitEvent: false }));
  }

  private parseAdminDeportesConfig(value?: string): AdminDeportesConfig | null {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as AdminDeportesConfig
        : null;
    } catch {
      return null;
    }
  }

  private parsePossibleValues(value?: string): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(item => String(item)) : [];
    } catch {
      return [];
    }
  }

  setAdminEditorMode(mode: 'form' | 'json'): void {
    if (mode === this.adminEditorMode) return;

    if (mode === 'json') {
      const formData = this.contentForm.getRawValue();
      this.contentForm.get('valorJson')?.setValue(
        JSON.stringify(this.buildAdminDeportesConfig(formData), null, 2)
      );
      this.adminEditorMode = 'json';
      this.applyAdminDeportesValidators(ClaveConfiguracion.ADMIN_DEPORTES);
      return;
    }

    const jsonControl = this.contentForm.get('valorJson');
    jsonControl?.setValidators([Validators.required, this.adminDeportesJsonValidator]);
    jsonControl?.updateValueAndValidity({ emitEvent: false });
    if (jsonControl?.invalid) {
      jsonControl.markAsTouched();
      this.notify('Corrija el JSON de contacto antes de cambiar al formulario', 'warning');
      return;
    }

    const config = this.parseAdminDeportesConfig(jsonControl?.value);
    if (!config) return;
    this.contentForm.patchValue({
      adminName: config.name,
      adminRole: config.role || '',
      adminPhone: config.phone || '',
      adminEmail: config.email || '',
      adminAddress: config.address || '',
      adminAvatar: config.avatar || ''
    });
    this.adminEditorMode = 'form';
    this.applyAdminDeportesValidators(ClaveConfiguracion.ADMIN_DEPORTES);
  }

  private adminDeportesJsonValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value?.trim();
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      const allowedFields = ['name', 'role', 'phone', 'email', 'address', 'avatar'];
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { adminStructure: true };
      }
      if (Object.keys(parsed).some(key => !allowedFields.includes(key))) {
        return { adminFields: true };
      }
      if (typeof parsed.name !== 'string' || !parsed.name.trim()) {
        return { adminName: true };
      }
      if (allowedFields.slice(1).some(key => parsed[key] !== undefined && typeof parsed[key] !== 'string')) {
        return { adminTypes: true };
      }
      if (parsed.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.email)) {
        return { adminEmail: true };
      }
      if (parsed.phone && !/^[0-9+()\-\s]*$/.test(parsed.phone)) {
        return { adminPhone: true };
      }
      return null;
    } catch {
      return { jsonInvalid: true };
    }
  }

  private buildAdminDeportesConfig(formData: any): AdminDeportesConfig {
    const config: AdminDeportesConfig = { name: formData.adminName.trim() };
    const optionalFields: Array<[keyof AdminDeportesConfig, string]> = [
      ['role', formData.adminRole],
      ['phone', formData.adminPhone],
      ['email', formData.adminEmail],
      ['address', formData.adminAddress],
      ['avatar', formData.adminAvatar]
    ];
    optionalFields.forEach(([key, value]) => {
      const normalized = value?.trim();
      if (normalized) config[key] = normalized;
    });
    return config;
  }

  /**
   * Save configuration
   */
  saveData() {
    this.submitted = true;
    
    if (this.contentForm.valid) {
      this.showLoading = true;
      const formData = this.contentForm.getRawValue();
      const claveFinal = formData.clave === 'CUSTOM' ? formData.claveCustom : formData.clave;
      const tipoValor = formData.tipoValor;
      const valorJson = claveFinal === ClaveConfiguracion.ADMIN_DEPORTES
        ? this.adminEditorMode === 'json'
          ? JSON.stringify(JSON.parse(formData.valorJson))
          : JSON.stringify(this.buildAdminDeportesConfig(formData))
        : tipoValor === TipoValorConfiguracion.JSON
          ? JSON.stringify(JSON.parse(formData.valorJson))
          : undefined;

      let datos: ConfiguracionSistema = {
        clave: claveFinal,
        categoria: formData.categoria,
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion?.trim() || undefined,
        valorTexto: tipoValor === TipoValorConfiguracion.TEXTO ? formData.valorTexto?.trim() || undefined : undefined,
        valorNumerico: tipoValor === TipoValorConfiguracion.NUMERICO && formData.valorNumerico !== null ? Number(formData.valorNumerico) : undefined,
        valorBoolean: tipoValor === TipoValorConfiguracion.BOOLEANO ? Boolean(formData.valorBoolean) : undefined,
        valorJson,
        unidadMedida: tipoValor === TipoValorConfiguracion.NUMERICO ? formData.unidadMedida?.trim() || undefined : undefined,
        valorMinimo: tipoValor === TipoValorConfiguracion.NUMERICO && formData.valorMinimo !== null ? Number(formData.valorMinimo) : undefined,
        valorMaximo: tipoValor === TipoValorConfiguracion.NUMERICO && formData.valorMaximo !== null ? Number(formData.valorMaximo) : undefined,
        valoresPosibles: tipoValor === TipoValorConfiguracion.TEXTO && formData.valoresPosibles?.trim()
          ? JSON.stringify(JSON.parse(formData.valoresPosibles))
          : undefined,
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

  deactivateData(uuid: string) {
    this.submitted = true;
    this.configuracionSistemaService.desactivar(uuid).subscribe({
      next: () => {
        this.submitted = false;
        this.notify('Configuración anulada exitosamente', 'success');
        this.modalService.dismissAll();
        this.emitList.emit();
      },
      error: () => {
        this.submitted = false;
        this.notify('No se pudo anular la configuración', 'error');
      }
    });
  }

  public closeModal() {
    this.submitted = false;
    this.showLoading = false;
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
