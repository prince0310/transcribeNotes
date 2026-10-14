// Minimal REST client for the Gemini API (server-side only).
const BASE = "https://generativelanguage.googleapis.com/v1beta";

export class GeminiError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

function friendly(status: number, message: string): string {
  if (/API key not valid|API_KEY_INVALID/i.test(message)) return "Your Gemini API key is invalid.";
  if (status === 429)
    return "Gemini quota/rate limit reached. Wait a minute or pick a lighter model (e.g. a Flash model).";
  if (status === 404 || /no longer available|not found for API version/i.test(message))
    return `This model isn't available for your key — choose a newer one from the Model dropdown. (${message})`;
  if (status === 403) return `Gemini refused the request (permission): ${message}`;
  return message || `Gemini request failed (${status}).`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

export async function geminiGenerate(opts: {
  apiKey: string;
  model: string;
  contents: Json[];
  generationConfig?: Json;
}): Promise<string> {
  const res = await fetch(`${BASE}/models/${encodeURIComponent(opts.model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": opts.apiKey },
    body: JSON.stringify({ contents: opts.contents, generationConfig: opts.generationConfig }),
    cache: "no-store",
  });
  const data: Json = await res.json().catch(() => null);
  if (!res.ok) throw new GeminiError(friendly(res.status, data?.error?.message ?? ""), res.status);

  const cand = data?.candidates?.[0];
  const text: string = (cand?.content?.parts ?? [])
    .filter((p: Json) => !p.thought)
    .map((p: Json) => p.text ?? "")
    .join("");
  if (!text.trim()) {
    const reason = data?.promptFeedback?.blockReason || cand?.finishReason || "empty response";
    throw new GeminiError(`Gemini returned no content (${reason}).`, 502);
  }
  return text;
}

/** Text models for notes, plus image models ("Nano Banana") for AI-drawn infographics. */
export async function listModels(apiKey: string): Promise<{ text: string[]; image: string[] }> {
  const res = await fetch(`${BASE}/models?pageSize=200`, {
    headers: { "x-goog-api-key": apiKey },
    cache: "no-store",
  });
  const data: Json = await res.json().catch(() => null);
  if (!res.ok) throw new GeminiError(friendly(res.status, data?.error?.message ?? ""), res.status);

  const all: string[] = [
    ...new Set<string>(
      (data?.models ?? [])
        .filter((m: Json) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m: Json) => String(m.name).replace(/^models\//, ""))
        .filter((n: string) => n.startsWith("gemini")),
    ),
  ];
  const unstable = (n: string) => (/preview|exp/.test(n) ? 1 : 0);

  // Newest version first; within a version: Flash, Flash-Lite, Pro; stable before preview/exp.
  const skip = /embedding|tts|image|live|audio|aqa|robotics|computer-use|learnlm|gemma|vision/i;
  const rank = (n: string) => (/flash/.test(n) && !/lite/.test(n) ? 0 : /lite/.test(n) ? 1 : 2);
  const text = all
    .filter((n) => !skip.test(n))
    .sort(
      (a, b) =>
        modelVersion(b) - modelVersion(a) ||
        rank(a) - rank(b) ||
        unstable(a) - unstable(b) ||
        b.localeCompare(a, undefined, { numeric: true }),
    );

  // Image models: newest first, Pro before Flash (Pro renders dense text far better).
  const image = all
    .filter((n) => /image/.test(n) && !/generation|edit/.test(n))
    .sort(
      (a, b) =>
        modelVersion(b) - modelVersion(a) ||
        Number(/pro/.test(b)) - Number(/pro/.test(a)) ||
        unstable(a) - unstable(b) ||
        a.localeCompare(b),
    );

  return { text, image };
}

/** "gemini-3.8-flash" → 3.8; older generations may be retired for new keys, so newest wins. */
function modelVersion(name: string): number {
  return Number(name.match(/^gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
}

export function pickDefaultModel(models: string[]): string {
  return (
    models.find((m) => /flash/.test(m) && !/lite|preview|exp/.test(m)) ??
    models.find((m) => /flash/.test(m)) ??
    models[0]
  );
}
