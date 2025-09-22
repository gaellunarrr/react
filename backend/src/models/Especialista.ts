import { Schema, model } from 'mongoose';

const EspecialistaSchema = new Schema(
  {
    nombreCompleto: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    curp: { type: String, trim: true }
  },
  { timestamps: true }
);

export type Especialista = {
  _id: string;
  nombreCompleto: string;
  email?: string;
  curp?: string;
};

export default model<Especialista>('Especialista', EspecialistaSchema);
