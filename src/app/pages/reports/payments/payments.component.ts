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
  title='Pagos';
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
    let strQuery = '';    
    if (this.date && this.date.from && this.date.to) {
      const fromDate = new Date(this.date.from);
      const toDate = new Date(this.date.to);
      const fromDateFormatted = fromDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const toDateFormatted = toDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });  
      strQuery += 'fecha_ini=' + fromDateFormatted;
      strQuery += '&fecha_fin=' + toDateFormatted;
    }
  
    this.showLoading = true;
    this.generarReportePDF(strQuery);
  }
  
   
  /* API Services */
  private async generarReportePDF(params: any) {
    const data = await this.reportsService.getPaymentsReport(params).subscribe(
      (data: any) => {
        const file = new Blob([data], { type: 'application/pdf' });
        const fileURL = URL.createObjectURL(file);
        this.pdfViewer.nativeElement.data = fileURL;
        this.showLoading = false;
      }
    );
  }
  }
