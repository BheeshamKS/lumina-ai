/**
 * /api/tts.ts — Groq TTS
 * Reads groqKey from JSON body.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-groq-key");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const body = req.body as { groqKey?: string; text?: string } | undefined;
  const groqKey = body?.groqKey || req.headers["x-groq-key"];
  if (!groqKey) { res.status(401).json({ error: "No Groq API key provided" }); return; }

  const text = body?.text;
  if (!text?.trim()) { res.status(400).json({ error: "No text provided" }); return; }

  try {
    const groqResponse = await fetch("https://api.groq.com/openai/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "canopylabs/orpheus-v1-english",
        input: text.slice(0, 4000),
        voice: "diana",
        response_format: "wav",
      }),
    });

    if (!groqResponse.ok) {
      const errData = await groqResponse.json().catch(() => ({})) as { error?: { message?: string } };
      res.status(groqResponse.status).json({
        error: errData?.error?.message || `Groq TTS error ${groqResponse.status}`,
      });
      return;
    }

    const audioBuffer = await groqResponse.arrayBuffer();
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Content-Length", audioBuffer.byteLength);
    res.status(200).end(Buffer.from(audioBuffer));
  } catch (err) {
    console.error("TTS error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "TTS failed" });
  }
}
