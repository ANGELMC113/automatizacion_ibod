export type TipoElemento =
  | 'Dataset fuente'
  | 'Dataset lógico - transformación'
  | 'Dataset CKAN'
  | 'Visualización'
  | 'Producto final';

export type EstadoElemento =
  | 'Actualizado'
  | 'Desactualizado'
  | 'Permanente'
  | 'Provisional'
  | 'Pendiente de acción manual';

export type MetodoActualizacion =
  | 'Automático'
  | 'Semiautomático'
  | 'Manual';

export interface Archivo {
  id_archivo: number;
  id_elemento: number;
  path: string;
  fecha: string; // ISO format: YYYY-MM-DD
  up_to_date: boolean | null; // fecha >= dataset.fecha_act
  comentarios: string;
  es_preview?: boolean;
  tamano?: string;
  formato: 'csv' | 'json' | 'png' | 'jpeg' | 'svg' | 'xlsx' | 'parquet';
  previewTable?: {
    columns: string[];
    rows: (string | number)[][];
    totalRows: number;
  };
  previewImageUrl?: string;
  previewSvgSnippet?: string;
}

export interface Relacion {
  id_relacion: number;
  id_origen: number;
  id_destino: number;
}

export interface MetadatoLinkeado {
  id_link: number;
  id_relacion: number;
  metadato: string; // key of JSON metadata
}

export interface LogActualizacion {
  id: number;
  timestamp: string;
  tipo: 'manual' | 'programada' | 'cascada';
  estado: 'exito' | 'error' | 'en_progreso';
  mensaje: string;
  archivoInvolucrado?: string;
}

export interface Elemento {
  id_elemento: number;
  tipo: TipoElemento;
  nombre: string;
  fecha_act: string; // YYYY-MM-DD
  estado: EstadoElemento | null;

  // Subtype datasets (fuente & lógico)
  es_fuente?: boolean;
  metodo_act?: MetodoActualizacion | null;
  indicaciones?: string;

  // Subtype CKAN
  id_CKAN?: string;

  // Metadatos JSON (flat key: value)
  metadatos_json: Record<string, string>;

  // Automatizaciones
  logsActualizacion?: LogActualizacion[];

  // Graph layout helpers
  column: number; // 0: Fuente, 1: Lógico/CKAN, 2: Visualización, 3: Producto
  lane?: number; // for Col 1 horizontal lane spreading
  order?: number;
}

export interface MetadataFieldDefinition {
  key: string;
  comentario: string;
  recomendedValues?: string[];
}

export interface DefaultMetadataSchema {
  comunes: MetadataFieldDefinition[];
  datasets: MetadataFieldDefinition[];
  datasets_fuente: MetadataFieldDefinition[];
  visualizaciones: MetadataFieldDefinition[];
  productos: MetadataFieldDefinition[];
}
