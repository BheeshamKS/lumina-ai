import { MODEL_REGISTRY } from "./models";
import { getActiveApiKey } from "./apiKeys";
import { LUMINA_SYSTEM_PROMPT } from "./prompts";

import { generateText, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

const OPENAI_COMPATIBLE_ENDPOINTS = {
  OpenAI: "https://api.openai.com/v1",
  DeepSeek: "https://api.deepseek.com/v1",
  Mistral: "https://api.mistral.ai/v1",
  xAI: "https://api.x.ai/v1",
  Perplexity: "https://api.perplexity.ai",
  TogetherAI: "https://api.together.xyz/v1",
};

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

// Providers known to NOT support tool calls reliably
const NO_TOOL_SUPPORT = ["Perplexity", "TogetherAI"];

// ─── Tavily search function ───────────────────────────────────────────────────
const tavilySearch = async (query) => {
  const apiKey = import.meta.env.VITE_TAVILY_API_KEY;
  if (!apiKey) throw new Error("Tavily API key not configured.");

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      max_results: 5,
      include_answer: true,
    }),
  });

  if (!response.ok) throw new Error(`Tavily error: ${response.status}`);
  const data = await response.json();

  // Format results into a clean string for the model
  const results = data.results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.content}`)
    .join("\n\n");

  return data.answer
    ? `Summary: ${data.answer}\n\nSources:\n${results}`
    : results;
};

// ─── Build AI model instance ──────────────────────────────────────────────────
const buildAiModel = (model, apiKey) => {
  if (model.provider === "Google") {
    return createGoogleGenerativeAI({ apiKey })(model.id);
  }
  if (model.provider === "Groq") {
    return createGroq({ apiKey })(model.id);
  }
  if (model.provider === "Anthropic") {
    return createAnthropic({ apiKey })(model.id);
  }
  if (model.provider === "OpenRouter") {
    return createOpenRouter({ apiKey }).chat(model.id);
  }
  if (OPENAI_COMPATIBLE_ENDPOINTS[model.provider]) {
    return createOpenAI({
      baseURL: OPENAI_COMPATIBLE_ENDPOINTS[model.provider],
      apiKey,
      compatibility: "compatible",
    })(model.id);
  }
  throw new Error(`API routing for ${model.provider} is not configured yet.`);
};

// ─── Main export ──────────────────────────────────────────────────────────────
export const sendMessageToLLM = async (
  messages,
  modelId,
  isWebSearchEnabled = false,
) => {
  const model = MODEL_REGISTRY.find((m) => m.id === modelId);
  if (!model) throw new Error("Model not found in registry.");

  let apiKey = await getActiveApiKey(model.provider);
  if (!apiKey && model.provider === "OpenRouter") {
    apiKey = import.meta.env.VITE_GUEST_API_KEY;
  }
  if (!apiKey)
    throw new Error(`Please add an API key for ${model.provider} in Settings.`);

  const aiModel = buildAiModel(model, apiKey);
  const contextLimit = CONTEXT_LIMITS[model.provider] ?? 20;
  const truncatedMessages = messages.slice(-contextLimit);

  // ── Case 1: Web search OFF — normal call ──────────────────────────────────
  if (!isWebSearchEnabled) {
    try {
      const { text } = await generateText({
        model: aiModel,
        system: LUMINA_SYSTEM_PROMPT,
        messages: truncatedMessages,
      });
      return text;
    } catch (error) {
      console.error("LLM Error:", error);
      throw new Error(error.message || "Failed to generate response.");
    }
  }

  // ── Case 2: Web search ON but provider doesn't support tools ─────────────
  if (NO_TOOL_SUPPORT.includes(model.provider)) {
    try {
      const lastUserMessage =
        truncatedMessages.findLast((m) => m.role === "user")?.content || "";
      const searchResults = await tavilySearch(lastUserMessage);
      const result = await generateText({
        model: aiModel,
        system:
          LUMINA_SYSTEM_PROMPT +
          "\n\nYou have access to a web search tool. Use it when you're unsure about something, when asked to search online, or when the question involves recent or real-time information. Don't search for things you already know well.",
        messages: truncatedMessages,
        tools: { webSearch: webSearchTool },
        maxSteps: 5,
      });

      // When a tool is called, result.text is empty — the actual final answer
      // lives in the last step that contains text
      const text =
        result.text ||
        result.steps?.findLast((s) => s.text?.trim())?.text ||
        "";

      return text;
    } catch (err) {
      console.error("Pre-search fallback error:", err);
      throw new Error(err.message || "Search failed.");
    }
  }

  // ── Case 3: Web search ON + provider supports tools ───────────────────────
  const webSearchTool = tool({
    description:
      "Search the web for current information. Use this when you don't know something, when the user asks to search online, or when the question involves recent events, news, prices, or anything that may have changed.",
    parameters: z.object({
      query: z.string().describe("The search query to look up"),
    }),
    execute: async ({ query }) => {
      try {
        return await tavilySearch(query);
      } catch (err) {
        return `Search failed: ${err.message}`;
      }
    },
  });

  try {
    const result = await generateText({
      model: aiModel,
      system:
        LUMINA_SYSTEM_PROMPT +
        "\n\nYou have access to a web search tool. Use it when you're unsure about something, when asked to search online, or when the question involves recent or real-time information. Don't search for things you already know well.",
      messages: truncatedMessages,
      tools: { webSearch: webSearchTool },
      maxSteps: 5,
    });
    
    // When a tool is called, result.text is empty — the actual final answer
    // lives in the last step that contains text
    const text =
      result.text ||
      result.steps?.findLast((s) => s.text?.trim())?.text ||
      "";
    
    return text;
  } catch (error) {
    // Tool call not supported — catch and return friendly message
    const msg = error.message?.toLowerCase() || "";
    if (
      msg.includes("tool") ||
      msg.includes("function") ||
      msg.includes("not supported") ||
      msg.includes("does not support")
    ) {
      // Fallback to pre-search injection
      try {
        const lastUserMessage =
          truncatedMessages.findLast((m) => m.role === "user")?.content || "";
        const searchResults = await tavilySearch(lastUserMessage);
        const result = await generateText({
          model: aiModel,
          system:
            LUMINA_SYSTEM_PROMPT +
            "\n\nYou have access to a web search tool. Use it when you're unsure about something, when asked to search online, or when the question involves recent or real-time information. Don't search for things you already know well.",
          messages: truncatedMessages,
          tools: { webSearch: webSearchTool },
          maxSteps: 5,
        });
        
        // When a tool is called, result.text is empty — the actual final answer
        // lives in the last step that contains text
        const text =
          result.text ||
          result.steps?.findLast((s) => s.text?.trim())?.text ||
          "";
        
        return text;
      } catch {
        return `⚠️ **${model.name}** doesn't support web search tool calls and the fallback also failed. Try a different model.`;
      }
    }

    console.error("LLM Error:", error);
    throw new Error(error.message || "Failed to generate response.");
  }
};
