import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { CamposDeportivoService } from 'src/app/core/services/api/camposDeportivos.service';

import * as L from 'leaflet';
import { SlickCarouselComponent } from 'ngx-slick-carousel';
import { Tarifa } from 'src/app/core/models/tarifa.model';
import { campoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { Complejo } from 'src/app/core/models/complejo.model';
import { GlobalComponent } from 'src/app/global-component';
import Swal from 'sweetalert2';
import { ReservaService } from 'src/app/core/services/api/reserva.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent {

  @Input() dataComplejo!: Complejo;
  @Output() fieldEmitter = new EventEmitter();

  dataField!:campoDeportivo
  tariff!:Tarifa;

  fieldsList:any[]=[];

  constructor(
    // private modalService: NgbModal,
    // private formBuilder: UntypedFormBuilder,
    private fieldService: CamposDeportivoService,
    private reservaService: ReservaService,
    // private route: ActivatedRoute ,
    // private ruatService: RuatRequestsService,
    // private contribuyenteService: ContribuyentesService,
    // private router: Router
  ) { }


  async ngOnInit(): Promise<void> {
    if (this.dataComplejo) {
      this.initMap(this.dataComplejo.latitud, this.dataComplejo.longitud);
    }

    try {
      const data: any = await firstValueFrom(this.fieldService.getByComplejo(this.dataComplejo));
      if (data?.status === 'OK') {
        this.fieldsList = data.payload;
        console.log(this.fieldsList)
        if (this.fieldsList.length>0) {
          // this.setField(this.fieldsList[0], this.fieldsList[0].tarifasDtoList[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching fields:', error);
    }

    // Initialize the form
    // this.InvoiceForm = this.formBuilder.group({
    //   uuid: [''],
    //   categoria: [''],
    //   superficie: [''],
    //   totalPersonas: [],
    //   fechaCreated: [new Date()],
    //   fechaReserva: [new Date(), [Validators.required, this.futureDateValidator()]],
    //   horaEntrada: ['', [Validators.required, this.timeValidator.bind(this)]],
    //   horaSalida: ['', [Validators.required, this.timeValidator.bind(this)]],
    //   totalPago: [0, [Validators.required]],
    //   totalTime: [0, [Validators.required]],
    //   numeroTasa: [''],
    //   estadoReserva: ['Pendiente'],
    //   canchasDto: ['', [Validators.required]],
    //   contribuyenteDto: [this.contribuyente, [Validators.required]],
    //   observacion: ['Reserva de Cancha Deportiva GAMQ', [Validators.required]],
    //   check: ['', [Validators.required]],
    // }, { validators: this.timeRangeValidator() });

    // if (this.dataField) {
    //   this.setField(this.dataField,undefined);
      // this.goToToday();
    // }
    // this.InvoiceForm.get('fechaReserva')?.valueChanges.subscribe(() => {
    //   const date = this.InvoiceForm.get('fechaReserva')?.value;
    //   this.allSlots={}
      // this.setWeekRange(date);
    // });
    // this.InvoiceForm.valueChanges.pipe(debounceTime(300)).subscribe(() => {
    //   const { horaEntrada, horaSalida } = this.InvoiceForm.controls;
    //   if (horaEntrada.valid && horaSalida.valid) {
    //     this.calculateTotalTimeAndPago();
    //   }
    // });
    // this.InvoiceForm.get('totalPersonas')?.valueChanges.subscribe(() => {
    //   this.calculateTotalTimeAndPago();
    // });
  }


  setField(field: any, tariff:any | undefined) {
      this.getReservationsByField(field.uuid).then(() => {
        // this.allSlots={}
      })
    this.dataField = field;
    this.tariff = tariff? tariff :field.tarifasDtoList[0];
    if(this.tariff.categoriaDtoList[0].categoriaDto.tipo === 'Evento'){
      // this.setReserve(this.reservationDate,this.tariff.desde,this.tariff.hasta)
    }else{
      if(!tariff){
        // this.setReserve(this.reservationDate,this.tariff.desde, this.tariff.hasta)
      }
    }
    this.fieldEmitter.emit({field:field,tariff:tariff})
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

  /* general functions */
  map:any;
  private initMap(lat:any,long:any) {
    if (this.map) {
      this.map.remove();
    }
    const main = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 25,
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

}
