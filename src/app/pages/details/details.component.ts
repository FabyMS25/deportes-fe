import { Component, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, UntypedFormBuilder, UntypedFormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { SlickCarouselComponent } from 'ngx-slick-carousel';
import Swal from 'sweetalert2';
import * as L from 'leaflet';
import { debounceTime, firstValueFrom, switchMap } from 'rxjs';

import { ModalComponent } from '../reservas/modal/modal.component';
import { campoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { HorariosService } from 'src/app/core/services/api/horarios.service';
import { Complejo } from 'src/app/core/models/complejo.model';
import { CamposDeportivoService } from 'src/app/core/services/api/camposDeportivos.service';
import { Reserva } from 'src/app/core/models/reserva.models';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { Contribuyente } from 'src/app/core/models/contribuyente.models';
import { RuatRequestsService } from 'src/app/core/services/ruat/ruatRequest.service';
import { Tarifa } from 'src/app/core/models/tarifa.model';
import { ContribuyentesService } from 'src/app/core/services/api/contribuyentes.service';
import { addDays, subDays, startOfWeek, endOfWeek } from 'date-fns'; // Assuming you're using date-fns or you can manually implement it

@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss']
})


export class DetailsComponent implements OnInit  {

  breadCrumbItems!: Array<{}>;
  private timerId:any;
  currentTime!: string;
  
  contribuyente : any;
  dataComplejo!:Complejo;
  dataField!:campoDeportivo
  tariff!:Tarifa;  

  fieldsList:any[]=[];
  contribuyentesList: Contribuyente[] = [];
  reservesList: Reserva[] = [];

  submitted = false;
  InvoiceForm!: FormGroup;
  public FCollapsed = true;
  public CCollapsed = true;

  @ViewChild('slickModal') slickModal!: SlickCarouselComponent;
  imagesList=['assets/images/fields/img-1.png','assets/images/fields/img-2.png',
    'assets/images/fields/img-3.png','assets/images/fields/img-4.png']

  constructor(private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private fieldService: CamposDeportivoService,
    private reservaService: ReservaService,
    private route: ActivatedRoute ,
    private ruatService: RuatRequestsService,
    private contribuyenteService: ContribuyentesService
  
  ) { }

  /**
 * Swiper setting
 */
  config = {
    infinite: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    arrows: false
  };
  slidesConfig = {
    infinite: true,
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: true,
  }
  
  currentWeekStart: Date= new Date();
  currentWeekEnd: Date = new Date();
  weekDays: { name: string, date: Date }[] = [];
  activeDayName: string = '';
  allSlots: { [key: string]: { morningSlots: string[], afternoonSlots: string[] } } = {};

  async ngOnInit(): Promise<void> {
    this.breadCrumbItems = [
      { label: 'Complejo' },
      { label: 'Reserva', active: true }
    ];
    
    this.updateTime();
    this.timerId = setInterval(() => this.updateTime(), 1000);
    this.authRuat();
    if (window.sessionStorage.getItem("auth-token") === 'isContribuyente') {
      const currentUser = window.sessionStorage.getItem("currentUser");
      this.contribuyente = currentUser ? JSON.parse(currentUser) : null;
    }else{    
      this.contribuyente = null;
      this.getTaxpayers();
    }
  
    this.dataComplejo = history.state.data;  
    if (this.dataComplejo) {
      this.initMap(this.dataComplejo.latitud, this.dataComplejo.longitud);
    }
  
    try {
      const data: any = await firstValueFrom(this.fieldService.getByComplejo(this.dataComplejo));
      if (data?.status === 'OK') {
        this.fieldsList = data.payload;
        if (this.fieldsList.length>0) {
          this.setField(this.fieldsList[0], this.fieldsList[0].tarifasDtoList[0]);
        }        
      } else {
        this.notify('No se encontraron canchas en este Complejo','error');
      }
    } catch (error) {
      console.error('Error fetching fields:', error);
    }  
    // Initialize the form
    this.InvoiceForm = this.formBuilder.group({
      uuid: [''],
      categoria: [''],
      superficie: [''],
      totalPersonas: [],
      fechaCreated: [new Date()], 
      fechaReserva: [new Date(), [Validators.required]], 
      horaEntrada: [, [Validators.required, this.timeValidator.bind(this)]],
      horaSalida: [, [Validators.required, this.timeValidator.bind(this)]],
      totalPago: [0, [Validators.required]],
      totalTime: [0, [Validators.required]],
      numeroTasa: [''],
      estadoReserva: ['Pendiente'],
      canchasDto: ['', [Validators.required]],
      contribuyenteDto: [this.contribuyente, [Validators.required]],
      observacion: ['Reserva de Cancha Deportiva GAMQ', [Validators.required]], 
      check: [, [Validators.required]],
    });
  
    if (this.dataField) {
      this.setField(this.dataField,undefined);
      this.goToToday();
    }  

    this.InvoiceForm.get('fechaReserva')?.valueChanges.subscribe(() => {
      const date = this.InvoiceForm.get('fechaReserva')?.value;
      this.allSlots={}
      this.setWeekRange(date);
    });  
    this.InvoiceForm.valueChanges.pipe(debounceTime(300)).subscribe(() => {
      const { horaEntrada, horaSalida } = this.InvoiceForm.controls;
      if (horaEntrada.valid && horaSalida.valid) {
        this.calculateTotalTimeAndPago();
      }
    });
    this.InvoiceForm.get('totalPersonas')?.valueChanges.subscribe(() => {
      this.calculateTotalTimeAndPago();
    });
  }
  
