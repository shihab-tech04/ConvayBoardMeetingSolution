import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, renderHook, screen } from "@testing-library/react";

const fixture = vi.hoisted(() => ({
  getVisibleNav: vi.fn(),
  route: { activeMain: "home", activeSub: "", activeThird: "" },
}));

vi.mock("../app/data/navigation", () => ({ getVisibleNav: fixture.getVisibleNav }));
vi.mock("../app/hooks/useRouteNav", () => ({ useRouteNav: () => fixture.route }));

import { useBreadcrumbs } from "../app/hooks/useBreadcrumbs";
import { Breadcrumbs } from "../app/components/navigation/Breadcrumbs";

describe("permission-filtered breadcrumbs", () => {
  beforeEach(() => {
    fixture.getVisibleNav.mockReset();
    fixture.route.activeMain = "home";
    fixture.route.activeSub = "";
    fixture.route.activeThird = "";
  });

  it("does not crash while the access snapshot is loading (no visible navigation)", () => {
    fixture.getVisibleNav.mockReturnValue([]);
    const { result } = renderHook(() => useBreadcrumbs());
    expect(result.current.breadcrumbs).toEqual([]);
    expect(result.current.activeMainItem).toBeUndefined();
    render(<Breadcrumbs />);
    expect(screen.getByRole("navigation", { name: "Breadcrumb navigation" })).toBeInTheDocument();
    expect(screen.queryByText("Home")).not.toBeInTheDocument();
  });

  it("preserves the existing Home breadcrumb after permissions load", () => {
    fixture.getVisibleNav.mockReturnValue([{
      id: "home", label: "Home", children: [{ id: "overview", label: "Overview" }],
    }]);
    fixture.route.activeSub = "overview";
    expect(renderHook(() => useBreadcrumbs()).result.current.breadcrumbs).toEqual(["Home", "Overview"]);
  });

  it("preserves nested breadcrumbs for permitted sections", () => {
    fixture.getVisibleNav.mockReturnValue([{
      id: "governance-org", label: "Governance", children: [{
        id: "registers", label: "Registers", children: [{ id: "audit", label: "Audit" }],
      }],
    }]);
    fixture.route.activeMain = "governance-org";
    fixture.route.activeSub = "registers";
    fixture.route.activeThird = "audit";
    expect(renderHook(() => useBreadcrumbs()).result.current.breadcrumbs)
      .toEqual(["Home", "Governance", "Registers", "Audit"]);
  });
});
