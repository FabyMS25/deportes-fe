import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { circle, latLng, tileLayer } from 'leaflet';

import * as L from 'leaflet';
@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss']
})

/**
 * Details Component
 */
export class DetailsComponent implements OnInit {

  // bread crumb items
  breadCrumbItems!: Array<{}>;
  submitted = false;
  currentTime!: string;
  private timerId: any;

   map!: L.Map;
  main!: L.TileLayer;
  // map:any;
  constructor(private modalService: NgbModal) { }

  ngOnInit(): void {
     this.breadCrumbItems = [
      { label: 'Canchas' },
      { label: 'Reservas', active: true }
    ];
    this.updateTime();
    this.timerId = setInterval(() => this.updateTime(), 1000);
    this.initMap(-17.387307611639038, -66.29626036201263);    
  }

  private initMap(lat:number,long:number): void {
    this.main = L.tileLayer(
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
    this.map = L.map('map', {
      center: [lat, long],
      zoom: 16,
      layers: [this.main, field]
    });
  }

  private updateTime(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString();
  }

  /**
   * Open modal
   * @param content modal content
   */
   openModal(content: any) {
    this.submitted = false;
    this.modalService.open(content, { size: 'md', centered: true });
  }
}
