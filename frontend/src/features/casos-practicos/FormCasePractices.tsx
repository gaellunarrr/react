import { useEffect, useMemo, useState } from "react";

/** Tipos */
export type Encabezado = {
  convocatoria: string;
  unidadAdministrativa: string;
  concurso: string;
  puesto: string;
  codigoPuesto: string;
  modalidad: string;          // Oral | Escrita (o lo que decidas)
  duracionMin: number;        // 1..120
  nombreEspecialista: string;
  puestoEspecialista: string;
  fechaElaboracion: string;   // yyyy-mm-dd
};

export type Aspecto = { descripcion: string; puntaje: number };

export type CasoPractico = {
  encabezado: Encabezado;
  temasGuia: string;       // I
  planteamiento: string;   // II
  equipoAdicional: string; // III
  aspectos: Aspecto[];     // IV (1..10)
};

/** Payload agregado (compat con tu CasePractices: usa concurso raíz para el nombre del archivo) */
export type EstructuraPayload = Encabezado & {
  casos: CasoPractico[]; // 1..3
};

/** Constantes */
const STORAGE_KEY = "inegi_cp_form_v2";

const emptyHeader = (): Encabezado => ({
  convocatoria: "",
  unidadAdministrativa: "",
  concurso: "",
  puesto: "",
  codigoPuesto: "",
  modalidad: "",
  duracionMin: 0,
  nombreEspecialista: "",
  puestoEspecialista: "",
  fechaElaboracion: "",
});

const emptyCase = (header?: Encabezado): CasoPractico => ({
  encabezado: header ? { ...header } : emptyHeader(),
  temasGuia: "",
  planteamiento: "",
  equipoAdicional: "",
  aspectos: [{ descripcion: "", puntaje: 0 }], // 1 aspecto inicial
});

/** Migración desde el esquema viejo (una sola hoja) si existiera en localStorage */
function migrateIfNeeded(raw: any): EstructuraPayload | null {
  if (!raw) return null;
  // Si ya tiene casos, asumimos v2
  if (Array.isArray(raw.casos)) {
    const c1 = raw.casos[0]?.encabezado;
    // espejo raíz con encabezado del caso 1
    if (c1) {
      return {
        ...c1,
        casos: raw.casos,
      };
    }
    return null;
  }
  // Esquema v1 (sin casos, con campos raíz + "aspectos")
  const keys = [
    "convocatoria","unidadAdministrativa","concurso","puesto","codigoPuesto","modalidad",
    "duracionMin","nombreEspecialista","puestoEspecialista","fechaElaboracion",
    "temasGuia","planteamiento","equipoAdicional","aspectos"
  ];
  const looksLikeV1 = keys.every((k) => k in raw);
  if (!looksLikeV1) return null;

  const header: Encabezado = {
    convocatoria: raw.convocatoria ?? "",
    unidadAdministrativa: raw.unidadAdministrativa ?? "",
    concurso: raw.concurso ?? "",
    puesto: raw.puesto ?? "",
    codigoPuesto: raw.codigoPuesto ?? "",
    modalidad: raw.modalidad ?? "",
    duracionMin: raw.duracionMin ?? 0,
    nombreEspecialista: raw.nombreEspecialista ?? "",
    puestoEspecialista: raw.puestoEspecialista ?? "",
    fechaElaboracion: raw.fechaElaboracion ?? "",
  };
  const case1: CasoPractico = {
    encabezado: header,
    temasGuia: raw.temasGuia ?? "",
    planteamiento: raw.planteamiento ?? "",
    equipoAdicional: raw.equipoAdicional ?? "",
    aspectos: Array.isArray(raw.aspectos) ? raw.aspectos : [{ descripcion: "", puntaje: 0 }],
  };
  return { ...header, casos: [case1] };
}

