import { NextRequest, NextResponse } from "next/server";
import { GeminiError, listModels, pickDefaultModel } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-gemini-key")?.trim();
  if (!apiKey) return NextResponse.json({ error: "Please enter your Gemini API key." }, { status: 400 });
  try {
    const { text, image } = await listModels(apiKey);
    if (!text.length) {
      return NextResponse.json({ error: "Key works, but no Gemini text models are available for it." }, { status: 400 });
    }
    return NextResponse.json({ models: text, defaultModel: pickDefaultModel(text), imageModels: image });
  } catch (e) {
    const err = e as GeminiError;
    return NextResponse.json({ error: err.message }, { status: err.status === 429 ? 429 : 400 });
  }
}
