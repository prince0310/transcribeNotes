"use client";
import { Check, FileText, FileType2, Image as ImageIcon, Link2, Loader2, Sparkles, Youtube } from "lucide-react";
import { StepBadge } from "./ApiKeyCard";
import { extractVideoId, thumbUrl } from "@/lib/youtube-id";
import type { Detail, Format } from "@/lib/types";

export const LANGUAGES = [
  ["auto", "Same as video"],
  ["English", "English"],
  ["Hindi", "Hindi"],
  ["Hinglish (Hindi in Latin script)", "Hinglish"],
  ["Spanish", "Spanish"],
  ["French", "French"],
  ["German", "German"],
  ["Portuguese", "Portuguese"],
  ["Arabic", "Arabic"],
  ["Bengali", "Bengali"],
  ["Tamil", "Tamil"],
  ["Japanese", "Japanese"],
] as const;

const FORMATS: { id: Format; label: string; sub: string; icon: typeof FileText }[] = [
  { id: "text", label: "Text", sub: ".md / .txt", icon: FileText },
  { id: "pdf", label: "PDF", sub: "designed doc", icon: FileType2 },
  { id: "infographic", label: "Infographic", sub: ".png poster", icon: ImageIcon },
];

export const formatLabel = (f: Format[]) =>
  FORMATS.filter((x) => f.includes(x.id))
    .map((x) => (x.id === "pdf" ? "PDF" : x.label.toLowerCase()))
    .join(" & ")
    .replace(/ & (?=.* & )/g, ", ");

interface Props {
  /** Extra settings shown when the infographic format is selected. */
  infographicOptions?: React.ReactNode;
  /** Why generation can't start yet (e.g. a missing OpenAI key); disables the button. */
  blockReason?: string;
  formats: Format[];
  setFormats: (f: Format[]) => void;
  url: string;
  setUrl: (u: string) => void;
  detail: Detail;
  setDetail: (d: Detail) => void;
  language: string;
  setLanguage: (l: string) => void;
  enabled: boolean;
  running: boolean;
  onGenerate: () => void;
}

export default function VideoCard(p: Props) {
  const id = extractVideoId(p.url);
  const invalid = p.url.trim().length > 0 && !id;
  const canRun = p.enabled && !!id && !p.running && p.formats.length > 0 && !p.blockReason;
  const toggle = (f: Format) =>
    p.setFormats(p.formats.includes(f) ? p.formats.filter((x) => x !== f) : [...p.formats, f]);

  return (
    <section
      className={`glass rise relative rounded-3xl p-6 transition sm:p-7 ${p.enabled ? "" : "opacity-55"}`}
      style={{ animationDelay: "80ms" }}
    >
      <StepBadge n={2} />
      <h2 className="font-display text-xl font-semibold text-white">Drop a YouTube link</h2>
      <p className="mt-1 text-sm text-slate-400">Lectures, podcasts, tutorials, talks — any public video.</p>

      <div className="mt-5 flex gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div
            className={`flex items-center gap-2 rounded-2xl border bg-black/30 px-4 focus-within:border-indigo-400/60 ${
              invalid ? "border-rose-400/50" : "border-white/10"
            }`}
          >
            <Link2 className="h-4 w-4 shrink-0 text-slate-500" />
            <input
              value={p.url}
              onChange={(e) => p.setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canRun && p.onGenerate()}
              placeholder="https://www.youtube.com/watch?v=…"
              disabled={!p.enabled || p.running}
              className="h-12 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600 disabled:cursor-not-allowed"
              spellCheck={false}
            />
          </div>
          {invalid && <p className="text-xs text-rose-300">Paste a youtube.com, youtu.be or Shorts link.</p>}
        </div>
        {id && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl(id)}
            alt="Video thumbnail"
            className="rise hidden h-12 w-[86px] shrink-0 rounded-xl object-cover ring-1 ring-white/10 sm:block"
          />
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Depth</span>
          <div className="mt-1.5 grid h-11 grid-cols-2 rounded-2xl border border-white/10 bg-black/30 p-1">
            {(["concise", "detailed"] as const).map((d) => (
              <button
                key={d}
                onClick={() => p.setDetail(d)}
                disabled={p.running}
                className={`rounded-xl text-sm capitalize transition ${
                  p.detail === d ? "bg-white/12 text-white shadow" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Notes language</span>
          <select
            value={p.language}
            onChange={(e) => p.setLanguage(e.target.value)}
            disabled={p.running}
            className="mt-1.5 h-11 w-full rounded-2xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-indigo-400/60"
          >
            {LANGUAGES.map(([v, label]) => (
              <option key={v} value={v} className="bg-slate-900">
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Formats to create</span>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {FORMATS.map(({ id: f, label, sub, icon: Icon }) => {
            const on = p.formats.includes(f);
            return (
              <button
                key={f}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(f)}
                disabled={p.running}
                className={`relative flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 transition ${
                  on
                    ? "border-fuchsia-400/50 bg-fuchsia-500/10 text-white"
                    : "border-white/10 bg-black/20 text-slate-500 hover:text-slate-300"
                }`}
              >
                <span
                  className={`absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full ${
                    on ? "bg-fuchsia-500 text-white" : "border border-white/20"
                  }`}
                >
                  {on && <Check className="h-3 w-3" />}
                </span>
                <Icon className={`h-5 w-5 ${on ? "text-fuchsia-300" : ""}`} />
                <span className="text-xs font-semibold">{label}</span>
                <span className="text-[10px] text-slate-500">{sub}</span>
              </button>
            );
          })}
        </div>
        {p.formats.length === 0 && <p className="mt-2 text-xs text-rose-300">Pick at least one format.</p>}
        {p.formats.includes("infographic") && p.infographicOptions}
      </div>

      <button
        onClick={p.onGenerate}
        disabled={!canRun}
        className="btn-primary mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
      >
        {p.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {p.running ? "Working on it…" : p.formats.length ? `Generate ${formatLabel(p.formats)}` : "Generate"}
      </button>
      {p.enabled && p.blockReason && <p className="mt-3 text-center text-xs text-amber-200/80">{p.blockReason}</p>}
      {!p.enabled && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <Youtube className="h-3.5 w-3.5" /> Connect your Gemini key first
        </p>
      )}
    </section>
  );
}
