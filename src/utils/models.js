import { supabase } from "./supabase";

export const MODEL_REGISTRY = [
  // GOOGLE MODELS
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "Google", type: "Free (Daily Limit)", isDefault: true },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "Google", type: "Free (Strict Limit)", isDefault: true },
  
  // GROQ MODELS
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "Groq", type: "Free (Fast)", isDefault: false },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", provider: "Groq", type: "Free (Ultra Fast)", isDefault: false },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7b", provider: "Groq", type: "Free", isDefault: false },

  // OPENAI MODELS
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", type: "Paid", isDefault: false, warning: "Usage costs apply to your OpenAI balance." },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", type: "Paid (Cheap)", isDefault: false },
];

export const getEnabledModels = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return MODEL_REGISTRY.filter((m) => m.isDefault).map((m) => m.id);

  const { data } = await supabase.from("user_enabled_models").select("model_id");
  return data.length > 0
    ? data.map((d) => d.model_id)
    : MODEL_REGISTRY.filter((m) => m.isDefault).map((m) => m.id);
};

export const toggleModelEnabled = async (modelId, isEnabled) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  if (isEnabled) {
    await supabase.from("user_enabled_models").insert({ user_id: session.user.id, model_id: modelId });
  } else {
    await supabase.from("user_enabled_models").delete().eq("user_id", session.user.id).eq("model_id", modelId);
  }
};