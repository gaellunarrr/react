import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type ExamSummary, type ExamDetail, type ExamHeader } from "../../lib/api";

type Convocatoria = { _id: string; codigo: string; activa: boolean };
type Concurso = { _id: string; convocatoriaId: string; nombre: string; activo?: boolean };
type Plaza = {
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
  const [history, setHistory] = useState<ExamSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<ExamDetail | null>(null);
  const [selectedExamError, setSelectedExamError] = useState<string | null>(null);
  const [selectedExamLoadingId, setSelectedExamLoadingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [conv, esp] = await Promise.all([
          api.listConvocatorias(),
          api.listEspecialistas(),
        ]);
        setConvocatorias(conv);
        setEspecialistas(esp);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Error cargando catálogos.";
        setError(message);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setConcursos([]);
      setConcId("");
      setPlazas([]);
      setResults({});
      setHistory([]);
      setHistoryError(null);
      setSelectedExam(null);
      setSelectedExamError(null);
      if (!convId) return;
      try {
        const data = await api.listConcursosByConvocatoria(convId);
        setConcursos(data);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Error cargando concursos.";
        setError(message);
      }
    })();
  }, [convId]);

  useEffect(() => {
    (async () => {
      setPlazas([]);
      setResults({});
      setHistory([]);
      setHistoryError(null);
      setSelectedExam(null);
      setSelectedExamError(null);
      if (!convId || !concId) return;
      try {
        const data = await api.listPlazas(convId, concId);
        setPlazas(data);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Error cargando plazas.";
        setError(message);
      }
    })();
  }, [convId, concId]);

  const especialistasById = useMemo(() => {
    const map: Record<string, Especialista> = {};
    for (const e of especialistas) map[e._id] = e;
    return map;
  }, [especialistas]);

  const fetchHistory = useCallback(async () => {
    if (!convId || !concId) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await api.listExams({ convocatoriaId: convId, concursoId: concId });
      setHistory(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "No se pudo cargar el historial.";
      setHistoryError(message);
    } finally {
      setHistoryLoading(false);
    }
  }, [concId, convId]);

  useEffect(() => {
    if (!convId || !concId) return;
    fetchHistory();
  }, [concId, convId, fetchHistory]);

  const handleGenerate = async (plaza: Plaza) => {
    setError(null);
    setBusy(true);
    setBusyRow(plaza._id);
    try {
      const body = {
        convocatoriaId: plaza.convocatoriaId,
        concursoId: plaza.concursoId,
        plazaId: plaza._id,
        especialistaId: plaza.especialistaId,
        ttlHours: 48,
      };
      const res = (await api.createLink(body)) as GenResult;
      setResults((prev) => ({ ...prev, [plaza._id]: res }));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "No se pudo generar el link.";
      setError(message);
    } finally {
      setBusy(false);
      setBusyRow(null);
    }
  };

  const handleViewExam = useCallback(async (examId: string) => {
    setSelectedExamError(null);
    setSelectedExam(null);
    setSelectedExamLoadingId(examId);
    try {
      const detail = await api.getExam(examId);
      setSelectedExam(detail);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "No se pudo cargar el formulario.";
      setSelectedExamError(message);
    } finally {
      setSelectedExamLoadingId(null);
    }
  }, []);

  const clearSelectedExam = useCallback(() => {
    setSelectedExam(null);
    setSelectedExamError(null);
    setSelectedExamLoadingId(null);
  }, []);

  const formatDateTime = (iso?: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("es-MX", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  const renderDownloadLink = (url: string, label: string) => (
    <a
      key={label}
      className="px-3 py-1 rounded-lg border border-cyan-200 text-sm text-cyan-700 hover:bg-cyan-50"
      href={url}
      target="_blank"
      rel="noreferrer"
    >
      {label}
    </a>
  );

  const getConvocatoriaCode = (header: ExamHeader | null | undefined) => {
    const conv = header?.convocatoria;
    if (!conv) return undefined;
    return typeof conv === "string" ? conv : conv.codigo ?? conv.nombre;
  };

  const getConcursoName = (header: ExamHeader | null | undefined) => {
    const conc = header?.concurso;
    if (!conc) return undefined;
    return typeof conc === "string" ? conc : conc.nombre ?? conc.codigo;
  };

  const getPlazaInfo = (header: ExamHeader | null | undefined) => header?.plaza ?? null;
  const getEspecialistaInfo = (header: ExamHeader | null | undefined) => header?.especialista ?? null;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("¡Copiado!");
    } catch {
      const ok = window.confirm(`Copia el link manualmente:\n${text}`);
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
                <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">No hay plazas para esta combinación.</td></tr>
              )}
              {plazas.map((p) => {
                const esp = especialistasById[p.especialistaId];
                const result = results[p._id];
                return (
                  <tr key={p._id} className="border-t">
                    <td className="px-3 py-2 font-mono">{p.codigoPlaza}</td>
                    <td className="px-3 py-2">{p.puesto}</td>
                    <td className="px-3 py-2">{p.unidadAdministrativa}</td>
                    <td className="px-3 py-2">{esp?.nombreCompleto || p.especialistaId}</td>
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
                          <a className="underline text-blue-700 break-all" href={result.url} target="_blank" rel="noreferrer">{result.url}</a>
                          <button className="text-xs px-2 py-1 border rounded" onClick={() => copy(result.url)}>Copiar</button>
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

      <div className="mt-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h3 className="text-xl font-semibold text-gray-800">Historial de formularios recibidos</h3>
          <button
            onClick={fetchHistory}
            disabled={historyLoading || !convId || !concId}
            className="self-start md:self-auto px-4 py-2 rounded-xl border border-cyan-200 text-sm text-cyan-700 hover:bg-cyan-50 disabled:opacity-50"
          >
            {historyLoading ? "Actualizando…" : "Actualizar historial"}
          </button>
        </div>

        {!convId || !concId ? (
          <p className="text-sm text-gray-500 mt-4">
            Selecciona una convocatoria y un concurso para consultar los formularios recibidos.
          </p>
        ) : (
          <>
            {historyError && (
              <p className="text-sm text-red-600 mt-4">{historyError}</p>
            )}

            {historyLoading && history.length === 0 ? (
              <p className="text-sm text-gray-500 mt-4">Cargando historial…</p>
            ) : history.length === 0 ? (
              !historyError && (
                <p className="text-sm text-gray-500 mt-4">Aún no se reciben formularios para esta combinación.</p>
              )
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="min-w-full text-left border rounded-xl overflow-hidden">
                  <thead className="bg-gray-100 text-gray-700 text-sm">
                    <tr>
                      <th className="px-3 py-2">Recibido</th>
                      <th className="px-3 py-2">Plaza</th>
                      <th className="px-3 py-2">Responsable</th>
                      <th className="px-3 py-2">Descargas</th>
                      <th className="px-3 py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((exam) => {
                      const plazaInfo = getPlazaInfo(exam.header);
                      const especialistaInfo = getEspecialistaInfo(exam.header);
                      return (
                        <tr key={exam._id} className="border-t align-top">
                          <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(exam.createdAt)}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-col">
                              <span className="font-mono text-sm">{plazaInfo?.codigoPlaza || exam.plazaId}</span>
                              <span className="text-xs text-gray-500">{plazaInfo?.puesto || ""}</span>
                              <span className="text-xs text-gray-500">{plazaInfo?.unidadAdministrativa || ""}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{exam.nombreDeclarante || "Sin nombre"}</span>
                              <span className="text-xs text-gray-500">{especialistaInfo?.nombre || especialistaInfo?.nombreCompleto || ""}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              {exam.artifacts?.faPdfUrl && renderDownloadLink(exam.artifacts.faPdfUrl, "FA")}
                              {exam.artifacts?.fePdfUrl && renderDownloadLink(exam.artifacts.fePdfUrl, "FE")}
                              {exam.artifacts?.receiptPdfUrl && renderDownloadLink(exam.artifacts.receiptPdfUrl, "Acuse")}
                              {!exam.artifacts?.faPdfUrl && !exam.artifacts?.fePdfUrl && !exam.artifacts?.receiptPdfUrl && (
                                <span className="text-xs text-gray-500">Sin archivos disponibles</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              className="px-3 py-1.5 rounded-lg border border-cyan-200 text-sm text-cyan-700 hover:bg-cyan-50 disabled:opacity-50"
                              onClick={() => handleViewExam(exam._id)}
                              disabled={selectedExamLoadingId !== null && selectedExamLoadingId !== exam._id}
                            >
                              {selectedExamLoadingId === exam._id ? "Cargando…" : "Ver respuestas"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {(selectedExam || selectedExamError || selectedExamLoadingId) && (
        <div className="mt-6 border rounded-2xl bg-gray-50 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-lg font-semibold text-gray-800">Detalle del formulario</h4>
              {selectedExam?.createdAt && (
                <p className="text-xs text-gray-500">Recibido: {formatDateTime(selectedExam.createdAt)}</p>
              )}
            </div>
            <button
              onClick={clearSelectedExam}
              className="text-sm text-cyan-700 hover:underline"
            >
              Cerrar
            </button>
          </div>

          {selectedExamLoadingId && !selectedExam && !selectedExamError && (
            <p className="text-sm text-gray-500 mt-3">Cargando respuestas…</p>
          )}

          {selectedExamError && !selectedExam && (
            <p className="text-sm text-red-600 mt-3">{selectedExamError}</p>
          )}

          {selectedExam && (
            <div className="mt-4 space-y-3 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-700">
                <div>
                  <p className="font-medium">Convocatoria</p>
                  <p>{getConvocatoriaCode(selectedExam.header) || selectedExam.convocatoriaId}</p>
                </div>
                <div>
                  <p className="font-medium">Concurso</p>
                  <p>{getConcursoName(selectedExam.header) || selectedExam.concursoId}</p>
                </div>
                <div>
                  <p className="font-medium">Plaza</p>
                  <p>{getPlazaInfo(selectedExam.header)?.codigoPlaza || selectedExam.plazaId}</p>
                </div>
                <div>
                  <p className="font-medium">Responsable</p>
                  <p>{selectedExam.nombreDeclarante || 'Sin nombre'}</p>
                </div>
              </div>

              <div>
                <p className="font-medium mb-2">Respuestas capturadas</p>
                {Object.keys(selectedExam.answers || {}).length === 0 ? (
                  <p className="text-sm text-gray-500">No se registraron respuestas específicas.</p>
                ) : (
                  <ul className="list-disc pl-5 space-y-1">
                    {Object.entries(selectedExam.answers).map(([key, value]) => (
                      <li key={key}>
                        <span className="font-medium">{key}:</span> {String(value ?? "")}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