/** Componente principal */
export default function FormCasePractices({
  onChange,
}: {
  onChange: (data: EstructuraPayload, isValid: boolean) => void;
}) {
  // Carga inicial desde localStorage (lazy initializer)
  const [data, setData] = useState<EstructuraPayload>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const migrated = migrateIfNeeded(parsed);
        if (migrated) return migrated;
      }
    } catch {}
    const first = emptyCase();
    return { ...first.encabezado, casos: [first] };
  });

  // Pestaña activa (1..N)
  const [activeIndex, setActiveIndex] = useState(0);

  // Persistencia automática
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  /** Helpers para editar */
  const setHeader = <K extends keyof Encabezado>(i: number, k: K, v: Encabezado[K]) =>
    setData((d) => {
      const casos = d.casos.map((c, idx) =>
        idx === i ? { ...c, encabezado: { ...c.encabezado, [k]: v } } : c
      );
      // espejo raíz si editan el encabezado del Caso 1
      let root = { ...d };
      if (i === 0) {
        root = { ...root, [k]: v } as EstructuraPayload;
      }
      return { ...root, casos };
    });

  const setCaseField = <K extends keyof CasoPractico>(i: number, k: K, v: CasoPractico[K]) =>
    setData((d) => {
      const casos = d.casos.map((c, idx) => (idx === i ? { ...c, [k]: v } : c));
      return { ...d, casos };
    });

  const setAspecto = (i: number, j: number, patch: Partial<Aspecto>) =>
    setData((d) => {
      const casos = d.casos.map((c, idx) => {
        if (idx !== i) return c;
        const asp = c.aspectos.slice();
        const next = { ...asp[j], ...patch };
        // clamp puntaje 0..10
        const p = Number(next.puntaje);
        next.puntaje = Number.isFinite(p) ? Math.max(0, Math.min(10, p)) : 0;
        asp[j] = next;
        return { ...c, aspectos: asp };
      });
      return { ...d, casos };
    });

  const addAspecto = (i: number) =>
    setData((d) => {
      const casos = d.casos.map((c, idx) => {
        if (idx !== i) return c;
        if (c.aspectos.length >= 10) return c;
        return { ...c, aspectos: [...c.aspectos, { descripcion: "", puntaje: 0 }] };
      });
      return { ...d, casos };
    });

  const removeAspecto = (i: number, j: number) =>
    setData((d) => {
      const casos = d.casos.map((c, idx) => {
        if (idx !== i) return c;
        if (c.aspectos.length <= 1) return c;
        const next = c.aspectos.slice();
        next.splice(j, 1);
        return { ...c, aspectos: next };
      });
      return { ...d, casos };
    });

  const addCase = () =>
    setData((d) => {
      if (d.casos.length >= 3) return d;
      const base = d.casos[0]?.encabezado ?? emptyHeader();
      const nuevo = emptyCase(base);
      const casos = [...d.casos, nuevo];
      return { ...d, casos };
    });

  const removeCase = (i: number) =>
    setData((d) => {
      if (d.casos.length <= 1) return d; // siempre queda al menos 1
      const casos = d.casos.slice();
      casos.splice(i, 1);
      // si borramos el caso activo, ajusta pestaña
      const nextActive = Math.max(0, Math.min(activeIndex, casos.length - 1));
      setActiveIndex(nextActive);
      // espejo raíz (por si borra el caso 0 y el nuevo primero tiene encabezado diferente)
      const h = casos[0].encabezado;
      return { ...h, casos };
    });

  const copyHeaderFromCase1 = (i: number) =>
    setData((d) => {
      const c1 = d.casos[0]?.encabezado ?? emptyHeader();
      const casos = d.casos.map((c, idx) =>
        idx === i ? { ...c, encabezado: { ...c1 } } : c
      );
      return { ...d, casos };
    });

  /** Totales y validación por caso y global */
  const totalByCase = (i: number) =>
    data.casos[i].aspectos.reduce((acc, a) => acc + (Number.isFinite(a.puntaje) ? a.puntaje : 0), 0);

  const isCaseValid = (c: CasoPractico) => {
    const h = c.encabezado;
    const reqText = [
      h.modalidad, h.convocatoria, h.unidadAdministrativa, h.concurso, h.puesto,
      h.codigoPuesto, h.nombreEspecialista, h.puestoEspecialista, h.fechaElaboracion,
      c.temasGuia, c.planteamiento,
    ].every((v) => !!v && String(v).trim().length > 0);
    const reqDur =
      Number.isFinite(h.duracionMin) && h.duracionMin >= 1 && h.duracionMin <= 120;
    const reqAspectos =
      c.aspectos.length >= 1 &&
      c.aspectos.length <= 10 &&
      c.aspectos.every(
        (a) => !!a.descripcion.trim() && Number.isFinite(a.puntaje) && a.puntaje >= 0 && a.puntaje <= 10
      );
    return reqText && reqDur && reqAspectos;
  };

  const allValid = useMemo(() => data.casos.every(isCaseValid), [data]);

  /** Notificar al padre y persistir */
  useEffect(() => {
    onChange(data, allValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, allValid]);

  /** UI */
  const c = data.casos[activeIndex];

  return (
    <form className="bg-white/70 backdrop-blur rounded-3xl shadow-xl p-6 md:p-8 space-y-6" onSubmit={(e) => e.preventDefault()}>
      {/* Tabs de casos + acciones */}
      <div className="flex flex-wrap items-center gap-2">
        {data.casos.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={`px-3 py-1.5 rounded-full text-sm border transition
              ${activeIndex === i ? "bg-cyan-800 text-white border-cyan-800" : "bg-white text-cyan-800 border-cyan-300 hover:bg-cyan-50"}`}
            aria-current={activeIndex === i ? "page" : undefined}
          >
            Caso {i + 1}
          </button>
        ))}

        <button
          type="button"
          onClick={addCase}
          disabled={data.casos.length >= 3}
          className={`ml-2 px-3 py-1.5 rounded-full text-sm border transition
            ${data.casos.length >= 3 ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed"
                                      : "bg-white text-cyan-800 border-cyan-300 hover:bg-cyan-50"}`}
          title="Agregar caso (máximo 3)"
        >
          + Agregar caso
        </button>

        {data.casos.length > 1 && (
          <button
            type="button"
            onClick={() => removeCase(activeIndex)}
            className="px-3 py-1.5 rounded-full text-sm border border-red-300 text-red-700 hover:bg-red-50 transition"
            title="Eliminar caso actual"
          >
            Eliminar caso
          </button>
        )}
      </div>

      {/* Encabezado del caso activo */}
      <div className="grid md:grid-cols-3 gap-4">
        <TextField label="Convocatoria *" value={c.encabezado.convocatoria} onChange={(v) => setHeader(activeIndex, "convocatoria", v)} />
        <TextField label="Unidad Administrativa *" value={c.encabezado.unidadAdministrativa} onChange={(v) => setHeader(activeIndex, "unidadAdministrativa", v)} />
        <TextField label="Concurso *" value={c.encabezado.concurso} onChange={(v) => setHeader(activeIndex, "concurso", v)} />
        <TextField label="Puesto *" value={c.encabezado.puesto} onChange={(v) => setHeader(activeIndex, "puesto", v)} />
        <TextField label="Código *" value={c.encabezado.codigoPuesto} onChange={(v) => setHeader(activeIndex, "codigoPuesto", v)} />
        <SelectField
          label="Modalidad *"
          value={c.encabezado.modalidad}
          onChange={(v) => setHeader(activeIndex, "modalidad", v)}
          options={["Oral", "Escrita"]}
        />
        <MinutesField
          label="Duración (min) *"
          valueMinutes={c.encabezado.duracionMin}
          onChange={(mins) => setHeader(activeIndex, "duracionMin", mins)}
        />
        <TextField label="Nombre de la persona especialista *" value={c.encabezado.nombreEspecialista} onChange={(v) => setHeader(activeIndex, "nombreEspecialista", v)} className="md:col-span-2" />
        <TextField label="Puesto de la persona especialista *" value={c.encabezado.puestoEspecialista} onChange={(v) => setHeader(activeIndex, "puestoEspecialista", v)} />
        <DateField label="Fecha de elaboración *" value={c.encabezado.fechaElaboracion} onChange={(v) => setHeader(activeIndex, "fechaElaboracion", v)} />
      </div>

      {/* Botón para re-clonar encabezado del Caso 1 */}
      {activeIndex > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => copyHeaderFromCase1(activeIndex)}
            className="px-3 py-1.5 rounded-lg text-sm border border-cyan-300 text-cyan-800 hover:bg-cyan-50 transition"
            title="Copiar encabezado del Caso 1"
          >
            Copiar encabezado del Caso 1
          </button>
        </div>
      )}

      {/* Secciones I - III */}
      <AreaField label="I. Temas de la guía de estudio *" value={c.temasGuia} onChange={(v) => setCaseField(activeIndex, "temasGuia", v)} hint="Copie aquí los temas de la guía en que se basa el planteamiento." />
      <AreaField label="II. Planteamiento del caso práctico *" value={c.planteamiento} onChange={(v) => setCaseField(activeIndex, "planteamiento", v)} />
      <AreaField label="III. Equipo adicional requerido" value={c.equipoAdicional} onChange={(v) => setCaseField(activeIndex, "equipoAdicional", v)} />

      {/* IV. Aspectos por caso */}
      <fieldset className="border border-cyan-300 rounded-2xl p-4 space-y-4">
        <legend className="px-2 text-cyan-900 font-semibold">
          IV. Aspectos a evaluar y puntaje por criterio (0–10)
        </legend>

        <div className="space-y-3">
          {c.aspectos.map((asp, j) => (
            <div key={j} className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-3 items-end">
              <TextField
                label={`Aspecto ${j + 1} *`}
                value={asp.descripcion}
                onChange={(v) => setAspecto(activeIndex, j, { descripcion: v })}
              />
              <NumberField
                label="Puntaje"
                value={asp.puntaje}
                min={0}
                max={10}
                onChange={(v) => setAspecto(activeIndex, j, { puntaje: Number.isFinite(v) ? v : 0 })}
              />
              <button
                type="button"
                onClick={() => removeAspecto(activeIndex, j)}
                disabled={c.aspectos.length <= 1}
                className={`px-3 py-2 rounded-lg border transition
                  ${c.aspectos.length <= 1 ? "border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed"
                                            : "border-red-300 text-red-700 hover:bg-red-50"}`}
                title="Eliminar aspecto"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => addAspecto(activeIndex)}
            disabled={c.aspectos.length >= 10}
            className={`px-4 py-2 rounded-xl transition border
              ${c.aspectos.length >= 10 ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed"
                                        : "bg-white text-cyan-800 border-cyan-300 hover:bg-cyan-50"}`}
          >
            Agregar aspecto
          </button>

          <div className="font-semibold text-cyan-900">
            TOTAL: <span>{totalByCase(activeIndex)}</span>
          </div>
        </div>
      </fieldset>

      {/* Validación global */}
      <p className={`text-sm ${allValid ? "text-emerald-700" : "text-red-700"}`}>
        {allValid
          ? "Formulario completo. Ya puedes generar el PDF desde el botón 'PDF'."
          : "Completa los campos marcados con * y al menos 1 aspecto con puntaje (0–10) en cada caso."}
      </p>
    </form>
  );
}

