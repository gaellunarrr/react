import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  api,
  type PrefillPayload,
  type LinkVerify,
  type SubmitExamResponse,
  type Artifacts,
  type ExamHeader,
} from "../lib/api";

type FormState = Record<string, unknown>;

export default function FormPage() {
  const { token = "" } = useParams();
  const [verif, setVerif] = useState<LinkVerify | null>(null);
  const [prefill, setPrefill] = useState<PrefillPayload | null>(null);
  const [form, setForm] = useState<FormState>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<SubmitExamResponse | null>(null);
  const [artifacts, setArtifacts] = useState<Artifacts | null>(null);

  // Para la copia con firma
  const [nombreDeclarante, setNombreDeclarante] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // 1) Verificar token
        const v = await api.verifyLink(token);
        setVerif(v);
        if (!v.valid) {
          setLoading(false);
          return;
        }
        // 2) Prefill
        const p = await api.prefillExam(token);
        setPrefill(p);

        // Inicializar form con defaults si existen
        const defaults: Record<string, unknown> = {};
        p?.fields?.forEach((f) => {
          if (typeof f.defaultValue !== "undefined") defaults[f.name] = f.defaultValue;
          else if (f.type === "select" && f.options?.length) defaults[f.name] = f.options[0].value;
          else defaults[f.name] = "";
        });
        setForm(defaults);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "No se pudo cargar el formulario";
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const header = useMemo<ExamHeader | null>(() => prefill?.header ?? verif?.header ?? null, [prefill, verif]);

  const handleChange = (name: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      // 3) Enviar respuestas
      const payload = {
        header,
        answers: form,
        nombreDeclarante: nombreDeclarante?.trim() || undefined,
      };
      const resp = await api.submitExam(token, payload);
      setResult(resp);

      // 4) Si el back ya genera PDFs, los pedimos
      try {
        const arts = await api.getArtifacts(resp.examId);
        setArtifacts(arts);
      } catch {
        // Si aún no existen, mostramos el recibo imprimible como respaldo
        setArtifacts(null);
      }

      // 5) Consentimiento de conclusión (requisito del proyecto)
      if (nombreDeclarante?.trim()) {
        try {
          await api.postConsent(token, {
            tipo: "conclusion_examen",
            nombreDeclarante,
            aceptado: true,
          });
        } catch {
          // no bloquea el flujo
        }
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "No se pudo enviar el formulario";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-3xl bg-white rounded-2xl shadow p-6">Cargando…</div>;
  }

  // Token inválido / expirado / etc.
  if (verif && !verif.valid) {
    return (
      <div className="mx-auto max-w-3xl bg-white rounded-2xl shadow p-6">
        <h1 className="text-xl font-semibold mb-2">Link no disponible</h1>
        <p className="text-gray-600">
          Motivo: <span className="font-mono">{verif.reason || "desconocido"}</span>
        </p>
      </div>
    );
  }

  // Post-envío: mostrar PDFs o recibo
  if (result) {
    return (
      <div className="mx-auto max-w-3xl bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Respuestas enviadas</h1>

        {artifacts?.faPdfUrl || artifacts?.fePdfUrl || artifacts?.receiptPdfUrl ? (
          <div className="space-y-3">
            {artifacts.faPdfUrl && (
              <a className="underline text-blue-700 block" href={artifacts.faPdfUrl} target="_blank" rel="noreferrer">
                Descargar FA (PDF)
              </a>
            )}
            {artifacts.fePdfUrl && (
              <a className="underline text-blue-700 block" href={artifacts.fePdfUrl} target="_blank" rel="noreferrer">
                Descargar FE (PDF)
              </a>
            )}
            {artifacts.receiptPdfUrl && (
              <a className="underline text-blue-700 block" href={artifacts.receiptPdfUrl} target="_blank" rel="noreferrer">
                Descargar Copia con firma (PDF)
              </a>
            )}
          </div>
        ) : (
          <ReceiptFallback
            header={header}
            answers={form}
            nombreDeclarante={nombreDeclarante}
          />
        )}
      </div>
    );
  }

  // Formulario
  return (
    <div className="mx-auto max-w-3xl bg-white rounded-2xl shadow p-6">
      <h1 className="text-2xl font-bold mb-4">Formulario del Jefe de Plaza</h1>

      {header && (
        <div className="bg-gray-50 border rounded-xl p-4 mb-6 text-sm">
          <p><strong>Convocatoria:</strong> {header?.convocatoria?.codigo || header?.convocatoria || "-"}</p>
          <p><strong>Concurso:</strong> {header?.concurso?.nombre || header?.concurso || "-"}</p>
          {header?.plaza && (
            <>
              <p><strong>Plaza:</strong> {header.plaza.codigoPlaza || header.plaza.id}</p>
              <p><strong>Puesto:</strong> {header.plaza.puesto || "-"}</p>
              <p><strong>Unidad:</strong> {header.plaza.unidadAdministrativa || "-"}</p>
            </>
          )}
        </div>
      )}

      <FormFields
        fields={prefill?.fields}
        form={form}
        onChange={handleChange}
      />

      <div className="mt-6">
        <label className="block text-sm text-gray-700 mb-1">Nombre del responsable para acuse (firma)</label>
        <input
          className="w-full border rounded-xl px-3 py-2"
          value={nombreDeclarante}
          onChange={(e) => setNombreDeclarante(e.target.value)}
          placeholder="Nombre y apellidos"
        />
        <p className="text-xs text-gray-500 mt-1">
          Al concluir, se registrará tu aceptación del aviso de privacidad de conclusión del examen.
        </p>
      </div>

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

      <button
        className="mt-6 px-4 py-2 rounded-xl bg-cyan-900 text-white shadow disabled:opacity-50"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? "Enviando…" : "Enviar respuestas"}
      </button>
    </div>
  );
}

