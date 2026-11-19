import { describe, expect, it, vi } from "vitest";
import { requestPdfPage } from "../app/components/documents/pdf/pdfPageRequest";

describe("DC-16 PDF page navigation", () => {
  it("commits the selected page when the request remains current", async () => {
    const onSuccess = vi.fn();
    const onFailure = vi.fn();
    await requestPdfPage({
      getPage: async n => ({ pageNumber: n }), pageNumber: 2, totalPages: 5,
      isCurrent: () => true, onSuccess, onFailure,
    });
    expect(onSuccess).toHaveBeenCalledWith({ pageNumber: 2 });
    expect(onFailure).not.toHaveBeenCalled();
  });

  it("ignores a stale page returned after navigation", async () => {
    let finish!: (page: { pageNumber: number }) => void;
    let active = true;
    const onSuccess = vi.fn();
    const promise = requestPdfPage({
      getPage: () => new Promise(resolve => { finish = resolve; }),
      pageNumber: 1, totalPages: 3,
      isCurrent: () => active, onSuccess, onFailure: vi.fn(),
    });
    active = false;
    finish({ pageNumber: 1 });
    await promise;
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("ignores a stale rejected request without surfacing a new error", async () => {
    let reject!: (error: Error) => void;
    let active = true;
    const onFailure = vi.fn();
    const promise = requestPdfPage({
      getPage: () => new Promise((_resolve, fail) => { reject = fail; }),
      pageNumber: 1, totalPages: 3,
      isCurrent: () => active, onSuccess: vi.fn(), onFailure,
    });
    active = false;
    reject(new Error("late load error"));
    await promise;
    expect(onFailure).not.toHaveBeenCalled();
  });

  it("reports the active page-load error for the existing error/retry UI", async () => {
    const error = new Error("unable to render page");
    const onFailure = vi.fn();
    await requestPdfPage({
      getPage: async () => { throw error; }, pageNumber: 2, totalPages: 3,
      isCurrent: () => true, onSuccess: vi.fn(), onFailure,
    });
    expect(onFailure).toHaveBeenCalledWith(error);
  });

  it("rejects invalid pages without calling PDF.js", async () => {
    const getPage = vi.fn();
    const onFailure = vi.fn();
    await requestPdfPage({
      getPage, pageNumber: 9, totalPages: 2,
      isCurrent: () => true, onSuccess: vi.fn(), onFailure,
    });
    expect(getPage).not.toHaveBeenCalled();
    expect(onFailure).toHaveBeenCalledWith(expect.any(RangeError));
  });
});
