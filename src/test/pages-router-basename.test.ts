import { describe, expect, it } from "vitest";
import { matchRoutes } from "react-router";

describe("GitHub Pages router prefix", () => {
  it("matches the entry route and internal destinations beneath Vite's configured base", async () => {
    // In CI this test also runs with --base /ConvayBoardMeetingSolution/.
    const base = import.meta.env.BASE_URL;
    window.history.replaceState({}, "", base);
    const { router } = await import("../app/routes");

    expect(router.basename).toBe(base);
    const root = matchRoutes(router.routes, base, router.basename);
    expect(root?.at(-1)?.route.index).toBe(true);

    const home = matchRoutes(router.routes, base + "home/overview", router.basename);
    expect(home?.at(-1)?.route.path).toBe("home/overview");

    const meeting = matchRoutes(router.routes, base + "meetings/all-meetings", router.basename);
    expect(meeting?.at(-1)?.route.path).toBe("meetings/all-meetings");
  });
});
