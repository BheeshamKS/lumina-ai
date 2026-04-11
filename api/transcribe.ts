import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-groq-key");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  try {
    const rawChunks: Buffer[] = [];
    for await (const chunk of req as AsyncIterable<Buffer>) rawChunks.push(chunk);
    const rawBody = Buffer.concat(rawChunks);

    const contentType = req.headers["content-type"] || "";
    const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
    if (!boundaryMatch) { res.status(400).json({ error: "No boundary found" }); return; }

    const boundaryFromHeader = boundaryMatch[1];

    const bodyStart = rawBody.slice(0, 300).toString("utf8");
    console.log("=== boundary from header:", boundaryFromHeader);
    console.log("=== body start (first 300 chars):", JSON.stringify(bodyStart));
    console.log("=== raw body length:", rawBody.length);

    res.status(200).json({ text: "debug" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
}
