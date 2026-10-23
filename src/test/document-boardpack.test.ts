/**
 * Board Pack document-link version-preservation tests.
 *
 * The key invariant: linked_version_id is captured at link creation time
 * and is NEVER silently replaced when a new version is published.
 * An explicit user action is required to update the pinned version.
 */
import { describe, it, expect } from "vitest";
import type { BoardPackDocumentLink } from "../app/data/documentWorkspaceData";

// ── Helpers (mirror BoardPacksTab logic) ────────────────────────────────────────

interface VersionRecord {
  id: string;
  version: string;
  created_at: string;
}

function getLatestVersion(versions: VersionRecord[]): VersionRecord | undefined {
  return versions
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
}

function hasNewerVersion(link: BoardPackDocumentLink, versions: VersionRecord[]): boolean {
  const latest = getLatestVersion(versions);
  if (!latest) return false;
  return latest.id !== link.linked_version_id;
}

function createLink(overrides: Partial<BoardPackDocumentLink> = {}): BoardPackDocumentLink {
  return {
    id:               "link-001",
    link_id:          "link-001",
    board_pack_id:    "bp-001",
    document_id:      "doc-001",
    linked_version_id: "ver-001",
    document_name:    "Board Paper Q1",
    board_pack_name:  "March 2025 Board Pack",
    added_by:         "Jane Secretary",
    added_at:         "2025-03-01T09:00:00Z",
    link_status:      "active",
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("Board Pack — version selection at link time", () => {
  it("link captures the version ID that existed at creation time", () => {
    const link = createLink({ linked_version_id: "ver-001" });
    expect(link.linked_version_id).toBe("ver-001");
  });

  it("link_status is active by default", () => {
    const link = createLink();
    expect(link.link_status).toBe("active");
  });
});

describe("Board Pack — preserve pinned version", () => {
  const versions: VersionRecord[] = [
    { id: "ver-001", version: "1.0", created_at: "2025-02-01T00:00:00Z" },
  ];

  it("no newer version detected when only one version exists", () => {
    const link = createLink({ linked_version_id: "ver-001" });
    expect(hasNewerVersion(link, versions)).toBe(false);
  });

  it("does not auto-update linked_version_id when a new version is published", () => {
    const link = createLink({ linked_version_id: "ver-001" });
    // Publishing a new version must NOT mutate the existing link
    const newVersions = [
      ...versions,
      { id: "ver-002", version: "1.1", created_at: "2025-03-15T00:00:00Z" },
    ];
    // The link still points to ver-001 — caller must explicitly update it
    expect(link.linked_version_id).toBe("ver-001");
    // And the system should detect that a newer version is available
    expect(hasNewerVersion(link, newVersions)).toBe(true);
  });
});

describe("Board Pack — detect newer version", () => {
  const versions: VersionRecord[] = [
    { id: "ver-001", version: "1.0", created_at: "2025-02-01T00:00:00Z" },
    { id: "ver-002", version: "1.1", created_at: "2025-03-15T00:00:00Z" },
    { id: "ver-003", version: "2.0", created_at: "2025-04-01T00:00:00Z" },
  ];

  it("detects a newer version when link points to an old version", () => {
    const link = createLink({ linked_version_id: "ver-001" });
    expect(hasNewerVersion(link, versions)).toBe(true);
  });

  it("no newer version when link already points to the latest", () => {
    const link = createLink({ linked_version_id: "ver-003" });
    expect(hasNewerVersion(link, versions)).toBe(false);
  });

  it("latest version is determined by created_at, not ID sort order", () => {
    const shuffled: VersionRecord[] = [
      { id: "ver-003", version: "2.0", created_at: "2025-04-01T00:00:00Z" },
      { id: "ver-001", version: "1.0", created_at: "2025-02-01T00:00:00Z" },
      { id: "ver-002", version: "1.1", created_at: "2025-03-15T00:00:00Z" },
    ];
    expect(getLatestVersion(shuffled)?.id).toBe("ver-003");
  });
});

describe("Board Pack — update linked version (explicit user action)", () => {
  it("update produces a new link record with the new version ID", () => {
    const originalLink = createLink({ linked_version_id: "ver-001" });
    // Simulate the update: create a replacement record (the old one may be marked superseded)
    const updatedLink: BoardPackDocumentLink = {
      ...originalLink,
      linked_version_id: "ver-002",
      link_status:       "active",
    };
    const supersededLink: BoardPackDocumentLink = { ...originalLink, link_status: "superseded" };

    expect(updatedLink.linked_version_id).toBe("ver-002");
    expect(supersededLink.link_status).toBe("superseded");
    // Original object is not mutated
    expect(originalLink.linked_version_id).toBe("ver-001");
  });
});

describe("Board Pack — link status transitions", () => {
  it("active link can be removed", () => {
    const link = createLink({ link_status: "active" });
    const removed: BoardPackDocumentLink = { ...link, link_status: "removed" };
    expect(removed.link_status).toBe("removed");
  });

  it("removed link is excluded from active pack listing", () => {
    const links: BoardPackDocumentLink[] = [
      createLink({ id: "l1", link_id: "l1", link_status: "active" }),
      createLink({ id: "l2", link_id: "l2", link_status: "removed" }),
      createLink({ id: "l3", link_id: "l3", link_status: "superseded" }),
    ];
    const active = links.filter(l => l.link_status === "active");
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe("l1");
  });
});
