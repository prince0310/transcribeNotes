"use client";
import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, ExternalLink, ShieldCheck } from "lucide-react";

interface Props {
  apiKey: string;
  setApiKey: (k: string) => void;
  remember: boolean;
  setRemember: (r: boolean) => void;
  models: string[];
  model: string;
  setModel: (m: string) => void;
  connected: boolean;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
  disabled?: boolean;
}

export default function ApiKeyCard(p: Props) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const connect = async () => {
    setBusy(true);
    setError("");
    try {
      await p.onConnect();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass rise relative rounded-3xl p-6 sm:p-7">
      <StepBadge n={1} done={p.connected} />
      <h2 className="font-display text-xl font-semibold text-white">Connect Gemini</h2>
      <p className="mt-1 text-sm text-slate-400">
        Bring your own key — it powers transcription fallback and note writing.
      </p>

      {!p.connected ? (
        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 focus-within:border-indigo-400/60">
            <KeyRound className="h-4 w-4 shrink-0 text-slate-500" />
            <input
              type={show ? "text" : "password"}
              value={p.apiKey}
              onChange={(e) => p.setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && p.apiKey && connect()}
              placeholder="Paste your Gemini API key (AIza…)"
              className="h-12 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="text-slate-500 hover:text-slate-300"
              aria-label={show ? "Hide key" : "Show key"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={p.remember}
                onChange={(e) => p.setRemember(e.target.checked)}
                className="accent-fuchsia-500"
              />
              Remember on this device
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200"
            >
              Get a free key <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <button
            onClick={connect}
            disabled={!p.apiKey.trim() || busy}
            className="btn-primary flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {busy ? "Verifying key…" : "Verify & connect"}
          </button>
          {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              Connected · key ending <span className="font-mono">…{p.apiKey.slice(-4)}</span>
            </div>
            <button
              onClick={p.onDisconnect}
              disabled={p.disabled}
              className="text-xs text-slate-400 underline-offset-2 hover:text-white hover:underline disabled:opacity-40"
            >
              Change
            </button>
          </div>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Model</span>
            <select
              value={p.model}
              onChange={(e) => p.setModel(e.target.value)}
              disabled={p.disabled}
              className="mt-1.5 h-11 w-full rounded-2xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-indigo-400/60"
            >
              {p.models.map((m) => (
                <option key={m} value={m} className="bg-slate-900">
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
        <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />
        Your key is only forwarded to Google for each request — it&apos;s never stored on our servers.
      </p>
    </section>
  );
}

export function StepBadge({ n, done }: { n: number; done?: boolean }) {
  return (
    <div
      className={`absolute -top-3 left-6 flex h-7 items-center gap-1 rounded-full px-3 text-xs font-semibold ${
        done ? "bg-emerald-500 text-emerald-950" : "bg-gradient-to-r from-indigo-500 to-fuchsia-600 text-white"
      }`}
    >
      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      Step {n}
    </div>
  );
}
