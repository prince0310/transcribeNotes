import { forwardRef } from "react";
import type { Notes, TranscriptResult } from "@/lib/types";
import { tsToSeconds, watchUrl } from "@/lib/youtube-id";

type Meta = Pick<TranscriptResult, "videoId" | "title" | "author">;

/** The "paper" rendering of the notes. Used for the on-screen preview and the image-PDF fallback. */
const NotesDocument = forwardRef<HTMLDivElement, { notes: Notes; meta: Meta }>(function NotesDocument(
  { notes: n, meta },
  ref,
) {
  const readMins = Math.max(
    1,
    Math.round(
      JSON.stringify({ ...n, infographic: null })
        .split(/\s+/)
        .length / 220,
    ),
  );
  return (
    <div ref={ref} className="overflow-hidden rounded-2xl bg-white text-slate-700 shadow-2xl">
      <header className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-8 pb-8 pt-9 text-white sm:px-10">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-100">Video Notes</div>
        <h1 className="font-display mt-3 text-3xl font-bold leading-tight sm:text-[34px]">{n.title}</h1>
        {n.subtitle && <p className="mt-2 text-[15px] text-indigo-50/90">{n.subtitle}</p>}
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/15 px-3 py-1">{meta.author || "YouTube"}</span>
          <span className="rounded-full bg-white/15 px-3 py-1">{n.sections.length} sections</span>
          <span className="rounded-full bg-white/15 px-3 py-1">{readMins} min read</span>
        </div>
      </header>

      <div className="space-y-9 px-8 py-9 sm:px-10">
        {n.summary && (
          <Block title="Summary">
            <p className="text-[15px] leading-7">{n.summary}</p>
          </Block>
        )}

        {n.keyTakeaways.length > 0 && (
          <Block title="Key Takeaways">
            <ol className="space-y-3 rounded-2xl bg-indigo-50 p-5">
              {n.keyTakeaways.map((t, i) => (
                <li key={i} className="flex gap-3 text-[14.5px] leading-6 text-slate-800">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  {t}
                </li>
              ))}
            </ol>
          </Block>
        )}

        {n.sections.length > 0 && (
          <Block title="Detailed Notes">
            <div className="space-y-7">
              {n.sections.map((s, i) => {
                const sec = tsToSeconds(s.timestamp);
                return (
                  <article key={i}>
                    <div className="flex items-baseline justify-between gap-4 border-b border-slate-200 pb-2">
                      <h3 className="text-[17px] font-semibold text-slate-900">
                        <span className="mr-2 text-indigo-500">{i + 1}.</span>
                        {s.heading}
                      </h3>
                      {s.timestamp &&
                        (sec !== null ? (
                          <a
                            href={watchUrl(meta.videoId, sec)}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 rounded-full bg-fuchsia-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-fuchsia-600 hover:bg-fuchsia-100"
                          >
                            ▶ {s.timestamp}
                          </a>
                        ) : (
                          <span className="shrink-0 font-mono text-xs text-fuchsia-600">{s.timestamp}</span>
                        ))}
                    </div>
                    {s.summary && <p className="mt-2.5 text-[14px] italic text-slate-500">{s.summary}</p>}
                    <ul className="mt-3 space-y-2">
                      {s.points.map((p, j) => (
                        <li key={j} className="flex gap-3 text-[14.5px] leading-6">
                          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </Block>
        )}

        {n.definitions.length > 0 && (
          <Block title="Key Terms">
            <dl className="grid gap-3 sm:grid-cols-2">
              {n.definitions.map((d, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-4">
                  <dt className="font-semibold text-slate-900">{d.term}</dt>
                  <dd className="mt-1 text-[13.5px] leading-6 text-slate-600">{d.meaning}</dd>
                </div>
              ))}
            </dl>
          </Block>
        )}

        {n.actionItems.length > 0 && (
          <Block title="Action Items">
            <ul className="space-y-2.5">
              {n.actionItems.map((a, i) => (
                <li key={i} className="flex gap-3 text-[14.5px] leading-6">
                  <span className="mt-1 h-4 w-4 shrink-0 rounded border-2 border-indigo-400" />
                  {a}
                </li>
              ))}
            </ul>
          </Block>
        )}

        {n.quote && (
          <blockquote className="border-l-4 border-fuchsia-500 pl-5 text-lg italic leading-8 text-slate-800">
            “{n.quote}”
          </blockquote>
        )}

        <footer className="border-t border-slate-200 pt-4 text-xs text-slate-400">
          Source: {meta.title}
          {meta.author ? ` — ${meta.author}` : ""} · {watchUrl(meta.videoId)}
        </footer>
      </div>
    </div>
  );
});

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-3 text-lg font-bold text-slate-900">
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-indigo-500 to-fuchsia-500" />
        {title}
      </h2>
      {children}
    </section>
  );
}

export default NotesDocument;
