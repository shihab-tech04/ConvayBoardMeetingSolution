import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationDropdown } from "../app/components/dropdowns/NotificationDropdown";

vi.mock("../app/hooks/useUI", () => ({
  useUIState: () => ({ isDesktop: true }),
}));

const sample = {
  id: "n1", type: "approval" as const, priority: "high" as const,
  title: "Review agenda", message: "Board pack is ready",
  module: "Agenda", time: "Today", isRead: false,
  destination: { main: "meetings", sub: "all-meetings" },
};

function renderDropdown(overrides: Record<string, unknown> = {}) {
  const defaults = {
    notifications: [sample], onClose: vi.fn(),
    onNotificationClick: vi.fn(), onMarkAllRead: vi.fn(),
    onSeeAll: vi.fn(), onRetry: vi.fn(),
  };
  const props = { ...defaults, ...overrides };
  render(<NotificationDropdown {...props} />);
  return props;
}

describe("HM-07 notification access UI", () => {
  it("opens the full notification inbox rather than merely closing the dropdown", () => {
    const props = renderDropdown();
    fireEvent.click(screen.getByRole("button", { name: "See all notifications" }));
    expect(props.onSeeAll).toHaveBeenCalledOnce();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it("reports errors with a retry and never claims success when the database fails", () => {
    const props = renderDropdown({ error: "Unable to read notifications" });
    expect(screen.getByRole("alert")).toHaveTextContent("Notifications unavailable");
    expect(screen.queryByText("You are all caught up.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(props.onRetry).toHaveBeenCalledOnce();
  });

  it("announces loading instead of displaying a false empty inbox", () => {
    renderDropdown({ notifications: [], loading: true });
    expect(screen.getByRole("status")).toHaveTextContent("Loading notifications");
    expect(screen.queryByText("You are all caught up.")).not.toBeInTheDocument();
  });

  it("offers read acknowledgement and a real notification navigation", () => {
    const props = renderDropdown();
    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    expect(props.onMarkAllRead).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: /Review agenda/ }));
    expect(props.onNotificationClick).toHaveBeenCalledWith(sample);
  });
});
