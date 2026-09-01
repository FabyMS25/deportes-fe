import { Component, ElementRef, ViewChild } from '@angular/core';
import { Spanish } from 'flatpickr/dist/l10n/es';
import { ReportsService } from 'src/app/core/services/api/reportes.service';

@Component({
  selector: 'app-payments',
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss'
})
export class PaymentsCompoment {
  breadCrumbItems!: Array<{}>;
  title = 'Reporte de Pagos';
  showLoading: boolean = false; 

  date!: { from: Date, to: Date };
  Spanish = Spanish; 

  @ViewChild('pdfViewer') pdfViewer!: ElementRef;

  constructor(private reportsService: ReportsService) {}

  async ngOnInit() {
    this.breadCrumbItems = [
      { label: 'Reportes' },
      { label: this.title, active: true }
    ];
  }

  applyFilters() {
    let fecha_ini = '';
    let fecha_fin = '';
    
    if (this.date && this.date.from && this.date.to) {
      const fromDate = new Date(this.date.from);
      const toDate = new Date(this.date.to);
      fecha_ini = this.formatDateToDDMMYYYY(fromDate);
      fecha_fin = this.formatDateToDDMMYYYY(toDate);
    }
  
    this.showLoading = true;
    this.generatePdfReport(fecha_ini, fecha_fin);
  }

  private formatDateToDDMMYYYY(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  
  /* API Services */
  private generatePdfReport(fecha_ini: string, fecha_fin: string) {
    this.reportsService.getPaymentsReport(fecha_ini, fecha_fin).subscribe(
      (data: ArrayBuffer) => {
        const file = new Blob([data], { type: 'application/pdf' });
        const fileURL = URL.createObjectURL(file);
        this.pdfViewer.nativeElement.data = fileURL;
        this.showLoading = false;
      },
      (error) => {
        this.showLoading = false;
        alert('Error al generar el reporte');
      }
    );
  }
}