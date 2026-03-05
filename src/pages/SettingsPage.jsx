import {
  Key,
  CheckCircle2,
  Circle,
  Plus,
  Search,
  ChevronRight,
  ArrowLeft,
  Edit2,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  getAllUserKeys,
  addApiKey,
  setActiveKey,
  updateApiKey,
  deleteApiKey,
} from "../utils/apiKeys";
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
  enabledModels = [],
  onModelToggle,
  allModels = [],
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // New State for Editing
  const [editingKeyId, setEditingKeyId] = useState(null);
  const [editKeyValue, setEditKeyValue] = useState("");

  const hasKeys = savedKeys.length > 0;
  const activeKey = savedKeys.find((k) => k.is_active);

  const handleAdd = async () => {
    if (!newKeyValue.trim()) return;
    setIsSaving(true);
    try {
      // Auto-name the key!
      const autoName = `Key ${savedKeys.length + 1}`;
      await addApiKey(name, newKeyValue.trim(), autoName);
      setNewKeyValue("");
      setIsAdding(false);
      onRefresh();
    } catch (error) {
      console.error("Error adding key:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSave = async (k) => {
    setIsSaving(true);
    try {
      if (!editKeyValue.trim()) {
        // If they cleared the input, delete the key entirely
        await deleteApiKey(k.id);
      } else {
        // If they pasted a new key, update it
        await updateApiKey(k.id, editKeyValue.trim());
      }
      setEditingKeyId(null);
      setEditKeyValue("");
      onRefresh();
    } catch (error) {
      console.error("Error updating key:", error);
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

      {/* 1. EXISTING KEYS LIST */}
      {hasKeys && (
        <div className="mb-5 space-y-3">
          {savedKeys.map((k, index) => (
            <div
              key={k.id}
              className="bg-app border border-border-main p-3 rounded-xl"
            >
              <div className="flex items-center justify-between">
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
                    {/* Fallback to original name if it has one, otherwise auto-number */}
                    {k.key_name || `Key ${index + 1}`}
                  </span>
                  {k.is_active && (
                    <span className="text-[10px] text-accent uppercase tracking-wider font-bold">
                      In Use
                    </span>
                  )}
                </div>

                {editingKeyId !== k.id && (
                  <button
                    onClick={() => {
                      setEditingKeyId(k.id);
                      setEditKeyValue(k.api_key);
                    }}
                    className="text-[12px] text-placeholder hover:text-card-text transition-colors flex items-center gap-1"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                )}
              </div>

              {/* THE EDIT STATE FOR THIS KEY */}
              {editingKeyId === k.id && (
                <div className="flex gap-2 items-center mt-3 pt-3 border-t border-border-main/50 animate-in fade-in duration-200">
                  <input
                    type="password"
                    value={editKeyValue}
                    onChange={(e) => setEditKeyValue(e.target.value)}
                    placeholder="Paste new key (or leave blank to delete)"
                    className="flex-1 bg-transparent border-b border-border-main pb-1 text-[13px] text-primary outline-none focus:border-accent transition-colors font-mono"
                  />
                  <button
                    onClick={() => handleEditSave(k)}
                    disabled={isSaving}
                    className="px-3 py-1.5 bg-user-bubble text-user-bubble-text rounded-md text-[12px] font-medium disabled:opacity-50"
                  >
                    {isSaving ? "..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingKeyId(null)}
                    className="px-2 py-1.5 text-placeholder hover:text-card-text"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 2. ADD MAIN OR SECONDARY KEY FORM */}
      {!hasKeys || isAdding ? (
        <div className="space-y-3 bg-app p-4 rounded-xl border border-border-main mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Key size={14} className="text-placeholder" />
            <span className="text-[13px] font-medium text-card-text">
              {hasKeys ? `Add Key ${savedKeys.length + 1}` : "Enter Main Key"}
            </span>
          </div>
          <input
            type="password"
            value={newKeyValue}
            onChange={(e) => setNewKeyValue(e.target.value)}
            placeholder={`Paste your ${name} API Key here...`}
            className="w-full bg-transparent border-b border-border-main pb-2 text-[14px] text-primary outline-none focus:border-accent transition-colors font-mono"
          />
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleAdd}
              disabled={isSaving || !newKeyValue.trim()}
              className="flex-1 bg-user-bubble text-user-bubble-text py-2 rounded-lg text-[13px] font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {isSaving ? "Saving..." : "Save Key"}
            </button>
            {hasKeys && (
              <button
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 border border-border-main text-placeholder rounded-lg text-[13px] hover:text-card-text hover:bg-card-hover transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 text-[13px] text-accent hover:underline font-medium mb-6"
        >
          <Plus size={16} /> Add secondary key
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState("providers");
  const [activeProvider, setActiveProvider] = useState(null);

  const uniqueProviders = [...new Set(MODEL_REGISTRY.map((m) => m.provider))];

  const filteredProviders = uniqueProviders.filter((p) =>
    p.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredModels = MODEL_REGISTRY.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.provider.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
      fetchSettingsData(); // If the DB fails, fetch the truth to fix the UI
    }
  };

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
            {!activeProvider ? (
              // ==========================================
              // VIEW 1: THE MASTER LIST (SEARCH & TOGGLE)
              // ==========================================
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                {/* 1. The Toggle Pill */}
                <div className="flex bg-card-hover p-1 rounded-xl mb-6 w-fit mx-auto border border-border-main/50">
                  <button
                    onClick={() => {
                      setSearchMode("providers");
                      setSearchQuery("");
                    }}
                    className={`px-5 py-1.5 text-[13px] font-medium rounded-lg transition-all ${
                      searchMode === "providers"
                        ? "bg-card border border-border-main text-card-text shadow-sm"
                        : "text-placeholder hover:text-card-text"
                    }`}
                  >
                    Providers
                  </button>
                  <button
                    onClick={() => {
                      setSearchMode("models");
                      setSearchQuery("");
                    }}
                    className={`px-5 py-1.5 text-[13px] font-medium rounded-lg transition-all ${
                      searchMode === "models"
                        ? "bg-card border border-border-main text-card-text shadow-sm"
                        : "text-placeholder hover:text-card-text"
                    }`}
                  >
                    Models
                  </button>
                </div>

                {/* 2. The Search Bar */}
                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-placeholder">
                    <Search size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder={
                      searchMode === "providers"
                        ? "Search providers (e.g., Groq, OpenAI)..."
                        : "Search models (e.g., Llama, Claude)..."
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-inputcard border border-border-main rounded-xl pl-10 pr-4 py-3 text-[14px] text-card-text outline-none focus:border-accent transition-colors shadow-sm"
                  />
                </div>

                {/* 3. The Dynamic Results List */}
                <div className="bg-inputcard border border-border-main rounded-2xl overflow-hidden shadow-sm">
                  {searchMode === "providers" ? (
                    filteredProviders.length > 0 ? (
                      filteredProviders.map((providerName, index) => (
                        <button
                          key={providerName}
                          onClick={() => {
                            setActiveProvider(providerName);
                            setSearchQuery("");
                          }}
                          className={`w-full flex items-center justify-between p-4 hover:bg-card-hover transition-colors text-left group ${
                            index !== filteredProviders.length - 1
                              ? "border-b border-border-main"
                              : ""
                          }`}
                        >
                          <span className="text-[15px] font-medium text-card-text group-hover:text-accent transition-colors">
                            {providerName}
                          </span>
                          <ChevronRight
                            size={18}
                            className="text-placeholder group-hover:text-accent transition-colors"
                          />
                        </button>
                      ))
                    ) : (
                      <div className="p-6 text-center text-[13px] text-placeholder">
                        No providers found.
                      </div>
                    )
                  ) : filteredModels.length > 0 ? (
                    filteredModels.map((model, index) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setActiveProvider(model.provider);
                          setSearchQuery("");
                        }}
                        className={`w-full flex items-center justify-between p-4 hover:bg-card-hover transition-colors text-left group ${
                          index !== filteredModels.length - 1
                            ? "border-b border-border-main"
                            : ""
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-[14px] font-medium text-card-text group-hover:text-accent transition-colors">
                            {model.name}
                          </span>
                          <span className="text-[11px] font-medium text-placeholder mt-0.5 uppercase tracking-wider">
                            via {model.provider}
                          </span>
                        </div>
                        <ChevronRight
                          size={18}
                          className="text-placeholder group-hover:text-accent transition-colors"
                        />
                      </button>
                    ))
                  ) : (
                    <div className="p-6 text-center text-[13px] text-placeholder">
                      No models found.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // ==========================================
              // VIEW 2: THE DRILL-DOWN PROVIDER CARD
              // ==========================================
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <button
                  onClick={() => setActiveProvider(null)}
                  className="flex items-center gap-2 text-[13px] font-medium text-placeholder hover:text-card-text transition-colors mb-4 group"
                >
                  <ArrowLeft
                    size={16}
                    className="group-hover:-translate-x-1 transition-transform"
                  />{" "}
                  Back to Search
                </button>

                <ProviderCard
                  name={activeProvider}
                  description={`Manage your API keys and configure models for ${activeProvider}.`}
                  savedKeys={getKeysForProvider(activeProvider)}
                  onRefresh={fetchSettingsData}
                  onActivate={handleOptimisticActivation}
                  enabledModels={enabledModelIds}
                  onModelToggle={handleModelToggle}
                  allModels={MODEL_REGISTRY}
                />
              </div>
            )}
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
