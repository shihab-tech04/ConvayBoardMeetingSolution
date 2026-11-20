import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PageCfg } from "../app/pages/modulePageUtils";
import { BoardPacksPage } from "../app/pages/agenda-documents/BoardPacksPage";

vi.mock("../app/data/boardMeetingData", () => ({
  useBoardPackRegistry: () => ({ items: [] }),
}));
vi.mock("../app/data/documentWorkspaceData", () => ({
  useBoardPackDocumentLinkRegistry: () => ({ items: [] }),
}));
vi.mock("../app/components/pages/GeneratedTablePage", () => ({
  GenPage: ({ cfg }: { cfg: PageCfg }) => (
    <section>
      <h1>{cfg.title}</h1>
      <span data-testid="entry-action">{cfg.entryBtn}</span>
      {cfg.drawerActions?.map(action => (
        <button key={action.id} disabled={action.enabled === false}
          title={action.disabledReason}>{action.label}</button>
      ))}
    </section>
  ),
}));

describe("DC-25 board-pack page respects server authority", () => {
  it("preserves existing page identity, creation entry and edit affordance", () => {
    render(<BoardPacksPage />);
    expect(screen.getByRole("heading", { name: "Board Packs" })).toBeTruthy();
    expect(screen.getByTestId("entry-action").textContent).toBe("Create Board Pack");
    expect(screen.getByRole("button", { name: "Edit Pack" }).hasAttribute("disabled")).toBe(false);
  });

  it("keeps unpublished server-dependent actions visible but unavailable", () => {
    render(<BoardPacksPage />);
    const expected = [
      ["Publish", /server approval/i],
      ["Download Pack", /authorized published manifest/i],
      ["Archive", /server-confirmed lifecycle/i],
    ] as const;
    for (const [label, reason] of expected) {
      const action = screen.getByRole("button", { name: label });
      expect(action.hasAttribute("disabled")).toBe(true);
      expect(action.getAttribute("title")).toMatch(reason);
    }
  });
});
