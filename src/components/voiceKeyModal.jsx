import { useState } from "react";
import { X, Mic, ExternalLink, Eye, EyeOff } from "lucide-react";
import { addApiKey } from "../utils/apiKeys";

export const VoiceKeyModal = ({ isOpen, onClose, onSuccess }) => {
  const [apiKey, setApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [showKey, setShowKey] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError("Please enter your Groq API key.");
      return;
    }
    if (!apiKey.trim().startsWith("gsk_")) {
      setError("Groq keys start with gsk_ — double check your key.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await addApiKey("Groq", apiKey.trim(), "My Groq Key");
      onSuccess?.();
      onClose();
      setApiKey("");
    } catch (err) {
      setError(err.message || "Failed to save key. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-app/80 backdrop-blur-sm px-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-inputcard border border-border-main rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-placeholder hover:text-card-text transition-colors rounded-lg hover:bg-card-hover"
        >
          <X size={16} />
        </button>

        {/* Icon + Title */}
        <div className="flex flex-col items-center mb-5 text-center">
          <div className="w-11 h-11 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-3">
            <Mic size={20} className="text-accent" />
          </div>
          <h2 className="text-[18px] font-semibold text-card-text font-serif leading-tight">
            Add Groq key for Voice
          </h2>
          <p className="text-[12px] text-placeholder mt-1.5 leading-relaxed">
            Voice mode uses Groq's Whisper (speech→text) and TTS (text→speech).
            Free to use.
          </p>
        </div>

        {/* Get key link */}
        <a
          href="https://console.groq.com/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-[12px] text-accent hover:underline mb-4 font-medium"
        >
          <ExternalLink size={12} />
          Get your free Groq API key
        </a>

        {/* Input */}
        <div className="relative mb-3">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="gsk_..."
            autoFocus
            className="w-full bg-app border border-border-main rounded-xl px-3 py-2.5 pr-10 text-[13px] text-primary font-mono outline-none focus:border-border-hover transition-colors"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-placeholder hover:text-card-text transition-colors"
          >
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        {error && (
          <p className="text-[12px] text-[#FE8181] bg-[#FE8181]/10 px-3 py-2 rounded-lg mb-3">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border-main text-[13px] font-medium text-placeholder hover:bg-card-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !apiKey.trim()}
            className="flex-1 py-2.5 rounded-xl bg-accent text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Enable Voice"}
          </button>
        </div>
      </div>
    </div>
  );
};
