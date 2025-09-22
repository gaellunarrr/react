import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";
import Navbar from "./components/Navbar";
import PrivacyModal from "./components/PrivacyModal";
import { useLockBodyScroll } from "./hooks/useLockBodyScroll";
import HomePage from "./pages/HomePage";
import FormPage from "./pages/FormPage";// ← NUEVO

export default function App() {
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [consentName, setConsentName] = useState<string | null>(null);

  useLockBodyScroll(isPrivacyOpen);

  const handleAccept = ({ fullName }: { fullName: string }) => {
    setConsentName(fullName);
    setIsPrivacyOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#ACCCD8] pt-40">
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              consentName={consentName}
              onOpenPrivacy={() => setIsPrivacyOpen(true)}
            />
          }
        />
        <Route path="/form/:token" element={<FormPage />} /> {/* ← NUEVO */}
      </Routes>
      <PrivacyModal open={isPrivacyOpen} onAccept={handleAccept} />
    </div>
  );
}
