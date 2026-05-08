import { z } from 'zod';
import { SlugSchema, RefSchema, ImageRefSchema, SeoBlockSchema } from './common.js';

export const ArticuloSchema = z.object({
  slug: SlugSchema,
  titulo: z.string().min(1),
  subtitulo: z.string().optional(),
  kicker: z.string().min(1),
  categoria: z.enum(['previa', 'cronica', 'analisis', 'entrevista', 'historia', 'reportaje']),
  autor: RefSchema,
  fechaPublicacion: z.string(),
  fechaActualizacion: z.string().optional(),
  imagenHero: ImageRefSchema,
  lead: z.string().min(1),
  cuerpo: z.string().min(1),
  tags: z.array(RefSchema),
  entidadesMencionadas: z.array(RefSchema),
  tiempoLectura: z.number().int().positive(),
  seo: SeoBlockSchema,
});

// Tema (cluster editorial) — versión mínima usada por el front
export const TemaSchema = z.object({
  slug: SlugSchema,
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  hero: z.object({
    title: z.string(),
    lead: z.string().optional(),
    imagen: ImageRefSchema.optional(),
  }).optional(),
  articulos: z.array(RefSchema).optional(),
  entidadesRelacionadas: z.array(RefSchema).optional(),
  seo: SeoBlockSchema,
}).passthrough();
