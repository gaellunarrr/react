// src/schemas/exam.schema.ts
import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1, 'Requerido');

const aspectoSchema = z.object({
  nombre: nonEmptyString,
  ponderacion: z.number().int().min(0).max(100),
});

const casoSchema = z.object({
  nombre: nonEmptyString,
  aspectos: z.array(aspectoSchema).min(1).max(10),
});

export const createExamSchema = z.object({
  modalidad: nonEmptyString,
  duracionMin: z.number().int().min(1).max(120, 'Máximo 120 minutos'),
  temasGuia: z.array(nonEmptyString).max(20).optional().default([]),
  numeroCasos: z.number().int().min(1).max(3),
  casos: z.array(casoSchema).min(1).max(3),
}).superRefine((val, ctx) => {
  if (val.numeroCasos !== val.casos.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'numeroCasos debe coincidir con la cantidad de casos',
      path: ['numeroCasos'],
    });
  }
  val.casos.forEach((c, i) => {
    const sum = c.aspectos.reduce((acc, a) => acc + a.ponderacion, 0);
    if (sum !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La suma de ponderaciones del caso debe ser 100',
        path: ['casos', i, 'aspectos'],
      });
    }
  });
});
