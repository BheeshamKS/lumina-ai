import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { addApiKey } from "../utils/apiKeys";
import { ExternalLink, ArrowLeft, Check, Zap, Eye, ChevronRight } from "lucide-react";

interface ProviderConfig {
  id: string;
  name: string;
  tagline: string;
  description: string;
  badge: string;
  badgeColor: string;
  icon: ReactNode;
  keyLabel: string;
  keyPlaceholder: string;
  keyUrl: string;
  keyUrlLabel: string;
  defaultKeyName: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: "Google",
    name: "Google Gemini",
    tagline: "Powerful & multimodal",
    description:
      "Best for complex reasoning, image understanding, and long context windows. Gemini Flash is incredibly fast and cheap.",
    badge: "Recommended",
    badgeColor: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#4285F4" />
        <path d="M12 2v10l8.66 5C19.18 9.91 16.12 4.87 12 2z" fill="#34A853" />
        <path d="M2 12c0 4.97 3.64 9.12 8.45 9.86L12 12 2 12z" fill="#FBBC05" />
        <path d="M21.54 8.5C20.37 5.17 17.46 2.67 13.9 2.1L12 12l9.54-3.5z" fill="#EA4335" />
      </svg>
    ),
    keyLabel: "Google AI API Key",
    keyPlaceholder: "AIza...",
    keyUrl: "https://aistudio.google.com/app/apikey",
    keyUrlLabel: "Get key at Google AI Studio",
    defaultKeyName: "My Google Key",
  },
  {
    id: "Groq",
    name: "Groq",
    tagline: "Blazing fast inference",
    description:
      "Fastest LLM inference available. Generous free tier with Llama models. Perfect for quick back-and-forth conversations.",
    badge: "Free tier",
    badgeColor: "bg-orange-500/15 text-orange-400 border border-orange-500/20",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path
          d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    keyLabel: "Groq API Key",
    keyPlaceholder: "gsk_...",
    keyUrl: "https://console.groq.com/keys",
    keyUrlLabel: "Get key at Groq Console",
    defaultKeyName: "My Groq Key",
  },
];

type OnboardingStep = "welcome" | "provider" | "success";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveKey: (key: string) => void;
}

