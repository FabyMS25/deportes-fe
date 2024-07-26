import { Component, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { SlickCarouselComponent } from 'ngx-slick-carousel';
import Swal from 'sweetalert2';
import * as L from 'leaflet';
import { debounceTime } from 'rxjs';

import { ModalComponent } from '../reservas/modal/modal.component';
import { campoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { HorariosService } from 'src/app/core/services/api/horarios.service';
import { Complejo } from 'src/app/core/models/complejo.model';
import { CamposDeportivoService } from 'src/app/core/services/api/camposDeportivos.service';
@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss']
})


export class DetailsComponent implements OnInit  {

  breadCrumbItems!: Array<{}>;
  private timerId:any;
  submitted = false;
  currentTime!: string;
  
  uuid='';
  dataField!:Complejo;
  categoryList:any[]=[];
  InvoiceForm!: UntypedFormGroup;
  isCollapsed: boolean[] = [];
  public FCollapsed = true;
  public CCollapsed = true;

  tarifa=0;
  imagesList=['assets/images/fields/img-1.png','assets/images/fields/img-2.png',
    'assets/images/fields/img-3.png','assets/images/fields/img-4.png']

  constructor(private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private categoriasService: CategoriasService,
    private horariosService: HorariosService,
    private fieldService: CamposDeportivoService,
    private route: ActivatedRoute ) { }

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
      // Configuration options for the ngx-slick-carousel
      infinite: true,
      slidesToShow: 4,
      slidesToScroll: 1,
      autoplay: true,
    }
  ngOnInit(): void {
     this.breadCrumbItems = [
      { label: 'Canchas' },
      { label: 'Reservas', active: true }
    ];    
    // this.route.params.subscribe(params => {
    //   this.uuid = params['uuid'];
    //   // this.getAdjuntos(this.uuid);
    // });
    // this.canActivate = history.state.canActivate;
    this.dataField = history.state.data;
    console.log(this.dataField)
    if(this.dataField){
      this.initMap(this.dataField.latitud, this.dataField.longitud); 
    }      
    this.updateTime();
    this.timerId = setInterval(() => this.updateTime(), 1000);
    
    this.getDeportes();
    this.getFields();
    /**
     * Form Validation
     */
    this.InvoiceForm = this.formBuilder.group({
      uuid: [''],
      fechaReserva: [new Date(), [Validators.required]],
      horaEntrada: [this.getAvailableHour('start'), [Validators.required, this.timeValidator.bind(this)]],
      horaSalida: [this.getAvailableHour('end'), [Validators.required, this.timeValidator.bind(this)]],
      totalPago: [0, [Validators.required]],
      totalTime: [0, [Validators.required]],
      // status: ['', [Validators.required]]
      // uuidCancha: [{ value: this.cancha, disabled: !!this.cancha }, [Validators.required]],
      // canchasDto: new FormControl(),
      // uuidContribuyente: [{ value: this.contribuyente, disabled: !!this.contribuyente }, [Validators.required]],
      // contribuyenteDto: new FormControl(),
      observacion: ['Reserva de Cancha Deportiva GAMQ', [Validators.required]],
      check: [false, [Validators.required]],
    });
    this.InvoiceForm.get('fechaReserva')?.valueChanges.subscribe(() => {
      this.generateHorarios();
    });

    this.generateHorarios();
    this.InvoiceForm.valueChanges.pipe(debounceTime(300) 
    ).subscribe(() => {
        const { horaEntrada, horaSalida } = this.InvoiceForm.controls;
        if (horaEntrada.valid && horaSalida.valid) {
          this.calculateTotalTimeAndPago();
        }
    });
  }

  calculateTotalTimeAndPago() {
    const horaEntrada = this.InvoiceForm.get('horaEntrada')?.value;
    const horaSalida = this.InvoiceForm.get('horaSalida')?.value;
    const tarifa = 0;//this.dataField.tarifasList || 0

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
      const totalPago = ((diffHours + diffMinutes / 60) * tarifa).toFixed(2);

      this.InvoiceForm.patchValue({
        totalTime,
        totalPago
      });
    }
  }

  horariosAtencion = [
    { horaInicio: '08:00', horaFin: '12:00', dia:"lunes", activo:true },
    { horaInicio: '14:00', horaFin: '18:00' ,dia:"lunes", activo:true},
    { horaInicio: '08:00', horaFin: '12:00', dia:"martes", activo:true },
    { horaInicio: '14:00', horaFin: '18:00' ,dia:"martes", activo:true},
    { horaInicio: '08:00', horaFin: '11:00', dia:"miércoles", activo:true },
    { horaInicio: '13:00', horaFin: '16:00' ,dia:"miércoles", activo:true},
    { horaInicio: '08:00', horaFin: '11:00', dia:"viernes", activo:true },
    { horaInicio: '13:00', horaFin: '16:00' ,dia:"viernes", activo:true},
    { horaInicio: '', horaFin: '', dia:"Sabado", activo:false },
    { horaInicio: '', horaFin: '' ,dia:"Domingo", activo:false}
  ];

  toggleCollapse(index: number) {
    this.isCollapsed[index] = !this.isCollapsed[index];
  }

  getAvailableHour(type:string): string {
    const now = new Date();
    const currentDay = now.toLocaleString('es-ES', { weekday: 'long' });
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = `${this.pad(currentHour)}:${this.pad(currentMinutes)}`;

    const horariosToday = this.horariosAtencion.filter(horario => horario.dia === currentDay && horario.activo);
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

    return horariosToday.length > 0 ? horariosToday[0].horaInicio : this.horariosAtencion[0].horaInicio;
  }
  morningHorarios: string[] = [];
  afternoonHorarios: string[] = [];
  horariosToday!:any[];
  generateHorarios() {
    const fechaReserva = this.InvoiceForm.get('fechaReserva')?.value;
    const selectedDay = fechaReserva.toLocaleString('es-ES', { weekday: 'long' });

    this.horariosToday = this.horariosAtencion.filter(horario => horario.dia === selectedDay && horario.activo);

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

  pad(num: number): string {
    return num < 10 ? '0' + num : num.toString();
  }

  reserve(start: string, end:string) {
    this.InvoiceForm.patchValue({
      horaEntrada: start,
      horaSalida: end
    });
    
  }

  get form() {
    return this.InvoiceForm.controls;
  }
  map:any; 
  private initMap(lat:any,long:any) {
    if (this.map) {
      this.map.remove();
    }  
    const main = L.tileLayer(
      "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoidGhlbWVzYnJhbmQiLCJhIjoiY2xmbmc3bTV4MGw1ejNzbnJqOWpubzhnciJ9.DNkdZVKLnQ6I9NOz7EED-w",
      {
        maxZoom: 23,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: "mapbox/streets-v11",
        tileSize: 512,
        zoomOffset: -1,
      }
    );
    const field = L.circle([lat, long],
      { color: "#435fe3",
        opacity: 0.5,
        weight: 10,
        fillColor: "#435fe3",
        fillOpacity: 1,
        radius: 30,
      }
    );
    this.map = L.map('mapa', {
      center: [lat, long],
      zoom: 16,
      layers: [main, field]
    });
  }

  private updateTime(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString();
  }

  public openModal(content: any | undefined, accion: string) {
    const modalRef = this.modalService.open(ModalComponent, {
        backdrop: 'static',
        size:''
    });
    modalRef.componentInstance.row = content;
    modalRef.componentInstance.cancha = this.dataField.uuid;
    modalRef.componentInstance.contribuyente = '';
    modalRef.componentInstance.accion = accion;
  }
  /**
   * Open modal
   * @param content modal content
   */
   openEmployeeModal(content: any) {
    this.submitted = false;
    this.modalService.open(content, { size: 'md', centered: true });
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
    private getDeportes(){
      this.categoriasService.getAll().subscribe({
          next: (data: any) => {
            if (data['status'] === 'OK') {
              this.categoryList = data.payload;
            }else{
              Swal.fire({ text: data.payload, confirmButtonColor: '#299cdb'});
            }
          },
          error: (error) => {
            Swal.fire({ text: 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb' });
          }
        });
    }

    canchasList:any[]=[];
    private getFields(){
      this.fieldService.getAll().subscribe({
        next: (data: any) => {
          if (data['status'] === 'OK') {
            this.canchasList = data.payload;
            this.canchasList.forEach((cancha, index) => {
              this.isCollapsed.push(false);
            });
          }
        },
        error: (error) => {
          Swal.fire({ text: 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb', });
        }
      });
    }

    saveData(){
      if (this.InvoiceForm.valid) {
        
      } else {
        
      }
    }


    horariosList=[];
    getHorarios(){
      this.horariosService.getAll().subscribe({
        next:(value:any) =>{
            this.horariosList = value.payload
        },
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
}
