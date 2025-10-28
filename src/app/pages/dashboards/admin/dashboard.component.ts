import { Component, OnInit } from '@angular/core';
import { ToastService } from './toast-service';
import { ChartType } from './dashboard.model';
import { Reserva } from 'src/app/core/models/reserva.models';
import Swal from 'sweetalert2';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { EstadoReserva, EstadoValidacion } from 'src/app/core/constants/Estados';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})

export class DashboardComponent implements OnInit {

  userData: any;
  analyticsChart!: any;
  loading: boolean = true;

  num: number = 0;
  option = {
    startVal: this.num,
    useEasing: true,
    duration: 2,
    decimalPlaces: 2,
  };

  constructor(
    private reservasService: ReservaService,
    public toastService: ToastService
  ) {}

  async ngOnInit() {
    const userString = window.sessionStorage.getItem('currentUser');
    this.userData = userString ? JSON.parse(userString) : null;
    
    if (sessionStorage.getItem('toast')) {
      this.toastService.show('¡Bienvenido!, Inicio de sesión exitoso', { 
        classname: 'bg-success text-center text-white', 
        delay: 5000 
      });
      sessionStorage.removeItem('toast');
    }
    
    try {
      await this.getReservations();
      this.setRevenueValue('all');
      this.filteredReservations = this.processReservations('Year');
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
    const filteredReservations = this.reservationsList.filter(
      reservation => reservation.estadoReserva === EstadoReserva.PAGADA
    );
    
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

    const groupedByComplex: Record<string, any> = filteredReservations.reduce((acc, reservation) => {
      const reservationDate = new Date(reservation.fechaReserva);
      
      if (reservationDate >= startDate && reservationDate <= endDate) {
        const complexId = reservation.campoDeportivoDto?.complejoDto?.uuid;
        
        if (complexId) {
          if (!acc[complexId]) {
            acc[complexId] = {
              complexName: reservation.campoDeportivoDto.complejoDto.nombre,
              total: 0,
              totalIncome: 0
            };
          }
          acc[complexId].totalIncome += reservation.montoTotal;
          acc[complexId].total += 1;
        }
      }
      return acc;
    }, {} as Record<string, any>);

    const result = Object.values(groupedByComplex);
    result.sort((a, b) => b.totalIncome - a.totalIncome);
    return result;
  }

  /**
   * Reservations Analytics Chart
   */
  reservationsList: Reserva[] = [];
  totalReservations: number = 0;
  totalCancellations: number = 0;
  totalIncome: number = 0;
  conversionRatio: number = 0;
  totalPending: number = 0;
  totalRejected: number = 0;
  totalCompleted: number = 0;
  totalNoShow: number = 0;

  setRevenueValue(value: string) {
    const currentDate = new Date();
    let temp: Reserva[] = [];
    let startDate: Date;
    let endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    switch (value) {
      case 'all':
        temp = this.reservationsList;
        break;

      case '1M':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        temp = this.filterReservations(startDate, endDate);
        break;

      case '6M':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 5, 1);
        temp = this.filterReservations(startDate, endDate);
        break;

      case '1A':
        startDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1);
        temp = this.filterReservations(startDate, endDate);
        break;

      default:
        temp = this.reservationsList;
    }

