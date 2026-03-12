/**
 * src/utils/llmRouter.js — Client-side proxy caller
 *
 * No API keys here. No provider SDKs here.
 * All LLM logic lives in /api/chat.js (server-side).
 *
 * This file just:
 *   1. Gets the user's current Supabase JWT
 *   2. POSTs to /api/chat with the conversation + JWT
 *   3. Returns the response text
 */

import { supabase } from "./supabase";

export const sendMessageToLLM = async (
  messages,
  modelId,
  isWebSearchEnabled = false
) => {
  // Get current session token — server uses this to fetch the right API key
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = { "Content-Type": "application/json" };

  // Attach JWT if the user is logged in
  // (guests have no token — server falls back to the guest key for the free model)
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const response = await fetch("/api/chat", {
    method: "POST",
    headers,
    body: JSON.stringify({ messages, modelId, isWebSearchEnabled }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Server error: ${response.status}`);
  }

  const data = await response.json();
  return data.text;
};