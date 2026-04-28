import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { ComplejoDeportivo } from 'src/app/core/models/complejoDeportivo.model';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { Tarifa } from 'src/app/core/models/tarifa.model';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { trigger, transition, animate } from '@angular/animations';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { BookingType } from 'src/app/core/constants/Features';
import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';
interface CampoWithTariff {
  campo: CampoDeportivo;
  tarifasActivas: Tarifa[];
  isExpanded?: boolean;
}
interface TarifaPermission {
  canBook: boolean;
  canRequest: boolean;
  message: string;
  actionType: 'book' | 'request' | 'none';
}
@Component({
  selector: 'app-campo-selection',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './campo-selection.component.html',
  styleUrls: ['./campo-selection.component.scss'],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        animate('300ms ease-out')
      ]),
      transition(':leave', [
        animate('300ms ease-in')
      ])
    ])
  ]
})
export class CampoSelectionComponent implements OnInit {
  viewMode: 'list' | 'grid' = 'grid';
  @Input() dataComplejo?: ComplejoDeportivo;
  @Input() bookingType!: BookingType;
  @Input() userRole: 'Contribuyente' | 'Representante' | 'Encargado' | 'Admin' = 'Contribuyente'; 
  @Input() systemConfigs: { [key: string]: ConfiguracionSistema } = {};
  get enableSolicitudEventsBooking(): boolean {
    return this.systemConfigs[ClaveConfiguracion.HABILITAR_SOLICITUD_RESERVAS_EVENTOS]?.valorBoolean ?? false;
  }
  get enableEventsBooking(): boolean {
    return this.systemConfigs[ClaveConfiguracion.HABILITAR_RESERVAS_EVENTOS]?.valorBoolean ?? false;
  }
  get enableSolicitudRecurrentBooking(): boolean {
    return this.systemConfigs[ClaveConfiguracion.HABILITAR_SOLICITUD_RESERVAS_RECURRENTES]?.valorBoolean ?? false;
  }
  get enableRecurrentBooking(): boolean {
    return this.systemConfigs[ClaveConfiguracion.HABILITAR_RESERVAS_RECURRENTES]?.valorBoolean ?? false;
  }

  @Output() campoSelected = new EventEmitter<{actionType:'book' | 'request' | 'none',field: CampoDeportivo; tariff: Tarifa;}>();
  @Output() goBack = new EventEmitter<void>();

  camposConTarifas: CampoWithTariff[] = [];
  selectedCampoItem?: CampoWithTariff;
  expandedHorarios: Set<string> = new Set();
  
  searchText = '';
  filterByIluminacion?: boolean;
  filterBySuperficie?: string = '';
  filterByCategoria?: string = '';

  isLoading = false;

  ngOnInit(): void {
    if (!this.dataComplejo) {
      return;
    }
    this.processCampos();
  }

  private processCampos(): void {
    if (!this.dataComplejo?.camposDeportivosDtoList) {
      return;
    }
    this.camposConTarifas = this.dataComplejo.camposDeportivosDtoList
      .filter(campo => campo.estadoActual?.toLowerCase() === 'activo')
      .map(campo => ({
        campo,
        tarifasActivas: this.getActiveTarifas(campo),
        isExpanded: false
      }))
      .filter(item => item.tarifasActivas.length > 0);
  }

  private getActiveTarifas(campo: CampoDeportivo): Tarifa[] {
    if (!campo.tarifasDtoList) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return campo.tarifasDtoList.filter((tarifa: Tarifa) => {
      if (!tarifa.activo) return false;
      const fechaInicio = new Date(tarifa.fechaInicio!);
      fechaInicio.setHours(0, 0, 0, 0);
      if (fechaInicio > today) return false;
      if (tarifa.fechaFin) {
        const fechaFin = new Date(tarifa.fechaFin);
        fechaFin.setHours(23, 59, 59, 999);
        if (fechaFin < today) return false;
      }
      const tipoCobro = tarifa.tipoCobro.toLowerCase();
      const isPuntual = tipoCobro === 'por_hora' || 
                       tipoCobro === 'por_persona' || 
                       tipoCobro === 'por_evento';
      if (this.bookingType === 'puntual') {
        return isPuntual;
      } else if (this.bookingType === 'recurrente') {
        return !isPuntual;
      }
      return false;
    });
  }

