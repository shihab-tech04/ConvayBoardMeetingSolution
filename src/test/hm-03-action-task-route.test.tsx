import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("../app/components/pages/GeneratedTablePage", () => ({
  GenPage: ({ cfg }: { cfg: { initialDrawerRowId?: string } }) => (
    <p data-testid="linked-action-id">{cfg.initialDrawerRowId ?? ""}</p>
  ),
}));
vi.mock("../app/data/boardMeetingData", async original => {
  const actual = await original<typeof import("../app/data/boardMeetingData")>();
  return {
    ...actual,
    useActionItemRegistry: () => ({ items: [], add: vi.fn() }),
    useMeetingRegistry: () => ({ items: [] }),
    useGovernanceRegistry: () => ({ items: [] }),
    generateId: () => "action-new",
  };
});

import { DoubleEntryStatusPage } from "../app/pages/psr-verification/DoubleEntryStatusPage";

describe("HM-03 assigned action deep link", () => {
  it("passes the requested record id to the authenticated action registry page", () => {
    render(
      <MemoryRouter initialEntries={["/decisions-followup/action-items?view=action-42"]}>
        <DoubleEntryStatusPage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("linked-action-id")).toHaveTextContent("action-42");
  });

  it("does not invent a selected record when no view id is provided", () => {
    render(
      <MemoryRouter initialEntries={["/decisions-followup/action-items"]}>
        <DoubleEntryStatusPage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("linked-action-id")).toBeEmptyDOMElement();
  });
});

