// src/models/Link.ts
import { Schema, model } from "mongoose";

const LinkSchema = new Schema(
  {
    token: { type: String, required: true },
    tokenHash: { type: String, required: true, index: true },

    expiraAt: { type: Date, required: true },

    // ¡IMPORTANTE!
    // Usa Mixed para aceptar ObjectId o string (hash de 40, etc.)
    convocatoriaId: { type: Schema.Types.Mixed, index: true },
    concursoId: { type: Schema.Types.Mixed, index: true },
    plazaId: { type: Schema.Types.Mixed, index: true },
    especialistaId: { type: Schema.Types.Mixed, index: true },

    // Snapshot para el prefill del formulario
    header: { type: Schema.Types.Mixed, default: {} },

    status: {
      type: String,
      enum: ["ISSUED", "EXPIRED", "USED"],
      default: "ISSUED",
      index: true,
    },
    usado: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, versionKey: false }
);

// Si quieres evitar duplicados de tokenHash (recomendado):
// LinkSchema.index({ tokenHash: 1 }, { unique: true });

export default model("Link", LinkSchema);
