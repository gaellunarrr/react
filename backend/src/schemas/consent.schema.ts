// src/schemas/consent.schema.ts
import { z } from 'zod';

// (Placeholder de “validadores de Erick”)
// Aquí usamos definiciones locales; cuando Erick publique/comparta, se reemplaza.
export const consentBodySchema = z.object({
  tipo: z.enum(['uso_app', 'conclusion_examen']),
  nombreDeclarante: z.string().trim().min(1, 'Nombre requerido'),
  aceptado: z.boolean(),
});

//tipo restringido a dos valores exactos (evitamos basura en DB)
//nombreDeclarante con .trim().min(1) para evitar cadenas vacías.
//aceptado booleano para poder rechazar false como 400 de forma clara.