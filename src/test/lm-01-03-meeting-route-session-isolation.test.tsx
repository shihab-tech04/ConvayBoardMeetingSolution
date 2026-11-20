import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Link, MemoryRouter, Route, Routes } from "react-router";
import { LiveMeetingPage } from "../app/pages/meetings/LiveMeetingPage";

// Test the actual route and shell, but isolate the workspace's local state
// from its server and LiveKit side effects. No fake production admission.
vi.mock("../app/pages/meetings/LiveMeetingWorkspace", () => ({
  LiveMeetingWorkspace: ({ meetingId, entryAction }: { meetingId: string; entryAction: string }) => {
    const [mountedFor] = React.useState(meetingId);
    const [draft, setDraft] = React.useState("");
    return (
      <section aria-label="Mock regular meeting workspace">
        <span data-testid="mounted-for">{mountedFor}</span>
        <span data-testid="meeting-id">{meetingId}</span>
        <span data-testid="entry-action">{entryAction}</span>
        <input aria-label="Unsaved meeting note" value={draft} onChange={e => setDraft(e.target.value)} />
      </section>
    );
  },
}));

function renderRoutes() {
  return render(
    <MemoryRouter initialEntries={["/meetings/board-a/live?entry=join_meeting"]}>
      <Link to="/meetings/board-b/live?entry=join_meeting">Switch to meeting B</Link>
      <Link to="/meetings/board-a/live?entry=resume_meeting">Resume meeting A</Link>
      <Routes>
        <Route path="/meetings/:meetingId/live" element={<LiveMeetingPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("LM-01/03 regular-meeting route isolation", () => {
  it("remounts the workspace when the meeting identity changes", () => {
    renderRoutes();
    fireEvent.change(screen.getByRole("textbox", { name: "Unsaved meeting note" }), { target: { value: "A-only draft" } });
    expect(screen.getByDisplayValue("A-only draft")).toBeTruthy();
    expect(screen.getByTestId("mounted-for").textContent).toBe("board-a");

    fireEvent.click(screen.getByRole("link", { name: "Switch to meeting B" }));
    expect(screen.getByTestId("meeting-id").textContent).toBe("board-b");
    expect(screen.getByTestId("mounted-for").textContent).toBe("board-b");
    expect((screen.getByRole("textbox", { name: "Unsaved meeting note" }) as HTMLInputElement).value).toBe("");
  });

  it("remounts on returning to a different meeting, without restoring the prior session draft", () => {
    renderRoutes();
    fireEvent.change(screen.getByRole("textbox", { name: "Unsaved meeting note" }), { target: { value: "Private A-only note" } });
    fireEvent.click(screen.getByRole("link", { name: "Switch to meeting B" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Unsaved meeting note" }), { target: { value: "B-only note" } });
    fireEvent.click(screen.getByRole("link", { name: "Resume meeting A" }));
    expect(screen.getByTestId("mounted-for").textContent).toBe("board-a");
    expect(screen.getByTestId("entry-action").textContent).toBe("resume_meeting");
    expect((screen.getByRole("textbox", { name: "Unsaved meeting note" }) as HTMLInputElement).value).toBe("");
  });
});
