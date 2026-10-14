"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, FileType2, Image as ImageIcon, PlayCircle, RotateCcw, Sparkles } from "lucide-react";
import ApiKeyCard from "@/components/ApiKeyCard";
import VideoCard, { formatLabel } from "@/components/VideoCard";
import Pipeline from "@/components/Pipeline";
import Results, { type Assets } from "@/components/Results";
import NotesDocument from "@/components/NotesDocument";
import InfographicCanvas from "@/components/InfographicCanvas";
import InfographicOptions, { type ImageQuality, type Orientation } from "@/components/InfographicOptions";
import { buildPdf, nodeToPng } from "@/lib/exporters";
import { generateGeminiImage } from "@/lib/gemini-image";
import type { Detail, Format, InfographicStyle, Notes, StepId, StepState, TranscriptResult } from "@/lib/types";

const KEY_STORE = "tubescribe:key";
const FORMATS_STORE = "tubescribe:formats";
const OPENAI_STORE = "tubescribe:openai-key";
const STYLE_STORE = "tubescribe:infographic-style";

const idleSteps = (): Record<StepId, StepState> => ({
  transcript: { status: "idle", detail: "" },
  notes: { status: "idle", detail: "" },
  design: { status: "idle", detail: "" },
});

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k) ?? "";
    } catch {
      return "";
    }
  },
  set: (k: string, v: string | null) => {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {
      /* storage unavailable */
    }
  },
};

async function postJSON<T>(url: string, body: unknown, apiKey: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-gemini-key": apiKey },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) {
    if (res.status === 504) throw new Error("The server timed out. Try a shorter video or a faster model.");
    throw new Error(data?.error || `Request failed (${res.status}).`);
  }
  return data as T;
}

/**
 * Has an image model draw the infographic from Gemini's brief: Gemini's image model is called straight from
 * the browser, OpenAI's goes through our server route.
 */
