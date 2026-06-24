export interface DocChunk {
  content: string;
  page: number;
  orderIndex: number;
}

export function chunkPages(
  pages: { pageNo: number; text: string }[],
  size = 1100,
  overlap = 150,
): DocChunk[] {
  const chunks: DocChunk[] = [];
  let order = 0;

  for (const p of pages) {
    const text = p.text.replace(/\s+/g, " ").trim();
    if (!text) continue;

    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + size, text.length);
      let slice = text.slice(start, end);
      if (end < text.length) {
        const lastSpace = slice.lastIndexOf(" ");
        if (lastSpace > size * 0.6) slice = slice.slice(0, lastSpace);
      }
      const content = slice.trim();
      if (content) chunks.push({ content, page: p.pageNo, orderIndex: order++ });
      start += Math.max(1, slice.length - overlap);
    }
  }
  return chunks;
}
