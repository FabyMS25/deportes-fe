import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { PaginationService } from 'src/app/core/services/pagination.service';
import { CityAcronym } from 'src/app/core/constants/Places';
import * as userData from 'src/app/core/constants/UserData';
import { Memoize } from './memoize.decorator';

interface ColumnDefinition {
  name: string;
  prop: string;
  visible: boolean;
  tag?: boolean;
  date?: boolean;
  html?: boolean;
  image?: boolean;
  avatar?: boolean;
  primary?: boolean;
}
interface TableActions {
  show?: boolean;
  edit?: boolean;
  delete?: boolean;
  records?: boolean;
  telf?: boolean;
  notify?: boolean;
  consult?:boolean
  ticket?:boolean
  // [key: string]: boolean | undefined;
}
interface PaginationInfo {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss']
})
export class DataTableComponent implements OnChanges {
  @Input() itemsList!: ColumnDefinition[];
  @Input() actions!: TableActions;
  @Input() allcontent!: any[] | any; 
  @Input() loading: boolean = true;
  @Input() multiCheck: boolean = true;
  @Input() itemsPerPage: number;
  @Input() viewMode: 'table' | 'cards' = 'table';
  @Input() serverSidePagination: boolean = false;
  @Input() paginationInfo: PaginationInfo | null = null;

  @Output() showItemEmitter = new EventEmitter<any>();
  @Output() editItemEmitter = new EventEmitter<any>();
  @Output() deleteItemEmitter = new EventEmitter<any>();
  @Output() recordsEmitter = new EventEmitter<any>();
  @Output() notifyItemEmitter = new EventEmitter<any>();
  @Output() selectedItemEmitter = new EventEmitter<any[]>();
  @Output() ticketEmitter = new EventEmitter<any[]>();
  @Output() consultItemEmitter = new EventEmitter<any[]>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>(); 

  
  content: any[] = [];
  totalElements: number = 0;

  masterSelected: boolean = false;
  searchTerm: string = '';
  checkedValGet: any[] = [];
  tableSizes:number[]= [5,10,15,20];
  private expandedItems = new Set<string>();

