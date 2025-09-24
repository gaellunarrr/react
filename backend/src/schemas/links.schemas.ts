import { z } from "zod";

const anyId = z.string().min(1);

export const createLinkSchema = z.object({
  convocatoriaId: anyId,              // _id o código/hash
  concursoId: anyId,                  // _id o código/hash
  plazaId: z.string().optional(),     // _id o vacío si usas plazaCodigo
  plazaCodigo: z.string().optional(), // CFEC2A09C-19482
  especialistaId: z.string().optional(),
  jefeNombre: z.string().min(1),
  ttlHours: z.number().int().positive().max(168).default(48),
  prefill: z.object({
    plazaCodigo: z.string().min(1),
    puesto: z.string().min(1),
    unidadAdministrativa: z.string().min(1),
  }),
});