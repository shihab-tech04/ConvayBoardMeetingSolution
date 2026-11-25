import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("../app/services/supabase/convayAuth", () => ({
  convayAuth: { authenticatedRequest: vi.fn() },
}));
import { convayAuth } from "../app/services/supabase/convayAuth";
import { subscriptionAction } from "../app/services/saas/subscriptionQuotes";

const request = vi.mocked(convayAuth.authenticatedRequest);
const apiResponse = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => vi.resetAllMocks());

describe("SaaS SQL operational recovery and Meeting Types routing", () => {
  it("never returns a PostgREST authorization failure as a successful financial result", async () => {
    request.mockResolvedValueOnce(apiResponse({ code: "42501", message: "Insufficient subscription permission" }, 403));
    await expect(subscriptionAction("issue_quote", { quote_id: "x" }))
      .rejects.toThrow("Insufficient subscription permission");
  });

  it("surfaces generic SQL failures safely when the error response is not JSON", async () => {
    request.mockResolvedValueOnce(new Response("Unavailable", { status: 503 }));
    await expect(subscriptionAction("list")).rejects.toThrow("Subscription SQL request failed");
  });

  it("returns successful SQL JSON objects without changing quote or invoice contracts", async () => {
    const directory = {
      quotes: [], invoices: [], tenant_isolation_certified: false,
      payment_provider_connected: false, usage_metering_activated: false,
    };
    request.mockResolvedValueOnce(apiResponse(directory));
    await expect(subscriptionAction("list")).resolves.toEqual(directory);
  });

  it("rejects arrays and empty successful responses rather than misreporting success", async () => {
    request.mockResolvedValueOnce(apiResponse([]));
    await expect(subscriptionAction("list")).rejects.toThrow("Invalid subscription SQL response");
    request.mockResolvedValueOnce(new Response("", { status: 200 }));
    await expect(subscriptionAction("list")).rejects.toThrow("Invalid subscription SQL response");
  });

  it("reuses the working versioned SQL meeting-template builder only for the platform Super Admin", () => {
    const page = readFileSync("src/app/pages/administration/MeetingConfigPages.tsx", "utf8");
    const service = readFileSync("src/app/services/saas/meetingTemplateControl.ts", "utf8");
    const component = page.split("export function MeetingTypesPage() {")[1]
      ?.split("export function QuorumRulesPage() {")[0] ?? "";
    expect(component).toContain("access.loaded && access.is_super_admin");
    expect(component).toContain("<MeetingTemplateMarketplace />");
    expect(component).toContain("unverifiedMeetingTypesView()");
    expect(service).toContain("convay_meeting_template_manage");
    expect(service).toContain("assertTemplateMutationReadback");
    expect(page).not.toContain("workspace_activation_enabled: true");
  });
});
