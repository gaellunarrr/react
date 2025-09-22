import { Schema, Types, model } from 'mongoose';

const ConcursoSchema = new Schema(
  {
    convocatoriaId: { type: Types.ObjectId, ref: 'Convocatoria', required: true, index: true },
    nombre: { type: String, required: true, trim: true },
    activo: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export type Concurso = {
  _id: string;
  convocatoriaId: string;
  nombre: string;
  activo: boolean;
};

export default model<Concurso>('Concurso', ConcursoSchema);
