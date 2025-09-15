import { Schema, Types, model } from 'mongoose';

const PlazaSchema = new Schema(
  {
    convocatoriaId: { type: Types.ObjectId, ref: 'Convocatoria', required: true, index: true },
    concursoId: { type: Types.ObjectId, ref: 'Concurso', required: true, index: true },
    puesto: { type: String, required: true, trim: true },
    codigoPlaza: { type: String, required: true, trim: true },
    unidadAdministrativa: { type: String, required: true, trim: true },
    folio: { type: String, required: true, unique: true, trim: true },
    // YYYY-MM-DD y HH:mm (24h); guardamos como string por simplicidad
    fechaAplicacion: { type: String, required: true },
    horaAplicacion: { type: String, required: true },
    especialistaId: { type: Types.ObjectId, ref: 'Especialista', required: true }
  },
  { timestamps: true }
);

export type Plaza = {
  _id: string;
  convocatoriaId: string;
  concursoId: string;
  puesto: string;
  codigoPlaza: string;
  unidadAdministrativa: string;
  folio: string;
  fechaAplicacion: string; // YYYY-MM-DD
  horaAplicacion: string;  // HH:mm
  especialistaId: string;
};

export default model<Plaza>('Plaza', PlazaSchema);
