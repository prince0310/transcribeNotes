"use client";
// Client-side builders for every download format: Markdown, plain text, PDF and PNG.
import type { Notes, TranscriptResult } from "./types";
import { tsToSeconds, watchUrl } from "./youtube-id";

type Meta = Pick<TranscriptResult, "videoId" | "title" | "author">;

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "notes";

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const textBlob = (text: string, type = "text/plain") =>
  new Blob([text], { type: `${type};charset=utf-8` });

/* ---------------------------------- Text ---------------------------------- */

export function toMarkdown(n: Notes, m: Meta): string {
  const out: string[] = [`# ${n.title}`, ""];
  if (n.subtitle) out.push(`> ${n.subtitle}`, "");
  out.push(`**Source:** [${m.title}](${watchUrl(m.videoId)})${m.author ? ` — ${m.author}` : ""}`, "");
  if (n.summary) out.push("## Summary", "", n.summary, "");
  if (n.keyTakeaways.length) out.push("## Key Takeaways", "", ...n.keyTakeaways.map((t, i) => `${i + 1}. ${t}`), "");
  if (n.sections.length) {
    out.push("## Detailed Notes", "");
    n.sections.forEach((s, i) => {
      const sec = tsToSeconds(s.timestamp);
      const ts = sec !== null ? ` ([${s.timestamp}](${watchUrl(m.videoId, sec)}))` : "";
      out.push(`### ${i + 1}. ${s.heading}${ts}`, "");
      if (s.summary) out.push(`_${s.summary}_`, "");
      out.push(...s.points.map((p) => `- ${p}`), "");
    });
  }
  if (n.definitions.length) out.push("## Key Terms", "", ...n.definitions.map((d) => `- **${d.term}** — ${d.meaning}`), "");
  if (n.actionItems.length) out.push("## Action Items", "", ...n.actionItems.map((a) => `- [ ] ${a}`), "");
  if (n.quote) out.push("## Memorable Quote", "", `> "${n.quote}"`, "");
  return out.join("\n");
}

export function toPlainText(n: Notes, m: Meta): string {
  const rule = (s: string, ch = "=") => `${s}\n${ch.repeat(Math.min(s.length, 70))}`;
  const out: string[] = [rule(n.title.toUpperCase())];
  if (n.subtitle) out.push(n.subtitle);
  out.push(`Source: ${m.title}${m.author ? ` (${m.author})` : ""}`, watchUrl(m.videoId), "");
  if (n.summary) out.push(rule("SUMMARY", "-"), n.summary, "");
  if (n.keyTakeaways.length) out.push(rule("KEY TAKEAWAYS", "-"), ...n.keyTakeaways.map((t, i) => `${i + 1}. ${t}`), "");
  if (n.sections.length) {
    out.push(rule("DETAILED NOTES", "-"), "");
    n.sections.forEach((s, i) => {
      out.push(`${i + 1}. ${s.heading}${s.timestamp ? `  [${s.timestamp}]` : ""}`);
      if (s.summary) out.push(`   ${s.summary}`);
      out.push(...s.points.map((p) => `   • ${p}`), "");
    });
  }
  if (n.definitions.length) out.push(rule("KEY TERMS", "-"), ...n.definitions.map((d) => `• ${d.term}: ${d.meaning}`), "");
  if (n.actionItems.length) out.push(rule("ACTION ITEMS", "-"), ...n.actionItems.map((a) => `[ ] ${a}`), "");
  if (n.quote) out.push(rule("MEMORABLE QUOTE", "-"), `"${n.quote}"`, "");
  return out.join("\n");
}

/* ---------------------------------- PNG ----------------------------------- */

export async function nodeToPng(node: HTMLElement): Promise<Blob> {
  const { toBlob } = await import("html-to-image");
  await document.fonts?.ready;
  const opts = { pixelRatio: 2, cacheBust: true };
  const blob = (await toBlob(node, opts).catch(() => toBlob(node, { ...opts, skipFonts: true }))) ?? null;
  if (!blob) throw new Error("Could not render the infographic image.");
  return blob;
}

/* ---------------------------------- PDF ----------------------------------- */

// jsPDF's built-in fonts only cover Latin-1, so normalise common typography first.
function latin(s: string): string {
  return s
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—―]/g, "-")
    .replace(/…/g, "...")
    .replace(/[•●▪]/g, "-")
    .replace(/→/g, "->")
    .replace(/[✓✔]/g, "v")
    .replace(/[  -​ ]/g, " ")
    .replace(/[‌-‏️]/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "");
}
const isLatin1 = (s: string) => !/[^\x00-\xff]/.test(s);

