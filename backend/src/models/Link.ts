import { Schema, model, Types } from "mongoose";

const LinkSchema = new Schema({
  token: { type: String, unique: true, index: true },
  status: { type: String, enum: ["ISSUED","USED","EXPIRED","REVOKED"], default: "ISSUED", index: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
  usedAt: { type: Date },
  // vinculación
  convocatoriaId: { type: Types.ObjectId, ref: "Convocatoria", required: true },
  concursoId:     { type: Types.ObjectId, ref: "Concurso", required: true },
  plazaId:        { type: Types.ObjectId, ref: "Plaza", required: true },
  especialistaId: { type: Types.ObjectId, ref: "Especialista", required: true },
  // snapshot para prefill (no dependemos de cambios posteriores)
  header: { type: Schema.Types.Mixed },
  submissionsCount: { type: Number, default: 0 }
}, { timestamps: true });

export default model("Link", LinkSchema);
