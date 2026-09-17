import { Component, OnInit } from '@angular/core';
import { ToastService } from './toast-service';
import { ChartType } from './dashboard.model';
import { Reserva } from 'src/app/core/models/reserva.model';
import Swal from 'sweetalert2';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { EstadoReserva, EstadoValidacion, StatusUtils } from 'src/app/core/constants/Estados';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { take } from 'rxjs';
import { Pago } from 'src/app/core/models/pago.model';
import { PagoService } from 'src/app/core/services/api/pago.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})

export class DashboardComponent implements OnInit {
  readonly EstadoReserva = EstadoReserva;

  private readonly successfulReservationStates: EstadoReserva[] = [
    EstadoReserva.PAGADA,
    EstadoReserva.COMPLETADA,
    EstadoReserva.EN_CURSO
  ];

  private readonly revenueReservationStates: EstadoReserva[] = [
    EstadoReserva.PAGADA,
    EstadoReserva.COMPLETADA,
    EstadoReserva.EN_CURSO,
    EstadoReserva.NO_SHOW
  ];

  userData: any;
  loading: boolean = true;

  analyticsChart!: any;
  selectedRevenueRange: string = 'all';
  num: number = 0;
  option = {
    startVal: this.num,
    useEasing: true,
    duration: 2,
    decimalPlaces: 2,
  };

  constructor(    
    private route: ActivatedRoute,
    private router: Router,
    public toastService: ToastService,
    private reservasService: ReservaService,
    private pagosService: PagoService,
    private authService: AuthenticationService
  ) {}

  async ngOnInit() {
    this.userData = this.authService.currentUser();
    const pendingLoginEvent = this.authService.consumeLoginEvent();
    if (pendingLoginEvent) {
      this.toastService.showLoginStatus(pendingLoginEvent);
    } else {
      this.authService.loginEvent$
      .pipe(take(1))
      .subscribe(event => {
        this.toastService.showLoginStatus(event);
      });
    }
    try {
      await Promise.all([this.getReservations(), this.getPayments()]);
      this.setRevenueValue(this.selectedRevenueRange);
      this.filteredReservations = this.processReservations('Year');
      this._GestionActualCharts();
      this._StackedColumnChart();
    } catch (error) {
      console.error('Error during initialization:', error);
    }
  }


  /**
   * Incomes By Complex Chart
   */
  filteredReservations: any[] = [];
  
  onDateRangeChange(range: string): void {
    this.filteredReservations = this.processReservations(range);
  }

  processReservations(filter: string): any[] {
    const now = new Date();

    let startDate: Date;
    let endDate: Date;

    switch (filter) {
      case 'Today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'Weekly':
        const dayOfWeek = now.getDay();
        const diffToMonday = (dayOfWeek + 6) % 7;
        startDate = new Date(now);
        startDate.setDate(now.getDate() - diffToMonday);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'Monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'Year':
        startDate = new Date(now.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;

      default:
        startDate = new Date(0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
    }

    const groupedByComplex: Record<string, any> = this.paymentsList.reduce((acc, payment) => {
      const paymentDate = this.getPaymentDate(payment);

      if (paymentDate && paymentDate >= startDate && paymentDate <= endDate) {
        const reservation = payment.reservaDto;
        const complexId = reservation?.campoDeportivoDto?.complejoDto?.uuid;

        if (complexId) {
          if (!acc[complexId]) {
            acc[complexId] = {
              complexName: reservation.campoDeportivoDto!.complejoDto!.nombre,
              total: 0,
              totalIncome: 0
            };
          }

          acc[complexId].totalIncome += this.getPaymentAmount(payment);
          acc[complexId].total += 1;
        }
      }

      return acc;
    }, {} as Record<string, any>);

    const result = Object.values(groupedByComplex);
    result.sort((a, b) => b.totalIncome - a.totalIncome);
    return result;
  }
  private isRevenueReservation(reserva: Reserva): boolean {
    return this.revenueReservationStates.includes(reserva.estadoReserva);
  }

  private isSuccessfulReservation(reserva: Reserva): boolean {
    return this.successfulReservationStates.includes(reserva.estadoReserva);
  }
  /**
   * Reservations Analytics Chart
   */
  reservationsList: Reserva[] = [];
  paymentsList: Pago[] = [];
  totalReservations: number = 0;
  totalCancellations: number = 0;
  totalIncome: number = 0;
  conversionRatio: number = 0;
  totalPending: number = 0;
  totalRejected: number = 0;
  totalCompleted: number = 0;
  totalNoShow: number = 0;
  gestionActualChart: any;
  gestionEstadosChart: any;
  gestionRangeLabel: string = '';
  gestionTotalReservations: number = 0;
  gestionSuccessfulReservations: number = 0;
  gestionTotalIncome: number = 0;
  gestionPendingReservations: number = 0;
  gestionFailedReservations: number = 0;
  gestionSuccessRate: number = 0;

  setRevenueValue(value: string) {
    this.selectedRevenueRange = value;
    const currentDate = new Date();
    let temp: Reserva[] = [];
    let tempPayments: Pago[] = [];
    let startDate: Date;
    let endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    switch (value) {
      case 'all':
        temp = this.reservationsList;
        tempPayments = this.paymentsList;
        break;

      case '1M':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        temp = this.filterReservations(startDate, endDate);
        tempPayments = this.filterPayments(startDate, endDate);
        break;

      case '6M':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 5, 1);
        temp = this.filterReservations(startDate, endDate);
        tempPayments = this.filterPayments(startDate, endDate);
        break;

      case '1A':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 11, 1);
        temp = this.filterReservations(startDate, endDate);
        tempPayments = this.filterPayments(startDate, endDate);
        break;

      default:
        temp = this.reservationsList;
        tempPayments = this.paymentsList;
    }
    this.initChart(value, temp, tempPayments);
  }

