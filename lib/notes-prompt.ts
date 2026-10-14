import type { Detail, Notes } from "./types";

const S = { type: "STRING" } as const;
const arr = (items: object) => ({ type: "ARRAY", items });
const obj = (properties: Record<string, object>) => ({
  type: "OBJECT",
  properties,
  required: Object.keys(properties),
  propertyOrdering: Object.keys(properties),
});

const BASE_FIELDS = {
  title: S,
  subtitle: S,
  summary: S,
  keyTakeaways: arr(S),
  sections: arr(obj({ heading: S, timestamp: S, summary: S, points: arr(S) })),
  definitions: arr(obj({ term: S, meaning: S })),
  actionItems: arr(S),
  quote: S,
};

const INFOGRAPHIC_FIELD = {
  infographic: obj({
    headline: S,
    tagline: S,
    stats: arr(obj({ value: S, label: S })),
    pillars: arr(obj({ emoji: S, title: S, text: S })),
    flow: arr(S),
    bottomLine: S,
  }),
};

/** The infographic block is only requested when that format was chosen, to keep responses lean. */
export const notesSchema = (withInfographic: boolean, withImageBrief: boolean) =>
  obj({
    ...BASE_FIELDS,
    ...(withInfographic ? INFOGRAPHIC_FIELD : {}),
    ...(withImageBrief ? { imageBrief: S } : {}),
  });

const IMAGE_BRIEF_RULES = `- imageBrief: the complete content plan for a dense, one-page, textbook-style revision sheet of this video, which an image model will draw. Plain text, no markdown symbols other than "-" bullets. Structure it EXACTLY like this:
  PANEL 1 (blue): <number> <title> - <one-line subtitle>
    1.1 <sub-section title>
      - <bullet, max 12 words>
      TABLE: <col A> | <col B> ; <row> | <row> ; ... (max 6 rows)
      DIAGRAM: <precise description of a simple diagram to draw, with every label>
      KEY POINTS BOX: <item>; <item>; <item>
      HIGHLIGHT BOX: <a formula, rule or definition to emphasise>
    1.2 ...
  PANEL 2 (green): ...
  PANEL 3 (purple): ... must end with "Quick revision" (6-9 numbered one-liners) and, when the topic suits it, "Practice questions" (2-4 short MCQs with options A-D).
  Rules: 3 panels, 3-5 sub-sections each; every panel mixes bullets with at least one table, diagram or box; use the video's real facts, examples and numbers; keep every text item short; total visible text under 450 words; write all text in the output language.`;

export function buildNotesPrompt(p: {
  transcript: string;
  title: string;
  author: string;
  detail: Detail;
  language: string;
  withInfographic: boolean;
  withImageBrief: boolean;
}): string {
  const lang = p.language === "auto" ? "the same language as the transcript" : p.language;
  const size =
    p.detail === "detailed"
      ? "5-9 sections with 4-7 points each, 5-7 key takeaways, a 4-6 sentence summary"
      : "3-5 sections with 2-4 points each, 3-5 key takeaways, a 2-3 sentence summary";

  return `You are an expert note-taker and instructional designer. Turn the YouTube transcript below into beautifully organised study notes.

VIDEO TITLE: ${p.title || "Unknown"}
CHANNEL: ${p.author || "Unknown"}
OUTPUT LANGUAGE: ${lang}
SIZE: ${size}

RULES
- Be faithful to the transcript. Never invent facts, numbers, names or claims.
- Skip filler, sponsor reads, intros/outros and "like and subscribe" segments.
- title: a clear, specific title for the notes (not clickbait). subtitle: one line describing what the reader will learn.
- sections follow the logical flow of the video. heading: short and descriptive. timestamp: the m:ss where that topic starts, copied from the transcript's [m:ss] markers, without brackets ("" if unknown). summary: 1-2 sentences. points: crisp, self-contained statements (max ~30 words each); keep concrete examples, numbers and steps.
- definitions: 0-8 important terms or concepts with plain-language meanings.
- actionItems: 0-6 practical next steps a viewer could take ([] if not applicable).
- quote: the most memorable line said in the video (lightly cleaned), or "".
${p.withInfographic ? `- infographic: VERY short text, designed for a visual one-pager:
  - headline <= 8 words, tagline <= 16 words
  - stats: exactly 3 or 4 items. value is short and punchy ("3x", "70%", "5 steps", "2010"). Prefer real numbers mentioned in the video; otherwise use meaningful counts (e.g. value "5", label "core principles"). label <= 5 words.
  - pillars: 4 or 6 items, each with ONE fitting emoji, title <= 4 words, text <= 18 words.
  - flow: 3-6 steps (the process, journey or argument structure), each <= 6 words.
  - bottomLine: the single most important message, <= 20 words.
` : ""}${p.withImageBrief ? `${IMAGE_BRIEF_RULES}\n` : ""}
TRANSCRIPT
"""
${p.transcript}
"""`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function normalizeNotes(raw: any): Notes {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const list = <T,>(v: unknown, map: (x: any) => T, keep: (x: T) => boolean): T[] =>
    Array.isArray(v) ? v.map(map).filter(keep) : [];
  const strs = (v: unknown) => list(v, str, Boolean);
  const ig = raw?.infographic ?? {};
  return {
    title: str(raw?.title) || "Video Notes",
    subtitle: str(raw?.subtitle),
    summary: str(raw?.summary),
    keyTakeaways: strs(raw?.keyTakeaways),
    sections: list(
      raw?.sections,
      (s) => ({
        heading: str(s?.heading),
        timestamp: str(s?.timestamp).replace(/[\[\]]/g, ""),
        summary: str(s?.summary),
        points: strs(s?.points),
      }),
      (s) => Boolean(s.heading || s.points.length),
    ),
    definitions: list(raw?.definitions, (d) => ({ term: str(d?.term), meaning: str(d?.meaning) }), (d) => Boolean(d.term)),
    actionItems: strs(raw?.actionItems),
    quote: str(raw?.quote).replace(/^["“]|["”]$/g, ""),
    infographic: {
      headline: str(ig.headline) || str(raw?.title),
      tagline: str(ig.tagline),
      stats: list(ig.stats, (s) => ({ value: str(s?.value), label: str(s?.label) }), (s) => Boolean(s.value)).slice(0, 4),
      pillars: list(
        ig.pillars,
        (p) => ({ emoji: str(p?.emoji) || "✨", title: str(p?.title), text: str(p?.text) }),
        (p) => Boolean(p.title),
      ).slice(0, 6),
      flow: strs(ig.flow).slice(0, 6),
      bottomLine: str(ig.bottomLine),
    },
    imageBrief: str(raw?.imageBrief),
  };
}
