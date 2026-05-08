// === Identidad y referencias ===
export type Slug = string;
export type ISODateTime = string;

export interface Ref<T extends 'torneo'|'edicion'|'seleccion'|'equipo'|'jugador'|'partido'|'grupo'|'fase'|'sede'|'tag'|'autor'> {
  type: T;
  slug: Slug;
  nombre: string;     // display name
}

export interface SeoBlock {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageOverride?: ImageRef;
  canonicalOverride?: string;
  noindex?: boolean;
}

export interface FaqEntry { pregunta: string; respuesta: string; }

export interface ImageRef {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  blurDataUrl?: string;
  credito?: string;
}

export interface HeroMetric {
  label: string;
  value: string;
  caption?: string;
  accent?: boolean;
}

export type Posicion = 'POR'|'DEF'|'MED'|'DEL';

// === Torneo (evergreen) ===
export interface Torneo {
  slug: Slug;
  nombre: string;
  nombreCorto: string;
  tipo: 'mundial'|'liga'|'copa-nacional'|'continental';
  organizador: { nombre: string; sitioWeb?: string };
  fundacion?: number;
  edicionActual: Ref<'edicion'>;
  edicionesPrevias: Ref<'edicion'>[];
  campeones: Array<{ ano: number; campeon: Ref<'seleccion'|'equipo'>; subcampeon?: Ref<'seleccion'|'equipo'> }>;
  seo: SeoBlock;
  faq: FaqEntry[];
}

// === Edición ===
export interface Edicion {
  slug: Slug;
  torneo: Ref<'torneo'>;
  ano: number;
  fechaInicio: ISODateTime;
  fechaFin: ISODateTime;
  estado: 'upcoming'|'ongoing'|'finished';
  participantes: Ref<'seleccion'|'equipo'>[];
  formato: { tipoFase: 'grupos'|'liga'|'eliminatoria'; descripcion: string };
  fases: Fase[];
  sedes?: Sede[];
  campeon?: Ref<'seleccion'|'equipo'>;
  seo: SeoBlock;
  faq: FaqEntry[];
}

export interface Fase {
  slug: 'grupos'|'octavos'|'cuartos'|'semifinales'|'final'|`jornada-${number}`;
  nombre: string;
  tipo: 'grupos'|'eliminatoria'|'jornada';
  partidos: Ref<'partido'>[];
  fechaInicio: ISODateTime;
  fechaFin: ISODateTime;
}

// === Grupo ===
export interface Grupo {
  slug: Slug;
  edicion: Ref<'edicion'>;
  letra: 'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'I'|'J'|'K'|'L';
  selecciones: Ref<'seleccion'>[];
  tabla: GrupoStanding[];
  partidos: Ref<'partido'>[];
  analisis?: string;
  seo: SeoBlock;
}

export interface GrupoStanding {
  posicion: number;
  seleccion: Ref<'seleccion'>;
  pj: number; g: number; e: number; p: number;
  gf: number; gc: number; dg: number; pts: number;
  forma: ('W'|'D'|'L')[];
}

// === Sede ===
export interface Sede {
  slug: Slug;
  nombre: string;
  ciudad: string;
  pais: 'USA'|'CAN'|'MEX';
  capacidad: number;
  imagen?: ImageRef;
  partidos: Ref<'partido'>[];
}

// === Equipo (CLUB o SELECCIÓN) ===
export interface Equipo {
  slug: Slug;
  tipo: 'club'|'seleccion';
  nombre: string;
  nombreOficial: string;
  apodo?: string;
  pais: string;
  ciudad?: string;
  fundacion?: number;
  escudo: ImageRef;
  colores: { primario: string; secundario: string };
  estadio?: Ref<'sede'>;
  estadiosSecundarios?: Ref<'sede'>[];
  dt: { nombre: string; foto?: ImageRef; desde?: ISODateTime; nacionalidad: string };
  cuerpoTecnico?: Array<{ rol: string; nombre: string; nacionalidad?: string }>;
  redes: { twitter?: string; instagram?: string; facebook?: string; web?: string };
  fifaRank?: number;
  valorPlantilla?: { monto: number; moneda: 'EUR'|'USD' };
  rivalidades: Ref<'equipo'>[];
  estadisticasDestacadas?: HeroMetric[];
  seo: SeoBlock;
  faq: FaqEntry[];
}

// === Plantilla ===
export interface Plantilla {
  equipo: Ref<'equipo'>;
  edicion?: Ref<'edicion'>;
  jugadores: PlantillaJugador[];
  cuerpoTecnico: Equipo['cuerpoTecnico'];
  altas?: Array<{ jugador: Ref<'jugador'>; desde: string; tipo: 'fichaje'|'cesion'|'subida-cantera' }>;
  bajas?: Array<{ jugador: Ref<'jugador'>; hacia: string; tipo: 'venta'|'cesion-saliente'|'fin-de-contrato'|'retiro' }>;
}

