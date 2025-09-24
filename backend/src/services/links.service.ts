import { LinkDoc } from './../models/Link';
import Link from '../models/Link'; 
import { Types } from 'mongoose';
import Plaza from '../models/Plaza';
import Especialista from '../models/Especialista';
import { config } from '../shared/config';
import { generateTokenHex, sha256Hex } from '../shared/token';
import { notFound, AppError } from '../shared/errors';
import { log } from '../shared/logger';

const isOid = (v?: string) => !!v && Types.ObjectId.isValid(v);



async function findPlazaByIdOrCode(idOrCode: string) {
  if(!idOrCode) return null;
  if(isOid(idOrCode)) {
    const x = await Plaza.findById(idOrCode);
    if(x) return x
  }
  return Plaza.findOne({
    $or: [
       { _id: idOrCode },          // _id string (sha1/40 hex) ✔
      { codigoPlaza: idOrCode },  // código visible (CFxxxx-xxxxx) ✔
      { codigo: idOrCode },
      { plaza: idOrCode },
      { code: idOrCode },
      
    ]
  })
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

  // validar plaza existente
  const plaza = await findPlazaByIdOrCode(plazaIdOrCode);
  if (!plaza) throw notFound('Plaza not found');

  const created = await Link.create({ plazaId:String(plaza._id), tokenHash, expiraAt, usado: false });

  const url = `${config.publicBaseUrl}/examen?token=${token}`;

  log.info('link.create', { linkId: created._id.toString(), plazaId: String(plaza._id), expiraAt: expiraAt.toISOString() });

  return {
    linkId: created._id.toString(),
    url,
    token,
    expiraAt: expiraAt.toISOString()
  };
}

export async function findByTokenHash(tokenHash: string) {
  return Link.findOne({ tokenHash }).lean<LinkDoc | null>();
}

function classifyState(link: LinkDoc | null) {
  if (!link) return { code: 'invalid' as const, status: 404 };
  if (link.usado) return { code: 'used' as const, status: 400 };
  if (new Date (link.expiraAt).getTime() <= Date.now()) return { code: 'expired' as const, status: 400 };
  return { code: 'ok' as const, status: 200 };
}

export async function verifyToken(tokenHex: string) {
  const tokenHash = sha256Hex(tokenHex);
  const link = await findByTokenHash(tokenHash);
  const state = classifyState(link);
  if (state.code !== 'ok') {
    throw new AppError(state.code, state.status, state.code);
  }
  // cargar header de plaza sin marcar uso
  const plaza = await Plaza.findById(link!.plazaId);
  if (!plaza) throw notFound('Plaza not found');

  const header: Header = {
    puesto: plaza.puesto,
    codigoPlaza: plaza.codigoPlaza,
    unidadAdministrativa: plaza.unidadAdministrativa,
    folio: plaza.folio,
    fechaAplicacion: plaza.fechaAplicacion,
    horaAplicacion: plaza.horaAplicacion,
    especialistaId: String(plaza.especialistaId)
  };
  return header;
}

export async function markTokenUsed(tokenHex: string) {
  const tokenHash = sha256Hex(tokenHex);

  const updated = await Link.findOneAndUpdate(
    { tokenHash, usado: false, expiraAt: { $gt: new Date() } },
    { $set: { usado: true, usadoAt: new Date() } },
    { new: true }
  );

  if (updated) {
    log.info('link.used', { linkId: updated._id.toString(), usedAt: updated.usadoAt?.toISOString() });
    return { ok: true, usedAt: updated.usadoAt?.toISOString() };
  }

  const link = await findByTokenHash(tokenHash);
  const state = classifyState(link);
  throw new AppError(state.code, state.status, state.code);
}


export async function prefillByToken(tokenHex: string) {
  const tokenHash = sha256Hex(tokenHex);
  const link = await findByTokenHash(tokenHash);
  const state = classifyState(link);
  if (state.code !== 'ok') {
    throw new AppError(state.code, state.status, state.code);
  }

  const plaza = await Plaza.findById(link!.plazaId);
  if (!plaza) throw notFound('Plaza not found');

  const esp = await Especialista.findById(plaza.especialistaId);
  const especialistaNombre = esp?.nombreCompleto || '';

  return {
    plazaId: String(plaza._id),
    header: {
      puesto: plaza.puesto,
      codigoPlaza: plaza.codigoPlaza,
      unidadAdministrativa: plaza.unidadAdministrativa,
      folio: plaza.folio,
      fechaAplicacion: plaza.fechaAplicacion,
      horaAplicacion: plaza.horaAplicacion,
      especialistaId: String(plaza.especialistaId),
      especialistaNombre
    }
  };
}
