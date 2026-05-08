import { z } from 'zod';
import {
  SlugSchema, RefSchema, ImageRefSchema, SeoBlockSchema,
  FaqEntrySchema, HeroMetricSchema, PosicionSchema,
} from './common.js';

export const EquipoSchema = z.object({
  slug: SlugSchema,
  tipo: z.enum(['club', 'seleccion']),
  nombre: z.string().min(1),
  nombreOficial: z.string().min(1),
  apodo: z.string().optional(),
  pais: z.string().min(1),
  ciudad: z.string().optional(),
  fundacion: z.number().int().optional(),
  escudo: ImageRefSchema,
  colores: z.object({ primario: z.string(), secundario: z.string() }),
  estadio: RefSchema.optional(),
  estadiosSecundarios: z.array(RefSchema).optional(),
  dt: z.object({
    nombre: z.string().min(1),
    foto: ImageRefSchema.optional(),
    desde: z.string().optional(),
    nacionalidad: z.string().min(1),
  }),
  cuerpoTecnico: z.array(z.object({
    rol: z.string().min(1),
    nombre: z.string().min(1),
    nacionalidad: z.string().optional(),
  })).optional(),
  redes: z.object({
    twitter: z.string().optional(),
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    web: z.string().optional(),
  }),
  fifaRank: z.number().int().optional(),
  valorPlantilla: z.object({ monto: z.number().nonnegative(), moneda: z.enum(['EUR', 'USD']) }).optional(),
  rivalidades: z.array(RefSchema),
  estadisticasDestacadas: z.array(HeroMetricSchema).optional(),
  seo: SeoBlockSchema,
  faq: z.array(FaqEntrySchema),
});

export const PlantillaJugadorSchema = z.object({
  jugador: RefSchema,
  dorsal: z.number().int().optional(),
  posicion: PosicionSchema,
  posicionDetalle: z.string().optional(),
  capitan: z.boolean().optional(),
  titular: z.boolean().optional(),
  estado: z.enum(['disponible', 'lesionado', 'suspendido']).optional(),
});

export const PlantillaSchema = z.object({
  equipo: RefSchema,
  edicion: RefSchema.optional(),
  jugadores: z.array(PlantillaJugadorSchema),
  cuerpoTecnico: EquipoSchema.shape.cuerpoTecnico,
  altas: z.array(z.object({
    jugador: RefSchema,
    desde: z.string(),
    tipo: z.enum(['fichaje', 'cesion', 'subida-cantera']),
  })).optional(),
  bajas: z.array(z.object({
    jugador: RefSchema,
    hacia: z.string(),
    tipo: z.enum(['venta', 'cesion-saliente', 'fin-de-contrato', 'retiro']),
  })).optional(),
});
