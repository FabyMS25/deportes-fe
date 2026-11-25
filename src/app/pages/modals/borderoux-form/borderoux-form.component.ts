import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ReservaBorderouxService } from 'src/app/core/services/api/reserva-borderoux.service';
import { RuatRequestsService } from 'src/app/core/services/ruatRequest.service';
import { Organizacion } from 'src/app/core/models/organizacion.model';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { Categoria } from 'src/app/core/models/categoria.model';
import { ClasificadorRuat } from 'src/app/core/models/clasificadorRuat.model';
import { Contribuyente } from 'src/app/core/models/contribuyente.model';
import { BorderouxPorcentajePreset, ReservaBorderoux } from 'src/app/core/models/reservaBorderoux.model';
import { EstadoReserva, EstadoValidacion } from 'src/app/core/constants/Estados';

interface TalonarioForm {
  serieTalonario: string;
  precioBoleta: number | null;
  numeroInicial: number | null;
  numeroFinal: number | null;
  cantidadAnuladas: number | null;
}

interface ActividadForm {
  fechaActividad: string;
  campoUuid: string;
  categoriaUuid: string;
  observaciones: string;
  talonarios: TalonarioForm[];
}

@Component({
  selector: 'app-borderoux-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './borderoux-form.component.html',
  styleUrls: ['./borderoux-form.component.scss']
})
export class BorderouxFormComponent implements OnInit {
  @Input() mode: 'create' | 'view' = 'create';
  @Input() reserva?: ReservaBorderoux;
  @Input() escuelasList: Organizacion[] = [];
  @Input() camposList: CampoDeportivo[] = [];
  @Input() categoriasList: Categoria[] = [];
  @Input() presets: BorderouxPorcentajePreset[] = [];
  @Input() contribuyente?: Contribuyente;

  isLoading = false;
  organizacionUuid = '';
  responsableUuid = '';
  porcentaje: number | null = null;
  actividades: ActividadForm[] = [];
  private clasificadorBorderoux?: ClasificadorRuat;

  constructor(
    public activeModal: NgbActiveModal,
    private authService: AuthenticationService,
    private reservaBorderouxService: ReservaBorderouxService,
    private ruatService: RuatRequestsService
  ) {}

  ngOnInit(): void {
    if (this.mode === 'view') {
      this.cargarDesdeReserva();
      return;
    }

    this.actividades = [this.nuevaActividad()];
    if (this.esContribuyente) {
      this.responsableUuid = this.contribuyente?.uuid || '';
    }
    if (this.escuelasList.length === 1) {
      this.onOrganizacionChange(this.escuelasList[0].uuid || '');
    }
  }

  get esContribuyente(): boolean {
    return this.authService.getUserRole() === 'Contribuyente';
  }

  get soloLectura(): boolean {
    return this.mode === 'view';
  }

  get organizacionSeleccionada(): Organizacion | undefined {
    return this.escuelasList.find(org => org.uuid === this.organizacionUuid);
  }

  get responsableNombre(): string {
    if (this.soloLectura) {
      const contribuyente = this.reserva?.contribuyenteDto;
      return String(contribuyente?.nombreCompleto || contribuyente?.nombre || '-');
    }
    const responsable = this.representantesDisponibles.find(rep => rep.uuid === this.responsableUuid);
    return String(responsable?.nombreCompleto || '');
  }

  get representantesDisponibles(): Contribuyente[] {
    const org = this.organizacionSeleccionada;
    const reps = (org?.representantesDto || [])
      .map(rep => rep.contribuyenteDto)
      .filter((rep): rep is Contribuyente => !!rep && !!rep.uuid);
    if (this.esContribuyente && this.contribuyente?.uuid
        && !reps.some(rep => rep.uuid === this.contribuyente?.uuid)) {
      reps.unshift(this.contribuyente);
    }
    return reps;
  }

  get responsableSeleccionado(): Contribuyente | undefined {
    return this.representantesDisponibles.find(rep => rep.uuid === this.responsableUuid);
  }

  /** Internal staff can enter an exceptional rate; taxpayers select a configured rate. */
  get puedeEditarPorcentaje(): boolean {
    return !this.esContribuyente;
  }

  get porcentajesDisponibles(): BorderouxPorcentajePreset[] {
    if (!this.esContribuyente) return this.presets;
    const tipo = this.organizacionSeleccionada?.tipoOrganizacion;
    return this.presets.filter(preset => !preset.tipoOrganizacion || preset.tipoOrganizacion === tipo);
  }