  goToToday() {
    this.allSlots={}
    const today = new Date();
    this.setWeekRange(today);
    this.setSelectedDay(today);
  }
  moveWeek(direction: number) {
    this.allSlots={}
    const newStartDate = direction > 0 
      ? addDays(this.currentWeekStart, 7) 
      : subDays(this.currentWeekStart, 7);
    this.setWeekRange(newStartDate);
  }
  setSelectedDay(date: Date) {
    if (this.InvoiceForm) {
      this.InvoiceForm.patchValue({
        fechaReserva: date
      });
    }
  }
  private setWeekRange(date: Date) {
    this.currentWeekStart = startOfWeek(date, { weekStartsOn: 1 });
    this.currentWeekEnd = endOfWeek(date, { weekStartsOn: 1 });  
    const daysOfWeek = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
    this.weekDays = daysOfWeek.map((name, index) => ({
      name,
      date: addDays(this.currentWeekStart, index)
    }));
    const dayDayName = daysOfWeek[date.getDay() - 1] || 'lun'; 
    this.activeDayName = dayDayName.toLowerCase();
    // this.getTimeSlotsForDay(date);
  }

  get form() {
    return this.InvoiceForm.controls;
  }

  setField(field: any, tarifa:any | undefined) {
    this.dataField = field;
    this.tariff = tarifa? tarifa :field.tarifasDtoList[0];
    if(this.tariff.categoriaDtoList[0].categoriaDto.tipo === 'Evento'){    
      this.setReserve(this.tariff.desde,this.tariff.hasta)    
    }else{
      if(!tarifa){
        this.setReserve(this.tariff.desde, this.tariff.hasta)
      }
    }    
    this.getReservationsByField(field.uuid)
    this.allSlots={}
    if (this.InvoiceForm) {
      this.InvoiceForm.patchValue({
        canchasDto: field,
        superficie: field.superficieDto.descripcion,
        categoria: this.tariff.categoriaDtoList
            .map(categoria => categoria.categoriaDto.nombre).join(', ')
      });
    }
  }
  setReserve(start: string, end:string) {
    if (this.InvoiceForm) {
      this.InvoiceForm.patchValue({
        horaEntrada: start,
        horaSalida: end,
      });
    }
  }
  
  timetables!:any[];
  getTimeSlotsForDay(date: Date) {
    // const date = this.InvoiceForm.get('fechaReserva')?.value;
    const dayString = date ? new Date(date).toLocaleString('es-ES', { weekday: 'long' }).toLowerCase() : '';
    // const dayString = this.formatDateKey(date); // Use a formatted string (e.g., '2024-09-02') as the key
    if (!this.allSlots[dayString]) {
      this.setSelectedDay(date)
      console.log(date)
      console.log(dayString)
      const morningSlots = this.getTimeSlots(dayString, 'morning');
      const afternoonSlots = this.getTimeSlots(dayString, 'afternoon');
      this.allSlots[dayString] = { morningSlots, afternoonSlots };
    }  
    return this.allSlots[dayString];
  }
  
