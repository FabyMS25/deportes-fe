import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

// import { latLng, tileLayer, circle, polygon, marker, icon } from 'leaflet';

import * as L from 'leaflet';
import { CanchaService } from 'src/app/core/services/api/canchas.service';
import { DeportesService } from 'src/app/core/services/api/deporte.sservice';
import Swal from 'sweetalert2';
@Component({
    selector: 'app-contribuyente',
    templateUrl: './contribuyente.component.html',
    styleUrls: ['./contribuyente.component.scss']
})

export class ContribuyenteComponent implements OnInit {

    // bread crumb items
    breadCrumbItems!: Array<{}>;
    categoryList:any[]=[];
    canchasList:any[]=[];
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
      private deportesService: DeportesService,
      private fieldsService: CanchaService
    ) {}

    ngOnInit(): void {
        this.breadCrumbItems = [
            { label: 'Dashboards' },
            { label: 'Contribuyente', active: true }
        ];
        this.getDeportes();
        this.getFields();
        this.setMaps();
        // this.setMarkers();
        // this.configDefaultMap();
    }
      
  
    configDefaultMap(){
      this.map = L.map('map', {
        zoom: 13,
        center: [-17.379564334907542, -66.28315805967586],
        layers: [this.main,this.mainList]
      });
      
      this.layerControl = L.control.layers(this.baseMaps,this.overlayMaps).addTo(this.map);

      this.map.on('click', (e:any) => {
        console.log(e.latlng);
      });
    }

     /**
    * Basic Maps
    */
    baseMaps:any;
    overlayMaps:any;
    main : any;
    setMaps() {
      this.main = L.tileLayer(
      "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoidGhlbWVzYnJhbmQiLCJhIjoiY2xmbmc3bTV4MGw1ejNzbnJqOWpubzhnciJ9.DNkdZVKLnQ6I9NOz7EED-w",
      {
        maxZoom: 18,
        attribution:
          'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: "mapbox/streets-v11",
        tileSize: 512,
        zoomOffset: -1,
      }
    )
      const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      });
    
      const osmHOT = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team hosted by OpenStreetMap France'
      });
    
      var openTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: 'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)'
      });

      this.baseMaps = {
        "Mapa Basico": this.main,
        "OpenStreetMap": osm,
        "<span style='color: red'>OpenStreetMap.HOT</span>": osmHOT,
        "OpenTopoMap":openTopoMap
      };
      // this.layerControl.addBaseLayer(openTopoMap, "OpenTopoMap");
    }
    
    mainList:any=[];
    private setMarkers(){   
      let listFields:any[]=[]   
      this.canchasList.forEach(element => {
        const field = L.marker([element.latitud, element.longitud], { icon: this.icon });

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
        field.bindPopup(popupContent);
        listFields.push(field);      
      });
      this.mainList = L.layerGroup(listFields);
      
      const field = L.marker([-17.387307611639038, -66.29626036201263], { icon: this.icon });
      const stadium1 = L.marker([-17.39185128319654, -66.27510257300892],{icon:this.icon}).bindPopup("<b>Estadio de Quillacollo</b><br />I am a popup.");
      const stadium2 = L.marker([-17.45723608999351, -66.35638454666658],{icon:this.icon}).bindPopup('Estadio de Sipe Sipe.');
      const col1 = L.marker([-17.40778033504033, -66.28931060434014],{icon:this.icon}).bindPopup('Coliseo PoliDeportivo Quillacollo "Evo Morales"');
      const col2 = L.marker([-17.39821984789503, -66.28245117735644],{icon:this.icon}).bindPopup('Coliseo Max Fernandez.'); 

      // this.mainList = L.layerGroup([field]);
      let stadiumsList = L.layerGroup([stadium1,stadium2]);
      let colList = L.layerGroup([col1,col2]); 
      
      this.overlayMaps = {
        "Canchas": this.mainList,
        "Estadios": stadiumsList,
        "Coliseos": colList
      };
      // this.layerControl.addOverlay(colList, "Coliseos");   
      (window as any).handleButtonClick = this.handleButtonClick.bind(this);
      this.configDefaultMap();
    }

    handleButtonClick(data:any):void {
      this.router.navigate(['/reservations/details'], { state: { data: data } });// , data.uuid // ,canActivate: this.canActivate
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
    
    private getFields(){
      this.fieldsService.getAll().subscribe({
        next: (data: any) => {
          if (data['status'] === 'OK') {
            this.canchasList = data.payload;
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
}
