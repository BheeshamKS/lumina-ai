import { MODEL_REGISTRY } from "./models";
import { getActiveApiKey } from "./apiKeys";
import { LUMINA_SYSTEM_PROMPT } from "./prompts"; // <-- Added this!

const OPENAI_COMPATIBLE_ENDPOINTS = {
  "OpenAI": "https://api.openai.com/v1/chat/completions",
  "Groq": "https://api.groq.com/openai/v1/chat/completions",
  "OpenRouter": "https://openrouter.ai/api/v1/chat/completions",
};

export const sendMessageToLLM = async (messages, modelId) => {
  const model = MODEL_REGISTRY.find((m) => m.id === modelId);
  if (!model) throw new Error("Model not found in registry.");

  const apiKey = await getActiveApiKey(model.provider);
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

// 1. The Google Formatter
const fetchGoogleGemini = async (messages, modelId, apiKey) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  const geminiMessages = messages.map((msg) => ({
    // Ensure strict "user" or "model" roles
    role: msg.role === "assistant" ? "model" : "user", 
    parts: [{ text: msg.content }],
  }));

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      contents: geminiMessages,
      // Google requires the system prompt to be passed here in the REST API
      system_instruction: {
        parts: { text: LUMINA_SYSTEM_PROMPT }
      }
    }),
  });

  const data = await response.json();

  // If it fails, throw the EXACT error Google sends back
  if (!response.ok) {
    throw new Error(data.error?.message || "Google Gemini API Error");
  }
  
  return data.candidates[0].content.parts[0].text;
};

// 2. The OpenAI-Standard Formatter
const fetchOpenAIStandard = async (messages, modelId, apiKey, baseUrl) => {
  // Inject the system prompt at the very beginning of the messages array
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

  if (!response.ok) {
    throw new Error(data.error?.message || `${model.provider} API Error`);
  }
  
  return data.choices[0].message.content;
};