export const OnboardingModal = ({ isOpen, onClose, onSaveKey }: OnboardingModalProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [showKey, setShowKey] = useState(false);

  if (!isOpen) return null;

  const provider = PROVIDERS.find((p) => p.id === selectedProvider);

  const handleSelectProvider = (providerId: string) => {
    setSelectedProvider(providerId);
    setApiKey("");
    setError("");
    setShowKey(false);
    setStep("provider");
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError("Please enter your API key.");
      return;
    }
    if (!selectedProvider) return;
    setIsSaving(true);
    setError("");
    try {
      await addApiKey(selectedProvider, apiKey.trim(), provider!.defaultKeyName);
      setStep("success");
      setTimeout(() => {
        onSaveKey(apiKey.trim());
        onClose();
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save key. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoToSettings = () => {
    onClose();
    navigate("/settings/providers");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[95dvh] overflow-y-auto"
        style={{ background: "var(--color-card)", border: "1px solid var(--color-sidebar-border)" }}
      >
        {/* WELCOME STEP */}
        {step === "welcome" && (
          <div className="p-7">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-sidebar-ring/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-sidebar-ring" />
                </div>
                <span className="text-xs font-medium tracking-widest uppercase opacity-50" style={{ fontFamily: "var(--font-sans)" }}>
                  One-time setup
                </span>
              </div>
              <h2 className="text-2xl font-semibold text-card-text mb-2" style={{ fontFamily: "var(--font-sans)" }}>
                Connect an AI provider
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-sidebar-text)" }}>
                Lumina routes your messages through your own API keys — your data stays private and you control the costs.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectProvider(p.id)}
                  className="w-full text-left rounded-xl p-4 transition-all duration-150 group"
                  style={{ background: "var(--color-sidebar)", border: "1px solid var(--color-sidebar-border)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-sidebar-ring)";
                    e.currentTarget.style.background = "var(--color-sidebar-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-sidebar-border)";
                    e.currentTarget.style.background = "var(--color-sidebar)";
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5 shrink-0 text-card-text">{p.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium text-sm text-card-text" style={{ fontFamily: "var(--font-sans)" }}>{p.name}</span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${p.badgeColor}`}>{p.badge}</span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--color-sidebar-text)" }}>{p.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0 mt-1 opacity-40 group-hover:opacity-70 transition-opacity" style={{ color: "var(--color-card-text)" }} />
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleGoToSettings}
              className="w-full text-left rounded-xl p-4 transition-all duration-150 group"
              style={{ background: "var(--color-sidebar)", border: "1px solid var(--color-sidebar-border)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-sidebar-ring)";
                e.currentTarget.style.background = "var(--color-sidebar-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-sidebar-border)";
                e.currentTarget.style.background = "var(--color-sidebar)";
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "var(--color-sidebar-border)" }}>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-card-text)" }}>
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.07 4.93A10 10 0 0 0 4.93 19.07M4.93 4.93A10 10 0 0 1 19.07 19.07" />
                      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-sm text-card-text mb-0.5" style={{ fontFamily: "var(--font-sans)" }}>Other providers</p>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--color-sidebar-text)" }}>
                      OpenAI, Anthropic, Mistral, xAI, DeepSeek and more — set up in Settings
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 opacity-40 group-hover:opacity-70 transition-opacity" style={{ color: "var(--color-card-text)" }} />
              </div>
            </button>
          </div>
        )}

        {/* PROVIDER STEP */}
        {step === "provider" && provider && (
          <div className="p-7">
            <button
              onClick={() => setStep("welcome")}
              className="flex items-center gap-1.5 text-xs mb-5 opacity-50 hover:opacity-80 transition-opacity"
              style={{ color: "var(--color-card-text)", fontFamily: "var(--font-sans)" }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div className="flex items-center gap-3 mb-1">
              <div className="text-card-text">{provider.icon}</div>
              <h2 className="text-xl font-semibold text-card-text" style={{ fontFamily: "var(--font-sans)" }}>{provider.name}</h2>
            </div>
            <p className="text-sm mb-6" style={{ color: "var(--color-sidebar-text)" }}>{provider.tagline}</p>

            <a
              href={provider.keyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs mb-4 px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: "var(--color-sidebar)", border: "1px solid var(--color-sidebar-border)", color: "var(--color-sidebar-ring)", fontFamily: "var(--font-sans)" }}
            >
              <ExternalLink className="w-3 h-3" />
              {provider.keyUrlLabel}
            </a>

            <div className="mb-2">
              <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--color-sidebar-text)", fontFamily: "var(--font-sans)" }}>
                {provider.keyLabel}
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setError(""); }}
                  placeholder={provider.keyPlaceholder}
                  autoFocus
                  className="w-full pr-10 px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "var(--color-sidebar)",
                    border: error ? "1px solid #ef4444" : "1px solid var(--color-sidebar-border)",
                    color: "var(--color-card-text)",
                    fontFamily: "var(--font-mono)",
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-70 transition-opacity"
                  style={{ color: "var(--color-card-text)" }}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
              {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
            </div>

            <p className="text-xs mb-6" style={{ color: "var(--color-sidebar-text)" }}>
              Your key is encrypted and stored securely. Lumina never shares it.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleGoToSettings}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
                style={{ background: "var(--color-sidebar)", border: "1px solid var(--color-sidebar-border)", color: "var(--color-sidebar-text)", fontFamily: "var(--font-sans)" }}
              >
                Settings instead
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !apiKey.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: "var(--color-sidebar-ring)", color: "#fff", fontFamily: "var(--font-sans)" }}
              >
                {isSaving ? "Saving..." : "Save & Continue"}
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS STEP */}
        {step === "success" && (
          <div className="p-7 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--color-sidebar-ring)" }}>
              <Check className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-card-text mb-2" style={{ fontFamily: "var(--font-sans)" }}>
              You're all set!
            </h2>
            <p className="text-sm" style={{ color: "var(--color-sidebar-text)" }}>
              {provider?.name} is connected. Starting Lumina…
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
