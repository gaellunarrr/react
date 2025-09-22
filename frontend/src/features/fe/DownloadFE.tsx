import { useMemo, useState } from "react";

type Encabezado = {
  convocatoria: string;
  unidadAdministrativa: string;
  concurso: string;
  puesto: string;
  codigoPuesto: string;
  modalidad: string;
  duracionMin: number;      // 1..120
  nombreEspecialista?: string;
  puestoEspecialista?: string;
  fechaElaboracion: string; // yyyy-mm-dd
};
type Caso = {
  encabezado: Encabezado;
  temasGuia: string;
  planteamiento: string;
  equipoAdicional?: string;
};
type CPStorageV2 = Encabezado & { casos: Caso[] };

const STORAGE_KEY = "inegi_cp_form_v2";

function readCases(): CPStorageV2 | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as CPStorageV2;
    if (!Array.isArray(data.casos) || data.casos.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

export default function DownloadFE() {
  const [downloading, setDownloading] = useState(false);
  const data = useMemo(readCases, []);

  const validCases = useMemo(() => {
    if (!data) return [];
    return data.casos.filter((c) => {
      const h = c.encabezado || ({} as Encabezado);
      const headerOk =
        [h.convocatoria, h.unidadAdministrativa, h.concurso, h.puesto, h.codigoPuesto, h.modalidad, h.fechaElaboracion]
          .every((v) => !!v && String(v).trim().length > 0) &&
        Number.isFinite(h.duracionMin) &&
        h.duracionMin >= 1 &&
        h.duracionMin <= 120;
      const planOk = !!(c.planteamiento || "").trim();
      return headerOk && planOk;
    });
  }, [data]);

  const disabled = !data || validCases.length === 0 || downloading;

  const handleDownload = async () => {
    if (disabled) return;
    try {
      setDownloading(true);

      // FE: misma lógica por caso (encabezado + planteamiento)
      const payload = {
        casos: validCases.map((c) => ({
          encabezado: c.encabezado,
          planteamiento: c.planteamiento,
        })),
      };

      const res = await fetch("/api/fe/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const ct = res.headers.get("content-type") || "";
      if (!res.ok) {
        const errText = ct.includes("application/json") ? JSON.stringify(await res.json()) : await res.text();
        throw new Error(`HTTP ${res.status} ${res.statusText} — ${errText}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FE_${data?.concurso || "formulario"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("No se pudo generar el PDF de FE. Revisa consola para más detalles.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex justify-center items-center">
      <button
        onClick={handleDownload}
        disabled={disabled}
        className={`flex items-center gap-2 px-8 py-4 rounded-3xl shadow-lg transition-all text-lg border
          ${!disabled ? "bg-white hover:bg-cyan-100 text-cyan-800 border-cyan-300"
                      : "bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed"}`}
        title={!disabled ? "Descargar FE" : "Completa Estructura y Planteamiento en Casos"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6"
             fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"/>
        </svg>
        {downloading ? "Generando..." : "PDF FE"}
      </button>
    </div>
  );
}
