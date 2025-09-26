import Link from '../models/Link';
import Plaza from '../models/Plaza';
import Especialista from '../models/Especialista';
import { config } from '../shared/config';
import { generateTokenHex, sha256Hex } from '../shared/token';
import { notFound, AppError } from '../shared/errors';
import { log } from '../shared/logger';
import { Types, isValidObjectId } from 'mongoose';

/** Tipado mínimo seguro de Link cuando usamos .lean() */
type LinkLean = {
  _id: any;
  token?: string;
  tokenHash: string;
  expiraAt: Date;
  usado?: boolean;
  usadoAt?: Date;
  plazaId?: any;
  convocatoriaId?: any;
  concursoId?: any;
};

const isOid = (v?: string) => !!v && isValidObjectId(v);

/** Buscar plaza por _id (solo si es OID) o por códigos visibles/hash */
// Reemplaza tu findPlazaByIdOrCode por este
async function findPlazaByIdOrCode(idOrCode?: string | null) {
  if (!idOrCode) return null;

  // Si es ObjectId válido, intenta por _id primero
  if (isOid(idOrCode)) {
    const byId = await Plaza.findById(new Types.ObjectId(idOrCode)).lean();
    if (byId) return byId;
  }

  // JAMÁS uses {_id: idOrCode} cuando NO es ObjectId (evita CastError)
  return Plaza.findOne({
    $or: [
      { codigoPlaza: idOrCode }, // CFxxxx-xxxxx
      { codigo: idOrCode },
      { plaza: idOrCode },
      { code: idOrCode },
      { hash: idOrCode },
    ],
  }).lean();
}


type Header = {
  puesto: string;
  codigoPlaza: string;
  unidadAdministrativa: string;
  folio: string;
  fechaAplicacion: string; // YYYY-MM-DD
  horaAplicacion: string;  // HH:mm
  especialistaId: string;
};

export async function createLink(plazaIdOrCode: string, ttlHours?: number) {
  const ttl = Math.min(Math.max(Number(ttlHours || config.linkTtlHours), 1), 720);
  const token = generateTokenHex(); // 48 hex
  const tokenHash = sha256Hex(token);
  const expiraAt = new Date(Date.now() + ttl * 60 * 60 * 1000);

  // validar plaza existente (soporta _id OID, código visible, hash, etc.)
  const plaza = await findPlazaByIdOrCode(plazaIdOrCode);
  if (!plaza) throw notFound('Plaza not found');

  const created = await Link.create({
    plazaId: String(plaza._id),
    tokenHash,
    expiraAt,
    usado: false,
  });

  const url = `${config.publicBaseUrl}/examen?token=${token}`;

  log.info('link.create', {
    linkId: created._id.toString(),
    plazaId: String(plaza._id),
    expiraAt: expiraAt.toISOString(),
  });

  return {
    linkId: created._id.toString(),
    url,
    token,
    expiraAt: expiraAt.toISOString(),
  };
}

export async function findByTokenHash(tokenHash: string) {
  return Link.findOne({ tokenHash }).lean<LinkLean | null>();
}

function classifyState(link: LinkLean | null) {
  if (!link) return { code: 'invalid' as const, status: 404 };
  if (link.usado) return { code: 'used' as const, status: 400 };
  if (new Date(link.expiraAt).getTime() <= Date.now())
    return { code: 'expired' as const, status: 400 };
  return { code: 'ok' as const, status: 200 };
}

export async function verifyToken(tokenHex: string) {
  const tokenHash = sha256Hex(tokenHex);
  const link = await findByTokenHash(tokenHash);
  const state = classifyState(link);
  if (state.code !== 'ok') throw new AppError(state.code, state.status, state.code);

  // ⚠️ Antes usabas findById con plazaId (hash de 40 hex) ⇒ CastError.
  //    Ahora resolvemos con helper seguro:
  const plaza = await findPlazaByIdOrCode(String(link!.plazaId));
  if (!plaza) throw notFound('Plaza not found');

  const header: Header = {
    puesto: (plaza as any).puesto,
    codigoPlaza: (plaza as any).codigoPlaza ?? (plaza as any).codigo,
    unidadAdministrativa: (plaza as any).unidadAdministrativa,
    folio: (plaza as any).folio,
    fechaAplicacion: (plaza as any).fechaAplicacion,
    horaAplicacion: (plaza as any).horaAplicacion,
    especialistaId: String((plaza as any).especialistaId),
  };
  return header;
}

export async function markTokenUsed(tokenHex: string) {
  const tokenHash = sha256Hex(tokenHex);

  const updated = await Link.findOneAndUpdate(
    { tokenHash, usado: false, expiraAt: { $gt: new Date() } },
    { $set: { usado: true, usadoAt: new Date() } },
    { new: true }
  ).lean<LinkLean | null>();

  if (updated) {
    const usedAt = (updated as any)?.usadoAt ?? new Date();
    log.info('link.used', {
      linkId: updated._id.toString(),
      usedAt: usedAt instanceof Date ? usedAt.toISOString() : String(usedAt),
    });
    return {
      ok: true,
      usedAt: usedAt instanceof Date ? usedAt.toISOString() : String(usedAt),
    };
  }

  const link = await findByTokenHash(tokenHash);
  const state = classifyState(link);
  throw new AppError(state.code, state.status, state.code);
}

// Reemplaza tu prefillByToken completo por este
export async function prefillByToken(tokenHex: string) {
  const tokenHash = sha256Hex(tokenHex);
  const link = await findByTokenHash(tokenHash);
  const state = classifyState(link);
  if (state.code !== 'ok') throw new AppError(state.code, state.status, state.code);

  // Header del Link (en tu colección ya viene con todo lo necesario)
  const hdr: any = (link as any).header || {};

  // El mejor "candidato" para localizar la plaza
  const plazaKey =
    hdr.plazaCodigo ??
    (link as any).plazaCodigo ??
    (link as any).plazaId ??
    null;

  // Intentamos hallar la plaza, pero NO rompemos si no existe
  const plaza = await findPlazaByIdOrCode(plazaKey ? String(plazaKey) : null);

  // Especialista: si hay OID, lo resolvemos; si no, dejamos el nombre del header
  let especialistaNombre = hdr.jefeNombre || '';
  const especialistaId = (plaza as any)?.especialistaId ?? hdr.especialistaId;
  if (especialistaNombre === '' && especialistaId && isOid(String(especialistaId))) {
    const esp = await Especialista.findById(new Types.ObjectId(String(especialistaId))).lean();
    especialistaNombre = (esp as any)?.nombreCompleto || (esp as any)?.nombre || '';
  }

  // Construimos el header final priorizando: header del Link -> Plaza -> vacío
  return {
    plazaId: String((plaza as any)?._id ?? (link as any)?.plazaId ?? ''),
    header: {
      puesto: hdr.puesto ?? (plaza as any)?.puesto ?? (plaza as any)?.puestoNombre ?? '',
      codigoPlaza: hdr.plazaCodigo ?? (plaza as any)?.codigoPlaza ?? (plaza as any)?.codigo ?? '',
      unidadAdministrativa: hdr.unidadAdministrativa ?? (plaza as any)?.unidadAdministrativa ?? '',
      folio: hdr.folio ?? (plaza as any)?.folio ?? '',
      fechaAplicacion: hdr.fechaAplicacion ?? (plaza as any)?.fechaAplicacion ?? '',
      horaAplicacion: hdr.horaAplicacion ?? (plaza as any)?.horaAplicacion ?? '',
      especialistaId: String(especialistaId ?? ''),
      especialistaNombre,
    },
  };
}