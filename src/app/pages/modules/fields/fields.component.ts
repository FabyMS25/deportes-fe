import { Component, ElementRef, ViewChild } from '@angular/core';
import { NgbModal, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import { UntypedFormGroup } from '@angular/forms';

import Swal from 'sweetalert2';

import { AuthenticationService } from 'src/app/core/services/auth.service';
import { ModalFieldsComponent } from '../../modals/field/modal-field/modal-field.component';
import { CampoDeportivo } from 'src/app/core/models/campoDeportivo.model';
import { SportsFieldsService } from 'src/app/core/services/api/sports-fields.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { ModalScheduleComponent } from '../../modals/field/modal-schedule/modal-schedule.component';
import { ModalTarifaComponent } from '../../modals/field/modal-tarifa/modal-tarifa.component';
import { ModalImportComponent } from '../../modals/field/modal-import/modal-import.component';
import { EstadoActual, StatusUtils } from 'src/app/core/constants/Estados';
import { HorarioExcepcion } from 'src/app/core/models/horarioExcepcion.model';
import { TarifaConcepto } from 'src/app/core/models/tarifaConcepto.model';
import { Tarifa } from 'src/app/core/models/tarifa.model';
import { FacilitiesService } from 'src/app/core/services/api/facilities.service';
import { SuperficiesService } from 'src/app/core/services/api/superficies.service';
import { CategoriaCampo } from 'src/app/core/constants/Features';
import { ComplejoDeportivo } from 'src/app/core/models/complejoDeportivo.model';
import { Superficie } from 'src/app/core/models/superficie.model';
import { CsvColumn } from 'src/app/shared/data-header/data-header.component';
import { BreadCrumbItem } from 'src/app/shared/breadcrumbs/breadcrumbs.component';

@Component({
  selector: 'app-fields',
  templateUrl: './fields.component.html',
  styleUrls: ['./fields.component.scss']
})
export class FieldsComponent {
  breadCrumbItems: BreadCrumbItem[] =[];
  viewMode: 'table' | 'cards' = 'table';
  canActivate: string[];
  itemsList: any[] = [];
  temp: CampoDeportivo[] = [];
  fieldsList: CampoDeportivo[] = [];

  loading: boolean = true;
  submitted = false;
  fieldsForm!: UntypedFormGroup;
  dataSelected?: CampoDeportivo;
  searchTerm = '';
  selectedItems: CampoDeportivo[] = [];
  categoryList = Object.values(CategoriaCampo);
  complejosList: ComplejoDeportivo[] = [];
  superficiesList: Superficie[] = [];

  selectedComplejo: string = '';
  selectedSuperficie: string = '';
  selectedCategoria: string = 'TODAS';

  @ViewChild('viewModel') viewModel!: ElementRef;

  constructor(
    private modalService: NgbModal,
    private authService: AuthenticationService,
    private fieldsService: SportsFieldsService,
    private complejoService: FacilitiesService,
    private superficieService: SuperficiesService,
  ) {
    this.canActivate = this.authService.hasPermission('/settings/fields');
  }

  ngOnInit(): void {
    const savedViewMode = localStorage.getItem('dataTableViewMode');
    if (savedViewMode === 'table' || savedViewMode === 'cards') {
      this.viewMode = savedViewMode;
    }
    this.breadCrumbItems = [
      { label: 'Configuraciones' },
      { label: 'Campos Deportivos', active: true},
    ];
    this.itemsList = [
      { name: 'Complejo', prop: 'complejoDto.nombre', visible: true },
      { name: 'Cancha Codigo', prop: 'codigo', visible: false },
      { name: 'Nombre', prop: 'nombre', visible: true },
      { name: 'Categoría', prop: 'categoria', tag: true, visible: true },
      { name: 'Superficie', prop: 'superficieDto.descripcion', visible: true },
      { name: 'Iluminación', prop: 'tieneIluminacion', tag: true, visible: false },
      { name: 'Acceso Libre', prop: 'accesoLibre', tag: true, visible: false },
      { name: 'Requiere Aprobación', prop: 'requiereAprobacion', tag: true, visible: false },
      { name: 'Estado', prop: 'estadoActual', tag: true, visible: false },
      { name: 'Dimensiones', prop: 'dimensiones', visible: false },
      { name: 'Capacidad', prop: 'capacidadPersonas', visible: false },
      { name: 'Observaciones', prop: 'observaciones', visible: false },
      { name: 'Fecha Creación', prop: 'fechaCreacion', date: true, visible: false },
    ];
    this.getFacilities();
    this.getSurfaces();
    this.getFields();
  }
  getSelectedItems(items: CampoDeportivo[]): void {
    this.selectedItems = items;
  }
  toggleColumn(column: any) {
      column.visible = !column.visible;
  }
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'cards' : 'table';
    localStorage.setItem('dataTableViewMode', this.viewMode);
  }
  
  applyFilters(): void {
    this.fieldsList = this.temp.filter(item =>
      this.matchesFilters(item, this.selectedCategoria)
    );

    this.selectedItems = this.selectedItems.filter(selected =>
      this.fieldsList.some(item => item.uuid === selected.uuid)
    );

    if (
      !this.dataSelected ||
      !this.fieldsList.some(
        item => item.uuid === this.dataSelected?.uuid
      )
    ) {
      this.dataSelected = this.fieldsList[0];
    }
  }
  private matchesFilters(
    item: CampoDeportivo,
    category: string
  ): boolean {
    const search = this.normalizeFilterText(this.searchTerm);

    const matchesSearch =
      !search ||
      [
        item.codigo,
        item.nombre,
        item.categoria,
        item.superficieDto?.descripcion,
        item.complejoDto?.nombre,
        item.dimensiones,
        item.estadoActual
      ].some(value =>
        this.normalizeFilterText(value).includes(search)
      );

    const matchesComplejo =
      !this.selectedComplejo ||
      item.complejoDto?.uuid === this.selectedComplejo;

    const matchesSuperficie =
      !this.selectedSuperficie ||
      item.superficieDto?.uuid === this.selectedSuperficie;

    const matchesCategoria =
      category === 'TODAS' ||
      item.categoria === category;

    return (
      matchesSearch &&
      matchesComplejo &&
      matchesSuperficie &&
      matchesCategoria
    );
  }
  getCategoryCount(category: string): number {
    return this.temp.filter(item =>
      this.matchesFilters(item, category)
    ).length;
  }
  onNavChange(event: NgbNavChangeEvent): void {
    this.selectedCategoria = String(event.nextId);
    this.applyFilters();
  }
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedComplejo = '';
    this.selectedSuperficie = '';
    this.selectedCategoria = 'TODAS';
    this.selectedItems = [];
    this.applyFilters();
  }

  viewDataGet(data: CampoDeportivo): void {
    this.dataSelected = data;
    const element = this.viewModel.nativeElement;
    const elementTop = element.getBoundingClientRect().top + window.scrollY;
    const middleOffset = elementTop - (window.innerHeight / 2) + (element.offsetHeight / 2);
    window.scrollTo({ top: middleOffset, behavior: 'smooth' });
  }
  /**
   * Open modal
   * @param content modal content
   */
  public openModal(row: CampoDeportivo | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalFieldsComponent, {
      backdrop: 'static',
      size: size
    });
    modalRef.componentInstance.row = row;
    modalRef.componentInstance.categoryList = this.categoryList;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getFields();
    });
  }

  public openScheduleModal(row: CampoDeportivo | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalScheduleComponent, {
      backdrop: 'static',
      size: size
    });
    modalRef.componentInstance.row = row;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getFields();
    });
  }

  public openTarifaModal(row: CampoDeportivo | undefined, accion: string, size: string) {
    const modalRef = this.modalService.open(ModalTarifaComponent, {
      backdrop: 'static',
      size: size
    });
    modalRef.componentInstance.row = row;
    modalRef.componentInstance.categoryList = this.categoryList;
    modalRef.componentInstance.accion = accion;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getFields();
    });
  }

  headersImport = [
    'Complejo', 'Codigo', 'Nombre', 'Categorias', 'Superficie', 'Dimensiones', 
    'Capacidad', 'Iluminacion', 'Acceso Libre', 'Requiere Aprobacion', 'Estado',
    'Clasificador Ruat','Tipo Cobro', 'Descripcion Tarifa', 'Costo Base', 'Desde Tarifa', 'Hasta Tarifa', 'Categorias de Tarifa',
    'Fecha Inicio', 'Fecha Fin', 'Lista de Tarifas Concepto',
    'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo',
    'Lista de Excepciones'
  ];
  readonly CSV_COLUMNS: CsvColumn<CampoDeportivo>[] = [
    { header: 'Complejo', value: item => item.complejoDto?.nombre ?? '' },
    { header: 'Codigo', value: item => item.codigo ?? '' },
    { header: 'Nombre', value: item => item.nombre ?? '' },
    { header: 'Categorias', value: item => item.categoria ?? '' },
    { header: 'Superficie', value: item => item.superficieDto?.descripcion ?? '' },
    { header: 'Dimensiones', value: item => item.dimensiones ?? '' },
    { header: 'Capacidad', value: item => item.capacidadPersonas ?? '' },
    { header: 'Iluminacion', value: item => item.tieneIluminacion ? 'SI' : 'NO' },
    { header: 'Acceso Libre', value: item => item.accesoLibre ? 'SI' : 'NO' },
    { header: 'Requiere Aprobacion', value: item => item.requiereAprobacion ? 'SI' : 'NO' },
    { header: 'Estado', value: item => item.estadoActual ?? '' },
    { header: 'Clasificador Ruat',
      value: item => this.getTariffValues(
        item,
        tarifa => tarifa.clasificadorRuatDto?.nombre
      )},
    { header: 'Tipo Cobro',
      value: item => this.getTariffValues(
        item,
        tarifa => tarifa.tipoCobro
      )},
    { header: 'Descripcion Tarifa',
      value: item => this.getTariffValues(
        item,
        tarifa => tarifa.descripcion
      )},
    { header: 'Costo Base',
      value: item => this.getTariffValues(
        item,
        tarifa => tarifa.precioBase
      )},
    { header: 'Desde Tarifa',
      value: item => this.getTariffValues(
        item,
        tarifa => tarifa.desde
      )},
    { header: 'Hasta Tarifa',
      value: item => this.getTariffValues(
        item,
        tarifa => tarifa.hasta
      )},
    { header: 'Categorias de Tarifa',
      value: item => this.getTariffCategories(item)},
    { header: 'Fecha Inicio',
      value: item => this.getTariffValues(
        item,
        tarifa => tarifa.fechaInicio
      )},
    { header: 'Fecha Fin',
      value: item => this.getTariffValues(
        item,
        tarifa => tarifa.fechaFin
      )},
    { header: 'Lista de Tarifas Concepto',
      value: item => this.getTariffConcepts(item)},
    { header: 'Lunes',
      value: item => this.getScheduleValue(item, 'lunes')},
    { header: 'Martes',
      value: item => this.getScheduleValue(item, 'martes')},
    { header: 'Miercoles',
      value: item => this.getScheduleValue(item, 'miercoles')},
    { header: 'Jueves',
      value: item => this.getScheduleValue(item, 'jueves')},
    { header: 'Viernes',
      value: item => this.getScheduleValue(item, 'viernes')},
    { header: 'Sabado',
      value: item => this.getScheduleValue(item, 'sabado')},
    { header: 'Domingo',
      value: item => this.getScheduleValue(item, 'domingo')},
    { header: 'Lista de Excepciones',
      value: item => this.getScheduleExceptions(item)
    }
  ];
