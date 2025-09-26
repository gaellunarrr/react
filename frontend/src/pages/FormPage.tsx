import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type PrefillPayload, type LinkVerify } from "../lib/api";
import FormCasePractices, {
  type EstructuraPayload,
} from "../features/casos-practicos/FormCasePractices";

type PrefillFlat = {
  convocatoria: string;
  unidadAdministrativa: string;
  concurso: string;
  puesto: string;
  codigoPuesto: string;
  nombreEspecialista: string;
};

export default function FormPage() {
  const { token = "" } = useParams();
  const [verif, setVerif] = useState<LinkVerify | null>(null);
  const [prefill, setPrefill] = useState<PrefillPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Log de cambios del formulario (editable)
  const handleCasePracticesChange = (data: EstructuraPayload, isValid: boolean) => {
    console.log("Datos del formulario de casos prácticos:", data, "Válido:", isValid);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // 1) Verificar token
        const v = await api.verifyLink(token);
        setVerif(v);
        if (!v.valid) {
          setErr(v.reason || "Link inválido o expirado");
          return;
        }
        // 2) Prefill (campos planos desde el back)
        const p = await api.prefillExam(token);
        setPrefill(p);
      } catch (e: any) {
        console.error("Error cargando formulario:", e);
        setErr("No se pudo cargar el formulario.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Preferimos los 6 campos planos de /api/exams/prefill
  // y caemos al header anidado de verify si hiciera falta.
  const readonlyData: PrefillFlat | null = useMemo(() => {
    const flat = (prefill as any) as PrefillFlat | null;

    // Si ya tenemos la respuesta plana del back, úsala tal cual.
    if (flat && typeof flat === "object" && flat.convocatoria != null) {
      return {
        convocatoria: String(flat.convocatoria ?? ""),
        unidadAdministrativa: String(flat.unidadAdministrativa ?? ""),
        concurso: String(flat.concurso ?? ""),
        puesto: String(flat.puesto ?? ""),
        codigoPuesto: String(flat.codigoPuesto ?? ""),
        nombreEspecialista: String(flat.nombreEspecialista ?? ""),
      };
    }

    // Fallback al header que viene en verify (por si acaso)
    const h = (verif as any)?.header ?? null;
    if (!h) return null;

    const conv = (h?.convocatoria?.codigo ?? h?.convocatoria ?? "") as string;
    const conc = (h?.concurso?.nombre ?? h?.concurso ?? "") as string;
    const ua = (h?.plaza?.unidadAdministrativa ?? "") as string;
    const puesto = (h?.plaza?.puesto ?? "") as string;
    const cod = (h?.plaza?.codigoPlaza ?? h?.plaza?.id ?? "") as string;
    const esp = (h?.especialista?.nombre ?? h?.especialista?.nombreCompleto ?? "") as string;

    return {
      convocatoria: String(conv ?? ""),
      unidadAdministrativa: String(ua ?? ""),
      concurso: String(conc ?? ""),
      puesto: String(puesto ?? ""),
      codigoPuesto: String(cod ?? ""),
      nombreEspecialista: String(esp ?? ""),
    };
  }, [prefill, verif]);

  if (loading) {
    return <div className="mx-auto max-w-3xl bg-white rounded-2xl shadow p-6">Cargando…</div>;
  }

  // Token inválido / expirado / error general
  if ((verif && !verif.valid) || err) {
    return (
      <div className="mx-auto max-w-3xl bg-white rounded-2xl shadow p-6">
        <h1 className="text-xl font-semibold mb-2">No se puede abrir el examen</h1>
        <p className="text-gray-600">
          Motivo: <span className="font-mono">{err ?? verif?.reason ?? "desconocido"}</span>
        </p>
      </div>
    );
  }

  // Formulario
  return (
    <div className="mx-auto max-w-3xl bg-white rounded-2xl shadow p-6">
      

      <FormCasePractices
        onChange={handleCasePracticesChange}
        initialData={{
          // Estos 6 vienen prellenados y el backend los tomará como inmutables al submit
          convocatoria: readonlyData?.convocatoria ?? "",
          concurso: readonlyData?.concurso ?? "",
          unidadAdministrativa: readonlyData?.unidadAdministrativa ?? "",
          puesto: readonlyData?.puesto ?? "",
          codigoPuesto: readonlyData?.codigoPuesto ?? "",
          nombreEspecialista: readonlyData?.nombreEspecialista ?? "",

          // Valores por defecto del examen (editables por el especialista)
          modalidad: "Escrita",
          duracionMin: 60,
          puestoEspecialista: "",
          fechaElaboracion: new Date().toISOString().split("T")[0],
        }}
      />
    </div>
  );
}