  getTarifaPermission(campo: CampoDeportivo, tarifa: Tarifa): TarifaPermission {
    const tipoCobro = tarifa.tipoCobro.toLowerCase();
    const isRegularUser = this.userRole === 'Contribuyente' || this.userRole === 'Representante';
    const isAdminUser = this.userRole === 'Encargado' || this.userRole === 'Admin';
    if (isAdminUser) {
      return {
        canBook: true,
        canRequest: false,
        message: 'Reserva directa disponible',
        actionType: 'book'
      };
    }
    if (this.bookingType === 'puntual') {
      return this.getPuntualPermission(campo, tarifa, tipoCobro);
    } else if (this.bookingType === 'recurrente') {
      return this.getRecurrentePermission(campo, tarifa, tipoCobro);
    }
    return {
      canBook: false,
      canRequest: false,
      message: 'Tipo de reserva no disponible',
      actionType: 'none'
    };
  }

  private getPuntualPermission(campo: CampoDeportivo, tarifa: Tarifa, tipoCobro: string): TarifaPermission {
    const campoRequiereAprobacion = campo.requiereAprobacion;
    if (tipoCobro === 'por_hora' || tipoCobro === 'por_persona') {
      if (campoRequiereAprobacion) {
        return {
          canBook: false,
          canRequest: true,
          message: 'Requiere aprobación administrativa',
          actionType: 'request'
        };
      } else {
        return {
          canBook: true,
          canRequest: false,
          message: 'Reserva directa disponible',
          actionType: 'book'
        };
      }
    }
    if (tipoCobro === 'por_evento') {
      if (this.enableEventsBooking) {
        if (campoRequiereAprobacion) {
          return {
            canBook: false,
            canRequest: true,
            message: 'Evento requiere aprobación administrativa',
            actionType: 'request'
          };
        } else {
          return {
            canBook: true,
            canRequest: false,
            message: 'Reserva de evento disponible',
            actionType: 'book'
          };
        }
      } else if (this.enableSolicitudEventsBooking) {
        return {
          canBook: false,
          canRequest: true,
          message: 'Solicitud de evento - será validada por administrador',
          actionType: 'request'
        };
      } else {
        return {
          canBook: false,
          canRequest: false,
          message: 'No puede realizar reservas de eventos sin autorización',
          actionType: 'none'
        };
      }
    }

    return {
      canBook: false,
      canRequest: false,
      message: 'Tipo de cobro no disponible',
      actionType: 'none'
    };
  }
  private getRecurrentePermission(campo: CampoDeportivo, tarifa: Tarifa, tipoCobro: string): TarifaPermission {
    const campoRequiereAprobacion = campo.requiereAprobacion;
    if (campoRequiereAprobacion) {
      if (this.enableSolicitudRecurrentBooking) {
        return {
          canBook: false,
          canRequest: true,
          message: 'Reserva recurrente requiere aprobación',
          actionType: 'request'
        };
      } else {
        return {
          canBook: false,
          canRequest: false,
          message: 'No puede solicitar reservas recurrentes en este campo',
          actionType: 'none'
        };
      }
    }
    if (this.enableRecurrentBooking) {
      return {
        canBook: true,
        canRequest: false,
        message: 'Reserva recurrente disponible',
        actionType: 'book'
      };
    } else if (this.enableSolicitudRecurrentBooking) {
      return {
        canBook: false,
        canRequest: true,
        message: 'Solicitud de reserva recurrente - será validada',
        actionType: 'request'
      };
    } else {
      return {
        canBook: false,
        canRequest: false,
        message: 'No puede realizar reservas recurrentes sin autorización',
        actionType: 'none'
      };
    }
  }

