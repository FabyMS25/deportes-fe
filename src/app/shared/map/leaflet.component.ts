import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { map, tileLayer, marker, featureGroup, LatLng, circle } from 'leaflet';
import { OpenStreetMapProvider, GeoSearchControl } from 'leaflet-geosearch';
import { Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';

import * as L from 'leaflet';

import { HttpClient } from '@angular/common/http';
import { Observable, Subscriber } from 'rxjs';

@Component({
  selector: 'app-leaflet',
  templateUrl: './leaflet.component.html',
  styleUrls: ['./leaflet.component.scss']
})
export class LeafletComponent implements OnInit, OnDestroy {
  @Input('latitud') latitud: number = 0;
  @Input('longitud') longitud: number = 0;
  @Input('direccion') direccion: string = '';
  @Output('latLngEmitter') latLngEmitter = new EventEmitter();
  @Input() form: boolean = false;
  @Input() title: string = 'Mapa';
  
  provider!: any;
  mapa: any;
  marcadores: any;
  marcadorActual: any;
  circuloUbicacion: any;
  
  isLoadingLocation: boolean = false;
  errorMessage: string = '';
  searchResults: any[] = [];
  showSuggestions: boolean = false;

  icon = L.icon({
    iconUrl: 'assets/icons/pin-Map_icon.svg',
    iconSize: [28, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  locationIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjNDA3OGZmIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjgiLz48L3N2Zz4=',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  constructor(
    private http: HttpClient,
    private activeModal: NgbActiveModal,
  ) {
    this.provider = new OpenStreetMapProvider();
  }

  ngOnInit(): void {
    if (!this.latitud || !this.longitud) {
      this.latitud = -17.39753966183384;
      this.longitud = -66.28070536289276;
    }
    this.cargarMapa();
    this.setInitialView();
  }

  ngOnDestroy(): void {
    if (this.mapa) {
      this.mapa.remove();
    }
  }

  public cerrarMapa() {
    this.activeModal.close();
  }

  public cargarMapa() {
    this.mapa = map('map', {
      zoomControl: true,
      attributionControl: true
    }).setView([this.latitud, this.longitud], 16);
    
    this.marcadores = featureGroup();
    
    let capa = tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 25,
      attribution: '© OpenStreetMap contributors'
    });

    let marcador = marker([this.latitud, this.longitud], {
      icon: this.icon,
      draggable: this.form,
      autoPan: true
    });

    let searchControl = GeoSearchControl({
      provider: this.provider,
      style: 'bar',
      showMarker: false,
      showPopup: false,
      autoClose: true,
      retainZoomLevel: false,
      animateZoom: true,
      keepResult: false,
      searchLabel: 'Buscar dirección o complejo deportivo...'
    });

    this.marcadores.addTo(this.mapa);
    capa.addTo(this.mapa);
    marcador.addTo(this.mapa);
    this.marcadores.addLayer(marcador);
    this.marcadorActual = marcador;
    if (this.latitud && this.longitud && this.latitud !== -17.39753966183384 && this.longitud !== -66.28070536289276) {
      this.mapa.setView([this.latitud, this.longitud], 18);
    }

    if (this.form) {
      this.mapa.addControl(searchControl);
      this.mapa.on('geosearch/showlocation', (event: any) => {
        this.onSearchResult(event.location);
      });
      this.mapa.on('click', (e: any) => {
        this.onMapClick(e.latlng);
      });
    }

    this.moverMarcador(marcador, this.mapa);
  }

  private onSearchResult(location: any) {
    this.marcadores.clearLayers();
    const { y, x } = location;
    this.mapa.setView([y, x], 18);
    
    const nuevoMarcador = marker([y, x], {
      icon: this.icon,
      draggable: true,
      autoPan: true
    }).addTo(this.mapa);
    
    this.marcadores.addLayer(nuevoMarcador);
    this.marcadorActual = nuevoMarcador;
    this.moverMarcador(nuevoMarcador, this.mapa);
  }

  public centerOnMarker() {
    if (this.marcadorActual) {
      const position = this.marcadorActual.getLatLng();
      this.mapa.setView([position.lat, position.lng], 18, {
        animate: true,
        duration: 0.5
      });
    }
  }

  public setInitialView() {
    if (this.latitud && this.longitud) {
      const isDefaultLocation = this.latitud === -17.39753966183384 && this.longitud === -66.28070536289276;
      const zoomLevel = isDefaultLocation ? 14 : 18;
      this.mapa.setView([this.latitud, this.longitud], zoomLevel);
    }
  }

  public useCurrentLocation() {
    this.isLoadingLocation = true;
    this.errorMessage = '';
    
    this.getCurrentPosition().subscribe(
      (position: any) => {
        this.isLoadingLocation = false;
        this.onSearchResult({
          y: position.latitude,
          x: position.longitude
        });
        if (this.circuloUbicacion) {
          this.mapa.removeLayer(this.circuloUbicacion);
        }
        this.circuloUbicacion = circle([position.latitude, position.longitude], {
          color: '#4078ff',
          fillColor: '#4078ff',
          fillOpacity: 0.1,
          radius: 100
        }).addTo(this.mapa);
      },
      (error:any) => {
        this.isLoadingLocation = false;
        this.errorMessage = 'No se pudo obtener la ubicación actual. Verifica los permisos del navegador.';
        console.error('Error getting position:', error);
      }
    );
  }

  private onMapClick(latlng: any) {
    if (!this.form) return;
    
    this.marcadores.clearLayers();
    
    const nuevoMarcador = marker([latlng.lat, latlng.lng], {
      icon: this.icon,
      draggable: true,
      autoPan: true
    }).addTo(this.mapa);
    
    this.marcadores.addLayer(nuevoMarcador);
    this.marcadorActual = nuevoMarcador;
    this.moverMarcador(nuevoMarcador, this.mapa);
  }

  public zoomIn() {
    this.mapa.zoomIn();
  }

  public zoomOut() {
    this.mapa.zoomOut();
  }

  private getCurrentPosition(): any {
    return new Observable((observer: Subscriber<any>) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position: any) => {
            observer.next({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            observer.complete();
          },
          (error) => {
            observer.error(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          }
        );
      } else {
        observer.error('Geolocation not supported');
      }
    });
  }

  public moverMarcador(marcador: any, mapa: any) {
    let position = marcador.getLatLng();
    this.setLatLng(position);
    
    marcador.on('dragstart', () => {
      this.errorMessage = '';
    });
    
    marcador.on('dragend', (e: any) => {
      let position = marcador.getLatLng();
      mapa.panTo(new LatLng(position.lat, position.lng));
      this.setLatLng(position);
    });
  }

  private setLatLng({ lat, lng }: { lat: number, lng: number }) {
    this.latitud = lat;
    this.longitud = lng;
    this.getAddress(lat, lng);
  }

  getAddress(lat: number, lng: number) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    
    this.http.get(url, {
      headers: {
        'Accept-Language': 'es'
      }
    }).subscribe(
      (response: any) => {
        if (response && response.display_name) {
          this.direccion = response.display_name;
        } else {
          this.direccion = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
      },
      (error) => {
        console.error('Error getting address:', error);
        this.direccion = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }
    );
  }

  public copiarCoordenadas() {
    const coords = `${this.latitud}, ${this.longitud}`;
    navigator.clipboard.writeText(coords).then(() => {
      const originalError = this.errorMessage;
      this.errorMessage = '';
      setTimeout(() => {
        this.errorMessage = originalError;
      }, 2000);
    });
  }

  public guardarUbicacion() {
    if (!this.direccion || this.direccion.trim() === '') {
      this.errorMessage = 'Por favor, selecciona una ubicación válida en el mapa.';
      return;
    }

    let latLng = {
      lat: this.latitud,
      lng: this.longitud,
      dir: this.direccion
    };
    
    this.latLngEmitter.emit(latLng);
    this.activeModal.close();
  }

  public resetMapa() {
    this.latitud = -17.39753966183384;
    this.longitud = -66.28070536289276;
    this.direccion = '';
    this.errorMessage = '';
    
    if (this.circuloUbicacion) {
      this.mapa.removeLayer(this.circuloUbicacion);
    }
    
    this.marcadores.clearLayers();
    this.mapa.setView([this.latitud, this.longitud], 14);
    
    const marcador = marker([this.latitud, this.longitud], {
      icon: this.icon,
      draggable: true,
      autoPan: true
    }).addTo(this.mapa);
    
    this.marcadores.addLayer(marcador);
    this.marcadorActual = marcador;
    this.moverMarcador(marcador, this.mapa);
  }
}