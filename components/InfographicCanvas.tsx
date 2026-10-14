import { forwardRef } from "react";
import type { Notes, TranscriptResult } from "@/lib/types";

type Meta = Pick<TranscriptResult, "videoId" | "title" | "author">;

/**
 * A fixed 1080px-wide poster. It is rendered off-screen and captured to PNG,
 * so everything uses explicit sizes rather than responsive classes.
 */
const InfographicCanvas = forwardRef<HTMLDivElement, { notes: Notes; meta: Meta }>(function InfographicCanvas(
  { notes, meta },
  ref,
) {
  const ig = notes.infographic;
  const takeaways = notes.keyTakeaways.slice(0, 4);

  return (
    <div
      ref={ref}
      style={{ width: 1080, fontFamily: "var(--font-inter), system-ui, sans-serif" }}
      className="relative overflow-hidden bg-[#0a0a1f] p-[64px] text-white"
    >
      {/* glow blobs */}
      <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-indigo-600/40 blur-[120px]" />
      <div className="absolute -right-48 top-[30%] h-[560px] w-[560px] rounded-full bg-fuchsia-600/30 blur-[130px]" />
      <div className="absolute -bottom-40 left-[20%] h-[480px] w-[480px] rounded-full bg-rose-500/25 blur-[120px]" />

      <div className="relative">
        {/* Header */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[15px] font-semibold uppercase tracking-[0.18em] text-indigo-200">
          <span className="h-2 w-2 rounded-full bg-fuchsia-400" /> Visual Summary
        </div>
        <h1
          className="mt-6 text-[64px] font-extrabold leading-[1.04] tracking-tight"
          style={{
            fontFamily: "var(--font-grotesk), var(--font-inter), sans-serif",
            background: "linear-gradient(90deg,#c7d2fe,#f0abfc 55%,#fda4af)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {ig.headline}
        </h1>
        {ig.tagline && <p className="mt-5 max-w-[880px] text-[26px] leading-snug text-slate-300">{ig.tagline}</p>}
        <p className="mt-6 text-[17px] text-slate-500">
          From “{meta.title}”{meta.author ? ` · ${meta.author}` : ""}
        </p>

        {/* Stats */}
        {ig.stats.length > 0 && (
          <div
            className="mt-12 grid gap-5"
            style={{ gridTemplateColumns: `repeat(${ig.stats.length}, minmax(0, 1fr))` }}
          >
            {ig.stats.map((s, i) => (
              <div key={i} className="rounded-3xl border border-white/10 bg-white/[0.06] px-6 py-7">
                <div
                  className="text-[54px] font-extrabold leading-none"
                  style={{
                    background: "linear-gradient(135deg,#818cf8,#e879f9)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {s.value}
                </div>
                <div className="mt-3 text-[18px] font-medium leading-snug text-slate-300">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Pillars */}
        {ig.pillars.length > 0 && (
          <>
            <SectionLabel>Core ideas</SectionLabel>
            <div className="grid grid-cols-2 gap-5">
              {ig.pillars.map((p, i) => (
                <div key={i} className="flex gap-5 rounded-3xl border border-white/10 bg-white/[0.05] p-6">
                  <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/40 to-fuchsia-500/40 text-[36px]">
                    {p.emoji}
                  </div>
                  <div>
                    <div className="text-[23px] font-bold leading-tight">{p.title}</div>
                    <div className="mt-2 text-[17px] leading-relaxed text-slate-300">{p.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Flow */}
        {ig.flow.length > 0 && (
          <>
            <SectionLabel>How it flows</SectionLabel>
            <div className="relative flex gap-4">
              <div className="absolute left-[40px] right-[40px] top-[27px] h-[3px] rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500" />
              {ig.flow.map((f, i) => (
                <div key={i} className="relative flex flex-1 flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#0a0a1f] bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-[22px] font-bold shadow-lg shadow-fuchsia-900/50">
                    {i + 1}
                  </div>
                  <div className="mt-4 px-1 text-[18px] font-semibold leading-snug text-slate-200">{f}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Takeaways + quote */}
        {(takeaways.length > 0 || notes.quote) && (
          <div className="mt-14 grid grid-cols-5 gap-5">
            {takeaways.length > 0 && (
              <div
                className={`${notes.quote ? "col-span-3" : "col-span-5"} rounded-3xl border border-white/10 bg-white/[0.05] p-7`}
              >
                <div className="text-[15px] font-semibold uppercase tracking-[0.18em] text-indigo-200">
                  Key takeaways
                </div>
                <ul className="mt-5 space-y-4">
                  {takeaways.map((t, i) => (
                    <li key={i} className="flex gap-3 text-[18px] leading-snug text-slate-200">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-[15px] text-emerald-300">
                        ✓
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {notes.quote && (
              <div
                className={`${takeaways.length ? "col-span-2" : "col-span-5"} flex flex-col justify-center rounded-3xl bg-gradient-to-br from-indigo-600/50 to-fuchsia-600/50 p-7`}
              >
                <div className="text-[72px] leading-none text-white/40">“</div>
                <p className="-mt-4 text-[22px] font-medium italic leading-snug">{notes.quote}</p>
              </div>
            )}
          </div>
        )}

        {/* Bottom line */}
        {ig.bottomLine && (
          <div className="mt-12 rounded-3xl bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-rose-500 p-[2px]">
            <div className="rounded-[22px] bg-[#0f0d2a]/80 px-8 py-7">
              <div className="text-[15px] font-semibold uppercase tracking-[0.18em] text-fuchsia-200">
                The bottom line
              </div>
              <div className="mt-2 text-[28px] font-bold leading-snug">{ig.bottomLine}</div>
            </div>
          </div>
        )}

        <div className="mt-10 flex items-center justify-between text-[15px] text-slate-500">
          <span>
            Made with <span className="font-semibold text-slate-300">TubeScribe</span>
          </span>
          <span>youtu.be/{meta.videoId}</span>
        </div>
      </div>
    </div>
  );
});

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 mt-14 flex items-center gap-4">
      <span className="text-[15px] font-semibold uppercase tracking-[0.18em] text-indigo-200">{children}</span>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

export default InfographicCanvas;
