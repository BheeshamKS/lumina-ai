export const config = {
    api: { bodyParser: false },
  };
  
  export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-groq-key");
  
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
    try {
      const rawChunks = [];
      for await (const chunk of req) rawChunks.push(chunk);
      const rawBody = Buffer.concat(rawChunks);
  
      const contentType = req.headers["content-type"] || "";
      const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
      if (!boundaryMatch) return res.status(400).json({ error: "No boundary found" });
  
      const boundaryFromHeader = boundaryMatch[1];
  
      // Log the first 300 bytes of body as a string to see what's actually there
      const bodyStart = rawBody.slice(0, 300).toString("utf8");
      console.log("=== boundary from header:", boundaryFromHeader);
      console.log("=== body start (first 300 chars):", JSON.stringify(bodyStart));
      console.log("=== raw body length:", rawBody.length);
  
      return res.status(200).json({ text: "debug" });
    } catch (err) {
      console.error("Error:", err);
      return res.status(500).json({ error: err.message });
    }
  }