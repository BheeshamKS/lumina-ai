/**
 * /api/chat.js — Vercel Serverless Function
 *
 * All LLM calls go through here. API keys never reach the browser.
 *
 * Flow:
 *   Browser → POST /api/chat (with JWT) → this function fetches key from Supabase
 *           → calls LLM provider → returns { text }
 *
 * Required env vars (server-only, no VITE_ prefix):
 *   SUPABASE_URL            — same value as VITE_SUPABASE_URL
 *   SUPABASE_ANON_KEY       — same value as VITE_SUPABASE_ANON_KEY
 *   OPENROUTER_KEY          — guest key (replaces VITE_GUEST_API_KEY)
 *   TAVILY_API_KEY          — web search (replaces VITE_TAVILY_API_KEY)
 */

import { createClient } from "@supabase/supabase-js";
import { generateText, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

// ─── Constants (mirrors src/utils) ────────────────────────────────────────────

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
  Anthropic: 40,
};

// Providers that don't support tool calls reliably
const NO_TOOL_SUPPORT = ["Groq", "Perplexity", "TogetherAI"];

// Model ID → provider mapping — keep in sync with src/utils/models.js
// This lets us look up the provider without importing from src/
const MODEL_PROVIDER_MAP = {
  // Google
  "gemini-2.0-flash": "Google",
  "gemini-2.0-flash-lite": "Google",
  "gemini-2.5-pro-preview-03-25": "Google",
  "gemini-1.5-pro": "Google",
  "gemini-1.5-flash": "Google",
  // OpenRouter (guest + paid)
  "meta-llama/llama-4-maverick:free": "OpenRouter",
  "meta-llama/llama-4-maverick": "OpenRouter",
  "openai/gpt-4.1": "OpenRouter",
  "anthropic/claude-sonnet-4-5": "OpenRouter",
  // Groq
  "llama-3.3-70b-versatile": "Groq",
  "llama-3.1-8b-instant": "Groq",
  "meta-llama/llama-4-scout-17b-16e-instruct": "Groq",
  "compound-beta": "Groq",
  // OpenAI
  "gpt-4o": "OpenAI",
  "gpt-4o-mini": "OpenAI",
  "gpt-4.1": "OpenAI",
  "o3-mini": "OpenAI",
  // Anthropic
  "claude-opus-4-5-20250514": "Anthropic",
  "claude-sonnet-4-5-20250514": "Anthropic",
  "claude-haiku-4-5-20251001": "Anthropic",
  // DeepSeek
  "deepseek-chat": "DeepSeek",
  "deepseek-reasoner": "DeepSeek",
  // Mistral
  "mistral-large-latest": "Mistral",
  "mistral-small-latest": "Mistral",
  // xAI
  "grok-3": "xAI",
  "grok-3-mini": "xAI",
  // Perplexity
  "sonar-pro": "Perplexity",
  "sonar": "Perplexity",
  // TogetherAI
  "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo": "TogetherAI",
};

// Guest model ID — only this one works without a user API key
const GUEST_MODEL_ID = "meta-llama/llama-4-maverick:free";

const LUMINA_SYSTEM_PROMPT = `You are Lumina, a helpful and intelligent AI assistant. You provide clear, accurate, and thoughtful responses. You are conversational, warm, and concise unless asked for detail.`;

// ─── Tavily web search ────────────────────────────────────────────────────────

