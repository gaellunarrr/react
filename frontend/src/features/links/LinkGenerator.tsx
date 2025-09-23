import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

type Convocatoria = { _id: string; codigo: string; activa: boolean };
type Concurso = { _id: string; convocatoriaId: string; nombre: string; activo?: boolean };

type Plaza = {
  _id: string; // id interno de la plaza (puede ser ObjectId o hash)
  convocatoriaId: string; // proviene del backend para referencia/visualización
  concursoId: string;     // proviene del backend para referencia/visualización
  // --- PUESTO DE LA PLAZA (vacante) ---
  puesto: string;
  // código de la plaza (lo usaremos para generar el link y que el backend la resuelva por código)
  codigoPlaza: string;
  // unidad administrativa de la plaza
  unidadAdministrativa: string;
  folio?: string;
  fechaAplicacion?: string;
  horaAplicacion?: string;
  // referencia al especialista/jefe asignado a la plaza
  especialistaId: string;
};

type Especialista = { _id: string; nombreCompleto: string; email?: string };

type GenResult = { token: string; url: string; expiresAt: string };

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
  const [results, setResults] = useState<Record<string, GenResult>>({}); // plazaId -> result

  useEffect(() => {
    (async () => {
      try {
        const [conv, esp] = await Promise.all([
          api.listConvocatorias(),
          api.listEspecialistas(),
        ]);
        setConvocatorias(conv);
        setEspecialistas(esp);
      } catch (e: any) {
        setError(e?.message || "Error cargando catálogos.");
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setConcursos([]);
      setConcId("");
      setPlazas([]);
      if (!convId) return;
      try {
        const data = await api.listConcursosByConvocatoria(convId);
        setConcursos(data);
      } catch (e: any) {
        setError(e?.message || "Error cargando concursos.");
      }
    })();
  }, [convId]);

  useEffect(() => {
    (async () => {
      setPlazas([]);
      if (!convId || !concId) return;
      try {
        const data = await api.listPlazas(convId, concId);
        setPlazas(data);
      } catch (e: any) {
        setError(e?.message || "Error cargando plazas.");
      }
    })();
  }, [convId, concId]);

  const especialistasById = useMemo(() => {
    const map: Record<string, Especialista> = {};
    for (const e of especialistas) map[e._id] = e;
    return map;
  }, [especialistas]);

  const handleGenerate = async (plaza: Plaza) => {
    setError(null);
    setBusy(true);
    setBusyRow(plaza._id);
    try {
      // Importante:
      // - Enviamos los _id reales seleccionados en los combos (convId/concId)
      // - Enviamos la plaza por su CODIGO (codigoPlaza) para que el backend la resuelva aunque el _id no sea ObjectId
      const body = {
        convocatoriaId: convId,                // _id real de la convocatoria (select)
        concursoId: concId,                    // _id real del concurso (select)
        plazaId: plaza.codigoPlaza,            // usar código de plaza para resolución robusta en el backend
        especialistaId: plaza.especialistaId,  // el backend podrá resolverlo; si no, mostrará 400 específico
        ttlHours: 48,
        prefill: {
            plazaCodigo: plaza.codigoPlaza,
            puesto: plaza.puesto,
            unidadAdministrativa: plaza.unidadAdministrativa,
            jefeNombre: especialistasById[plaza.especialistaId]?.nombreCompleto || "",
        }
      };
      const res = (await api.createLink(body)) as GenResult;
      setResults((prev) => ({ ...prev, [plaza._id]: res }));
    } catch (e: any) {
      // Intenta extraer mensaje del servidor si existe
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
      const ok = ~`window.confirm(Copia el link manualmente:\n${text})`;
      if (ok) void 0;
    }
  };

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
              <option key={c._id} value={c._id}>{c.codigo}</option>
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
              <option key={c._id} value={c._id}>{c.nombre}</option>
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
                const esp = especialistasById[p.especialistaId];
                const result = results[p._id];
                return (
                  <tr key={p._id} className="border-t">
                    <td className="px-3 py-2 font-mono">{p.codigoPlaza}</td>
                    {/* PUESTO DE LA PLAZA (vacante) */}
                    <td className="px-3 py-2">{p.puesto || "—"}</td>
                    <td className="px-3 py-2">{p.unidadAdministrativa || "—"}</td>
                    <td className="px-3 py-2">{esp?.nombreCompleto || p.especialistaId || "—"}</td>
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