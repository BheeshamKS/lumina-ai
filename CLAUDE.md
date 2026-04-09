# Lumina AI — CLAUDE.md

## Project Overview

Lumina AI is a React-based AI chat application with support for multiple LLM providers, voice input (STT), and voice output (TTS). It uses Supabase for auth and key storage, and deploys on Vercel.

## Architecture

```
lumina-ai/
├── api/              # Vercel serverless functions (Node.js)
│   ├── chat.js       # LLM proxy — all chat calls go here
│   ├── transcribe.js # STT proxy (Groq Whisper)
│   └── tts.js        # TTS proxy (Groq PlayAI)
├── src/
│   ├── pages/
│   │   ├── ChatPage.jsx      # Main chat UI + all voice logic
│   │   └── SettingsPage.jsx
│   ├── components/
│   │   ├── chatArea.jsx
│   │   ├── inputArea.jsx
│   │   ├── voiceRecordingIndicator.jsx
│   │   ├── voiceKeyModal.jsx  # Modal for adding Groq key
│   │   └── ...
│   ├── hooks/
│   │   └── useVoiceMode.js   # Voice hook (NOT used in ChatPage — standalone)
│   └── utils/
│       ├── apiKeys.js        # Supabase RPC wrappers for encrypted keys
│       ├── models.js         # MODEL_REGISTRY + Supabase model helpers
│       ├── llmRouter.js      # Calls /api/chat
│       ├── chatHistory.js    # Supabase chat persistence
│       └── supabase.js       # Supabase client
```

## Key Design Decisions

### API Keys
- User API keys are **encrypted in Supabase** and fetched via `supabase.rpc('get_secure_keys')`.
- The browser calls `getActiveApiKey(provider)` (from `utils/apiKeys.js`) which decrypts server-side.
- For LLM chat, keys are fetched **server-side** in `api/chat.js` — never sent to the browser.
- For STT/TTS (Groq), the key IS sent to the browser (via `groqKeyRef`) and calls are made **directly to Groq's API** from the browser (not through the proxy). This is intentional — Groq supports CORS.

### Voice (STT + TTS) — ChatPage.jsx
- Voice logic is **inlined in ChatPage.jsx**, NOT using `hooks/useVoiceMode.js` (that hook is a standalone alternative).
- `groqKey` (state) and `groqKeyRef.current` are kept in sync — both must be set together.
- `loadKey()` loads the Groq key from Supabase and sets both — **must be called in a `useEffect([session])`**.
- STT: records via `MediaRecorder` → calls `https://api.groq.com/openai/v1/audio/transcriptions` with `whisper-large-v3`.
- TTS: calls Groq directly from browser (`https://api.groq.com/openai/v1/audio/speech`) with model `canopylabs/orpheus-v1-english`, voice `diana`, format `wav`. Uses an `AbortController` (`ttsAbortRef`) so stopping mid-load cancels the in-flight request. Available voices: `autumn`, `diana`, `hannah` (female), `austin`, `daniel`, `troy` (male). (`playai-tts` was decommissioned 12/31/25.) The `/api/tts` proxy exists but is not used by the client.
- Auto-play TTS after voice input: `if (wasVoice && groqKey) speakText(...)` inside the `setMessages` updater.

### Models
- `MODEL_REGISTRY` in `utils/models.js` — hardcoded list of curated models.
- Users can also fetch additional models from providers (stored in `user_fetched_models` Supabase table).
- Enabled models stored in `user_enabled_models` Supabase table.
- Guest users get only `openrouter/auto` (no key required — server uses `OPENROUTER_KEY` env var).

### LLM Routing (`api/chat.js`)
- All chat goes through `/api/chat` serverless function.
- Web search via Tavily (`TAVILY_API_KEY` env var) — injected as a tool for capable providers.
- Providers without tool support (Groq, Perplexity, TogetherAI): uses a "gatekeeper" pattern — ask the model if search is needed, then inject results into system prompt.

## Environment Variables

**Client (must have `VITE_` prefix):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Server-only (Vercel env, no `VITE_` prefix):**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `OPENROUTER_KEY` — guest fallback key
- `TAVILY_API_KEY` — web search

## Development

```bash
npm run dev       # Vite dev server
npm run build     # Production build
npm run lint      # ESLint
```

For local API routes, use `vercel dev` (requires Vercel CLI) instead of `npm run dev`.

## Common Gotchas

- **`loadKey()` must be called in `useEffect([session])`** — if omitted, `groqKey` state is never initialized and TTS always shows the key modal.
- `groqKey` (state) and `groqKeyRef.current` must always be set together — state is used for conditional checks, ref is used in async callbacks that may run after re-renders.
- The `useVoiceMode` hook (`hooks/useVoiceMode.js`) is NOT wired up — `ChatPage.jsx` has its own inline voice implementation.
- Markdown is stripped from TTS input (code blocks, headers, bold, links) before sending to Groq.
- Context is truncated per provider: Groq = 6 messages, others = 20–50.
- `ChatArea` TTS props: `onSpeak`, `speakingMessageId` (string `"msg-N"`), `isSpeakingLoading` (string `"msg-N"` or null). Do NOT use the old names `onSpeakMessage`/`isPlayingTTS`/`playingMessageIdx` — the button renders conditionally on `onSpeak` being truthy.
- TTS calls go through `/api/tts` proxy (not directly to Groq from browser) with the key in `x-groq-key` header.