  private filterReservations(startDate: Date, endDate: Date): Reserva[] {
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    return this.reservationsList.filter(reserva => {
      const reservaDate = new Date(reserva.fechaReserva);
      return reservaDate >= startDate && reservaDate <= endDate;
    });
  }

  private filterPayments(startDate: Date, endDate: Date): Pago[] {
    return this.paymentsList.filter(payment => {
      const paymentDate = this.getPaymentDate(payment);
      return !!paymentDate && paymentDate >= startDate && paymentDate <= endDate;
    });
  }

private processMonthlyData(reservas: Reserva[], labels: string[], payments: Pago[]) {
  const monthlyData = {
    totalReservas: new Array(12).fill(0),
    pagadas: new Array(12).fill(0),
    completadas: new Array(12).fill(0),
    enCurso: new Array(12).fill(0),
    confirmadas: new Array(12).fill(0),
    pendientes: new Array(12).fill(0),
    canceladas: new Array(12).fill(0),
    rechazadas: new Array(12).fill(0),
    expiradas: new Array(12).fill(0),
    noShow: new Array(12).fill(0),
    ingresos: new Array(12).fill(0),
  };

    const monthNameToIndex: { [key: string]: number } = {
      'Ene': 0, 'Feb': 1, 'Mar': 2, 'Abr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Ago': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dic': 11
    };
  reservas.forEach((reserva: Reserva) => {
    const month = new Date(reserva.fechaReserva).getMonth();
    monthlyData.totalReservas[month]++;

    switch (reserva.estadoReserva) {
      case EstadoReserva.PAGADA:
        monthlyData.pagadas[month]++;
        break;

      case EstadoReserva.COMPLETADA:
        monthlyData.completadas[month]++;
        break;

      case EstadoReserva.EN_CURSO:
        monthlyData.enCurso[month]++;
        break;

      case EstadoReserva.SOLICITADA:
        monthlyData.confirmadas[month]++;
        break;

      case EstadoReserva.PENDIENTE:
        monthlyData.pendientes[month]++;
        break;

      case EstadoReserva.CANCELADA:
        monthlyData.canceladas[month]++;
        break;

      case EstadoReserva.EXPIRADA:
        monthlyData.expiradas[month]++;
        break;

      case EstadoReserva.NO_SHOW:
        monthlyData.noShow[month]++;
        break;
    }
  });

  payments.forEach(payment => {
    const paymentDate = this.getPaymentDate(payment);
    if (paymentDate) {
      monthlyData.ingresos[paymentDate.getMonth()] += this.getPaymentAmount(payment);
    }
  });


    const alignedData = {
      totalReservas: [] as number[],
      pagadas: [] as number[],
      completadas: [] as number[],
      enCurso: [] as number[],
      confirmadas: [] as number[],
      pendientes: [] as number[],
      canceladas: [] as number[],
      rechazadas: [] as number[],
      expiradas: [] as number[],
      noShow: [] as number[],
      ingresos: [] as number[],
    };

    labels.forEach((label) => {
      const monthIndex = monthNameToIndex[label];
      if (monthIndex !== undefined) {
        alignedData.totalReservas.push(monthlyData.totalReservas[monthIndex]);
        alignedData.pagadas.push(monthlyData.pagadas[monthIndex]);
        alignedData.completadas.push(monthlyData.completadas[monthIndex]);
        alignedData.enCurso.push(monthlyData.enCurso[monthIndex]);
        alignedData.confirmadas.push(monthlyData.confirmadas[monthIndex]);
        alignedData.pendientes.push(monthlyData.pendientes[monthIndex]);
        alignedData.canceladas.push(monthlyData.canceladas[monthIndex]);
        alignedData.rechazadas.push(monthlyData.rechazadas[monthIndex]);
        alignedData.expiradas.push(monthlyData.expiradas[monthIndex]);
        alignedData.noShow.push(monthlyData.noShow[monthIndex]);
        alignedData.ingresos.push(monthlyData.ingresos[monthIndex]);
      } else {
        alignedData.totalReservas.push(0);
        alignedData.pagadas.push(0);
        alignedData.completadas.push(0);
        alignedData.enCurso.push(0);
        alignedData.confirmadas.push(0);
        alignedData.pendientes.push(0);
        alignedData.canceladas.push(0);
        alignedData.rechazadas.push(0);
        alignedData.expiradas.push(0);
        alignedData.noShow.push(0);
        alignedData.ingresos.push(0);
      }
    });
    this.totalReservations = alignedData.totalReservas.reduce((acc, curr) => acc + curr, 0);
    const totalSuccessful =
      alignedData.pagadas.reduce((acc, curr) => acc + curr, 0) +
      alignedData.completadas.reduce((acc, curr) => acc + curr, 0) +
      alignedData.enCurso.reduce((acc, curr) => acc + curr, 0);
    this.totalIncome = alignedData.ingresos.reduce((acc, curr) => acc + curr, 0);
    this.totalCancellations = alignedData.canceladas.reduce((acc, curr) => acc + curr, 0) +
                             alignedData.expiradas.reduce((acc, curr) => acc + curr, 0);
    this.totalPending = alignedData.pendientes.reduce((acc, curr) => acc + curr, 0);
    this.totalRejected = alignedData.rechazadas.reduce((acc, curr) => acc + curr, 0);
    this.totalCompleted = totalSuccessful;
    this.totalNoShow = alignedData.noShow.reduce((acc, curr) => acc + curr, 0);
    
    const totalProcessed = totalSuccessful + this.totalCancellations + this.totalRejected + this.totalNoShow;
    this.conversionRatio = totalProcessed > 0 
      ? (totalSuccessful / totalProcessed) * 100 
      : 0;

    return alignedData;
  }

