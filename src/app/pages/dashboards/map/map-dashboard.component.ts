import { Component, OnInit, TemplateRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import * as L from 'leaflet'
import 'leaflet.markercluster';
import * as GeoSearch from 'leaflet-geosearch';
import { ToastService } from '../admin/toast-service';
import { FacilitiesService } from 'src/app/core/services/api/facilities.service';
import { SportsFieldsService } from 'src/app/core/services/api/sports-fields.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { SuperficiesService } from 'src/app/core/services/api/superficies.service';
import { ComplejoDeportivo } from 'src/app/core/models/complejoDeportivo.model';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';
import { EstadoActual, StatusUtils } from 'src/app/core/constants/Estados';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { EncargadoComplejo } from 'src/app/core/models/encargadoComplejo.model';
import { Tarifa } from 'src/app/core/models/tarifa.model';
import { Categoria } from 'src/app/core/models/categoria.model';
import { TarifaCategoria } from 'src/app/core/models/tarifa-categoria.model';
import { take } from 'rxjs';

@Component({
    selector: 'app-map-dashboard',
    templateUrl: './map-dashboard.component.html',
    styleUrls: ['./map-dashboard.component.scss']
})
export class MapDashboardComponent implements OnInit {
    userRole: string = '';
    assignations!: any[];
    userData: any;

    loading = false;
    temp: any = []
    complexList: any[] = [];
    surfaceList: any[] = [];
    categoryList: any[] = [];
    fieldList: any[] = [];

    selectedCategories: string[] = [];
    selectedDistrict: string = '';
    minTarifa: number | null = null;
    maxTarifa: number | null = null;

    icon = L.icon({
        iconUrl: 'assets/icons/pin-location.png',
        iconSize: [44, 52],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    })
    map: any;
    layerControl: any;
    baseMaps: any;
    overlayMaps: any;
    main: any;
    mainList: any;

    searchControl: any;
    currentSearchMarker: any;
    searchQuery: string = '';
    searchResults: any[] = [];
    showSearchResults: boolean = false;    
    accuracyCircle!: L.Circle;
    userLocationMarker: any;

    systemConfigList: { [key: string]: ConfiguracionSistema } = {};
    get enableSolicitudRecurrentBooking(): boolean | undefined{
        return this.systemConfigList[ClaveConfiguracion.HABILITAR_SOLICITUD_RESERVAS_RECURRENTES]?.valorBoolean ?? false;
    }
    get enableRecurrentBooking(): boolean | undefined{
        return this.systemConfigList[ClaveConfiguracion.HABILITAR_RESERVAS_RECURRENTES]?.valorBoolean ?? false;
    }

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        public toastService: ToastService,
        private authService: AuthenticationService,
        private categoriesService: CategoriasService,
        private complexService: FacilitiesService,
        private fieldService: SportsFieldsService,
        private surfacesService: SuperficiesService,
        private offcanvasService: NgbOffcanvas,
    ) {}

    ngOnInit(): void {
        const pendingLoginEvent = this.authService.consumeLoginEvent();
        if (pendingLoginEvent) {
            this.showConsolidatedSystemStatus(pendingLoginEvent);
        } else {
            this.authService.loginEvent$
                .pipe(take(1))
                .subscribe(event => {
                this.showConsolidatedSystemStatus(event);
            });
        }
        this.systemConfigList = this.authService.getAllConfigs()
        const currentUser = this.authService.currentUser();
        this.userRole = this.authService.getUserRole();
        if (this.userRole === 'Contribuyente') {
            this.userData = currentUser;
        } else if (this.userRole === 'Admin') {
            this.userData = currentUser.designacion.personaDto;
        } else {
            this.userData = currentUser.designacion.personaDto;
            this.assignations = this.authService.staff();
        }
        this.initializeData();
    }
    
  private showConsolidatedSystemStatus(event: any): void {
    const configsLoaded = event.configsLoaded || 0;
    const finalRuatConnected = event.ruatStatus;
    let welcomeTitle = '';
    let welcomeMessage = '';
    switch(event.message) {
      case 'welcome_admin':
        welcomeTitle = '🎉 ¡Bienvenido Administrador!';
        welcomeMessage = 'Inicio de sesión exitoso con privilegios de administrador.';
        break;
      case 'welcome_staff':
        welcomeTitle = '👤 ¡Bienvenido Encargado!';
        welcomeMessage = 'Inicio de sesión exitoso.';
        break;
      case 'welcome_contribuyente':
        welcomeTitle = '¡Bienvenido!';
        welcomeMessage = 'Inicio de sesión exitoso.';
        break;
      default:
        welcomeTitle = '¡Bienvenido!';
        welcomeMessage = 'Inicio de sesión exitoso.';
    }    
    const isContribuyente = event.message === 'welcome_contribuyente' || this.userRole === 'Contribuyente';
    let statusMessage = 'Estado: ';
    if (configsLoaded > 0) {
      statusMessage += `Sistema conectado · Configuraciones: ${configsLoaded}\n`;
    } else {
      statusMessage += 'Sistema con conexión limitada · Configuraciones: 0\n';
    }
    if (finalRuatConnected) {
      statusMessage += 'RUAT: conectado · Todas las funciones disponibles.';
    } else {
      statusMessage += 'RUAT: no disponible.\n';
      if (isContribuyente) {
        statusMessage += 'Puede revisar complejos y reservas existentes.\n';
        statusMessage += 'No podrá crear reservas con cobro hasta que RUAT responda.\n';
        statusMessage += 'Si continúa, contacte a soporte o administración.';
      } else {
        statusMessage += 'Bloqueado: crear/anular tasas y consultar pagos RUAT.\n';
        statusMessage += 'Disponible: revisar reservas y datos ya registrados.\n';
        statusMessage += 'Si continúa, contacte al administrador o al ingeniero de sistemas.';
      }
    }
    const fullMessage = `${welcomeMessage}\n${statusMessage}`;
    this.toastService.show(fullMessage, {
      classname: finalRuatConnected ? 'bg-success text-light' : 'bg-warning text-dark',
      header: welcomeTitle,
      delay: finalRuatConnected ? 18000 : 26000,
      replaceKey: 'system-status'
    });
  }


    async initializeData() {
        this.loading = true;
        try {
            await this.getComplexes();
            await this.getSurfaces();
            await this.getFields();
            await this.getCategories();
            this.setMaps();
        } catch (error) {
            console.error('Error initializing data:', error);
        } finally {
            this.loading = false;
        }
    }
    setMaps() {
        this.main = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
        });        
        this.baseMaps = {
            "Mapa Básico": this.main,
        };
        this.setMarkersWithClustering();
    }

    private setMarkersWithClustering() {
        this.mainList = L.markerClusterGroup({
            chunkedLoading: true,
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: true,
            zoomToBoundsOnClick: true,
            iconCreateFunction: (cluster: any) => {
                const count = cluster.getChildCount();
                let size = 'small';
                if (count > 10) size = 'medium';
                if (count > 25) size = 'large';                
                return L.divIcon({
                    html: `<div class="cluster-marker cluster-${size}">${count}</div>`,
                    className: 'marker-cluster-custom',
                    iconSize: L.point(40, 40)
                });
            }
        });
        this.complexList.forEach((element, index) => {
            const complex = this.setPopup(element);
            this.mainList.addLayer(complex);
        });

        let filteredMarkers: any[] = this.getFilteredList();
        this.overlayMaps = {
            "<span style='color: blue'>Todos los Complejos</span>": this.mainList,
            ...filteredMarkers,
        };
        (window as any).handleButtonClick = this.handleButtonClick.bind(this);
    }
    private setMarkers() {
        let listMarkers: any[] = []
        this.complexList.forEach(element => {
            const complex = this.setPopup(element);
            listMarkers.push(complex);
        });
        this.mainList = L.layerGroup(listMarkers);
        let filteredMarkers: any[] = this.getFilteredList();
        this.overlayMaps = {
            "<span style='color: blue'>Todos los Complejos</span>": this.mainList,
            ...filteredMarkers,
        };
        (window as any).handleButtonClick = this.handleButtonClick.bind(this);
        this.configDefaultMap();
    }
    private configDefaultMap() {
        this.map = L.map('map', {
            zoom: 14,
            center: [-17.4010000, -66.2871000],
            layers: [this.main, this.mainList]
        });
        this.layerControl = L.control.layers(this.baseMaps, this.overlayMaps).addTo(this.map);
        this.addLocationControl();
        this.addCustomSearchControl();
        this.addLegend();
    }
        
    private addLocationControl() {
        const LocationControl = L.Control.extend({
            options: {
                position: 'topleft'
            },            
            onAdd: (map: L.Map) => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
                container.innerHTML = `
                    <button class="btn-locate" title="Mi ubicación" style="
                        width: 30px;
                        height: 30px;
                        background: white;
                        border: 1px solid #ccc;
                        border-radius: 4px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">
                        <i class="ri-user-location-line" style="font-size: 18px; color: #555;"></i>
                    </button>
                `;                 
                L.DomEvent.disableClickPropagation(container);
                
                const locateButton = container.querySelector('.btn-locate') as HTMLElement;
                locateButton.addEventListener('mouseenter', () => {
                    locateButton.style.background = '#f8f9fa';
                    locateButton.style.borderColor = '#999';
                });
                
                locateButton.addEventListener('mouseleave', () => {
                    locateButton.style.background = 'white';
                    locateButton.style.borderColor = '#ccc';
                });
                
                locateButton.addEventListener('click', () => {
                    this.locateUser();
                });
                
                return container;
            }
        });

        const locationControl = new LocationControl();
        this.map.addControl(locationControl);
    }
    private locateUser() {
        if (!navigator.geolocation) {
            Swal.fire('Error', 'La geolocalización no es soportada por tu navegador', 'error');
            return;
        }
        Swal.fire({
            title: 'Buscando tu ubicación...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        navigator.geolocation.getCurrentPosition(
            (position) => {
                Swal.close();
                const { latitude, longitude, accuracy } = position.coords;                
                this.map.setView([latitude, longitude], 15, {
                    animate: true,
                    duration: 1
                });
                if (this.userLocationMarker) {
                    this.map.removeLayer(this.userLocationMarker);
                }
                if (this.accuracyCircle) {
                    this.map.removeLayer(this.accuracyCircle);
                }
                const userIcon = L.divIcon({
                    html: `
                        <div class="user-location-marker">
                            <div class="pulse"></div>
                            <div class="dot"></div>
                        </div>
                    `,
                    className: 'user-location-icon',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });
                this.accuracyCircle = L.circle([latitude, longitude], {
                    radius: accuracy,
                    color: '#007bff',
                    fillColor: '#007bff',
                    fillOpacity: 0.1,
                    weight: 1,
                    dashArray: '5, 5'
                }).addTo(this.map);
                
                this.userLocationMarker = L.marker([latitude, longitude], {
                    icon: userIcon,
                    zIndexOffset: 1000
                }).addTo(this.map)
                .bindPopup(`
                    <div class="text-center">
                        <strong><i class="ri-user-location-line"></i> Tu ubicación actual</strong>
                        <br>
                        <small>Precisión: ±${Math.round(accuracy)} metros</small>
                        <br>
                        <small>Lat: ${latitude.toFixed(6)}</small>
                        <br>
                        <small>Lng: ${longitude.toFixed(6)}</small>
                    </div>
                `)
                .openPopup();
            },
            (error) => {
                let errorMessage = 'No se pudo obtener tu ubicación';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Permiso de ubicación denegado. Por favor, habilita la ubicación en tu navegador.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'La información de ubicación no está disponible.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Tiempo de espera agotado para obtener la ubicación.';
                        break;
                }
                Swal.fire('Error', errorMessage, 'error');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }  

    private addLegend() {
        const LegendControl = L.Control.extend({
            options: {
                position: 'bottomright'
            },
            onAdd: (map: L.Map) => {
                const div = L.DomUtil.create('div', 'info legend');
                div.innerHTML = `
                    <h6>Leyenda</h6>
                    <div class="legend-item">
                        <img src="assets/icons/pin-location.png" width="20" height="24"> Complejo Activo
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: #28a745"></span> Complejo Activo
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: #ffc107"></span> En Mantenimiento
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: #dc3545"></span> Cerrado
                    </div>
                    <div class="legend-item">
                        <span class="legend-color" style="background: #0dcaf0"></span> Con Iluminación
                    </div>
                `;
                return div;
            }
        });
        const legend = new LegendControl();
        legend.addTo(this.map);
    }

    private addCustomSearchControl() {
        const SearchControl = L.Control.extend({
            options: {
                position: 'topright'
            },            
            onAdd: (map: any) => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control custom-search-control');
                container.style.background = 'white';
                container.style.padding = '0';
                container.style.borderRadius = '8px';
                container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                container.style.minWidth = '200px';
                container.style.zIndex = '1000';

                const searchWrapper = L.DomUtil.create('div', 'search-wrapper', container);
                searchWrapper.style.position = 'relative';

                const searchInput = L.DomUtil.create('input', 'search-input', searchWrapper);
                searchInput.type = 'text';
                searchInput.placeholder = 'Buscar complejo deportivo...';
                searchInput.style.width = '100%';
                searchInput.style.background = 'light';
                searchInput.style.padding = '12px 45px 12px 15px';
                searchInput.style.border = 'none';
                searchInput.style.outline = 'none';
                searchInput.style.fontSize = '14px';
                searchInput.style.borderRadius = '8px';
                searchInput.style.border = '2px solid #e9ecef';
                searchInput.style.transition = 'border-color 0.2s';

                const searchIcon = L.DomUtil.create('i', 'ri-search-line', searchWrapper);
                searchIcon.style.position = 'absolute';
                searchIcon.style.right = '15px';
                searchIcon.style.top = '50%';
                searchIcon.style.transform = 'translateY(-50%)';
                searchIcon.style.color = '#6c757d';
                searchIcon.style.fontSize = '18px';
                searchIcon.style.pointerEvents = 'none';

                const resultsContainer = L.DomUtil.create('div', 'search-results', container);
                resultsContainer.style.display = 'none';
                resultsContainer.style.maxHeight = '400px';
                resultsContainer.style.overflowY = 'auto';
                resultsContainer.style.borderTop = '1px solid #e9ecef';
                resultsContainer.style.borderRadius = '0 0 8px 8px';
                
                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.disableScrollPropagation(container);
                
                searchInput.addEventListener('focus', () => {
                    searchInput.style.borderColor = '#007bff';
                    if (this.searchResults.length > 0) {
                        resultsContainer.style.display = 'block';
                    }
                });
                
                searchInput.addEventListener('blur', () => {
                    searchInput.style.borderColor = '#e9ecef';
                    setTimeout(() => {
                        resultsContainer.style.display = 'none';
                    }, 200);
                });
                
                searchInput.addEventListener('input', (e: any) => {
                    this.onSearchInput(e.target.value, resultsContainer);
                });
                
                return container;
            }
        });
        this.searchControl = new SearchControl();
        this.map.addControl(this.searchControl);
    }
    private onSearchInput(query: string, resultsContainer: HTMLElement) {
        this.searchQuery = query.toLowerCase().trim();
        if (this.searchQuery.length < 2) {
            resultsContainer.style.display = 'none';
            this.searchResults = [];
            return;
        }
        this.searchResults = this.complexList.filter((complex:ComplejoDeportivo) => {
            const matchName = complex.nombre?.toLowerCase().includes(this.searchQuery);
            const matchLocation = complex.ubicacion?.toLowerCase().includes(this.searchQuery);
            const matchDistrict = complex.distrito?.toLowerCase().includes(this.searchQuery);
            const matchEncargado = complex.encargadosDtoList?.some(enc => 
                enc.nombre?.toLowerCase().includes(this.searchQuery)
            );
            const matchSurface = complex.camposDeportivosDtoList?.some(campo => 
                campo.superficieDto?.descripcion?.toLowerCase().includes(this.searchQuery)
            ); 
            const matchSport = complex.camposDeportivosDtoList?.some(campo => 
                campo.tarifasDtoList?.some(tarifa =>
                tarifa.categoriasDtoList?.some(cat => cat.categoriaDto.nombre?.toLowerCase().includes(this.searchQuery) )
            ));
            return matchName || matchLocation || matchDistrict || matchEncargado || matchSport || matchSurface;
        });
        this.searchResults.sort((a, b) => {
            const aScore = this.calculateRelevanceScore(a);
            const bScore = this.calculateRelevanceScore(b);
            return bScore - aScore;
        });
        this.renderSearchResults(resultsContainer);
    }
    private calculateRelevanceScore(complex: any): number {
        let score = 0;
        if (complex.nombre?.toLowerCase() === this.searchQuery) score += 10;
        if (complex.nombre?.toLowerCase().includes(this.searchQuery)) score += 5;
        if (complex.ubicacion?.toLowerCase().includes(this.searchQuery)) score += 3;
        if (complex.distrito?.toLowerCase().includes(this.searchQuery)) score += 2;
        if (complex.estadoActual?.toLowerCase() === 'activo') score += 2;        
        return score;
    }
    private renderSearchResults(container: HTMLElement) {
        container.innerHTML = '';
        if (this.searchResults.length === 0) {
            container.style.display = 'block';
            const noResults = L.DomUtil.create('div', 'search-result-item no-results', container);
            noResults.style.padding = '15px';
            noResults.style.textAlign = 'center';
            noResults.style.color = '#6c757d';
            noResults.innerHTML = '<i class="ri-information-line"></i> No se encontraron resultados';
            return;
        }        
        container.style.display = 'block';
        const limitedResults = this.searchResults.slice(0, 10);
        limitedResults.forEach(complex => {
            const resultItem = L.DomUtil.create('div', 'search-result-item', container);
            resultItem.style.padding = '12px 15px';
            resultItem.style.cursor = 'pointer';
            resultItem.style.borderBottom = '1px solid #e9ecef';
            resultItem.style.transition = 'background-color 0.2s';            
            const estadoBadge = this.getEstadoBadgeText(complex.estadoActual);
            const uniqueSurfaces = Array.from(new Set(
                complex.camposDeportivosDtoList
                    ?.map((campo: CampoDeportivo) => campo.superficieDto?.descripcion)
                    .filter(Boolean)
            )) as string[];
            const uniqueCategories = this.getAvailableDisciplines(complex);
            resultItem.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="fw-semibold text-dark mb-1">${this.highlightMatch(complex.nombre, this.searchQuery)}</div>
                        <div class="mb-1">
                            <small class="text-muted">
                                <i class="ri-map-pin-line"></i> 
                                ${this.highlightMatch(complex.ubicacion, this.searchQuery)}
                                ${complex.distrito ? ` - ${this.highlightMatch(complex.distrito, this.searchQuery)}` : ''}
                            </small>
                        </div>
                        ${complex.encargadosDtoList?.length > 0 ? `
                        <div class="mb-1">
                            <small class="text-muted">
                                <i class="ri-user-line"></i> 
                                ${complex.encargadosDtoList.map((enc: EncargadoComplejo) => 
                                    this.highlightMatch(enc.nombre, this.searchQuery)
                                ).join(', ')}
                            </small>
                        </div>
                        ` : ''}
                        ${uniqueSurfaces.length > 0 ? `
                        <div class="mb-1">
                            <small class="text-muted">
                                <i class="ri-landscape-line"></i> 
                                ${uniqueSurfaces.map((surface: string) => 
                                    this.highlightMatch(surface, this.searchQuery)
                                ).join(', ')}
                            </small>
                        </div>
                        ` : ''}
                        ${uniqueCategories.length > 0 ? `
                        <div class="mb-1">
                            <small class="text-muted">
                                <i class="ri-basketball-line"></i> 
                                ${uniqueCategories.map((category: string) => 
                                    this.highlightMatch(category, this.searchQuery)
                                ).join(', ')}
                            </small>
                        </div>
                        ` : ''}
                    </div>                    
                    <span class="badge ${estadoBadge.class} ms-2">${estadoBadge.text}</span>
                </div>
            `;
            resultItem.addEventListener('mouseenter', () => {
                resultItem.style.backgroundColor = '#f8f9fa';
            });            
            resultItem.addEventListener('mouseleave', () => {
                resultItem.style.backgroundColor = 'transparent';
            });            
            resultItem.addEventListener('click', () => {
                this.selectSearchResult(complex);
                container.style.display = 'none';
            });
        });
        
        if (this.searchResults.length > 10) {
            const moreResults = L.DomUtil.create('div', 'search-result-item', container);
            moreResults.style.padding = '10px 15px';
            moreResults.style.textAlign = 'center';
            moreResults.style.color = '#6c757d';
            moreResults.style.fontSize = '12px';
            moreResults.innerHTML = `<i class="ri-more-line"></i> +${this.searchResults.length - 10} resultados más...`;
        }
    }
    private selectSearchResult(complex: any) {
        if (this.currentSearchMarker) {
            this.map.removeLayer(this.currentSearchMarker);
        }
        this.map.setView([complex.latitud, complex.longitud], 17, {
            animate: true,
            duration: 0.5
        });
        this.mainList.eachLayer((layer: any) => {
            if (layer.getLatLng) {
                const latlng = layer.getLatLng();
                if (latlng.lat === complex.latitud && latlng.lng === complex.longitud) {
                    setTimeout(() => {
                        layer.openPopup();
                    }, 500);
                }
            }
        });
        const highlightCircle = L.circle([complex.latitud, complex.longitud], {
            color: '#0d6efd',
            fillColor: '#0d6efd',
            fillOpacity: 0.1,
            radius: 100,
            weight: 2
        }).addTo(this.map);
        setTimeout(() => {
            this.map.removeLayer(highlightCircle);
        }, 3000);
    }

    private setPopup(element: any): any {
        const complex = L.marker([element.latitud, element.longitud], { icon: this.icon });
        const popupContent = document.createElement('div');
        const estadoBadge = this.getEstadoBadge(element.estadoActual);
        const encargado = element.encargadosDtoList && element.encargadosDtoList[0] 
            ? element.encargadosDtoList[0].nombre 
            : 'No asignado';
        const camposInfo = this.getCamposInfo(element);
        const priceRange = this.getPriceRange(element); 
        const uniqueCategories = this.getAvailableDisciplines(element); 
        popupContent.innerHTML = `
            <div class="map-popup-content" style="min-width: 320px;">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h5 class="mb-0"><strong>${element.nombre}</strong></h5>
                    ${estadoBadge}
                </div>                
                <div class="popup-info">           
                    <div class="info-row">
                        <i class="ri-building-line me-2"></i>
                        <span><strong>Estructura:</strong> ${element.tipoEstructura || 'N/A'}</span>
                    </div>
                    ${element.encargadosDtoList.length >0 ? `
                    <div class="info-row">
                        <i class="ri-user-line me-2"></i>
                        <span><strong>Encargado(s):</strong>                        
                        ${encargado}
                        </span>
                    </div>
                    ` : ''}    
                    ${element.telefonoPrincipal ? `
                    <div class="info-row">
                        <i class="ri-phone-line me-2"></i>
                        <span><strong>Teléfono:</strong> 
                            <a href="tel:${element.telefonoPrincipal}" class="text-decoration-none">
                                ${element.telefonoPrincipal}
                            </a>
                        </span>
                    </div>
                    ` : ''}
                    <div class="info-row">
                        <i class="ri-road-map-line me-2"></i>
                        <span><strong>Ubicación:</strong> ${element.ubicacion}</span>
                    </div>
                </div>
                <hr class="my-2">
                <div class="campos-section">
                    <div class="d-flex align-items-center mb-1">
                        <i class="ri-landscape-line me-2"></i>
                        <strong>Campos Deportivos (${camposInfo.total})</strong>
                    </div>
                    ${camposInfo.html}
                    ${uniqueCategories.length > 0 ? `
                    <div class="available-sports">
                        <i class="ri-basketball-line me-2"></i> 
                        <strong>Disiplinas:</strong>
                        <small class="text-muted">
                            ${uniqueCategories.map((category: string) => 
                                this.highlightMatch(category, this.searchQuery)
                            ).join(', ')}
                        </small>
                    </div>
                    ` : ''}
                </div>
                ${priceRange ? `
                    <div class="price-range mt-2">
                        <i class="ri-price-tag-3-line"></i>
                        <strong>Precios desde:</strong> ${priceRange}
                    </div>
                ` : ''}
                <div class="facilities mt-2">
                    ${element.tieneIluminacion ? '<span class="badge bg-info me-1"><i class="ri-lightbulb-line"></i> Iluminación</span>' : ''}
                    ${element.tieneVestuarios ? '<span class="badge bg-info me-1"><i class="ri-door-line"></i> Vestuarios</span>' : ''}
                    ${element.tieneGraderias ? '<span class="badge bg-info me-1"><i class="ri-community-line"></i> Graderías</span>' : ''}
                </div>
                ${element.observaciones ? `
                    <div class="observaciones mt-2">
                        <small class="text-muted"><i class="ri-information-line"></i> ${element.observaciones}</small>
                    </div>
                ` : ''}
                ${element.estadoActual.toLowerCase() === 'activo' && this.authService.canCurrentUserCreateReservations() ? `
                    <div class="mt-3 d-flex gap-1">
                        <button class="btn btn-primary btn-sm w-100 mb-2 btn-reserva-puntual">
                            <i class="ri-calendar-check-line"></i>Reserva Puntual
                        </button>                        
                        ${this.userRole !== 'Contribuyente' || (this.enableRecurrentBooking || this.enableSolicitudRecurrentBooking) ? `
                            <button class="btn btn-success btn-sm w-100 mb-2 btn-reserva-recurrente">
                                <i class="ri-repeat-line"></i>Reserva Recurrente
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
        const btnPuntual = popupContent.querySelector('.btn-reserva-puntual');
        const btnRecurrente = popupContent.querySelector('.btn-reserva-recurrente');        
        if (btnPuntual) {
            btnPuntual.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.goToReservation(element, 'puntual');
            });
        }        
        if (btnRecurrente) {
            btnRecurrente.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.goToReservation(element, 'recurrente');
            });
        }        
        complex.bindPopup(popupContent, { maxWidth: 350 });
        return complex;
    }
    private getCamposInfo(complejo: any): { html: string, total: number } {
        if (!complejo.camposDeportivosDtoList || complejo.camposDeportivosDtoList.length === 0) {
            return { html: '<small class="text-muted">No hay campos disponibles</small>', total: 0 };
        }        
        const groupedBySurface: any = {};
        complejo.camposDeportivosDtoList.forEach((campo: any) => {
            const superficie = campo.superficieDto?.descripcion || 'Sin especificar';
            if (!groupedBySurface[superficie]) {
                groupedBySurface[superficie] = [];
            }
            groupedBySurface[superficie].push(campo);
        });
        let html = '<div class="campos-list">';
        Object.keys(groupedBySurface).forEach(superficie => {
            const campos = groupedBySurface[superficie];
            const activeCampos = campos.filter((c: any) => c.estadoActual === EstadoActual.ACTIVO).length; 
            html += `
                <div class="surface-group mb-1">
                    <small>
                        <strong>${superficie}</strong>: ${campos.length} campo${campos.length > 1 ? 's' : ''}
                        ${activeCampos < campos.length ? ` (${activeCampos} activo${activeCampos !== 1 ? 's' : ''})` : ''}
                    </small>
                </div>
            `;
        });
        html += '</div>';
        return { html, total: complejo.camposDeportivosDtoList.length };
    }
    private getAvailableDisciplines(complex: any): string[] {        
        return Array.from(new Set(
                complex.camposDeportivosDtoList
                    ?.flatMap((campo: CampoDeportivo) => 
                        campo.tarifasDtoList
                            ?.flatMap((tarifa: Tarifa) => 
                                tarifa.categoriasDtoList
                                    ?.map((cat: any) => cat.categoriaDto.nombre)
                            )
                    )
                    .filter(Boolean)
            )) as string[];  
    }
    private getPriceRange(complejo: any): string | null {
        if (!complejo.camposDeportivosDtoList || complejo.camposDeportivosDtoList.length === 0) {
            return null;
        }
        let minPrice = Infinity;
        let maxPrice = -Infinity;
        complejo.camposDeportivosDtoList.forEach((campo: any) => {
            if (campo.tarifasDtoList && campo.tarifasDtoList.length > 0) {
                campo.tarifasDtoList.forEach((tarifa: any) => {
                    if (tarifa.activo && tarifa.precioBase) {
                        const precio = parseFloat(tarifa.precioBase);
                        minPrice = Math.min(minPrice, precio);
                        maxPrice = Math.max(maxPrice, precio);
                    }
                });
            }
        });
        if (minPrice === Infinity || maxPrice === -Infinity) {
            return null;
        }
        if (minPrice === maxPrice) {
            return `Bs. ${minPrice.toFixed(2)}`;
        }
        return `Bs. ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}`;
    }
    private getEstadoBadge(estado: string): string {
        const badge = this.getEstadoBadgeText(estado);
        return `<span class="badge ${badge.class}">${badge.text}</span>`;
    }
    private getEstadoBadgeText(estado: string): { text: string, class: string } {
        const labels: Record<string, string> = {
            [EstadoActual.ACTIVO]: 'Activo',
            [EstadoActual.MANTENIMIENTO]: 'Mantenimiento',
            [EstadoActual.CERRADO]: 'Cerrado',
            [EstadoActual.EVENTO_MUNICIPAL]: 'Reservado para Evento Municipal'
        };
        return {
            text: labels[estado] || 'N/A',
            class: StatusUtils.getStatusBgClass(estado)
        };
    }
    private highlightMatch(text: string, query: string): string {
        if (!text || !query) return text || '';        
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark style="background-color: #fff3cd; padding: 0 2px;">$1</mark>');
    }

    filterByStatus(status: string) {
        const filtered = this.complexList.filter(complex => 
            complex.estadoActual === status
        );
        this.updateMapMarkers(filtered);
    }
    getFilteredList(): any[] {
        let filteredMarkers: any[] = []        
        this.surfaceList.forEach(item => {
            const complexesBySurface = this.complexList.filter(complex =>
                complex.camposDeportivosDtoList?.some((c: any) => 
                    c.superficieDto?.descripcion === item.descripcion
                )
            );
            const mergedList = [...new Set([...complexesBySurface])];
            const markers = mergedList.map(element => {
                const complex = this.setPopup(element);
                return complex;
            });
            if (markers.length > 0) {
                filteredMarkers[item.descripcion] = L.layerGroup(markers);
            }
        });        
        return filteredMarkers;
    }
    onCategoryChange(categoryName: string, event: any) {
        if (event.target.checked) {
            this.selectedCategories.push(categoryName);
        } else {
            const index = this.selectedCategories.indexOf(categoryName);
            if (index > -1) {
                this.selectedCategories.splice(index, 1);
            }
        }
    }
    applyFilters() {
        let filteredComplexes = [...this.complexList];
        if (this.selectedDistrict) {
            filteredComplexes = filteredComplexes.filter(c => 
                c.distrito === this.selectedDistrict
            );
        }
        if (this.minTarifa !== null || this.maxTarifa !== null) {
            filteredComplexes = filteredComplexes.filter(complejo => {
                if (!complejo.camposDeportivosDtoList) return false;                
                return complejo.camposDeportivosDtoList.some((campo: any) => {
                    if (!campo.tarifasDtoList) return false;                    
                    return campo.tarifasDtoList.some((tarifa: any) => {
                        if (!tarifa.activo || !tarifa.precioBase) return false;
                        const precio = parseFloat(tarifa.precioBase);
                        if (this.minTarifa !== null && precio < this.minTarifa) return false;
                        if (this.maxTarifa !== null && precio > this.maxTarifa) return false;
                        return true;
                    });
                });
            });
        }
        if (this.selectedCategories.length > 0) {
            filteredComplexes = filteredComplexes.filter(complejo => {
                if (!complejo.camposDeportivosDtoList) return false;                
                return complejo.camposDeportivosDtoList.some((campo: any) => {
                    if (!campo.tarifasDtoList) return false;                    
                    return campo.tarifasDtoList.some((tarifa: any) => {
                        if (!tarifa.categoriasDtoList) return false;                        
                        return tarifa.categoriasDtoList.some((tc: any) => {
                            return this.selectedCategories.includes(tc.categoriaDto?.nombre);
                        });
                    });
                });
            });
        }
        this.updateMapMarkers(filteredComplexes);
        this.offcanvasService.dismiss();
    }
    clearFilters() {
        this.selectedCategories = [];
        this.selectedDistrict = '';
        this.minTarifa = null;
        this.maxTarifa = null;        
        this.updateMapMarkers(this.complexList);
        this.offcanvasService.dismiss();
    }
    private updateMapMarkers(complexes: any[]) {
        if (this.mainList) {
            this.map.removeLayer(this.mainList);
        }
        let listMarkers: any[] = []
        complexes.forEach(element => {
            const complex = this.setPopup(element);
            listMarkers.push(complex);
        });
        this.mainList = L.layerGroup(listMarkers);
        this.mainList.addTo(this.map);
        if (complexes.length === 0) {
            Swal.fire({
                title: 'Sin resultados',
                text: 'No se encontraron complejos con los filtros aplicados',
                icon: 'info',
                confirmButtonColor: '#299cdb'
            });
        }
    }

    get uniqueDistricts(): string[] {
        const districts = this.complexList
            .map(c => c.distrito)
            .filter(d => d && d.trim() !== '');
        return [...new Set(districts)].sort();
    }
    /* API Services */
    private getComplexes() {
        this.complexService.getAll().subscribe({
            next: (data: any) => {
                this.complexList = data;
                this.temp = data;
                this.setMarkers()
            },
            error: (error) => {
                Swal.fire({ 
                    text: 'No se pudo recuperar los complejos deportivos', 
                    icon: 'error',
                    confirmButtonColor: '#299cdb' 
                });
            }
        });
    }
    private getFields() {
        this.fieldService.getAll().subscribe({
            next: (data: any) => {
                this.fieldList = data;
            },
            error: (error) => {
                Swal.fire({ 
                    text: 'No se pudo recuperar los campos deportivos', 
                    icon: 'error',
                    confirmButtonColor: '#299cdb' 
                });
            }
        });
    }
    private getCategories() {
        this.categoriesService.getAll().subscribe({
            next: (data: any) => {
                this.categoryList = data;
            },
            error: (error) => {
                Swal.fire({ 
                    text: error?.message || 'No se pudo recuperar las categorías', 
                    icon: 'error',
                    confirmButtonColor: '#299cdb' 
                });
            }
        });
    }
    private getSurfaces() {
        this.surfacesService.getAll().subscribe({
            next: (data: any) => {
                this.surfaceList = data;
            },
            error: (error) => {
                Swal.fire({ 
                    text: error?.message || 'No se pudo recuperar las superficies', 
                    icon: 'error',
                    confirmButtonColor: '#299cdb' 
                });
            }
        });
    }
    
    handleButtonClick(data: any): void {
        if (!this.ensureReservationAllowed()) return;
        this.router.navigate(['/reservations/details'], { state: { data: data } });
    }
    public goToReservation(complejo: ComplejoDeportivo | null, bookingType: string) {
        if (!this.ensureReservationAllowed()) return;
        this.router.navigate(['/reservations/details'], { 
            state: { 
                data: complejo,
                tipoReserva: bookingType
            } 
        });
    }

    private ensureReservationAllowed(): boolean {
        if (this.authService.canCurrentUserCreateReservations()) return true;

        void Swal.fire({
            icon: 'warning',
            title: 'Reserva no disponible',
            text: this.authService.getReservationRestrictionMessage(),
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#299cdb'
        });
        return false;
    }
    openEnd(content: TemplateRef<any>) {
        this.offcanvasService.open(content, { position: 'end' });
    }
}

