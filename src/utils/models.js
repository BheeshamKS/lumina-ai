import { supabase } from "./supabase";

export const MODEL_REGISTRY = [
  // ==========================================
  // GOOGLE MODELS (Native)
  // ==========================================
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google", type: "Free (Fast)", isDefault: true },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google", type: "Free (Strict Limit)", isDefault: true },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "Google", type: "Free", isDefault: false },

  // ==========================================
  // OPENAI MODELS (Native)
  // ==========================================
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", type: "Paid (Flagship)", isDefault: false },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", type: "Paid (Cheap)", isDefault: false },
  { id: "o1", name: "OpenAI o1", provider: "OpenAI", type: "Paid (Heavy Reasoning)", isDefault: false },
  { id: "o3-mini", name: "OpenAI o3-mini", provider: "OpenAI", type: "Paid (Latest Reasoning)", isDefault: false },

  // ==========================================
  // GROQ MODELS
  // ==========================================
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "Groq", type: "Free (Fast)", isDefault: false },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", provider: "Groq", type: "Free (Ultra Fast)", isDefault: false },
  { id: "openai/gpt-oss-120b", name: "GPT OSS 120B", provider: "Groq", type: "Free (Flagship)", isDefault: false },
  { id: "openai/gpt-oss-20b", name: "GPT OSS 20B", provider: "Groq", type: "Free (Ultra Fast)", isDefault: false },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout", provider: "Groq", type: "Free (New)", isDefault: false },
  { id: "qwen/qwen3-32b", name: "Qwen 3 32B", provider: "Groq", type: "Free", isDefault: false },

  // ==========================================
  // DEEPSEEK (Native)
  // ==========================================
  { id: "deepseek-chat", name: "DeepSeek V3", provider: "DeepSeek", type: "Paid (Flagship)", isDefault: false },
  { id: "deepseek-reasoner", name: "DeepSeek R1", provider: "DeepSeek", type: "Paid (Reasoning)", isDefault: false },

  // ==========================================
  // MISTRAL AI (Native)
  // ==========================================
  { id: "mistral-large-latest", name: "Mistral Large", provider: "Mistral", type: "Paid (Flagship)", isDefault: false },
  { id: "codestral-latest", name: "Codestral", provider: "Mistral", type: "Paid (Coding)", isDefault: false },

  // ==========================================
  // xAI (Native)
  // ==========================================
  { id: "grok-2-latest", name: "Grok 2", provider: "xAI", type: "Paid (Flagship)", isDefault: false },

  // ==========================================
  // PERPLEXITY (Native)
  // ==========================================
  { id: "sonar-reasoning-pro", name: "Sonar Reasoning Pro", provider: "Perplexity", type: "Paid (Search + Logic)", isDefault: false },
  { id: "sonar-pro", name: "Sonar Pro", provider: "Perplexity", type: "Paid (Heavy Search)", isDefault: false },

  // ==========================================
  // TOGETHER AI
  // ==========================================
  { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", name: "Llama 3.3 70B (Turbo)", provider: "TogetherAI", type: "Paid (Fast)", isDefault: false },
  { id: "Qwen/Qwen2.5-Coder-32B-Instruct", name: "Qwen 2.5 Coder", provider: "TogetherAI", type: "Paid (Coding)", isDefault: false },

  // ==========================================
  // OPENROUTER — the FREE guest model is always available
  // ==========================================
  { id: "openrouter/auto", name: "Auto", provider: "OpenRouter", type: "Free", isDefault: true, isGuestModel: true },
  { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet", provider: "OpenRouter", type: "Paid", isDefault: false },
  { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", provider: "OpenRouter", type: "Paid (Fast)", isDefault: false },
];

// The one model that is ALWAYS available, even for guests with no keys.
export const GUEST_DEFAULT_MODEL = MODEL_REGISTRY.find((m) => m.isGuestModel);

export const getEnabledModels = async () => {
  const { data: { session } } = await supabase.auth.getSession();

  // Guest: only the free OpenRouter model
  if (!session) {
    return [GUEST_DEFAULT_MODEL.id];
  }

  const { data } = await supabase
    .from("user_enabled_models")
    .select("model_id");

  if (data && data.length > 0) {
    // Always inject the guest free model so it's always in the list
    const ids = data.map((d) => d.model_id);
      if (!ids.includes(GUEST_DEFAULT_MODEL.id)) {
        ids.push(GUEST_DEFAULT_MODEL.id); 
      }
return ids;
  }

  // Logged-in but no models saved yet — return defaults
  return MODEL_REGISTRY.filter((m) => m.isDefault).map((m) => m.id);
};

export const toggleModelEnabled = async (modelId, isEnabled) => {
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