import { Component, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormControl, UntypedFormBuilder, UntypedFormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { SlickCarouselComponent } from 'ngx-slick-carousel';
import Swal from 'sweetalert2';
import * as L from 'leaflet';
import { debounceTime, firstValueFrom } from 'rxjs';

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
  tarifa!:Tarifa;  
  canchasList:any[]=[];

  submitted = false;
  InvoiceForm!: UntypedFormGroup;
  isCollapsed: boolean[] = [];
  public FCollapsed = true;
  public CCollapsed = true;

  imagesList=['assets/images/fields/img-1.png','assets/images/fields/img-2.png',
    'assets/images/fields/img-3.png','assets/images/fields/img-4.png']

  constructor(private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private fieldService: CamposDeportivoService,
    private reservaService: ReservaService,
    private route: ActivatedRoute ,
    private ruatService: RuatRequestsService
  
  ) { }

    @ViewChild('slickModal') slickModal!: SlickCarouselComponent;
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
    }
  
    this.dataComplejo = history.state.data;  
    if (this.dataComplejo) {
      this.initMap(this.dataComplejo.latitud, this.dataComplejo.longitud);
    }
  
    try {
      const data: any = await firstValueFrom(this.fieldService.getByComplejo(this.dataComplejo));
      if (data?.status === 'OK') {
        this.canchasList = data.payload;
        this.canchasList.forEach((cancha, index) => {
          if (index === 0) {
            this.dataField = cancha;
            this.tarifa = cancha.tarifasDtoList[0];
            this.isCollapsed.push(true);
          } else {
            this.isCollapsed.push(false);
          }
        });
      } else {
        console.error('No se encontraron Canchas del Complejo');
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
      fechaReserva: [new Date(), [Validators.required]], // Should show today's date
      horaEntrada: [this.getAvailableHour('start'), [Validators.required, this.timeValidator.bind(this)]],
      horaSalida: [this.getAvailableHour('end'), [Validators.required, this.timeValidator.bind(this)]],
      totalPago: [0, [Validators.required]],
      totalTime: [0, [Validators.required]],
      numeroTasa: ['#'],
      estadoReserva: ['Pendiente'],
      canchasDto: [''],
      contribuyenteDto: [this.contribuyente],
      observacion: ['Reserva de Cancha Deportiva GAMQ', [Validators.required]], // Should show this text
      check: [, [Validators.required]],
    });
  
    if (this.dataField) {
      this.selectCancha(this.dataField,undefined);
      this.generateHorarios();
    }
  
    this.InvoiceForm.get('fechaReserva')?.valueChanges.subscribe(() => {
      this.generateHorarios();
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
  selectCancha(cancha: any, tarifa:any | undefined) {
    this.dataField = cancha;
    this.tarifa = tarifa? tarifa :cancha.tarifasDtoList[0];
    let categoriasString = this.tarifa.categoriaDtoList
    .map(categoria => categoria.categoriaDto.nombre).join(', ');

    if(this.tarifa.categoriaDtoList[0].categoriaDto.tipo === 'Evento'){      
      const start = this.tarifa.desde? this.tarifa.desde: ''
      const end = this.tarifa.hasta? this.tarifa.hasta: ''
      this.reserve(start,end,undefined)
    
    }else{ 
      
    }
    
    this.InvoiceForm.patchValue({
      canchasDto: cancha,
      superficie: cancha.superficieDto.descripcion,
      categoria: categoriasString,
    });
  }
  
  toggleCollapse(index: number) {
    // this.selectCancha(cancha);
    this.isCollapsed[index] = !this.isCollapsed[index];
  }
  calculateTotalTimeAndPago() {
    if(this.tarifa.categoriaDtoList[0].categoriaDto.tipo === 'Evento'){
      const totalTime = `allDay`;
      const totalPago = this.tarifa.costo;
      
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
    
        if(this.tarifa.categoriaDtoList[0].categoriaDto.tipo === 'Persona'){
          const personas = this.InvoiceForm.get('totalPersonas')?.value;
          const totalPago = this.tarifa.costo*personas;          
          this.InvoiceForm.patchValue({
            totalTime,
            totalPago,
          });

        }else{
          const totalPago = ((diffHours + diffMinutes / 60) * this.tarifa.costo).toFixed(2);
          this.InvoiceForm.patchValue({
            totalTime,
            totalPago
          });
        }
      }
    }
  }



  getAvailableHour(type:string): string {
    const now = new Date();
    const currentDay = now.toLocaleString('es-ES', { weekday: 'long' });
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = `${this.pad(currentHour)}:${this.pad(currentMinutes)}`;
    if(this.dataField.horarioDtoList){
      const horariosAtencion = this.dataField.horarioDtoList
      const horariosToday = horariosAtencion.filter(horario => horario.dia === currentDay && horario.abierto);
      console.log(horariosToday)
      
      if (type === 'start' && horariosToday.length) {
        for (const horario of horariosToday) {
            if (currentTime < horario.horaInicio) {
              return horario.horaInicio;
            }
            if (currentTime >= horario.horaInicio && currentTime < horario.horaFin) {
              return `${this.pad(currentHour + 1)}:00`;
            }
        }
      } else if (type === 'end' && horariosToday.length) {
        return horariosToday[horariosToday.length - 1].horaFin;
      }
  
      return horariosToday.length > 0 ? horariosToday[0].horaInicio : horariosAtencion[0].horaInicio;

    }
    return currentTime;
  }
  morningHorarios: string[] = [];
  afternoonHorarios: string[] = [];
  horariosToday!:any[];

  isEvento(cancha:any):boolean{
    const result = cancha.tarifasDtoList.every((tar:any) => tar.categoriaDtoList[0].categoriaDto.tipo === 'Evento')
    // if(result){
    //   const start = this.tarifa.desde? this.tarifa.desde: ''
    //   const end = this.tarifa.hasta? this.tarifa.hasta: ''
    //   this.reserve(start,end)
    // }
    return result;
  }

  generateHorarios() {  const fechaReserva = this.InvoiceForm.get('fechaReserva')?.value;

    if (!fechaReserva) {
      return;
    }
  
    const selectedDay = fechaReserva.toLocaleString('es-ES', { weekday: 'long' });
    const horariosAtencion = this.dataField.horarioDtoList;
    console.log('horariosAtencion:', horariosAtencion);
    console.log('selectedDay:', selectedDay);
    if(horariosAtencion) {
      this.horariosToday = horariosAtencion.filter(horario => horario.dia.toLowerCase() === selectedDay && horario.abierto);
      console.log('Filtered horariosToday:', this.horariosToday);

    }
  
    if (this.horariosToday.length === 0) {
      console.warn('No active schedules found for the selected day:', selectedDay);
      return;
    }

    this.morningHorarios = [];
    this.afternoonHorarios = [];
    for (const horario of this.horariosToday) {
      const horaInicio = horario.horaInicio;
      const horaFin = horario.horaFin;

      for (let hour = this.getTime(horaInicio); hour < this.getTime(horaFin); hour++) {
        const horarioStr = `${this.pad(hour)}:00 - ${this.pad(hour + 1)}:00`;
        if (hour < 12) {
          this.morningHorarios.push(horarioStr);
        } else {
          this.afternoonHorarios.push(horarioStr);
        }
      }
    }
  }

  reserve(start: string, end:string,cancha:any|undefined) {
    this.InvoiceForm.patchValue({
      horaEntrada: start,
      horaSalida: end
    });    
    if(cancha){
      this.selectCancha(cancha, undefined);
    }
  }
  pad(num: number): string {
    return num < 10 ? '0' + num : num.toString();
  }




  get form() {
    return this.InvoiceForm.controls;
  }

  public openModal(content: any | undefined, accion: string) {
    const modalRef = this.modalService.open(ModalComponent, {
        backdrop: 'static',
        size:''
    });
    modalRef.componentInstance.row = content;
    modalRef.componentInstance.cancha = this.dataComplejo.uuid;
    modalRef.componentInstance.contribuyente = '';
    modalRef.componentInstance.accion = accion;
  }
  /**
   * Open modal
   * @param content modal content
  **/
  openScheduleModal(content: any) {
    this.submitted = false;
    this.modalService.open(content, { size: 'md', centered: true });
  }

  map:any; 
  private initMap(lat:any,long:any) {
    if (this.map) {
      this.map.remove();
    }  
    const main = L.tileLayer(
      "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoidGhlbWVzYnJhbmQiLCJhIjoiY2xmbmc3bTV4MGw1ejNzbnJqOWpubzhnciJ9.DNkdZVKLnQ6I9NOz7EED-w",
      {
        maxZoom: 30,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
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
  
    /* API Services */
    saveData() {
      this.submitted = true;
      if (this.InvoiceForm.valid) {
        this.InvoiceForm.enable()
        let datos: Reserva = {
          numeroTasa	: "",
          estadoReserva:'Pendiente',
          fechaReserva: this.InvoiceForm.value.fechaReserva,
          horaEntrada: this.InvoiceForm.value.horaEntrada,
          horaSalida: this.InvoiceForm.value.horaSalida,
          totalPago: this.InvoiceForm.value.totalPago,
          totalPesonas: this.InvoiceForm.value.estadoUsuario,
          categoria: this.InvoiceForm.value.categoria,
          superficie: this.InvoiceForm.value.superficie,
          observacion: this.InvoiceForm.value.observacion,
          canchasDto: this.InvoiceForm.value.canchasDto,
          contribuyenteDto: this.contribuyente,
        };
          this.registerBook(datos)
          // this.addData(datos);
      }else {
          this.notify('Formulario Invalido!', 'error');
      }
  
      setTimeout(() => {
        // this.contentForm.reset();
      }, 2000);
      // this.submitted = true
    }
      
  addData(datos:Reserva){
    this.reservaService.save(datos).subscribe({
      next:(data:any)=>{
        this.submitted=false;
        const reserva = data.payload
        // this.registerBook(reserva);
        this.notify('Datos Registrados exitosamente!','success'); 
        // this.closeModal();
        // this.listaItems.emit();       
      },
      error: (error) => {
        this.notify('No se pudo Guardar los datos! '+error, 'error');
      }
    })
  }
     
  /* API RUAT Services */
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
  private registerBook(reserva:any){
    
    let datos = {
      codigoContribuyente: reserva.contribuyenteDto.codigoContribuyente,
      // codigoClasificador: reserva.codigoClasificador,
      monto: reserva.totalPago,
      observacion: reserva.observacion,
      // observacion: "Reserva de Cancha Deportiva GAMQ",
      // canchasDto: reserva.canchasDto,
      // contribuyenteDto: this.contribuyente,
    };
    
    
    this.ruatService.createTasa(datos).subscribe({
      next:(data:any)=>{
        if(data['status']==='OK'){
          console.log(data.payload)
          const res = data.payload
          reserva.numeroTasa = res.numeroTasa	
          this.addData(reserva);
          this.notify('Datos Registrados exitosamente!','success');

        } else{
          this.notify('No se pudo Guardar los datos! '+data.payload, 'error');}
      },
      error: (error) => {
        this.notify('No se pudo Guardar los datos! '+error, 'error');
      }
    })
  }



    
    timeValidator(control: AbstractControl): ValidationErrors | null {
      const time = control.value;
      if (!time) return null;

      // const fechaReserva = new Date();//this.InvoiceForm.get('fechaReserva')?.value || new Date();
      // const selectedDay = fechaReserva.toLocaleString('es-ES', { weekday: 'long' });  
      // const horariosToday = this.horariosAtencion.filter(horario => horario.dia === selectedDay && horario.activo);
      
      if (!this.horariosToday) return null;

      const [hours, minutes] = time.split(':').map(Number);      

      const start = this.getTime(this.horariosToday[0].horaInicio);
      const end = this.getTime(this.horariosToday[0].horaFin);
  
      if (this.horariosToday.length > 1) {
        const startT = this.getTime(this.horariosToday[1].horaInicio);
        const endT = this.getTime(this.horariosToday[1].horaFin);  
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
    
    getTime(time: string): number {
      return parseInt(time.split(':')[0], 10);
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
