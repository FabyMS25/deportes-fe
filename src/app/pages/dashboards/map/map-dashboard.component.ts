import { Component, OnInit, TemplateRef } from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import Swal from 'sweetalert2';
import * as GeoSearch from 'leaflet-geosearch';
import { ComplejosService } from 'src/app/core/services/api/conplejos.service';
import { CamposDeportivoService } from 'src/app/core/services/api/camposDeportivos.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { SuperficiesService } from 'src/app/core/services/api/superficies.service';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { ComplejoDeportivo } from 'src/app/core/models/complejoDeportivo.model';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ConfiguracionSistema } from 'src/app/core/models/configuracionSistema.model';
import { ClaveConfiguracion } from 'src/app/core/constants/Configurations';
import { EstadoUsuario } from 'src/app/core/constants/Estados';

@Component({
    selector: 'app-map-dashboard',
    templateUrl: './map-dashboard.component.html',
    styleUrls: ['./map-dashboard.component.scss']
})
export class MapDashboardComponent implements OnInit {

    userRole: string = '';
    assignations!: any[];
    userData: any;
    temp: any = []
    complexList: any[] = [];
    surfaceList: any[] = [];
    categoryList: any[] = [];
    fieldList: any[] = [];
    
    systemConfigList: { [key: string]: ConfiguracionSistema } = {};
    get enableRecurrentBooking(): boolean | undefined {
        return this.systemConfigList[ClaveConfiguracion.HABILITAR_RESERVAS_RECURRENTES]?.valorBoolean ?? true;
    }

    loading = false;
    map: any;
    layerControl: any;
    searchControl: any;
    currentSearchMarker: any;
    
    icon = L.icon({
        iconUrl: 'assets/icons/pin-location.png',
        iconSize: [44, 52],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    })

    selectedCategories: string[] = [];
    selectedDistrict: string = '';
    minTarifa: number | null = null;
    maxTarifa: number | null = null;

    // Search properties
    searchQuery: string = '';
    searchResults: any[] = [];
    showSearchResults: boolean = false;

    constructor(
        private router: Router,
        private authService: AuthenticationService,
        private categoriesService: CategoriasService,
        private complexService: ComplejosService,
        private fieldService: CamposDeportivoService,
        private surfacesService: SuperficiesService,
        private offcanvasService: NgbOffcanvas,
    ) {}

