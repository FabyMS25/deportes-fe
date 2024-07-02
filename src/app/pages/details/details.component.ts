import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { circle, latLng, tileLayer } from 'leaflet';

import * as L from 'leaflet';
import { SlickCarouselComponent } from 'ngx-slick-carousel';
import { Cancha } from 'src/app/core/models/cancha.model';
import { DeportesService } from 'src/app/core/services/api/deporte.sservice';
import Swal from 'sweetalert2';
import { ModalComponent } from '../reservas/modal/modal.component';
import { CanchaHorariosService } from 'src/app/core/services/api/cancha-horarios.service';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss']
})

export class DetailsComponent implements OnInit  {

  breadCrumbItems!: Array<{}>;
  
  today: Date = new Date();
  private timerId:any;
  submitted = false;
  currentTime!: string;
  
  uuid='';
  dataField!:Cancha;
  categoryList:any[]=[];
  InvoiceForm!: UntypedFormGroup;
  public FCollapsed = true;
  public CCollapsed = true;
  constructor(private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private deportesService: DeportesService,
    private horariosService: CanchaHorariosService,
    private route: ActivatedRoute ) { }

    @ViewChild('slickModal') slickModal!: SlickCarouselComponent;
    imagesList=['assets/images/fields/img-1.png','assets/images/fields/img-2.png',
      'assets/images/fields/img-3.png','assets/images/fields/img-4.png']
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
    this.getDeportes();
    this.getHorarios();
    
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
    
    /**
     * Form Validation
     */
    this.InvoiceForm = this.formBuilder.group({
      uuid: [''],
      fechaReserva: ['', [Validators.required]],
      horaEntrada: ['', [Validators.required]],
      horaSalida: ['', [Validators.required]],
      totalPago: [0, [Validators.required]],
      // pagossDto: [null],
      // status: ['', [Validators.required]]
      // uuidCancha: [{ value: this.cancha, disabled: !!this.cancha }, [Validators.required]],
      // canchasDto: new FormControl(),
      // uuidContribuyente: [{ value: this.contribuyente, disabled: !!this.contribuyente }, [Validators.required]],
      // contribuyenteDto: new FormControl(),
      observacion: ['', [Validators.required]],
      check: [false, [Validators.required]],
      // totalPago: [0, [Validators.required]],
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
      this.deportesService.getAll().subscribe({
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

    saveData(){

    }

    horariosList=[];
    getHorarios(){
      this.horariosService.getAll().subscribe({
        next:(value:any) =>{
            this.horariosList = value.payload
        },
      })
    }
}
