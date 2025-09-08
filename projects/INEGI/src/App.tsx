import { useState } from "react";
import "./App.css";
import PrivacyModal from "./components/PrivacyModal";
import { useLockBodyScroll } from "./hooks/useLockBodyScroll";
import Navbar from "./components/Navbar";

export default function App() {
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [consentName, setConsentName] = useState<string | null>(null);

  // Bloquea scroll cuando el modal está abierto
  useLockBodyScroll(isPrivacyOpen);

  const handleAccept = ({ fullName }: { fullName: string }) => {
    setConsentName(fullName);
    // opcional: persistir
    // localStorage.setItem("privacyAccepted", JSON.stringify({ fullName, date: new Date().toISOString() }));
    setIsPrivacyOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#ACCCD8] pt-40">
      <Navbar />
      <div className="flex flex-col flex-1 justify-center items-center">
        <button className="mb-8 px-10 py-6 text-2xl font-bold cursor-pointer bg-cyan-600 text-[#002642] rounded-4xl shadow-xl/30 hover:bg-cyan-700 transition-transform hover:scale-105">
          Casos Prácticos
          <br />
          <span className="underline text-sm font-normal text-black">
            Da click para descargar el archivo
          </span>
        </button>

        <div className="flex flex-col items-center mb-8">
          <button
            className="flex items-center gap-2 px-8 py-4 bg-white text-cyan-800 font-semibold rounded-3xl shadow-lg hover:bg-cyan-100 transition-all text-lg border border-cyan-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-cyan-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"
              />
            </svg>
            PDF
          </button>
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-400 bg-cyan-900 rounded-full px-6 py-3 shadow- my-4">
            <button className="px-4 py-2 rounded-full hover:bg-cyan-800 transition-colors cursor-pointer">
              <span className="text-xl text-white">FA</span>
            </button>
            {/* Separador */}
            <span className="text-gray-500 text-2xl relative -mt-1.5">›</span>
            <button className="px-4 py-2 rounded-full hover:bg-cyan-800 transition-colors cursor-pointer">
              <span className="text-xl text-white">FE</span>
            </button>
        </div>

        <div className="mt-12 text-center text-gray-700">
          <button
            onClick={() => setIsPrivacyOpen(true)}
            className="underline hover:text-black transition-colors cursor-pointer"
          >
            Aviso de privacidad
          </button>
          <p className="mt-2">© 2025 INEGI. Todos los derechos reservados.</p>
          {consentName && <p className="mt-1 text-sm text-gray-600">Aceptó: {consentName}</p>}
          <a href="https://www.inegi.org.mx/app/spc/guias.aspx">https://www.inegi.org.mx/app/spc/guias.aspx</a>
        </div>
      </div>

      <PrivacyModal open={isPrivacyOpen} onAccept={handleAccept} />
    </div>
  );
}
