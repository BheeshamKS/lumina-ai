import { MODEL_REGISTRY } from "./models";
import { getActiveApiKey } from "./apiKeys";
import { LUMINA_SYSTEM_PROMPT } from "./prompts";

// Import the Vercel AI SDK tools
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenRouter } from "@openrouter/ai-sdk-provider"; // <--- 1. Import the new official provider

// 2. Remove OpenRouter from this generic list
const OPENAI_COMPATIBLE_ENDPOINTS = {
  "OpenAI": "https://api.openai.com/v1",
  "DeepSeek": "https://api.deepseek.com/v1",
  "Mistral": "https://api.mistral.ai/v1",
  "xAI": "https://api.x.ai/v1",
  "Perplexity": "https://api.perplexity.ai",
  "TogetherAI": "https://api.together.xyz/v1",
};

export const sendMessageToLLM = async (messages, modelId) => {
  const model = MODEL_REGISTRY.find((m) => m.id === modelId);
  if (!model) throw new Error("Model not found in registry.");

  let apiKey = await getActiveApiKey(model.provider);

  // --- SECURE GUEST KEY INJECTION ---
  if (!apiKey && model.provider === "OpenRouter") {
    apiKey = import.meta.env.VITE_GUEST_API_KEY;
  }

  if (!apiKey) throw new Error(`Please add an API key for ${model.provider} in Settings.`);

  // 1. INITIALIZE THE PROVIDER
  let aiModel;

  if (model.provider === "Google") {
    const googleProvider = createGoogleGenerativeAI({ apiKey: apiKey });
    aiModel = googleProvider(modelId);
  } 
  else if (model.provider === "Groq") {
    const groqProvider = createGroq({ apiKey: apiKey });
    aiModel = groqProvider(modelId);
  }
  else if (model.provider === "Anthropic") {
    const anthropicProvider = createAnthropic({ apiKey: apiKey });
    aiModel = anthropicProvider(modelId);
  }
  else if (model.provider === "OpenRouter") {
    // 3. Give OpenRouter its own dedicated provider to avoid OpenAI formatting bugs!
    const openrouterProvider = createOpenRouter({ apiKey: apiKey });
    aiModel = openrouterProvider.chat(modelId);
  }
  else if (OPENAI_COMPATIBLE_ENDPOINTS[model.provider]) {
    const customProvider = createOpenAI({
      baseURL: OPENAI_COMPATIBLE_ENDPOINTS[model.provider],
      apiKey: apiKey,
      compatibility: "compatible",
    });
    aiModel = customProvider(modelId);
  } 
  else {
    throw new Error(`API routing for ${model.provider} is not configured yet.`);
  }

  // 2. SEND THE UNIFIED REQUEST
  try {

    const CONTEXT_LIMITS = {
      Groq: 6,
      Google: 50,
      OpenRouter: 20,
      OpenAI: 40,
      DeepSeek: 40,
      Mistral: 40,
      xAI: 40,
      Perplexity: 20,
      TogetherAI: 20,
    };
    
    const contextLimit = CONTEXT_LIMITS[model.provider] ?? 20;
    const truncatedMessages = messages.slice(-contextLimit);

    const { text } = await generateText({
      model: aiModel,
      system: LUMINA_SYSTEM_PROMPT,
      messages: messages, 
    });

    return text;
  } catch (error) {
    console.error("LLM Routing Error:", error);
    throw new Error(error.message || "Failed to generate response.");
  }
};