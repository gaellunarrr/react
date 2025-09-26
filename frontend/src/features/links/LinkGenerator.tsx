// src/features/links/LinkGenerator.tsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

/* ---------------------------- Tipos (flexibles) ---------------------------- */

type Convocatoria = {
  _id: string;
  codigo?: string;
  nombre?: string;
  activa?: boolean;
  hash?: string;
};

type Concurso = {
  _id: string;
  convocatoriaId?: string;
  codigo?: string;
  nombre?: string;
  activo?: boolean;
  hash?: string;
};

type Plaza = {
  _id: string;
  convocatoriaId?: string;
  concursoId?: string;

  // alias posibles de código de plaza
  codigoPlaza?: string;
  codigo?: string;
  plaza?: string;
  code?: string;
  clave?: string;

  // puesto / unidad (alias)
  puesto?: string;
  puestoNombre?: string;
  unidadAdministrativa?: string;
  unidad_adm?: string;

  radicacion?: string;

  // especialista (alias según la fuente)
  especialistaId?: string;     // camelCase (si viene normalizado)
  especialista_id?: string;    // snake_case (como en tu BD)
  especialistaNombre?: string; // opcional
};

type Especialista = {
  _id: string;
  nombreCompleto?: string;
  nombre?: string;
  email?: string;
};

type GenResult = { token: string; url: string; expiraAt: string };

/* ------------------------------ Utilidades UI ----------------------------- */

function getPlazaCodigo(p: Plaza) {
  return p.codigoPlaza || p.codigo || p.plaza || p.code || p.clave || "";
}

function getPuesto(p: Plaza) {
  return p.puesto || p.puestoNombre || "";
}

function getUnidad(p: Plaza) {
  return p.unidadAdministrativa || (p as any).unidad_adm || "";
}

function getEspecialistaId(p: Plaza) {
  return p.especialistaId || (p as any).especialista_id || "";
}

function getEspecialistaNombre(p: Plaza, map: Record<string, Especialista>) {
  const id = getEspecialistaId(p);
  return (
    p.especialistaNombre ||
    (id ? map[id]?.nombreCompleto || (map[id] as any)?.nombre : "") ||
    ""
  );
}

function labelConcurso(c: Concurso) {
  return c.nombre || c.codigo || c.hash || "SIN-NOMBRE";
}

function labelConvocatoria(c: Convocatoria) {
  return c.codigo || c.nombre || c.hash || "SIN-CODIGO";
}

/* --------------------------------- Componente -------------------------------- */

