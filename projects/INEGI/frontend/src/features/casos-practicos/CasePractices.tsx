import { useCallback, useState } from "react";
import FormCasePractices from "./FormCasePractices";
import type { EstructuraPayload } from "./FormCasePractices";
import { generarEstructuraPDF } from "./api";

export default function CasePractices() {
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<EstructuraPayload | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleFormChange = useCallback((data: EstructuraPayload, valid: boolean) => {
    setFormData(data);
    setIsValid(valid);
  }, []);

  const handleDownloadPDF = async () => {
    if (!formData || !isValid) return;
    try {
      setDownloading(true);
      const blob = await generarEstructuraPDF(formData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Estructura_${formData.concurso || "caso-practico"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Ocurrió un problema generando el PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="w-full max-w-4xl">
      <div className="w-full flex justify-center">
        <button
          onClick={() => setOpenForm(v => !v)}
          className="mb-4 px-10 py-6 text-2xl font-bold cursor-pointer bg-cyan-600 text-[#002642] rounded-4xl shadow-xl/30 hover:bg-cyan-700 transition-transform hover:scale-105"
          aria-expanded={openForm}
          aria-controls="cp-form"
        >
          Casos Prácticos
          <br />
          <span className="underline text-sm font-normal text-black">
            Llena el formulario para generar el PDF
          </span>
        </button>
      </div>

      {/* Collapsible (suave y sin jank) */}
      <div
        id="cp-form"
        className={`grid overflow-hidden transition-all duration-300 ${openForm ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0">
          {openForm && (
            <FormCasePractices onChange={handleFormChange} />
          )}
        </div>
      </div>

      <div className="flex justify-center items-center my-8">
        <button
          onClick={handleDownloadPDF}
          disabled={!isValid || downloading}
          className={`flex items-center gap-2 px-8 py-4 rounded-3xl shadow-lg transition-all text-lg border
            ${isValid ? "bg-white hover:bg-cyan-100 text-cyan-800 border-cyan-300"
                      : "bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed"}`}
          aria-disabled={!isValid}
          title={isValid ? "Descargar PDF" : "Completa el formulario para habilitar la descarga"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"/>
          </svg>
          {downloading ? "Generando..." : "PDF"}
        </button>
      </div>
    </section>
  );
}