  onOrganizacionChange(uuid: string): void {
    this.organizacionUuid = uuid;
    const org = this.organizacionSeleccionada;

    if (this.esContribuyente) {
      this.responsableUuid = this.contribuyente?.uuid || '';
    } else {
      this.responsableUuid = this.representantesDisponibles[0]?.uuid || '';
    }

    if (org && (this.porcentaje === null || this.porcentaje === undefined)) {
      const preset = this.presets.find(item =>
        !!item.tipoOrganizacion && item.tipoOrganizacion === org.tipoOrganizacion);
      if (preset) {
        this.porcentaje = Number(preset.porcentaje);
      }
    }
  }

  seleccionarPorcentaje(preset: BorderouxPorcentajePreset): void {
    if (this.soloLectura) return;
    this.porcentaje = Number(preset.porcentaje);
  }

  nuevaActividad(): ActividadForm {
    return {
      fechaActividad: '',
      campoUuid: '',
      categoriaUuid: '',
      observaciones: '',
      talonarios: [this.nuevoTalonario()]
    };
  }

  nuevoTalonario(): TalonarioForm {
    return { serieTalonario: '', precioBoleta: null, numeroInicial: null, numeroFinal: null, cantidadAnuladas: 0 };
  }

  agregarActividad(): void {
    if (this.soloLectura) return;
    this.actividades.push(this.nuevaActividad());
  }

  quitarActividad(index: number): void {
    if (this.soloLectura) return;
    this.actividades.splice(index, 1);
    if (!this.actividades.length) {
      this.actividades.push(this.nuevaActividad());
    }
  }

  agregarTalonario(actividad: ActividadForm): void {
    if (this.soloLectura) return;
    actividad.talonarios.push(this.nuevoTalonario());
  }

  quitarTalonario(actividad: ActividadForm, index: number): void {
    if (this.soloLectura) return;
    actividad.talonarios.splice(index, 1);
    if (!actividad.talonarios.length) {
      actividad.talonarios.push(this.nuevoTalonario());
    }
  }

  cantidad(talonario: TalonarioForm): number {
    const inicial = Number(talonario.numeroInicial);
    const final = Number(talonario.numeroFinal);
    if (!Number.isFinite(inicial) || !Number.isFinite(final) || final < inicial) {
      return 0;
    }
    return final - inicial + 1;
  }

  cantidadVendida(talonario: TalonarioForm): number {
    const anuladas = Number(talonario.cantidadAnuladas);
    if (!Number.isInteger(anuladas) || anuladas < 0) return 0;
    return Math.max(0, this.cantidad(talonario) - anuladas);
  }

  totalBoletas(talonario: TalonarioForm): number {
    const precio = Number(talonario.precioBoleta);
    if (!Number.isFinite(precio) || precio < 0) return 0;
    return this.redondear(precio * this.cantidadVendida(talonario));
  }

  montoBorderoux(talonario: TalonarioForm): number {
    const porcentaje = Number(this.porcentaje);
    if (!Number.isFinite(porcentaje) || porcentaje <= 0) return 0;
    return this.redondear(this.totalBoletas(talonario) * porcentaje / 100);
  }

  subtotalActividad(actividad: ActividadForm): number {
    return this.redondear(
      actividad.talonarios.reduce((total, talonario) => total + this.montoBorderoux(talonario), 0)
    );
  }

  get totalBoletasLiquidacion(): number {
    return this.redondear(
      this.actividades.reduce((total, actividad) =>
        total + actividad.talonarios.reduce((suma, talonario) =>
          suma + this.totalBoletas(talonario), 0), 0)
    );
  }

  get totalLiquidacion(): number {
    return this.redondear(
      this.actividades.reduce((total, actividad) => total + this.subtotalActividad(actividad), 0)
    );
  }

  get cantidadVendidaLiquidacion(): number {
    return this.actividades.reduce((total, actividad) =>
      total + actividad.talonarios.reduce((suma, talonario) => suma + this.cantidadVendida(talonario), 0), 0);
  }

  get puedeGuardar(): boolean {
    return !this.soloLectura && this.validar() === null;
  }

  async guardar(): Promise<void> {
    if (this.soloLectura || this.isLoading) return;

    const error = this.validar();
    if (error) {
      Swal.fire({
        title: 'Revise la liquidación',
        text: error,
        icon: 'warning',
        confirmButtonColor: '#299cdb'
      });
      return;
    }

    this.isLoading = true;
    try {
      const clasificador = await this.obtenerClasificadorBorderoux();
      // Primero se emite la tasa en RUAT; sólo con la tasa confirmada se
      // registra la liquidación y sus actividades.
      const numeroTasa = await this.createTasaInRuat(clasificador);
      const reserva = await this.saveReserva(
        this.construirPayload(numeroTasa, clasificador.uuid)
      );

      this.isLoading = false;
      await Swal.fire({
        title: 'Liquidación Borderoux registrada',
        html: `Número de reserva: <strong>${reserva?.numeroReserva || ''}</strong><br>
               Monto a liquidar: <strong>${this.formatearMonto(this.totalLiquidacion)} Bs.</strong>`,
        icon: 'success',
        confirmButtonColor: '#299cdb'
      });
      this.activeModal.close(reserva);
    } catch (error: any) {
      this.isLoading = false;
      Swal.fire({
        title: 'No se pudo registrar la liquidación',
        text: error?.message || 'Error al registrar la liquidación Borderoux',
        icon: 'error',
        confirmButtonColor: '#299cdb'
      });
    }
  }

