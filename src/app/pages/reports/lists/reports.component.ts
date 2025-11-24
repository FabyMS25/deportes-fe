import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Spanish } from 'flatpickr/dist/l10n/es.js';
import { ComplejoDeportivo } from 'src/app/core/models/complejoDeportivo.model';
import { ComplejosService } from 'src/app/core/services/api/conplejos.service';
import { ReportsService } from 'src/app/core/services/api/reportes.service';
import { EstadoReserva } from 'src/app/core/constants/Estados';
import { OrganizacionService } from 'src/app/core/services/api/organizacion.service';
import { EstudianteEscuelaService } from 'src/app/core/services/api/estudianteEscuela.service';
import { Organizacion } from 'src/app/core/models/organizacion.models';
import { EstudianteEscuela } from 'src/app/core/models/EstudianteEscuela.model';
import { TipoOrganizacion } from 'src/app/core/constants/Features';
import { TipoCobro } from 'src/app/core/constants/TipoCobro';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ListReportComponent implements OnInit {

  breadCrumbItems!: Array<{}>;
  title = 'Reporte';
  showLoading: boolean = false; 

  date!: { from: Date, to: Date };
  Spanish = Spanish; 
  
  complejosList: ComplejoDeportivo[] = [];
  organizationsEscuelasList: Organizacion[]=[];
  estudiantesList: EstudianteEscuela[]=[];
  reportType: string = 'mensual';
  status: string = 'TODO';
  paymentType: string = 'TODO';
  cancha: string = 'TODO';
  escuelita: string = 'TODO';
  estudiante: string = 'TODO';
  matricula: string = '';
  
  statusOptions = [
    { value: 'TODO', label: 'Todos los estados' },
    { value: EstadoReserva.BORRADOR, label: 'Borrador' },
    { value: EstadoReserva.SOLICITADA, label: 'Solicitada' },
    { value: EstadoReserva.PENDIENTE, label: 'Pendiente' },
    { value: EstadoReserva.PAGADA, label: 'Pagada' },
    { value: EstadoReserva.EN_CURSO, label: 'En Curso' },
    { value: EstadoReserva.COMPLETADA, label: 'Completada' },
    { value: EstadoReserva.CANCELADA, label: 'Cancelada' },
    { value: EstadoReserva.RECHAZADA, label: 'Rechazada' },
    { value: EstadoReserva.EXPIRADA, label: 'Expirada' },
    { value: EstadoReserva.NO_SHOW, label: 'No Show' }
  ];
  reportTypeOptions = [
    { value: 'mensual', label: 'Reservas Mensuales' },
    { value: 'puntual', label: 'Reservas Puntuales' },
    { value: 'recurrente', label: 'Reservas Recurrentes' }
  ];

  paymentTypeOptions = TipoCobro

  @ViewChild('pdfViewer') pdfViewer!: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private reportsService: ReportsService, 
    private complejoService: ComplejosService,
    private organizationService: OrganizacionService,
    private estudianteEscuelaService: EstudianteEscuelaService
  ) {}

  async ngOnInit() {    
    this.route.paramMap.subscribe(params => {
      const tipoReporte = params.get('tipoReporte');
      if (tipoReporte && ['mensual', 'puntual', 'recurrente'].includes(tipoReporte)) {
        this.reportType = tipoReporte;
        this.updateTitle();
      }
    });
    this.breadCrumbItems = [
      { label: 'Reportes' },
      { label: this.title, active: true }
    ];      
    this.getComplejos();  
    this.getEscuelas(TipoOrganizacion.ESCUELA_MUNICIPAL);
    this.getEstudiantes();
  }

  private updateTitle() {
    switch (this.reportType) {
      case 'puntual':
        this.title = 'Reservas Puntuales';
        break;
      case 'recurrente':
        this.title = 'Reservas Recurrentes';
        break;
      case 'mensual':
      default:
        this.title = 'Reservas Mensuales';
        break;
    }
    this.breadCrumbItems = [
      { label: 'Reportes' },
      { label: this.title, active: true }
    ];
  }

  applyFilters() {
    if (!this.date || !this.date.from || !this.date.to) {
      alert('Por favor seleccione un rango de fechas');
      return;
    }
    const fechaIni = this.formatDateToDDMMYYYY(new Date(this.date.from));
    const fechaFin = this.formatDateToDDMMYYYY(new Date(this.date.to));
    this.showLoading = true;
    switch (this.reportType) {
      case 'puntual':
        this.generatePuntualesReport(fechaIni, fechaFin);
        break;
      case 'recurrente':
        this.generateRecurrentesReport(fechaIni, fechaFin);
        break;
      case 'mensual':
        this.generateMensualesReport(fechaIni, fechaFin);
        break;
      default:
        this.generateMensualesReport(fechaIni, fechaFin);
        break;
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
      this.cancha
    ).subscribe(
      (data: ArrayBuffer) => {
        this.displayPDF(data);
        this.showLoading = false;
      },
      (error) => {
        console.error('Error generating reservas report:', error);
        this.showLoading = false;
        alert('Error al generar el reporte de reservas puntuales');
      }
    );
  }

  private generateRecurrentesReport(fechaIni: string, fechaFin: string) {
    this.reportsService.getRecurrentReport(
      fechaIni, 
      fechaFin, 
      this.paymentType, 
      this.status,
      this.cancha
    ).subscribe(
      (data: ArrayBuffer) => {
        this.displayPDF(data);
        this.showLoading = false;
      },
      (error) => {
        console.error('Error generating recurrentes report:', error);
        this.showLoading = false;
        alert('Error al generar el reporte de reservas recurrentes');
      }
    );
  }

  private generateMensualesReport(fechaIni: string, fechaFin: string) {
    const shouldUseStudentReport = this.shouldUseStudentMonthlyReport();    
    if (shouldUseStudentReport) {
      this.generateStudentMonthlyReport(fechaIni, fechaFin);
    } else {
      this.generateGeneralMonthlyReport(fechaIni, fechaFin);
    }
  }

  private generateGeneralMonthlyReport(fechaIni: string, fechaFin: string) {
    this.reportsService.getMonthlyReport(
      fechaIni, 
      fechaFin, 
      this.status,
      this.escuelita
    ).subscribe(
      (data: ArrayBuffer) => {
        this.displayPDF(data);
        this.showLoading = false;
      },
      (error) => {
        console.error('Error generating mensuales report:', error);
        this.showLoading = false;
        alert('Error al generar el reporte de reservas mensuales');
      }
    );
  }

  private generateStudentMonthlyReport(fechaIni: string, fechaFin: string) {
    const matriculaParam = this.matricula.trim() || 'TODO';
    this.reportsService.getStudentMonthlyReport(
      fechaIni, 
      fechaFin, 
      this.status,
      matriculaParam,
      this.estudiante
    ).subscribe(
      (data: ArrayBuffer) => {
        this.displayPDF(data);
        this.showLoading = false;
      },
      (error) => {
        console.error('Error generating student mensuales report:', error);
        this.showLoading = false;
        alert('Error al generar el reporte de reservas mensuales por estudiante');
      }
    );
  }

  private shouldUseStudentMonthlyReport(): boolean {
    return this.estudiante !== 'TODO' || this.matricula.trim() !== '';
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

  getReportTypeLabel(): string {
    const option = this.reportTypeOptions.find(opt => opt.value === this.reportType);
    return option ? option.label : this.reportType;
  }

  getCanchaLabel(canchaValue: string): string {
    if (canchaValue === 'TODO') return 'Todos los complejos';
    const complejo = this.complejosList.find(c => c.nombre === canchaValue);
    return complejo ? complejo.nombre : canchaValue;
  }

  getEscuelitaLabel(escuelitaValue: string): string {
    if (escuelitaValue === 'TODO') return 'Todas las Escuelas';
    const option = this.organizationsEscuelasList.find((opt) => opt.nombre === escuelitaValue);
    return option ? option.nombre : escuelitaValue;
  }

  getEstudianteLabel(estudianteValue: string): string {
    if (estudianteValue === 'TODO') return 'Todos los estudiantes';
    const estudiante:any = this.estudiantesList.find(e => e.nombreCompleto === estudianteValue);
    return estudiante ? estudiante.nombreCompleto : estudianteValue;
  }

  getMatriculaLabel(): string {
    if (!this.matricula.trim()) return 'Todas las matrículas';
    return this.matricula;
  }

  onEstudianteChange() {
    if (this.estudiante !== 'TODO') {
      const selectedEstudiante = this.estudiantesList.find(e => e.nombreCompleto === this.estudiante);
      if (selectedEstudiante) {
        this.matricula = selectedEstudiante.matricula;
      }
    } else {
      this.matricula = '';
    }
  }

  onMatriculaInput() {
    if (this.matricula.trim()) {
      const selectedEstudiante:any = this.estudiantesList.find(e => e.matricula === this.matricula.trim());
      if (selectedEstudiante) {
        this.estudiante = selectedEstudiante.nombreCompleto;
      } else {
        this.estudiante = 'TODO';
      }
    } else {
      this.estudiante = 'TODO';
    }
  }

  clearMatricula() {
    this.matricula = '';
    this.estudiante = 'TODO';
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

  private getEscuelas(type:string) {
    this.organizationService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          const list = data.payload.content
          this.organizationsEscuelasList = list.filter((item:Organizacion)=>
            item.tipoOrganizacion === TipoOrganizacion.ESCUELA_MUNICIPAL
          );
        }
      },
      error: (error) => {
        console.error('Error loading complejos:', error);
      }
    });
  }

  private getEstudiantes() {
    this.estudianteEscuelaService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.estudiantesList = data.payload;
        }
      },
      error: (error) => {
        console.error('Error loading estudiantes:', error);
      }
    });
  }
}