import { supabase } from "./supabase";
import type { ModelEntry } from "../types";

// ==========================================
// PROVIDER FETCH CONFIG
// ==========================================

interface ProviderFetchConfig {
  endpoint: string;
  authHeader: (key: string) => Record<string, string>;
  parseModels: (data: unknown) => ModelEntry[];
}

export const PROVIDER_FETCH_CONFIG: Record<string, ProviderFetchConfig> = {
  OpenRouter: {
    endpoint: "https://openrouter.ai/api/v1/models",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    parseModels: (data) => {
      const d = data as { data: Array<{ id: string; name?: string; pricing?: { prompt: string } }> };
      return d.data.map((m) => ({
        id: m.id,
        name: m.name || m.id,
        provider: "OpenRouter",
        type: m.pricing?.prompt === "0" ? "Free" : "Paid",
        isFetched: true,
      }));
    },
  },
  Google: {
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
    authHeader: (key) => ({ "x-goog-api-key": key }),
    parseModels: (data) => {
      const d = data as { models?: Array<{ name: string; displayName?: string; supportedGenerationMethods?: string[] }> };
      return (d.models || [])
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => ({
          id: m.name.replace("models/", ""),
          name: m.displayName || m.name,
          provider: "Google",
          type: "API",
          isFetched: true,
        }));
    },
  },
  Groq: {
    endpoint: "https://api.groq.com/openai/v1/models",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    parseModels: (data) => {
      const d = data as { data: Array<{ id: string }> };
      return d.data.map((m) => ({
        id: m.id,
        name: m.id,
        provider: "Groq",
        type: "Free",
        isFetched: true,
      }));
    },
  },
  OpenAI: {
    endpoint: "https://api.openai.com/v1/models",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    parseModels: (data) => {
      const d = data as { data: Array<{ id: string }> };
      return d.data
        .filter((m) => m.id.startsWith("gpt") || m.id.startsWith("o1") || m.id.startsWith("o3"))
        .map((m) => ({
          id: m.id,
          name: m.id,
          provider: "OpenAI",
          type: "Paid",
          isFetched: true,
        }));
    },
  },
  Mistral: {
    endpoint: "https://api.mistral.ai/v1/models",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    parseModels: (data) => {
      const d = data as { data: Array<{ id: string }> };
      return d.data.map((m) => ({
        id: m.id,
        name: m.id,
        provider: "Mistral",
        type: "Paid",
        isFetched: true,
      }));
    },
  },
  DeepSeek: {
    endpoint: "https://api.deepseek.com/models",
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    parseModels: (data) => {
      const d = data as { data: Array<{ id: string }> };
      return d.data.map((m) => ({
        id: m.id,
        name: m.id,
        provider: "DeepSeek",
        type: "Paid",
        isFetched: true,
      }));
    },
  },
};

