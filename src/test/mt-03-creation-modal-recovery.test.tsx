import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@mui/material", async () => {
  const actual = await vi.importActual<typeof import("@mui/material")>("@mui/material");
  return { ...actual };
});

import { EntryForm } from "../app/components/forms/EntryForm";

const FIELDS = [
  { key: "meeting_title", label: "Meeting Title", type: "text" as const, required: true },
];

describe("MT-03 meeting creation — retain input until SQL save succeeds", () => {
  it("does not close the opt-in meeting wizard while its save is pending", () => {
    const onClose = vi.fn();
    const save = vi.fn(() => new Promise<void>(() => undefined));
    render(
      <EntryForm
        fields={FIELDS}
        onClose={onClose}
        onSubmit={save}
        closeOnSubmit={false}
      />,
    );
    const field = screen.getByLabelText(/Meeting Title/);
    fireEvent.change(field, { target: { value: "Board Approval Session" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(save).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    expect(field).toHaveValue("Board Approval Session");
  });

  it("preserves the existing automatic-close behavior for other forms", () => {
    const onClose = vi.fn();
    const save = vi.fn();
    render(<EntryForm fields={FIELDS} onClose={onClose} onSubmit={save} />);
    fireEvent.change(screen.getByLabelText(/Meeting Title/), { target: { value: "Agenda review" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(save).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not submit or close a meeting with missing required fields", () => {
    const onClose = vi.fn();
    const save = vi.fn();
    render(
      <EntryForm
        fields={FIELDS}
        onClose={onClose}
        onSubmit={save}
        closeOnSubmit={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(save).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
