import { Component, OnInit, TemplateRef } from '@angular/core';
import { Router } from '@angular/router';

// import { latLng, tileLayer, circle, polygon, marker, icon } from 'leaflet';

import * as L from 'leaflet';
import Swal from 'sweetalert2';

// import { OpenStreetMapProvider, GeoSearchControl, SearchControl } from 'leaflet-geosearch';
import * as GeoSearch from 'leaflet-geosearch';
import { ComplejosService } from 'src/app/core/services/api/conplejos.service';
import { CamposDeportivoService } from 'src/app/core/services/api/camposDeportivos.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { SuperficiesService } from 'src/app/core/services/api/superficies.service';
import { category } from 'src/app/core/data/calendar';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-map-dashboard',
    templateUrl: './map-dashboard.component.html',
    styleUrls: ['./map-dashboard.component.scss']
})

export class MapDashboardComponent implements OnInit {

    temp:any=[]
    userData: any;
    complexList:any[]=[];
    surfaceList:any[]=[];
    categoryList:any[]=[];
    fieldList:any[]=[];

    map:any;
    layerControl:any;
    icon= L.icon({
      iconUrl: 'assets/icons/pin-location.png',
      iconSize: [44, 52],
      // iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })

    constructor(private router: Router,
      private categoriesService: CategoriasService,
      private complexService: ComplejosService,
      private fieldService: CamposDeportivoService,
      private surfacesService:SuperficiesService,
      private offcanvasService: NgbOffcanvas,
    ) {}

    ngOnInit(): void {
      this.initializeData();
    }
    async initializeData() {
      const token = window.sessionStorage.getItem('auth-token');
      if(token==='isContribuyente'){
        const userString = window.sessionStorage.getItem('currentUser');
        this.userData =userString ? JSON.parse(userString) : null;
      }

      await this.getComplexes();
      await this.getSurfaces();
      await this.getFields();
      await this.getCategories();
      this.setMaps();
    }

    configDefaultMap(){
      this.map = L.map('map', {
        zoom: 14,
        // center: [-17.4092000, -66.2871000],//cell
        center: [-17.4010000, -66.2871000],//
        layers: [this.main,this.mainList]
      });

      this.layerControl = L.control.layers(this.baseMaps,this.overlayMaps).addTo(this.map);

      const provider = new GeoSearch.OpenStreetMapProvider();
      const searchControl = new (GeoSearch.GeoSearchControl as any)({
        provider: provider,
        style: '',
        showMarker: true,
        showPopup: false,
        autoClose: true,
        retainZoomLevel: false,
        animateZoom: true,
        keepResult: false,
        searchLabel: 'Buscar... ',
        classNames: {
          container: 'custom-geosearch-control'
        },
        searchButtonHTML: ''
      });
      this.map.addControl(searchControl);
    }

     /**
    * Basic Maps
    */
    baseMaps:any;
    overlayMaps:any;
    overlayMaps2:any;
    main : any;
    setMaps() {
      this.main = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
        }
      )
      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      });
      const osmHOT = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
          maxZoom: 19
      });
      var openTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: 'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)'
      });
      this.baseMaps = {
        "Mapa Basico": this.main,
        // "Mapa Calles": osm,
      };
      // this.layerControl.addBaseLayer(openTopoMap, "OpenTopoMap");
    }

    mainList:any;
    private setMarkers(){
      let listMarkers:any[]=[]

      this.complexList.forEach(element => {
        const complex = this.setPopup(element);
        listMarkers.push(complex);
      });
      this.mainList = L.layerGroup(listMarkers);

      let filteredMarkers: any[] = this.getFilteredList();

      this.overlayMaps = {
          "<span style='color: blue'>Todo</span>": this.mainList,
          ...filteredMarkers,
      };

      // this.layerControl.addOverlay(colList, "Coliseos");
      (window as any).handleButtonClick = this.handleButtonClick.bind(this);
      this.configDefaultMap();
    }

    private setPopup(element:any):any{
      const complex = L.marker([element.latitud, element.longitud], { icon: this.icon });
      const popupContent = document.createElement('div');
      const canchasDescriptions = element.canchasDtoList? element.canchasDtoList.map((c:any) => c.superficieDto.descripcion).join(', '): '' ; // Join descriptions with a comma

      const showButton = this.userData? this.userData.estadoUsuario === 'Activo':true;

      popupContent.innerHTML = `
        <b>${element.nombre}</b><br />
        <b>Encargado: </b>${element.encargadosDtoList[0] ? element.encargadosDtoList[0]?.nombre : ''}<br />
        <b>Tipo Techado: </b>${element.techado}<br />
        <b>Distrito: </b>${element.distrito}<br />
        <b>Ubicación: </b>${element.ubicacion}<br />
        <b>Canchas: </b>${canchasDescriptions}<br />
        <br>
        ${showButton ?
          '<button class="btn btn-secondary"><i class="ri-edit-box-line align-bottom"></i> Realizar reserva</button>'
          : ''
        }
      `;

      const button = popupContent.querySelector('button');
      if (button) {
        button.addEventListener('click', () => this.handleButtonClick(element));
      }
      complex.bindPopup(popupContent);
      return complex
    }

    handleButtonClick(data:any):void {
      this.router.navigate(['/reservations/details'], { state: { data: data } });// , data.uuid // ,canActivate: this.canActivate
    }

    getListByCategory(category: any): any[] {
      const filteredComplejos: any[] = [];

      this.fieldList.forEach((field:any) => {
          let found = false;
          field.tarifasDtoList.forEach((tarifa:any) => {
              tarifa.categoriaDtoList.forEach((item:any) => {
                  if (item.categoriaDto.nombre === category.nombre) {
                      found = true;
                  }
              });
          });
          if (found) {
              const complejo = field.complejoDto;
              if (!filteredComplejos.some(c => c.uuid === complejo.uuid)) {
                  filteredComplejos.push(complejo);
              }
          }
      });
      return filteredComplejos;
  }

  getFilteredList(): any[] {
    let filteredMarkers: any[] =[]
    this.surfaceList.forEach(item => {

      const complexesBySurface = this.complexList.filter(complex =>
          complex.canchasDtoList.some((c:any) => c.superficieDto.descripcion === item.descripcion)
      );

      const mergedList = [...new Set([...complexesBySurface])];

      const markers = mergedList.map(element => {
          const complex = this.setPopup(element);
          return complex;
      });

      filteredMarkers[item.descripcion] = L.layerGroup(markers);
  });
    return filteredMarkers;
  }

    /* API Services */
    private getComplexes(){
      this.complexService.getAll().subscribe({
        next: (data: any) => {
          if (data['status'] === 'OK') {
            this.complexList = data.payload;
            this.temp = data.payload;
            this.setMarkers()
          }
        },
        error: (error) => {
          Swal.fire({ text: 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb', });
        }
      });
    }
    private getFields(){
      this.fieldService.getAll().subscribe({
        next: (data: any) => {
          if (data['status'] === 'OK') {
            this.fieldList = data.payload;
          }
        },
        error: (error) => {
          Swal.fire({ text: 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb', });
        }
      });
    }
    private getCategories(){
      this.categoriesService.getAll().subscribe({
          next: (data: any) => {
            if (data['status'] === 'OK') {
              this.categoryList = data.payload;
            }
          },
          error: (error) => {
            Swal.fire({ text: 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb' });
          }
        });
    }
    private getSurfaces(){
      this.surfacesService.getAll().subscribe({
          next: (data: any) => {
            if (data['status'] === 'OK') {
              this.surfaceList = data.payload;
            }
          },
          error: (error) => {
            Swal.fire({ text: 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb' });
          }
        });
    }


    /*  */
    //  Filter Offcanvas Set
    openEnd(content: TemplateRef<any>) {
      this.offcanvasService.open(content, { position: 'end' });
    }

  // Filtering
  isstatus?: any
  leads:any
  SearchData() {
    // var date = document.getElementById("isDate") as HTMLInputElement;
    // var dateVal = date.value ? this.datePipe.transform(new Date(date.value), "yyyy-MM-dd") : '';

    // if (dateVal != '') {
    //   this.leads = this.temp.filter((order: any) => {
    //     return this.datePipe.transform(new Date(order.date), "yyyy-MM-dd") == dateVal;
    //   });
    // }
    // else {
    //   this.leads = this.categoryList;
    // }
  }
}
