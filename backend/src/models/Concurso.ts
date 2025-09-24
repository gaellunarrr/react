import { Schema, model } from "mongoose";

const ConcursoSchema = new Schema(
  {
    // También hash-40 en tu BD
    _id: { type: String, required: true },

    // FK a convocatoria puede venir como string hash-40 u OID -> Mixed
    convocatoriaId: { type: Schema.Types.Mixed },
    convocatoria_id: { type: Schema.Types.Mixed },

    // En tus datos, el “código” del concurso aparece como número y/o string
    codigo: { type: Schema.Types.Mixed },   // 124002 o "124002"
    concurso: { type: Schema.Types.Mixed }, // 124002 o "124002"

    nombre: { type: String },
    descripcion: { type: String },
    hash: { type: String },
    code: { type: String },
  },
  {
    versionKey: false,
    strict: false,
    timestamps: false,
  }
);

export default model("Concurso", ConcursoSchema);
