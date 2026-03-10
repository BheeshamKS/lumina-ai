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
  RefreshCw,
  Package,
  Filter,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  getAllUserKeys,
  addApiKey,
  setActiveKey,
  updateApiKey,
  deleteApiKey,
  getActiveApiKey,
} from "../utils/apiKeys";
import {
  getEnabledModels,
  toggleModelEnabled,
  MODEL_REGISTRY,
  PROVIDER_FETCH_CONFIG,
  getUserFetchedModels,
  saveFetchedModel,
  removeFetchedModel,
} from "../utils/models";

// ==========================================
// BROWSE MODELS POPUP
// ==========================================
const BrowseModelsPopup = ({
  providerName,
  activeKey,
  enabledModels,
  onModelToggle,
  onClose,
  onModelFetched,
}) => {
  const [fetchedModels, setFetchedModels] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | free | paid
  const [hasFetched, setHasFetched] = useState(false);
  const overlayRef = useRef(null);

  const config = PROVIDER_FETCH_CONFIG[providerName];

  const handleFetch = async () => {
    if (!activeKey || !config) return;
    setIsFetching(true);
    setFetchError(null);
    try {
      const response = await fetch(config.endpoint, {
        headers: {
          "Content-Type": "application/json",
          ...config.authHeader(activeKey),
        },
      });
      if (!response.ok)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      const parsed = config.parseModels(data);
      setFetchedModels(parsed);
      setHasFetched(true);
    } catch (err) {
      setFetchError(err.message || "Failed to fetch models.");
    } finally {
      setIsFetching(false);
    }
  };

  // Auto-fetch on open if config exists
  useEffect(() => {
    if (config && activeKey) handleFetch();
  }, []);

  const handleToggle = async (model, checked) => {
    if (checked) {
      await saveFetchedModel(model);
      onModelFetched(model);
    } else {
      await removeFetchedModel(model.id);
    }
    onModelToggle(model.id, checked);
  };

  const filtered = fetchedModels.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "free" && m.type?.toLowerCase().includes("free")) ||
      (filter === "paid" && !m.type?.toLowerCase().includes("free"));
    return matchSearch && matchFilter;
  });

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-card border border-border-main rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border-main shrink-0">
          <div>
            <h3 className="text-[16px] font-semibold text-card-text">
              Browse {providerName} Models
            </h3>
            <p className="text-[12px] text-placeholder mt-0.5">
              {hasFetched
                ? `${fetchedModels.length} models found`
                : "Fetching from API..."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleFetch}
              disabled={isFetching}
              className="p-2 rounded-lg text-placeholder hover:text-card-text hover:bg-card-hover transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw
                size={15}
                className={isFetching ? "animate-spin" : ""}
              />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-placeholder hover:text-card-text hover:bg-card-hover transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="px-4 py-3 border-b border-border-main shrink-0 space-y-2">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-placeholder"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search models..."
              className="w-full bg-app border border-border-main rounded-lg pl-9 pr-3 py-2 text-[13px] text-card-text outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Free / Paid filter */}
          <div className="flex gap-1.5">
            {["all", "free", "paid"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-[11px] font-medium capitalize transition-all ${
                  filter === f
                    ? "bg-accent text-white"
                    : "bg-app border border-border-main text-placeholder hover:text-card-text"
                }`}
              >
                {f}
              </button>
            ))}
            <span className="ml-auto text-[11px] text-placeholder self-center">
              {filtered.length} shown
            </span>
          </div>
        </div>

        {/* Model List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
          {isFetching && !hasFetched ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <RefreshCw size={20} className="animate-spin text-accent" />
              <p className="text-[13px] text-placeholder">
                Fetching models from {providerName}...
              </p>
            </div>
          ) : fetchError ? (
            <div className="p-4 text-center">
              <p className="text-[13px] text-red-400 mb-3">{fetchError}</p>
              <button
                onClick={handleFetch}
                className="text-[12px] text-accent hover:underline"
              >
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-placeholder">
              {hasFetched
                ? "No models match your search."
                : "No models available."}
            </div>
          ) : (
            filtered.map((model) => {
              const isEnabled = enabledModels.includes(model.id);
              const isFree = model.type?.toLowerCase().includes("free");
              return (
                <label
                  key={model.id}
                  className="flex items-center justify-between p-3 rounded-xl cursor-pointer hover:bg-card-hover transition-all group"
                >
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0 mr-3">
                    <span className="text-[13px] font-medium text-card-text truncate group-hover:text-card-text-hover">
                      {model.name}
                    </span>
                    <span className="text-[10px] font-mono text-placeholder truncate">
                      {model.id}
                    </span>
                    <span
                      className={`text-[10px] font-medium mt-0.5 ${isFree ? "text-green-500/80" : "text-orange-400"}`}
                    >
                      {model.type}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => handleToggle(model, e.target.checked)}
                    className="w-4 h-4 rounded border-border-main text-accent focus:ring-accent accent-accent shrink-0"
                  />
                </label>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-main shrink-0">
          <p className="text-[11px] text-placeholder">
            Selected models are saved to your account and appear in your model
            selector.
          </p>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// PROVIDER CARD
// ==========================================
const ProviderCard = ({
  name,
  description,
  savedKeys,
  onRefresh,
  onActivate,
  enabledModels = [],
  onModelToggle,
  allModels = [],
  fetchedModels = [],
  onModelFetched,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingKeyId, setEditingKeyId] = useState(null);
  const [editKeyValue, setEditKeyValue] = useState("");
  const [showBrowse, setShowBrowse] = useState(false);

  const hasKeys = savedKeys.length > 0;
  const activeKey = savedKeys.find((k) => k.is_active);
  const hasFetchConfig = !!PROVIDER_FETCH_CONFIG[name];

  // Merge registry + fetched models for this provider
  const registryModels = allModels.filter(
    (m) => m.provider === name && !m.isGuestModel,
  );
  const fetchedForProvider = fetchedModels.filter((m) => m.provider === name);
  const fetchedIds = new Set(fetchedForProvider.map((m) => m.id));
  const registryOnly = registryModels.filter((m) => !fetchedIds.has(m.id));
  const allProviderModels = [...registryOnly, ...fetchedForProvider];

  const handleAdd = async () => {
    if (!newKeyValue.trim()) return;
    setIsSaving(true);
    try {
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
        await deleteApiKey(k.id);
      } else {
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

  return (
    <>
      {showBrowse && activeKey && (
        <BrowseModelsPopup
          providerName={name}
          activeKey={activeKey.api_key}
          enabledModels={enabledModels}
          onModelToggle={onModelToggle}
          onClose={() => setShowBrowse(false)}
          onModelFetched={onModelFetched}
        />
      )}

      <div className="bg-inputcard border border-border-main rounded-2xl p-5 shadow-sm transition-all hover:border-border-hover">
        {/* Header */}
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

        {/* Keys List */}
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
                      onClick={() => onActivate(name, k.id)}
                      className={`${k.is_active ? "text-accent" : "text-placeholder hover:text-card-text"} transition-colors`}
                    >
                      {k.is_active ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <Circle size={18} />
                      )}
                    </button>
                    <span className="text-[14px] text-card-text font-medium">
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

        {/* Add Key Form */}
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

        {/* Models Section */}
        <div className="mt-6 pt-5 border-t border-border-main/50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-placeholder">
              Enabled Models
            </h4>
            {/* Browse Models button — only if provider has a fetch config AND has an active key */}
            {hasFetchConfig && activeKey && (
              <button
                onClick={() => setShowBrowse(true)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-accent hover:underline transition-colors"
              >
                <Package size={13} />
                Browse All Models
              </button>
            )}
            {hasFetchConfig && !activeKey && (
              <span className="text-[11px] text-placeholder">
                Add a key to browse all models
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2">
            {allProviderModels.length === 0 ? (
              <p className="text-[12px] text-placeholder py-2">
                No models configured.{" "}
                {hasFetchConfig ? "Use Browse All Models to add some." : ""}
              </p>
            ) : (
              allProviderModels.map((model) => {
                const isFree = model.type?.toLowerCase().includes("free");
                return (
                  <label
                    key={model.id}
                    className="flex items-center justify-between p-3 bg-app/50 border border-border-main rounded-xl cursor-pointer hover:border-accent/30 transition-all group"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-card-text group-hover:text-card-text-hover">
                          {model.name}
                        </span>
                        {model.isFetched && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-accent/60 bg-accent/10 px-1.5 py-0.5 rounded-full">
                            Custom
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] ${isFree ? "text-green-500/80" : "text-orange-400"}`}
                      >
                        {model.type}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={enabledModels.includes(model.id)}
                      onChange={(e) =>
                        onModelToggle(model.id, e.target.checked)
                      }
                      className="w-4 h-4 rounded border-border-main text-accent focus:ring-accent accent-accent"
                    />
                  </label>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ==========================================
// SETTINGS PAGE
// ==========================================
export const SettingsPage = () => {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enabledModelIds, setEnabledModelIds] = useState([]);
  const [fetchedModels, setFetchedModels] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState("providers");
  const [activeProvider, setActiveProvider] = useState(null);

  const uniqueProviders = [...new Set(MODEL_REGISTRY.map((m) => m.provider))];

  const filteredProviders = uniqueProviders.filter((p) =>
    p.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const allModelsForSearch = [
    ...MODEL_REGISTRY,
    ...fetchedModels.filter(
      (fm) => !MODEL_REGISTRY.find((m) => m.id === fm.id),
    ),
  ];

  const filteredModels = allModelsForSearch.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.provider.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const fetchSettingsData = async () => {
    try {
      setLoading(true);
      const [userKeys, enabledIds, userFetchedModels] = await Promise.all([
        getAllUserKeys(),
        getEnabledModels(),
        getUserFetchedModels(),
      ]);
      setKeys(userKeys);
      setEnabledModelIds(enabledIds);
      setFetchedModels(userFetchedModels);
    } catch (error) {
      console.error("Failed to load settings", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsData();
  }, []);

  const handleModelToggle = async (modelId, isChecked) => {
    setEnabledModelIds((prev) =>
      isChecked ? [...prev, modelId] : prev.filter((id) => id !== modelId),
    );
    await toggleModelEnabled(modelId, isChecked);
  };

  const handleModelFetched = (model) => {
    setFetchedModels((prev) => {
      if (prev.find((m) => m.id === model.id)) return prev;
      return [...prev, model];
    });
  };

  const handleOptimisticActivation = async (providerName, keyId) => {
    setKeys((prevKeys) =>
      prevKeys.map((k) => {
        if (k.provider === providerName) {
          return { ...k, is_active: k.id === keyId };
        }
        return k;
      }),
    );
    try {
      await setActiveKey(providerName, keyId);
    } catch (error) {
      console.error("Database failed to update:", error);
      fetchSettingsData();
    }
  };

  const getKeysForProvider = (providerName) =>
    keys.filter((k) => k.provider === providerName);

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
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Toggle Pill */}
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

                {/* Search Bar */}
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

                {/* Results List */}
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
                          <div className="flex items-center gap-3">
                            <span className="text-[15px] font-medium text-card-text group-hover:text-accent transition-colors">
                              {providerName}
                            </span>
                            {PROVIDER_FETCH_CONFIG[providerName] && (
                              <span className="text-[10px] font-medium text-accent/70 bg-accent/10 px-2 py-0.5 rounded-full">
                                Browse available
                              </span>
                            )}
                          </div>
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
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-medium text-card-text group-hover:text-accent transition-colors">
                              {model.name}
                            </span>
                            {model.isFetched && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-accent/60 bg-accent/10 px-1.5 py-0.5 rounded-full">
                                Custom
                              </span>
                            )}
                          </div>
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
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <button
                  onClick={() => setActiveProvider(null)}
                  className="flex items-center gap-2 text-[13px] font-medium text-placeholder hover:text-card-text transition-colors mb-4 group"
                >
                  <ArrowLeft
                    size={16}
                    className="group-hover:-translate-x-1 transition-transform"
                  />
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
                  fetchedModels={fetchedModels}
                  onModelFetched={handleModelFetched}
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
