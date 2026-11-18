import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { VerifiedIntegrationKpis } from "../app/pages/administration/VerifiedIntegrationKpis";

describe("NI-15 verified connection count display", () => {
  it("does not fabricate zero counts during a pending provider read", () => {
    render(<VerifiedIntegrationKpis read={{ state: "loading" }} />);
    expect(screen.getByRole("status").textContent).toContain("Loading");
    expect(screen.queryByLabelText("Verified integration connection counts")).toBeNull();
  });

  it("shows a retry path on failed role-scoped reads, without showing false connection counts", () => {
    const retry = vi.fn();
    render(<VerifiedIntegrationKpis read={{ state: "error", error: "Permission denied" }} onRetry={retry} />);
    expect(screen.getByRole("alert").textContent).toContain("unavailable");
    expect(screen.queryByLabelText("Verified integration connection counts")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("renders five real counts only after a valid completed registry read", () => {
    render(<VerifiedIntegrationKpis read={{ state: "ready", records: [
      { id: "smtp", status: "Connected" },
      { id: "sms", status: "Error" },
      { id: "calendar", status: "Pending Setup" },
      { id: "drive", status: "Disconnected" },
    ] }} />);
    const region = screen.getByRole("region", { name: "Verified integration connection counts" });
    expect(region.textContent).toContain("Total Integrations");
    expect(region.querySelectorAll(":scope > div")).toHaveLength(5);
    expect(region.textContent).toContain("Connected");
  });

  it("displays genuine empty results as zero only following an authoritative ready read", () => {
    render(<VerifiedIntegrationKpis read={{ state: "ready", records: [] }} />);
    expect(screen.getByRole("region", { name: "Verified integration connection counts" }).querySelectorAll(":scope > div")).toHaveLength(5);
    expect(screen.getAllByText("0")).toHaveLength(5);
  });

  it("rejects invalid provider data without leaking false KPIs", () => {
    render(<VerifiedIntegrationKpis read={{ state: "ready", records: [{ id: "a", status: "Live" as never }] }} />);
    expect(screen.getByRole("alert").textContent).toContain("unavailable");
    expect(screen.queryByRole("region", { name: "Verified integration connection counts" })).toBeNull();
  });
});
