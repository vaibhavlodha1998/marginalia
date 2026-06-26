import sharp from "sharp";

export interface ExtractedImage {
  page: number;
  png: Buffer;
  width: number;
  height: number;
}

const MIN_AREA = 15_000; // skip icons/logos

interface PdfImage {
  width: number;
  height: number;
  kind: number;
  data: Uint8Array | Uint8ClampedArray;
}

function getObj(objs: { get(name: string, cb: (v: unknown) => void): void }, name: string) {
  return new Promise<unknown>((resolve) => objs.get(name, resolve));
}

// Pulls embedded raster images straight out of the PDF (no rasterization /
// native canvas needed) and encodes each to PNG.
export async function extractPdfImages(
  data: Uint8Array,
): Promise<ExtractedImage[]> {
  const { getDocument, OPS } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = getDocument({ data });
  const doc = await loadingTask.promise;
  const out: ExtractedImage[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const ops = await page.getOperatorList();
    const seen = new Set<string>();

    for (let j = 0; j < ops.fnArray.length; j++) {
      if (ops.fnArray[j] !== OPS.paintImageXObject) continue;
      const name = ops.argsArray[j][0];
      if (typeof name !== "string" || seen.has(name)) continue;
      seen.add(name);

      try {
        const img = (await getObj(page.objs, name)) as PdfImage | null;
        if (!img?.data || !img.width || !img.height) continue;
        if (img.width * img.height < MIN_AREA) continue;
        const channels = img.kind === 3 ? 4 : img.kind === 2 ? 3 : 0;
        if (!channels) continue; // unsupported (e.g. 1-bpp masks)

        const buf = Buffer.from(
          img.data.buffer ?? (img.data as unknown as ArrayBuffer),
        );
        if (buf.length < img.width * img.height * channels) continue;

        const png = await sharp(buf, {
          raw: { width: img.width, height: img.height, channels },
        })
          .png()
          .toBuffer();
        out.push({ page: i, png, width: img.width, height: img.height });
      } catch {
        // skip undecodable image
      }
    }
    page.cleanup();
  }

  await loadingTask.destroy();
  return out;
}
