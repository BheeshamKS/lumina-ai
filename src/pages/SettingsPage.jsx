import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  User,
  Palette,
  Key,
  ChevronRight,
  ArrowLeft,
  LogOut,
  CheckCircle2,
  Circle,
  Plus,
  Search,
  Edit2,
  X,
  RefreshCw,
  Package,
  Moon,
  Sun,
  Check,
} from "lucide-react";
import { supabase } from "../utils/supabase";
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
  const [filter, setFilter] = useState("all");
  const [hasFetched, setHasFetched] = useState(false);

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
      setFetchedModels(config.parseModels(data));
      setHasFetched(true);
    } catch (err) {
      setFetchError(err.message || "Failed to fetch models.");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (config && activeKey) handleFetch();
  }, []);

  const handleToggle = async (model, checked) => {
    if (checked) {
      await saveFetchedModel(model);
      onModelFetched(model);
    } else await removeFetchedModel(model.id);
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
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-card border border-border-main rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[82vh] animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-main shrink-0">
          <div>
            <h3 className="text-[18px] font-semibold text-card-text">
              Browse {providerName} Models
            </h3>
            <p className="text-[13px] text-placeholder mt-0.5">
              {hasFetched
                ? `${fetchedModels.length} models available`
                : "Fetching from API..."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleFetch}
              disabled={isFetching}
              className="p-2 rounded-lg text-placeholder hover:text-card-text hover:bg-card-hover transition-colors disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={isFetching ? "animate-spin" : ""}
              />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-placeholder hover:text-card-text hover:bg-card-hover transition-colors"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-border-main shrink-0 space-y-2.5">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-placeholder"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search models..."
              className="w-full bg-app border border-border-main rounded-xl pl-10 pr-4 py-2.5 text-[14px] text-card-text outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {["all", "free", "paid"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-[12px] font-medium capitalize transition-all ${filter === f ? "bg-accent text-white" : "bg-app border border-border-main text-placeholder hover:text-card-text"}`}
              >
                {f}
              </button>
            ))}
            <span className="ml-auto text-[12px] text-placeholder self-center">
              {filtered.length} shown
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1 no-scrollbar">
          {isFetching && !hasFetched ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RefreshCw size={22} className="animate-spin text-accent" />
              <p className="text-[14px] text-placeholder">
                Fetching from {providerName}...
              </p>
            </div>
          ) : fetchError ? (
            <div className="p-6 text-center">
              <p className="text-[14px] text-red-400 mb-3">{fetchError}</p>
              <button
                onClick={handleFetch}
                className="text-[13px] text-accent hover:underline"
              >
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-[14px] text-placeholder">
              No models match your search.
            </div>
          ) : (
            filtered.map((model) => {
              const isEnabled = enabledModels.includes(model.id);
              const isFree = model.type?.toLowerCase().includes("free");
              return (
                <label
                  key={model.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer hover:bg-card-hover transition-all group"
                >
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0 mr-4">
                    <span className="text-[14px] font-medium text-card-text truncate">
                      {model.name}
                    </span>
                    <span className="text-[11px] font-mono text-placeholder truncate">
                      {model.id}
                    </span>
                    <span
                      className={`text-[11px] font-medium mt-0.5 ${isFree ? "text-green-500/80" : "text-orange-400"}`}
                    >
                      {model.type}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => handleToggle(model, e.target.checked)}
                    className="w-4 h-4 rounded border-border-main accent-accent shrink-0"
                  />
                </label>
              );
            })
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-border-main shrink-0">
          <p className="text-[12px] text-placeholder">
            Selected models are saved to your account and appear in the model
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
  savedKeys,
  onRefresh,
  onActivate,
  enabledModels,
  onModelToggle,
  allModels,
  fetchedModels,
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

  const registryModels = allModels.filter(
    (m) => m.provider === name && !m.isGuestModel,
  );
  const fetchedForProvider = fetchedModels.filter((m) => m.provider === name);
  const fetchedIds = new Set(fetchedForProvider.map((m) => m.id));
  const allProviderModels = [
    ...registryModels.filter((m) => !fetchedIds.has(m.id)),
    ...fetchedForProvider,
  ];

  const handleAdd = async () => {
    if (!newKeyValue.trim()) return;
    setIsSaving(true);
    try {
      await addApiKey(name, newKeyValue.trim(), `Key ${savedKeys.length + 1}`);
      setNewKeyValue("");
      setIsAdding(false);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSave = async (k) => {
    setIsSaving(true);
    try {
      if (!editKeyValue.trim()) await deleteApiKey(k.id);
      else await updateApiKey(k.id, editKeyValue.trim());
      setEditingKeyId(null);
      setEditKeyValue("");
      onRefresh();
    } catch (e) {
      console.error(e);
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

      <div className="bg-card border border-border-main rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[17px] font-semibold text-card-text">{name}</h3>
          {activeKey ? (
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-accent bg-accent/10 px-3 py-1.5 rounded-full">
              <CheckCircle2 size={13} /> Active
            </span>
          ) : (
            <span className="text-[12px] text-placeholder bg-card-hover px-3 py-1.5 rounded-full">
              Not configured
            </span>
          )}
        </div>

        {hasKeys && (
          <div className="mb-5 space-y-2.5">
            {savedKeys.map((k, i) => (
              <div
                key={k.id}
                className="bg-app border border-border-main p-4 rounded-xl"
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
                      {k.key_name || `Key ${i + 1}`}
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
                      className="text-[13px] text-placeholder hover:text-card-text flex items-center gap-1.5 transition-colors"
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                  )}
                </div>
                {editingKeyId === k.id && (
                  <div className="flex gap-2 items-center mt-3 pt-3 border-t border-border-main/50">
                    <input
                      type="password"
                      value={editKeyValue}
                      onChange={(e) => setEditKeyValue(e.target.value)}
                      placeholder="Paste new key (blank to delete)"
                      className="flex-1 bg-transparent border-b border-border-main pb-1 text-[13px] text-primary outline-none focus:border-accent font-mono"
                    />
                    <button
                      onClick={() => handleEditSave(k)}
                      disabled={isSaving}
                      className="px-3 py-1.5 bg-user-bubble text-user-bubble-text rounded-lg text-[12px] font-medium disabled:opacity-50"
                    >
                      {isSaving ? "..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingKeyId(null)}
                      className="p-1.5 text-placeholder hover:text-card-text"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!hasKeys || isAdding ? (
          <div className="space-y-3 bg-app p-4 rounded-xl border border-border-main mb-5">
            <input
              type="password"
              value={newKeyValue}
              onChange={(e) => setNewKeyValue(e.target.value)}
              placeholder={`Paste your ${name} API key...`}
              className="w-full bg-transparent border-b border-border-main pb-2 text-[14px] text-primary outline-none focus:border-accent font-mono"
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleAdd}
                disabled={isSaving || !newKeyValue.trim()}
                className="flex-1 bg-user-bubble text-user-bubble-text py-2 rounded-xl text-[13px] font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {isSaving ? "Saving..." : "Save Key"}
              </button>
              {hasKeys && (
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 border border-border-main text-placeholder rounded-xl text-[13px] hover:bg-card-hover transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 text-[13px] text-accent hover:underline font-medium mb-5"
          >
            <Plus size={15} /> Add secondary key
          </button>
        )}

        <div className="pt-5 border-t border-border-main/50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-placeholder">
              Enabled Models
            </h4>
            {hasFetchConfig &&
              (activeKey ? (
                <button
                  onClick={() => setShowBrowse(true)}
                  className="flex items-center gap-1.5 text-[13px] text-accent hover:underline font-medium"
                >
                  <Package size={13} /> Browse All Models
                </button>
              ) : (
                <span className="text-[12px] text-placeholder">
                  Add a key to browse models
                </span>
              ))}
          </div>
          <div className="space-y-2">
            {allProviderModels.length === 0 ? (
              <p className="text-[13px] text-placeholder py-1">
                {hasFetchConfig
                  ? "Use Browse All Models to add some."
                  : "No models available."}
              </p>
            ) : (
              allProviderModels.map((model) => {
                const isFree = model.type?.toLowerCase().includes("free");
                return (
                  <label
                    key={model.id}
                    className="flex items-center justify-between p-3.5 bg-app/50 border border-border-main rounded-xl cursor-pointer hover:border-accent/30 transition-all group"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-medium text-card-text">
                          {model.name}
                        </span>
                        {model.isFetched && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-accent/60 bg-accent/10 px-1.5 py-0.5 rounded-full">
                            Custom
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[11px] ${isFree ? "text-green-500/80" : "text-orange-400"}`}
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
                      className="w-4 h-4 rounded border-border-main accent-accent"
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
// ACCOUNT SECTION
// ==========================================
const AccountSection = ({ session }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user) return;
      try {
        // Try users table first
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (!error && data) {
          setProfile(data);
          setNewName(data?.["Display name"] || "");
        } else {
          // Fallback to auth metadata
          const metaName =
            session.user.user_metadata?.["Display name"] ||
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            "";
          setNewName(metaName);
          setProfile({ "Display name": metaName });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [session]);

  const handleSaveName = async () => {
    if (!newName.trim() || !session?.user) return;
    setIsSavingName(true);
    try {
      await supabase
        .from("users")
        .update({ "Display name": newName.trim() })
        .eq("id", session.user.id);
      setProfile((prev) => ({ ...prev, "Display name": newName.trim() }));
      setIsEditingName(false);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/new");
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading)
    return (
      <div className="animate-pulse text-placeholder text-sm py-12 text-center">
        Loading account...
      </div>
    );

  const displayName = profile?.["Display name"] || "";

  return (
    <div className="space-y-5">
      {/* Profile Card */}
      <div className="bg-card border border-border-main rounded-2xl p-6">
        {/* Avatar + Info */}
        <div className="flex items-center gap-5 mb-7 pb-7 border-b border-border-main">
          <div className="w-16 h-16 bg-[#2c2a27] dark:bg-[#c2c0b6] text-white dark:text-[#1a1918] rounded-full flex items-center justify-center text-[22px] font-medium shrink-0 select-none">
            {getInitials(displayName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[21px] font-semibold text-card-text truncate leading-tight">
              {displayName || (
                <span className="text-placeholder font-normal italic text-[18px]">
                  No name set
                </span>
              )}
            </p>
            <p className="text-[14px] text-placeholder mt-1">
              {session?.user?.email}
            </p>
          </div>
        </div>

        {/* Display Name Field */}
        <div className="space-y-2">
          <label className="block text-[12px] font-semibold uppercase tracking-widest text-placeholder">
            Display Name
          </label>
          {isEditingName ? (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") {
                    setIsEditingName(false);
                    setNewName(displayName);
                  }
                }}
                autoFocus
                className="flex-1 bg-app border border-accent rounded-xl px-4 py-2.5 text-[15px] text-card-text outline-none"
              />
              <button
                onClick={handleSaveName}
                disabled={isSavingName || !newName.trim()}
                className="px-5 py-2.5 bg-accent text-white rounded-xl text-[13px] font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {isSavingName ? "..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setIsEditingName(false);
                  setNewName(displayName);
                }}
                className="p-2.5 text-placeholder hover:text-card-text hover:bg-card-hover rounded-xl transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-4 py-3 bg-app border border-border-main rounded-xl group">
              <span className="text-[15px] text-card-text">
                {displayName || (
                  <span className="text-placeholder italic text-[14px]">
                    Not set
                  </span>
                )}
              </span>
              <div className="flex items-center gap-3">
                {nameSaved && (
                  <span className="flex items-center gap-1.5 text-[12px] text-green-500 animate-in fade-in duration-200">
                    <Check size={13} /> Saved
                  </span>
                )}
                <button
                  onClick={() => setIsEditingName(true)}
                  className="flex items-center gap-1.5 text-[13px] text-placeholder hover:text-card-text transition-colors"
                >
                  <Edit2 size={13} /> Edit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email (read-only) */}
      <div className="bg-card border border-border-main rounded-2xl p-6">
        <label className="block text-[12px] font-semibold uppercase tracking-widest text-placeholder mb-3">
          Email Address
        </label>
        <div className="px-4 py-3 bg-app border border-border-main rounded-xl">
          <span className="text-[15px] text-card-text">
            {session?.user?.email}
          </span>
        </div>
        <p className="text-[12px] text-placeholder mt-2.5 leading-relaxed">
          Email is managed by your auth provider and cannot be changed here.
        </p>
      </div>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-card border border-border-main rounded-2xl text-[15px] font-medium text-card-text hover:bg-card-hover transition-colors"
      >
        <LogOut size={16} /> Sign out
      </button>
    </div>
  );
};

// ==========================================
// APPEARANCE SECTION
// ==========================================
const AppearanceSection = ({ darkMode, onToggleDark }) => (
  <div className="space-y-5">
    <div className="bg-card border border-border-main rounded-2xl p-6">
      <h3 className="text-[16px] font-semibold text-card-text mb-5">Theme</h3>
      <div className="grid grid-cols-2 gap-4">
        {[
          {
            id: false,
            label: "Light",
            Icon: Sun,
            preview: (
              <div className="w-full h-20 rounded-xl bg-[#f5f4f0] border border-[#e0ddd5] flex flex-col gap-2 p-3 overflow-hidden">
                <div className="w-1/2 h-2 bg-[#2c2a27]/30 rounded-full" />
                <div className="w-3/4 h-2 bg-[#2c2a27]/15 rounded-full" />
                <div className="w-2/3 h-2 bg-[#2c2a27]/15 rounded-full" />
              </div>
            ),
          },
          {
            id: true,
            label: "Dark",
            Icon: Moon,
            preview: (
              <div className="w-full h-20 rounded-xl bg-[#1a1918] border border-[#2c2a27] flex flex-col gap-2 p-3 overflow-hidden">
                <div className="w-1/2 h-2 bg-white/25 rounded-full" />
                <div className="w-3/4 h-2 bg-white/10 rounded-full" />
                <div className="w-2/3 h-2 bg-white/10 rounded-full" />
              </div>
            ),
          },
        ].map(({ id, label, Icon, preview }) => (
          <button
            key={label}
            onClick={() => onToggleDark(id)}
            className={`relative flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${darkMode === id ? "border-accent bg-accent/5" : "border-border-main hover:border-border-hover bg-app/40"}`}
          >
            {preview}
            <div className="flex items-center gap-2">
              <Icon
                size={15}
                className={darkMode === id ? "text-accent" : "text-placeholder"}
              />
              <span
                className={`text-[14px] font-medium ${darkMode === id ? "text-accent" : "text-placeholder"}`}
              >
                {label}
              </span>
            </div>
            {darkMode === id && (
              <CheckCircle2
                size={15}
                className="absolute top-3 right-3 text-accent"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  </div>
);

// ==========================================
// MODELS & APIS SECTION
// ==========================================
const ModelsSection = () => {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enabledModelIds, setEnabledModelIds] = useState([]);
  const [fetchedModels, setFetchedModels] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeProvider, setActiveProvider] = useState(null);

  const uniqueProviders = [...new Set(MODEL_REGISTRY.map((m) => m.provider))];
  const filteredProviders = uniqueProviders.filter((p) =>
    p.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const fetchData = async () => {
    setLoading(true);
    const [userKeys, enabledIds, userFetchedModels] = await Promise.all([
      getAllUserKeys(),
      getEnabledModels(),
      getUserFetchedModels(),
    ]);
    setKeys(userKeys);
    setEnabledModelIds(enabledIds);
    setFetchedModels(userFetchedModels);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleModelToggle = async (modelId, isChecked) => {
    setEnabledModelIds((prev) =>
      isChecked ? [...prev, modelId] : prev.filter((id) => id !== modelId),
    );
    await toggleModelEnabled(modelId, isChecked);
  };

  const handleModelFetched = (model) => {
    setFetchedModels((prev) =>
      prev.find((m) => m.id === model.id) ? prev : [...prev, model],
    );
  };

  const handleOptimisticActivation = async (providerName, keyId) => {
    setKeys((prev) =>
      prev.map((k) =>
        k.provider === providerName ? { ...k, is_active: k.id === keyId } : k,
      ),
    );
    try {
      await setActiveKey(providerName, keyId);
    } catch {
      fetchData();
    }
  };

  if (loading)
    return (
      <div className="animate-pulse text-placeholder text-sm py-12 text-center">
        Loading...
      </div>
    );

  if (activeProvider)
    return (
      <div className="animate-in fade-in duration-200">
        <button
          onClick={() => setActiveProvider(null)}
          className="flex items-center gap-2 text-[13px] font-medium text-placeholder hover:text-card-text transition-colors mb-5 group"
        >
          <ArrowLeft
            size={15}
            className="group-hover:-translate-x-0.5 transition-transform"
          />{" "}
          All Providers
        </button>
        <ProviderCard
          name={activeProvider}
          savedKeys={keys.filter((k) => k.provider === activeProvider)}
          onRefresh={fetchData}
          onActivate={handleOptimisticActivation}
          enabledModels={enabledModelIds}
          onModelToggle={handleModelToggle}
          allModels={MODEL_REGISTRY}
          fetchedModels={fetchedModels}
          onModelFetched={handleModelFetched}
        />
      </div>
    );

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="relative">
        <Search
          size={15}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-placeholder"
        />
        <input
          type="text"
          placeholder="Search providers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card border border-border-main rounded-xl pl-11 pr-4 py-3 text-[14px] text-card-text outline-none focus:border-accent transition-colors"
        />
      </div>

      <div className="bg-card border border-border-main rounded-2xl overflow-hidden">
        {filteredProviders.map((providerName, index) => {
          const isConfigured = keys
            .filter((k) => k.provider === providerName)
            .some((k) => k.is_active);
          return (
            <button
              key={providerName}
              onClick={() => setActiveProvider(providerName)}
              className={`w-full flex items-center justify-between px-5 py-4 hover:bg-card-hover transition-colors text-left group ${index !== filteredProviders.length - 1 ? "border-b border-border-main" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-[15px] font-medium text-card-text group-hover:text-card-text-hover">
                  {providerName}
                </span>
                {PROVIDER_FETCH_CONFIG[providerName] && (
                  <span className="text-[10px] font-medium text-accent/70 bg-accent/10 px-2 py-0.5 rounded-full">
                    Browseable
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {isConfigured ? (
                  <span className="text-[13px] text-accent font-medium">
                    Active
                  </span>
                ) : (
                  <span className="text-[13px] text-placeholder">No key</span>
                )}
                <ChevronRight
                  size={16}
                  className="text-placeholder group-hover:text-card-text transition-colors"
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-5 bg-accent/5 border border-accent/20 rounded-2xl">
        <p className="text-[13px] text-placeholder leading-relaxed">
          Your API keys are encrypted and stored securely via Supabase RLS. No
          other user can access your keys.
        </p>
      </div>
    </div>
  );
};

// ==========================================
// MAIN SETTINGS PAGE
// ==========================================
const NAV_ITEMS = [
  { id: "account", label: "Account", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "models", label: "Models & APIs", icon: Key },
];

// Maps URL path segment → internal section id
const URL_TO_SECTION = {
  account: "account",
  appearance: "appearance",
  providers: "models",
};

// Maps internal section id → URL path
const SECTION_TO_URL = {
  account: "/settings/account",
  appearance: "/settings/appearance",
  models: "/settings/providers",
};

export const SettingsPage = ({ darkMode, onToggleDark, session }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Derive active section from the URL — defaults to "account"
  const urlSegment = location.pathname.split("/settings/")[1]; // e.g. "appearance"
  const activeSection = URL_TO_SECTION[urlSegment] ?? "account";

  const goToSection = (id) => navigate(SECTION_TO_URL[id]);

  return (
    <div className="w-full h-full flex bg-app overflow-hidden">
      {/* LEFT SIDEBAR NAV */}
      <div className="w-64 shrink-0 border-r border-border-main bg-card flex flex-col pt-14 pb-8 px-4">
        <div className="mb-8 px-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[13px] text-placeholder hover:text-card-text transition-colors group mb-7"
          >
            <ArrowLeft
              size={14}
              className="group-hover:-translate-x-0.5 transition-transform"
            />{" "}
            Back
          </button>
          <h2 className="text-[24px] font-semibold text-card-text font-serif">
            Settings
          </h2>
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => goToSection(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                activeSection === id
                  ? "bg-card-hover text-card-text-hover font-medium"
                  : "text-card-text hover:bg-card-hover/60"
              }`}
            >
              <Icon
                size={17}
                className={
                  activeSection === id ? "text-accent" : "text-placeholder"
                }
              />
              <span className="text-[15px]">{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* RIGHT CONTENT */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-2xl mx-auto px-8 pt-14 pb-28">
          <div className="mb-8">
            <h1 className="text-[30px] font-semibold text-card-text font-serif">
              {NAV_ITEMS.find((n) => n.id === activeSection)?.label}
            </h1>
          </div>

          {activeSection === "account" && <AccountSection session={session} />}
          {activeSection === "appearance" && (
            <AppearanceSection
              darkMode={darkMode}
              onToggleDark={onToggleDark}
            />
          )}
          {activeSection === "models" && <ModelsSection />}
        </div>
      </div>
    </div>
  );
};
