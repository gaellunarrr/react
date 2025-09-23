import { Schema, model, Types } from "mongoose";

const ExamSchema = new Schema({
  linkToken: { type: String, index: true },
  convocatoriaId: { type: Types.ObjectId, ref: "Convocatoria", required: true },
  concursoId:     { type: Types.ObjectId, ref: "Concurso", required: true },
  plazaId:        { type: Types.ObjectId, ref: "Plaza", required: true },
  especialistaId: { type: Types.ObjectId, ref: "Especialista", required: true },

  header:   { type: Schema.Types.Mixed },
  answers:  { type: Schema.Types.Mixed },
  nombreDeclarante: { type: String },

  artifacts: {
    responsesPdf:   { type: String }, // URL o path (compatibilidad)
    faPdf:          { type: String },
    fePdf:          { type: String },
    receiptPdfUrl:  { type: String },
    faPdfUrl:       { type: String },
    fePdfUrl:       { type: String },
  }
}, { timestamps: true });

export default model("Exam", ExamSchema);
