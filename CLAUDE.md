# Lumina AI — CLAUDE.md

## Project Overview

Lumina AI is a React + TypeScript AI chat application with support for multiple LLM providers, voice input (STT), and voice output (TTS). It uses Supabase for auth and key storage, and deploys on Vercel.

## Architecture

```
lumina-ai/
├── api/              # Vercel serverless functions (TypeScript)
│   ├── chat.ts       # LLM proxy — all chat calls go here
│   ├── transcribe.ts # STT proxy (Groq Whisper, debug stub)
│   └── tts.ts        # TTS proxy (Groq PlayAI)
├── src/
│   ├── types.ts      # Shared domain types (Message, ModelEntry, ApiKeyRecord, etc.)
│   ├── vite-env.d.ts # Vite env types + Window interface augmentation
│   ├── pages/
│   │   ├── ChatPage.tsx      # Main chat UI + all voice logic
│   │   └── SettingsPage.tsx
│   ├── components/
│   │   ├── chatArea.tsx
│   │   ├── inputArea.tsx
│   │   ├── voiceRecordingIndicator.tsx
│   │   ├── voiceKeyModal.tsx  # Modal for adding Groq key
│   │   └── ...
│   ├── hooks/
│   │   └── useVoiceMode.ts   # Voice hook (NOT used in ChatPage — standalone)
│   └── utils/
│       ├── apiKeys.ts        # Supabase RPC wrappers for encrypted keys
│       ├── models.ts         # MODEL_REGISTRY + Supabase model helpers
│       ├── llmRouter.ts      # Calls /api/chat
│       ├── chatHistory.ts    # Supabase chat persistence
│       └── supabase.ts       # Supabase client
```

## TypeScript Notes

- **Transpiler**: `@vitejs/plugin-react-swc` handles TS/TSX — `tsc` is used for type-checking only (`noEmit: true`).
- **Type check**: `npm run typecheck` runs `tsc --noEmit`.
- **Shared types** live in `src/types.ts`: `Message`, `ModelEntry`, `ApiKeyRecord`, `Conversation`, `UserProfile`.
- **`useRef` pattern**: always `useRef<T | null>(null)` to match React 19's `RefObject<T | null>` signature.
- **Catch blocks**: always `err instanceof Error ? err.message : "..."` — never access `.message` on `unknown`.
- **Supabase RPC data**: typed as `unknown` at the boundary, cast internally (e.g. `data as ApiKeyRecord[]`).
- **AI SDK v6** (`ai@6.x`) naming changes vs older versions:
  - `ModelMessage` (not `CoreMessage`) for chat message arrays
  - `inputSchema:` (not `parameters:`) in `tool()` definitions
  - `stopWhen: stepCountIs(N)` (not `maxSteps: N`) in `generateText()`
- **Window augmentation**: `window.isMigratingChat` and the `migrationComplete` custom event are declared in `src/vite-env.d.ts`.

## Key Design Decisions

### API Keys
- User API keys are **encrypted in Supabase** and fetched via `supabase.rpc('get_secure_keys')`.
- The browser calls `getActiveApiKey(provider)` (from `utils/apiKeys.ts`) which decrypts server-side.
- For LLM chat, keys are fetched **server-side** in `api/chat.ts` — never sent to the browser.
- For STT/TTS (Groq), the key IS sent to the browser (via `groqKeyRef`) and calls are made **directly to Groq's API** from the browser (not through the proxy). This is intentional — Groq supports CORS.

### Voice (STT + TTS) — ChatPage.tsx
- Voice logic is **inlined in ChatPage.tsx**, NOT using `hooks/useVoiceMode.ts` (that hook is a standalone alternative).
- `groqKey` (state) and `groqKeyRef.current` are kept in sync — both must be set together.
- `loadKey()` loads the Groq key from Supabase and sets both — **must be called in a `useEffect([session])`**.
- STT: records via `MediaRecorder` → calls `https://api.groq.com/openai/v1/audio/transcriptions` with `whisper-large-v3`.
- TTS: calls Groq directly from browser (`https://api.groq.com/openai/v1/audio/speech`) with model `canopylabs/orpheus-v1-english`, voice `diana`, format `wav`. Uses an `AbortController` (`ttsAbortRef`) so stopping mid-load cancels the in-flight request. Available voices: `autumn`, `diana`, `hannah` (female), `austin`, `daniel`, `troy` (male). (`playai-tts` was decommissioned 12/31/25.) The `/api/tts` proxy exists but is not used by the client.
- Auto-play TTS after voice input: `if (wasVoice && groqKeyRef.current) speakText(...)` after the LLM responds.

### Models
- `MODEL_REGISTRY` in `utils/models.ts` — hardcoded list of curated models.
- Users can also fetch additional models from providers (stored in `user_fetched_models` Supabase table).
- Enabled models stored in `user_enabled_models` Supabase table.
- Guest users get only `openrouter/auto` (no key required — server uses `OPENROUTER_KEY` env var).

### LLM Routing (`api/chat.ts`)
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
npm run dev         # Vite dev server
npm run build       # Production build
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit (type-check only, no emit)
```

For local API routes, use `vercel dev` (requires Vercel CLI) instead of `npm run dev`.

## Common Gotchas

- **`loadKey()` must be called in `useEffect([session])`** — if omitted, `groqKey` state is never initialized and TTS always shows the key modal.
- `groqKey` (state) and `groqKeyRef.current` must always be set together — state is used for conditional checks, ref is used in async callbacks that may run after re-renders.
- The `useVoiceMode` hook (`hooks/useVoiceMode.ts`) is NOT wired up — `ChatPage.tsx` has its own inline voice implementation.
- Markdown is stripped from TTS input (code blocks, headers, bold, links) before sending to Groq.
- Context is truncated per provider: Groq = 6 messages, others = 20–50.
- `ChatArea` TTS props: `onSpeak`, `speakingMessageId` (string `"msg-N"`), `isSpeakingLoading` (string `"msg-N"` or null). Do NOT use the old names `onSpeakMessage`/`isPlayingTTS`/`playingMessageIdx` — the button renders conditionally on `onSpeak` being truthy.
- TTS calls go **directly to Groq from the browser** (not through `/api/tts`) — the proxy exists but the client bypasses it.
- `onCopy` in `ChatArea` passes `(text: string, id: string)` — `id` is always a string like `"msg-0"`, never a number.
