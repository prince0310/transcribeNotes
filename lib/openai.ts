// Minimal REST client for OpenAI image generation (server-side only).
const BASE = "https://api.openai.com/v1";

export class OpenAIError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

function friendly(status: number, message: string): string {
  if (status === 401) return "Your OpenAI API key is invalid.";
  if (/verif/i.test(message))
    return "OpenAI requires organization verification before using image models. Verify at platform.openai.com → Settings → Organization, then try again.";
  if (/billing|quota|credit/i.test(message)) return "Your OpenAI account has no credit left. Add billing at platform.openai.com.";
  if (status === 429) return "OpenAI rate limit reached. Wait a minute and try again.";
  if (/safety|moderation/i.test(message)) return "OpenAI's safety system rejected this image request.";
  return message || `OpenAI request failed (${status}).`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

/** Image models available to this key, best first: highest gpt-image version, full model before mini. */
export async function listImageModels(apiKey: string): Promise<string[]> {
  const res = await fetch(`${BASE}/models`, { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" });
  const data: Json = await res.json().catch(() => null);
  if (!res.ok) throw new OpenAIError(friendly(res.status, data?.error?.message ?? ""), res.status);

  const ids: string[] = (data?.data ?? []).map((m: Json) => String(m.id)).filter((id: string) => /image/.test(id) && /^(gpt|chatgpt)-/.test(id));
  const version = (id: string) => Number(id.match(/image-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
  const penalty = (id: string) => (/mini/.test(id) ? 1 : 0) + (/\d{4}-\d{2}-\d{2}/.test(id) ? 0.5 : 0);
  return [...new Set(ids)].sort((a, b) => version(b) - version(a) || penalty(a) - penalty(b) || a.localeCompare(b));
}

export async function generateImage(opts: {
  apiKey: string;
  model: string;
  prompt: string;
  size: "1536x1024" | "1024x1536";
  quality: "medium" | "high";
}): Promise<Buffer> {
  const res = await fetch(`${BASE}/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.apiKey}` },
    body: JSON.stringify({
      model: opts.model,
      prompt: opts.prompt,
      size: opts.size,
      quality: opts.quality,
      output_format: "png",
      n: 1,
    }),
    cache: "no-store",
  });
  const data: Json = await res.json().catch(() => null);
  if (!res.ok) throw new OpenAIError(friendly(res.status, data?.error?.message ?? ""), res.status);
  const b64: string | undefined = data?.data?.[0]?.b64_json;
  if (!b64) throw new OpenAIError("OpenAI returned no image.", 502);
  return Buffer.from(b64, "base64");
}
