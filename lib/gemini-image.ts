"use client";
// Calls Gemini's image model ("Nano Banana") straight from the browser. The Gemini API allows CORS, and
// going direct avoids serverless timeouts and Vercel's 4.5 MB response limit for large PNGs.
import { buildImagePrompt } from "./image-prompt";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function generateGeminiImage(opts: {
  apiKey: string;
  model: string;
  brief: string;
  title: string;
  orientation: "landscape" | "portrait";
  quality: "high" | "medium";
}): Promise<Blob> {
  const landscape = opts.orientation === "landscape";
  // Only the Pro image models accept an output size; Flash image models have a fixed resolution.
  const imageConfig: Record<string, string> = { aspectRatio: landscape ? "3:2" : "2:3" };
  if (/pro/.test(opts.model)) imageConfig.imageSize = opts.quality === "high" ? "2K" : "1K";

  const res = await fetch(`${BASE}/models/${encodeURIComponent(opts.model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": opts.apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildImagePrompt(opts.brief, opts.title, landscape) }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig },
    }),
  });
  const data: any = await res.json().catch(() => null);
  if (!res.ok) {
    const msg: string = data?.error?.message ?? "";
    if (res.status === 429 || /quota/i.test(msg))
      throw new Error(
        "Your Gemini key has no image quota left (image models usually need billing enabled at aistudio.google.com). Try the ChatGPT or Template style.",
      );
    if (res.status === 404 || /no longer available/i.test(msg))
      throw new Error(`This image model isn't available for your key — pick another one. (${msg})`);
    throw new Error(msg || `Gemini image request failed (${res.status}).`);
  }

  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p) => p.inlineData?.data && !p.thought) ?? parts.find((p) => p.inlineData?.data);
  if (!img) {
    const reason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason || "no image returned";
    throw new Error(`Gemini didn't return an image (${reason}). Try Redraw.`);
  }
  const bytes = Uint8Array.from(atob(img.inlineData.data), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: img.inlineData.mimeType || "image/png" });
}