  formatearMonto(valor: number | null | undefined): string {
    return new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(valor) || 0);
  }

  private validar(): string | null {
    if (!this.organizacionUuid) {
      return 'Seleccione la organización a la que corresponde la liquidación.';
    }
    if (!this.responsableUuid) {
      return 'Seleccione el contribuyente responsable de la liquidación.';
    }
    const porcentaje = Number(this.porcentaje);
    if (!Number.isFinite(porcentaje) || porcentaje <= 0 || porcentaje > 100) {
      return 'El porcentaje Borderoux debe ser mayor a 0 y menor o igual a 100.';
    }
    if (this.esContribuyente && !this.porcentajesDisponibles.some(item => Number(item.porcentaje) === porcentaje)) {
      return 'Seleccione uno de los porcentajes Borderoux habilitados para su organización.';
    }
    if (!this.actividades.length) {
      return 'Registre al menos una actividad.';
    }

    for (let i = 0; i < this.actividades.length; i++) {
      const actividad = this.actividades[i];
      if (!actividad.fechaActividad) {
        return `La actividad ${i + 1} requiere una fecha.`;
      }
      if (!actividad.campoUuid) {
        return `La actividad ${i + 1} requiere un campo deportivo.`;
      }
      if (!actividad.talonarios.length) {
        return `La actividad ${i + 1} requiere al menos un talonario.`;
      }
      for (let j = 0; j < actividad.talonarios.length; j++) {
        const talonario = actividad.talonarios[j];
        const precio = Number(talonario.precioBoleta);
        const inicial = Number(talonario.numeroInicial);
        const final = Number(talonario.numeroFinal);
        const anuladas = Number(talonario.cantidadAnuladas);
        if (!Number.isFinite(precio) || talonario.precioBoleta === null || precio < 0) {
          return `El precio de boleta del talonario ${j + 1} de la actividad ${i + 1} es requerido y no puede ser negativo.`;
        }
        if (!Number.isFinite(inicial) || talonario.numeroInicial === null || inicial < 0
            || !Number.isFinite(final) || talonario.numeroFinal === null || final < 0) {
          return `El rango del talonario ${j + 1} de la actividad ${i + 1} es requerido.`;
        }
        if (!Number.isInteger(anuladas) || talonario.cantidadAnuladas === null || anuladas < 0) {
          return `Las boletas anuladas del talonario ${j + 1} de la actividad ${i + 1} deben ser un entero igual o mayor a cero.`;
        }
        if (anuladas > this.cantidad(talonario)) {
          return `Las boletas anuladas del talonario ${j + 1} de la actividad ${i + 1} no pueden superar el rango declarado.`;
        }
        if (final < inicial) {
          return `El número final del talonario ${j + 1} de la actividad ${i + 1} no puede ser menor al inicial.`;
        }
      }
    }
    return null;
  }

  private construirPayload(numeroTasa: string, clasificadorRuatId?: string): ReservaBorderoux {
    return {
      estadoValidacion: EstadoValidacion.APROBADA,
      estadoReserva: EstadoReserva.PENDIENTE,
      numeroTasa,
      clasificadorRuatId: clasificadorRuatId || null,
      montoTotal: this.totalLiquidacion,
      organizacionDto: { uuid: this.organizacionUuid },
      contribuyenteDto: { uuid: this.responsableUuid },
      borderouxActividadesDtoList: this.actividades.map(actividad => ({
        fechaActividad: actividad.fechaActividad,
        porcentajeAplicado: Number(this.porcentaje),
        categoriaDeportivaDto: actividad.categoriaUuid ? { uuid: actividad.categoriaUuid } : null,
        observaciones: actividad.observaciones?.trim() || null,
        campoDeportivoDto: { uuid: actividad.campoUuid },
        talonariosDtoList: actividad.talonarios.map(talonario => ({
          precioBoleta: Number(talonario.precioBoleta),
          numeroInicial: Number(talonario.numeroInicial),
          numeroFinal: Number(talonario.numeroFinal),
          serieTalonario: talonario.serieTalonario?.trim() || null,
          cantidadAnuladas: Number(talonario.cantidadAnuladas)
        }))
      }))
    };
  }

  /**
   * Clasificador RUAT por defecto de las liquidaciones Borderoux. Se obtiene
   * del catálogo del backend para no duplicar el código en el frontend.
   */
  private async obtenerClasificadorBorderoux(): Promise<ClasificadorRuat> {
    if (this.clasificadorBorderoux?.uuid
        && this.clasificadorBorderoux.codigo
        && this.clasificadorBorderoux.tipoArancel) {
      return this.clasificadorBorderoux;
    }
    try {
      this.clasificadorBorderoux = await firstValueFrom(
        this.reservaBorderouxService.getClasificador()
      );
    } catch (error: any) {
      throw new Error(
        error?.message || 'No se pudo obtener el clasificador RUAT de liquidaciones Borderoux.'
      );
    }
    if (!this.clasificadorBorderoux?.uuid
        || !this.clasificadorBorderoux.codigo
        || !this.clasificadorBorderoux.tipoArancel) {
      throw new Error('El clasificador RUAT de liquidaciones Borderoux no está configurado correctamente.');
    }
    return this.clasificadorBorderoux;
  }

  private createTasaInRuat(clasificador: ClasificadorRuat): Promise<string> {
    return new Promise((resolve, reject) => {
      const responsable = this.responsableSeleccionado;

      if (!responsable?.codigoContribuyente) {
        reject(new Error('El contribuyente responsable no tiene código RUAT registrado.'));
        return;
      }

      if (!clasificador.codigo || !clasificador.tipoArancel) {
        reject(new Error('El clasificador RUAT de liquidaciones Borderoux no está configurado correctamente.'));
        return;
      }

      const monto = this.totalLiquidacion;
      if (!(monto > 0)) {
        reject(new Error('La liquidación debe tener un monto mayor a cero para registrar la tasa.'));
        return;
      }

      const observacion =
        `Liquidación Borderoux ${this.organizacionSeleccionada?.nombre || ''}`.trim();

      this.ruatService.createTasa({
        datosConcepto: [{
          codigoClasificador: clasificador.codigo,
          tipoArancel: clasificador.tipoArancel,
          monto: monto.toFixed(2)
        }],
        observacion
      }, responsable.codigoContribuyente.trim()).subscribe({
        next: (response: any) => {
          const datos = this.ruatService.getResponseData(response);
          if (!this.ruatService.canContinue(response) || !datos?.numeroTasa) {
            reject(new Error(
              this.ruatService.getResponseMessage(response, 'RUAT no devolvió un número de tasa válido.')
            ));
            return;
          }
          resolve(String(datos.numeroTasa));
        },
        error: (error) => {
          reject(new Error(
            this.ruatService.getResponseMessage(error, 'Error de conexión con RUAT.')
          ));
        }
      });
    });
  }

  private saveReserva(payload: ReservaBorderoux): Promise<ReservaBorderoux> {
    return new Promise((resolve, reject) => {
      this.reservaBorderouxService.create(payload).subscribe({
        next: (reserva) => resolve(reserva),
        error: (error) => reject(new Error(
          error?.error?.message ||
          error?.error?.payload ||
          error?.message ||
          'No se pudo registrar la liquidación Borderoux.'
        ))
      });
    });
  }

  private cargarDesdeReserva(): void {
    const reserva = this.reserva;
    this.organizacionUuid = reserva?.organizacionDto?.uuid || '';
    this.responsableUuid = reserva?.contribuyenteDto?.uuid || '';
    this.porcentaje = reserva?.borderouxActividadesDtoList?.[0]?.porcentajeAplicado ?? null;
    this.actividades = (reserva?.borderouxActividadesDtoList || []).map(actividad => ({
      fechaActividad: this.normalizarFecha(actividad.fechaActividad),
      campoUuid: actividad.campoDeportivoDto?.uuid || '',
      categoriaUuid: actividad.categoriaDeportivaDto?.uuid || '',
      observaciones: actividad.observaciones || '',
      talonarios: (actividad.talonariosDtoList || []).map(talonario => ({
        serieTalonario: talonario.serieTalonario || '',
        precioBoleta: talonario.precioBoleta,
        numeroInicial: talonario.numeroInicial,
        numeroFinal: talonario.numeroFinal,
        cantidadAnuladas: talonario.cantidadAnuladas ?? 0
      }))
    }));
    if (!this.actividades.length) {
      this.actividades = [this.nuevaActividad()];
    }
  }

  private normalizarFecha(valor: string | Date | null | undefined): string {
    if (!valor) return '';
    if (typeof valor === 'string') {
      return valor.length >= 10 ? valor.slice(0, 10) : valor;
    }
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '';
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }

  private redondear(valor: number): number {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
  }
}
