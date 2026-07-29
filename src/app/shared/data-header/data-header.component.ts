import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ngxCsv } from 'ngx-csv/ngx-csv';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';
import { BreadCrumbItem } from '../breadcrumbs/breadcrumbs.component';
export interface CsvColumn<T = any> {
  header: string;
  value: (item: T) => string |String | number | Date | boolean;
}

export interface ToggleOption {
  openText: string;
  closeText: string;
  count?: number;
  ariaExpanded: boolean;
  ariaControls: string;
}

@Component({
  selector: 'app-data-header',
  templateUrl: './data-header.component.html',
  styleUrls: ['./data-header.component.scss']
})
export class DataHeaderComponent {
  @Input() breadcrumbItems: BreadCrumbItem[] = [];

  @Output() createEmitter = new EventEmitter();
  @Output() consultEmitter = new EventEmitter();
  @Output() notifyEmitter = new EventEmitter();
  @Output() filterEmitter = new EventEmitter();
  @Output() importEmitter = new EventEmitter();
  @Output() exportEmitter = new EventEmitter();
  @Output() toggleEmitter = new EventEmitter();

  @Input() newShow!: boolean;
  @Input() consultShow!: boolean;
  @Input() notifyShow!: boolean;
  @Input() toggleOptions?: ToggleOption;
  @Input() exportShow!:boolean;
  @Input() importShow!: boolean;
  @Input() headersImport:any[]=[]
  // @Input() title=''
  @Input() csvColumns: CsvColumn[] = [];
  @Input() csvItems: any[] = [];
  @Input() SelectedItems: any[] = [];

  get title() { return this.breadcrumbItems[0]?.label || '';}
  get subtitle() { return this.breadcrumbItems.at(-1)?.label || '';}
  get description() { return this.breadcrumbItems.at(-1)?.description || '';}
  
  public openPopup() {
    this.createEmitter.emit();
  }

  public consult() {
    this.consultEmitter.emit();
  }

  public notify() {
    this.notifyEmitter.emit();
  }

  public filterList(event: any){
    this.filterEmitter.emit(event);
  }

  public import(event: any){
    this.importEmitter.emit(event);
  }
  
  public toggle(){
    this.toggleEmitter.emit();
  }

  downloadExcelTemplate(): void {
    const worksheet = XLSX.utils.aoa_to_sheet([this.headersImport]);
    const workbook = { Sheets: { 'Plantilla Importación': worksheet }, SheetNames: ['Plantilla Importación'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const fileName = `plantilla_importacion_${this.subtitle || this.title}.xlsx`;
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    FileSaver.saveAs(blob, fileName);
  }

  public csvFileExport(){
    const itemsToExport = this.SelectedItems.length > 0
      ? this.SelectedItems
      : this.csvItems;
    if (!itemsToExport.length || !this.csvColumns.length) return;

    const rows = itemsToExport.map(item =>
      Object.fromEntries(this.csvColumns.map(col => [col.header, col.value(item)]))
    );
    // const rows = this.buildExportRows(this.itemsToExport);
    const fileSuffix = this.SelectedItems.length > 0 ? 'seleccionados' : 'lista';
    new ngxCsv(rows, `${this.subtitle || 'Lista'}_${fileSuffix}`, {
      fieldSeparator: ',',
      quoteStrings: '"',
      decimalseparator: '.',
      showLabels: true,
      showTitle: true,
      title: 'Lista de ' + (this.subtitle || ''),
      useBom: true,
      noDownload: false,
      headers: this.csvColumns.map(column => column.header),
    });
  }

  private buildExportRows(items: any[]): Array<Record<string, string | number>> {
    return items.flatMap(item => {
      const values = this.csvColumns.map(column => column.value(item));
      const rowCount = Math.max(1, ...values.map(value => Array.isArray(value) ? value.length : 1));
      return Array.from({ length: rowCount }, (_, rowIndex) =>
        Object.fromEntries(
          this.csvColumns.map((column, columnIndex) => {
            const value = values[columnIndex];
            const cellValue = Array.isArray(value) ? value[rowIndex] : value;
            return [column.header, this.normalizeExportValue(cellValue)];
          })
        )
      );
    });
  }

  private normalizeExportValue(value: unknown): string | number {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'boolean') return value ? 'SI' : 'NO';
    if (value instanceof Date) return value.toISOString();
    return String(value);
  }

}
