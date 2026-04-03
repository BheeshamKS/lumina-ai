/**
 * /api/transcribe.js — Groq Whisper STT
 * Reads groqKey from the multipart form field.
 */

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-groq-key");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Read raw body
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks);

  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    return res.status(400).json({ error: "Expected multipart/form-data" });
  }

  const boundary = contentType.split("boundary=")[1]?.trim();
  if (!boundary) return res.status(400).json({ error: "No boundary found" });

  // Parse multipart parts
  let groqKey = req.headers["x-groq-key"] || null;
  let audioBuffer = null;
  let audioFilename = "recording.webm";
  let audioMime = "audio/webm";

  const bodyStr = rawBody.toString("binary");
  const parts = bodyStr.split(`--${boundary}`);

  for (const part of parts) {
    if (!part || part.trim() === "--" || part.trim() === "") continue;
    const separatorIdx = part.indexOf("\r\n\r\n");
    if (separatorIdx === -1) continue;

    const header = part.substring(0, separatorIdx);
    const body = part.substring(separatorIdx + 4).replace(/\r\n$/, "");

    // Extract groqKey from form field
    if (header.includes('name="groqKey"')) {
      groqKey = body.trim();
    }

    // Extract audio file
    if (header.includes('name="file"')) {
      const filenameMatch = header.match(/filename="([^"]+)"/);
      if (filenameMatch) audioFilename = filenameMatch[1];
      const mimeMatch = header.match(/Content-Type:\s*([^\r\n]+)/i);
      if (mimeMatch) audioMime = mimeMatch[1].trim();
      audioBuffer = Buffer.from(body, "binary");
    }
  }

  if (!groqKey) return res.status(401).json({ error: "No Groq API key provided" });
  if (!audioBuffer || audioBuffer.length === 0) {
    return res.status(400).json({ error: "No audio data found in request" });
  }

  // Forward to Groq Whisper
  try {
    const { FormData, Blob } = await import("formdata-node");
    const form = new FormData();
    form.append("file", new Blob([audioBuffer], { type: audioMime }), audioFilename);
    form.append("model", "whisper-large-v3");
    form.append("response_format", "json");

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          ...Object.fromEntries(form.headers || []),
        },
        body: form,
      }
    );

    if (!groqResponse.ok) {
      const errData = await groqResponse.json().catch(() => ({}));
      return res.status(groqResponse.status).json({
        error: errData?.error?.message || `Groq error ${groqResponse.status}`,
      });
    }

    const data = await groqResponse.json();
    return res.status(200).json({ text: data.text || "" });
  } catch (err) {
    console.error("Transcribe error:", err);
    return res.status(500).json({ error: err.message || "Transcription failed" });
  }
}