const tavilySearch = async (query) => {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("Tavily API key not configured on server.");

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

  const results = data.results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.content}`)
    .join("\n\n");

  return data.answer
    ? `Summary: ${data.answer}\n\nSources:\n${results}`
    : results;
};

// ─── Build AI model instance ──────────────────────────────────────────────────

const buildAiModel = (provider, modelId, apiKey) => {
  if (provider === "Google") {
    return createGoogleGenerativeAI({ apiKey })(modelId);
  }
  if (provider === "Groq") {
    return createGroq({ apiKey })(modelId);
  }
  if (provider === "Anthropic") {
    return createAnthropic({ apiKey })(modelId);
  }
  if (provider === "OpenRouter") {
    return createOpenRouter({ apiKey }).chat(modelId);
  }
  if (OPENAI_COMPATIBLE_ENDPOINTS[provider]) {
    return createOpenAI({
      baseURL: OPENAI_COMPATIBLE_ENDPOINTS[provider],
      apiKey,
      compatibility: "compatible",
    })(modelId);
  }
  throw new Error(`Provider "${provider}" is not configured.`);
};

// ─── Core LLM call ────────────────────────────────────────────────────────────

const callLLM = async (provider, modelId, apiKey, messages, isWebSearchEnabled) => {
  const aiModel = buildAiModel(provider, modelId, apiKey);
  const contextLimit = CONTEXT_LIMITS[provider] ?? 20;
  const truncatedMessages = messages.slice(-contextLimit);

  // Web search OFF
  if (!isWebSearchEnabled) {
    const { text } = await generateText({
      model: aiModel,
      system: LUMINA_SYSTEM_PROMPT,
      messages: truncatedMessages,
    });
    return text;
  }

  // Web search ON but provider doesn't support tools → friendly message
  if (NO_TOOL_SUPPORT.includes(provider)) {
    return `⚠️ **Web search** isn't available for this model. Switch to Gemini, GPT-4o, Claude, or an OpenRouter model to use web search.`;
  }

  // Web search ON + tools supported
  const webSearchTool = tool({
    description:
      "Search the web for current information. Use when you don't know something, when asked to search online, or when the question involves recent events, news, prices, or real-time data.",
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
        "\n\nYou have access to a web search tool. Use it when you're unsure about something, when asked to search online, or when the question involves recent or real-time information.",
      messages: truncatedMessages,
      tools: { webSearch: webSearchTool },
      maxSteps: 5,
    });

    // Extract text from result or last step
    return (
      result.text ||
      result.steps?.findLast((s) => s.text?.trim())?.text ||
      ""
    );
  } catch (error) {
    const msg = error.message?.toLowerCase() || "";
    if (
      msg.includes("tool") ||
      msg.includes("function") ||
      msg.includes("not supported")
    ) {
      return `⚠️ This model doesn't support web search. Please switch to a different model.`;
    }
    throw error;
  }
};

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS headers (needed if your frontend domain differs from API domain)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { messages, modelId, isWebSearchEnabled = false } = req.body;

    if (!messages || !modelId) {
      return res.status(400).json({ error: "Missing messages or modelId" });
    }

    const provider = MODEL_PROVIDER_MAP[modelId];
    if (!provider) {
      return res.status(400).json({ error: `Unknown model: ${modelId}` });
    }

    // ── Determine API key ──────────────────────────────────────────────────

    let apiKey = null;
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (token) {
      // Authenticated user — create a Supabase client with their JWT so RLS applies
      // This means get_secure_keys() only returns THEIR keys, exactly like the browser does
      const userSupabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );

      const { data: keys, error } = await userSupabase.rpc("get_secure_keys");

      if (error) {
        console.error("Supabase key fetch error:", error);
        return res.status(500).json({ error: "Failed to retrieve API keys." });
      }

      const activeKey = (keys || []).find(
        (k) => k.provider === provider && k.is_active
      );
      apiKey = activeKey?.api_key ?? null;
    }

    // Guest fallback — only for the designated guest model
    if (!apiKey && modelId === GUEST_MODEL_ID && provider === "OpenRouter") {
      apiKey = process.env.OPENROUTER_KEY;
    }

    if (!apiKey) {
      return res.status(401).json({
        error: token
          ? `No active API key found for ${provider}. Add one in Settings → Providers.`
          : "Authentication required. Please sign in.",
      });
    }

    // ── Call LLM ──────────────────────────────────────────────────────────

    const text = await callLLM(provider, modelId, apiKey, messages, isWebSearchEnabled);

    return res.status(200).json({ text });

  } catch (error) {
    console.error("Chat proxy error:", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred.",
    });
  }
}