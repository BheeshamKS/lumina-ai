import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import type { LucideIcon } from "lucide-react";
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
  Menu,
  ExternalLink,
} from "lucide-react";
import { supabase } from "../utils/supabase";
import { ToggleSwitch } from "../components/toggleSwitch";
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
import type { ApiKeyRecord, ModelEntry, UserProfile } from "../types";

// ==========================================
// BROWSE MODELS POPUP
// ==========================================
interface BrowseModelsPopupProps {
  providerName: string;
  activeKey: string;
  enabledModels: string[];
  onModelToggle: (id: string, checked: boolean) => void;
  onClose: () => void;
  onModelFetched: (model: ModelEntry) => void;
}

const BrowseModelsPopup = ({
  providerName,
  activeKey,
  enabledModels,
  onModelToggle,
  onClose,
  onModelFetched,
}: BrowseModelsPopupProps) => {
  const [fetchedModels, setFetchedModels] = useState<ModelEntry[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [hasFetched, setHasFetched] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [dragY, setDragY] = useState(0);
  const touchStartY = useRef<number | null>(null);

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
      setFetchError(err instanceof Error ? err.message : "Failed to fetch models.");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (config && activeKey) handleFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async (model: ModelEntry, checked: boolean) => {
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

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0) setDragY(diff);
  };

  const handleTouchEnd = () => {
    if (dragY > 150) handleClose();
    setDragY(0);
    touchStartY.current = null;
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200"
    >
      <div
        className="bg-card border border-border-main rounded-t-2xl sm:rounded-2xl w-full sm:max-w-xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[82vh] animate-in slide-in-from-bottom-4 duration-300"
        style={{
          transform: `translateY(${isClosing ? "100%" : `${dragY}px`})`,
          transition:
            dragY > 0 ? "none" : "transform 300ms cubic-bezier(0.4,0,0.2,1)",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-border-hover" />
        </div>

        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border-main shrink-0">
          <div>
            <h3 className="text-[17px] font-semibold text-card-text">
              Browse {providerName} Models
            </h3>
            <p className="text-[12px] text-placeholder mt-0.5">
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
              <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg text-placeholder hover:text-card-text hover:bg-card-hover transition-colors"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="px-4 py-3 border-b border-border-main shrink-0 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-placeholder" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search models..."
              className="w-full bg-app border border-border-main rounded-xl pl-9 pr-4 py-2 text-[13px] text-card-text outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="flex gap-2 items-center">
            {["all", "free", "paid"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium capitalize transition-all ${filter === f ? "bg-accent text-white" : "bg-app border border-border-main text-placeholder hover:text-card-text"}`}
              >
                {f}
              </button>
            ))}
            <span className="ml-auto text-[11px] text-placeholder">
              {filtered.length} shown
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1 no-scrollbar">
          {isFetching && !hasFetched ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RefreshCw size={22} className="animate-spin text-accent" />
              <p className="text-[13px] text-placeholder">
                Fetching from {providerName}...
              </p>
            </div>
          ) : fetchError ? (
            <div className="p-6 text-center">
              <p className="text-[13px] text-red-400 mb-3">{fetchError}</p>
              <button onClick={handleFetch} className="text-[12px] text-accent hover:underline">
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-placeholder">
              No models match your search.
            </div>
          ) : (
            filtered.map((model) => {
              const isEnabled = enabledModels.includes(model.id);
              const isFree = model.type?.toLowerCase().includes("free");
              return (
                <label
                  key={model.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer hover:bg-card-hover transition-all"
                >
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0 mr-3">
                    <span className="text-[13px] font-medium text-card-text truncate">
                      {model.name}
                    </span>
                    <span className="text-[10px] font-mono text-placeholder truncate">
                      {model.id}
                    </span>
                    <span className={`text-[10px] font-medium mt-0.5 ${isFree ? "text-green-500/80" : "text-orange-400"}`}>
                      {model.type}
                    </span>
                  </div>
                  <ToggleSwitch
                    isOn={isEnabled}
                    onToggle={() => handleToggle(model, !isEnabled)}
                  />
                </label>
              );
            })
          )}
        </div>

        <div className="px-5 py-3 border-t border-border-main shrink-0">
          <p className="text-[11px] text-placeholder">
            Selected models appear in your model selector.
          </p>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// BROWSE ALL MODELS BUTTON
// ==========================================
interface BrowseAllButtonProps {
  onClick: () => void;
  disabled: boolean;
}

const BrowseAllButton = ({ onClick, disabled }: BrowseAllButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`group flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-[13px] font-medium ${
      disabled
        ? "border-border-main text-placeholder cursor-not-allowed opacity-60"
        : "border-accent/40 text-accent hover:bg-accent hover:text-white hover:border-accent hover:shadow-sm active:scale-95"
    }`}
  >
    <Package size={14} className="shrink-0" />
    <span>Browse All Models</span>
    {!disabled && (
      <ExternalLink size={12} className="opacity-60 group-hover:opacity-100 transition-opacity" />
    )}
  </button>
);

// ==========================================
// PROVIDER CARD
// ==========================================
interface ProviderCardProps {
  name: string;
  savedKeys: ApiKeyRecord[];
  onRefresh: () => void;
  onActivate: (provider: string, keyId: string) => void;
  enabledModels: string[];
  onModelToggle: (id: string, checked: boolean) => void;
  allModels: ModelEntry[];
  fetchedModels: ModelEntry[];
  onModelFetched: (model: ModelEntry) => void;
}

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
}: ProviderCardProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
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

  const handleEditSave = async (k: ApiKeyRecord) => {
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

      <div className="bg-card border border-border-main rounded-2xl p-5 shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-[16px] font-semibold text-card-text">{name}</h3>
          {activeKey ? (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-accent bg-accent/10 px-2.5 py-1 rounded-full">
              <CheckCircle2 size={12} /> Active
            </span>
          ) : (
            <span className="text-[11px] text-placeholder bg-card-hover px-2.5 py-1 rounded-full">
              No key
            </span>
          )}
        </div>

        {hasKeys && (
          <div className="mb-4 space-y-2">
            {savedKeys.map((k, i) => (
              <div key={k.id} className="bg-app border border-border-main p-3.5 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => onActivate(name, k.id)}
                      className={`${k.is_active ? "text-accent" : "text-placeholder hover:text-card-text"} transition-colors`}
                    >
                      {k.is_active ? (
                        <CheckCircle2 size={17} />
                      ) : (
                        <Circle size={17} />
                      )}
                    </button>
                    <span className="text-[13px] text-card-text font-medium">
                      {k.key_name || `Key ${i + 1}`}
                    </span>
                    {k.is_active && (
                      <span className="text-[9px] text-accent uppercase tracking-wider font-bold">
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
                      className="text-[12px] text-placeholder hover:text-card-text flex items-center gap-1 transition-colors"
                    >
                      <Edit2 size={12} /> Edit
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
                      className="flex-1 bg-transparent border-b border-border-main pb-1 text-[12px] text-primary outline-none focus:border-accent font-mono min-w-0"
                    />
                    <button
                      onClick={() => handleEditSave(k)}
                      disabled={isSaving}
                      className="px-3 py-1.5 bg-user-bubble text-user-bubble-text rounded-lg text-[11px] font-medium disabled:opacity-50 shrink-0"
                    >
                      {isSaving ? "..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingKeyId(null)}
                      className="p-1.5 text-placeholder hover:text-card-text shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!hasKeys || isAdding ? (
          <div className="space-y-3 bg-app p-4 rounded-xl border border-border-main mb-4">
            <input
              type="password"
              value={newKeyValue}
              onChange={(e) => setNewKeyValue(e.target.value)}
              placeholder={`Paste your ${name} API key...`}
              className="w-full bg-transparent border-b border-border-main pb-2 text-[13px] text-primary outline-none focus:border-accent font-mono"
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleAdd}
                disabled={isSaving || !newKeyValue.trim()}
                className="flex-1 bg-user-bubble text-user-bubble-text py-2 rounded-xl text-[12px] font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {isSaving ? "Saving..." : "Save Key"}
              </button>
              {hasKeys && (
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-2 border border-border-main text-placeholder rounded-xl text-[12px] hover:bg-card-hover transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 text-[12px] text-accent hover:underline font-medium mb-4"
          >
            <Plus size={14} /> Add secondary key
          </button>
        )}

        <div className="pt-4 border-t border-border-main/50">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-placeholder">
              Enabled Models
            </h4>
            {hasFetchConfig && (
              <BrowseAllButton
                onClick={() => setShowBrowse(true)}
                disabled={!activeKey}
              />
            )}
          </div>
          {!activeKey && hasFetchConfig && (
            <p className="text-[11px] text-placeholder mb-2 italic">
              Add a key above to browse all available models.
            </p>
          )}
          <div className="space-y-2">
            {allProviderModels.length === 0 ? (
              <p className="text-[12px] text-placeholder py-1">
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
                    className="flex items-center justify-between p-3 bg-app/50 border border-border-main rounded-xl cursor-pointer hover:border-accent/30 transition-all"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1 mr-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium text-card-text truncate">
                          {model.name}
                        </span>
                        {model.isFetched && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-accent/60 bg-accent/10 px-1.5 py-0.5 rounded-full shrink-0">
                            Custom
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] ${isFree ? "text-green-500/80" : "text-orange-400"}`}>
                        {model.type}
                      </span>
                    </div>
                    <ToggleSwitch
                      isOn={enabledModels.includes(model.id)}
                      onToggle={() =>
                        onModelToggle(model.id, !enabledModels.includes(model.id))
                      }
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
interface AccountSectionProps {
  session: Session;
}

const AccountSection = ({ session }: AccountSectionProps) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const authFullName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    "";

  const fallbackFirstName = authFullName
    ? authFullName.split(" ")[0]
    : session?.user?.email?.split("@")[0] || "User";

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user) return;
      try {
        const { data, error } = await supabase
          .from("users")
          .select("nickname")
          .eq("id", session.user.id)
          .single();

        if (!error && data && (data as UserProfile).nickname) {
          setProfile(data as UserProfile);
          setNewName((data as UserProfile).nickname!);
        } else {
          setNewName(fallbackFirstName);
          setProfile({ nickname: fallbackFirstName });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [session, fallbackFirstName]);

  const handleSaveName = async () => {
    if (!newName.trim() || !session?.user) return;
    setIsSavingName(true);
    try {
      await supabase
        .from("users")
        .upsert({ id: session.user.id, nickname: newName.trim() });

      setProfile((prev) => ({ ...(prev ?? {}), nickname: newName.trim() }));
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

  const getInitials = (name: string) => {
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

  const preferredName = profile?.nickname || fallbackFirstName;
  const displayFullName =
    authFullName || session?.user?.email?.split("@")[0] || "User";

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border-main rounded-2xl p-5">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border-main">
          <div className="w-14 h-14 bg-[#2c2a27] dark:bg-[#c2c0b6] text-white dark:text-[#1a1918] rounded-full flex items-center justify-center text-[18px] font-medium shrink-0 select-none">
            {getInitials(displayFullName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[17px] font-semibold text-card-text truncate leading-tight block">
              {displayFullName}
            </p>
            <p className="text-[12px] text-placeholder mt-0.5 truncate block">
              {session?.user?.email}
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <label className="block text-[11px] font-semibold uppercase tracking-widest text-placeholder">
            Full Name
          </label>
          <div className="px-3 py-2.5 bg-app border border-border-main rounded-xl overflow-hidden flex min-w-0">
            <span className="text-[14px] text-card-text truncate block w-full">
              {authFullName || (
                <span className="text-placeholder italic text-[13px]">
                  Not provided by auth provider
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-widest text-placeholder">
            What should Lumina call you?
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
                    setNewName(preferredName);
                  }
                }}
                autoFocus
                className="flex-1 min-w-0 bg-app border border-accent rounded-xl px-3 py-2 text-[14px] text-card-text outline-none"
              />
              <button
                onClick={handleSaveName}
                disabled={isSavingName || !newName.trim()}
                className="px-4 py-2 bg-accent text-white rounded-xl text-[12px] font-medium disabled:opacity-50 hover:opacity-90 shrink-0"
              >
                {isSavingName ? "..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setIsEditingName(false);
                  setNewName(preferredName);
                }}
                className="p-2 text-placeholder hover:text-card-text hover:bg-card-hover rounded-xl transition-colors shrink-0"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 py-2.5 bg-app border border-border-main rounded-xl group">
              <span className="text-[14px] text-card-text truncate flex-1 pr-2">
                {preferredName}
              </span>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {nameSaved && (
                  <span className="flex items-center gap-1 text-[11px] text-green-500 animate-in fade-in duration-200">
                    <Check size={12} /> Saved
                  </span>
                )}
                <button
                  onClick={() => setIsEditingName(true)}
                  className="flex items-center gap-1 text-[12px] text-placeholder hover:text-card-text transition-colors"
                >
                  <Edit2 size={12} /> Edit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border-main rounded-2xl p-5">
        <label className="block text-[11px] font-semibold uppercase tracking-widest text-placeholder mb-2.5">
          Email Address
        </label>
        <div className="px-3 py-2.5 bg-app border border-border-main rounded-xl overflow-hidden flex min-w-0">
          <span className="text-[13px] text-card-text truncate block w-full">
            {session?.user?.email}
          </span>
        </div>
        <p className="text-[11px] text-placeholder mt-2 leading-relaxed">
          Email is managed by your auth provider and cannot be changed here.
        </p>
      </div>

      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 py-3 bg-card border border-border-main rounded-2xl text-[14px] font-medium text-card-text hover:bg-card-hover transition-colors"
      >
        <LogOut size={15} /> Sign out
      </button>
    </div>
  );
};

// ==========================================
// APPEARANCE SECTION
// ==========================================
interface AppearanceSectionProps {
  darkMode: boolean;
  onToggleDark: (val: boolean) => void;
}

const AppearanceSection = ({ darkMode, onToggleDark }: AppearanceSectionProps) => (
  <div className="space-y-4">
    <div className="bg-card border border-border-main rounded-2xl p-5">
      <h3 className="text-[15px] font-semibold text-card-text mb-4">Theme</h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            id: false as boolean,
            label: "Light",
            Icon: Sun as LucideIcon,
            preview: (
              <div className="w-full h-16 rounded-xl bg-[#f5f4f0] border border-[#e0ddd5] flex flex-col gap-1.5 p-2.5 overflow-hidden">
                <div className="w-1/2 h-1.5 bg-[#2c2a27]/30 rounded-full" />
                <div className="w-3/4 h-1.5 bg-[#2c2a27]/15 rounded-full" />
                <div className="w-2/3 h-1.5 bg-[#2c2a27]/15 rounded-full" />
              </div>
            ),
          },
          {
            id: true as boolean,
            label: "Dark",
            Icon: Moon as LucideIcon,
            preview: (
              <div className="w-full h-16 rounded-xl bg-[#1a1918] border border-[#2c2a27] flex flex-col gap-1.5 p-2.5 overflow-hidden">
                <div className="w-1/2 h-1.5 bg-white/25 rounded-full" />
                <div className="w-3/4 h-1.5 bg-white/10 rounded-full" />
                <div className="w-2/3 h-1.5 bg-white/10 rounded-full" />
              </div>
            ),
          },
        ].map(({ id, label, Icon, preview }) => (
          <button
            key={label}
            onClick={() => onToggleDark(id)}
            className={`relative flex flex-col items-center gap-2.5 p-3.5 rounded-2xl border-2 transition-all ${darkMode === id ? "border-accent bg-accent/5" : "border-border-main hover:border-border-hover bg-app/40"}`}
          >
            {preview}
            <div className="flex items-center gap-1.5">
              <Icon size={14} className={darkMode === id ? "text-accent" : "text-placeholder"} />
              <span className={`text-[13px] font-medium ${darkMode === id ? "text-accent" : "text-placeholder"}`}>
                {label}
              </span>
            </div>
            {darkMode === id && (
              <CheckCircle2 size={14} className="absolute top-2.5 right-2.5 text-accent" />
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
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabledModelIds, setEnabledModelIds] = useState<string[]>([]);
  const [fetchedModels, setFetchedModels] = useState<ModelEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

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

  const handleModelToggle = async (modelId: string, isChecked: boolean) => {
    setEnabledModelIds((prev) =>
      isChecked ? [...prev, modelId] : prev.filter((id) => id !== modelId),
    );
    await toggleModelEnabled(modelId, isChecked);
  };

  const handleModelFetched = (model: ModelEntry) => {
    setFetchedModels((prev) =>
      prev.find((m) => m.id === model.id) ? prev : [...prev, model],
    );
  };

  const handleOptimisticActivation = async (providerName: string, keyId: string) => {
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
          className="flex items-center gap-2 text-[13px] font-medium text-placeholder hover:text-card-text transition-colors mb-4 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />{" "}
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
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-placeholder" />
        <input
          type="text"
          placeholder="Search providers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card border border-border-main rounded-xl pl-10 pr-4 py-2.5 text-[13px] text-card-text outline-none focus:border-accent transition-colors"
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
              className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-card-hover transition-colors text-left group ${index !== filteredProviders.length - 1 ? "border-b border-border-main" : ""}`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[14px] font-medium text-card-text group-hover:text-card-text-hover">
                  {providerName}
                </span>
                {PROVIDER_FETCH_CONFIG[providerName] && (
                  <span className="text-[9px] font-medium text-accent/70 bg-accent/10 px-1.5 py-0.5 rounded-full">
                    Browseable
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                {isConfigured ? (
                  <span className="text-[12px] text-accent font-medium">Active</span>
                ) : (
                  <span className="text-[12px] text-placeholder">No key</span>
                )}
                <ChevronRight size={15} className="text-placeholder group-hover:text-card-text transition-colors" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-4 bg-accent/5 border border-accent/20 rounded-2xl">
        <p className="text-[12px] text-placeholder leading-relaxed">
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
interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: "account", label: "Account", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "models", label: "Models & APIs", icon: Key },
];

const URL_TO_SECTION: Record<string, string> = {
  account: "account",
  appearance: "appearance",
  providers: "models",
};

const SECTION_TO_URL: Record<string, string> = {
  account: "/settings/account",
  appearance: "/settings/appearance",
  models: "/settings/providers",
};

interface SettingsPageProps {
  darkMode: boolean;
  onToggleDark: (val: boolean) => void;
  session: Session;
  setSidebarOpen?: (val: boolean) => void;
}

export const SettingsPage = ({
  darkMode,
  onToggleDark,
  session,
  setSidebarOpen,
}: SettingsPageProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const urlSegment = location.pathname.split("/settings/")[1];
  const isRootSettings = !urlSegment;
  const activeSection = URL_TO_SECTION[urlSegment] ?? "account";
  const activeSectionLabel = NAV_ITEMS.find((n) => n.id === activeSection)?.label;

  const goToSection = (id: string) => {
    navigate(SECTION_TO_URL[id]);
  };

  const displayName =
    session?.user?.user_metadata?.["Display name"] ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    session?.user?.email?.split("@")[0] ||
    "User";

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="w-full h-full flex bg-app overflow-hidden">
      {/* ── DESKTOP LEFT SIDEBAR ── */}
      <div className="hidden md:flex w-64 shrink-0 border-r border-border-main bg-card flex-col pt-12 pb-8 px-4 z-10">
        <div className="mb-6 px-2">
          <button
            onClick={() => navigate("/new")}
            className="flex items-center gap-2 text-[13px] text-placeholder hover:text-card-text transition-colors group mb-7"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />{" "}
            Back to Chat
          </button>
          <h2 className="text-[28px] font-semibold text-card-text font-serif">
            Settings
          </h2>
        </div>

        <nav className="flex flex-col gap-1 overflow-y-auto no-scrollbar">
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
              <Icon size={16} className={activeSection === id ? "text-accent" : "text-placeholder"} />
              <span className="text-[14px]">{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* ── CONTENT AREA ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col w-full h-full">
        {/* MOBILE ROOT SETTINGS HUB */}
        {isMobile && isRootSettings && (
          <div className="flex flex-col w-full h-full animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border-main bg-card shrink-0">
              <button
                onClick={() => setSidebarOpen?.(true)}
                className="p-2 -ml-2 text-placeholder hover:text-card-text transition-colors"
              >
                <Menu size={24} />
              </button>
              <h2 className="text-[18px] font-semibold text-card-text font-serif">
                Settings
              </h2>
              <div className="w-10" />
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-card border border-border-main rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-4 p-5 border-b border-border-main">
                  <div className="w-14 h-14 bg-[#2c2a27] dark:bg-[#c2c0b6] text-white dark:text-[#1a1918] rounded-full flex items-center justify-center text-[18px] font-medium shrink-0">
                    {getInitials(displayName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-semibold text-card-text truncate">
                      {displayName}
                    </p>
                    <p className="text-[12px] text-placeholder truncate mt-0.5">
                      {session?.user?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => goToSection("account")}
                  className="w-full flex items-center justify-between p-4 hover:bg-card-hover transition-colors group"
                >
                  <div className="flex items-center gap-3 text-card-text group-hover:text-card-text-hover">
                    <User size={18} className="text-placeholder group-hover:text-accent transition-colors" />
                    <span className="text-[15px] font-medium">Account Settings</span>
                  </div>
                  <ChevronRight size={18} className="text-placeholder" />
                </button>
              </div>

              <div className="bg-card border border-border-main rounded-2xl overflow-hidden shadow-sm">
                {NAV_ITEMS.filter((n) => n.id !== "account").map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => goToSection(item.id)}
                      className={`w-full flex items-center justify-between p-4 hover:bg-card-hover transition-colors group ${
                        idx !== 0 ? "border-t border-border-main" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 text-card-text group-hover:text-card-text-hover">
                        <Icon size={18} className="text-placeholder group-hover:text-accent transition-colors" />
                        <span className="text-[15px] font-medium">{item.label}</span>
                      </div>
                      <ChevronRight size={18} className="text-placeholder" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* DETAIL VIEWS */}
        {(!isMobile || !isRootSettings) && (
          <div className="max-w-2xl mx-auto w-full px-4 md:px-8 pt-4 md:pt-14 pb-24 animate-in fade-in slide-in-from-right-4 md:slide-in-from-bottom-2 duration-300">
            {isMobile && !isRootSettings && (
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => navigate("/settings")}
                  className="p-2 -ml-2 flex items-center gap-2 text-[14px] font-medium text-placeholder hover:text-card-text transition-colors group"
                >
                  <ArrowLeft size={24} className="group-hover:-translate-x-0.5 transition-transform" />{" "}
                </button>
                <h1 className="text-[18px] font-semibold text-card-text font-serif">
                  {activeSectionLabel}
                </h1>
                <div className="w-10" />
              </div>
            )}

            <div className="hidden md:block mb-8">
              <h1 className="text-[30px] font-semibold text-card-text font-serif">
                {activeSectionLabel}
              </h1>
            </div>

            {activeSection === "account" && (
              <AccountSection session={session} />
            )}
            {activeSection === "appearance" && (
              <AppearanceSection darkMode={darkMode} onToggleDark={onToggleDark} />
            )}
            {activeSection === "models" && <ModelsSection />}
          </div>
        )}
      </div>
    </div>
  );
};
