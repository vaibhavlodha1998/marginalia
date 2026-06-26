import { extractImages, getDocumentProxy } from "unpdf";

export interface ExtractedImage {
  page: number;
  png: Buffer;
  width: number;
  height: number;
}

const MIN_AREA = 15_000; // skip icons/logos

// Pull embedded raster images via unpdf (serverless pdfjs, no native canvas) and
// encode each to PNG with sharp.
export async function extractPdfImages(
  data: Uint8Array,
): Promise<ExtractedImage[]> {
  // Skip figures (rather than crash) if sharp's native binary is unavailable.
  let sharp: typeof import("sharp").default;
  try {
    ({ default: sharp } = await import("sharp"));
  } catch {
    return [];
  }

  const pdf = await getDocumentProxy(data);
  const out: ExtractedImage[] = [];

  for (let page = 1; page <= pdf.numPages; page++) {
    let images: Awaited<ReturnType<typeof extractImages>>;
    try {
      images = await extractImages(pdf, page);
    } catch {
      continue;
    }

    for (const img of images) {
      if (!img.data || !img.width || !img.height) continue;
      if (img.width * img.height < MIN_AREA) continue;
      try {
        const buf = Buffer.from(
          img.data.buffer,
          img.data.byteOffset,
          img.data.byteLength,
        );
        const png = await sharp(buf, {
          raw: { width: img.width, height: img.height, channels: img.channels },
        })
          .png()
          .toBuffer();
        out.push({ page, png, width: img.width, height: img.height });
      } catch {
        // skip undecodable image
      }
    }
  }

  return out;
}
