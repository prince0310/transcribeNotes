"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, Check, Captions, Brain, Palette, Loader2, RotateCcw } from "lucide-react";
import type { StepId, StepState } from "@/lib/types";

const META: Record<StepId, { title: string; icon: typeof Captions }> = {
  transcript: { title: "Fetch transcript", icon: Captions },
  notes: { title: "Write notes", icon: Brain },
  design: { title: "Build your formats", icon: Palette },
};
const ORDER: StepId[] = ["transcript", "notes", "design"];

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

export default function Pipeline({
  steps,
  onRetry,
}: {
  steps: Record<StepId, StepState>;
  onRetry?: () => void;
}) {
  const anyActive = ORDER.some((id) => steps[id].status === "active");
  const now = useNow(anyActive);
  const doneCount = ORDER.filter((id) => steps[id].status === "done").length;
  const failed = ORDER.some((id) => steps[id].status === "error");

  return (
    <section className="glass rise rounded-3xl p-6 sm:p-7">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-white">Pipeline</h2>
        {failed && onRetry ? (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </button>
        ) : (
          <span className="text-xs text-slate-400">{doneCount} / 3 complete</span>
        )}
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500 transition-all duration-700"
          style={{ width: `${(doneCount / 3) * 100 + (anyActive ? 12 : 0)}%` }}
        />
      </div>

      <ol className="mt-6 grid gap-4 md:grid-cols-3">
        {ORDER.map((id, i) => {
          const s = steps[id];
          const { title, icon: Icon } = META[id];
          const secs = s.startedAt ? (((s.endedAt ?? now) - s.startedAt) / 1000).toFixed(1) : null;
          return (
            <li
              key={id}
              className={`relative overflow-hidden rounded-2xl border p-4 transition ${
                s.status === "active"
                  ? "border-indigo-400/40 bg-indigo-500/10"
                  : s.status === "done"
                    ? "border-emerald-400/25 bg-emerald-400/5"
                    : s.status === "error"
                      ? "border-rose-400/40 bg-rose-500/10"
                      : "border-white/8 bg-white/[0.02]"
              }`}
            >
              {s.status === "active" && <div className="shimmer pointer-events-none absolute inset-0" />}
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    s.status === "done"
                      ? "bg-emerald-400/20 text-emerald-300"
                      : s.status === "error"
                        ? "bg-rose-500/20 text-rose-300"
                        : s.status === "active"
                          ? "bg-indigo-500/25 text-indigo-200"
                          : "bg-white/5 text-slate-500"
                  }`}
                >
                  {s.status === "done" ? (
                    <Check className="h-5 w-5" />
                  ) : s.status === "error" ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : s.status === "active" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-slate-500">Stage {i + 1}</div>
                  <div className="truncate text-sm font-semibold text-white">{title}</div>
                </div>
                {secs && <span className="ml-auto font-mono text-[11px] text-slate-400">{secs}s</span>}
              </div>
              <p
                className={`relative mt-3 min-h-[2.5rem] text-xs leading-relaxed ${
                  s.status === "error" ? "text-rose-200" : "text-slate-400"
                }`}
              >
                {s.detail || (s.status === "idle" ? "Waiting…" : "")}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