function FormFields({
  fields,
  form,
  onChange,
}: {
  fields?: PrefillPayload["fields"];
  form: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
}) {
  if (!fields?.length) {
    // Respaldo: si aún no definimos campos en el prefill
    return (
      <div className="mb-6">
        <label className="block text-sm text-gray-700 mb-1">Observaciones</label>
        <textarea
          className="w-full border rounded-xl px-3 py-2 min-h-[120px]"
          value={form["observaciones"] ?? ""}
          onChange={(e) => onChange("observaciones", e.target.value)}
          placeholder="Escribe aquí…"
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {fields.map((f) => {
        const rawValue = form[f.name];
        const stringValue =
          typeof rawValue === "string"
            ? rawValue
            : typeof rawValue === "number"
              ? String(rawValue)
              : "";
        switch (f.type) {
          case "number":
            return (
              <div key={f.name}>
                <label className="block text-sm text-gray-700 mb-1">{f.label}{f.required && " *"}</label>
                <input
                  type="number"
                  className="w-full border rounded-xl px-3 py-2"
                  value={stringValue}
                  onChange={(e) => onChange(f.name, Number(e.target.value))}
                  required={f.required}
                />
              </div>
            );
          case "date":
            return (
              <div key={f.name}>
                <label className="block text-sm text-gray-700 mb-1">{f.label}{f.required && " *"}</label>
                <input
                  type="date"
                  className="w-full border rounded-xl px-3 py-2"
                  value={stringValue}
                  onChange={(e) => onChange(f.name, e.target.value)}
                  required={f.required}
                />
              </div>
            );
          case "select":
            return (
              <div key={f.name}>
                <label className="block text-sm text-gray-700 mb-1">{f.label}{f.required && " *"}</label>
                <select
                  className="w-full border rounded-xl px-3 py-2"
                  value={stringValue}
                  onChange={(e) => onChange(f.name, e.target.value)}
                  required={f.required}
                >
                  {f.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            );
          case "textarea":
            return (
              <div key={f.name}>
                <label className="block text-sm text-gray-700 mb-1">{f.label}{f.required && " *"}</label>
                <textarea
                  className="w-full border rounded-xl px-3 py-2 min-h-[120px]"
                  value={stringValue}
                  onChange={(e) => onChange(f.name, e.target.value)}
                  required={f.required}
                />
              </div>
            );
          case "text":
          default:
            return (
              <div key={f.name}>
                <label className="block text-sm text-gray-700 mb-1">{f.label}{f.required && " *"}</label>
                <input
                  className="w-full border rounded-xl px-3 py-2"
                  value={stringValue}
                  onChange={(e) => onChange(f.name, e.target.value)}
                  required={f.required}
                />
              </div>
            );
        }
      })}
    </div>
  );
}

function ReceiptFallback({
  header,
  answers,
  nombreDeclarante,
}: {
  header: ExamHeader | null;
  answers: Record<string, unknown>;
  nombreDeclarante: string;
}) {
  return (
    <div className="border rounded-xl p-5 bg-gray-50 mt-4">
      <h2 className="text-xl font-semibold mb-3">Copia de respuestas (acuse)</h2>

      <div className="text-sm space-y-1 mb-4">
        <p><strong>Convocatoria:</strong> {header?.convocatoria?.codigo || header?.convocatoria || "-"}</p>
        <p><strong>Concurso:</strong> {header?.concurso?.nombre || header?.concurso || "-"}</p>
        {header?.plaza && (
          <>
            <p><strong>Plaza:</strong> {header.plaza.codigoPlaza || header.plaza.id}</p>
            <p><strong>Puesto:</strong> {header.plaza.puesto || "-"}</p>
            <p><strong>Unidad:</strong> {header.plaza.unidadAdministrativa || "-"}</p>
          </>
        )}
      </div>

      <div className="text-sm">
        <h3 className="font-medium mb-2">Respuestas</h3>
        <div className="border rounded-lg p-3 bg-white">
          <ul className="list-disc pl-5 space-y-1">
            {Object.entries(answers || {}).map(([k, v]) => (
              <li key={k}><span className="font-medium">{k}:</span> {String(v ?? "")}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <p className="font-medium mb-3">Espacio de firma</p>
        <div className="h-24 border-2 border-dashed rounded-xl bg-white mb-2"></div>
        <p className="text-sm text-gray-600">
          {nombreDeclarante || "_____________________________"}
          <br />
          Nombre y firma del responsable
        </p>
      </div>

      <button
        className="mt-6 px-4 py-2 rounded-xl bg-cyan-900 text-white shadow"
        onClick={() => window.print()}
      >
        Imprimir / Guardar como PDF
      </button>
    </div>
  );
}
