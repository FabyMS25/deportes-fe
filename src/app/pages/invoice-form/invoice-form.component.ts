import { Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, UntypedFormBuilder, UntypedFormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { SlickCarouselComponent } from 'ngx-slick-carousel';
import Swal from 'sweetalert2';
import * as L from 'leaflet';
import { debounceTime, firstValueFrom, switchMap } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';

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
import { addDays, subDays,  startOfWeek, endOfWeek, format } from 'date-fns';
import { es } from 'date-fns/locale';

import { GlobalComponent } from "../../global-component";

@Component({
  selector: 'app-invoice-form',
  templateUrl: './invoice-form.component.html',
  styleUrls: ['./invoice-form.component.scss']
})


export class InvoiceFormComponent implements OnInit  {

  breadCrumbItems!: Array<{}>;
  currentTime!: string;
  globalAdmin = GlobalComponent.admin_deportes;
  
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
    private contribuyenteService: ContribuyentesService,
    private ngZone: NgZone, private cdr: ChangeDetectorRef
  
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
  
  weekDays: { name: string, date: Date }[] = [];
  activeDayName: string = '';
  currentWeekStart!: Date;
  currentWeekEnd!: Date;  
  allSlots: { [key: string]: { morningSlots: { time: string, isAvailable: boolean }[], afternoonSlots: { time: string, isAvailable: boolean }[] } } = {};

  async ngOnInit(): Promise<void> {
    this.breadCrumbItems = [
      { label: 'Complejo' },
      { label: 'Reserva', active: true }
    ];
    this.currentTime = (new Date()).toLocaleTimeString();
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
      fechaReserva: [new Date(), [Validators.required, this.futureDateValidator()]],
      horaEntrada: ['', [Validators.required, this.timeValidator.bind(this)]],
      horaSalida: ['', [Validators.required, this.timeValidator.bind(this)]],
      totalPago: [0, [Validators.required]],
      totalTime: [0, [Validators.required]],
      numeroTasa: [''],
      estadoReserva: ['Pendiente'],
      canchasDto: ['', [Validators.required]],
      contribuyenteDto: [this.contribuyente, [Validators.required]],
      observacion: ['Reserva de Cancha Deportiva GAMQ', [Validators.required]], 
      check: ['', [Validators.required]],
    }, { validators: this.timeRangeValidator() });

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
  private setWeekRange(date: Date) {
    this.currentWeekStart = startOfWeek(date, { weekStartsOn: 1 });
    this.currentWeekEnd = endOfWeek(date, { weekStartsOn: 1 });
  
    this.weekDays = Array.from({ length: 7 }, (_, i) => {
      const currentDate = addDays(this.currentWeekStart, i);
      return {
        name: format(currentDate, 'EEE', { locale: es }).toLowerCase(),
        date: currentDate
      };
    });
  
    this.activeDayName = format(date, 'EEE', { locale: es }).toLowerCase();
  }

  get form() {
    return this.InvoiceForm.controls;
  }
  
  setField(field: any, tarifa:any | undefined) {
    this.getReservationsByField(field.uuid).then(() => {  
      this.allSlots={}
    })
    this.dataField = field;
    this.tariff = tarifa? tarifa :field.tarifasDtoList[0];
    if(this.tariff.categoriaDtoList[0].categoriaDto.tipo === 'Evento'){    
      this.setReserve(this.tariff.desde,this.tariff.hasta)    
    }else{
      if(!tarifa){
        this.setReserve(this.tariff.desde, this.tariff.hasta)
      }
    }    
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
  setSelectedDay(date: Date) {
    if (this.InvoiceForm) {
      this.InvoiceForm.patchValue({
        fechaReserva: date
      });
    }
      this.activeDayName = format(date, 'EEE', { locale: es }).toLowerCase();
  }
  
  timetables!:any[];
  getTimeSlotsForDay(date: Date) {
    const dayString = date ? new Date(date).toLocaleString('es-ES', { weekday: 'long' }).toLowerCase() : '';    
    if (!this.allSlots[dayString]) {
      this.setSelectedDay(date);
      const morningSlots = this.getTimeSlots(date,dayString, 'morning');
      const afternoonSlots = this.getTimeSlots(date,dayString, 'afternoon');      
      this.allSlots[dayString] = { morningSlots, afternoonSlots };
    }  
    return this.allSlots[dayString];
  }

  private getTimeSlots(date:Date,day: string, period: string): { time: string, isAvailable: boolean }[] {
    const horariosAtencion: any[] = this.dataField.horarioDtoList;
    this.timetables = horariosAtencion.filter(horario => (horario.dia.toLowerCase() === day.toLowerCase() && horario.abierto));    
    if (this.timetables.length === 0) {
      return [];
    }  
    const slots: { time: string, isAvailable: boolean }[] = []; 
    for (const horario of this.timetables) {
      const startTime = horario.horaInicio > this.tariff.desde ? this.tariff.desde : horario.horaInicio;
      const endTime = horario.horaFin > this.tariff.hasta ? this.tariff.hasta : horario.horaFin;  
      for (let hour = this.getTime(startTime); hour < this.getTime(endTime); hour++) {
        const slotTime  = `${this.pad(hour)}:00 - ${this.pad(hour + 1)}:00`;  
        const slotStartDate = new Date(date);
        slotStartDate.setHours(hour, 0, 0, 0);      
        let isAvailable = slotStartDate >= (new Date());
        if(isAvailable){
          
          let [slotStart, slotEnd] = slotTime.split(' - ');
          slotStart = `${slotStart}:00`;
          slotEnd = `${slotEnd}:00`;
          isAvailable = this.isAvailable(slotStart,slotEnd);
        }
        slots.push({ time: slotTime , isAvailable: isAvailable});     
      }      
    }  
    if (period === 'morning') {
      return slots.filter(slot => this.getTime(slot.time.split(':')[0]) < 12);
    } else if (period === 'afternoon') {
      return slots.filter(slot => this.getTime(slot.time.split(':')[0]) >= 12);
    }  
    return slots;
  }
  
  private isAvailable(slotStart: any , slotEnd:any): boolean {
    const fechaReserva = this.InvoiceForm.get('fechaReserva')?.value;
    return !this.reservationsList.some((reservation: any) => {
      const reservationStart = reservation.horaEntrada;
      const reservationEnd = reservation.horaSalida;
      const reservationDate = new Date(reservation.fechaReserva);
      if (reservationDate.getDate() === fechaReserva.getDate()) {  
        return (slotStart < reservationEnd && slotEnd > reservationStart); 
        // return (
        //   (slotStart >= reservationStart && slotStart < reservationEnd) &&
        //   (slotEnd > reservationStart && slotEnd <= reservationEnd) 
        // );
      }      
    return false; 
    });
  }  
  private futureDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const selectedDate = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate < today ? { pastDate: true } : null;
    };
  }
  timeValidator(control: AbstractControl): ValidationErrors | null {
    const time = control.value;
    if (!time) return null;
    const fechaReserva = this.InvoiceForm.get('fechaReserva')?.value;
    if (!fechaReserva) return null;  
    const selectedDate = new Date(fechaReserva);
    const [hours, minutes] = time.split(':').map(Number);        
    if (!this.timetables) return null;  
    const start = this.getTime(this.timetables[0].horaInicio);
    const end = this.getTime(this.timetables[0].horaFin);
      if ((hours < start) || (hours > end) || (hours === end && minutes > 0)) {
        return { invalidTime: true };
      }
    if (selectedDate.toDateString() === new Date().toDateString()) {
      if (hours < new Date().getHours() || (hours === new Date().getHours() && minutes < new Date().getMinutes())) {
        return { pastTime: true };
      }
    }
    return  null;
  }
  
  timeRangeValidator(): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const horaEntrada = formGroup.get('horaEntrada')?.value;
      const horaSalida = formGroup.get('horaSalida')?.value;
  
      if (horaEntrada && horaSalida) {
        const [entradaHours, entradaMinutes] = horaEntrada.split(':').map(Number);
        const [salidaHours, salidaMinutes] = horaSalida.split(':').map(Number);
        if (entradaHours > salidaHours || (entradaHours === salidaHours && entradaMinutes >= salidaMinutes)) {
          return { timeRange: true };
        }
        if (this.reservationsList.length > 0) {
          const isReserved = !this.isAvailable(`${horaEntrada}:00`, `${horaSalida}:00`);
          if (isReserved) {
            return { isReserved: true };
          }
        }
      }
      return null;
    };
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
  private getReservationsByField(uuid: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.reservaService.getByField(uuid).subscribe({
        next: (data: any) => {
          if (data['status'] === 'OK') {
            this.reservationsList = data.payload;
            resolve();
          } else {
            Swal.fire({ text: data.payload, confirmButtonColor: '#299cdb' });
            reject();
          }
        },
        error: (error) => {
          reject(error);
        }
      });
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

    getAvatar(employee:any): string {
      return 'avatar-admin-m.png';
    }
}
