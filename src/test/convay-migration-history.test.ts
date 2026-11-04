import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const directory = "supabase/migrations";
const files = readdirSync(directory).filter((name) => name.endsWith(".sql"));
const appliedMigrations = [
  [
    "convay_authenticated_write_grants",
    "20261104010913"
  ],
  [
    "convay_protect_status_transitions",
    "20261104014427"
  ],
  [
    "convay_close_minutes_approval_alias",
    "20261104034244"
  ],
  [
    "convay_member_directory_least_privilege",
    "20261104042801"
  ],
  [
    "convay_meeting_interactions_append_only",
    "20261104045912"
  ],
  [
    "convay_link_reference_integrity",
    "20261104053441"
  ],
  [
    "convay_vote_reference_integrity",
    "20261104060508"
  ]
];

describe("Convay source migration history matches applied Supabase version IDs", () => {
  it("preserves distinct version IDs and audits the one exact duplicate migration", () => {
    const names = files.map((file) => file.replace(/^\d+_/, "").replace(/\.sql$/, ""));
    const versions = files.map((file) => file.slice(0, 14));
    expect(new Set(versions).size).toBe(files.length);
    const duplicates = [...new Set(names.filter((name,i) => names.indexOf(name)!==i))];
    // Supabase independently recorded the same transaction twice, three seconds
    // apart, with the identical SQL checksum. Preserve both original IDs.
    expect(duplicates).toEqual(["convay_document_workspace_registry_parity"]);
    const originals = ["20261104171825","20261104171828"].map((version) =>
      readFileSync(join(directory, `${version}_convay_document_workspace_registry_parity.sql`),"utf8")
    );
    expect(originals[0]).toBe(originals[1]);
  });

  it.each(appliedMigrations)("%s uses its actual applied Supabase version %s", (name, version) => {
    const matching = files.filter((file) => file.endsWith(`_${name}.sql`));
    expect(matching).toEqual([`${version}_${name}.sql`]);
    expect(readFileSync(join(directory, matching[0]), "utf8").trim().length).toBeGreaterThan(20);
  });
});
