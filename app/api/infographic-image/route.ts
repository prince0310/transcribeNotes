import { NextRequest, NextResponse } from "next/server";
import { OpenAIError, generateImage } from "@/lib/openai";
import { buildImagePrompt } from "@/lib/image-prompt";

export const runtime = "nodejs";
// High-quality image generation can take a minute or two.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-openai-key")?.trim();
  if (!apiKey) return NextResponse.json({ error: "Missing OpenAI API key." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const brief = String(body.brief ?? "").trim();
  const model = String(body.model ?? "");
  if (!brief) return NextResponse.json({ error: "No infographic brief was produced for this video." }, { status: 400 });
  if (!model) return NextResponse.json({ error: "No OpenAI image model selected." }, { status: 400 });

  const landscape = body.orientation !== "portrait";
  try {
    const png = await generateImage({
      apiKey,
      model,
      prompt: buildImagePrompt(brief, String(body.title ?? "Video notes"), landscape),
      size: landscape ? "1536x1024" : "1024x1536",
      quality: body.quality === "medium" ? "medium" : "high",
    });
    // Return raw bytes rather than base64 JSON to stay well under Vercel's response size limit.
    return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
  } catch (e) {
    const err = e as OpenAIError;
    return NextResponse.json({ error: err.message }, { status: err.status && err.status < 600 ? err.status : 500 });
  }
}