/* ------- Inputs base ------- */
function TextField({
  label, value, onChange, className = ""
}: { label: string; value: string; onChange: (v: string) => void; className?: string; }) {
  return (
    <label className={`flex flex-col ${className}`}>
      <span className="text-sm text-cyan-900 mb-1">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-cyan-300 bg-white/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
      />
    </label>
  );
}

function NumberField({
  label, value, onChange, min, max
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; }) {
  return (
    <label className="flex flex-col">
      <span className="text-sm text-cyan-900 mb-1">{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ""}
        min={min} max={max}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
        className="rounded-xl border border-cyan-300 bg-white/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
      />
    </label>
  );
}

function DateField({
  label, value, onChange
}: { label: string; value: string; onChange: (v: string) => void; }) {
  return (
    <label className="flex flex-col">
      <span className="text-sm text-cyan-900 mb-1">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-cyan-300 bg-white/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
      />
    </label>
  );
}

function SelectField({
  label, value, onChange, options
}: { label: string; value: string; onChange: (v: string) => void; options: string[]; }) {
  return (
    <label className="flex flex-col">
      <span className="text-sm text-cyan-900 mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-cyan-300 bg-white/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
      >
        <option value="">Selecciona…</option>
        {options.map((op) => <option key={op} value={op}>{op}</option>)}
      </select>
    </label>
  );
}

