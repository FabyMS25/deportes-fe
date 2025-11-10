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

  get enableSolicitudOrganizationReservation(): boolean {
    return this.systemConfigs[ClaveConfiguracion.HABILITAR_SOLICITUD_RESERVAS_ORGANIZACIONES]?.valorBoolean ?? false;
  }
  get enableOrganizationReservation(): boolean {
    return this.systemConfigs[ClaveConfiguracion.HABILITAR_RESERVAS_ORGANIZACIONES]?.valorBoolean ?? false;
  }
  get enableSolicitudEventsBooking(): boolean{
    return this.systemConfigs[ClaveConfiguracion.HABILITAR_SOLICITUD_RESERVAS_EVENTOS]?.valorBoolean ?? false;
  }
  get enableEventsBooking(): boolean {
    return this.systemConfigs[ClaveConfiguracion.HABILITAR_RESERVAS_EVENTOS]?.valorBoolean ?? false;
  }
  get enableSolicitudRecurrentBooking(): boolean | undefined{
    return this.systemConfigs[ClaveConfiguracion.HABILITAR_SOLICITUD_RESERVAS_RECURRENTES]?.valorBoolean ?? false;
  }
  get enableRecurrentBooking(): boolean | undefined{
    return this.systemConfigs[ClaveConfiguracion.HABILITAR_RESERVAS_RECURRENTES]?.valorBoolean ?? false;
  }

  @Output() campoSelected = new EventEmitter<{field: CampoDeportivo; tariff: Tarifa;}>();
  @Output() goBack = new EventEmitter<void>();

  camposConTarifas: CampoWithTariff[] = [];
  selectedCampoItem?: CampoWithTariff;
  
  searchText = '';
  filterByIluminacion?: boolean;
  filterBySuperficie?: string ='';
  filterByCategoria?: string ='';

  isLoading = false;

  ngOnInit(): void {
    console.log(this.systemConfigs)
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

  toggleCampoExpansion(item: CampoWithTariff): void {
    if (this.selectedCampoItem === item) {
      item.isExpanded = !item.isExpanded;
    } else {
      if (this.selectedCampoItem) {
        this.selectedCampoItem.isExpanded = false;
      }
      this.selectedCampoItem = item;
      item.isExpanded = true;
      // if (item.tarifasActivas.length === 1) {
      //   setTimeout(() => {
      //     this.selectTarifa(item, item.tarifasActivas[0]);
      //   }, 300);
      // }
    }
  }

  selectTarifa(item: CampoWithTariff, tarifa: Tarifa): void {
    if (!tarifa || !item) return;
    this.campoSelected.emit({
      field: item.campo,
      tariff: tarifa
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

  hasActiveFilters(): boolean {
    return !!(this.searchText || this.filterByIluminacion !== undefined || 
              this.filterBySuperficie || this.filterByCategoria);
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

  getHorarioDisplay(campo: CampoDeportivo): string {
    if (!campo.horariosFijosDtoList || campo.horariosFijosDtoList.length === 0) {
      return 'Horario no definido';
    }

    const horarioLV = campo.horariosFijosDtoList.find(
      h => h.dia === 'lunes_viernes' && h.abierto
    );

    if (horarioLV && horarioLV.horaApertura && horarioLV.horaCierre) {
      return `${horarioLV.horaApertura.slice(0, 5)} - ${horarioLV.horaCierre.slice(0, 5)}`;
    }

    return 'Consultar horarios';
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

}