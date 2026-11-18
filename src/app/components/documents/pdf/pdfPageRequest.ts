/**
 * DC-16: Resolve only the current PDF page navigation request.
 * Every caller supplies a current-request predicate, allowing a React effect
 * cleanup to ignore late completions and errors when the page/document changes.
 */
export interface PdfPageRequest<Page> {
  getPage: (pageNumber: number) => Promise<Page>;
  pageNumber: number;
  totalPages: number;
  isCurrent: () => boolean;
  onSuccess: (page: Page) => void;
  onFailure: (error: unknown) => void;
}

export async function requestPdfPage<Page>({
  getPage,
  pageNumber,
  totalPages,
  isCurrent,
  onSuccess,
  onFailure,
}: PdfPageRequest<Page>): Promise<void> {
  if (!Number.isSafeInteger(pageNumber) || !Number.isSafeInteger(totalPages) ||
      pageNumber < 1 || pageNumber > totalPages) {
    if (isCurrent()) onFailure(new RangeError("PDF page is outside the document page range."));
    return;
  }

  try {
    const page = await getPage(pageNumber);
    if (isCurrent()) onSuccess(page);
  } catch (error) {
    if (isCurrent()) onFailure(error);
  }
}
