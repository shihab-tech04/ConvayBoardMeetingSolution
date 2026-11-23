import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { GovernanceBody } from "../app/data/boardMeetingData";
import {
  createGovernanceBody, updateGovernanceBody, type GovernanceBodyGateway,
} from "../app/pages/psr-verification/governanceBodyPersistence";
import {
  activeMeetingGovernanceOptions, meetingGovernanceSetupState,
} from "../app/pages/return-register/meetingCreatePrerequisites";

const migration = readFileSync(
  "supabase/migrations/20261123063200_convay_governance_body_unique_name_type.sql",
  "utf8",
);
const input: Record<string, unknown> = {
  body_name: "   Audit Committee ", body_type: "Committee",
  chairperson: "Registered Chair", status: "Active",
};
const identity = { id: "GB-2026-0001", created_at: "2026-11-23T00:00:00Z" };

const existing: GovernanceBody = {
  id: "GB-2026-0011", body_id: "GB-2026-0011", body_name: "AUDIT COMMITTEE",
  body_type: "Committee", chairperson: "Registered Chair", secretary: "",
  member_count: "0", quorum_requirement: "", voting_method: "",
  establishment_date: "", mandate: "", status: "Active", created_at: identity.created_at,
};

describe("GV-10 / MT-04 governance-body concurrency and Create Meeting recovery", () => {
  it("enforces actual SQL uniqueness across concurrent sessions, not just the browser preflight", () => {
    expect(migration).toContain("create unique index if not exists convay_governance_body_name_type_unique_ci");
    expect(migration).toContain("lower(btrim(payload->>'body_name'))");
    expect(migration).toContain("lower(btrim(payload->>'body_type'))");
    expect(migration).toContain("where entity_key = 'bms.govbodies'");
    expect(migration).not.toMatch(/drop table|delete from/i);
  });

  it("explains a duplicate created by another administrator after preflight", async () => {
    let read = 0;
    const gateway: GovernanceBodyGateway = {
      list: async () => ++read === 1 ? [] : [existing],
      create: async () => false,
      update: async () => false,
    };
    await expect(createGovernanceBody(input, identity, gateway)).rejects.toThrow(
      "already exists. Refresh the list",
    );
    expect(read).toBe(2);
  });

  it("explains a concurrent rename collision without losing the previous record", async () => {
    let read = 0;
    const previous: GovernanceBody = { ...existing, id: "GB-2026-0010", body_id: "GB-2026-0010",
      body_name: "Risk Committee" };
    const gateway: GovernanceBodyGateway = {
      list: async () => ++read === 1 ? [previous] : [previous, existing],
      create: async () => false,
      update: async () => false,
    };
    await expect(updateGovernanceBody(previous.id, { body_name: "Audit Committee" }, gateway))
      .rejects.toThrow("already has that name and type");
  });

  it("allows the same body name under another valid governance-body type", async () => {
    const registry: GovernanceBody[] = [existing];
    const gateway: GovernanceBodyGateway = {
      list: async () => [...registry],
      create: async body => { registry.push(body); return true; },
      update: async () => false,
    };
    const saved = await createGovernanceBody(
      { ...input, body_type: "Board" }, identity, gateway,
    );
    expect(saved.body_type).toBe("Board");
    expect(registry).toHaveLength(2);
  });

  it("keeps unsupported charter attachments visible but disabled before a failed save", () => {
    const fields = readFileSync("src/app/pages/boardMeetingFormFields.ts", "utf8");
    const form = readFileSync("src/app/components/forms/EntryForm.tsx", "utf8");
    const charterField = fields.match(/\{ key: "charter"[^\n]*\}/)?.[0] ?? "";
    expect(charterField).toContain('type: "file"');
    expect(charterField).toContain("disabled: true");
    expect(charterField).toContain("Secure charter upload is not connected yet");
    expect(form).toContain("disabled={f.disabled}");
  });

  it("renders the approved Governance Bodies table with correct count, search and empty-state plurals", () => {
    const page = readFileSync("src/app/pages/psr-verification/InvalidListPage.tsx", "utf8");
    const table = readFileSync("src/app/components/pages/GeneratedTablePage.tsx", "utf8");
    expect(page).toContain('entityPlural: "governance bodies"');
    expect(table).toContain("const entityPlural = cfg.entityPlural ??");
    expect(table).toContain("countLabel={entityPlural}");
    expect(table).toContain("emptyLabel={`No ${entityPlural} found.`}");
    expect(table).toContain("Search ${entityPlural}");
  });

  it("keeps Create Meeting fail-closed until an active persisted body is refreshed", () => {
    expect(meetingGovernanceSetupState(false, null, [])).toBe("missing");
    expect(activeMeetingGovernanceOptions([])).toEqual([]);
    expect(activeMeetingGovernanceOptions([{ ...existing, status: "Inactive" }])).toEqual([]);
    const newOptions = activeMeetingGovernanceOptions([existing]);
    expect(newOptions).toEqual([{ value: existing.id, label: "AUDIT COMMITTEE" }]);
    expect(meetingGovernanceSetupState(false, null, newOptions)).toBe("ready");
    expect(meetingGovernanceSetupState(false, "SQL permission denied", newOptions)).toBe("error");
  });
});
