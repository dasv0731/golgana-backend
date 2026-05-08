import { z } from 'zod';

export const SlugSchema = z.string().min(1).regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'slug must be kebab-case lowercase');

export const RefTypeSchema = z.enum([
  'torneo', 'edicion', 'seleccion', 'equipo', 'jugador',
  'partido', 'grupo', 'fase', 'sede', 'tag', 'autor',
]);

export const RefSchema = z.object({
  type: RefTypeSchema,
  slug: SlugSchema,
  nombre: z.string().min(1),
});

export const ImageRefSchema = z.object({
  src: z.string().min(1),
  alt: z.string(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  blurDataUrl: z.string().optional(),
  credito: z.string().optional(),
});

export const SeoBlockSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImageOverride: ImageRefSchema.optional(),
  canonicalOverride: z.string().optional(),
  noindex: z.boolean().optional(),
});

export const FaqEntrySchema = z.object({
  pregunta: z.string().min(1),
  respuesta: z.string().min(1),
});

export const HeroMetricSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  caption: z.string().optional(),
  accent: z.boolean().optional(),
});

export const PosicionSchema = z.enum(['POR', 'DEF', 'MED', 'DEL']);
