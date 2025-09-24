import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type PrefillPayload, type LinkVerify } from "../lib/api";
import FormCasePractices, { type EstructuraPayload } from "../features/casos-practicos/FormCasePractices";

export default function FormPage() {
  const { token = "" } = useParams();
  const [verif, setVerif] = useState<LinkVerify | null>(null);
  const [prefill, setPrefill] = useState<PrefillPayload | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Para los casos prácticos
  const handleCasePracticesChange = (data: EstructuraPayload, isValid: boolean) => {
    // Aquí podrías manejar los datos si los necesitas para algo específico
    console.log("Datos del formulario de casos prácticos:", data, "Válido:", isValid);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
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
      } catch (e: any) {
        console.error("Error cargando formulario:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const header = useMemo(() => prefill?.header ?? verif?.header ?? null, [prefill, verif]);

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

  // Formulario
  return (
    <div className="mx-auto max-w-3xl bg-white rounded-2xl shadow p-6">
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

      <FormCasePractices onChange={handleCasePracticesChange} />
    </div>
  );
}
