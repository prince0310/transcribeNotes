import { NextRequest, NextResponse } from "next/server";
import { OpenAIError, listImageModels } from "@/lib/openai";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-openai-key")?.trim();
  if (!apiKey) return NextResponse.json({ error: "Please enter your OpenAI API key." }, { status: 400 });
  try {
    const models = await listImageModels(apiKey);
    if (!models.length) {
      return NextResponse.json(
        { error: "Key works, but it has no image models. Check that your OpenAI organization is verified." },
        { status: 400 },
      );
    }
    return NextResponse.json({ models, defaultModel: models[0] });
  } catch (e) {
    const err = e as OpenAIError;
    return NextResponse.json({ error: err.message }, { status: err.status === 429 ? 429 : 400 });
  }
}
