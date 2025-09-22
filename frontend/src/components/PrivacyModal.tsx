import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type PrivacyModalProps = {
  open: boolean;
  initialName?: string;
  enforceAccept?: boolean; // true = no se puede cerrar sin aceptar (por defecto true)
  onAccept: (payload: { fullName: string }) => void;
};

export default function PrivacyModal({
  open,
  initialName = "",
  enforceAccept = true,
  onAccept,
}: PrivacyModalProps) {
  const [fullName, setFullName] = useState(initialName);
  const [checked, setChecked] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstFocusRef = useRef<HTMLInputElement | null>(null);

  // Creamos el contenedor del portal una sola vez
  const portalEl = useMemo(() => {
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    el.setAttribute("id", "privacy-portal");
    return el;
  }, []);

  // Monta/desmonta el portal en body
  useEffect(() => {
    if (!portalEl || typeof document === "undefined") return;
    document.body.appendChild(portalEl);
    return () => {
      try { document.body.removeChild(portalEl); } catch {}
    };
  }, [portalEl]);

  // Autofoco al abrir
  useEffect(() => {
    if (open && firstFocusRef.current) firstFocusRef.current.focus();
    if (!open) {
      setChecked(false);
      setFullName(initialName);
    }
  }, [open, initialName]);

  // Focus trap (Tab/Shift+Tab dentro del modal)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      const list = Array.from(focusables).filter((el) => !el.hasAttribute("disabled"));
      if (list.length === 0) return;

      const first = list[0];
      const last = list[list.length - 1];

      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Bloqueamos Escape si se exige aceptación
  useEffect(() => {
    if (!open || !enforceAccept) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, enforceAccept]);

  const canAccept = fullName.trim().length > 2 && checked;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAccept) return;
    onAccept({ fullName: fullName.trim() });
  };

  if (!open || !portalEl) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-title"
      aria-describedby="privacy-desc"
    >
      <div ref={dialogRef} className="mx-4 w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <form className="px-6 py-5" onSubmit={onSubmit}>
          <h2 id="privacy-title" className="text-xl font-semibold text-gray-900">
            Aviso de privacidad
          </h2>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700" htmlFor="fullName">
              Nombre completo
            </label>
            <input
              id="fullName"
              ref={firstFocusRef}
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Escribe tu nombre completo"
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <p id="privacy-desc" className="mt-4 text-sm leading-6 text-gray-700">
            Yo, <span className="font-semibold">{fullName || "[Nombre completo]"}</span>, en mi calidad de especialista,
            reconozco y acepto que es mi responsabilidad garantizar la confidencialidad de la información relacionada con
            este proceso. Ningún servidor público ajeno al mismo podrá tener acceso a su contenido, salvo en los casos
            expresamente autorizados conforme a la normativa aplicable.
          </p>

          <label className="mt-5 flex items-start gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              Declaro que he leído y acepto el Aviso de Privacidad y que los datos proporcionados son correctos.
            </span>
          </label>

          <div className="mt-6 flex items-center justify-end gap-3">
            {/* sin botón de cerrar; solo se sale aceptando */}
            <button
              type="submit"
              disabled={!canAccept}
              className={`inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition ${
                canAccept ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-300 cursor-not-allowed"
              }`}
            >
              Aceptar y continuar
            </button>
          </div>
        </form>
      </div>
    </div>,
    portalEl
  );
}
