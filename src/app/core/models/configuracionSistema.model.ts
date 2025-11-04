import { AplicaAConfiguracion, CategoriaConfiguracion, ClaveConfiguracion, UnidadMedida } from "../constants/Configurations";

export interface ConfiguracionSistema {
  uuid?: string;
  estado?: boolean;
  fechaCreacion?: Date;
  fechaActualizacion?: Date;
  
  // Identification
  clave: ClaveConfiguracion;              // Unique key identifier
  categoria: CategoriaConfiguracion;          // Group related configs
  
  // Values (flexible storage)
  valorNumerico?: number;     // For numeric values
  valorTexto?: string;        // For text values
  valorBoolean?: boolean;     // For boolean flags
  valorJson?: string;         // For complex objects (JSON string)
  
  // Metadata
  nombre: string;             // Display name
  descripcion?: string;       // What this config does
  unidadMedida?: UnidadMedida;      // 'horas', 'dias', 'bolivianos', 'porcentaje'
  
  // Validation
  valorMinimo?: number;       // Min allowed value
  valorMaximo?: number;       // Max allowed value
  valoresPosibles?: string;   // JSON array of allowed values
  
  // Control
  modificablePorUsuario: boolean;  // Can users change this?
  requiereAprobacion: boolean;     // Needs admin approval to change?
  activo: boolean;                 // Is this config active?
  
  // Audit
  ultimaModificacion?: Date;
  modificadoPor?: string;     // User UUID who modified
  
  // Application scope
  aplicaA?: AplicaAConfiguracion;           // 'global', 'usuario', ..
  referenciaUuid?: string;    // UUID of related entity (if aplicaA != 'global')
}