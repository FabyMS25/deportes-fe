import { Component, OnInit } from '@angular/core';
import { ToastService } from './toast-service';

import { circle, latLng, tileLayer } from 'leaflet';

// import { BestSelling, Recentelling, TopSelling, nftfeaturedData, nftpopularData, nftrecentData, nfttopCollectionData, statData } from 'src/app/core/data';
import { ChartType } from './dashboard.model';
import { featuredModel, popularModel, recentModel, topCollectionModel } from './nft.model';
import { interval, map } from 'rxjs';
import { Reserva } from 'src/app/core/models/reserva.models';
import Swal from 'sweetalert2';
import { ReservaService } from 'src/app/core/services/api/reserva.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})

/**
 * Ecommerce Component
 */
export class DashboardComponent implements OnInit {

  userData: any;

  statData!: any;
  currentDate: any;

    analyticsChart!: ChartType;
    reservationsList: Reserva[] = [];
    loading: boolean = true;

    constructor(private reservasService: ReservaService,
        public toastService: ToastService) {
    var date = new Date();
    var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    var lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    this.currentDate = { from: firstDay, to: lastDay }
  }

  ngOnInit(): void {
    this.getReservations();
    const userString = window.sessionStorage.getItem('currentUser');
    this.userData =userString ? JSON.parse(userString) : null;

    if (sessionStorage.getItem('toast')) {
      this.toastService.show('Logged in Successfull.', { classname: 'bg-success text-center text-white', delay: 5000 });
      sessionStorage.removeItem('toast');
    }
        
  }

  
        num: number = 0;
        option = {
        startVal: this.num,
        useEasing: true,
        duration: 2,
        decimalPlaces: 2,
        };


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
    console.log("dates", startDate , endDate)
    // Filter reservations based on the date range
    const groupedByComplex: Record<string, any> = filteredReservations.reduce((acc, reservation) => {
      const reservationDate = new Date(reservation.fechaReserva);
      if (reservationDate >= startDate && reservationDate <= endDate) {
        const complexId = reservation.canchasDto.complejoDto.uuid;
        if (complexId) {
          if (!acc[complexId]) {
            acc[complexId] = {
              complexName: reservation.canchasDto.complejoDto.nombre,
              totalIncome: 0
            };
          }
          acc[complexId].totalIncome += reservation.totalPago;
        }
      }
      return acc;
    }, {} as Record<string, any>);

    const result = Object.values(groupedByComplex);  
    result.sort((a, b) => b.totalIncome - a.totalIncome);
    console.log(result);
    return result;
  }

  /**
 * Reservations Analytics Chart
 */
  private temp: Reserva[] = [];
  setRevenueValue(value: string) {
    const currentDate = new Date();
    let startDate: Date;
    let endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);  
    switch (value) {
      case 'all':
        this.temp = this.reservationsList;
        break;
      case '1M':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        this.temp = this.filterReservations(startDate, endDate);
        break;
      case '6M':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 6, 1);
        this.temp = this.filterReservations(startDate, endDate);
        break;
      case '1A':
        startDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1);
        this.temp = this.filterReservations(startDate, endDate);
        break;
      default:
        this.temp = this.reservationsList;
    }
    this.initChart(value); 
  }
  private filterReservations(startDate: Date, endDate: Date): Reserva[] {
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999); 
    return this.reservationsList.filter(reserva => {
      const reservaDate = new Date(reserva.fechaReserva);
      return reservaDate >= startDate && reservaDate <= endDate;
    });
  }
  
  reservasTotal: number = 0;
  ingresosTotal: number = 0;
  cancelacionesTotal: number = 0;
  conversionRatio: number = 0;

//   option: any; // Your CountUp options
  private initChart(value:string) {
    const labels = this.getLabels(value);
    const monthlyData = this.processMonthlyData(this.temp, labels);
       // Calculate totals for display
       this.reservasTotal = monthlyData.reservas.reduce((acc, curr) => acc + curr, 0);
       this.ingresosTotal = monthlyData.ingresos.reduce((acc, curr) => acc + curr, 0);
       this.cancelacionesTotal = monthlyData.cancelaciones.reduce((acc, curr) => acc + curr, 0);
       
       // Calculate conversion ratio (example formula, modify as needed)
       this.conversionRatio = this.reservasTotal > 0 ? (this.cancelacionesTotal / this.reservasTotal) * 100 : 0;
   
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
      chart: {
        height: 370,
        type: "line",
        toolbar: { show: false },
        style: {direction: 'rtl'}
      },
      stroke: {
        curve: "straight",
        dashArray: [0, 0, 8],
        width: [2, 0, 2.2],
      },
      colors: [ '#c0c8fc','#687cfe', '#ff7f5d'],//this.getChartColorsArray('["--vz-light", "--vz-primary", "--vz-secondary"]'),//
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
          top: 0,
          right: -2,
          bottom: 15,
          left: 10,
        },
      },
      legend: {
        show: true,
        horizontalAlign: "center",
        offsetX: 0,
        offsetY: -5,
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
      if (reserva.estadoReserva === 'Anulado') {
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

  /**
  * Sale Location Map
  */
  options = {
    layers: [
      tileLayer("https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoidGhlbWVzYnJhbmQiLCJhIjoiY2xmbmc3bTV4MGw1ejNzbnJqOWpubzhnciJ9.DNkdZVKLnQ6I9NOz7EED-w", {
        id: "mapbox/light-v9",
        tileSize: 512,
        zoomOffset: 0,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      })
    ],
    zoom: 1.1,
    center: latLng(28, 1.5)
  };
  layers = [
    circle([41.9, 12.45], { color: "#435fe3", opacity: 0.5, weight: 10, fillColor: "#435fe3", fillOpacity: 1, radius: 400000, }),
    circle([12.05, -61.75], { color: "#435fe3", opacity: 0.5, weight: 10, fillColor: "#435fe3", fillOpacity: 1, radius: 400000, }),
    circle([1.3, 103.8], { color: "#435fe3", opacity: 0.5, weight: 10, fillColor: "#435fe3", fillOpacity: 1, radius: 400000, }),
  ];

  
/* API Services */
  private async getReservations() {
    try {
      this.loading = true;
      const data: any = await this.reservasService.getAll().toPromise();
      if (data['status'] === 'OK') {
        this.reservationsList = data.payload;
        this.setRevenueValue('todo'); 
        this.filteredReservations = this.processReservations('Year');
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
