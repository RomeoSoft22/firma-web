// ---- Agente local ----

export interface Certificado {
  thumbprint: string;
  titular: string;
  documento: string | null;
  organizacion: string | null;
  cargo: string | null;
  emisor: string;
  numeroSerie: string;
  validoDesde: string;
  validoHasta: string;
  vigente: boolean;
  cadenaConfiable: boolean;
  aptoFirma: boolean;
  /** Emitido para firma de documentos (No repudio / correo seguro / firma de documentos). */
  deFirma: boolean;
  usoClave: string[];
  almacen: string;
  algoritmo: string;
}

export type PosicionFirma =
  | 'manual'
  | 'inferior-derecha'
  | 'inferior-izquierda'
  | 'inferior-centro'
  | 'superior-derecha'
  | 'superior-izquierda';

export interface OpcionesFirma {
  motivo: string;
  ubicacion: string;
  contacto?: string;
  visible: boolean;
  /** 1..N; 0 = última página */
  pagina: number;
  posicion: PosicionFirma;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  textoPersonalizado?: string | null;
  imagenBase64?: string | null;
  disposicion?: DisposicionSello;
  usarSelloTiempo: boolean;
  tsaUrl: string;
  tsaUsuario?: string | null;
  tsaClave?: string | null;
  incluirRevocacion: boolean;
  certificar: boolean;
}

export interface FirmarResultado {
  pdfBase64: string;
  nombreArchivo: string;
  firmante: string;
  documentoFirmante: string | null;
  emisor: string;
  numeroSerie: string;
  fechaFirma: string;
  selloTiempo: boolean;
  hashSha256: string;
}

export interface ResultadoArchivo {
  origen: string;
  destino: string | null;
  ok: boolean;
  error: string | null;
}

export interface FirmarCarpetaResultado {
  total: number;
  firmados: number;
  errores: number;
  resultados: ResultadoArchivo[];
}

export interface FirmaVerificada {
  nombreCampo: string;
  firmante: string;
  documento: string | null;
  emisor: string;
  numeroSerie: string;
  fechaFirma: string | null;
  motivo: string | null;
  ubicacion: string | null;
  integridadValida: boolean;
  cubreTodoDocumento: boolean;
  revision: number;
  totalRevisiones: number;
  tieneSelloTiempo: boolean;
  selloTiempoValido: boolean;
  fechaSelloTiempo: string | null;
  certificadoVigenteAlFirmar: boolean;
  certValidoDesde: string;
  certValidoHasta: string;
  algoritmoHash: string;
  algoritmoFirma: string;
  error: string | null;
}

export interface VerificacionResultado {
  totalFirmas: number;
  todasValidas: boolean;
  firmas: FirmaVerificada[];
}

export interface EstadoAgente {
  nombre: string;
  version: string;
  equipo: string;
  hora: string;
}

// ---- API Laravel ----

export type EstadoDocumento = 'pendiente' | 'firmado' | 'error';

export interface Documento {
  id: number;
  lote_id: number | null;
  lote?: { id: number; nombre: string } | null;
  nombre_original: string;
  hash_original: string;
  tamano_original: number;
  nombre_firmado: string | null;
  hash_firmado: string | null;
  estado: EstadoDocumento;
  mensaje_error: string | null;
  firmante: string | null;
  documento_firmante: string | null;
  emisor: string | null;
  numero_serie: string | null;
  motivo: string | null;
  ubicacion: string | null;
  sello_tiempo: boolean;
  fecha_firma: string | null;
  equipo: string | null;
  created_at: string;
}

export interface Lote {
  id: number;
  nombre: string;
  total: number;
  estado: string;
  created_at: string;
}

export interface Motivo {
  id: number;
  descripcion: string;
  activo: boolean;
  orden: number;
  /** Tiene una imagen de sello asociada (GET /motivos/{id}/imagen). */
  tiene_imagen: boolean;
  /** Tamaño del sello en puntos PDF; null = usar el de Parámetros de firma. */
  ancho: number | null;
  alto: number | null;
  /** Diseño del sello: imagen a la izquierda (horizontal) o arriba (vertical). */
  disposicion: DisposicionSello;
}

export type DisposicionSello = 'horizontal' | 'vertical';

export interface Paginado<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface Estadisticas {
  total: number;
  firmados: number;
  pendientes: number;
  errores: number;
  hoy: number;
}

export type Parametros = Record<string, string>;
