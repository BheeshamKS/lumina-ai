import { Key, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useState } from "react";

const ProviderCard = ({ name, description, isConfigured }) => {
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="bg-inputcard border border-border-main rounded-2xl p-5 shadow-sm transition-all hover:border-border-hover">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-[16px] font-semibold text-card-text">{name}</h3>
          <p className="text-[13px] text-placeholder mt-0.5">{description}</p>
        </div>
        {isConfigured ? (
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-accent bg-accent/10 px-2.5 py-1 rounded-full">
            <CheckCircle2 size={14} /> Active
          </span>
        ) : (
          <span className="text-[12px] font-medium text-placeholder bg-card-hover px-2.5 py-1 rounded-full">
            Not configured
          </span>
        )}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-placeholder">
            <Key size={16} />
          </div>
          <input
            type={showKey ? "text" : "password"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={`Paste your ${name} API Key here...`}
            className="w-full bg-app border border-border-main rounded-xl pl-10 pr-10 py-2.5 text-[14px] text-primary outline-none focus:border-border-hover transition-colors font-mono"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-placeholder hover:text-card-text transition-colors"
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <button className="px-5 py-2.5 bg-user-bubble text-user-bubble-text hover:opacity-90 transition-opacity rounded-xl text-[14px] font-medium">
          Save
        </button>
      </div>
    </div>
  );
};

export const SettingsPage = () => {
  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar pt-24 pb-32 px-6 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-[32px] font-serif font-bold text-card-text tracking-tight mb-2">
            Settings
          </h1>
          <p className="text-[15px] text-placeholder">
            Manage your API keys and application preferences securely.
          </p>
        </div>

        <div className="space-y-6">
          <h2 className="text-[14px] font-bold uppercase tracking-wider text-placeholder border-b border-border-main pb-2">
            LLM Providers
          </h2>

          <div className="space-y-4">
            <ProviderCard
              name="Google Gemini"
              description="Access Gemini 1.5 Pro and Flash models natively."
              isConfigured={true} // Mocking our setup from the previous step
            />
            <ProviderCard
              name="Anthropic"
              description="Access the Claude 3 model family including Sonnet and Opus."
              isConfigured={false}
            />
            <ProviderCard
              name="Groq"
              description="Ultra-fast inference for Llama 3 and open-source models."
              isConfigured={true}
            />
          </div>
        </div>

        {/* Security Disclaimer */}
        <div className="mt-10 p-4 bg-accent/5 border border-accent/20 rounded-xl">
          <h3 className="text-[14px] font-semibold text-accent mb-1">
            Security Notice
          </h3>
          <p className="text-[13px] text-placeholder leading-relaxed">
            Your API keys will be encrypted immediately upon saving in Supabase
            Vault. They are never stored in plain text and are only decrypted
            locally in your browser when making a request to the AI provider.
          </p>
        </div>
      </div>
    </div>
  );
};
