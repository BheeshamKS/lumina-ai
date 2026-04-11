/**
 * /api/chat.ts — Vercel Serverless Function
 *
 * All LLM calls go through here. API keys never reach the browser.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { generateText, tool, stepCountIs } from "ai";
import type { ModelMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

// ─── Constants ───────────────────────────────���───────────────────────────────���

const OPENAI_COMPATIBLE_ENDPOINTS: Record<string, string> = {
  OpenAI: "https://api.openai.com/v1",
  DeepSeek: "https://api.deepseek.com/v1",
  Mistral: "https://api.mistral.ai/v1",
  xAI: "https://api.x.ai/v1",
  Perplexity: "https://api.perplexity.ai",
  TogetherAI: "https://api.together.xyz/v1",
};

const CONTEXT_LIMITS: Record<string, number> = {
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

const NO_TOOL_SUPPORT = ["Groq", "Perplexity", "TogetherAI"];

const GUEST_MODEL_ID = "openrouter/auto";

const LUMINA_SYSTEM_PROMPT = `You are Lumina, a helpful and intelligent AI assistant. You provide clear, accurate, and thoughtful responses. You are conversational, warm, and concise unless asked for detail.`;

// ─── Tavily web search ──────────────────────────────���─────────────────────────

const tavilySearch = async (query: string): Promise<string> => {
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
  const data = await response.json() as {
    answer?: string;
    results: Array<{ title: string; url: string; content: string }>;
  };

  const results = data.results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.content}`)
    .join("\n\n");

  return data.answer
    ? `Summary: ${data.answer}\n\nSources:\n${results}`
    : results;
};

// ─── Build AI model instance ──────────────────────────────────────────────────

const buildAiModel = (provider: string, modelId: string, apiKey: string) => {
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
    })(modelId);
  }
  throw new Error(`Provider "${provider}" is not configured.`);
};

// ─── Core LLM call ──────────────────────────────��─────────────────────────────

const callLLM = async (
  provider: string,
  modelId: string,
  apiKey: string,
  messages: ModelMessage[],
  isWebSearchEnabled: boolean,
): Promise<string> => {
  const aiModel = buildAiModel(provider, modelId, apiKey);
  const contextLimit = CONTEXT_LIMITS[provider] ?? 20;
  const truncatedMessages = messages.slice(-contextLimit);

  if (!isWebSearchEnabled) {
    const { text } = await generateText({
      model: aiModel,
      system: LUMINA_SYSTEM_PROMPT,
      messages: truncatedMessages,
    });
    return text;
  }

  const webSearchTool = tool({
    description:
      "Search the web for current information. Use when you don't know something, when asked to search online, or when the question involves recent events, news, prices, or real-time data.",
    inputSchema: z.object({
      query: z.string().describe("The search query to look up"),
    }),
    execute: async ({ query }) => {
      if (!query) return "Search failed: no query provided.";
      try {
        return await tavilySearch(query);
      } catch (err) {
        return `Search failed: ${err instanceof Error ? err.message : String(err)}`;
      }
    },
  });

  if (NO_TOOL_SUPPORT.includes(provider)) {
    try {
      const lastUserMessage =
        [...truncatedMessages].reverse().find((m) => m.role === "user")?.content || "";
      const lastUserText = typeof lastUserMessage === "string" ? lastUserMessage : "";

      const { text: needsSearch } = await generateText({
        model: aiModel,
        system:
          "You are a classifier. Reply with only 'YES' if the user's question requires current/real-time information from the web (news, prices, weather, recent events). Reply with only 'NO' if you can answer from general knowledge.",
        messages: [{ role: "user", content: lastUserText }],
      });

      if (needsSearch.trim().toUpperCase().includes("YES")) {
        const searchResults = await tavilySearch(lastUserText);
        const { text } = await generateText({
          model: aiModel,
          system:
            LUMINA_SYSTEM_PROMPT +
            `\n\nCurrent web search context:\n\n${searchResults}\n\nUse this where relevant.`,
          messages: truncatedMessages,
        });
        return text;
      } else {
        const { text } = await generateText({
          model: aiModel,
          system: LUMINA_SYSTEM_PROMPT,
          messages: truncatedMessages,
        });
        return text;
      }
    } catch (err) {
      console.error("Pre-search fallback error:", err);
      throw new Error(err instanceof Error ? err.message : "Search failed.");
    }
  }

  try {
    const result = await generateText({
      model: aiModel,
      system:
        LUMINA_SYSTEM_PROMPT +
        "\n\nYou have access to a web search tool. Use it when you're unsure about something, when asked to search online, or when the question involves recent or real-time information.",
      messages: truncatedMessages,
      tools: { webSearch: webSearchTool },
      stopWhen: stepCountIs(5),
    });

    return (
      result.text ||
      [...result.steps].reverse().find((s) => s.text?.trim())?.text ||
      ""
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message.toLowerCase() : "";
    if (
      msg.includes("tool") ||
      msg.includes("function") ||
      msg.includes("not supported") ||
      msg.includes("does not support")
    ) {
      try {
        const lastUserMessage =
          [...truncatedMessages].reverse().find((m) => m.role === "user")?.content || "";
        const lastUserText = typeof lastUserMessage === "string" ? lastUserMessage : "";
        const searchResults = await tavilySearch(lastUserText);
        const { text } = await generateText({
          model: aiModel,
          system:
            LUMINA_SYSTEM_PROMPT +
            `\n\nCurrent web search context:\n\n${searchResults}\n\nUse this where relevant.`,
          messages: truncatedMessages,
        });
        return text;
      } catch {
        return `⚠️ **${provider}** doesn't support web search and the fallback failed. Try a different model.`;
      }
    }
    throw error;
  }
};

// ─── Main handler ────────────────────────���─────────────────────────────���──────

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  try {
    const { messages, modelId, provider, isWebSearchEnabled = false } = req.body as {
      messages: ModelMessage[];
      modelId: string;
      provider: string;
      isWebSearchEnabled?: boolean;
    };

    if (!messages || !modelId || !provider) {
      res.status(400).json({ error: "Missing messages, modelId, or provider" });
      return;
    }

    let apiKey: string | null = null;
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (token) {
      const userSupabase = createClient(
        process.env.SUPABASE_URL as string,
        process.env.SUPABASE_ANON_KEY as string,
        { global: { headers: { Authorization: `Bearer ${token}` } } },
      );

      const { data: keys, error } = await userSupabase.rpc("get_secure_keys");

      if (error) {
        console.error("Supabase key fetch error:", error);
        res.status(500).json({ error: "Failed to retrieve API keys." });
        return;
      }

      const activeKey = (
        (keys as Array<{ provider: string; is_active: boolean; api_key: string }>) || []
      ).find((k) => k.provider === provider && k.is_active);
      apiKey = activeKey?.api_key ?? null;
    }

    if (!apiKey && modelId === GUEST_MODEL_ID && provider === "OpenRouter") {
      apiKey = process.env.OPENROUTER_KEY ?? null;
    }

    if (!apiKey) {
      res.status(401).json({
        error: token
          ? `No active API key found for ${provider}. Add one in Settings → Providers.`
          : "Authentication required. Please sign in.",
      });
      return;
    }

    const text = await callLLM(provider, modelId, apiKey, messages, isWebSearchEnabled);

    res.status(200).json({ text });
  } catch (error) {
    console.error("Chat proxy error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "An unexpected error occurred.",
    });
  }
}