  // Helper method to format Date as a string key (e.g., '2024-09-02')
  private formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2); // Month is 0-based, so add 1
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }
  

  getTimeSlots(day: string,period:string): string[] {
    const horariosAtencion: any[] = this.dataField.horarioDtoList;    
    this.timetables = horariosAtencion.filter(horario => (horario.dia.toLowerCase() === day.toLowerCase() && horario.abierto));
    if (this.timetables.length === 0) {
      return [];
    }
    const availableSlots = [];
    const morningSlots:string[] = [];
    const afternoonSlots:string[] = [];
    for (const horario of this.timetables) {
        const startTime = horario.horaInicio > this.tariff.desde ? this.tariff.desde : horario.horaInicio;
        const endTime = horario.horaFin >this.tariff.hasta ? this.tariff.hasta : horario.horaFin ;        
        for (let hour = this.getTime(startTime); hour < this.getTime(endTime); hour++) {
          const horarioStr = `${this.pad(hour)}:00 - ${this.pad(hour + 1)}:00`;
          const timeSlot = horarioStr
          if (hour < 12) {
            morningSlots.push(timeSlot);
          } else {
            afternoonSlots.push(timeSlot);
          }
          availableSlots.push(timeSlot);
        }
    }
    if(period === 'morning') return morningSlots;
    if(period === 'afternoon') return afternoonSlots;
    return availableSlots;
  }

  isEvent(cancha:any):boolean{
    const result = cancha.tarifasDtoList.every((tar:any) => tar.categoriaDtoList[0].categoriaDto.tipo === 'Evento')
    // if(result){
    //   const start = this.tarifa.desde? this.tarifa.desde: ''
    //   const end = this.tarifa.hasta? this.tarifa.hasta: ''
    //   this.reserve(start,end)
    // }
    return result;
  }
  
  isAvailable(slot: string): boolean {
    const fechaReserva = this.InvoiceForm.get('fechaReserva')?.value;
    let [slotStart, slotEnd] = slot.split(' - ');
    slotStart = `${slotStart}:00`;
    slotEnd = `${slotEnd}:00`;
    return !this.reservationsList.some((reservation: any) => {
      const reservationStart = reservation.horaEntrada;
      const reservationEnd = reservation.horaSalida;
      const reservationDate = new Date(reservation.fechaReserva);
      return (
        reservationDate.getDate() === fechaReserva.getDate() &&
        (slotStart >= reservationStart && slotStart < reservationEnd) 
      );
    });
  }
  
  timeValidator(control: AbstractControl): ValidationErrors | null {
    const time = control.value;
    if (!time) return null;

    const fechaReserva = this.InvoiceForm.get('fechaReserva')?.value || new Date();
    // const selectedDay = fechaReserva.toLocaleString('es-ES', { weekday: 'long' });  
    // const timetables = this.horariosAtencion.filter(horario => horario.dia === selectedDay && horario.activo);
    
    if (!this.timetables) return null;

    const [hours, minutes] = time.split(':').map(Number);      

    const start = this.getTime(this.timetables[0].horaInicio);
    const end = this.getTime(this.timetables[0].horaFin);

    if (this.timetables.length > 1) {
      const startT = this.getTime(this.timetables[1].horaInicio);
      const endT = this.getTime(this.timetables[1].horaFin);  
      if ((hours < start) || (hours > endT) ||
          (hours > end && hours < startT) ||
          (hours === end && minutes > 0) ||
          (hours === endT && minutes > 0)
      ) {
        return { invalidTime: true };
      }
    } else {
      if ((hours < start) || (hours > end) || (hours === end && minutes > 0)) {
        return { invalidTime: true };
      }
    }
    return null;
  }

  calculateTotalTimeAndPago() {
    if(this.tariff.categoriaDtoList[0].categoriaDto.tipo === 'Evento'){
      const totalTime = `allDay`;
      const totalPago = this.tariff.costo;      
      this.InvoiceForm.patchValue({
        totalTime,
        totalPago,
      });
    }else{
      const horaEntrada = this.InvoiceForm.get('horaEntrada')?.value;
      const horaSalida = this.InvoiceForm.get('horaSalida')?.value;
      if (horaEntrada && horaSalida) {
        const [entradaHours, entradaMinutes] = horaEntrada.split(':').map(Number);
        const [salidaHours, salidaMinutes] = horaSalida.split(':').map(Number);

        const entradaDate = new Date();
        entradaDate.setHours(entradaHours, entradaMinutes, 0);
        const salidaDate = new Date();
        salidaDate.setHours(salidaHours, salidaMinutes, 0);

        const diffMs = salidaDate.getTime() - entradaDate.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        const totalTime = `${this.pad(diffHours)}:${this.pad(diffMinutes)}`;        
    
        if(this.tariff.categoriaDtoList[0].categoriaDto.tipo === 'Persona'){
          const personas = this.InvoiceForm.get('totalPersonas')?.value;
          const totalPago = this.tariff.costo*personas;          
          this.InvoiceForm.patchValue({
            totalTime,
            totalPago,
          });
        }else{
          const totalPago = ((diffHours + diffMinutes / 60) * this.tariff.costo).toFixed(2);
          this.InvoiceForm.patchValue({
            totalTime,
            totalPago
          });
        }
      }
    }
  }
  pad(num: number): string {
    return num < 10 ? '0' + num : num.toString();
  }


  /**
   * Open modal
   * @param content modal content
  **/
  openScheduleModal(content: any) {
    this.submitted = false;
    this.modalService.open(content, { size: 'md', centered: true });
  }
  
  saveData(): void {
    this.submitted = true;
    if (this.InvoiceForm.valid) {
      this.InvoiceForm.enable();
      const formData = {...this.InvoiceForm.value};
      const ruatData = {
        codigoContribuyente: formData.contribuyenteDto.codigoContribuyente,
        monto: formData.totalPago,
        observacion: formData.observacion
        // codigoClasificador: reserva.codigoClasificador,
        // canchasDto: reserva.canchasDto,
      };
      this.registerInRuat(ruatData, formData);
    } else {
      this.notify('Formulario Invalido!', 'error');
    }
  }
  
  /* API requests */
  private addReservation(datos: Reserva): void {
    this.reservaService.save(datos).subscribe({
      next: (data: any) => {
        this.submitted = false;
        this.notify('Datos Registrados exitosamente!', 'success');
        // this.router.navigate(['/reservas']);
      },
      error: (error) => {
        this.notify('No se pudo Guardar los datos! '+error, 'error');
      }
    });
  }
  reservationsList=[]
  private getReservationsByField(uuid:string): void {
    this.reservaService.getByField(uuid).subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.reservationsList = data.payload;
          console.log("reservas",this.reservationsList)
        }else{
          Swal.fire({ text: data.payload, confirmButtonColor: '#299cdb'});
        }
      }
    });
  }

  private getTaxpayers(){
    this.contribuyenteService.getAll().subscribe({
      next: (data: any) => {
        if (data['status'] === 'OK') {
          this.contribuyentesList = data.payload;
        }else{
          Swal.fire({ text: data.payload, confirmButtonColor: '#299cdb'});
        }
      }
    });
  }
  /* API RUAT Requests */
  private authRuat() {
    this.ruatService.authenticate().subscribe({
      next: (response) => {          
        window.sessionStorage.setItem('ruatToken', response.token);
      },
      error: (error) => {
        this.notify("Falla en la coneccion con el RUAT, porfavor intente mas tarde",'error')
      }
    });
  }
  /* Register with RUAT */
  private registerInRuat(ruatData: any, reserva: any): void {
    this.ruatService.createTasa(ruatData).subscribe({
      next: (response: any) =>{
        if (response.status === 'OK') {
          const reservaData: Reserva = {
            ...reserva,
            numeroTasa: response.payload.numeroTasa
          };
          this.addReservation(reservaData);
        } else {
          this.notify('No se pudo Guardar los datos en RUAT! ' + response.payload, 'error');
        }
      },
      error: (error) => {
        this.notify('No se pudo Guardar los datos en RUAT!' + ' ' + error.message, 'error');
      }
    });
  }

  /* general functions */
  map:any; 
  private initMap(lat:any,long:any) {
    if (this.map) {
      this.map.remove();
    }  
    const main = L.tileLayer(
      "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoidGhlbWVzYnJhbmQiLCJhIjoiY2xmbmc3bTV4MGw1ejNzbnJqOWpubzhnciJ9.DNkdZVKLnQ6I9NOz7EED-w",
      {
        maxZoom: 30,
        id: "mapbox/streets-v11",
        tileSize: 512,
        zoomOffset: -1,
      }
    );
    const field = L.circle([lat, long],
      { color: "#435fe3",
        opacity: 0.5,
        weight: 8,
        fillColor: "#435fe3",
        fillOpacity: 1,
        radius: 10,
      }
    );
    this.map = L.map('mapa', {
      center: [lat, long],
      zoom: 17,
      layers: [main, field]
    });
  }

    private updateTime(): void {
      const now = new Date();
      this.currentTime = now.toLocaleTimeString();
    }

    private getTime(time: string): number {
      return parseInt(time.split(':')[0], 10);
    }

    slickChange(event: any) {
      const swiper = document.querySelectorAll('.swiperlist')
    }
  
    slidePreview(id: any, event: any) {
      const swiper = document.querySelectorAll('.swiperlist')
      swiper.forEach((el: any) => {
        el.classList.remove('swiper-slide-thumb-active')
      })
      event.target.closest('.swiperlist').classList.add('swiper-slide-thumb-active')
      this.slickModal.slickGoTo(id)
    }

    private notify(message: any, type: any): void {
      let timerInterval: any;
      Swal.fire({
        title: message,
        icon: type,
        timer: 2000,
        timerProgressBar: true,
        willClose: () => {
          clearInterval(timerInterval);
        },
      }).then((result) => {
        if (result.dismiss === Swal.DismissReason.timer) {
        }
      });
    }
}
