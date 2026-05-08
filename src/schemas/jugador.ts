import { z } from 'zod';
import {
  SlugSchema, RefSchema, SeoBlockSchema, FaqEntrySchema, PosicionSchema,
} from './common.js';
import { EquipoSchema } from './equipo.js';

export const TrayectoriaItemSchema = z.object({
  club: RefSchema,
  desde: z.string(),
  hasta: z.string().optional(),
  tipo: z.enum(['cantera', 'profesional', 'cesion']),
  partidos: z.number().int().nonnegative().optional(),
  goles: z.number().int().nonnegative().optional(),
  titulos: z.array(z.string()).optional(),
  notas: z.string().optional(),
});

export const EstadisticaTemporadaSchema = z.object({
  temporada: z.string(),
  competicion: RefSchema,
  equipo: RefSchema,
  pj: z.number().int().nonnegative(),
  goles: z.number().int().nonnegative(),
  asistencias: z.number().int().nonnegative(),
  amarillas: z.number().int().nonnegative().optional(),
  rojas: z.number().int().nonnegative().optional(),
});

export const TituloLogradoSchema = z.object({
  competicion: RefSchema,
  ano: z.number().int(),
  equipo: RefSchema,
  rolFinal: z.enum(['titular', 'suplente', 'no-convocado']).optional(),
});

export const JugadorSchema = z.object({
  slug: SlugSchema,
  nombre: z.string().min(1),
  nombreCompleto: z.string().min(1),
  apodo: z.string().optional(),
  fechaNacimiento: z.string(),
  nacionalidad: z.string().min(1),
  altura: z.number().int().optional(),
  peso: z.number().int().optional(),
  pieDominante: z.enum(['izquierdo', 'derecho', 'ambidiestro']).optional(),
  posicion: PosicionSchema,
  clubActual: RefSchema,
  seleccion: RefSchema.optional(),
  trayectoria: z.array(TrayectoriaItemSchema),
  estadisticas: z.array(EstadisticaTemporadaSchema).optional(),
  titulos: z.array(TituloLogradoSchema).optional(),
  valorMercado: z.object({
    monto: z.number().nonnegative(),
    moneda: z.string().min(1),
    fecha: z.string(),
    fuente: z.string().optional(),
  }).optional(),
  redes: EquipoSchema.shape.redes,
  retirado: z.boolean().optional(),
  seo: SeoBlockSchema,
  faq: z.array(FaqEntrySchema),
});
