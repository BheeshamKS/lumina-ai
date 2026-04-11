import { supabase } from "./supabase";
import { getAllModels } from "./models";

interface LLMMessage {
  role: string;
  content: string;
}

export const sendMessageToLLM = async (
  messages: LLMMessage[],
  modelId: string,
  isWebSearchEnabled = false
): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();

  const allModels = await getAllModels();
  const activeModel = allModels.find((m) => m.id === modelId);
  const provider = activeModel?.provider || "OpenRouter";

  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const response = await fetch("/api/chat", {
    method: "POST",
    headers,
    body: JSON.stringify({ messages, modelId, provider, isWebSearchEnabled }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || `Server error: ${response.status}`);
  }

  const data = await response.json() as { text: string };
  return data.text;
};
