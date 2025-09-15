// src/models/Consent.ts
import { Schema, Types, model } from 'mongoose';

export const CONSENT_TIPOS = ['uso_app', 'conclusion_examen'] as const;
export type ConsentTipo = typeof CONSENT_TIPOS[number];

const ConsentSchema = new Schema(
  {
    // Relación con el link (no guardamos token ni tokenHash aquí)
    linkId: { type: Types.ObjectId, ref: 'Link', required: true, index: true },

    // Tipo de consentimiento (enum controlado)
    tipo: { type: String, enum: CONSENT_TIPOS, required: true },

    // Nombre puede contener PII, pero lo limitamos al consentimiento
    nombreDeclarante: { type: String, required: true, trim: true },

    // Debe ser true para registrar (si es false responderemos 400 en la API)
    aceptado: { type: Boolean, required: true },

    // Metadatos útiles para soporte/seguridad (no obligatorios)
    ip: { type: String, trim: true },
    userAgent: { type: String, trim: true },
  },
  { timestamps: true }
);

// Idempotencia: un consentimiento por (linkId, tipo)
ConsentSchema.index({ linkId: 1, tipo: 1 }, { unique: true });

export type Consent = {
  _id: string;
  linkId: string;
  tipo: ConsentTipo;
  nombreDeclarante: string;
  aceptado: boolean;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
};

export default model<Consent>('Consent', ConsentSchema);


//linkId + tipo único: impide que el mismo ususario emita el mismo consentimiento dos veces si hay doble clic o reintentos.
//ip/userAgent: sirven para auditoría sin almacenar el token
//nombreDeclarante sólo aquí: evita propagar PII a otros modelos.