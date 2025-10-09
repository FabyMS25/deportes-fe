import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { map, tileLayer, marker, featureGroup, LatLng } from 'leaflet';
import { OpenStreetMapProvider, GeoSearchControl } from 'leaflet-geosearch';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import * as L from 'leaflet';
// import 'esri-leaflet-geocoder';

import { HttpClient } from '@angular/common/http';
import { Observable, Subscriber } from 'rxjs';

@Component({
  selector: 'app-leaflet',
  templateUrl: './leaflet.component.html',
  styleUrls: ['./leaflet.component.scss']
})
export class LeafletComponent implements  OnInit {
  @Input('latitud') latitud: number=0;
  @Input('longitud') longitud: number=0;
  @Input('direccion') direccion: string = '';
  @Output('latLngEmitter') latLngEmitter = new EventEmitter();
  @Input() form:boolean=false;
  provider!: any;

      icon= L.icon({
        iconUrl: 'assets/icons/pin-Map_icon.svg ',
        //       iconUrl: 'assets/images/marker-icon.png',
        //       shadowUrl: 'assets/images/marker-shadow.png',
        iconSize: [28, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })

  constructor(private http: HttpClient,
    private activeModal: NgbActiveModal,
  ) { this.provider = new OpenStreetMapProvider(); }


  ngOnInit(): void {
    if (!this.latitud || !this.longitud) {
      this.latitud = -17.39753966183384;
      this.longitud = -66.28070536289276;
    }
    this.cargarMapa();
  }

  public cerrarMapa() {
    this.activeModal.close();
  }

  public cargarMapa() {
    let mapa = map('map').setView([this.latitud, this.longitud], 14);
    let marcadores = featureGroup();
    let capa = tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    });

    let marcador = marker([this.latitud, this.longitud], {
      icon:this.icon ,
      draggable: this.form,
      autoPan: true });
    let buscador = GeoSearchControl({
      provider: this.provider,
      style: 'bar',
      showMarker: false,
    });
     const basemapEnum = "arcgis/streets";

    marcadores.addTo(mapa);
    capa.addTo(mapa);
    marcador.addTo(mapa);
    marcadores.addLayer(marcador);

    if(this.form){
    buscador.addTo(mapa);
    this.getCurrentPosition().subscribe((position: any) => {
      marcadores.clearLayers();
      mapa.setView([position.latitude, position.longitude]);
      const marcador = marker([position.latitude, position.longitude], {
        icon:this.icon ,
        draggable: true,
        autoPan: true
      }).addTo(mapa);
      marcadores.addLayer(marcador);
      this.moverMarcador(marcador, mapa, null);
    });

    mapa.on('geosearch/showlocation', (position: any) => {
      marcadores.clearLayers();
      mapa.setView([position.location.y, position.location.x]);
      const marcador = marker([position.location.y, position.location.x], {
        icon:this.icon ,
        draggable: true,
        autoPan: true
      }).addTo(mapa);
      marcadores.addLayer(marcador);
      this.moverMarcador(marcador, mapa, null);
    });
    }
    this.moverMarcador(marcador, mapa, null);
  }

  private getCurrentPosition(): any {
    return new Observable((observer: Subscriber<any>) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position: any) => {
          observer.next({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          observer.complete();
        });
      } else {
        observer.error();
      }
    });
  }

  public moverMarcador(marcador:any, mapa:any, geocodeService:any) {
            let position = marcador.getLatLng();
            mapa.panTo(new LatLng(position.lat, position.lng));
            this.setLatLng(position);
        marcador.on('moveend', (e:any) => {
            let position = marcador.getLatLng();
            mapa.panTo(new LatLng(position.lat, position.lng));
            this.setLatLng(position);
        });
  }
    
  private setLatLng({ lat, lng }: { lat: number, lng: number }) {
    this.getAddress(lat,lng);
    this.latitud = lat;
    this.longitud = lng;
  }
  getAddress(lat: number, lng: number) {
    this.http.get(`https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=7fc648af73b44797bbf7e52b584cea51`)
      .subscribe((response:any) => {
        const address = response['results'][0]['formatted'];
      this.direccion=address
      });
  }

  public guardarUbicacion() {
    let latLng = {
      lat: this.latitud,
      lng: this.longitud,
      dir: this.direccion
    }
    this.latLngEmitter.emit(latLng);
    this.activeModal.close();
  }

}
