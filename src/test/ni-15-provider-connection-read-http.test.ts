import { beforeEach, describe, expect, it, vi } from "vitest";
import { convayAuth } from "../app/services/supabase/convayAuth";
import { loadProviderConnectionRead } from "../app/pages/administration/integrationConnectionRead";

vi.mock("../app/services/supabase/convayAuth", () => ({
  convayAuth: { authenticatedRequest: vi.fn() },
}));

const request = vi.mocked(convayAuth.authenticatedRequest);
const catalogueIds = ["smtp-email", "zoom"] as const;
const NOW = Date.parse("2026-11-21T11:00:00Z");

describe("NI-15 authenticated provider-status API read", () => {
  beforeEach(() => request.mockReset());

  it("reads only the authoritative status columns through the authenticated GET endpoint", async () => {
    request.mockResolvedValue(new Response(JSON.stringify([
      { provider_id: "smtp-email", status: "Connected", verified_at: "2026-11-21T10:30:00Z" },
    ]), { status: 200, headers: { "content-type": "application/json" } }));

    const result = await loadProviderConnectionRead(catalogueIds, NOW);

    expect(request).toHaveBeenCalledExactlyOnceWith(
      "/rest/v1/convay_provider_connections?select=provider_id,status,verified_at&order=provider_id.asc",
      { method: "GET" },
    );
    expect(result).toEqual({ state: "ready", records: [
      { id: "smtp-email", status: "Connected" },
      { id: "zoom", status: "Pending Setup" },
    ] });
  });

  it("keeps malformed REST reads unavailable for retry", async () => {
    request.mockResolvedValue(new Response("not-json", { status: 200 }));

    const result = await loadProviderConnectionRead(catalogueIds, NOW);
    expect(result.state).toBe("error");
    expect(result.state === "error" && result.error).toBeTruthy();
  });
});