// ==========================================
// MODEL REGISTRY
// ==========================================
export const MODEL_REGISTRY: ModelEntry[] = [
  // ── GOOGLE ──
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google", type: "Free (Fast)", isDefault: true },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google", type: "Free (Strict Limit)", isDefault: true },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "Google", type: "Free", isDefault: false },

  // ── OPENAI ──
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", type: "Paid (Flagship)", isDefault: true },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", type: "Paid (Cheap)", isDefault: false },
  { id: "o3-mini", name: "o3 Mini", provider: "OpenAI", type: "Paid (Reasoning)", isDefault: false },

  // ── GROQ ──
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "Groq", type: "Free (Fast)", isDefault: true },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", provider: "Groq", type: "Free (Ultra Fast)", isDefault: false },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout", provider: "Groq", type: "Free", isDefault: false },
  { id: "qwen/qwen3-32b", name: "Qwen 3 32B", provider: "Groq", type: "Free", isDefault: false },

  // ── DEEPSEEK ──
  { id: "deepseek-chat", name: "DeepSeek V3", provider: "DeepSeek", type: "Paid (Flagship)", isDefault: true },
  { id: "deepseek-reasoner", name: "DeepSeek R1", provider: "DeepSeek", type: "Paid (Reasoning)", isDefault: false },

  // ── MISTRAL ──
  { id: "mistral-large-latest", name: "Mistral Large", provider: "Mistral", type: "Paid (Flagship)", isDefault: true },
  { id: "codestral-latest", name: "Codestral", provider: "Mistral", type: "Paid (Coding)", isDefault: false },

  // ── xAI ──
  { id: "grok-2-latest", name: "Grok 2", provider: "xAI", type: "Paid (Flagship)", isDefault: true },

  // ── PERPLEXITY ──
  { id: "sonar-pro", name: "Sonar Pro", provider: "Perplexity", type: "Paid (Search)", isDefault: true },
  { id: "sonar-reasoning-pro", name: "Sonar Reasoning Pro", provider: "Perplexity", type: "Paid (Search + Logic)", isDefault: false },

  // ── TOGETHER AI ──
  { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", name: "Llama 3.3 70B Turbo", provider: "TogetherAI", type: "Paid (Fast)", isDefault: true },
  { id: "Qwen/Qwen2.5-Coder-32B-Instruct", name: "Qwen 2.5 Coder", provider: "TogetherAI", type: "Paid (Coding)", isDefault: false },

  // ── OPENROUTER ──
  { id: "openrouter/auto", name: "Auto", provider: "OpenRouter", type: "Free", isDefault: true, isGuestModel: true },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B", provider: "OpenRouter", type: "Free", isDefault: false },
  { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1", provider: "OpenRouter", type: "Free (Reasoning)", isDefault: false },
  { id: "z-ai/glm-4.5-air:free", name: "GLM 4.5 Air", provider: "OpenRouter", type: "Free", isDefault: false },
  { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet", provider: "OpenRouter", type: "Paid (Flagship)", isDefault: false },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenRouter", type: "Paid (Flagship)", isDefault: false },
  { id: "google/gemini-2.5-pro-preview-03-25", name: "Gemini 2.5 Pro", provider: "OpenRouter", type: "Paid (Flagship)", isDefault: false },
  { id: "x-ai/grok-3-beta", name: "Grok 3", provider: "OpenRouter", type: "Paid (Flagship)", isDefault: false },
];

export const GUEST_DEFAULT_MODEL = MODEL_REGISTRY.find((m) => m.isGuestModel) as ModelEntry;

// ==========================================
// FETCHED MODELS
// ==========================================
export const getUserFetchedModels = async (): Promise<ModelEntry[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  const { data, error } = await supabase
    .from("user_fetched_models")
    .select("*")
    .eq("user_id", session.user.id);

  if (error) return [];
  return ((data as Array<{ model_id: string; model_name: string; provider: string; model_type?: string }>) || []).map((m) => ({
    id: m.model_id,
    name: m.model_name,
    provider: m.provider,
    type: m.model_type || "Fetched",
    isFetched: true,
  }));
};

export const saveFetchedModel = async (model: ModelEntry): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  await supabase.from("user_fetched_models").upsert({
    user_id: session.user.id,
    provider: model.provider,
    model_id: model.id,
    model_name: model.name,
    model_type: model.type,
  }, { onConflict: "user_id,model_id" });
};

export const removeFetchedModel = async (modelId: string): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  await supabase
    .from("user_fetched_models")
    .delete()
    .eq("user_id", session.user.id)
    .eq("model_id", modelId);
};

export const getAllModels = async (): Promise<ModelEntry[]> => {
  const fetched = await getUserFetchedModels();
  const fetchedIds = new Set(fetched.map((m) => m.id));
  const registry = MODEL_REGISTRY.filter((m) => !fetchedIds.has(m.id));
  return [...registry, ...fetched];
};

export const getEnabledModels = async (): Promise<string[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [GUEST_DEFAULT_MODEL.id];

  const { data } = await supabase
    .from("user_enabled_models")
    .select("model_id");

  if (data && data.length > 0) {
    return (data as Array<{ model_id: string }>).map((d) => d.model_id);
  }

  return MODEL_REGISTRY.filter((m) => m.isDefault && !m.isGuestModel).map((m) => m.id);
};

export const toggleModelEnabled = async (modelId: string, isEnabled: boolean): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  if (isEnabled) {
    await supabase
      .from("user_enabled_models")
      .insert({ user_id: session.user.id, model_id: modelId });
  } else {
    await supabase
      .from("user_enabled_models")
      .delete()
      .eq("user_id", session.user.id)
      .eq("model_id", modelId);
  }
};