private getTariffValues(
  item: CampoDeportivo,
  selector: (
    tarifa: Tarifa
  ) => string | number | Date | boolean | null | undefined
): string {
  return item.tarifasDtoList
    ?.map(selector)
    .filter(
      value =>
        value !== null &&
        value !== undefined &&
        value !== ''
    )
    .map(value =>
      value instanceof Date
        ? value.toLocaleDateString('en-CA')
        : String(value)
    )
    .join(' | ') ?? '';
}
  private getTariffCategories(item: CampoDeportivo): string {
    return item.tarifasDtoList
      ?.map(tarifa =>
        tarifa.categoriasDtoList
          ?.map(categoria =>
            categoria.categoriaDto?.nombre ?? ''
          )
          .filter(nombre => nombre !== '')
          .join(', ') ?? ''
      )
      .filter(value => value !== '')
      .join(' | ') ?? '';
  }
  private getTariffConcepts( item: CampoDeportivo  ): string {
    return item.tarifasDtoList
      ?.flatMap(tarifa => tarifa.conceptosDtos ?? [])
      .map(concepto =>
        [
          concepto.concepto ?? '',
          concepto.tipo
            ? `[${concepto.tipo}]`
            : '',
          concepto.valor !== null &&
          concepto.valor !== undefined
            ? `Valor: ${concepto.valor}`
            : '',
          concepto.desde !== null &&
          concepto.desde !== undefined
            ? `Desde: ${concepto.desde}`
            : '',
          concepto.hasta !== null &&
          concepto.hasta !== undefined
            ? `Hasta: ${concepto.hasta}`
            : ''
        ]
          .filter(value => value !== '')
          .join(' ')
      )
      .filter(value => value !== '')
      .join(' | ') ?? '';
  }
  private getScheduleExceptions(
  item: CampoDeportivo
): string {
  return item.horariosExcepcionesDtoList
    ?.map(exception =>
      [
        exception.fecha ?? '',
        exception.tipoExcepcion ?? '',
        exception.motivo
          ? `(${exception.motivo})`
          : '',
        exception.horaApertura || exception.horaCierre
          ? this.formatScheduleRange(
              exception.horaApertura,
              exception.horaCierre
            )
          : ''
      ]
        .filter(value => value !== '')
        .join(' ')
    )
    .filter(value => value !== '')
    .join(' | ') ?? '';
}
private formatScheduleRange(
  openingTime: string | null | undefined,
  closingTime: string | null | undefined
): string {
  if (!openingTime && !closingTime) {
    return '';
  }

  if (!openingTime) {
    return closingTime ?? '';
  }

  if (!closingTime) {
    return openingTime;
  }

  return `${openingTime}-${closingTime}`;
}
  private getScheduleValue(
  item: CampoDeportivo,
  day: string
): string {
  return item.horariosFijosDtoList
    ?.filter(horario =>
      this.matchesScheduleDay(horario.dia, day)
    )
    .map(horario =>
      horario.abierto
        ? this.formatScheduleRange(
            horario.horaApertura,
            horario.horaCierre
          )
        : 'CERRADO'
    )
    .filter(value => value !== '')
    .join(' | ') ?? '';
}
  private matchesScheduleDay(
  scheduleDay: string | null | undefined,
  requestedDay: string
): boolean {
  const normalizedScheduleDay =
    this.normalizeExportText(scheduleDay);

  const normalizedRequestedDay =
    this.normalizeExportText(requestedDay);

  return (
    normalizedScheduleDay === normalizedRequestedDay ||
    (
      (
        normalizedScheduleDay === 'lunes_viernes' ||
        normalizedScheduleDay === 'lunes_a_viernes'
      ) &&
      [
        'lunes',
        'martes',
        'miercoles',
        'jueves',
        'viernes'
      ].includes(normalizedRequestedDay)
    )
  );
}
private normalizeExportText(
  value: string | null | undefined
): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

  public openModalImport() {
    const modalRef = this.modalService.open(ModalImportComponent, {
      size: 'lg', backdrop: 'static'
    });
    modalRef.componentInstance.titles = this.headersImport.map(header =>
      ({ prop: header, name: header, visible: true }));
    modalRef.componentInstance.itemsList = this.temp;
    modalRef.componentInstance.emitList.subscribe(() => {
      this.getFields();
    });
  }

  /* API Services */
  private getFacilities() {
    this.complejoService.getAll().subscribe({
      next: (data: any) => {
        this.complejosList = data;
      }
    });
  }
  private getSurfaces() {
    this.superficieService.getAll().subscribe({
      next: (data: any) => {
        this.superficiesList = data;
      }
    });
  }

  private getFields(): void {
    this.loading = true;

    this.fieldsService.getAll().subscribe({
      next: (data: CampoDeportivo[]) => {
        this.temp = data ?? [];
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;

        Swal.fire({
          text: 'No se pudo recuperar los registros',
          confirmButtonColor: '#299cdb'
        });
      }
    });
  }

  getBadgeClass(estado: string): string {
    return StatusUtils.getStatusColor(estado);
  }
  private normalizeFilterText(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
