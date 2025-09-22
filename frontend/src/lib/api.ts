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

export type GenResult = {
  token: string;
  url: string;
  expiresAt: string;
  header?: unknown;
};

export type LinkVerify = {
  valid: boolean;
  reason?: "invalid" | "expired" | "used" | "revoked" | string;
  status?: string;
  expiresAt?: string;
  header?: any;
};

export type PrefillPayload = {
  header: any;
  fields?: Array<{
    name: string;
    label: string;
    type?: "text" | "number" | "select" | "date" | "textarea";
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
    defaultValue?: any;
  }>;
};

export type SubmitExamResponse = { examId: string; status: "submitted" | string };
export type Artifacts = { faPdfUrl?: string; fePdfUrl?: string; receiptPdfUrl?: string };

// ===== Infra HTTP =====
const BASE =
  (import.meta as any)?.env?.VITE_API_URL ??
  (typeof process !== "undefined" ? (process as any).env?.NEXT_PUBLIC_API_URL : undefined) ??
  "/api";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    // credentials: "include",
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error((payload as any)?.message || "Error de red");
    (e as any).code = (payload as any)?.code || "http_error";
    throw e;
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
  submitExam: (token: string, body: { header: any; answers: Record<string, any> }) =>
    http<SubmitExamResponse>(`/exams/${encodeURIComponent(token)}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getExam: (id: string) => http<unknown>(`/exams/${encodeURIComponent(id)}`),
  getArtifacts: (id: string) =>
    http<Artifacts>(`/exams/${encodeURIComponent(id)}/artifacts`),

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
