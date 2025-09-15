// src/models/Exam.ts
import { Schema, Types, model } from 'mongoose';

type Aspecto = { nombre: string; ponderacion: number; };
type Caso = { nombre: string; aspectos: Aspecto[]; };

const AspectoSchema = new Schema<Aspecto>(
  {
    nombre: { type: String, required: true, trim: true },
    ponderacion: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const CasoSchema = new Schema<Caso>(
  {
    nombre: { type: String, required: true, trim: true },
    aspectos: {
      type: [AspectoSchema],
      validate: [(arr: Aspecto[]) => arr.length >= 1 && arr.length <= 10, 'aspectos 1..10'],
      required: true,
    },
  },
  { _id: false }
);

const ExamSchema = new Schema(
  {
    
    plazaId: { type: Types.ObjectId, ref: 'Plaza', required: true, index: true },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },

    modalidad: { type: String, required: true, trim: true },
    duracionMin: { type: Number, required: true, min: 1, max: 120 },
    temasGuia: { type: [String], default: [] },
    numeroCasos: { type: Number, required: true, min: 1, max: 3 },
    casos: {
      type: [CasoSchema],
      validate: [(arr: Caso[]) => arr.length >= 1 && arr.length <= 3, 'casos 1..3'],
      required: true,
    },
  },
  { timestamps: true }
);

// Un examen por link (idempotencia por token)
ExamSchema.index({ linkId: 1 }, { unique: true });

export type Exam = {
  _id: any;
  linkId: any;
  plazaId: any;
  ip: string;
  userAgent: string;
  modalidad: string;
  duracionMin: number;
  temasGuia: string[];
  numeroCasos: number;
  casos: Caso[];
  createdAt: Date;
  updatedAt: Date;
};

export default model<Exam>('Exam', ExamSchema);
