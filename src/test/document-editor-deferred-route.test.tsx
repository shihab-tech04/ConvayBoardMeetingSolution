import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mock = vi.hoisted(() => ({ loaded: vi.fn() }));
vi.mock("../app/pages/agenda-documents/DocumentEditorPage", () => {
  mock.loaded();
  return { DocumentEditorPage: () => <div>Original document editor</div> };
});
import { DocumentEditorRoute } from "../app/pages/agenda-documents/DocumentEditorRoute.pages";

describe("production document editor route", () => {
  it("loads the existing editor only when its route renders, preserving the approved editor", async () => {
    expect(mock.loaded).not.toHaveBeenCalled();
    render(<DocumentEditorRoute />);
    expect(await screen.findByText("Original document editor")).toBeInTheDocument();
    expect(mock.loaded).toHaveBeenCalledTimes(1);
  });
});
