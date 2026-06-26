export interface ExtractedPdf {
  pages: string[];
}

export async function extractPdfText(data: Uint8Array): Promise<ExtractedPdf> {
  // Lazy-import so pdfjs (which needs a DOMMatrix polyfill) never loads during a
  // server render, only when extraction actually runs.
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = getDocument({ data, useSystemFonts: true });
  const doc = await loadingTask.promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push(text);
  }

  await loadingTask.destroy();
  return { pages };
}
