import { useState } from "react";
import { addApiKey } from "../utils/apiKeys";
import {
  ShieldCheck,
  Key,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  Search,
} from "lucide-react";

export const OnboardingModal = ({ isOpen, onClose, onSaveKey }) => {
  const [apiKey, setApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setIsSaving(true);

    try {
      // 1. THIS IS THE REAL SAVE: It sends the key securely to Supabase
      await addApiKey("Google", apiKey.trim(), "My First Key");

      // 2. Tell the UI it was successful and close the modal
      onSaveKey(apiKey);
      onClose();
    } catch (error) {
      console.error("Error saving key:", error);
      alert("Failed to save key. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-app/80 backdrop-blur-sm px-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-inputcard border border-border-main rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col md:flex-row">
        {/* LEFT COLUMN: Security & Info */}
        <div className="w-full md:w-5/12 bg-card border-r border-border-main p-8 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center mb-5">
              <ShieldCheck size={20} className="text-accent" />
            </div>
            <h2 className="text-xl font-serif font-bold text-card-text mb-2">
              Bring Your Own Key
            </h2>
            <p className="text-[13.5px] text-placeholder leading-relaxed mb-6">
              Lumina uses a <strong>BYOK architecture</strong> to keep the
              platform free and completely private.
            </p>

            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-[13px] text-card-text">
                <CheckCircle2
                  size={16}
                  className="text-[#9be963] shrink-0 mt-0.5"
                />
                <span>
                  <strong>End-to-End Encrypted:</strong> Keys are secured using
                  Supabase Vault.
                </span>
              </li>
              <li className="flex items-start gap-2 text-[13px] text-card-text">
                <CheckCircle2
                  size={16}
                  className="text-[#9be963] shrink-0 mt-0.5"
                />
                <span>
                  <strong>Zero Knowledge:</strong> We cannot see, read, or use
                  your API keys.
                </span>
              </li>
              <li className="flex items-start gap-2 text-[13px] text-card-text">
                <CheckCircle2
                  size={16}
                  className="text-[#9be963] shrink-0 mt-0.5"
                />
                <span>
                  <strong>Cost Control:</strong> You interact directly with the
                  AI providers.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* RIGHT COLUMN: Setup */}
        <div className="w-full md:w-7/12 p-8 flex flex-col justify-center">
          <h3 className="text-[16px] font-bold text-card-text mb-1">
            Let's get started
          </h3>
          <p className="text-[13px] text-placeholder mb-6">
            We recommend Google Gemini to start. It offers a generous free tier
            that is perfect for Lumina.
          </p>

          <div className="space-y-4">
            {/* Recommended Option */}
            <div className="p-4 border border-accent/30 bg-accent/5 rounded-xl">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[14px] font-bold text-card-text flex items-center gap-2">
                  Google Gemini{" "}
                  <span className="text-[10px] bg-accent text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Recommended
                  </span>
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] flex items-center gap-1 text-accent hover:underline"
                >
                  Get free key <ExternalLink size={12} />
                </a>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-placeholder">
                  <Key size={14} />
                </div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your Gemini API key here..."
                  className="w-full bg-app border border-border-main rounded-lg pl-9 pr-4 py-2 text-[13px] text-primary outline-none focus:border-accent/50 transition-colors font-mono"
                />
              </div>
            </div>

            {/* Other Options Hint */}
            <div className="p-4 border border-border-main bg-card rounded-xl">
              <span className="text-[13px] font-semibold text-card-text block mb-1">
                More free options
              </span>
              <p className="text-[12px] text-placeholder mb-3">
                Prefer open-source?{" "}
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-card-text hover:underline"
                >
                  Groq
                </a>{" "}
                offers free, ultra-fast Llama 3 models.
              </p>
              <div className="flex items-center gap-2 text-[12px] text-placeholder bg-app p-2 rounded-lg border border-border-main border-dashed">
                <Search size={14} /> Future update: Universal API search &
                integration.
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!apiKey.trim() || isSaving}
            className="w-full flex items-center justify-center gap-2 bg-user-bubble text-user-bubble-text hover:opacity-90 transition-opacity rounded-xl py-3 text-[14px] font-medium disabled:opacity-50 mt-6"
          >
            {isSaving ? "Encrypting and Saving..." : "Save and Continue"}{" "}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