async function drawAiInfographic(
  n: Notes,
  style: "gemini" | "openai",
  keys: { gemini: string; openai: string },
  opts: { model: string; orientation: Orientation; quality: ImageQuality },
): Promise<Blob> {
  if (!n.imageBrief) throw new Error("Gemini didn't produce an infographic brief. Try generating again.");
  if (style === "gemini") {
    return generateGeminiImage({ apiKey: keys.gemini, brief: n.imageBrief, title: n.title, ...opts });
  }
  const openaiKey = keys.openai;
  const res = await fetch("/api/infographic-image", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-openai-key": openaiKey },
    body: JSON.stringify({ brief: n.imageBrief, title: n.title, ...opts }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    if (res.status === 504) throw new Error("Image generation timed out. Try Medium quality.");
    throw new Error(data?.error || `Image request failed (${res.status}).`);
  }
  return res.blob();
}

// A timer (not requestAnimationFrame) so the pipeline keeps going when the tab is in the background.
const afterRender = () => new Promise<void>((r) => setTimeout(r, 60));

export default function Home() {
  // Connection
  const [apiKey, setApiKey] = useState("");
  const [remember, setRemember] = useState(true);
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState("");
  const [connected, setConnected] = useState(false);

  // Input
  const [url, setUrl] = useState("");
  const [detail, setDetail] = useState<Detail>("detailed");
  const [language, setLanguage] = useState("auto");
  const [formats, setFormats] = useState<Format[]>(["text", "pdf"]);

  // Infographic (drawn by Gemini's or OpenAI's image model, or a local template)
  const [igStyle, setIgStyle] = useState<InfographicStyle>("gemini");
  const [geminiImageModels, setGeminiImageModels] = useState<string[]>([]);
  const [geminiImageModel, setGeminiImageModel] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiConnected, setOpenaiConnected] = useState(false);
  const [imageModels, setImageModels] = useState<string[]>([]);
  const [imageModel, setImageModel] = useState("");
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [quality, setQuality] = useState<ImageQuality>("high");

  // Run
  const [steps, setSteps] = useState(idleSteps);
  const [running, setRunning] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptResult | null>(null);
  const [notes, setNotes] = useState<Notes | null>(null);
  const [assets, setAssets] = useState<Assets>({});
  const [runFormats, setRunFormats] = useState<Format[]>([]);
  const [runStyle, setRunStyle] = useState<InfographicStyle>("gemini");
  const [redrawing, setRedrawing] = useState(false);
  const runId = useRef(0);
  const docRef = useRef<HTMLDivElement>(null);
  const igRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const step = (id: StepId, patch: Partial<StepState>) =>
    setSteps((s) => {
      const next = { ...s[id], ...patch };
      if (patch.status === "active") next.startedAt = Date.now();
      if (patch.status === "done" || patch.status === "error") next.endedAt = Date.now();
      return { ...s, [id]: next };
    });

  /* ---------- Gemini connection ---------- */

  const connect = useCallback(
    async (key = apiKey) => {
      const res = await fetch("/api/validate-key", { method: "POST", headers: { "x-gemini-key": key.trim() } });
      const data = await res.json().catch(() => ({ error: "Could not reach the server." }));
      if (!res.ok) throw new Error(data.error || "Key verification failed.");
      setModels(data.models);
      setModel(data.defaultModel);
      setGeminiImageModels(data.imageModels ?? []);
      setGeminiImageModel(data.imageModels?.[0] ?? "");
      setApiKey(key.trim());
      setConnected(true);
    },
    [apiKey],
  );

  // Restore a remembered key on first load.
  useEffect(() => {
    const saved = store.get(KEY_STORE);
    if (!saved) return;
    setApiKey(saved);
    connect(saved).catch(() => store.set(KEY_STORE, null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const saved = store.get(FORMATS_STORE).split(",").filter((f): f is Format => ["text", "pdf", "infographic"].includes(f));
    if (saved.length) setFormats(saved);
  }, []);

  useEffect(() => {
    store.set(FORMATS_STORE, formats.join(","));
  }, [formats]);

  useEffect(() => {
    if (connected) store.set(KEY_STORE, remember ? apiKey : null);
  }, [connected, remember, apiKey]);

  /* ---------- OpenAI connection (optional, for AI-drawn infographics) ---------- */

  const connectOpenAI = async (key = openaiKey) => {
    const res = await fetch("/api/openai/validate", { method: "POST", headers: { "x-openai-key": key.trim() } });
    const data = await res.json().catch(() => ({ error: "Could not reach the server." }));
    if (!res.ok) throw new Error(data.error || "Key verification failed.");
    setImageModels(data.models);
    setImageModel(data.defaultModel);
    setOpenaiKey(key.trim());
    setOpenaiConnected(true);
  };

  useEffect(() => {
    const style = store.get(STYLE_STORE);
    if (style === "gemini" || style === "openai" || style === "template") setIgStyle(style);
    else if (style === "ai") setIgStyle("openai"); // value saved by an earlier version
    const saved = store.get(OPENAI_STORE);
    if (!saved) return;
    setOpenaiKey(saved);
    connectOpenAI(saved).catch(() => store.set(OPENAI_STORE, null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    store.set(STYLE_STORE, igStyle);
  }, [igStyle]);

  useEffect(() => {
    if (openaiConnected) store.set(OPENAI_STORE, remember ? openaiKey : null);
  }, [openaiConnected, remember, openaiKey]);

  const disconnectOpenAI = () => {
    setOpenaiConnected(false);
    setImageModels([]);
    setOpenaiKey("");
    store.set(OPENAI_STORE, null);
  };

  const keys = { gemini: apiKey, openai: openaiKey };
  const imageOpts = (style: "gemini" | "openai") => ({
    model: style === "gemini" ? geminiImageModel : imageModel,
    orientation,
    quality,
  });
  const drawerName = (style: InfographicStyle) => (style === "gemini" ? "Gemini" : "ChatGPT");

  const disconnect = () => {
    setConnected(false);
    setModels([]);
    setGeminiImageModels([]);
    setApiKey("");
    store.set(KEY_STORE, null);
  };

  /* ---------- Orchestration ---------- */

  const resetOutputs = () => {
    setAssets((a) => {
      if (a.pdfUrl) URL.revokeObjectURL(a.pdfUrl);
      if (a.pngUrl) URL.revokeObjectURL(a.pngUrl);
      return {};
    });
    setTranscript(null);
    setNotes(null);
    setSteps(idleSteps());
  };

  const generate = async () => {
    const id = ++runId.current;
    const live = () => id === runId.current;
    resetOutputs();
    const fmts = [...formats];
    const wantPdf = fmts.includes("pdf");
    const wantPng = fmts.includes("infographic");
    const style = igStyle;
    setRunFormats(fmts);
    setRunStyle(style);
    setRunning(true);
    let current: StepId = "transcript";

    try {
      step("transcript", { status: "active", detail: "Reading the video's captions…" });
      const slow = setTimeout(() => {
        if (live()) step("transcript", { detail: "No captions found quickly — Gemini is watching the video to transcribe it…" });
      }, 6000);
      const t = await postJSON<TranscriptResult>("/api/transcript", { url, model }, apiKey).finally(() =>
        clearTimeout(slow),
      );
      if (!live()) return;
      setTranscript(t);
      step("transcript", {
        status: "done",
        detail: `${t.source === "captions" ? (t.autoGenerated ? "Auto-captions" : "Captions") : "Gemini transcript"} · ${t.wordCount.toLocaleString()} words`,
      });

      current = "notes";
      step("notes", { status: "active", detail: `${model} is structuring the ideas…` });
      const n = await postJSON<Notes>(
        "/api/notes",
        { transcript: t.text, title: t.title, author: t.author, model, detail, language, formats: fmts, infographicStyle: style },
        apiKey,
      );
      if (!live()) return;
      step("notes", {
        status: "done",
        detail: `${n.sections.length} sections · ${n.keyTakeaways.length} takeaways · ${n.definitions.length} key terms`,
      });

      current = "design";
      if (!wantPdf && !wantPng) {
        setNotes(n);
        step("design", { status: "done", detail: "Text notes ready — PDF and infographic skipped" });
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
        return;
      }
      step("design", {
        status: "active",
        detail:
          wantPng && style !== "template"
            ? `${wantPdf ? "PDF is being typeset; " : ""}the ${drawerName(style)} image model is drawing your infographic (usually 1–2 min)…`
            : `Building your ${formatLabel(fmts.filter((f) => f !== "text"))}…`,
      });
      setNotes(n); // mounts the off-screen render targets used below
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
      await afterRender();
      await new Promise((r) => setTimeout(r, 120));
      if (!live()) return;

      const [pdf, png] = await Promise.allSettled([
        wantPdf ? buildPdf(n, t, docRef.current) : Promise.resolve(null),
        !wantPng
          ? Promise.resolve(null)
          : style === "template"
            ? nodeToPng(igRef.current!)
            : drawAiInfographic(n, style, keys, imageOpts(style)),
      ]);
      if (!live()) return;
      const next: Assets = {};
      const problems: string[] = [];
      const made: string[] = [];
      if (pdf.status === "fulfilled") {
        if (pdf.value) {
          Object.assign(next, { pdf: pdf.value, pdfUrl: URL.createObjectURL(pdf.value) });
          made.push(`PDF (${kb(pdf.value)})`);
        }
      } else problems.push(`PDF: ${(pdf.reason as Error)?.message ?? "failed"}`);
      if (png.status === "fulfilled") {
        if (png.value) {
          Object.assign(next, { png: png.value, pngUrl: URL.createObjectURL(png.value) });
          made.push(`infographic (${kb(png.value)})`);
        }
      } else problems.push(`Infographic: ${(png.reason as Error)?.message ?? "failed"}`);
      if (problems.length) next.error = problems.join(" · ");
      setAssets(next);
      step("design", problems.length
        ? { status: "error", detail: problems.join(" · ") }
        : { status: "done", detail: `${made.join(" and ")} ready` });
    } catch (e) {
      if (live()) step(current, { status: "error", detail: (e as Error).message });
    } finally {
      if (live()) setRunning(false);
    }
  };

  /** Draws a fresh AI infographic from the same notes, leaving everything else as is. */
  const redraw = async () => {
    if (!notes || runStyle === "template") return;
    const style = runStyle;
    const id = runId.current;
    setRedrawing(true);
    step("design", { status: "active", detail: `The ${drawerName(style)} image model is redrawing the infographic…` });
    try {
      const png = await drawAiInfographic(notes, style, keys, imageOpts(style));
      if (id !== runId.current) return;
      setAssets((a) => {
        if (a.pngUrl) URL.revokeObjectURL(a.pngUrl);
        return { ...a, png, pngUrl: URL.createObjectURL(png), error: undefined };
      });
      step("design", { status: "done", detail: `New infographic drawn (${kb(png)})` });
    } catch (e) {
      if (id === runId.current) {
        setAssets((a) => ({ ...a, error: `Infographic: ${(e as Error).message}` }));
        step("design", { status: "error", detail: (e as Error).message });
      }
    } finally {
      setRedrawing(false);
    }
  };

  const blockReason = !formats.includes("infographic")
    ? undefined
    : igStyle === "openai" && !openaiConnected
      ? "Connect an OpenAI key for the ChatGPT-drawn infographic, or pick another style."
      : igStyle === "gemini" && connected && !geminiImageModels.length
        ? "Your Gemini key has no image models. Pick ChatGPT image or Template for the infographic."
        : undefined;

  const started = steps.transcript.status !== "idle";

  return (
    <main className="relative overflow-x-hidden">
      {/* Aurora background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="blob absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full bg-indigo-600/25 blur-[110px]" />
        <div className="blob absolute right-[-120px] top-[18%] h-[420px] w-[420px] rounded-full bg-fuchsia-600/20 blur-[110px] [animation-delay:-6s]" />
        <div className="blob absolute bottom-[-160px] left-[30%] h-[460px] w-[460px] rounded-full bg-rose-500/15 blur-[120px] [animation-delay:-12s]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        {/* Nav */}
        <nav className="flex items-center justify-between py-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 shadow-lg shadow-fuchsia-900/40">
              <PlayCircle className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-lg font-bold text-white">TubeScribe</span>
          </div>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-slate-300 hover:bg-white/10"
          >
            Powered by Gemini
          </a>
        </nav>

        {/* Hero */}
        <header className="rise mx-auto max-w-3xl pb-12 pt-8 text-center sm:pt-14">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs text-indigo-200">
            <Sparkles className="h-3.5 w-3.5" /> Video → knowledge in under a minute
          </div>
          <h1 className="font-display mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl">
            Turn any YouTube video into <span className="text-gradient">beautiful notes</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-slate-400 sm:text-lg">
            Paste a link. Get organised notes as text, a polished PDF and a shareable infographic — each ready to
            download.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2 text-xs text-slate-300">
            {[
              [FileText, "Markdown & text"],
              [FileType2, "Designed PDF"],
              [ImageIcon, "Infographic PNG"],
            ].map(([Icon, label]) => {
              const I = Icon as typeof FileText;
              return (
                <span key={label as string} className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5">
                  <I className="h-3.5 w-3.5 text-fuchsia-300" /> {label as string}
                </span>
              );
            })}
          </div>
        </header>

        {/* Inputs */}
        <div className="grid gap-8 pt-3 lg:grid-cols-2">
          <ApiKeyCard
            apiKey={apiKey}
            setApiKey={setApiKey}
            remember={remember}
            setRemember={setRemember}
            models={models}
            model={model}
            setModel={setModel}
            connected={connected}
            onConnect={() => connect()}
            onDisconnect={disconnect}
            disabled={running}
          />
          <VideoCard
            url={url}
            setUrl={setUrl}
            detail={detail}
            setDetail={setDetail}
            language={language}
            setLanguage={setLanguage}
            enabled={connected}
            running={running}
            onGenerate={generate}
            formats={formats}
            setFormats={setFormats}
            blockReason={blockReason}
            infographicOptions={
              <InfographicOptions
                style={igStyle}
                setStyle={setIgStyle}
                geminiImageModels={geminiImageModels}
                geminiImageModel={geminiImageModel}
                setGeminiImageModel={setGeminiImageModel}
                openaiKey={openaiKey}
                setOpenaiKey={setOpenaiKey}
                openaiConnected={openaiConnected}
                onConnectOpenAI={() => connectOpenAI()}
                onDisconnectOpenAI={disconnectOpenAI}
                openaiModels={imageModels}
                openaiModel={imageModel}
                setOpenaiModel={setImageModel}
                orientation={orientation}
                setOrientation={setOrientation}
                quality={quality}
                setQuality={setQuality}
                disabled={running || redrawing}
              />
            }
          />
        </div>

        {/* Pipeline */}
        {started && (
          <div className="mt-8">
            <Pipeline steps={steps} onRetry={running ? undefined : generate} />
          </div>
        )}

        {/* Results */}
        <div ref={resultsRef} className="scroll-mt-6">
          {transcript && notes && (
            <div className="mt-8">
              <Results
                transcript={transcript}
                notes={notes}
                assets={assets}
                formats={runFormats}
                onRedraw={runFormats.includes("infographic") && runStyle !== "template" && !running ? redraw : undefined}
                redrawing={redrawing}
              />
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => {
                    resetOutputs();
                    setUrl("");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={running}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-40"
                >
                  <RotateCcw className="h-4 w-4" /> Start with another video
                </button>
              </div>
            </div>
          )}
        </div>

        {/* How it works */}
        {!started && (
          <section className="mt-20 grid gap-5 sm:grid-cols-3">
            {[
              ["01", "Transcript", "We read the video's captions. No captions? Gemini watches the video and transcribes it."],
              ["02", "Structure", "Gemini distils the transcript into sections, takeaways, key terms and action items."],
              ["03", "Design", "Your notes are typeset into a PDF and an infographic, right in your browser."],
            ].map(([n, title, text]) => (
              <div key={n} className="glass rounded-3xl p-6">
                <div className="font-display text-gradient text-3xl font-bold">{n}</div>
                <div className="mt-3 font-semibold text-white">{title}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{text}</p>
              </div>
            ))}
          </section>
        )}

        <footer className="mt-20 text-center text-xs text-slate-600">
          TubeScribe · Notes are AI-generated — double-check anything important.
        </footer>
      </div>

      {/* Off-screen render targets for PDF fallback and infographic capture */}
      {transcript && notes && (
        <div aria-hidden className="pointer-events-none fixed left-[-20000px] top-0">
          {runFormats.includes("pdf") && (
            <div style={{ width: 794 }}>
              <NotesDocument ref={docRef} notes={notes} meta={transcript} />
            </div>
          )}
          {runFormats.includes("infographic") && runStyle === "template" && <InfographicCanvas ref={igRef} notes={notes} meta={transcript} />}
        </div>
      )}
    </main>
  );
}

const kb = (b?: Blob) => (b ? `${Math.max(1, Math.round(b.size / 1024))} KB` : "—");