export interface PlantillaJugador {
  jugador: Ref<'jugador'>;
  dorsal?: number;
  posicion: Posicion;
  posicionDetalle?: string;
  capitan?: boolean;
  titular?: boolean;
  estado?: 'disponible'|'lesionado'|'suspendido';
}

// === Jugador ===
export interface Jugador {
  slug: Slug;
  nombre: string;
  nombreCompleto: string;
  apodo?: string;
  fechaNacimiento: string;
  nacionalidad: string;
  altura?: number;
  peso?: number;
  pieDominante?: 'izquierdo'|'derecho'|'ambidiestro';
  posicion: Posicion;
  clubActual: Ref<'equipo'>;
  seleccion?: Ref<'equipo'>;
  trayectoria: TrayectoriaItem[];
  estadisticas?: EstadisticaTemporada[];
  titulos?: TituloLogrado[];
  valorMercado?: { monto: number; moneda: string; fecha: string; fuente?: string };
  redes: Equipo['redes'];
  retirado?: boolean;
  seo: SeoBlock;
  faq: FaqEntry[];
}

export interface TrayectoriaItem {
  club: Ref<'equipo'>;
  desde: string;
  hasta?: string;
  tipo: 'cantera'|'profesional'|'cesion';
  partidos?: number;
  goles?: number;
  titulos?: string[];
  notas?: string;
}

export interface EstadisticaTemporada {
  temporada: string;
  competicion: Ref<'torneo'>;
  equipo: Ref<'equipo'>;
  pj: number;
  goles: number;
  asistencias: number;
  amarillas?: number;
  rojas?: number;
}

export interface TituloLogrado {
  competicion: Ref<'torneo'>;
  ano: number;
  equipo: Ref<'equipo'>;
  rolFinal?: 'titular'|'suplente'|'no-convocado';
}

// === Partido ===
export interface Partido {
  slug: Slug;
  edicion: Ref<'edicion'>;
  fase: { tipo: Fase['tipo']; slug: string; nombre: string };
  grupo?: Ref<'grupo'>;
  local: Ref<'equipo'>;
  visitante: Ref<'equipo'>;
  fecha: ISODateTime;
  zonaHoraria: string;
  sede: Ref<'sede'>;
  estado: 'scheduled'|'playing'|'finished'|'postponed';
  marcador?: { local: number; visitante: number };
  goleadores?: Gol[];
  alineaciones?: { local: Alineacion; visitante: Alineacion };
  arbitro?: { nombre: string; nacionalidad: string };
  transmision?: string[];
  previa?: { texto: string; autor: Ref<'autor'>; fecha: ISODateTime };
  cronica?: { texto: string; autor: Ref<'autor'>; fecha: ISODateTime };
  minutoAMinuto?: EventoPartido[];
  estadisticas?: { local: StatsPartido; visitante: StatsPartido };
  h2h?: H2HResumen;
  imagenes?: ImageRef[];
  seo: SeoBlock;
}

export interface Alineacion {
  formacion: string;
  titulares: PlantillaJugador[];
  suplentes: PlantillaJugador[];
  dt: { nombre: string };
  oficial: boolean;
}

export interface Gol {
  minuto: number;
  jugador: Ref<'jugador'>;
  equipo: Ref<'equipo'>;
  tipo: 'gol'|'penal'|'autogol'|'tiro-libre';
  asistente?: Ref<'jugador'>;
}

export interface EventoPartido {
  minuto: number;
  tipo: 'gol'|'amarilla'|'roja'|'cambio'|'lesion'|'falta-clave'|'inicio-tiempo'|'fin-tiempo';
  equipo?: Ref<'equipo'>;
  jugador?: Ref<'jugador'>;
  detalle?: string;
}

export interface StatsPartido {
  posesion?: number;
  remates?: number;
  rematesArco?: number;
  faltas?: number;
  cornersAfavor?: number;
  amarillas?: number;
  rojas?: number;
  pasesCompletos?: number;
  pasesIntentados?: number;
}

export interface H2HResumen {
  totalEnfrentamientos: number;
  victoriasLocal: number;
  empates: number;
  victoriasVisitante: number;
  ultimosResultados: Array<{ fecha: string; competicion: string; resultado: string }>;
}

// === Editorial ===
export interface Articulo {
  slug: Slug;
  titulo: string;
  subtitulo?: string;
  kicker: string;
  categoria: 'previa'|'cronica'|'analisis'|'entrevista'|'historia'|'reportaje';
  autor: Ref<'autor'>;
  fechaPublicacion: ISODateTime;
  fechaActualizacion?: ISODateTime;
  imagenHero: ImageRef;
  lead: string;
  cuerpo: string;
  tags: Ref<'tag'>[];
  entidadesMencionadas: Ref<'torneo'|'edicion'|'seleccion'|'equipo'|'jugador'|'partido'>[];
  tiempoLectura: number;
  seo: SeoBlock;
}
