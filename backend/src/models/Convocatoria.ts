import { Schema, model } from "mongoose";

const ConvocatoriaSchema = new Schema(
  {
    // En tu BD es hash-40, no ObjectId
    _id: { type: String, required: true },

    // Campos frecuentes en tus colecciones
    codigo: { type: String },
    nombre: { type: String },
    activa: { type: Boolean },
    hash: { type: String },
    convocatoria: { type: String },
    code: { type: String },
  },
  {
    versionKey: false,
    strict: false, // tolera variaciones reales de la colección
    timestamps: false,
  }
);

export default model("Convocatoria", ConvocatoriaSchema);