  toggleCampoExpansion(item: CampoWithTariff): void {
    if (this.selectedCampoItem === item) {
      item.isExpanded = !item.isExpanded;
    } else {
      if (this.selectedCampoItem) {
        this.selectedCampoItem.isExpanded = false;
      }
      this.selectedCampoItem = item;
      item.isExpanded = true;
    }
  }
  canSelectTarifa(campo: CampoDeportivo, tarifa: Tarifa): boolean {
    const permission = this.getTarifaPermission(campo, tarifa);
    return permission.canBook || permission.canRequest;
  }
  getTarifaActionText(campo: CampoDeportivo, tarifa: Tarifa): string {
    const permission = this.getTarifaPermission(campo, tarifa);
    if (permission.canBook) return 'Reservar';
    if (permission.canRequest) return 'Solicitar';
    return 'No disponible';
  }
  getTarifaButtonClasses(campo: CampoDeportivo, tarifa: Tarifa): string {
    const permission = this.getTarifaPermission(campo, tarifa);
    
    if (permission.canBook) return 'can-book';
    if (permission.canRequest) return 'can-request';
    return 'cannot-select';
  }
  selectTarifa(item: CampoWithTariff, tarifa: Tarifa): void {
    if (!tarifa || !item) return;
    const permission = this.getTarifaPermission(item.campo, tarifa);
    if (!permission.canBook && !permission.canRequest) {
      return;
    }
    this.campoSelected.emit({
      field: item.campo,
      tariff: tarifa,
      actionType: permission.actionType // 'book' | 'request' | 'none'
    });
  }
  get filteredCampos(): CampoWithTariff[] {
    let filtered = [...this.camposConTarifas];
    if (this.searchText?.trim()) {
      const searchLower = this.searchText.toLowerCase().trim();
      filtered = filtered.filter(item =>
        item.campo.nombre?.toLowerCase().includes(searchLower) ||
        item.campo.codigo?.toLowerCase().includes(searchLower) ||
        item.campo.superficieDto?.descripcion?.toLowerCase().includes(searchLower) ||
        item.campo.categoria?.toLowerCase().includes(searchLower)
      );
    }
    if (this.filterByIluminacion !== undefined) {
      filtered = filtered.filter(item =>
        item.campo.tieneIluminacion === this.filterByIluminacion
      );
    }
    if (this.filterBySuperficie) {
      filtered = filtered.filter(item =>
        item.campo.superficieDto?.descripcion === this.filterBySuperficie
      );
    }
    if (this.filterByCategoria) {
      filtered = filtered.filter(item =>
        item.campo.categoria === this.filterByCategoria
      );
    }
    return filtered;
  }

  clearFilters(): void {
    this.searchText = '';
    this.filterByIluminacion = undefined;
    this.filterBySuperficie = undefined;
    this.filterByCategoria = undefined;
  }

  get superficiesDisponibles(): string[] {
    const superficies = new Set<string>();
    this.camposConTarifas.forEach(item => {
      if (item.campo.superficieDto?.descripcion) {
        superficies.add(item.campo.superficieDto.descripcion);
      }
    });
    return Array.from(superficies).sort();
  }

  get categoriasDisponibles(): string[] {
    const categorias = new Set<string>();
    this.camposConTarifas.forEach(item => {
      if (item.campo.categoria) {
        categorias.add(item.campo.categoria);
      }
    });
    return Array.from(categorias).sort();
  }

  getTipoCobro(tipo: string): string {
    const tipoMap: Record<string, string> = {
      'por_hora': 'Por hora',
      'por_persona': 'Por persona',
      'por_evento': 'Por evento',
      'mensualidad': 'Mensualidad',
      'por_club': 'Por club'
    };
    return tipo ? tipoMap[tipo] || tipo : 'No especificado';
  }

  public getAvailableDisciplines(campo: CampoDeportivo): string[] {        
    return Array.from(new Set(campo.tarifasDtoList?.flatMap((tarifa: Tarifa) => 
      tarifa.categoriasDtoList?.map((cat: any) => cat.categoriaDto.nombre) || [])
    )) as string[];  
  }
  
  getCapacidadDisplay(campo: CampoDeportivo): string {
    return campo.capacidadPersonas 
      ? `${campo.capacidadPersonas} personas` 
      : 'No especificada';
  }

  getTarifaRangeDisplay(tarifa: Tarifa): string {
    if (tarifa.desde && tarifa.hasta) {
      return `${tarifa.desde.slice(0, 5)} - ${tarifa.hasta.slice(0, 5)}`;
    }
    return 'Todo el día';
  }

  back(): void {
    this.goBack.emit();
  }

