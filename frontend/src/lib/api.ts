// src/lib/api.ts

// ===== Tipos compartidos (exportados) =====
export type Convocatoria = { _id: string; codigo: string; activa: boolean };
export type Concurso = { _id: string; convocatoriaId: string; nombre: string; activo?: boolean };
export type Plaza = {
  _id: string;
  convocatoriaId: string;
  concursoId: string;
  puesto: string;
  codigoPlaza: string;
  unidadAdministrativa: string;
  folio?: string;
  fechaAplicacion?: string;
  horaAplicacion?: string;
  especialistaId: string;
};
export type Especialista = { _id: string; nombreCompleto: string; email?: string };

export type CreateLinkBody = {
  convocatoriaId: string;
  concursoId: string;
  plazaId: string;
  especialistaId: string;
  ttlHours?: number; // default 48
};

export type ExamHeader = {
  convocatoria?: { id?: string; codigo?: string } | string;
  concurso?: { id?: string; nombre?: string } | string;
  plaza?: {
    id?: string;
    codigoPlaza?: string;
    puesto?: string;
    unidadAdministrativa?: string;
    folio?: string;
    fechaAplicacion?: string;
    horaAplicacion?: string;
    [key: string]: unknown;
  } | null;
  especialista?: {
    id?: string;
    nombre?: string;
    nombreCompleto?: string;
    email?: string;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
};

export type GenResult = {
  token: string;
  url: string;
  expiresAt: string;
  header?: ExamHeader | null;
};

export type LinkVerify = {
  valid: boolean;
  reason?: "invalid" | "expired" | "used" | "revoked" | string;
  status?: string;
  expiresAt?: string;
  header?: ExamHeader | null;
};

export type PrefillPayload = {
  header: ExamHeader | null;
  fields?: Array<{
    name: string;
    label: string;
    type?: "text" | "number" | "select" | "date" | "textarea";
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
    defaultValue?: unknown;
  }>;
};

export type SubmitExamPayload = {
  header: ExamHeader | null;
  answers: Record<string, unknown>;
  nombreDeclarante?: string;
};

export type SubmitExamResponse = { examId: string; status: "submitted" | string };
export type Artifacts = { faPdfUrl?: string; fePdfUrl?: string; receiptPdfUrl?: string };

export type ExamSummary = {
  _id: string;
  linkToken?: string;
  convocatoriaId: string;
  concursoId: string;
  plazaId: string;
  especialistaId: string;
  nombreDeclarante?: string;
  createdAt?: string;
  header?: ExamHeader | null;
  artifacts?: Artifacts;
};

export type ExamDetail = ExamSummary & { answers: Record<string, unknown> };

// ===== Infra HTTP =====
const metaEnv =
  (typeof import.meta !== "undefined"
    ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    : undefined) ?? {};
const nodeEnv =
  (typeof process !== "undefined"
    ? (process as unknown as { env?: Record<string, string | undefined> }).env
    : undefined) ?? {};

const BASE = metaEnv.VITE_API_URL ?? nodeEnv.NEXT_PUBLIC_API_URL ?? "/api";

type ErrorPayload = { message?: string; code?: string };
type ErrorWithCode = Error & { code?: string };

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    // credentials: "include",
  });
  const payload = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) {
    const data = payload as ErrorPayload;
    const error: ErrorWithCode = new Error(data?.message || "Error de red");
    error.code = data?.code || "http_error";
    throw error;
  }
  return payload as T;
}

// ===== Cliente API (sin duplicados) =====
export const api = {
  // Health
  health: () => http<{ ok: true }>("/health"),

  // Links
  verifyLink: (token: string) =>
    http<LinkVerify>(`/links/${encodeURIComponent(token)}/verify`, { method: "POST" }),
  useLink: (token: string) =>
    http<{ used: boolean }>(`/links/${encodeURIComponent(token)}/use`, { method: "POST" }),
  createLink: (body: CreateLinkBody) =>
    http<GenResult>("/links", { method: "POST", body: JSON.stringify(body) }),

  // Exams
  prefillExam: (token: string) =>
    http<PrefillPayload>(`/exams/prefill/${encodeURIComponent(token)}`),
  submitExam: (token: string, body: SubmitExamPayload) =>
    http<SubmitExamResponse>(`/exams/${encodeURIComponent(token)}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listExams: (params: { convocatoriaId?: string; concursoId?: string; plazaId?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.convocatoriaId) qs.set("convocatoriaId", params.convocatoriaId);
    if (params.concursoId) qs.set("concursoId", params.concursoId);
    if (params.plazaId) qs.set("plazaId", params.plazaId);
    const query = qs.toString();
    return http<ExamSummary[]>(`/exams${query ? `?${query}` : ""}`);
  },
  getExam: (id: string) => http<ExamDetail>(`/exams/by-id/${encodeURIComponent(id)}`),
  getArtifacts: (id: string) =>
    http<Artifacts>(`/exams/by-id/${encodeURIComponent(id)}/artifacts`),

  // Consents
  postConsent: (
    token: string,
    body: { tipo: "uso_app" | "conclusion_examen"; nombreDeclarante: string; aceptado: boolean }
  ) =>
    http<unknown>(`/consents/${encodeURIComponent(token)}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Catalog
  listConvocatorias: () => http<Convocatoria[]>("/catalog/convocatorias"),
  listConcursos: () => http<Concurso[]>("/catalog/concursos"),
  listEspecialistas: () => http<Especialista[]>("/catalog/especialistas"),

  // Helpers para el flujo
  listConcursosByConvocatoria: (convocatoriaId: string) =>
    http<Concurso[]>(
      `/catalog/concursos?convocatoriaId=${encodeURIComponent(convocatoriaId)}`
    ),
  listPlazas: (convocatoriaId: string, concursoId: string) =>
    http<Plaza[]>(
      `/plazas?convocatoriaId=${encodeURIComponent(
        convocatoriaId
      )}&concursoId=${encodeURIComponent(concursoId)}`
    ),
};
