import { extractText, getDocumentProxy } from "unpdf";

export interface ExtractedPdf {
  pages: string[];
}

// unpdf ships a serverless pdfjs build that needs no native canvas/DOMMatrix, so
// text extraction works on Vercel and Windows alike.
export async function extractPdfText(data: Uint8Array): Promise<ExtractedPdf> {
  const pdf = await getDocumentProxy(data);
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = (Array.isArray(text) ? text : [text]).map((t) =>
    t.replace(/\s+/g, " ").trim(),
  );
  return { pages };
}