export default function LinkGenerator() {
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [concursos, setConcursos] = useState<Concurso[]>([]);
  const [plazas, setPlazas] = useState<Plaza[]>([]);
  const [especialistas, setEspecialistas] = useState<Especialista[]>([]);

  const [convId, setConvId] = useState("");
  const [concId, setConcId] = useState("");

  const [busy, setBusy] = useState(false);
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, GenResult>>({}); // plaza._id -> result

  /* ----------------------------- Carga catálogos ----------------------------- */

  useEffect(() => {
    (async () => {
      try {
        const [conv, esp] = await Promise.all([
          api.listConvocatorias(),
          api.listEspecialistas(),
        ]);
        setConvocatorias(conv as any);
        setEspecialistas(esp as any);
      } catch (e: any) {
        setError(e?.message || "Error cargando catálogos.");
      }
    })();
  }, []);

  /* ------------------------------ Cambio de conv ----------------------------- */

  useEffect(() => {
    (async () => {
      setConcursos([]);
      setConcId("");
      setPlazas([]);
      if (!convId) return;
      try {
        const data = await api.listConcursosByConvocatoria(convId);
        setConcursos(data as any);
      } catch (e: any) {
        setError(e?.message || "Error cargando concursos.");
      }
    })();
  }, [convId]);

  /* ------------------------------- Cambio de conc ---------------------------- */

  useEffect(() => {
    (async () => {
      setPlazas([]);
      if (!convId || !concId) return;
      try {
        const data = await api.listPlazas(convId, concId);
        setPlazas(data as any);
      } catch (e: any) {
        setError(e?.message || "Error cargando plazas.");
      }
    })();
  }, [convId, concId]);

  /* ------------------------- Índice de especialistas ------------------------- */

  const especialistasById = useMemo(() => {
    const map: Record<string, Especialista> = {};
    for (const e of especialistas) {
      if (e?._id) map[e._id] = e;
    }
    return map;
  }, [especialistas]);

  /* -------------------------------- Generar link ----------------------------- */

  const handleGenerate = async (plaza: Plaza) => {
    setError(null);
    setBusy(true);
    setBusyRow(plaza._id);

    try {
      // Códigos humanos de los selects
      const conv = convocatorias.find((c) => c._id === convId);
      const conc = concursos.find((c) => c._id === concId);

      const convCode = conv?.codigo || conv?.nombre || "";
      const concCode = conc?.codigo || conc?.nombre || "";

      const plazaCodigo = getPlazaCodigo(plaza);
      const puesto = getPuesto(plaza);
      const unidadAdministrativa = getUnidad(plaza);

      // Tomar especialista real desde la plaza + catálogo
      const jefeNombre = getEspecialistaNombre(plaza, especialistasById);

      if (!convId || !concId || !plazaCodigo) {
        setError("Faltan datos mínimos (convocatoria, concurso o código de plaza).");
        return;
      }

      const body: any = {
        convocatoriaId: convId, // _id/hash del select (tal como viene del catálogo)
        concursoId: concId,     // _id/hash del select
        plazaId: plazaCodigo,   // código robusto de la plaza
        ttlHours: 48,
        prefill: {
          convocatoria: convCode,
          concurso: concCode,
          plazaCodigo,
          puesto,
          unidadAdministrativa,
          jefeNombre,
          radicacion: (plaza as any).radicacion || "",
        },
      };

      // No enviamos especialistaId, el backend creará el especialista con el jefeNombre
      // que está incluido en el prefill

      const res = await api.createLink(body);
      setResults((prev) => ({ ...prev, [plaza._id]: res }));
    } catch (e: any) {
      const serverMsg =
        e?.response?.data?.message ||
        e?.data?.message ||
        e?.message;
      setError(serverMsg || "No se pudo generar el link.");
    } finally {
      setBusy(false);
      setBusyRow(null);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("¡Copiado!");
    } catch {
      const ok = window.confirm(`Copia el link manualmente:\n${text}`);
      if (ok) void 0;
    }
  };

  /* ------------------------------------ UI ----------------------------------- */

  return (
    <section className="w-full max-w-5xl bg-white rounded-3xl shadow-lg p-6 my-10 text-left">
      <h2 className="text-2xl font-bold mb-1">Generación de links por Jefe de Plaza</h2>
      <p className="text-sm text-gray-600 mb-6">
        Selecciona la <strong>convocatoria</strong> y el <strong>concurso</strong>. Luego, genera un link para cada plaza.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Convocatoria</label>
          <select
            className="w-full border rounded-xl px-3 py-2"
            value={convId}
            onChange={(e) => setConvId(e.target.value)}
          >
            <option value="">— Seleccionar —</option>
            {convocatorias.map((c) => (
              <option key={c._id} value={c._id}>
                {labelConvocatoria(c)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Concurso</label>
          <select
            className="w-full border rounded-xl px-3 py-2"
            value={concId}
            onChange={(e) => setConcId(e.target.value)}
            disabled={!convId}
          >
            <option value="">— Seleccionar —</option>
            {concursos.map((c) => (
              <option key={c._id} value={c._id}>
                {labelConcurso(c)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="px-4 py-2 rounded-xl bg-cyan-900 text-white shadow disabled:opacity-50"
            disabled
            title="Las plazas se listan automáticamente al elegir Convocatoria y Concurso"
          >
            Listar plazas
          </button>
          {error && <span className="text-red-600 text-sm">{error}</span>}
        </div>
      </div>

      {convId && concId && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border rounded-xl overflow-hidden">
            <thead className="bg-gray-100 text-gray-700 text-sm">
              <tr>
                <th className="px-3 py-2">Plaza</th>
                <th className="px-3 py-2">Puesto</th>
                <th className="px-3 py-2">Unidad</th>
                <th className="px-3 py-2">Jefe de plaza</th>
                <th className="px-3 py-2">Acción</th>
                <th className="px-3 py-2">Link</th>
              </tr>
            </thead>
            <tbody>
              {plazas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                    No hay plazas para esta combinación.
                  </td>
                </tr>
              )}

              {plazas.map((p) => {
                const codigo = getPlazaCodigo(p);
                const puesto = getPuesto(p);
                const unidad = getUnidad(p);
                const espName = getEspecialistaNombre(p, especialistasById) || "—";

                const result = results[p._id];

                return (
                  <tr key={p._id} className="border-t">
                    <td className="px-3 py-2 font-mono">{codigo || "—"}</td>
                    <td className="px-3 py-2">{puesto || "—"}</td>
                    <td className="px-3 py-2">{unidad || "—"}</td>
                    <td className="px-3 py-2">{espName}</td>
                    <td className="px-3 py-2">
                      <button
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-50"
                        onClick={() => handleGenerate(p)}
                        disabled={busy || busyRow === p._id}
                      >
                        {busyRow === p._id ? "Generando..." : "Generar link (48h)"}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      {result ? (
                        <div className="flex items-center gap-2">
                          <a
                            className="underline text-blue-700 break-all"
                            href={result.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {result.url}
                          </a>
                          <button
                            className="text-xs px-2 py-1 border rounded"
                            onClick={() => copy(result.url)}
                          >
                            Copiar
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}