import { supabase } from "./supabase";
import { getAllModels } from "./models"; // 🚨 NEW IMPORT

export const sendMessageToLLM = async (
  messages,
  modelId,
  isWebSearchEnabled = false
) => {
  const { data: { session } } = await supabase.auth.getSession();

  // 🚨 DYNAMIC PROVIDER LOOKUP
  // This ensures even custom models added via "Browse Models" route correctly!
  const allModels = await getAllModels();
  const activeModel = allModels.find((m) => m.id === modelId);
  const provider = activeModel?.provider || "OpenRouter"; // Safe fallback

  const headers = { "Content-Type": "application/json" };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const response = await fetch("/api/chat", {
    method: "POST",
    headers,
    // 🚨 NOW SENDING 'provider' TO THE SERVER!
    body: JSON.stringify({ messages, modelId, provider, isWebSearchEnabled }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Server error: ${response.status}`);
  }

  const data = await response.json();
  return data.text;
};