  getHorarioDisplay(campo: CampoDeportivo): string {
    if (!campo.horariosFijosDtoList || campo.horariosFijosDtoList.length === 0) {
      return 'Horario no definido';
    }
    const today = new Date().toLocaleDateString('es-BO', { weekday: 'long' }).toLowerCase();
    const dayMap: { [key: string]: string } = {
      'lunes': 'lunes',
      'martes': 'martes',
      'miércoles': 'miercoles',
      'jueves': 'jueves',
      'viernes': 'viernes',
      'sábado': 'sabado',
      'domingo': 'domingo'
    };
    const todayKey = dayMap[today];
    let todayHorarios = campo.horariosFijosDtoList.filter(h => h.dia === todayKey && h.abierto);
    if (todayHorarios.length === 0 && ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].includes(todayKey)) {
      todayHorarios = campo.horariosFijosDtoList.filter(h => h.dia === 'lunes_viernes' && h.abierto);
    }
    if (todayHorarios.length === 0) {
      return 'Hoy: Cerrado';
    }
    const times = todayHorarios.map(h => 
      `${h.horaApertura!.slice(0, 5)}-${h.horaCierre!.slice(0, 5)}`
    ).join(', ');  
    return `Hoy: ${times}`;
  }

  toggleHorarioExpansion(campoUuid: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.expandedHorarios.has(campoUuid)) {
      this.expandedHorarios.delete(campoUuid);
    } else {
      this.expandedHorarios.add(campoUuid);
    }
  }

  isHorarioExpanded(campoUuid: string): boolean {
    return this.expandedHorarios.has(campoUuid);
  }

  getHorarioCompleto(campo: CampoDeportivo): string[] {
    if (!campo.horariosFijosDtoList || campo.horariosFijosDtoList.length === 0) {
      return ['Horario no definido'];
    }
    const daysMap: { [key: string]: string } = {
      'lunes': 'Lunes',
      'martes': 'Martes', 
      'miercoles': 'Miércoles',
      'jueves': 'Jueves',
      'viernes': 'Viernes',
      'sabado': 'Sábado',
      'domingo': 'Domingo',
      'lunes_viernes': 'Lunes a Viernes',
    };
    const horarios: string[] = [];
    const grouped: { [key: string]: any[] } = {};
    campo.horariosFijosDtoList.forEach(h => {
      if (!grouped[h.dia]) {
        grouped[h.dia] = [];
      }
      grouped[h.dia].push(h);
    });
    Object.keys(grouped).sort().forEach(dia => {
      const dayHorarios = grouped[dia];
      const dayLabel = daysMap[dia] || dia;    
      if (dayHorarios.length === 0) return;    
      const firstHorario = dayHorarios[0];
      if (!firstHorario.abierto) {
        horarios.push(`${dayLabel}: Cerrado`);
        return;
      }
      if (dayHorarios.length === 1) {
        horarios.push(`${dayLabel}: ${firstHorario.horaApertura!.slice(0, 5)}-${firstHorario.horaCierre!.slice(0, 5)}`);
      } else {
        const times = dayHorarios
          .filter(h => h.abierto)
          .map(h => `${h.horaApertura!.slice(0, 5)}-${h.horaCierre!.slice(0, 5)}`)
          .join(', ');
        horarios.push(`${dayLabel}: ${times}`);
      }
    });
    return horarios.length > 0 ? horarios : ['Consultar horarios'];
  }
  getProximasExcepciones(campo: CampoDeportivo): string[] {
    if (!campo.horariosExcepcionesDtoList || campo.horariosExcepcionesDtoList.length === 0) {
      return [];
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return campo.horariosExcepcionesDtoList
      .filter(exc => {
        const excDate = new Date(exc.fecha);
        excDate.setHours(0, 0, 0, 0);
        return excDate >= today;
      })
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      .slice(0, 3)
      .map(exc => {
        const date = new Date(exc.fecha);
        const dateStr = date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });
        if (exc.tipoExcepcion === 'cerrado') {
          return `${dateStr}: CERRADO`;
        }
        if (exc.tipoExcepcion === 'mantenimiento') {
          return `${dateStr}: Mantenimiento`;
        }
        if (exc.tipoExcepcion === 'evento_municipal') {
          return `${dateStr}: ${exc.motivo || 'Evento'}`;
        }
        if (exc.tipoExcepcion === 'horario_especial' && exc.horaApertura && exc.horaCierre) {
          return `${dateStr}: ${exc.horaApertura.slice(0, 5)}-${exc.horaCierre.slice(0, 5)}`;
        }
        return `${dateStr}: Horario especial`;
      });
  }
  
}