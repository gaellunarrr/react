import { useState } from "react";
import "./App.css";
import Navbar from "./components/Navbar";
import PrivacyModal from "./components/PrivacyModal";
import { useLockBodyScroll } from "./hooks/useLockBodyScroll";
import HomePage from "./pages/HomePage";

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
      <HomePage
        consentName={consentName}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
      />
      <PrivacyModal open={isPrivacyOpen} onAccept={handleAccept} />
    </div>
  );
}
