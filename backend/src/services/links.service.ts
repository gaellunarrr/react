import Convocatoria from '../models/Convocatoria';
import Concurso from '../models/Concurso';
import Especialista from '../models/Especialista';
import Link from '../models/Link';
import Plaza from '../models/Plaza';
import { config } from '../shared/config';
import { AppError, notFound } from '../shared/errors';
import { log } from '../shared/logger';
import { generateTokenHex } from '../shared/token';

type Header = {
  convocatoria: any;
  concurso: any;
  plaza: {
    id: string;
    codigoPlaza: string;
    puesto: string;
    unidadAdministrativa: string;
    folio?: string;
    fechaAplicacion?: string;
    horaAplicacion?: string;
  };
  especialista: {
    id: string;
    nombre: string;
    email?: string;
  };
};

type LinkState = 'ok' | 'invalid' | 'expired' | 'used' | 'revoked';

const FRONT_BASE = config.publicBaseUrl.replace(/\/$/, '');

function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const asDate = new Date(value);
  return Number.isNaN(asDate.getTime()) ? null : asDate;
}

function classifyState(link: any): { code: LinkState; status: number } {
  if (!link) return { code: 'invalid', status: 404 };

  const expiresAt = toDate(link.expiresAt);
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    return { code: 'expired', status: 400 };
  }

  const status = String(link.status || 'ISSUED').toUpperCase();
  if (status === 'ISSUED') return { code: 'ok', status: 200 };
  if (status === 'USED') return { code: 'used', status: 400 };
  if (status === 'REVOKED') return { code: 'revoked', status: 400 };
  if (status === 'EXPIRED') return { code: 'expired', status: 400 };
  return { code: 'invalid', status: 400 };
}

function buildHeader(
  plaza: any,
  conv: any,
  conc: any,
  esp: any
): Header {
  return {
    convocatoria: {
      id: String(conv?._id ?? plaza.convocatoriaId ?? ''),
      codigo: conv?.codigo ?? conv?.nombre ?? '',
    },
    concurso: {
      id: String(conc?._id ?? plaza.concursoId ?? ''),
      nombre: conc?.nombre ?? conc?.codigo ?? '',
    },
    plaza: {
      id: String(plaza._id),
      codigoPlaza: plaza.codigoPlaza ?? '',
      puesto: plaza.puesto ?? '',
      unidadAdministrativa: plaza.unidadAdministrativa ?? '',
      folio: plaza.folio ?? '',
      fechaAplicacion: plaza.fechaAplicacion ?? '',
      horaAplicacion: plaza.horaAplicacion ?? '',
    },
    especialista: {
      id: String(esp?._id ?? plaza.especialistaId ?? ''),
      nombre: esp?.nombreCompleto ?? '',
      email: esp?.email ?? '',
    },
  };
}

export async function createLink(plazaId: string, ttlHours?: number) {
  const plaza = await Plaza.findById(plazaId).lean();
  if (!plaza) throw notFound('Plaza not found');

  const [conv, conc, esp] = await Promise.all([
    Convocatoria.findById(plaza.convocatoriaId).lean(),
    Concurso.findById(plaza.concursoId).lean(),
    Especialista.findById(plaza.especialistaId).lean(),
  ]);

  const ttl = Math.min(Math.max(Number(ttlHours ?? config.linkTtlHours), 1), 720);
  const token = generateTokenHex();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + ttl * 60 * 60 * 1000);

  const header = buildHeader(plaza, conv, conc, esp);

  const link = await Link.create({
    token,
    status: 'ISSUED',
    createdAt,
    expiresAt,
    convocatoriaId: plaza.convocatoriaId,
    concursoId: plaza.concursoId,
    plazaId: plaza._id,
    especialistaId: plaza.especialistaId,
    header,
  });

  const url = `${FRONT_BASE}/form/${token}`;

  log.info('link.create', {
    linkId: String(link._id),
    plazaId: String(plaza._id),
    expiresAt: expiresAt.toISOString(),
  });

  return {
    linkId: String(link._id),
    token,
    url,
    expiresAt: expiresAt.toISOString(),
    header,
  };
}

export async function findByToken(token: string) {
  return Link.findOne({ token });
}

export async function verifyToken(token: string) {
  const link = await findByToken(token);
  const state = classifyState(link);
  if (state.code !== 'ok') {
    throw new AppError(state.code, state.status, state.code);
  }
  return {
    linkId: String(link!._id),
    plazaId: String(link!.plazaId),
    header: link!.header ?? null,
  };
}

export async function markTokenUsed(token: string) {
  const now = new Date();
  const updated = await Link.findOneAndUpdate(
    { token, status: 'ISSUED', expiresAt: { $gt: now } },
    { $set: { status: 'USED', usedAt: now }, $inc: { submissionsCount: 1 } },
    { new: true }
  );

  if (updated) {
    log.info('link.used', {
      linkId: String(updated._id),
      usedAt: updated.usedAt ? updated.usedAt.toISOString() : undefined,
    });
    return updated;
  }

  const link = await findByToken(token);
  const state = classifyState(link);
  throw new AppError(state.code, state.status, state.code);
}

export async function prefillByToken(token: string) {
  const link = await findByToken(token);
  const state = classifyState(link);
  if (state.code !== 'ok') {
    throw new AppError(state.code, state.status, state.code);
  }

  return {
    linkId: String(link!._id),
    plazaId: String(link!.plazaId),
    header: link!.header ?? null,
  };
}
