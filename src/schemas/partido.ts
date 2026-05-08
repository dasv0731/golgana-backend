import { z } from 'zod';
import { SlugSchema, RefSchema, ImageRefSchema, SeoBlockSchema } from './common.js';
import { PlantillaJugadorSchema } from './equipo.js';

export const AlineacionSchema = z.object({
  formacion: z.string().min(1),
  titulares: z.array(PlantillaJugadorSchema),
  suplentes: z.array(PlantillaJugadorSchema),
  dt: z.object({ nombre: z.string().min(1) }),
  oficial: z.boolean(),
});

export const GolSchema = z.object({
  minuto: z.number().int().nonnegative(),
  jugador: RefSchema,
  equipo: RefSchema,
  tipo: z.enum(['gol', 'penal', 'autogol', 'tiro-libre']),
  asistente: RefSchema.optional(),
});

export const EventoPartidoSchema = z.object({
  minuto: z.number().int().nonnegative(),
  tipo: z.enum(['gol', 'amarilla', 'roja', 'cambio', 'lesion', 'falta-clave', 'inicio-tiempo', 'fin-tiempo']),
  equipo: RefSchema.optional(),
  jugador: RefSchema.optional(),
  detalle: z.string().optional(),
});

export const StatsPartidoSchema = z.object({
  posesion: z.number().min(0).max(100).optional(),
  remates: z.number().int().nonnegative().optional(),
  rematesArco: z.number().int().nonnegative().optional(),
  faltas: z.number().int().nonnegative().optional(),
  cornersAfavor: z.number().int().nonnegative().optional(),
  amarillas: z.number().int().nonnegative().optional(),
  rojas: z.number().int().nonnegative().optional(),
  pasesCompletos: z.number().int().nonnegative().optional(),
  pasesIntentados: z.number().int().nonnegative().optional(),
});

export const H2HResumenSchema = z.object({
  totalEnfrentamientos: z.number().int().nonnegative(),
  victoriasLocal: z.number().int().nonnegative(),
  empates: z.number().int().nonnegative(),
  victoriasVisitante: z.number().int().nonnegative(),
  ultimosResultados: z.array(z.object({
    fecha: z.string(),
    competicion: z.string(),
    resultado: z.string(),
  })),
});

export const PartidoSchema = z.object({
  slug: SlugSchema,
  edicion: RefSchema,
  fase: z.object({
    tipo: z.enum(['grupos', 'eliminatoria', 'jornada']),
    slug: z.string(),
    nombre: z.string(),
  }),
  grupo: RefSchema.optional(),
  local: RefSchema,
  visitante: RefSchema,
  fecha: z.string(),
  zonaHoraria: z.string(),
  sede: RefSchema,
  estado: z.enum(['scheduled', 'playing', 'finished', 'postponed']),
  marcador: z.object({ local: z.number().int(), visitante: z.number().int() }).optional(),
  goleadores: z.array(GolSchema).optional(),
  alineaciones: z.object({ local: AlineacionSchema, visitante: AlineacionSchema }).optional(),
  arbitro: z.object({ nombre: z.string(), nacionalidad: z.string() }).optional(),
  transmision: z.array(z.string()).optional(),
  previa: z.object({ texto: z.string(), autor: RefSchema, fecha: z.string() }).optional(),
  cronica: z.object({ texto: z.string(), autor: RefSchema, fecha: z.string() }).optional(),
  minutoAMinuto: z.array(EventoPartidoSchema).optional(),
  estadisticas: z.object({ local: StatsPartidoSchema, visitante: StatsPartidoSchema }).optional(),
  h2h: H2HResumenSchema.optional(),
  imagenes: z.array(ImageRefSchema).optional(),
  seo: SeoBlockSchema,
});
