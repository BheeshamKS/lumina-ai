import { MODEL_REGISTRY } from "./models";
import { getActiveApiKey } from "./apiKeys";
import { LUMINA_SYSTEM_PROMPT } from "./prompts";

const OPENAI_COMPATIBLE_ENDPOINTS = {
  "OpenAI": "https://api.openai.com/v1/chat/completions",
  "Groq": "https://api.groq.com/openai/v1/chat/completions",
  "OpenRouter": "https://openrouter.ai/api/v1/chat/completions",
};

export const sendMessageToLLM = async (messages, modelId) => {
  const model = MODEL_REGISTRY.find((m) => m.id === modelId);
  if (!model) throw new Error("Model not found in registry.");

  let apiKey = await getActiveApiKey(model.provider);

  // --- SECURE GUEST KEY INJECTION ---
  // This gives the router the key it needs for the 3 allowed guest prompts.
  // ChatPage.jsx will physically block this function from running a 4th time!
  if (!apiKey && model.provider === "OpenRouter") {
    apiKey = import.meta.env.VITE_GUEST_API_KEY;
  }

  if (!apiKey) throw new Error(`Please add an API key for ${model.provider} in Settings.`);

  if (model.provider === "Google") {
    return await fetchGoogleGemini(messages, modelId, apiKey);
  } else if (OPENAI_COMPATIBLE_ENDPOINTS[model.provider]) {
    const baseUrl = OPENAI_COMPATIBLE_ENDPOINTS[model.provider];
    return await fetchOpenAIStandard(messages, modelId, apiKey, baseUrl);
  } else {
    throw new Error(`API routing for ${model.provider} is not configured yet.`);
  }
};

// ==========================================
// THE FORMATTERS
// ==========================================

const fetchGoogleGemini = async (messages, modelId, apiKey) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  const geminiMessages = messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user", 
    parts: [{ text: msg.content }],
  }));

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      contents: geminiMessages,
      system_instruction: { parts: { text: LUMINA_SYSTEM_PROMPT } }
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Google Gemini API Error");
  return data.candidates[0].content.parts[0].text;
};

const fetchOpenAIStandard = async (messages, modelId, apiKey, baseUrl) => {
  const fullMessages = [
    { role: "system", content: LUMINA_SYSTEM_PROMPT },
    ...messages
  ];

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: fullMessages,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `${model.provider} API Error`);
  return data.choices[0].message.content;
};