import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgbActiveModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import {read, utils} from 'xlsx';
import Swal from 'sweetalert2';
import { SharedModule } from 'src/app/shared/shared.module';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
@Component({
  selector: 'app-categorias-import',
  standalone: true,
  imports: [FormsModule, CommonModule, NgbModule, SharedModule, TranslateModule],
  templateUrl: './modal-import.component.html',
  styleUrl: './modal-import.component.scss'
})

export class ModalImportComponent {
  @Input() itemsList!: any[];
  @Input() titles!: any[];
  @Input() createRecordFn!: (record: any) => Promise<void>;
  @Input() checkExistsFn?: (record: any) => boolean;
  @Output() actionCompleted = new EventEmitter();
  @Input() lookupData?: { [key: string]: any[] }; // e.g., { tipoContribuyentes: [], regulations: [] }
  @Input() mapRowFn?: (row: any, lookupData: any) => any; // 👈 Transform raw row into model

  selectedItems: any[] = [];
  loading: boolean = false;
  xlsxData: any[]=[];
  temporaryList: any[] = [];
  
  constructor(
      private activeModal: NgbActiveModal,
      private translate: TranslateService) {}

  closeModal() {
      this.activeModal.close();
  }
  getSelectedItems(items: any[]) {
      this.selectedItems = items;
  }

  public search(event: any) {
    const val = event.target.value.toLowerCase();

    this.xlsxData = this.temporaryList.filter((row: any) => {
      return this.titles.some((field: any) => {
        const cellValue = row[field.prop];
        return cellValue?.toString().toLowerCase().includes(val);
      }) || !val;
    });
  }


  loadDatafromExcel(event: any) {
    const file = event.target.files[0];
    if(file){
        const reader = new FileReader();
        reader.readAsBinaryString(file);        
        reader.onload = (e: any) => {
            let workBook = read(reader.result, {type: 'binary'});
            let sheetNames = workBook.SheetNames;
            const rawData = utils.sheet_to_json(workBook.Sheets[sheetNames[0]]);
            this.xlsxData = this.sanitizeExcelDates(rawData);
            this.temporaryList = [...this.xlsxData];
            if (this.xlsxData.length <= 0) {
                this.loading = false;
                Swal.fire({ text: this.t('El archivo no tiene datos para importar'), confirmButtonColor: '#299cdb' });
            }
        };
    }
  }
  public async createRegisterfromXlsx(xlsxData: any) {
    this.loading = true;
    for (let i = 0; i < xlsxData.length; i++) {
      const row = xlsxData[i];
      let record: any;
      try {
        record = this.mapRowFn ? this.mapRowFn(row, this.lookupData) : row;
      } catch (err) {
        const missing = (err as any)?.missingFields?.join(', ') || this.t('Faltan datos de referencia');
        const result = await Swal.fire({
          icon: 'warning',
          title: this.t('Fila {{row}} - Datos no encontrados', { row: i + 1 }),
          text: this.t('No se encontraron: {{missing}}', { missing }),
          showCancelButton: true,
          confirmButtonText: this.t('Omitir y continuar'),
          cancelButtonText: this.t('Cancelar'),
          confirmButtonColor: '#299cdb',
          cancelButtonColor: '#d33'
        });
        if (result.isConfirmed) continue;
        else break;
      }
      if (this.checkExistsFn?.(record)) {
        await Swal.fire({
          icon: 'info',
          title: this.t('Fila {{row}}', { row: i + 1 }),
          timer: 2000,
          text: this.t('El registro ya existe.'),
          confirmButtonColor: '#299cdb'
        });
        continue;
      }
      try {
        await this.createRecordFn(record);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: this.t('Fila {{row}} creada exitosamente', { row: i + 1 }),
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
          background: '#d4edda',
          color: '#155724'      
        });
      } catch (error) {
        const retryResult = await Swal.fire({
          icon: 'error',
          title: this.t('Error al crear fila {{row}}', { row: i + 1 }),
          text: this.t('No se pudo crear el registro. ¿Desea omitir esta fila y continuar?'),
          showCancelButton: true,
          confirmButtonText: this.t('Omitir y continuar'),
          cancelButtonText: this.t('Cancelar'),
          confirmButtonColor: '#299cdb',
          cancelButtonColor: '#d33'
        });
        if (retryResult.isConfirmed) continue;
        else break;
      }
    }
    this.loading = false;
    this.activeModal.close();
    this.actionCompleted.emit();
  }

  private sanitizeExcelDates(data: any[]): any[] {
    const isExcelSerialDate = (val: any) =>
      typeof val === 'number' && val > 25569 && val < 60000; // Excel serial date range

    const convertSerialToDateString = (serial: number): string => {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + serial * 86400000);
      return `${date.getDate().toString().padStart(2, '0')}/` +
            `${(date.getMonth() + 1).toString().padStart(2, '0')}/` +
            `${date.getFullYear()}`;
    };

    return data.map(row => {
      const converted: any = {};
      for (const key in row) {
        const val = row[key];
        if (isExcelSerialDate(val)) {
          converted[key] = convertSerialToDateString(val);
        } else {
          converted[key] = val;
        }
      }
      return converted;
    });
  }

  private t(key: string, params?: Record<string, any>): string {
    return this.translate.instant(key, params);
  }
}
