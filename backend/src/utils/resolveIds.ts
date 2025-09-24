// src/utils/resolveIds.ts
import { Types } from "mongoose";
import Convocatoria from "../models/Convocatoria";
import Concurso from "../models/Concurso";
import Plaza from "../models/Plaza";
import Especialista from "../models/Especialista";

export const isOid = (v?: string) => !!v && Types.ObjectId.isValid(v as any);
export const toOid = (v: string) => new Types.ObjectId(v);
const isSha1 = (s?: string) => !!s && /^[a-f0-9]{40}$/i.test(s);
const isNumeric = (s?: string | number) => s !== undefined && /^\d+$/.test(String(s ?? ""));

export function altCodes(raw?: string): string[] {
  if (!raw) return [];
  const s = String(raw).trim();
  const noDash = s.replace(/-/g, "");
  return [
    s,
    s.toUpperCase(),
    s.toLowerCase(),
    noDash,
    noDash.toUpperCase(),
    noDash.toLowerCase(),
  ];
}

/* ----------------------- Convocatoria resolver ----------------------- */
export async function resolveConvocatoria(idOrCode?: string) {
  if (!idOrCode) return null;

  if (isOid(idOrCode)) {
    const byId = await Convocatoria.findById(toOid(idOrCode), "_id codigo activa").lean();
    if (byId) return byId;
  }
  // Modelo actual trae 'codigo'. Dejo OR extendido por si más adelante agregas alias.
  return Convocatoria.findOne(
    { $or: [{ codigo: idOrCode }, { code: idOrCode }, { nombre: idOrCode }, { hash: idOrCode }] },
    "_id codigo activa"
  ).lean();
}

/* ------------------------- Concurso resolver ------------------------- */
export async function resolveConcurso(idOrName?: string, convId?: any) {
  if (!idOrName) return null;

  if (isOid(idOrName)) {
    const byId = await Concurso.findById(toOid(idOrName), "_id nombre convocatoriaId").lean();
    if (byId) return byId;
  }

  const or: any[] = [{ nombre: idOrName }];
  // Por compatibilidad futura (si agregas 'codigo' o 'hash')
  if (isNumeric(idOrName)) or.push({ codigo: Number(idOrName) });
  if (isSha1(idOrName)) or.push({ hash: idOrName }, { concurso: idOrName }, { code: idOrName });

  const q: any = { $or: or };
  if (convId) q.convocatoriaId = convId;

  return Concurso.findOne(q, "_id nombre convocatoriaId").lean();
}

/* --------------------------- Plaza resolver -------------------------- */
export async function resolvePlazaByCode(idOrCode?: string) {
  if (!idOrCode) return null;

  if (isOid(idOrCode)) {
    const byId = await Plaza.findById(
      toOid(idOrCode),
      "_id convocatoriaId concursoId puesto codigoPlaza unidadAdministrativa folio fechaAplicacion horaAplicacion especialistaId"
    ).lean();
    if (byId) return byId;
  }

  const codes = altCodes(idOrCode);
  const q: any = {
    $or: [
      { codigoPlaza: { $in: codes } },
      { codigo: { $in: codes } },
      { codigo_plaza: { $in: codes } },
      { plazaCodigo: { $in: codes } },
      { plaza: { $in: codes } },
      { code: { $in: codes } },
      { folio: { $in: codes } }, // por si te llega folio
    ],
  };

  // Estricto
  let p = await Plaza.findOne(
    q,
    "_id convocatoriaId concursoId puesto codigoPlaza unidadAdministrativa folio fechaAplicacion horaAplicacion especialistaId"
  ).lean();
  if (p) return p;

  // Fallback regex (case-insensitive, sin guiones)
  const nodash = String(idOrCode).replace(/-/g, "");
  p = await Plaza.findOne(
    {
      $or: [
        { codigoPlaza: new RegExp(`^${idOrCode}$`, "i") },
        { codigoPlaza: new RegExp(`^${nodash}$`, "i") },
      ],
    },
    "_id convocatoriaId concursoId puesto codigoPlaza unidadAdministrativa folio fechaAplicacion horaAplicacion especialistaId"
  ).lean();

  return p;
}

/* ------------------------ Especialista resolver ---------------------- */
export async function resolveEspecialista(idOr?: string, jefeNombre?: string) {
  const or: any[] = [];
  if (idOr) {
    if (isOid(idOr)) {
      const byId = await Especialista.findById(toOid(idOr), "_id nombreCompleto email curp").lean();
      if (byId) return byId;
    }
    or.push(
      { _id: idOr },
      { email: String(idOr).toLowerCase() },
      { curp: String(idOr).toUpperCase() },
      { nombreCompleto: idOr },
      { hash: idOr }
    );
  }
  if (jefeNombre) or.push({ nombreCompleto: jefeNombre });

  return Especialista.findOne({ $or: or }, "_id nombreCompleto email curp").lean();
}