    ngOnInit(): void {
        this.systemConfigList = this.authService.getAllConfigs()
        const currentUser = this.authService.currentUser();
        this.userRole = this.authService.getUserRole();
        if (this.userRole === 'Contribuyente') {
            this.userData = currentUser;
        } else if (this.userRole === 'Admin') {
            this.userData = currentUser.designacion.personaDto;
        } else {
            this.userData = currentUser.designacion.personaDto;
            const funcionarioString = localStorage.getItem('assignaments');
            this.assignations = funcionarioString ? JSON.parse(funcionarioString) : null;
        }

        this.initializeData();
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
        } finally {
            this.loading = false;
        }
    }

    configDefaultMap() {
        this.map = L.map('map', {
            zoom: 14,
            center: [-17.4010000, -66.2871000],
            layers: [this.main, this.mainList]
        });

        this.layerControl = L.control.layers(this.baseMaps, this.overlayMaps).addTo(this.map);

        // Add custom search control
        this.addCustomSearchControl();
    }

    private addCustomSearchControl() {
        // Create custom search control
        const SearchControl = L.Control.extend({
            options: {
                position: 'topleft'
            },
            
            onAdd: (map: any) => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control custom-search-control');
                container.style.background = 'white';
                container.style.padding = '0';
                container.style.borderRadius = '8px';
                container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                container.style.minWidth = '300px';

                const searchWrapper = L.DomUtil.create('div', 'search-wrapper', container);
                searchWrapper.style.position = 'relative';

                const searchInput = L.DomUtil.create('input', 'search-input', searchWrapper);
                searchInput.type = 'text';
                searchInput.placeholder = 'Buscar complejo deportivo...';
                searchInput.style.width = '100%';
                searchInput.style.padding = '10px 40px 10px 15px';
                searchInput.style.border = 'none';
                searchInput.style.outline = 'none';
                searchInput.style.fontSize = '14px';
                searchInput.style.borderRadius = '8px';

                const searchIcon = L.DomUtil.create('i', 'ri-search-line', searchWrapper);
                searchIcon.style.position = 'absolute';
                searchIcon.style.right = '15px';
                searchIcon.style.top = '50%';
                searchIcon.style.transform = 'translateY(-50%)';
                searchIcon.style.color = '#6c757d';
                searchIcon.style.pointerEvents = 'none';

                const resultsContainer = L.DomUtil.create('div', 'search-results', container);
                resultsContainer.style.display = 'none';
                resultsContainer.style.maxHeight = '300px';
                resultsContainer.style.overflowY = 'auto';
                resultsContainer.style.borderTop = '1px solid #e9ecef';

                // Stop propagation of map events
                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.disableScrollPropagation(container);

                // Search input handler
                searchInput.addEventListener('input', (e: any) => {
                    this.onSearchInput(e.target.value, resultsContainer);
                });

                searchInput.addEventListener('focus', () => {
                    if (this.searchResults.length > 0) {
                        resultsContainer.style.display = 'block';
                    }
                });

                // Click outside to close
                document.addEventListener('click', (e: any) => {
                    if (!container.contains(e.target)) {
                        resultsContainer.style.display = 'none';
                    }
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

        // Search in complexes
        this.searchResults = this.complexList.filter(complex => {
            const matchName = complex.nombre?.toLowerCase().includes(this.searchQuery);
            const matchLocation = complex.ubicacion?.toLowerCase().includes(this.searchQuery);
            const matchDistrict = complex.distrito?.toLowerCase().includes(this.searchQuery);
            const matchEncargado = complex.encargadosDtoList?.some((enc: any) => 
                enc.nombre?.toLowerCase().includes(this.searchQuery)
            );
            
            return matchName || matchLocation || matchDistrict || matchEncargado;
        });

        this.renderSearchResults(resultsContainer);
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

        // Limit to 10 results
        const limitedResults = this.searchResults.slice(0, 10);

        limitedResults.forEach(complex => {
            const resultItem = L.DomUtil.create('div', 'search-result-item', container);
            resultItem.style.padding = '12px 15px';
            resultItem.style.cursor = 'pointer';
            resultItem.style.borderBottom = '1px solid #e9ecef';
            resultItem.style.transition = 'background-color 0.2s';

            const estadoBadge = this.getEstadoBadgeText(complex.estadoActual?.toLowerCase());
            
            resultItem.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="fw-semibold text-dark">${this.highlightMatch(complex.nombre, this.searchQuery)}</div>
                        <small class="text-muted">
                            <i class="ri-map-pin-line"></i> ${this.highlightMatch(complex.ubicacion, this.searchQuery)}
                        </small>
                        ${complex.distrito ? `<br><small class="text-muted"><i class="ri-building-line"></i> ${complex.distrito}</small>` : ''}
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

    private highlightMatch(text: string, query: string): string {
        if (!text || !query) return text || '';
        
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark style="background-color: #fff3cd; padding: 0 2px;">$1</mark>');
    }

    private getEstadoBadgeText(estado: string): { text: string, class: string } {
        switch (estado?.toLowerCase()) {
            case 'activo':
                return { text: 'Activo', class: 'bg-success' };
            case 'mantenimiento':
                return { text: 'Mantenimiento', class: 'bg-warning' };
            case 'cerrado':
                return { text: 'Cerrado', class: 'bg-danger' };
            default:
                return { text: 'N/A', class: 'bg-secondary' };
        }
    }

    private selectSearchResult(complex: any) {
        // Remove previous search marker if exists
        if (this.currentSearchMarker) {
            this.map.removeLayer(this.currentSearchMarker);
        }

        // Center map on selected complex
        this.map.setView([complex.latitud, complex.longitud], 17, {
            animate: true,
            duration: 0.5
        });

        // Find and open popup for this complex
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

        // Add a temporary highlight circle
        const highlightCircle = L.circle([complex.latitud, complex.longitud], {
            color: '#0d6efd',
            fillColor: '#0d6efd',
            fillOpacity: 0.1,
            radius: 100,
            weight: 2
        }).addTo(this.map);

        // Remove highlight after 3 seconds
        setTimeout(() => {
            this.map.removeLayer(highlightCircle);
        }, 3000);
    }

    baseMaps: any;
    overlayMaps: any;
    main: any;
    
    setMaps() {
        this.main = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
        })
        
        this.baseMaps = {
            "Mapa Básico": this.main,
        };
    }

    mainList: any;
    
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

    private setPopup(element: any): any {
        const complex = L.marker([element.latitud, element.longitud], { icon: this.icon });
        const popupContent = document.createElement('div');
        const camposInfo = this.getCamposInfo(element);
        const encargado = element.encargadosDtoList && element.encargadosDtoList[0] 
            ? element.encargadosDtoList[0].nombre 
            : 'No asignado';
        const estadoBadge = this.getEstadoBadge(element.estadoActual.toLowerCase());
        const priceRange = this.getPriceRange(element);
        
        popupContent.innerHTML = `
            <div class="map-popup-content" style="min-width: 280px;">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="mb-0"><strong>${element.nombre}</strong></h6>
                    ${estadoBadge}
                </div>
                
                <div class="popup-info">
                    <div class="info-row">
                        <i class="ri-user-line"></i>
                        <span><strong>Encargado:</strong> ${encargado}</span>
                    </div>
                    
                    <div class="info-row">
                        <i class="ri-building-line"></i>
                        <span><strong>Estructura:</strong> ${element.tipoEstructura || 'N/A'}</span>
                    </div>
                    
                    <div class="info-row">
                        <i class="ri-map-pin-line"></i>
                        <span><strong>Distrito:</strong> ${element.distrito || 'N/A'}</span>
                    </div>
                    
                    <div class="info-row">
                        <i class="ri-road-map-line"></i>
                        <span><strong>Ubicación:</strong> ${element.ubicacion}</span>
                    </div>
                    
                    <div class="info-row">
                        <i class="ri-phone-line"></i>
                        <span><strong>Teléfono:</strong> ${element.telefonoPrincipal || 'No disponible'}</span>
                    </div>
                </div>

                <hr class="my-2">
                
                <div class="campos-section">
                    <div class="d-flex align-items-center mb-2">
                        <i class="ri-football-line me-2"></i>
                        <strong>Campos Deportivos (${camposInfo.total})</strong>
                    </div>
                    ${camposInfo.html}
                </div>

                ${priceRange ? `
                    <div class="price-range mt-2">
                        <i class="ri-price-tag-3-line"></i>
                        <strong>Rango de precios:</strong> ${priceRange}
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

                ${element.estadoActual.toLowerCase() === 'activo' ? `
                    <div class="mt-3 d-flex gap-1">
                        <button class="btn btn-primary btn-sm w-100 mb-2 btn-reserva-puntual">
                            <i class="ri-calendar-check-line"></i>Reserva Puntual
                        </button>                        
                        ${this.userRole !== 'Contribuyente' || (this.userRole === 'Contribuyente' && this.userData.estadoUsuario === EstadoUsuario.ACTIVO && this.enableRecurrentBooking) ? `
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

    public goToReservation(complejo: ComplejoDeportivo, bookingType: string) {
        this.router.navigate(['/reservations/details'], { 
            state: { 
                data: complejo,
                tipoReserva: bookingType
            } 
        });
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
            const activeCampos = campos.filter((c: any) => c.estadoActual.toLowerCase() === 'activo').length;
            
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

    private getEstadoBadge(estado: string): string {
        switch (estado?.toLowerCase()) {
            case 'activo':
                return '<span class="badge bg-success">Activo</span>';
            case 'mantenimiento':
                return '<span class="badge bg-warning">Mantenimiento</span>';
            case 'cerrado':
                return '<span class="badge bg-danger">Cerrado</span>';
            default:
                return '<span class="badge bg-secondary">N/A</span>';
        }
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

    handleButtonClick(data: any): void {
        this.router.navigate(['/reservations/details'], { state: { data: data } });
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

    clearFilters() {
        this.selectedCategories = [];
        this.selectedDistrict = '';
        this.minTarifa = null;
        this.maxTarifa = null;
        
        this.updateMapMarkers(this.complexList);
        this.offcanvasService.dismiss();
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
                if (data['status'] === 'OK') {
                    this.complexList = data.payload;
                    this.temp = data.payload;
                    this.setMarkers()
                }
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
                if (data['status'] === 'OK') {
                    this.fieldList = data.payload;
                }
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
                if (data['status'] === 'OK') {
                    this.categoryList = data.payload;
                }
            },
            error: (error) => {
                Swal.fire({ 
                    text: 'No se pudo recuperar las categorías', 
                    icon: 'error',
                    confirmButtonColor: '#299cdb' 
                });
            }
        });
    }

    private getSurfaces() {
        this.surfacesService.getAll().subscribe({
            next: (data: any) => {
                if (data['status'] === 'OK') {
                    this.surfaceList = data.payload;
                }
            },
            error: (error) => {
                Swal.fire({ 
                    text: 'No se pudo recuperar las superficies', 
                    icon: 'error',
                    confirmButtonColor: '#299cdb' 
                });
            }
        });
    }

    openEnd(content: TemplateRef<any>) {
        this.offcanvasService.open(content, { position: 'end' });
    }
}