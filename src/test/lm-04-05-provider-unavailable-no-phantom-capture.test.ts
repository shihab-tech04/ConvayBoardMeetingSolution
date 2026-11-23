import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// LM-04/05: source-boundary safety until an authorized provider exists.
// These tests do not claim recording or transcription functionality is deployed.
const source = readFileSync(
  resolve(process.cwd(), "src/app/pages/meetings/LiveMeetingWorkspace.tsx"),
  "utf8",
);

describe("LM-04/05 provider-unavailable fail-closed guard", () => {
  it("never creates a live session from an unsupported capture toggle", () => {
    expect(source).not.toContain("getOrCreateSession");
    expect(source).not.toContain("addSession(");
    expect(source).not.toContain("updateSession(");
  });

  it("never writes fake recording/transcription lifecycle or audit evidence", () => {
    for (const unsupported of [
      "setIsRecording(",
      "setIsRecordingPaused(",
      "setIsTranscribing(",
      "setIsTranscribingPaused(",
      'recording_status: "active"',
      'transcription_status: "active"',
      'content: "Recording started"',
      'content: "Transcription started"',
    ]) expect(source).not.toContain(unsupported);
  });

  it("continues to tell users that provider recording and transcription are unavailable", () => {
    expect(source).toContain('label="Record" onClick={() => toast("Recording integration is not configured.")}');
    expect(source).toContain('label="Captions" onClick={() => toast("Transcription integration is not configured.")}');
  });

  it("preserves the independent server-acknowledged LM-06 minutes capture command", () => {
    expect(source).toContain("const toggleMinutesCapture = async () => {");
    expect(source).toContain("minutesRequestPending.current = true");
    expect(source).toContain("minutes_capture_status");
  });
});