  constructor(public service: PaginationService) {
    this.itemsPerPage = this.service.pageSize;
  }
  // ngOnChanges(): void {
  //   this.content = this.service.changePage(this.allcontent, this.itemsPerPage);
  // }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['allcontent'] || changes['serverSidePagination']) {
      this.processContent();
    }
  }
  private processContent(): void {
    if (this.serverSidePagination) {
      this.handleServerSidePagination();
    } else {
      this.handleClientSidePagination();
    }
  }


  private handleServerSidePagination(): void {
    if (this.allcontent && this.allcontent.content && Array.isArray(this.allcontent.content)) {
      // Spring Data pagination format
      this.content = this.allcontent.content;
      this.totalElements = this.allcontent.totalElements || this.content.length;
      
      // Update pagination info if provided
      if (this.allcontent.pageable) {
        this.service.page = this.allcontent.pageable.pageNumber + 1; // Convert to 1-based
        this.itemsPerPage = this.allcontent.pageable.pageSize;
      }
    } else if (Array.isArray(this.allcontent)) {
      // Fallback: direct array
      this.content = this.allcontent;
      this.totalElements = this.allcontent.length;
    } else {
      this.content = [];
      this.totalElements = 0;
    }
  }

  private handleClientSidePagination(): void {
    if (Array.isArray(this.allcontent)) {
      this.content = this.service.changePage(this.allcontent, this.itemsPerPage);
      this.totalElements = this.allcontent.length;
    } else {
      this.content = [];
      this.totalElements = 0;
    }
  }

  //#region Action Handle
  showItem(item: any): void { this.showItemEmitter.emit(item); }
  editItem(item: any): void { this.editItemEmitter.emit(item); }
  deleteItem(item: any): void { this.deleteItemEmitter.emit(item); }
  recordsItem(item: any): void { this.recordsEmitter.emit(item); }
  notifyItem(item: any): void { this.notifyItemEmitter.emit(item); }
  consultItem(item: any) {this.consultItemEmitter.emit(item);}
  ticketItem(item: any) { this.ticketEmitter.emit(item);}

  showActions(data: any): { tooltip: string; icon: string; handler: (data: any) => void; buttonClass: string }[] {
    return [
      ...(this.actions.show ? [{ tooltip: 'Ver', icon: 'ri-eye-fill', handler: () => this.showItem(data), buttonClass: '' }] : []),
      ...(this.actions.records ? [{ tooltip: 'Historial', icon: 'ri-file-list-3-line', handler: () => this.recordsItem(data), buttonClass: '' }] : []),
      ...(this.actions.ticket ? [{ tooltip: 'Ticket', icon: 'ri-file-list-3-line', handler: () => this.ticketItem(data), buttonClass: '' }] : []),
      ...(this.actions.consult ? [{ tooltip: 'Consultar', icon: 'ri-restart-fill', handler: () => this.consultItem(data), buttonClass: 'text-primary d-inline-block edit-item-btn' }] : []),
      ...(this.actions.edit || (this.actions.edit && data.estadoReserva && data.estadoReserva ==='Pendiente')? [{ tooltip: 'Editar', icon: 'ri-pencil-fill', handler: () => this.editItem(data), buttonClass: 'text-primary edit-item-btn' }] : []),
      ...(((this.actions.delete && !data.estadoReserva) || (this.actions.delete && data.estadoReserva && data.estadoReserva ==='Pendiente')) ? [{ tooltip: 'Eliminar', icon: 'ri-close-circle-line', handler: () => this.deleteItem(data), buttonClass: 'text-danger remove-item-btn' }] : []),
      ...(this.actions.notify && this.canShow(data) ? [{ tooltip: 'Notificar', icon: 'ri-mail-send-fill', handler: () => this.notifyItem(data), buttonClass: 'text-success' }] : []),
    ];  
  }  
                                // <li *ngIf="telf" class="list-inline-item edit" ngbTooltip="Call" placement="top">
                                //     <a href="javascript:void(0);" class="text-muted d-inline-block">
                                //         <i class="ri-phone-line fs-16"></i>
                                //     </a>
                                // </li>
                                // <li *ngIf="comment" class="list-inline-item edit" ngbTooltip="Message" placement="top">
                                //     <a href="https://api.whatsapp.com/send?phone=+59172248669&text=MENSAJE DESDE SISTEMA DE DEPORTES" 
                                //         class="text-muted d-inline-block">
                                //         <i class="ri-question-answer-line fs-16"></i>
                                //     </a>
                                // </li>
  canShow(data: any): boolean {
    return !data.resultado;
  }
  //#endregion

  //#region Value handle
  @Memoize()
  getPropertyValue(obj: any, prop: string): any {
    if (!prop) return '';
    if (prop.includes('[') && prop.includes(']')) {
      return this.resolveArrayProperty(obj, prop);
    }
    const value = prop.split('.').reduce((o, p) => o?.[p], obj);
    switch (prop) {
      case 'gasesEscapeConforme':
      case 'examenVisualConforme':
        return this.formatBoolean(value, 'SI', 'NO');
      case 'esValido':
        return this.formatBoolean(value, 'VALIDO', 'INVALIDO');
      case 'activo':
        return this.formatBoolean(value, 'ACTIVO', 'INACTIVO');
      case 'obligatorio':
        return this.formatBoolean(value, 'OBLIGATORIO', 'OPCIONAL');
      case 'resultado':
        return this.formatBoolean(value, 'APROBADO', 'REPROBADO');
      case 'esDenuncia':
        return this.formatBoolean(value, 'DENUNCIA', 'OBSERVACIÓN');
      case 'expedido':
        return CityAcronym.find(c => c.id === value)?.value || value;
      case 'tipoDocumento':
        return userData.UserDocType.find(c => c.type === value)?.description || value;
      case 'genero':
        return userData.UserGender.find(c => c.id === value)?.description || value;
      case 'estadoCivil':
        return userData.UserCivilStatus.find(c => c.type === value)?.description || value;
      case 'x': {
        const dimensions = [obj.ancho, obj.largo, obj.profundidad, obj.alto, obj.nroFilas, obj.nroColumnas]
          .filter(v => v != null)
          .map(v => `${v}<strong>X</strong>`);
        return dimensions.length > 0
          ? dimensions.join(' ').replace(/<strong>X<\/strong>$/, '')
          : '';
      }
      default:
        return value === 0 ? '0' : value;
    }
  }
  private resolveArrayProperty(obj: any, prop: string): any {
    try {
      const match = prop.match(/([^\[]+)\[(\d+)\](\..+)?/);
      if (!match) return '';
      const [, arrayProp, indexStr, rest] = match;
      const array = arrayProp.split('.').reduce((o, p) => o?.[p], obj);
      const index = Number(indexStr);
      const value = array?.[index];
      return rest ? rest.slice(1).split('.').reduce((o, p) => o?.[p], value) : value;
    } catch (e) {
      console.warn(`Error resolving property ${prop}`, e);
      return '';
    }
  }
  private formatBoolean(val: any, trueText: string, falseText: string): string {
    return val === true ? trueText : val === false ? falseText : '';
  }
  getBadgeStatus(value: any): string {
    const statuses: Record<string, string> = {
      Activo: 'success', Bloqueado: 'warning',
      Pagado: 'success', Pendiente: 'secondary',
      Vencido: 'danger', Anulado: 'warning',
      ENVIADA: 'success', PENDIENTE: 'warning', 
      ENTREGADA: 'success', PROGRAMADA: 'primary',
      NO_ENTREGADO: 'danger', VENCIDA: 'danger',
      VALIDO: 'success', INVALIDO: 'danger', 
      SI: 'success', NO: 'danger'
    };
    return statuses[value] || 'info';
  }
  //#endregion

  //#region On selection
  onCheckboxChange(e: Event, item: any): void {
    const target = e.target as HTMLInputElement;
    target.checked
      ? this.checkedValGet.push(item)
      : this.checkedValGet = this.checkedValGet.filter(i => i !== item);
    this.updateSelectionState();
  }
  checkUncheckAll(e: Event): void {
    const target = e.target as HTMLInputElement;
    this.masterSelected = target.checked;
    if (this.serverSidePagination) {
      this.checkedValGet = this.masterSelected ? [...this.content] : [];
    } else {
      this.checkedValGet = this.masterSelected ? [...this.allcontent] : [];
    }
    
    this.updateSelectionState();
  }
  // checkUncheckAll(e: Event): void {
  //   const target = e.target as HTMLInputElement;
  //   this.masterSelected = target.checked;
  //   this.checkedValGet = this.masterSelected ? [...this.allcontent] : [];
  //   this.updateSelectionState();
  // }

  private updateSelectionState(): void {
    const totalItems = this.serverSidePagination ? this.content.length : this.allcontent.length;
    this.masterSelected = this.checkedValGet.length === totalItems && totalItems > 0;
    this.selectedItemEmitter.emit(this.checkedValGet);
    
    const removeActions = document.getElementById("remove-actions");
    if (removeActions) {
      removeActions.style.display = this.checkedValGet.length > 0 ? "block" : "none";
    }
  }
  // private updateSelectionState(): void {
  //   this.masterSelected = this.checkedValGet.length === this.allcontent.length;
  //   this.selectedItemEmitter.emit(this.checkedValGet);
  //   const removeActions = document.getElementById("remove-actions");
  //   if (removeActions) {
  //     removeActions.style.display = this.checkedValGet.length > 0 ? "block" : "none";
  //   }
  // }
  //#endregion

   //#region Sort & Pagination
  // Sort - Only for client-side
  currentSortColumn: string = '';
  isSortAscending: boolean = true;

  onSort(column: string): void {
    if (this.serverSidePagination) {
      console.warn('Sorting should be handled server-side when using server-side pagination');
      return;
    }

    if (this.currentSortColumn === column) {
      this.isSortAscending = !this.isSortAscending;
    } else {
      this.currentSortColumn = column;
      this.isSortAscending = true;
    }
    this.allcontent = this.service.onSort(column, [...this.allcontent], this.isSortAscending);
    this.service.page = 1;
    this.changePage();
  }

  getSortDirection(column: string): string {
    if (this.serverSidePagination) return 'none';
    if (this.currentSortColumn !== column) return 'none';
    return this.isSortAscending ? 'ascending' : 'descending';
  }

  // Pagination
  onTableSizeChange(event: Event): void {
    const size = +(event.target as HTMLSelectElement).value;
    this.itemsPerPage = size;
    
    if (this.serverSidePagination) {
      this.pageSizeChange.emit(size);
    } else {
      this.changePage();
    }
  }

  changePage(): void {
    if (this.serverSidePagination) {
      this.pageChange.emit(this.service.page);
    } else {
      this.content = this.service.changePage(this.allcontent, this.itemsPerPage);
    }
  }

  onPageChange(page: number): void {
    this.service.page = page;
    this.changePage();
  }
  //#endregion

  // UI helpers
  isMobileColumn(column: ColumnDefinition): boolean {
    return column.visible;
  }

  toggleExpand(data: any, prop: string): void {
    const key = `${data.uuid}_${prop}`;
    this.expandedItems.has(key) ? this.expandedItems.delete(key) : this.expandedItems.add(key);
  }

  isExpanded(data: any, prop: string): boolean {
    return this.expandedItems.has(`${data.uuid}_${prop}`);
  }

  toggleColumn(column: ColumnDefinition): void {
    column.visible = !column.visible;
  }

  // Helper to get display content length
  getDisplayContentLength(): number {
    return this.content.length;
  }

  // Helper to get total elements
  getTotalElements(): number {
    if (this.serverSidePagination) {
      return this.totalElements;
    }
    return Array.isArray(this.allcontent) ? this.allcontent.length : 0;
  }
}
