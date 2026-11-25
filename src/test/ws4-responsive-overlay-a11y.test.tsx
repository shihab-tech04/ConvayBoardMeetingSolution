import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResponsiveOverlay } from "../app/components/shared/ResponsiveOverlay";

vi.mock("../app/hooks/useUI", () => ({
  useUIState: () => ({ isDesktop: true }),
}));

describe("WS4 responsive overlay accessibility", () => {
  it("associates each simultaneously mounted dialog with its own heading", () => {
    render(
      <>
        <ResponsiveOverlay open onClose={() => {}} title="Meeting details">
          <p>Meeting details body</p>
        </ResponsiveOverlay>
        <ResponsiveOverlay open onClose={() => {}} title="Edit meeting">
          <p>Meeting editor body</p>
        </ResponsiveOverlay>
      </>,
    );

    const meeting = screen.getByRole("dialog", { name: "Meeting details" });
    const editor = screen.getByRole("dialog", { name: "Edit meeting" });
    expect(meeting).toBeInTheDocument();
    expect(editor).toBeInTheDocument();
    expect(meeting.getAttribute("aria-labelledby")).not.toBe(editor.getAttribute("aria-labelledby"));
  });

  it("supports an accessible label when its visual title is omitted", () => {
    render(
      <ResponsiveOverlay open onClose={() => {}} ariaLabel="Meeting filters">
        <p>Filters</p>
      </ResponsiveOverlay>,
    );

    expect(screen.getByRole("dialog", { name: "Meeting filters" })).toBeInTheDocument();
  });

  it("falls back to a generic accessible name for an untitled drawer", () => {
    render(
      <ResponsiveOverlay open onClose={() => {}}>
        <p>Additional information</p>
      </ResponsiveOverlay>,
    );

    expect(screen.getByRole("dialog", { name: "Details panel" })).toBeInTheDocument();
  });

  it("moves keyboard focus into a drawer with no close button", async () => {
    render(
      <ResponsiveOverlay open onClose={() => {}} title="Meeting actions" showCloseButton={false}>
        <button type="button">Save meeting</button>
      </ResponsiveOverlay>,
    );
    const panel = screen.getByRole("dialog", { name: "Meeting actions" });
    await waitFor(() => expect(panel).toHaveFocus());
    // userEvent simulates native Tab traversal; fireEvent.keyDown does not.
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Save meeting" })).toHaveFocus();
  });

  it("keeps the standard close action and Escape behavior", () => {
    const onClose = vi.fn();
    render(
      <ResponsiveOverlay open onClose={onClose} title="Meeting settings">
        <p>Settings</p>
      </ResponsiveOverlay>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
