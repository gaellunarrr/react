import CasePractices from "../features/casos-practicos/CasePractices";

export default function HomePage({
  consentName,
  onOpenPrivacy,
}: {
  consentName: string | null;
  onOpenPrivacy: () => void;
}) {
  return (
    <main className="flex flex-col flex-1 justify-center items-center">
      <CasePractices />

      {/* FA / FE */}
      <div className="flex items-center space-x-2 text-sm text-gray-400 bg-cyan-900 rounded-full px-6 py-3 my-6">
        <button className="px-4 py-2 rounded-full hover:bg-cyan-800 transition-colors cursor-pointer">
          <span className="text-xl text-white">FA</span>
        </button>
        <span className="text-gray-500 text-2xl relative -mt-1.5">›</span>
        <button className="px-4 py-2 rounded-full hover:bg-cyan-800 transition-colors cursor-pointer">
          <span className="text-xl text-white">FE</span>
        </button>
      </div>

      {/* Pie */}
      <div className="mt-12 text-center text-gray-700">
        <button
          onClick={onOpenPrivacy}
          className="underline hover:text-black transition-colors cursor-pointer"
        >
          Aviso de privacidad
        </button>
        <p className="mt-2">© 2025 INEGI. Todos los derechos reservados.</p>
        {consentName && (
          <p className="mt-1 text-sm text-gray-600">Aceptó: {consentName}</p>
        )}
        <a href="https://www.inegi.org.mx/app/spc/guias.aspx" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block underline hover:text-black transition-colors">
          https://www.inegi.org.mx/app/spc/guias.aspx
        </a>
      </div>
    </main>
  );
}