type RGB = [number, number, number];
const C = {
  ink: [15, 23, 42] as RGB,
  body: [51, 65, 85] as RGB,
  muted: [100, 116, 139] as RGB,
  brand: [99, 102, 241] as RGB,
  pink: [217, 70, 239] as RGB,
  soft: [238, 242, 255] as RGB,
  line: [226, 232, 240] as RGB,
};

/**
 * Builds a real, selectable-text PDF. If the notes contain scripts that the built-in PDF fonts
 * can't draw (Hindi, Japanese, Arabic…), falls back to rendering `fallbackNode` as page images.
 */
export async function buildPdf(n: Notes, m: Meta, fallbackNode?: HTMLElement | null): Promise<Blob> {
  const allText = latin(JSON.stringify({ ...n, infographic: undefined }) + m.title + m.author);
  if (!isLatin1(allText) && fallbackNode) return buildImagePdf(fallbackNode);

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 54;
  const CW = W - M * 2;
  const BOTTOM = H - 56;
  let y = 0;

  const font = (size: number, style: "normal" | "bold" | "italic" | "bolditalic" = "normal", color: RGB = C.body) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const newPage = () => {
    doc.addPage();
    y = 56;
  };
  const ensure = (h: number) => {
    if (y + h > BOTTOM) newPage();
  };
  const wrap = (text: string, width: number) => doc.splitTextToSize(latin(text), width) as string[];

  /** Writes wrapped text starting at the current y (top of the first line). */
  const para = (text: string, size: number, opts: { x?: number; width?: number; lh?: number } = {}) => {
    const x = opts.x ?? M;
    const lh = size * (opts.lh ?? 1.5);
    for (const line of wrap(text, opts.width ?? CW - (x - M))) {
      ensure(lh);
      doc.text(line, x, y + size * 0.9);
      y += lh;
    }
  };

  const heading = (text: string) => {
    ensure(60);
    y += 16;
    doc.setFillColor(...C.brand);
    doc.roundedRect(M, y + 1, 4, 18, 2, 2, "F");
    font(15, "bold", C.ink);
    doc.text(latin(text), M + 14, y + 15);
    y += 32;
  };

  const bullet = (text: string, x = M + 4, color: RGB = C.brand) => {
    font(10.5, "normal", C.body);
    const lines = wrap(text, CW - (x - M) - 14);
    ensure(16);
    doc.setFillColor(...color);
    doc.circle(x + 2.5, y + 6.5, 2.2, "F");
    for (const line of lines) {
      ensure(16);
      doc.text(line, x + 14, y + 10);
      y += 16;
    }
    y += 3;
  };

  /* Cover band: a horizontal brand gradient drawn as thin strips. */
  const bandH = 168;
  const steps = 80;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    doc.setFillColor(
      Math.round(79 + (192 - 79) * t),
      Math.round(70 + (38 - 70) * t),
      Math.round(229 + (211 - 229) * t),
    );
    doc.rect((W / steps) * i, 0, W / steps + 1, bandH, "F");
  }
  font(9, "bold", [224, 231, 255]);
  doc.text("VIDEO NOTES", M, 44);
  font(24, "bold", [255, 255, 255]);
  let ty = 74;
  for (const line of wrap(n.title, CW).slice(0, 3)) {
    doc.text(line, M, ty);
    ty += 28;
  }
  font(9.5, "normal", [237, 233, 254]);
  doc.text(wrap(`${m.title}${m.author ? `  ·  ${m.author}` : ""}`, CW)[0] ?? "", M, bandH - 22);
  y = bandH + 26;

  if (n.subtitle) {
    font(12, "italic", C.muted);
    para(n.subtitle, 12);
    y += 4;
  }

  if (n.summary) {
    heading("Summary");
    font(11, "normal", C.body);
    para(n.summary, 11);
  }

  if (n.keyTakeaways.length) {
    heading("Key Takeaways");
    font(10.5, "normal", C.body);
    const blocks = n.keyTakeaways.map((t) => wrap(t, CW - 52));
    const boxH = blocks.reduce((h, b) => h + b.length * 16 + 8, 0) + 20;
    if (boxH < BOTTOM - 56) ensure(boxH);
    const fits = y + boxH <= BOTTOM;
    if (fits) {
      doc.setFillColor(...C.soft);
      doc.roundedRect(M, y, CW, boxH, 8, 8, "F");
    }
    y += 14;
    blocks.forEach((lines, i) => {
      ensure(18);
      doc.setFillColor(...C.brand);
      doc.circle(M + 22, y + 6, 8, "F");
      font(8.5, "bold", [255, 255, 255]);
      doc.text(String(i + 1), M + 22, y + 9, { align: "center" });
      font(10.5, "normal", C.ink);
      for (const line of lines) {
        ensure(16);
        doc.text(line, M + 38, y + 10);
        y += 16;
      }
      y += 8;
    });
    y += 6;
  }

  if (n.sections.length) {
    heading("Detailed Notes");
    n.sections.forEach((s, i) => {
      ensure(70);
      y += 6;
      font(12.5, "bold", C.ink);
      const label = `${i + 1}.  ${s.heading}`;
      const lines = wrap(label, CW - 60);
      lines.forEach((line, li) => {
        doc.text(line, M, y + 12);
        if (li === 0 && s.timestamp) {
          const sec = tsToSeconds(s.timestamp);
          font(9, "bold", C.pink);
          if (sec !== null) doc.textWithLink(s.timestamp, W - M, y + 12, { url: watchUrl(m.videoId, sec), align: "right" });
          else doc.text(s.timestamp, W - M, y + 12, { align: "right" });
          font(12.5, "bold", C.ink);
        }
        y += 17;
      });
      doc.setDrawColor(...C.line);
      doc.setLineWidth(0.8);
      doc.line(M, y + 1, W - M, y + 1);
      y += 8;
      if (s.summary) {
        font(10.5, "italic", C.muted);
        para(s.summary, 10.5);
        y += 2;
      }
      s.points.forEach((p) => bullet(p));
      y += 6;
    });
  }

  if (n.definitions.length) {
    heading("Key Terms");
    n.definitions.forEach((d) => {
      ensure(34);
      font(10.5, "bold", C.ink);
      para(d.term, 10.5, { lh: 1.4 });
      font(10.5, "normal", C.body);
      para(d.meaning, 10.5, { x: M + 12 });
      y += 4;
    });
  }

  if (n.actionItems.length) {
    heading("Action Items");
    n.actionItems.forEach((a) => {
      font(10.5, "normal", C.body);
      const lines = wrap(a, CW - 22);
      ensure(18);
      doc.setDrawColor(...C.brand);
      doc.setLineWidth(1.1);
      doc.roundedRect(M + 1, y + 1, 10, 10, 2, 2, "S");
      for (const line of lines) {
        ensure(16);
        doc.text(line, M + 20, y + 10);
        y += 16;
      }
      y += 4;
    });
  }

  if (n.quote) {
    heading("Memorable Quote");
    font(13, "italic", C.ink);
    const lines = wrap(`"${n.quote}"`, CW - 22);
    const h = lines.length * 19;
    ensure(h + 8);
    doc.setFillColor(...C.pink);
    doc.rect(M, y, 3, h, "F");
    lines.forEach((line) => {
      doc.text(line, M + 16, y + 13);
      y += 19;
    });
  }

  /* Footer on every page. */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...C.line);
    doc.setLineWidth(0.6);
    doc.line(M, H - 36, W - M, H - 36);
    font(8, "normal", C.muted);
    doc.text(wrap(`TubeScribe  ·  ${n.title}`, CW - 80)[0] ?? "", M, H - 22);
    doc.text(`${p} / ${pages}`, W - M, H - 22, { align: "right" });
  }

  return doc.output("blob");
}

/** Image-based PDF: renders a DOM node and slices it into A4 pages. Works for any script. */
async function buildImagePdf(node: HTMLElement): Promise<Blob> {
  const { toCanvas } = await import("html-to-image");
  const { jsPDF } = await import("jspdf");
  await document.fonts?.ready;
  const canvas = await toCanvas(node, { pixelRatio: 1.75, backgroundColor: "#ffffff", cacheBust: true });
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const pageHpx = Math.floor((canvas.width * H) / W);

  for (let y0 = 0, i = 0; y0 < canvas.height; y0 += pageHpx, i++) {
    const h = Math.min(pageHpx, canvas.height - y0);
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = h;
    const ctx = slice.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, slice.width, h);
    ctx.drawImage(canvas, 0, y0, canvas.width, h, 0, 0, canvas.width, h);
    if (i > 0) doc.addPage();
    doc.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, W, (h * W) / canvas.width);
  }
  return doc.output("blob");
}
