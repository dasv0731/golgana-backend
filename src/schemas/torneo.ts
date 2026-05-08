import { z } from 'zod';
import { SlugSchema, RefSchema, ImageRefSchema, SeoBlockSchema, FaqEntrySchema } from './common.js';

export const SedeSchema = z.object({
  slug: SlugSchema,
  nombre: z.string().min(1),
  ciudad: z.string().min(1),
  pais: z.enum(['USA', 'CAN', 'MEX']),
  capacidad: z.number().int().positive(),
  imagen: ImageRefSchema.optional(),
  partidos: z.array(RefSchema),
});

export const FaseSchema = z.object({
  slug: z.union([
    z.enum(['grupos', 'octavos', 'cuartos', 'semifinales', 'final']),
    z.string().regex(/^jornada-\d+$/),
  ]),
  nombre: z.string().min(1),
  tipo: z.enum(['grupos', 'eliminatoria', 'jornada']),
  partidos: z.array(RefSchema),
  fechaInicio: z.string(),
  fechaFin: z.string(),
});

export const GrupoStandingSchema = z.object({
  posicion: z.number().int().positive(),
  seleccion: RefSchema,
  pj: z.number().int().nonnegative(),
  g: z.number().int().nonnegative(),
  e: z.number().int().nonnegative(),
  p: z.number().int().nonnegative(),
  gf: z.number().int().nonnegative(),
  gc: z.number().int().nonnegative(),
  dg: z.number().int(),
  pts: z.number().int().nonnegative(),
  forma: z.array(z.enum(['W', 'D', 'L'])),
});

export const GrupoSchema = z.object({
  slug: SlugSchema,
  edicion: RefSchema,
  letra: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']),
  selecciones: z.array(RefSchema),
  tabla: z.array(GrupoStandingSchema),
  partidos: z.array(RefSchema),
  analisis: z.string().optional(),
  seo: SeoBlockSchema,
});

export const EdicionSchema = z.object({
  slug: SlugSchema,
  torneo: RefSchema,
  ano: z.number().int(),
  fechaInicio: z.string(),
  fechaFin: z.string(),
  estado: z.enum(['upcoming', 'ongoing', 'finished']),
  participantes: z.array(RefSchema),
  formato: z.object({
    tipoFase: z.enum(['grupos', 'liga', 'eliminatoria']),
    descripcion: z.string(),
  }),
  fases: z.array(FaseSchema),
  sedes: z.array(SedeSchema).optional(),
  campeon: RefSchema.optional(),
  seo: SeoBlockSchema,
  faq: z.array(FaqEntrySchema),
});

export const TorneoSchema = z.object({
  slug: SlugSchema,
  nombre: z.string().min(1),
  nombreCorto: z.string().min(1),
  tipo: z.enum(['mundial', 'liga', 'copa-nacional', 'continental']),
  organizador: z.object({ nombre: z.string(), sitioWeb: z.string().optional() }),
  fundacion: z.number().int().optional(),
  edicionActual: RefSchema,
  edicionesPrevias: z.array(RefSchema),
  campeones: z.array(z.object({
    ano: z.number().int(),
    campeon: RefSchema,
    subcampeon: RefSchema.optional(),
  })),
  seo: SeoBlockSchema,
  faq: z.array(FaqEntrySchema),
});
