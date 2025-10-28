import { Component, ElementRef, ViewChild } from '@angular/core';
import { Spanish } from 'flatpickr/dist/l10n/es.js';
import { ComplejoDeportivo } from 'src/app/core/models/complejoDeportivo.model';
import { ComplejosService } from 'src/app/core/services/api/conplejos.service';
import { ReportsService } from 'src/app/core/services/api/reportes.service';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent {

  breadCrumbItems!: Array<{}>;
  title = 'Reservas';
  showLoading: boolean = false; 

  date!: { from: Date, to: Date };
  Spanish = Spanish; 
  
  complejosList: ComplejoDeportivo[] = []
  reportType: string = 'puntual';
  status: string = 'TODO';
  paymentType: string = 'TODO';
  cancha: string = 'TODO'; // Add cancha filter
  
  reportTypes = [
    { value: 'puntual', label: 'Reservas Puntuales' },
    { value: 'recurrente', label: 'Reservas Recurrentes' }
  ];

  statusOptions = [
    { value: 'TODO', label: 'Todos los estados' },
    { value: 'Pendiente', label: 'Pendiente' },
    { value: 'Pagado', label: 'Pagado' },
    { value: 'Vencido', label: 'Vencido' },
    { value: 'Anulado', label: 'Anulado' }
  ];

  paymentTypeOptions = [
    { value: 'TODO', label: 'Todos los tipos' },
    { value: 'por_hora', label: 'Por Hora' },
    { value: 'por_persona', label: 'Por Persona' },
    { value: 'por_evento', label: 'Por Evento' },
    { value: 'por_sesion', label: 'Por Sesión' },
    { value: 'mensualidad', label: 'Mensualidad' },
    { value: 'por_club', label: 'Por Club' }
  ];

  @ViewChild('pdfViewer') pdfViewer!: ElementRef;

  constructor(
    private reportsService: ReportsService, 
    private complejoService: ComplejosService
  ) {}

  async ngOnInit() {    
    this.breadCrumbItems = [
      { label: 'Reportes' },
      { label: this.title, active: true }
    ];      
    this.getComplejos();  
  }

  applyFilters() {
    if (!this.date || !this.date.from || !this.date.to) {
      alert('Por favor seleccione un rango de fechas');
      return;
    }

    const fechaIni = this.formatDateToDDMMYYYY(new Date(this.date.from));
    const fechaFin = this.formatDateToDDMMYYYY(new Date(this.date.to));
    
    this.showLoading = true;

    if (this.reportType === 'puntual') {
      this.generatePuntualesReport(fechaIni, fechaFin);
    } else {
      this.generateRecurrentesReport(fechaIni, fechaFin);
    }
  }

  private formatDateToDDMMYYYY(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private generatePuntualesReport(fechaIni: string, fechaFin: string) {
    this.reportsService.getPuntualReport(
      fechaIni, 
      fechaFin, 
      this.paymentType, 
      this.status,
      this.cancha // Send cancha parameter
    ).subscribe(
      (data: ArrayBuffer) => {
        this.displayPDF(data);
        this.showLoading = false;
      },
      (error) => {
        console.error('Error generating reservas report:', error);
        this.showLoading = false;
        alert('Error al generar el reporte de reservas');
      }
    );
  }

  private generateRecurrentesReport(fechaIni: string, fechaFin: string) {
    this.reportsService.getRecurrentReport(
      fechaIni, 
      fechaFin, 
      this.paymentType, 
      this.status,
      this.cancha // Send cancha parameter
    ).subscribe(
      (data: ArrayBuffer) => {
        this.displayPDF(data);
        this.showLoading = false;
      },
      (error) => {
        console.error('Error generating recurrentes report:', error);
        this.showLoading = false;
        alert('Error al generar el reporte de recurrentes');
      }
    );
  }

  private displayPDF(data: ArrayBuffer) {
    const file = new Blob([data], { type: 'application/pdf' });
    const fileURL = URL.createObjectURL(file);
    this.pdfViewer.nativeElement.data = fileURL;
  }

  getStatusLabel(statusValue: string): string {
    const option = this.statusOptions.find(opt => opt.value === statusValue);
    return option ? option.label : statusValue;
  }

  getPaymentTypeLabel(paymentValue: string): string {
    const option = this.paymentTypeOptions.find(opt => opt.value === paymentValue);
    return option ? option.label : paymentValue;
  }

  getCanchaLabel(canchaValue: string): string {
    if (canchaValue === 'TODO') return 'Todos los complejos';
    const complejo = this.complejosList.find(c => c.nombre === canchaValue);
    return complejo ? complejo.nombre : canchaValue;
  }

  private getComplejos() {
    this.complejoService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.complejosList = data.payload;
        }
      },
      error: (error) => {
        console.error('Error loading complejos:', error);
      }
    });
  }
}