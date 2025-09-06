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
    <div className="min-h-screen flex flex-col bg-[#ACCCD8] pt-20">
      <Navbar />
      <div className="flex flex-col flex-1 justify-center items-center">
        <button className="mb-8 px-10 py-6 text-2xl font-bold bg-blue-600 text-white rounded-4xl shadow-xl/30 hover:bg-blue-600 transition-transform hover:scale-105">
          Casos Prácticos
          <br />
          <span className="text-sm font-normal text-black">
            Da click para descargar el archivo
          </span>
        </button>

        <div className="flex flex-col items-center mb-8">
          <label htmlFor="casos" className="mb-2 text-lg font-medium text-black">
            ¿Cuántos casos prácticos?
          </label>
          <select
            id="casos"
            className="px-4 py-2 rounded border border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </div>

        <div className="flex gap-6">
          <button className="px-8 py-4 text-lg font-semibold bg-[#435363] text-white rounded-lg shadow hover:bg-[#446281] transition-transform">
            FA
          </button>
          <button className="px-8 py-4 text-lg font-semibold bg-[#435363] text-white rounded-lg shadow hover:bg-[#446281] transition-transform">
            FE
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
        </div>
      </div>

      <PrivacyModal open={isPrivacyOpen} onAccept={handleAccept} />
    </div>
  );
}
