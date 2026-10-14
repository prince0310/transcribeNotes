"use client";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, KeyRound, LayoutTemplate, Loader2, Sparkles, Wand2 } from "lucide-react";
import type { InfographicStyle } from "@/lib/types";

export type Orientation = "landscape" | "portrait";
export type ImageQuality = "high" | "medium";

interface Props {
  style: InfographicStyle;
  setStyle: (s: InfographicStyle) => void;
  // Gemini image model (uses the main Gemini key)
  geminiImageModels: string[];
  geminiImageModel: string;
  setGeminiImageModel: (m: string) => void;
  // OpenAI image model (needs its own key)
  openaiKey: string;
  setOpenaiKey: (k: string) => void;
  openaiConnected: boolean;
  onConnectOpenAI: () => Promise<void>;
  onDisconnectOpenAI: () => void;
  openaiModels: string[];
  openaiModel: string;
  setOpenaiModel: (m: string) => void;
  // Shared
  orientation: Orientation;
  setOrientation: (o: Orientation) => void;
  quality: ImageQuality;
  setQuality: (q: ImageQuality) => void;
  disabled?: boolean;
}

export default function InfographicOptions(p: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const connect = async () => {
    setBusy(true);
    setError("");
    try {
      await p.onConnectOpenAI();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const shared = (
    <>
      <Select label="Layout" value={p.orientation} onChange={(v) => p.setOrientation(v as Orientation)}
        disabled={p.disabled} options={[["landscape", "Landscape"], ["portrait", "Portrait"]]} />
      <Select label="Quality" value={p.quality} onChange={(v) => p.setQuality(v as ImageQuality)}
        disabled={p.disabled} options={[["high", "High (sharper text)"], ["medium", "Medium (cheaper)"]]} />
    </>
  );

  return (
    <div className="rise mt-3 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Infographic style</div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Choice on={p.style === "gemini"} onClick={() => p.setStyle("gemini")} disabled={p.disabled}
          icon={Sparkles} title="Gemini image" sub="NotebookLM's model · your Gemini key" />
        <Choice on={p.style === "openai"} onClick={() => p.setStyle("openai")} disabled={p.disabled}
          icon={Wand2} title="ChatGPT image" sub="OpenAI key needed" />
        <Choice on={p.style === "template"} onClick={() => p.setStyle("template")} disabled={p.disabled}
          icon={LayoutTemplate} title="Template" sub="Free · instant" />
      </div>

      {p.style === "gemini" &&
        (p.geminiImageModels.length ? (
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-3">
              <Select label="Image model" value={p.geminiImageModel} onChange={p.setGeminiImageModel}
                disabled={p.disabled} options={p.geminiImageModels.map((m) => [m, m])} />
              {shared}
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Same model family NotebookLM uses for its infographics. Image generation through the API is usually
              billed (enable billing in Google AI Studio); &quot;pro&quot; models render small text best.
            </p>
          </div>
        ) : (
          <p className="flex items-start gap-2 rounded-xl bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
            No Gemini image models found. Connect your Gemini key in step 1 — if it&apos;s connected, your key has no
            image models, so try ChatGPT image or Template.
          </p>
        ))}

      {p.style === "openai" &&
        (!p.openaiConnected ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 focus-within:border-indigo-400/60">
                <KeyRound className="h-4 w-4 shrink-0 text-slate-500" />
                <input
                  type="password"
                  value={p.openaiKey}
                  onChange={(e) => p.setOpenaiKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && p.openaiKey && connect()}
                  placeholder="OpenAI API key (sk-…)"
                  className="h-10 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <button
                onClick={connect}
                disabled={!p.openaiKey.trim() || busy}
                className="btn-primary flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold text-white disabled:opacity-40"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Connect
              </button>
            </div>
            {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}
            <p className="text-[11px] leading-relaxed text-slate-500">
              Uses the same image model as ChatGPT. Billed per image to your OpenAI account (a ChatGPT Plus plan
              doesn&apos;t include API use).{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-indigo-300 hover:text-indigo-200"
              >
                Get a key <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> OpenAI connected · …{p.openaiKey.slice(-4)}
              </span>
              <button onClick={p.onDisconnectOpenAI} disabled={p.disabled} className="text-slate-400 hover:text-white">
                Change
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Select label="Image model" value={p.openaiModel} onChange={p.setOpenaiModel} disabled={p.disabled}
                options={p.openaiModels.map((m) => [m, m])} />
              {shared}
            </div>
          </div>
        ))}
    </div>
  );
}

function Choice({
  on,
  onClick,
  disabled,
  icon: Icon,
  title,
  sub,
}: {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon: typeof Wand2;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
        on ? "border-fuchsia-400/50 bg-fuchsia-500/10" : "border-white/10 hover:border-white/20"
      }`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${on ? "text-fuchsia-300" : "text-slate-500"}`} />
      <span className="min-w-0">
        <span className={`block text-sm font-semibold ${on ? "text-white" : "text-slate-300"}`}>{title}</span>
        <span className="block truncate text-[11px] text-slate-500">{sub}</span>
      </span>
    </button>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  disabled?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="text-[11px] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="mt-1 h-9 w-full rounded-xl border border-white/10 bg-black/40 px-2 text-xs text-white outline-none focus:border-indigo-400/60"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v} className="bg-slate-900">
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
