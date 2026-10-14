import { NextRequest, NextResponse } from "next/server";
import { GeminiError, geminiGenerate } from "@/lib/gemini";
import { buildNotesPrompt, notesSchema, normalizeNotes } from "@/lib/notes-prompt";
import type { Detail } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_CHARS = 600_000;

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-gemini-key")?.trim();
  if (!apiKey) return NextResponse.json({ error: "Missing Gemini API key." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const transcript = String(body.transcript ?? "").slice(0, MAX_CHARS);
  if (transcript.trim().length < 40) {
    return NextResponse.json({ error: "Transcript is too short to make notes from." }, { status: 400 });
  }
  const detail: Detail = body.detail === "concise" ? "concise" : "detailed";
  const wantsInfographic = Array.isArray(body.formats) ? body.formats.includes("infographic") : true;
  const aiStyle = body.infographicStyle === "gemini" || body.infographicStyle === "openai";
  const withInfographic = wantsInfographic && !aiStyle;
  const withImageBrief = wantsInfographic && aiStyle;

  try {
    const raw = await geminiGenerate({
      apiKey,
      model: String(body.model ?? ""),
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildNotesPrompt({
                transcript,
                title: String(body.title ?? ""),
                author: String(body.author ?? ""),
                detail,
                language: String(body.language || "auto"),
                withInfographic,
                withImageBrief,
              }),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
        responseSchema: notesSchema(withInfographic, withImageBrief),
      },
    });

    const json = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    return NextResponse.json(normalizeNotes(json));
  } catch (e) {
    if (e instanceof SyntaxError) {
      return NextResponse.json({ error: "Gemini returned malformed notes. Please try again." }, { status: 502 });
    }
    const err = e as GeminiError;
    return NextResponse.json({ error: err.message }, { status: err.status && err.status < 600 ? err.status : 500 });
  }
}
