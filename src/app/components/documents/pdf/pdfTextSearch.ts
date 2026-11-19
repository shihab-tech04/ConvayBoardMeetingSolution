/** Text search over *all* PDF pages, including documents whose first page is image-only. */
export interface PdfTextSearchResult {
  pageNum: number;
  text: string;
  excerpt: string;
}

export interface PdfSearchableDocument {
  numPages: number;
  getPage: (pageNumber: number) => Promise<{
    getTextContent: () => Promise<{ items: readonly unknown[] }>;
  }>;
}

/**
 * Returns at most one result per matching page, preserving the existing search
 * panel's result semantics. `isCurrent` lets a newer query/document cancel an
 * older search without allowing its late responses to navigate the viewer.
 */
export async function searchPdfText(
  document: PdfSearchableDocument,
  query: string,
  isCurrent: () => boolean,
): Promise<PdfTextSearchResult[]> {
  const needle = query.trim().toLowerCase();
  if (!needle || !isCurrent()) return [];

  const found: PdfTextSearchResult[] = [];
  for (let pageNum = 1; pageNum <= document.numPages; pageNum += 1) {
    if (!isCurrent()) return [];
    const page = await document.getPage(pageNum);
    if (!isCurrent()) return [];
    const content = await page.getTextContent();
    if (!isCurrent()) return [];
    const text = content.items
      .filter((item): item is { str: string } =>
        typeof item === "object" && item !== null && "str" in item &&
        typeof (item as { str?: unknown }).str === "string",
      )
      .map(item => item.str)
      .join(" ");

    const index = text.toLowerCase().indexOf(needle);
    if (index === -1) continue;
    found.push({
      pageNum,
      text,
      excerpt: `…${text.slice(Math.max(0, index - 30), Math.min(text.length, index + needle.length + 30))}…`,
    });
  }
  return found;
}
