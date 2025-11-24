import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NgbActiveModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { read, utils } from 'xlsx';
import { catchError, forkJoin, from, map, mergeMap, Observable, of, switchMap } from 'rxjs';
import Swal from 'sweetalert2';
import { SharedModule } from 'src/app/shared/shared.module';

import { ComplejosService } from 'src/app/core/services/api/conplejos.service';
import { CamposDeportivoService } from 'src/app/core/services/api/camposDeportivos.service';
import { SuperficiesService } from 'src/app/core/services/api/superficies.service';
import { CategoriasService } from 'src/app/core/services/api/categorias.service';
import { ClasificadorRuatService } from 'src/app/core/services/api/clasificadorRuat.service';
import { ClasificadorRuat } from 'src/app/core/models/clasificadorRuat.model';
import { Categoria } from 'src/app/core/models/categoria.model';

@Component({
  selector: 'app-modal-import',
  standalone: true,
  imports: [FormsModule, CommonModule, NgbModule, SharedModule],
  templateUrl: './modal-import.component.html',
  styleUrl: './modal-import.component.scss'
})
export class ModalImportComponent {
  @Input() itemsList!: any[];
  @Input() titles!: any[];
  @Output() emitList = new EventEmitter();

  xlsxData: any[] = [];
  selectedItems: any[] = [];
  loading: boolean = false;
  listaTemporal: any[] = [];
  categoryList: Categoria[] = [];
  clasificadoresList: ClasificadorRuat[]=[];

  constructor(
    private activeModal: NgbActiveModal,
    private fieldService: CamposDeportivoService,
    private complejoService: ComplejosService,
    private superficieService: SuperficiesService,
    private categoriesService: CategoriasService,
    private clasificadorService: ClasificadorRuatService,
  ) {}

  ngOnInit(): void {
    this.loadClasificadores();
    this.loadCategories();
  }

  cerrarModal() {
    this.activeModal.close();
  }