  private getLabels(value: string): string[] {
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const currentDate = new Date();
    let labels: string[] = [];

    switch (value) {
      case '1M':
        labels = [monthNames[currentDate.getMonth()]];
        break;

      case '6M':
        for (let i = 5; i >= 0; i--) {
          const month = (currentDate.getMonth() - i + 12) % 12;
          labels.push(monthNames[month]);
        }
        break;

      case '1A':
        for (let i = 11; i >= 0; i--) {
          const month = (currentDate.getMonth() - i + 12) % 12;
          labels.push(monthNames[month]);
        }
        break;

      default:
        labels = monthNames;
    }
 
    return labels;
  }

  private initChart(value: string, list: any[], payments: Pago[]) {
    const colors = [
      this.getThemeColor('primary'),
      this.getStatusThemeColor(EstadoReserva.COMPLETADA),
      this.getThemeColor('info'),
      this.getStatusThemeColor(EstadoReserva.CANCELADA),
      this.getStatusThemeColor(EstadoReserva.PENDIENTE),
      this.getStatusThemeColor(EstadoReserva.NO_SHOW)
    ];
    const labels = this.getLabels(value);
    const monthlyData = this.processMonthlyData(list, labels, payments);

    this.analyticsChart = {
      series: [
        {
          name: "Total Reservas",
          type: "column",
          data: monthlyData.totalReservas,
        },
        {
          name: "Reservas Exitosas",
          type: "line",
          data: monthlyData.pagadas.map(
            (val, idx) => val + monthlyData.completadas[idx] + monthlyData.enCurso[idx]
          ),
        },
        {
          name: "Ingresos (Bs)",
          type: "area",
          data: monthlyData.ingresos,
        },
        {
          name: "Canceladas/Expiradas",
          type: "line",
          data: monthlyData.canceladas.map((val, idx) => val + monthlyData.expiradas[idx]),
        },
        {
          name: "Pendientes",
          type: "line",
          data: monthlyData.pendientes,
        },
        {
          name: "No Show",
          type: "line",
          data: monthlyData.noShow,
        },
      ],
      xaxis: {
        categories: labels,
        axisTicks: { show: false },
        axisBorder: { show: true },
      },
      yaxis: [
        {
          seriesName: "Total Reservas",
          title: { text: "Reservas" },
          labels: {
            formatter: function(val: number) {
              return Math.floor(val);
            }
          }
        },
        {
          seriesName: "Reservas Exitosas",
          show: false
        },
        { 
          seriesName: "Ingresos (Bs)",
          opposite: true, 
          title: { text: "Ingresos (Bs)" },
          labels: {
            formatter: function(val: number) {
              return 'Bs ' + val.toFixed(0);
            }
          }
        },
      ],
      colors: colors,
      chart: {
        type: "line",
        height: 370,
        toolbar: { show: true },
        animations: { enabled: false },
      },
      stroke: {
        curve: "straight",
        dashArray: [0, 0, 0, 8, 8, 8],
        width: [0, 2.4, 2, 2.2, 2, 2],
      },
      fill: { 
        opacity: [0.9, 1, 0.35, 1, 1, 1],
      },
      markers: {
        size: [0, 0, 0, 0, 0, 0],
        strokeWidth: 2,
        hover: {
          size: 4,
        },
      },
      grid: {
        show: true,
        xaxis: {
          lines: {
            show: true,
          },
        },
        yaxis: {
          lines: {
            show: false,
          },
        },
        padding: {
          top: 2,
          right: -2,
          bottom: 5,
          left: 10,
        },
      },
      legend: {
        show: true,
        horizontalAlign: "center",
        offsetX: 0,
        markers: {
          width: 9,
          height: 9,
          radius: 6,
        },
        itemMargin: {
          horizontal: 10,
          vertical: 0,
        },
      },
      plotOptions: {
        bar: {
          columnWidth: "30%",
          barHeight: "70%",
        },
      },
      dataLabels: { enabled: false },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: function(val: number, opts: any) {
            if (opts.seriesIndex === 2) {
              return "Bs " + val.toFixed(2);
            }
            return Math.floor(val) + " reservas";
          }
        }
      }
    };
  }

  private _GestionActualCharts(): void {
    const gestionReservas = this.getGestionActualReservations();
    const gestionPayments = this.getGestionActualPayments();
    const monthLabels = this.getGestionActualLabels();
    const monthlyData = this.processGestionMonthlyData(gestionReservas, monthLabels, gestionPayments);
    const statusData = this.processGestionStatusData(gestionReservas);
    const successfulReservations = gestionReservas.filter(reserva => this.isSuccessfulReservation(reserva));
    const processedReservations = gestionReservas.filter(reserva =>
      [
        EstadoReserva.PAGADA,
        EstadoReserva.COMPLETADA,
        EstadoReserva.EN_CURSO,
        EstadoReserva.CANCELADA,
        EstadoReserva.EXPIRADA,
        EstadoReserva.NO_SHOW
      ].includes(reserva.estadoReserva)
    );

    this.gestionRangeLabel = this.getGestionRangeLabel();
    this.gestionTotalReservations = gestionReservas.length;
    this.gestionSuccessfulReservations = successfulReservations.length;
    this.gestionTotalIncome = gestionPayments.reduce((sum, payment) => sum + this.getPaymentAmount(payment), 0);
    this.gestionPendingReservations = gestionReservas.filter(reserva =>
      [EstadoReserva.SOLICITADA, EstadoReserva.PENDIENTE].includes(reserva.estadoReserva)
    ).length;
    this.gestionFailedReservations = gestionReservas.filter(reserva =>
      [EstadoReserva.CANCELADA, EstadoReserva.EXPIRADA, EstadoReserva.NO_SHOW].includes(reserva.estadoReserva)
    ).length;
    this.gestionSuccessRate = processedReservations.length > 0
      ? (successfulReservations.length / processedReservations.length) * 100
      : 0;

    this.gestionActualChart = {
      series: [
        {
          name: "Total Reservas",
          type: "column",
          data: monthlyData.totalReservas
        },
        {
          name: "Reservas Exitosas",
          type: "line",
          data: monthlyData.reservasExitosas
        },
        {
          name: "Ingresos (Bs)",
          type: "area",
          data: monthlyData.ingresos
        }
      ],
      chart: {
        height: 380,
        type: "line",
        toolbar: { show: true },
        animations: { enabled: false }
      },
      stroke: {
        width: [0, 3, 2],
        curve: "smooth"
      },
      plotOptions: {
        bar: {
          columnWidth: "35%",
          borderRadius: 4
        }
      },
      fill: {
        opacity: [0.9, 1, 0.25],
        type: ["solid", "solid", "gradient"],
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.05,
          stops: [0, 90, 100]
        }
      },
      colors: this.getChartColorsArray('["--vz-primary","--vz-success","--vz-info"]'),
      labels: monthLabels,
      xaxis: {
        categories: monthLabels,
        axisTicks: { show: false },
        axisBorder: { show: true }
      },
      yaxis: [
        {
          seriesName: "Total Reservas",
          title: { text: "Reservas" },
          labels: {
            formatter: function(val: number) {
              return Math.floor(val).toString();
            }
          }
        },
        {
          seriesName: "Reservas Exitosas",
          show: false,
          labels: {
            formatter: function(val: number) {
              return Math.floor(val).toString();
            }
          }
        },
        {
          seriesName: "Ingresos (Bs)",
          opposite: true,
          title: { text: "Ingresos (Bs)" },
          labels: {
            formatter: function(val: number) {
              return "Bs " + val.toFixed(0);
            }
          }
        }
      ],
      dataLabels: { enabled: false },
      legend: {
        position: "top",
        horizontalAlign: "center"
      },
      grid: {
        borderColor: "#f1f1f1"
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: function(val: number, opts: any) {
            if (opts.seriesIndex === 2) {
              return "Bs " + val.toFixed(2);
            }
            return Math.floor(val) + " reservas";
          }
        }
      }
    };

    this.gestionEstadosChart = {
      series: statusData.series,
      chart: {
        height: 380,
        type: "donut",
        animations: { enabled: false }
      },
      labels: statusData.labels,
      colors: statusData.colors,
      legend: {
        position: "bottom"
      },
      dataLabels: {
        enabled: true,
        formatter: function(_val: number, opts: any) {
          return opts.w.config.series[opts.seriesIndex];
        }
      },
      plotOptions: {
        pie: {
          donut: {
            size: "68%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "Reservas",
                formatter: function(w: any) {
                  return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toString();
                }
              }
            }
          }
        }
      },
      tooltip: {
        y: {
          formatter: function(val: number) {
            return val + " reservas";
          }
        }
      },
      responsive: [{
        breakpoint: 480,
        options: {
          chart: { height: 320 },
          legend: { position: "bottom" }
        }
      }]
    };
  }

  private getGestionActualReservations(): Reserva[] {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), 0, 1);
    const endDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return this.reservationsList.filter(reserva => {
      const reservaDate = new Date(reserva.fechaReserva);
      return reservaDate >= startDate && reservaDate <= endDate;
    });
  }

  private getGestionActualPayments(): Pago[] {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), 0, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    return this.filterPayments(startDate, endDate);
  }

  private getPaymentDate(payment: Pago): Date | null {
    if (!payment?.fechaPago) return null;
    const raw = String(payment.fechaPago);
    const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDate) {
      return new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
    }
    const parsed = new Date(payment.fechaPago);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private getPaymentAmount(payment: Pago): number {
    const amount = Number(payment?.montoPagado);
    return Number.isFinite(amount) ? amount : 0;
  }

  private getGestionActualLabels(): string[] {
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const currentMonth = new Date().getMonth();
    return monthNames.slice(0, currentMonth + 1);
  }

  private processGestionMonthlyData(reservas: Reserva[], labels: string[], payments: Pago[]) {
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const totalReservas = new Array(labels.length).fill(0);
    const reservasExitosas = new Array(labels.length).fill(0);
    const ingresos = new Array(labels.length).fill(0);

    reservas.forEach((reserva: Reserva) => {
      const reservaDate = new Date(reserva.fechaReserva);
      const labelIndex = labels.indexOf(monthNames[reservaDate.getMonth()]);

      if (labelIndex === -1) {
        return;
      }

      totalReservas[labelIndex]++;

      if (this.isSuccessfulReservation(reserva)) {
        reservasExitosas[labelIndex]++;
      }

    });

    payments.forEach(payment => {
      const paymentDate = this.getPaymentDate(payment);
      if (!paymentDate) return;
      const labelIndex = labels.indexOf(monthNames[paymentDate.getMonth()]);
      if (labelIndex !== -1) {
        ingresos[labelIndex] += this.getPaymentAmount(payment);
      }
    });

    return {
      totalReservas,
      reservasExitosas,
      ingresos
    };
  }

  private processGestionStatusData(reservas: Reserva[]) {
    const statusOrder = [
      EstadoReserva.SOLICITADA,
      EstadoReserva.PENDIENTE,
      EstadoReserva.PAGADA,
      EstadoReserva.EN_CURSO,
      EstadoReserva.COMPLETADA,
      EstadoReserva.CANCELADA,
      EstadoReserva.EXPIRADA,
      EstadoReserva.NO_SHOW
    ];
    const statusCounts = statusOrder.reduce((acc, estado) => {
      acc[estado] = 0;
      return acc;
    }, {} as Record<string, number>);

    reservas.forEach((reserva: Reserva) => {
      if (statusCounts[reserva.estadoReserva] !== undefined) {
        statusCounts[reserva.estadoReserva]++;
      }
    });

    const activeStatuses = statusOrder.filter(estado => statusCounts[estado] > 0);

    return {
      labels: activeStatuses.length > 0
        ? activeStatuses.map(estado => StatusUtils.getReservationStatusLabel(estado, true))
        : ["Sin datos"],
      series: activeStatuses.length > 0 ? activeStatuses.map(estado => statusCounts[estado]) : [0],
      colors: activeStatuses.length > 0 ? activeStatuses.map(estado => this.getStatusThemeColor(estado)) : [this.getThemeColor('secondary')]
    };
  }

  private getGestionRangeLabel(): string {
    const now = new Date();
    const currentDay = now.getDate().toString().padStart(2, '0');
    const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    return `01/01/${now.getFullYear()} - ${currentDay}/${currentMonth}/${now.getFullYear()}`;
  }

  private getStatusThemeColor(status: EstadoReserva | string): string {
    return this.getThemeColor(StatusUtils.getStatusColor(status));
  }

  getStatusTextClass(status: EstadoReserva | string): string {
    return StatusUtils.getStatusTextClass(status);
  }

  private getThemeColor(colorName: string): string {
    const cssValue = getComputedStyle(document.documentElement).getPropertyValue(`--vz-${colorName}`);
    return cssValue ? cssValue.replace(" ", "") : colorName;
  }

  private getChartColorsArray(colors: any) {
    colors = JSON.parse(colors);
    return colors.map(function (value: any) {
      var newValue = value.replace(" ", "");
      if (newValue.indexOf(",") === -1) {
        var color = getComputedStyle(document.documentElement).getPropertyValue(newValue);
        if (color) {
          color = color.replace(" ", "");
          return color;
        }
        else return newValue;
      } else {
        var val = value.split(',');
        if (val.length == 2) {
          var rgbaColor = getComputedStyle(document.documentElement).getPropertyValue(val[0]);
          rgbaColor = "rgba(" + rgbaColor + "," + val[1] + ")";
          return rgbaColor;
        } else {
          return newValue;
        }
      }
    });
  }

  /**
   * Stacked Column Charts - Estados por Complejo
   */
  StackedColumnChart: any;

  private _StackedColumnChart() {
    const colors = [
      this.getStatusThemeColor(EstadoReserva.COMPLETADA),
      this.getStatusThemeColor(EstadoReserva.PENDIENTE),
      this.getStatusThemeColor(EstadoReserva.CANCELADA)
    ];
    const labels = this.getLabels('6M');
    const topComplexes = this.processReservations('6M').slice(0, 4);
    const successfulSeries = {
      name: "Exitosas (Pagadas/Completadas/En Curso)",
      data: topComplexes.map(complex => 
        this.getComplexStatusData(complex.complexName, labels, this.successfulReservationStates)
      )
    };

    const pendingSeries = {
      name: "Pendientes/Solicitadas",
      data: topComplexes.map(complex => 
        this.getComplexStatusData(complex.complexName, labels, [EstadoReserva.PENDIENTE, EstadoReserva.SOLICITADA])
      )
    };

    const cancelledSeries = {
      name: "Canceladas/Expiradas/No Show",
      data: topComplexes.map(complex => 
        this.getComplexStatusData(complex.complexName, labels, [EstadoReserva.CANCELADA, EstadoReserva.EXPIRADA, EstadoReserva.NO_SHOW])
      )
    };

    this.StackedColumnChart = {
      series: topComplexes.length > 0 ? [
        successfulSeries,
        pendingSeries,
        cancelledSeries
      ] : [
        { name: "Sin datos", data: [] }
      ],
      chart: {
        type: "bar",
        height: 350,
        stacked: true,
        animations: { enabled: false },
        toolbar: {
          show: true,
        },
        zoom: {
          enabled: true,
        },
      },
      responsive: [{
        breakpoint: 480,
        options: {
          legend: {
            position: "bottom",
            offsetX: -10,
            offsetY: 0,
          },
        },
      }],
      plotOptions: {
        bar: {
          horizontal: false,
          borderRadius: 10,
          dataLabels: {
            total: {
              enabled: true,
              style: {
                fontSize: '13px',
                fontWeight: 900
              }
            }
          }
        },
      },
      xaxis: {
        categories: topComplexes.map(c => c.complexName),
        labels: {
          rotate: -45,
          rotateAlways: true,
          trim: true,
          maxHeight: 120
        }
      },
      yaxis: {
        title: {
          text: 'Número de Reservas'
        }
      },
      legend: {
        position: "top",
        offsetY: 0,
      },
      fill: {
        opacity: 1,
      },
      colors: colors,
      tooltip: {
        y: {
          formatter: function(val: number) {
            return val + " reservas";
          }
        }
      }
    };
  }

  private getComplexStatusData(complexName: string, labels: string[], statuses: EstadoReserva[]): number {
    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 5, 1);
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    return this.reservationsList
      .filter(reserva => {
        const reservaDate = new Date(reserva.fechaReserva);
        return statuses.includes(reserva.estadoReserva) &&
               reserva.campoDeportivoDto?.complejoDto?.nombre === complexName &&
               reservaDate >= startDate && reservaDate <= endDate;
      })
      .length;
  }

  /* API Services */
  private async getPayments() {
    try {
      this.paymentsList = await this.pagosService.getAll().toPromise() || [];
    } catch (error) {
      Swal.fire({
        text: 'Error al obtener los pagos para calcular los ingresos',
        icon: 'error',
        confirmButtonColor: '#299cdb'
      });
      throw error;
    }
  }

  private async getReservations() {
    try {
      this.loading = true;
      const allReservations = await this.getAllPages(0, []);
      this.reservationsList = allReservations;
    } catch (error) {
      Swal.fire({
        text: 'Error al obtener las reservas',
        icon: 'error',
        confirmButtonColor: '#299cdb'
      });
    } finally {
      this.loading = false;
    }
  }

  private async getAllPages(page: number, accumulatedData: any[]): Promise<any[]> {
    const data: any = await this.reservasService.getAll(page, 20).toPromise();
    if (data) {
      const newData = accumulatedData.concat(data.content);
      const pageInfo = data;
      if (!pageInfo.last) {
        return this.getAllPages(page + 1, newData);
      } else {
        return newData;
      }
    } else {
      console.error('Error en la respuesta de la API', data);
      return accumulatedData;
    }
  }
}
