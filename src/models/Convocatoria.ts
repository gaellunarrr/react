import { Schema, model } from 'mongoose';

const ConvocatoriaSchema = new Schema(
  {
    // p.ej. "001/2025"
    codigo: { type: String, required: true, unique: true, trim: true },
    activa: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export type Convocatoria = {
  _id: string;
  codigo: string;
  activa: boolean;
};

export default model<Convocatoria>('Convocatoria', ConvocatoriaSchema);