    this.initChart(value, temp);
  }

  private filterReservations(startDate: Date, endDate: Date): Reserva[] {
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    return this.reservationsList.filter(reserva => {
      const reservaDate = new Date(reserva.fechaReserva);
      return reservaDate >= startDate && reservaDate <= endDate;
    });
  }

  private processMonthlyData(reservas: Reserva[], labels: string[]) {
    const monthlyData = {
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
      switch (reserva.estadoReserva) {
        case EstadoReserva.PAGADA:
          monthlyData.pagadas[month]++;
          monthlyData.ingresos[month] += reserva.montoTotal;
          break;
        case EstadoReserva.COMPLETADA:
          monthlyData.completadas[month]++;
          monthlyData.ingresos[month] += reserva.montoTotal;
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
        case EstadoReserva.RECHAZADA:
          monthlyData.rechazadas[month]++;
          break;
        case EstadoReserva.EXPIRADA:
          monthlyData.expiradas[month]++;
          break;
        case EstadoReserva.NO_SHOW:
          monthlyData.noShow[month]++;
          break;
      }
    });

    const alignedData = {
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
    this.totalReservations = alignedData.pagadas.reduce((acc, curr) => acc + curr, 0) +
                            alignedData.completadas.reduce((acc, curr) => acc + curr, 0);
    this.totalIncome = alignedData.ingresos.reduce((acc, curr) => acc + curr, 0);
    this.totalCancellations = alignedData.canceladas.reduce((acc, curr) => acc + curr, 0) +
                             alignedData.expiradas.reduce((acc, curr) => acc + curr, 0);
    this.totalPending = alignedData.pendientes.reduce((acc, curr) => acc + curr, 0);
    this.totalRejected = alignedData.rechazadas.reduce((acc, curr) => acc + curr, 0);
    this.totalCompleted = alignedData.completadas.reduce((acc, curr) => acc + curr, 0);
    this.totalNoShow = alignedData.noShow.reduce((acc, curr) => acc + curr, 0);
    
    const totalProcessed = this.totalReservations + this.totalCancellations + this.totalRejected + this.totalNoShow;
    this.conversionRatio = totalProcessed > 0 
      ? (this.totalReservations / totalProcessed) * 100 
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

  private initChart(value: string, list: any[]) {
    const colors = this.getChartColorsArray('["--vz-success","--vz-primary","--vz-danger","--vz-warning","--vz-info"]');
    const labels = this.getLabels(value);
    const monthlyData = this.processMonthlyData(list, labels);

    this.analyticsChart = {
      series: [
        {
          name: "Reservas Exitosas",
          type: "area",
          data: monthlyData.pagadas.map((val, idx) => val + monthlyData.completadas[idx]),
        },
        {
          name: "Ingresos (Bs)",
          type: "bar",
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
          title: { text: "Cantidad" },
          labels: {
            formatter: function(val: number) {
              return Math.floor(val);
            }
          }
        },
        { 
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
      },
      stroke: {
        curve: "straight",
        dashArray: [0, 0, 8, 8, 8],
        width: [2, 0, 2.2, 2, 2],
      },
      fill: { 
        opacity: [0.5, 0.9, 1, 1, 1],
      },
      markers: {
        size: [0, 0, 0, 0, 0],
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
            if (opts.seriesIndex === 1) {
              return "Bs " + val.toFixed(2);
            }
            return Math.floor(val) + " reservas";
          }
        }
      }
    };
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
    const colors = this.getChartColorsArray('["--vz-success", "--vz-warning", "--vz-danger", "--vz-info"]');
    const labels = this.getLabels('6M');
    const topComplexes = this.processReservations('6M').slice(0, 4);
    const successfulSeries = {
      name: "Exitosas (Pagadas/Completadas)",
      data: topComplexes.map(complex => 
        this.getComplexStatusData(complex.complexName, labels, ['PAGADA', 'COMPLETADA'])
      )
    };

    const pendingSeries = {
      name: "Pendientes/Confirmadas",
      data: topComplexes.map(complex => 
        this.getComplexStatusData(complex.complexName, labels, ['PENDIENTE', 'CONFIRMADA'])
      )
    };

    const cancelledSeries = {
      name: "Canceladas/Expiradas",
      data: topComplexes.map(complex => 
        this.getComplexStatusData(complex.complexName, labels, ['CANCELADA', 'EXPIRADA', 'NO_SHOW'])
      )
    };

    const rejectedSeries = {
      name: "Rechazadas",
      data: topComplexes.map(complex => 
        this.getComplexStatusData(complex.complexName, labels, ['RECHAZADA'])
      )
    };

    this.StackedColumnChart = {
      series: topComplexes.length > 0 ? [
        successfulSeries,
        pendingSeries,
        cancelledSeries,
        rejectedSeries
      ] : [
        { name: "Sin datos", data: [] }
      ],
      chart: {
        type: "bar",
        height: 350,
        stacked: true,
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

  private getComplexStatusData(complexName: string, labels: string[], statuses: string[]): number {
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
  private async getReservations() {
    try {
      this.loading = true;
      const data: any = await this.reservasService.getAll().toPromise();      
      if (data['status'] === 'OK') {
        this.reservationsList = data.payload.content;
      } else {
        console.warn('Unexpected status:', data.status);
      }
    } catch (error) {
      console.error('Error al obtener las reservas:', error);
      Swal.fire({ 
        text: 'Error al obtener las reservas', 
        icon: 'error', 
        confirmButtonColor: '#299cdb' 
      });
    } finally {
      this.loading = false;
    }
  }
}