  cargarDatosDesdeExcel(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsBinaryString(file);

      reader.onload = (e: any) => {
        let workBook = read(reader.result, { type: 'binary' });
        let sheetNames = workBook.SheetNames;
        this.xlsxData = utils.sheet_to_json(workBook.Sheets[sheetNames[0]]);
        this.listaTemporal = this.xlsxData;
        
        if (this.xlsxData.length <= 0) {
          this.loading = false;
          Swal.fire({ 
            text: 'El archivo no tiene datos para importar', 
            icon: 'warning',
            confirmButtonColor: '#299cdb' 
          });
        }
      };
    }
  }

  getSeleccionados(items: any[]) {
    this.selectedItems = items;
  }

  public buscarItem(event: any) {
    const val = event.target.value.toLowerCase();
    const temp = this.listaTemporal.filter((l) => {
      return (
        l.Codigo?.toLowerCase().indexOf(val) !== -1 ||
        l.Nombre?.toLowerCase().indexOf(val) !== -1 ||
        l.Superficie?.toLowerCase().indexOf(val) !== -1 ||
        !val
      );
    });
    this.xlsxData = temp;
  }

  showImportInstructions() {
    Swal.fire({
      title: 'Instrucciones de Importación - Campos Deportivos',
      html: `
        <div class="text-start">
          <p><strong>Formato CSV requerido:</strong></p>
          <ul>
            <li><strong>Complejo:</strong> Nombre exacto del complejo (debe existir en el sistema)</li>
            <li><strong>Superficie:</strong> Tipo de superficie exacto (debe existir en el sistema)</li>
            <li><strong>Clasificador Ruat:</strong> Clasificador definido por RUAT (debe existir en el sistema)(ej: RESERVA CAMPOS DEPORTIVOS POR HORA)</li>
            <li><strong>Categorias de Tarifa:</strong> Nombres separados por "; " (ej: "FUTBOL; BASKETBALL")</li>
            <li><strong>Horarios:</strong> Formato "HH:MM:SS-HH:MM:SS" o "CERRADO" para cada día</li>
            <li><strong>Lista de Tarifas Concepto:</strong> "Concepto1 [tipo1]: valor1 (desde1-hasta1); Concepto2 [tipo2]: valor2"</li>
            <li><strong>Lista de Excepciones:</strong> "YYYY-MM-DD: tipo_excepcion (motivo) HH:MM:SS-HH:MM:SS"</li>
          </ul>
          
          <p><strong>Ejemplos completos:</strong></p>
          <ul>
            <li><strong>Categorias de Tarifa:</strong> "FUTBOL; BASKETBALL; VOLEY"</li>
            <li><strong>Conceptos:</strong> "luz [por_hora]: 2 (18:00:00-22:00:00); mantenimiento [fijo]: 10"</li>
            <li><strong>Excepciones:</strong> "2025-12-25: cerrado (Navidad); 2025-12-24: horario_especial 08:00:00-16:00:00"</li>
            <li><strong>Horarios:</strong> Lunes-Viernes: "08:00:00-22:00:00", Sábado: "08:00:00-18:00:00", Domingo: "CERRADO"</li>
          </ul>
          
          <p class="text-warning"><strong>Nota:</strong> Los complejos, superficies, Clasificadores Ruat y categorías deben existir previamente en el sistema.</p>
        </div>
      `,
      icon: 'info',
      confirmButtonColor: '#299cdb',
      width: '600px',
      confirmButtonText: 'Entendido'
    });
  }

  public async createRegisterfromXlsx(xlsxData: any[]) {
    if (!xlsxData || xlsxData.length === 0) {
      Swal.fire({ 
        text: 'Por favor seleccione registros para importar', 
        icon: 'info',
        confirmButtonColor: '#299cdb' 
      });
      return;
    }
    this.showImportInstructions();

    this.loading = true;
    try {
      const groupedData = this.groupByCodigo(xlsxData);
      
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const codigo in groupedData) {
        const rows = groupedData[codigo];
        
        try {
          if (this.recordExists(codigo)) {
            console.warn(`Campo ${codigo} ya existe, se omite`);
            continue;
          }

          await this.createCampoDeportivo(rows);
          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push(`${codigo}: ${error.message}`);
          console.error(`Error importing ${codigo}:`, error);
        }
      }
      this.loading = false;
      if (successCount > 0 && errorCount === 0) {
        Swal.fire({ 
          text: `${successCount} campo(s) importado(s) correctamente`, 
          icon: 'success',
          confirmButtonColor: '#299cdb' 
        });
      } else if (successCount > 0 && errorCount > 0) {
        Swal.fire({ 
          title: 'Importación parcial',
          html: `<b>${successCount}</b> exitosos<br><b>${errorCount}</b> con errores<br><br>
                 <small>Errores: ${errors.join('; ')}</small>`,
          icon: 'warning',
          confirmButtonColor: '#299cdb' 
        });
      } else {
        Swal.fire({ 
          text: 'No se pudo importar ningún registro', 
          icon: 'error',
          confirmButtonColor: '#299cdb' 
        });
      }
      this.activeModal.close();
      this.emitList.emit();

    } catch (error) {
      this.loading = false;
      Swal.fire({ 
        text: 'Error al procesar la importación', 
        icon: 'error',
        confirmButtonColor: '#299cdb' 
      });
    }
  }

  private async createCampoDeportivo(rows: any[]): Promise<void> {
    const firstRow = rows[0];

    try {
      const { complejo, superficie } = await this.getComplejoAndSuperficie(
        firstRow.Complejo,
        firstRow.Superficie
      );
      const campoData: any = {
        estadoActual: firstRow.Estado || 'ACTIVO',
        codigo: firstRow.Codigo,
        nombre: firstRow.Nombre || firstRow.Codigo,
        categoria: firstRow.Categoria || 'A',
        dimensiones: firstRow.Dimensiones || '',
        capacidadPersonas: parseInt(firstRow.Capacidad) || 0,
        tieneIluminacion: this.parseBoolean(firstRow.Iluminacion),
        observaciones: '',
        accesoLibre: this.parseBoolean(firstRow['Acceso Libre']),
        requiereAprobacion: this.parseBoolean(firstRow['Requiere Aprobacion']),
        horasMinimaAprobacion: this.parseBoolean(firstRow['Requiere Aprobacion']) ? 24 : null,
        maxDuracionAutoAprobacion: !this.parseBoolean(firstRow['Requiere Aprobacion']) ? 2 : null,
        maxPersonasAutoAprobacion: !this.parseBoolean(firstRow['Requiere Aprobacion']) ? 10 : null,
        complejoDto: complejo,
        superficieDto: superficie,
        horariosFijosDtoList: this.prepareHorariosFijos(firstRow),
        horariosExcepcionesDtoList: this.prepareHorariosExcepciones(firstRow['Lista de Excepciones']),
        tarifasDtoList: this.prepareTarifas(rows)
      };
      const campoCreado: any = await this.fieldService.save(campoData).toPromise();      
      if (campoCreado.status !== 'OK') {
        throw new Error('Error al crear campo deportivo: ' + (campoCreado.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error in createCampoDeportivo:', error);
      throw error;
    }
  }

  private prepareHorariosFijos(row: any): any[] {
    const horarios: any[] = [];
    const daysMapping: { [key: string]: string } = {
      'Lunes': 'lunes',
      'Martes': 'martes',
      'Miercoles': 'miercoles',
      'Jueves': 'jueves',
      'Viernes': 'viernes',
      'Sabado': 'sabado',
      'Domingo': 'domingo'
    };
    Object.keys(daysMapping).forEach(day => {
      const schedule = row[day];
      if (schedule && schedule !== '') {
        if (schedule === 'CERRADO') {
          horarios.push({
            dia: daysMapping[day],
            abierto: false,
            horaApertura: null,
            horaCierre: null,
            observaciones: null
          });
        } else {
          const [horaApertura, horaCierre] = this.parseSchedule(schedule);
          horarios.push({
            dia: daysMapping[day],
            abierto: true,
            horaApertura: this.formatTimeForBackend(horaApertura),
            horaCierre: this.formatTimeForBackend(horaCierre),
            observaciones: null
          });
        }
      }
    });

    return horarios;
  }

  private prepareHorariosExcepciones(excepcionesString: string): any[] {
    if (!excepcionesString || excepcionesString.trim() === '') {
      return [];
    }

    return excepcionesString.split(';').map(item => {
      const trimmed = item.trim();
      if (!trimmed) return null;
      const fechaMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2}):\s*([a-z_]+)/);
      if (!fechaMatch) return null;
      const fecha = fechaMatch[1];
      const tipoExcepcion = fechaMatch[2];
      let motivo = '';
      const motivoMatch = trimmed.match(/\(([^)]+)\)/);
      if (motivoMatch) {
        motivo = motivoMatch[1].trim();
      }
      let horaApertura = '';
      let horaCierre = '';
      const horarioMatch = trimmed.match(/(\d{2}:\d{2}:\d{2})-(\d{2}:\d{2}:\d{2})/);
      if (horarioMatch) {
        horaApertura = horarioMatch[1];
        horaCierre = horarioMatch[2];
      }

      return {
        fecha: fecha,
        tipoExcepcion: tipoExcepcion,
        horaApertura: horaApertura ? this.formatTimeForBackend(horaApertura) : null,
        horaCierre: horaCierre ? this.formatTimeForBackend(horaCierre) : null,
        motivo: motivo || null
      };
    }).filter(item => item !== null);
  }

  private prepareTarifas(rows: any[]): any[] {
    return rows.filter(row => row['Tipo Cobro'] && row['Costo Base']).map(row => {
      let fechaInicio;
      try {
        fechaInicio = this.formatDate(row['Fecha Inicio'] || new Date().toISOString().split('T')[0]);
      } catch (error) {
        console.warn('Error formatting fechaInicio, using today:', error);
        fechaInicio = new Date().toISOString().split('T')[0];
      }

      let fechaFin = null;
      if (row['Fecha Fin'] && String(row['Fecha Fin']).trim() !== '') {
        try {
          fechaFin = this.formatDate(row['Fecha Fin']);
        } catch (error) {
          console.warn('Error formatting fechaFin, setting to null:', error);
          fechaFin = null;
        }
      }
      const tarifa = {
        precioBase: parseFloat(row['Costo Base']) || 0,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        desde: this.formatTimeForBackend(row['Desde Tarifa'] || '08:00:00'),
        hasta: this.formatTimeForBackend(row['Hasta Tarifa'] || '22:00:00'),
        descripcion: row['Descripcion Tarifa'] || 'Tarifa Importada',
        observaciones: null,
        activo: true,
        tipoCobro: row['Tipo Cobro'] || 'por_hora',
        frecuencia: null,
        sesionesIncluidas: null,
        clasificadorRuatDto: this.clasificadoresList.find((c: ClasificadorRuat) => c.nombre === row['Clasificador Ruat']),
        categoriasDtoList: this.prepareTarifaCategorias(row['Categorias de Tarifa']),
        conceptosDtos: this.prepareTarifaConceptos(row['Lista de Tarifas Concepto'])
      };

      return tarifa;
    });
  }

  private prepareTarifaCategorias(categoriasString: string): any[] {
    if (!categoriasString || categoriasString.trim() === '') {
      return [];
    }
    const categoriaNames = categoriasString.split(';').map(name => name.trim()).filter(name => name !== '');    
    if (categoriaNames.length === 0) {
      return [];
    }
    const categorias = categoriaNames
      .map(nombre => this.categoryList.find(c => c.nombre === nombre))
      .filter(Boolean); 
    if (categorias.length === 0) {
      console.warn(`No se encontraron categorías para: ${categoriasString}`);
      return [];
    }
    return categorias.map(categoria => ({
      categoriaDto: categoria
    }));
  }
  
  private prepareTarifaConceptos(conceptosString: string): any[] {
    if (!conceptosString || conceptosString.trim() === '') {
      return [];
    }

    return conceptosString.split(';').map(item => {
      const trimmed = item.trim();
      if (!trimmed) return null;
      const conceptoMatch = trimmed.match(/^([^\[]+)(?:\s*\[([^\]]+)\])?(?::\s*([\d.]+))?(?:\s*\(([^)]+)\))?/);
      if (!conceptoMatch) return null;

      const concepto = conceptoMatch[1].trim();
      const tipo = conceptoMatch[2] || 'adicional';
      const valor = conceptoMatch[3] ? parseFloat(conceptoMatch[3]) : 0;
      let desde = null;
      let hasta = null;
      const horarioMatch = conceptoMatch[4];
      if (horarioMatch) {
        const horarioParts = horarioMatch.split('-');
        desde = horarioParts[0] ? this.formatTimeForBackend(horarioParts[0].trim()) : null;
        hasta = horarioParts[1] ? this.formatTimeForBackend(horarioParts[1].trim()) : null;
      }
      return {
        concepto: concepto,
        tipo: tipo,
        valor: valor,
        desde: desde,
        hasta: hasta,
        activo: true
      };
    }).filter(item => item !== null);
  }

  private formatTimeForBackend(timeInput: any): string {
    if (!timeInput) {
      return '08:00:00';
    }
    const timeString = String(timeInput).trim();
    if (timeString === '') {
      return '08:00:00';
    }
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    const parts = timeString.split(':');
    const hours = String(parseInt(parts[0] || '0')).padStart(2, '0');
    const minutes = String(parseInt(parts[1] || '0')).padStart(2, '0');
    const seconds = parts[2] ? String(parseInt(parts[2])).padStart(2, '0') : '00';  
    return `${hours}:${minutes}:${seconds}`;
  }

  private formatDate(dateInput: any): string {
    if (!dateInput) {
      return new Date().toISOString().split('T')[0];
    }
    const dateString = String(dateInput).trim();
    if (dateString === '') {
      return new Date().toISOString().split('T')[0];
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        let month, day, year;
        if (parseInt(parts[0]) > 12) {
          day = parts[0].padStart(2, '0');
          month = parts[1].padStart(2, '0');
          year = parts[2];
        } else {
          month = parts[0].padStart(2, '0');
          day = parts[1].padStart(2, '0');
          year = parts[2];
        }
        if (year.length === 2) {
          year = `20${year}`; 
        }        
        return `${year}-${month}-${day}`;
      }
    }
    return new Date().toISOString().split('T')[0];
  }

  private groupByCodigo(data: any[]): { [key: string]: any[] } {
    return data.reduce((acc, item) => {
      const codigo = item.Codigo;
      if (!acc[codigo]) {
        acc[codigo] = [];
      }
      acc[codigo].push(item);
      return acc;
    }, {});
  }

  private recordExists(codigo: string): boolean {
    return this.itemsList.some(item => item.codigo === codigo);
  }

  private async getComplejoAndSuperficie(
    complejoNombre: string, 
    superficieDesc: string
  ): Promise<any> {
    return forkJoin({
      complejo: this.searchComplejo(complejoNombre),
      superficie: this.searchSuperficie(superficieDesc)
    }).toPromise();
  }

  private searchComplejo(nombre: string): Observable<any> {
    return this.complejoService.getAll().pipe(
      map((response: any) => {
        if (response.status === 'OK') {
          const complejo = response.payload.find((c: any) => c.nombre === nombre);
          if (!complejo) {
            throw new Error(`Complejo '${nombre}' no encontrado`);
          }
          return complejo;
        }
        throw new Error('Error al buscar complejo');
      })
    );
  }

  private searchSuperficie(descripcion: string): Observable<any> {
    return this.superficieService.getAll().pipe(
      map((response: any) => {
        if (response.status === 'OK') {
          const superficie = response.payload.find((s: any) => s.descripcion === descripcion);
          if (!superficie) {
            throw new Error(`Superficie '${descripcion}' no encontrada`);
          }
          return superficie;
        }
        throw new Error('Error al buscar superficie');
      })
    );
  }

  private loadCategories(): void {
    this.categoriesService.getAll().subscribe({
      next: (response: any) => {
        if (response.status === 'OK') {
          this.categoryList = response.payload;
        }
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }
  private loadClasificadores(): void {
    this.clasificadorService.getAll().subscribe({
      next: (response: any) => {
        if (response.status === 'OK') {
          this.clasificadoresList = response.payload;
        }
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  private parseSchedule(schedule: string): [string, string] {
    const parts = schedule.split('-').map(s => s.trim());
    const horaApertura = this.formatTimeForBackend(parts[0] || '08:00:00');
    const horaCierre = this.formatTimeForBackend(parts[1] || '22:00:00');    
    return [horaApertura, horaCierre];
  }

  private parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toUpperCase() === 'SI' || value.toUpperCase() === 'SÍ' || value === '1' || value === 'true';
    }
    return false;
  }
}