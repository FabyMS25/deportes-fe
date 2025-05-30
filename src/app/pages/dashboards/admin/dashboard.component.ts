import { Component, OnInit } from '@angular/core';
import { ToastService } from './toast-service';
import { ChartType } from './dashboard.model';
import { Reserva } from 'src/app/core/models/reserva.models';
import Swal from 'sweetalert2';
import { ReservaService } from 'src/app/core/services/api/reserva.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})

export class DashboardComponent implements OnInit {

  userData: any;

  // currentDate: any;

    analyticsChart!: any;
    loading: boolean = true;

    num: number = 0;
    option = {
    startVal: this.num,
    useEasing: true,
    duration: 2,
    decimalPlaces: 2,
    };
    constructor(private reservasService: ReservaService,
        public toastService: ToastService) {
    // var date = new Date();
    // var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    // var lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    // this.currentDate = { from: firstDay, to: lastDay }
  }

  async ngOnInit() {
    const userString = window.sessionStorage.getItem('currentUser');
    this.userData = userString ? JSON.parse(userString) : null;
    if (sessionStorage.getItem('toast')) {
      this.toastService.show('¡Bienvenido!, Inicio de sesión exitoso', { classname: 'bg-success text-center text-white', delay: 5000 });
      sessionStorage.removeItem('toast');
    }
    try {
      await this.getReservations();
      this.setRevenueValue('all');
      this.filteredReservations = this.processReservations('Year');
      this._StackedColumnChart()
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
    const filteredReservations = this.reservationsList.filter(reservation => reservation.estadoReserva === 'Pagado');
    let startDate: Date;
    let endDate: Date;
    switch (filter) {
      case 'Today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
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
        startDate = new Date(now.setMonth(0, 1));
        endDate = new Date(now.setMonth(11, 31));
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
        const complexId = reservation.canchasDto.complejoDto.uuid;
        if (complexId) {
          if (!acc[complexId]) {
            acc[complexId] = {
              complexName: reservation.canchasDto.complejoDto.nombre,
              total:0,
              totalIncome: 0
            };
          }
          acc[complexId].totalIncome += reservation.totalPago;
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
  totalCancellations : number = 0;
  totalIncome: number = 0;
  conversionRatio: number = 0;//succesfull reservations
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
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 6, 1);
        temp = this.filterReservations(startDate, endDate);
        break;
      case '1A':
        startDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1);
        temp = this.filterReservations(startDate, endDate);
        break;
      default:
        temp = this.reservationsList;
    }
    this.initChart(value,temp);
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
    const monthlyData  = {
      reservas: new Array(12).fill(0),
      ingresos: new Array(12).fill(0),
      cancelaciones: new Array(12).fill(0),
    };
    const monthNameToIndex: { [key: string]: number } = {
      'Ene': 0, 'Feb': 1, 'Mar': 2, 'Abr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Ago': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dic': 11
    };
    reservas.forEach((reserva: Reserva) => {
      const month = new Date(reserva.fechaReserva).getMonth();
      monthlyData.reservas[month]++;
      if (reserva.estadoReserva === 'Pagado') {
        monthlyData.ingresos[month] += reserva.totalPago;
      }
      if (reserva.estadoReserva === 'Anulado' || reserva.estadoReserva === 'Vencido') {
        monthlyData.cancelaciones[month]++;
      }
    });
    const alignedData = {
      reservas: [] as number[],
      ingresos: [] as number[],
      cancelaciones: [] as number[],
    };
    labels.forEach((label) => {
      const monthIndex = monthNameToIndex[label];
      if (monthIndex !== undefined) {
        alignedData.reservas.push(monthlyData.reservas[monthIndex]);
        alignedData.ingresos.push(monthlyData.ingresos[monthIndex]);
        alignedData.cancelaciones.push(monthlyData.cancelaciones[monthIndex]);
      } else {
        alignedData.reservas.push(0);
        alignedData.ingresos.push(0);
        alignedData.cancelaciones.push(0);
      }
    });
    // Calculate totals for display
    this.totalReservations = alignedData.reservas.reduce((acc, curr) => acc + curr, 0);
    this.totalIncome = alignedData.ingresos.reduce((acc, curr) => acc + curr, 0);
    this.totalCancellations  = alignedData.cancelaciones.reduce((acc, curr) => acc + curr, 0);
    this.conversionRatio = this.totalReservations > 0 ? ((this.totalReservations -this.totalCancellations ) / this.totalReservations) * 100 : 0;

    return alignedData;
  }
  private getLabels(value:string): string[] {
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

  private initChart(value:string, list:any[]) {
    const colors = this.getChartColorsArray('["--vz-success","--vz-primary",  "--vz-danger"]');
    const labels = this.getLabels(value);
    const monthlyData = this.processMonthlyData(list, labels);
    this.analyticsChart = {
      series: [
        {
          name: "Reservas",
          type: "area",
          data: monthlyData.reservas,
        },
        {
          name: "Ingresos",
          type: "bar",
          data: monthlyData.ingresos,
        },
        {
          name: "Cancelaciones",
          type: "line",
          data: monthlyData.cancelaciones,
        },
      ],
      xaxis: {
        categories: labels,
        axisTicks: { show: false },
        axisBorder: { show: true },
      },
      yaxis: [
        { title: { text: "Reservas" } },
        { opposite: true, title: { text: "Ingresos" } },
      ],
      colors: colors ,
      chart: {
          type: "line",
          height: 370,
            toolbar: { show: true },
            style: {direction: 'rtl'}
      },
      stroke: {
        curve: "straight",
        dashArray: [0, 0, 8],
        width: [2, 0, 2.2],
      },
      fill: { opacity: [0.5, 0.9, 1],},
      markers: {
        size: [0, 0, 0],
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
        // position: "top",
        horizontalAlign: "center",
        offsetX: 0,
        // offsetY: -5,
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
    };
  }
  // Chart Colors Set
  private getChartColorsArray(colors:any) {
    colors = JSON.parse(colors);
    return colors.map(function (value:any) {
      var newValue = value.replace(" ", "");
      if (newValue.indexOf(",") === -1) {
        var color = getComputedStyle(document.documentElement).getPropertyValue(newValue);
            if (color) {
            color = color.replace(" ", "");
            return color;
            }
            else return newValue;;
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
 * Stacked Column Charts
 */
  StackedColumnChart: any;
    private _StackedColumnChart() {
      const colors = this.getChartColorsArray('["--vz-primary", "--vz-success", "--vz-warning", "--vz-danger"]');
      const labels = this.getLabels('6M');
      // const monthlyData = this.processMonthlyData(list, labels);
      this.StackedColumnChart = {
        series: [{
          name: "PRODUCT A",
          data: [44, 55, 41, 67, 22, 43],
        },
        {
          name: "PRODUCT B",
          data: [13, 23, 20, 8, 13, 27],
        },
        {
          name: "PRODUCT C",
          data: [11, 17, 15, 15, 21, 14],
        },
        {
          name: "PRODUCT D",
          data: [21, 7, 25, 13, 22, 8],
        },
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
        },],
        plotOptions: {
          bar: {
            horizontal: false,
            borderRadius: 10,
          },
        },
        xaxis: {
          // type: "datetime",
          categories:labels,
        },
        legend: {
          position: "right",
          offsetY: 40,
        },
        fill: {
          opacity: 1,
        },
        colors: colors,
      };
    }

/* API Services */
  private async getReservations() {
    try {
      this.loading = true;
      const data: any = await this.reservasService.getAll().toPromise();
      if (data['status'] === 'OK') {
        this.reservationsList = data.payload;
        // this.setRevenueValue('todo');
        // this.filteredReservations = this.processReservations('Year');
      } else {
        Swal.fire({ text: data.status, confirmButtonColor: '#299cdb' });
      }
    } catch (error) {
      console.error('Error al obtener las reservas:', error);
      Swal.fire({ text: 'Error al obtener las reservas', icon: 'error', confirmButtonColor: '#299cdb' });
    } finally {
      this.loading = false;
    }
  }

}
