import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

// import { latLng, tileLayer, circle, polygon, marker, icon } from 'leaflet';

import * as L from 'leaflet';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import Swal from 'sweetalert2';

// import { OpenStreetMapProvider, GeoSearchControl, SearchControl } from 'leaflet-geosearch';
import * as GeoSearch from 'leaflet-geosearch';
import { ComplejosService } from 'src/app/core/services/api/conplejos.service';
import { CamposDeportivoService } from 'src/app/core/services/api/camposDeportivos.service';
import { an } from '@fullcalendar/core/internal-common';

@Component({
    selector: 'app-map-dashboard',
    templateUrl: './map-dashboard.component.html',
    styleUrls: ['./map-dashboard.component.scss']
})

export class MapDashboardComponent implements OnInit {

    breadCrumbItems!: Array<{}>;
    categoryList:any[]=[];
    complexList:any[]=[];
    fieldList:any[]=[];
    temp:any=[]

    map:any;
    layerControl:any;
    icon= L.icon({
      iconUrl: 'assets/images/Map_pin_icon.svg ',     
      iconSize: [28, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })
 
    constructor(private router: Router,
      private categoriesService: CategoriasService,
      private complexService: ComplejosService,
      private fieldService: CamposDeportivoService
    ) {}

    ngOnInit(): void {
      this.breadCrumbItems = [
          { label: 'Dashboard' },
          { label: 'Contribuyente', active: true }
      ];
  
      this.initializeData();
    }    
    async initializeData() {
      await this.getFields();      
      await this.getCategories();  
      await this.getComplexes();   
      this.setMaps();              
    }
 
    configDefaultMap(){      
      
      this.map = L.map('map', {
        zoom: 13,
        center: [-17.379564334907542, -66.28315805967586],
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
        searchButtonHTML: '' // This removes the default search button
      });
      this.map.addControl(searchControl);
    }

     /**
    * Basic Maps
    */
    baseMaps:any;
    overlayMaps:any;
    main : any;
    setMaps() {
      this.main = L.tileLayer("https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoidGhlbWVzYnJhbmQiLCJhIjoiY2xmbmc3bTV4MGw1ejNzbnJqOWpubzhnciJ9.DNkdZVKLnQ6I9NOz7EED-w",
        {
          maxZoom: 18,
          // attribution:'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
          id: "mapbox/streets-v11",
          tileSize: 512,
          zoomOffset: -1,
        }
      )
      const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
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
        "Mapa Calles": osm,
      };
      // this.layerControl.addBaseLayer(openTopoMap, "OpenTopoMap");
    }
    
    mainList:any;
    private setMarkers(){   
      let listFields:any[]=[]   
      this.complexList.forEach(element => {
        const complex = this.setPopup(element); 
        listFields.push(complex);      
      });
      this.mainList = L.layerGroup(listFields);

      let mapsByCategory:any[]=[];
      this.categoryList.forEach(category => {       
        const list:any[]= this.getListByCategory(category)        
        const markers = list.map(element => {
          const complex = this.setPopup(element);    
            return complex
        });
        mapsByCategory[category.nombre] = L.layerGroup(markers);
      });
      
      this.overlayMaps = {
        "<span style='color: blue'>Todo</span>": this.mainList,
        ...mapsByCategory,
      };

      // this.layerControl.addOverlay(colList, "Coliseos");   
      (window as any).handleButtonClick = this.handleButtonClick.bind(this);
      this.configDefaultMap();
    }

    private setPopup(element:any):any{
      const complex = L.marker([element.latitud, element.longitud], { icon: this.icon });
      const popupContent = document.createElement('div');
      popupContent.innerHTML = `
        <b>${element.nombre}</b><br />
        <b>Superficie: </b>${element.superficie}<br />
        <b>Techado: </b>${element.techado}<br />
        <b>Ubicación: </b>${element.ubicacion}<br />
        <br>
        <button class="btn btn-secondary">
          <i class="ri-edit-box-line align-bottom"></i> Realizar reserva
        </button>
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

    /* API Services */
    private getCategories(){
      this.categoriesService.getAll().subscribe({
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
    
    private getComplexes(){
      this.complexService.getAll().subscribe({
        next: (data: any) => {
          if (data['status'] === 'OK') {
            this.complexList = data.payload;
            this.temp = data.payload;
            this.setMarkers()
          }else{
            Swal.fire({ text: data.payload, confirmButtonColor: '#299cdb'});
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
          }else{
            Swal.fire({ text: data.payload, confirmButtonColor: '#299cdb'});
          }
        },
        error: (error) => {
          Swal.fire({ text: 'No se pudo recuperar los registros', confirmButtonColor: '#299cdb', });
        }
      });
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
  

}
