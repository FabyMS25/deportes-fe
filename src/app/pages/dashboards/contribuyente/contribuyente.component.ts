import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

// import { latLng, tileLayer, circle, polygon, marker, icon } from 'leaflet';

import * as L from 'leaflet';
@Component({
    selector: 'app-contribuyente',
    templateUrl: './contribuyente.component.html',
    styleUrls: ['./contribuyente.component.scss']
})

export class ContribuyenteComponent implements OnInit {

    // bread crumb items
    breadCrumbItems!: Array<{}>;
    map:any;
    layerControl:any;
    icon= L.icon({
      iconUrl: 'assets/images/Map_pin_icon.svg ',     
      iconSize: [28, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })
 
    constructor(private router: Router) {}

    ngOnInit(): void {
        this.breadCrumbItems = [
            { label: 'Dashboards' },
            { label: 'Enpleado', active: true }
        ];
        
        this.setMaps();
        this.setMarkers();

        this.configDefaultMap();
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
      const field = L.marker([-17.387307611639038, -66.29626036201263], { icon: this.icon });
      const stadium1 = L.marker([-17.39185128319654, -66.27510257300892],{icon:this.icon}).bindPopup("<b>Estadio de Quillacollo</b><br />I am a popup.");
      const stadium2 = L.marker([-17.45723608999351, -66.35638454666658],{icon:this.icon}).bindPopup('Estadio de Sipe Sipe.');
      const col1 = L.marker([-17.40778033504033, -66.28931060434014],{icon:this.icon}).bindPopup('Coliseo PoliDeportivo Quillacollo "Evo Morales"');
      const col2 = L.marker([-17.39821984789503, -66.28245117735644],{icon:this.icon}).bindPopup('Coliseo Max Fernandez.'); 
      field.bindPopup(`
        <b>Cancha Chulumani</b><br />I am a popup.
        <br>
        
        <button onclick="handleButtonClick()" class="btn btn-secondary">
          <i class="ri-edit-box-line align-bottom"></i> Realizar reserva
        </button>
      ` );
      this.mainList = L.layerGroup([field]);
      let stadiumsList = L.layerGroup([stadium1,stadium2]);
      let colList = L.layerGroup([col1,col2]); 
      
      this.overlayMaps = {
        "Canchas": this.mainList,
        "Estadios": stadiumsList,
        "Coliseos": colList
      };
      // this.layerControl.addOverlay(colList, "Coliseos");    
      
    // Attach the global function to the window object
    (window as any).handleButtonClick = this.handleButtonClick.bind(this);
    }

    handleButtonClick():void {
      this.router.navigate(['/reservations/details']);
    }



  // popupLayers = [
  //   circle([51.508, -0.11], { color: "#f06548", fillColor: "#f06548", radius: 500 }).bindPopup("I am a circle."),
  //   polygon([[51.509, -0.08], [51.503, -0.06], [51.51, -0.047],], { color: "#405189", fillColor: "#405189" }).bindPopup("I am a polygon."),
  //   marker([51.5, -0.09]).bindPopup("<b>Hello world!</b><br />I am a popup.")
  // ];

  
}
