# TubeScribe

Paste a YouTube link → get organised notes as **Markdown/text**, a designed **PDF**, and a shareable **infographic PNG**. Users bring their own Gemini API key.

## How it works

```
Browser (Next.js page)                      Vercel serverless functions
──────────────────────                      ───────────────────────────
1. Connect key ───────────────────────────▶ /api/validate-key  → lists Gemini models
2. Paste link ────────────────────────────▶ /api/transcript    → YouTube captions
                                                                 └─ fallback: Gemini watches the video
3. ───────────────────────────────────────▶ /api/notes         → Gemini (JSON schema) → structured notes
4. Design (in the browser)
   ├─ Text  : Markdown + .txt
   ├─ PDF   : jsPDF (real text, clickable timestamps; image fallback for non-Latin scripts)
   └─ Image : Gemini image  → browser calls Gemini's image model directly (same key; NotebookLM's model family)
              ChatGPT image → /api/infographic-image → OpenAI image model
              Template      → 1080px poster rendered off-screen → PNG (html-to-image)
```

Users choose which formats to create; only the selected ones are generated. For the two AI-drawn styles, Gemini
writes a layout brief in the same call as the notes, so it costs no extra Gemini request.

- **Gemini image** uses the user's Gemini key. Image models are usually billed, so the key needs billing enabled.
  It's called from the browser so large PNGs avoid Vercel's 4.5 MB response limit.
- **ChatGPT image** needs an OpenAI API key (pay-per-image, separate from a ChatGPT subscription; the OpenAI
  organization must be verified for image models).

- The API key is sent per request in the `x-gemini-key` header and never stored server-side. "Remember on this device" keeps it in the user's `localStorage`.
- Key files: `app/page.tsx` (orchestration), `lib/youtube.ts` (transcripts), `lib/notes-prompt.ts` (prompt + schema), `lib/exporters.ts` (text/PDF/PNG), `components/InfographicCanvas.tsx` (poster design).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel: **Add New → Project → Import** the repo. Framework is auto-detected as Next.js; no environment variables are needed.
3. Deploy.

Or with the CLI: `npx vercel` then `npx vercel --prod`.

**Notes**
- The API routes set `maxDuration = 300` so long videos have time to transcribe. That's within the Hobby plan's limit when Fluid Compute is on (the default for new projects).
- YouTube sometimes blocks caption requests from cloud IPs. When that happens the app automatically falls back to Gemini transcribing the video (public videos only), so it still works — it's just slower.
