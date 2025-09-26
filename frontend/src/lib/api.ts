// src/lib/api.ts
import axios from "axios";

/** ------------------ Axios base ------------------ **/
const http = axios.create({
  baseURL: "/api",         // Vite proxy redirige a tu backend (4000)
  withCredentials: true,   // si tu API usa cookies/sesiones
});

/** ------------------ Tipos compartidos ------------------ **/
export type CatalogItem = {
  _id?: string;
  codigo?: string;       // p.ej. "004/2025" o "109011"
  nombre?: string;       // algunos catálogos usan "nombre" para concursos
  hash?: string;         // id/slug de 40 hex que estás viendo en red
  activa?: boolean;
  activo?: boolean;
};

export type Especialista = {
  _id: string;
  nombreCompleto: string;
  email?: string;
  curp?: string;
};

export type PlazaRow = {
  _id: string;
  codigoPlaza?: string;
  codigo?: string;
  plaza?: string;
  code?: string;
  clave?: string;
  puesto?: string;
  puestoNombre?: string;
  unidadAdministrativa?: string;
  unidad_adm?: string;
  radicacion?: string;
  especialistaId?: string;
  especialistaNombre?: string;
};

export type LinkCreatePayload = {
  convocatoriaId: string;   // puede ser _id/hash/codigo (el back lo resuelve)
  concursoId: string;       // puede ser _id/hash/codigo
  plazaId: string;          // manda CÓDIGO de plaza
  especialistaId?: string;
  ttlHours?: number;
  prefill: {
    convocatoria?: string;          // código humano (ej "004/2025")
    concurso?: string;              // código/etiqueta humana (ej "109011")
    plazaCodigo: string;
    puesto: string;
    unidadAdministrativa: string;
    jefeNombre: string;
    radicacion?: string;
  };
};

export type LinkCreateResponse = {
  url: string;
  token: string;
  expiraAt: string;         // OJO: es expiraAt (no expiresAt)
  prefillPreview?: any;
};

export type LinkVerify = {
  valid: boolean;
  reason?: string;          // "expired" | "used" | "invalid"
  header?: any;
};

export type PrefillFieldOption = { value: string; label: string };
export type PrefillField = {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "textarea";
  required?: boolean;
  defaultValue?: any;
  options?: PrefillFieldOption[];
};

export type PrefillPayload = {
  header?: any;
  fields?: PrefillField[];
};

export type SubmitExamResponse = {
  examId: string;
};

export type Artifacts = {
  responsesPdfUrl?: string;
  faPdfUrl?: string;
  fePdfUrl?: string;
  receiptPdfUrl?: string;
};

/** ------------------ API de alto nivel ------------------ **/
export const api = {
  // Catálogos
  async listConvocatorias() {
    const { data } = await http.get<CatalogItem[]>("/catalog/convocatorias");
    return data;
  },
  async listEspecialistas() {
    const { data } = await http.get<Especialista[]>("/catalog/especialistas");
    return data;
  },
  async listConcursosByConvocatoria(convocatoriaId: string) {
    const { data } = await http.get<CatalogItem[]>(
      "/catalog/concursos",
      { params: { convocatoriaId } }
    );
    return data;
  },

  // Plazas
  async listPlazas(convocatoriaId: string, concursoId: string) {
    const { data } = await http.get<PlazaRow[]>(
      "/plazas",
      { params: { convocatoriaId, concursoId } }
    );
    return data;
  },

  // Links
  async createLink(payload: LinkCreatePayload) {
    const { data } = await http.post<LinkCreateResponse>("/links", payload);
    return data;
  },
  async verifyLink(token: string) {
    // Si tienes endpoint /api/links/verify
    try {
      const { data } = await http.get<LinkVerify>("/links/verify", { params: { token } });
      return data;
    } catch {
      // Fallback: si no existe verify, considera válido y deja que prefill falle si caducó
      return { valid: true } as LinkVerify;
    }
  },

  // Examen
  async prefillExam(token: string) {
    // Debe existir un GET /api/exams/prefill?token=...
    const { data } = await http.get<PrefillPayload>("/exams/prefill", { params: { token } });
    return data;
  },
  async submitExam(token: string, body: { header: any; answers: Record<string, any> }) {
    // POST /api/exams/:token
    const { data } = await http.post<SubmitExamResponse>(`/exams/${encodeURIComponent(token)}`, body);
    return data;
  },
  async getArtifacts(examId: string) {
    // Ajusta si tu endpoint real es otro
    const { data } = await http.get<Artifacts>(`/exams/${encodeURIComponent(examId)}/artifacts`);
    return data;
  },

  // Consentimientos
  async postConsent(token: string, body: { tipo: string; nombreDeclarante: string; aceptado: boolean }) {
    // POST /api/consents/:token
    const { data } = await http.post(`/consents/${encodeURIComponent(token)}`, body);
    return data;
  },
};
