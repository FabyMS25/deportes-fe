import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EstadoActual, StatusUtils } from 'src/app/core/constants/Estados';
import { ComplejoDeportivo } from 'src/app/core/models/complejoDeportivo.model';
import { EncargadoComplejo } from 'src/app/core/models/encargadoComplejo.model';
import { ComplejosService } from 'src/app/core/services/api/conplejos.service';

@Component({
  selector: 'app-complejo-selection',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './complejo-selection.component.html',
  styleUrls: ['./complejo-selection.component.scss']
})
export class ComplejoSelectionComponent implements OnInit {
  @Output() complejoSelected = new EventEmitter<ComplejoDeportivo>();
  @Output() goBack = new EventEmitter<void>();

  complejosList: ComplejoDeportivo[] = [];
  filteredComplejos: ComplejoDeportivo[] = [];
  
  isLoading = false;
  loadError = false;
  searchText = '';
  filterByDistrito?: string;
  filterByIluminacion?: boolean;
  filterByTipoEstructura?: string;  
  viewMode: 'list' | 'grid' = 'grid';

  constructor(private complejoService: ComplejosService) {}

  ngOnInit(): void {
    this.loadComplejos();
  }
  
  private loadComplejos(): void {
    this.isLoading = true;
    this.loadError = false;
    
    this.complejoService.getAll().subscribe({
      next: (response: any) => {
        this.complejosList = response.filter(
          (c: ComplejoDeportivo) => c.estadoActual === EstadoActual.ACTIVO && this.hasActiveFields(c)
        );
        this.filteredComplejos = [...this.complejosList];
        this.isLoading = false;
      },
      error: (error) => {
        this.loadError = true;
        this.isLoading = false;
      }
    });
  }

  retryLoad(): void {
    this.loadComplejos();
  }
  
  applyFilters(): void {
    this.filteredComplejos = this.complejosList.filter(complejo => {
      let matches:any = true;
      if (this.searchText?.trim()) {
        const searchLower = this.searchText.toLowerCase().trim();
        matches = matches && (
          complejo.nombre?.toLowerCase().includes(searchLower) ||
          complejo.ubicacion?.toLowerCase().includes(searchLower) ||
          complejo.distrito?.toLowerCase().includes(searchLower)
        );
      }
      if (this.filterByDistrito) {
        matches = matches && complejo.distrito === this.filterByDistrito;
      }
      if (this.filterByIluminacion !== undefined) {
        matches = matches && complejo.tieneIluminacion === this.filterByIluminacion;
      }
      if (this.filterByTipoEstructura) {
        matches = matches && complejo.tipoEstructura === this.filterByTipoEstructura;
      }
      
      return matches;
    });
  }

  clearFilters(): void {
    this.searchText = '';
    this.filterByDistrito = undefined;
    this.filterByIluminacion = undefined;
    this.filterByTipoEstructura = undefined;
    this.filteredComplejos = [...this.complejosList];
  }

  
  selectComplejo(complejo: ComplejoDeportivo): void {
    if (!complejo || !this.hasActiveFields(complejo)) return;
    this.complejoSelected.emit(complejo);
  }

  
  get distritos(): string[] {
    const distritos = new Set<string>();
    this.complejosList.forEach(c => {
      if (c.distrito) distritos.add(c.distrito);
    });
    return Array.from(distritos).sort();
  }

  get tiposEstructura(): string[] {
    const tipos = new Set<string>();
    this.complejosList.forEach(c => {
      if (c.tipoEstructura) tipos.add(c.tipoEstructura);
    });
    return Array.from(tipos).sort();
  }

  getCamposCount(complejo: ComplejoDeportivo): number {
    return complejo.camposDeportivosDtoList?.filter(
      c => c.estadoActual === EstadoActual.ACTIVO
    ).length || 0;
  }

  hasActiveFields(complejo: ComplejoDeportivo): boolean {
    return this.getCamposCount(complejo) > 0;
  }

  getStatusRibbonClass(status: string): string {
    return StatusUtils.getStatusRibbonClass(status?.toUpperCase() || '');
  }

  getStatusIcon(status: string): string {
    switch (status?.toUpperCase()) {
      case EstadoActual.ACTIVO:
        return 'ri-checkbox-circle-fill';
      case EstadoActual.MANTENIMIENTO:
        return 'ri-tools-fill';
      case EstadoActual.CERRADO:
        return 'ri-close-circle-fill';
      case EstadoActual.EVENTO_MUNICIPAL:
        return 'ri-calendar-event-fill';
      default:
        return 'ri-question-line';
    }
  }

  hasEncargados(complejo: ComplejoDeportivo): EncargadoComplejo | undefined {
    const today = new Date();
    const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (!complejo.encargadosDtoList?.length) {
      return undefined;
    }
    return complejo.encargadosDtoList.find((encargado: EncargadoComplejo) => {
      if (!encargado.activo) return false;
      if (!encargado.fechaAsignacion || !encargado.fechaFinAsignacion) {
        return true;
      }
      const fechaAsignacion = new Date(encargado.fechaAsignacion + 'T00:00:00');
      const fechaFinAsignacion = new Date(encargado.fechaFinAsignacion + 'T23:59:59');
      return fechaAsignacion <= todayNormalized && todayNormalized <= fechaFinAsignacion;
    });
  }

  getComplejoInfo(complejo: ComplejoDeportivo): string {
    const info: string[] = [];
    
    if (complejo.distrito) info.push(complejo.distrito);
    if (complejo.tipoEstructura) info.push(complejo.tipoEstructura);
    
    return info.join(' • ');
  }

  get showEmptyState(): boolean {
    return !this.isLoading && !this.loadError && this.filteredComplejos.length === 0;
  }
  
  back(): void {
    this.goBack.emit();
  }
}
