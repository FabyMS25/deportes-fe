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

@Component({
    selector: 'app-map-dashboard',
    templateUrl: './map-dashboard.component.html',
    styleUrls: ['./map-dashboard.component.scss']
})
export class MapDashboardComponent implements OnInit {

    userType:string=''; 
    assignations!:any[];
    userData: any;
    temp: any = []
    complexList: any[] = [];
    surfaceList: any[] = [];
    categoryList: any[] = [];
    fieldList: any[] = [];
    
    loading = false;
    map: any;
    layerControl: any;
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

    constructor(
        private router: Router,
        private categoriesService: CategoriasService,
        private complexService: ComplejosService,
        private fieldService: CamposDeportivoService,
        private surfacesService: SuperficiesService,
        private offcanvasService: NgbOffcanvas,
    ) {}

    ngOnInit(): void {
        const token = window.sessionStorage.getItem('auth-token');
        const userString = window.sessionStorage.getItem('currentUser');
        const user =userString ? JSON.parse(userString) : null;
    //   this.avatar=this.authService.getAvatar();
        if(token==='isContribuyente'){
            this.userType='Contribuyente';
            this.userData =user;
        }else{
            this.userType='Administrador';
            this.userData =user.designacion.personaDto;
            const funcionarioString = localStorage.getItem('assignaments');
            this.assignations =funcionarioString ? JSON.parse(funcionarioString) : null;
            if(this.assignations)this.userType='Encargado'; 
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

                ${ element.estadoActual.toLowerCase() === 'activo' ? `
                    <div class="mt-3 d-flex gap-1">
                        <button class="btn btn-primary btn-sm w-100 mb-2 btn-reserva-puntual">
                            <i class="ri-calendar-check-line"></i>Reserva Puntual
                        </button>                        
                        ${this.userType !=='Contribuyente'? `
                            <button class="btn btn-success btn-sm w-100 btn-reserva-recurrente">
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
            btnPuntual.addEventListener('click', () => 
            this.router.navigate(['/reservations/details'], { 
                state: { 
                    data: element,
                    tipoReserva: 'puntual'
                } 
            }));
        }
        if (btnRecurrente) {
            btnRecurrente.addEventListener('click', () => 
            this.router.navigate(['/reservations/details'], { 
                state: { 
                    data: element,
                    tipoReserva: 'recurrente'
                } 
            }));
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

    // Filtering logic
    applyFilters() {
        let filteredComplexes = [...this.complexList];

        // Filter by district
        if (this.selectedDistrict) {
            filteredComplexes = filteredComplexes.filter(c => 
                c.distrito === this.selectedDistrict
            );
        }

        // Filter by price range
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

        // Filter by categories
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

        // Update map with filtered results
        this.updateMapMarkers(filteredComplexes);
        this.offcanvasService.dismiss();
    }

    private updateMapMarkers(complexes: any[]) {
        // Clear existing markers
        if (this.mainList) {
            this.map.removeLayer(this.mainList);
        }

        // Create new markers
        let listMarkers: any[] = []
        complexes.forEach(element => {
            const complex = this.setPopup(element);
            listMarkers.push(complex);
        });

        this.mainList = L.layerGroup(listMarkers);
        this.mainList.addTo(this.map);

        // Notify user
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
        
        // Reset to all complexes
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