/** Wraps Gemini's content brief with the visual style of a dense, textbook-style revision sheet. */
export function buildImagePrompt(brief: string, title: string, landscape: boolean): string {
  return `Create a professional, print-quality educational infographic revision sheet titled "${title}".

VISUAL STYLE
- ${landscape ? "Landscape" : "Portrait"} layout on a clean white background, flat vector design like a premium textbook revision poster.
- Split the content into 3 colour-coded panels (blue, green, purple) ${landscape ? "side by side as columns" : "stacked top to bottom"}. Each panel has a bold coloured header banner with a large white circled number, a title and a one-line subtitle.
- Inside panels, use numbered sub-sections (1.1, 1.2, 2.1 …) with rounded pill-shaped number labels in the panel colour and a light tinted heading bar.
- Use bullet lists, compact tables with tinted header rows, small clean labelled diagrams, "Key points" boxes with green check icons, highlighted formula/definition boxes, numbered circle lists and soft pastel boxes to group information.
- Dense but tidy: consistent margins, aligned grids, strong visual hierarchy, crisp sharp sans-serif typography that is easy to read.

TEXT ACCURACY
- Render every piece of text exactly as written in the content below, with correct spelling.
- Do not add any extra text, placeholder text, logos or watermarks.

CONTENT
${brief}`;
}
