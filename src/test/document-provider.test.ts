import { describe, it, expect, beforeEach } from "vitest";
import {
  LocalRichTextEditorProvider,
  OnlyOfficeEditorProvider,
  getEditorProvider,
  _resetEditorProvider,
} from "../app/components/documents/editor/DocumentEditorProvider";

beforeEach(() => {
  _resetEditorProvider();
});

// ── LocalRichTextEditorProvider ────────────────────────────────────────────────

describe("LocalRichTextEditorProvider", () => {
  it("has id 'local'", () => {
    expect(new LocalRichTextEditorProvider().id).toBe("local");
  });

  it("isAvailable is always true", () => {
    expect(new LocalRichTextEditorProvider().isAvailable).toBe(true);
  });

  it("editing capability is true", () => {
    expect(new LocalRichTextEditorProvider().capabilities.editing).toBe(true);
  });

  it("does NOT report trackedChanges", () => {
    expect(new LocalRichTextEditorProvider().capabilities.trackedChanges).toBe(false);
  });

  it("does NOT report realTimeCollaboration", () => {
    expect(new LocalRichTextEditorProvider().capabilities.realTimeCollaboration).toBe(false);
  });
});

// ── OnlyOfficeEditorProvider — no server URL ───────────────────────────────────

describe("OnlyOfficeEditorProvider — server NOT configured", () => {
  it("isAvailable is false when serverUrl is empty string", () => {
    const p = new OnlyOfficeEditorProvider("");
    expect(p.isAvailable).toBe(false);
  });

  it("trackedChanges is false when unavailable", () => {
    const p = new OnlyOfficeEditorProvider("");
    expect(p.capabilities.trackedChanges).toBe(false);
  });

  it("realTimeCollaboration is false when unavailable", () => {
    const p = new OnlyOfficeEditorProvider("");
    expect(p.capabilities.realTimeCollaboration).toBe(false);
  });

  it("editing is still true even without a server", () => {
    // editing reflects provider type; local fallback handles actual editing
    expect(new OnlyOfficeEditorProvider("").capabilities.editing).toBe(true);
  });
});

// ── OnlyOfficeEditorProvider — server configured ───────────────────────────────

describe("OnlyOfficeEditorProvider — server configured", () => {
  const SERVER = "https://docs.example.com";

  it("isAvailable is true when serverUrl is set", () => {
    expect(new OnlyOfficeEditorProvider(SERVER).isAvailable).toBe(true);
  });

  it("trackedChanges is true when server is configured", () => {
    expect(new OnlyOfficeEditorProvider(SERVER).capabilities.trackedChanges).toBe(true);
  });

  it("realTimeCollaboration is true when server is configured", () => {
    expect(new OnlyOfficeEditorProvider(SERVER).capabilities.realTimeCollaboration).toBe(true);
  });

  it("stores the documentServerUrl", () => {
    expect(new OnlyOfficeEditorProvider(SERVER).documentServerUrl).toBe(SERVER);
  });

  it("never exposes a JWT or document key on the provider object", () => {
    const p = new OnlyOfficeEditorProvider(SERVER) as Record<string, unknown>;
    expect(p["token"]).toBeUndefined();
    expect(p["jwt"]).toBeUndefined();
    expect(p["documentKey"]).toBeUndefined();
  });
});

// ── getEditorProvider singleton ────────────────────────────────────────────────

describe("getEditorProvider singleton", () => {
  it("returns the same instance on repeated calls", () => {
    const a = getEditorProvider();
    const b = getEditorProvider();
    expect(a).toBe(b);
  });

  it("_resetEditorProvider forces re-instantiation", () => {
    const a = getEditorProvider();
    _resetEditorProvider();
    const b = getEditorProvider();
    expect(a).not.toBe(b);
  });

  it("default provider is local (no env set)", () => {
    // In test env, VITE_DOCUMENT_EDITOR_PROVIDER is not set → defaults to local
    expect(getEditorProvider().id).toBe("local");
  });
});