function AreaField({
  label, value, onChange, hint
}: { label: string; value: string; onChange: (v: string) => void; hint?: string; }) {
  return (
    <label className="flex flex-col">
      <span className="text-sm text-cyan-900 mb-1">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="rounded-xl border border-cyan-300 bg-white/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
      />
      {hint && <span className="text-xs text-gray-600 mt-1">{hint}</span>}
    </label>
  );
}

/* Minutos 1..120 */
function MinutesField({
  label,
  valueMinutes,
  onChange,
}: {
  label: string;
  valueMinutes: number;
  onChange: (mins: number) => void;
}) {
  const toHHMM = (mins: number) => {
    if (!Number.isFinite(mins) || mins <= 0) return "00:00";
    const clamped = Math.max(0, Math.min(120, Math.round(mins)));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(h)}:${pad(m)}`;
  };

  return (
    <label className="flex flex-col">
      <span className="text-sm text-cyan-900 mb-1">{label}</span>
      <input
        type="number"
        min={1}
        max={120}
        step={1}
        value={Number.isFinite(valueMinutes) ? valueMinutes : ""}
        onChange={(e) => {
          const n = e.target.value === "" ? NaN : Number(e.target.value);
          if (!Number.isFinite(n)) return onChange(NaN);
          const clamped = Math.max(1, Math.min(120, Math.round(n)));
          onChange(clamped);
        }}
        className="rounded-xl border border-cyan-300 bg-white/80 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
      />
      <span className="text-xs text-gray-600 mt-1">
        {Number.isFinite(valueMinutes) && valueMinutes > 0
          ? `Equivale a ${toHHMM(valueMinutes)} (hh:mm)`
          : "Rango permitido: 1 a 120 minutos"}
      </span>
    </label>
  );
}
