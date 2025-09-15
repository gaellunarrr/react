import { Schema, Types, model } from 'mongoose';

const LinkSchema = new Schema(
  {
    plazaId: { type: Types.ObjectId, ref: 'Plaza', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true }, // sha-256 hex
    expiraAt: { type: Date, required: true, index: true },
    usado: { type: Boolean, default: false, index: true },
    usadoAt: { type: Date }
  },
  { timestamps: true }
);

export type Link = {
  _id: string;
  plazaId: string;
  tokenHash: string;
  expiraAt: Date;
  usado: boolean;
  usadoAt?: Date;
};

export default model<Link>('Link', LinkSchema);
