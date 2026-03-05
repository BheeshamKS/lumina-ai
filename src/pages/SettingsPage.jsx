import { Key, CheckCircle2, Circle, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { getAllUserKeys, addApiKey, setActiveKey } from "../utils/apiKeys";
import {
  getEnabledModels,
  toggleModelEnabled,
  MODEL_REGISTRY,
} from "../utils/models";

const ProviderCard = ({
  name,
  description,
  savedKeys,
  onRefresh,
  onActivate,
  enableModels = [],
  onModelToggle,
  allModels = [],
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Check if they have keys, and specifically if one is active
  const hasKeys = savedKeys.length > 0;
  const activeKey = savedKeys.find((k) => k.is_active);

  const handleAdd = async () => {
    if (!newKeyValue.trim() || !newKeyName.trim()) return;
    setIsSaving(true);
    try {
      await addApiKey(name, newKeyValue.trim(), newKeyName.trim());
      setNewKeyName("");
      setNewKeyValue("");
      setIsAdding(false);
      onRefresh(); // Tell the parent page to re-fetch the list from Supabase!
    } catch (error) {
      console.error("Error adding key:", error);
      alert("Failed to add key. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivate = (keyId) => {
    onActivate(name, keyId);
  };

  return (
    <div className="bg-inputcard border border-border-main rounded-2xl p-5 shadow-sm transition-all hover:border-border-hover">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="text-[16px] font-semibold text-card-text">{name}</h3>
          <p className="text-[13px] text-placeholder mt-0.5">{description}</p>
        </div>
        {activeKey ? (
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-accent bg-accent/10 px-2.5 py-1 rounded-full">
            <CheckCircle2 size={14} /> Active
          </span>
        ) : (
          <span className="text-[12px] font-medium text-placeholder bg-card-hover px-2.5 py-1 rounded-full">
            Not configured
          </span>
        )}
      </div>

      {/* 1. LIST EXISTING KEYS */}
      {hasKeys && (
        <div className="mb-5 space-y-2">
          {savedKeys.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between bg-app border border-border-main p-3 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleActivate(k.id)}
                  className={`${k.is_active ? "text-accent" : "text-placeholder hover:text-card-text"} transition-colors`}
                >
                  {k.is_active ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <Circle size={18} />
                  )}
                </button>
                <span className="text-[14px] text-card-text font-medium">
                  {k.key_name}
                </span>
              </div>
              {k.is_active && (
                <span className="text-[11px] text-accent uppercase tracking-wider font-bold">
                  In Use
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 2. ADD NEW KEY FORM */}
      {isAdding ? (
        <div className="space-y-3 bg-app p-4 rounded-xl border border-border-main">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key Name (e.g., Personal Gemini Key)"
            className="w-full bg-transparent border-b border-border-main pb-2 text-[14px] text-primary outline-none focus:border-accent transition-colors"
          />
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none text-placeholder">
              <Key size={14} />
            </div>
            <input
              type="password"
              value={newKeyValue}
              onChange={(e) => setNewKeyValue(e.target.value)}
              placeholder={`Paste your ${name} API Key here...`}
              className="w-full bg-transparent border-b border-border-main pl-7 pb-2 text-[14px] text-primary outline-none focus:border-accent transition-colors font-mono"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleAdd}
              disabled={isSaving || !newKeyValue.trim() || !newKeyName.trim()}
              className="flex-1 bg-user-bubble text-user-bubble-text py-2 rounded-lg text-[13px] font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {isSaving ? "Saving securely..." : "Save Key"}
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 border border-border-main text-placeholder rounded-lg text-[13px] hover:text-card-text hover:bg-card-hover transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 text-[13px] text-accent hover:underline font-medium"
        >
          <Plus size={16} /> Add {hasKeys ? "another" : "a"} key
        </button>
      )}

      {/* 3. CUSTOMIZE MODELS SECTION */}
      <div className="mt-6 pt-5 border-t border-border-main/50">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-placeholder mb-3">
          Enabled Models
        </h4>
        <div className="grid grid-cols-1 gap-2">
          {allModels
            .filter((m) => m.provider === name)
            .map((model) => (
              <label
                key={model.id}
                className="flex items-center justify-between p-3 bg-app/50 border border-border-main rounded-xl cursor-pointer hover:border-accent/30 transition-all group"
              >
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-card-text group-hover:text-card-text-hover">
                    {model.name}
                  </span>
                  <span
                    className={`text-[10px] ${model.type === "Paid" ? "text-orange-400" : "text-green-500/80"}`}
                  >
                    {model.type}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={enabledModels.includes(model.id)}
                  onChange={(e) => {
                    if (model.warning && e.target.checked) {
                      if (!confirm(model.warning)) return;
                    }
                    onModelToggle(model.id, e.target.checked);
                  }}
                  className="w-4 h-4 rounded border-border-main text-accent focus:ring-accent accent-accent"
                />
              </label>
            ))}
        </div>
      </div>
    </div>
  );
};

export const SettingsPage = () => {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enabledModelIds, setEnabledModelIds] = useState([]);

  const fetchSettingsData = async () => {
    try {
      setLoading(true);
      const [userKeys, enabledIds] = await Promise.all([
        getAllUserKeys(),
        getEnabledModels(),
      ]);
      setKeys(userKeys);
      setEnabledModelIds(enabledIds);
    } catch (error) {
      console.error("Failed to load settings", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsData();
  }, []);

  // Handler for toggling
  const handleModelToggle = async (modelId, isChecked) => {
    // Optimistic Update
    setEnabledModelIds((prev) =>
      isChecked ? [...prev, modelId] : prev.filter((id) => id !== modelId),
    );
    // DB Update
    await toggleModelEnabled(modelId, isChecked);
  };

  // Fetch all keys from Supabase when the page loads
  const fetchKeys = async () => {
    try {
      const userKeys = await getAllUserKeys();
      setKeys(userKeys);
    } catch (error) {
      console.error("Failed to load keys", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimisticActivation = async (providerName, keyId) => {
    // 1. Instantly update the UI so it feels blazing fast
    setKeys((prevKeys) =>
      prevKeys.map((k) => {
        if (k.provider === providerName) {
          return { ...k, is_active: k.id === keyId };
        }
        return k;
      }),
    );

    // 2. Do the slow database work in the background
    try {
      await setActiveKey(providerName, keyId);
    } catch (error) {
      console.error("Database failed to update:", error);
      fetchKeys(); // If the DB fails, fetch the truth to fix the UI
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  // Helper function to pass only the specific provider's keys to each card
  const getKeysForProvider = (providerName) => {
    return keys.filter((k) => k.provider === providerName);
  };

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

        {loading ? (
          <div className="text-center py-10 text-placeholder text-sm animate-pulse">
            Loading your secure vault...
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-[14px] font-bold uppercase tracking-wider text-placeholder border-b border-border-main pb-2">
              LLM Providers
            </h2>

            <div className="space-y-4">
              {["Google", "Anthropic", "Groq"].map((provider) => (
                <ProviderCard
                  key={provider}
                  name={provider}
                  description={
                    provider === "Google"
                      ? "Access Gemini 1.5 Pro and Flash models natively."
                      : provider === "Anthropic"
                        ? "Access the Claude 3 model family including Sonnet and Opus."
                        : "Ultra-fast inference for Llama 3 and open-source models."
                  }
                  savedKeys={getKeysForProvider(provider)}
                  onRefresh={fetchSettingsData}
                  onActivate={handleOptimisticActivation}
                  // New Props passed here
                  enabledModels={enabledModelIds}
                  onModelToggle={handleModelToggle}
                  allModels={MODEL_REGISTRY}
                />
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 p-4 bg-accent/5 border border-accent/20 rounded-xl">
          <h3 className="text-[14px] font-semibold text-accent mb-1">
            Security Notice
          </h3>
          <p className="text-[13px] text-placeholder leading-relaxed">
            Your API keys are secured using Row Level Security (RLS) in
            Supabase. They are never stored in plain text in your browser, and
            the database strictly prevents any other user from accessing your
            rows.
          </p>
        </div>
      </div>
    </div>
  );
};
