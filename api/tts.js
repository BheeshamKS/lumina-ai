/**
 * /api/tts.js — Groq TTS
 * Reads groqKey from JSON body.
 */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-groq-key");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Read key from body (your ChatPage sends it there) or header fallback
  const groqKey = req.body?.groqKey || req.headers["x-groq-key"];
  if (!groqKey) return res.status(401).json({ error: "No Groq API key provided" });

  const text = req.body?.text;
  if (!text?.trim()) return res.status(400).json({ error: "No text provided" });

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
      const errData = await groqResponse.json().catch(() => ({}));
      return res.status(groqResponse.status).json({
        error: errData?.error?.message || `Groq TTS error ${groqResponse.status}`,
      });
    }

    const audioBuffer = await groqResponse.arrayBuffer();
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Content-Length", audioBuffer.byteLength);
    return res.status(200).end(Buffer.from(audioBuffer));
  } catch (err) {
    console.error("TTS error:", err);
    return res.status(500).json({ error: err.message || "TTS failed" });
  }
}