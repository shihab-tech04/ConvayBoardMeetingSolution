import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";

const mockStore = vi.hoisted(() => ({
  auth: true,
  userId: "user-a",
  items: [] as Array<{ id: string; isRead: boolean }>,
  ownerId: null as string | null,
  dispatch: (_action: { type: string; payload?: unknown }) => undefined,
  fetchNotifications: vi.fn(),
  persistOne: vi.fn(),
  persistAll: vi.fn(),
}));

vi.mock("react-redux", () => ({
  useSelector: (select: (state: unknown) => unknown) => select({
    auth: { isAuthenticated: mockStore.auth },
    currentUser: { id: mockStore.userId },
    notifications: { items: mockStore.items, ownerId: mockStore.ownerId },
  }),
  useDispatch: () => mockStore.dispatch,
}));
vi.mock("../app/services/supabase/convayNotifications", () => ({
  listPersonalNotifications: mockStore.fetchNotifications,
  persistNotificationRead: mockStore.persistOne,
  persistAllNotificationsRead: mockStore.persistAll,
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { useNotificationsState } from "../app/hooks/useNotificationsState";

function Probe() {
  const { notifications, loading, error, markRead, markAllRead } = useNotificationsState();
  return (
    <div>
      <span data-testid="ids">{notifications.map(n => n.id).join(",")}</span>
      <span data-testid="loading">{loading ? "loading" : "ready"}</span>
      <span data-testid="error">{error ?? "none"}</span>
      <button onClick={() => void markRead("shared-id")}>Mark one</button>
      <button onClick={() => void markAllRead()}>Mark all</button>
    </div>
  );
}

const record = (id: string) => ({
  id, type: "approval" as const, priority: "high" as const,
  title: "Read notice", message: "Details", module: "Meetings",
  time: "Today", isRead: false, destination: { main: "meetings" },
});

beforeEach(() => {
  vi.stubEnv("MODE", "development");
  mockStore.auth = true;
  mockStore.userId = "user-a";
  mockStore.ownerId = null;
  mockStore.items = [];
  mockStore.fetchNotifications.mockReset();
  mockStore.persistOne.mockReset().mockResolvedValue(undefined);
  mockStore.persistAll.mockReset().mockResolvedValue(undefined);
  mockStore.dispatch = action => {
    if (action.type === "notifications/setNotifications") {
      const next = action.payload as { ownerId: string | null; items: typeof mockStore.items };
      mockStore.ownerId = next.ownerId;
      mockStore.items = next.items;
    } else if (action.type === "notifications/markNotificationRead") {
      const target = mockStore.items.find(item => item.id === action.payload);
      if (target) target.isRead = true;
    } else if (action.type === "notifications/markAllNotificationsRead") {
      mockStore.items.forEach(item => { item.isRead = true; });
    }
  };
});
afterEach(() => vi.unstubAllEnvs());

describe("HM-07 account-safe notification hydration", () => {
  it("never overwrites user B's inbox with a delayed response for user A", async () => {
    let finishA!: (rows: ReturnType<typeof record>[]) => void;
    mockStore.fetchNotifications.mockImplementationOnce(() =>
      new Promise(resolve => { finishA = resolve; })
    );
    mockStore.fetchNotifications.mockResolvedValueOnce([record("b-private")]);
    const view = render(<Probe />);
    mockStore.userId = "user-b";
    view.rerender(<Probe />);
    await waitFor(() => expect(mockStore.ownerId).toBe("user-b"));
    await act(async () => { finishA([record("a-private")]); });
    view.rerender(<Probe />);
    expect(screen.getByTestId("ids")).toHaveTextContent("b-private");
    expect(screen.getByTestId("ids")).not.toHaveTextContent("a-private");
  });

  it("clears the private inbox immediately on logout", async () => {
    mockStore.fetchNotifications.mockResolvedValue([record("a-private")]);
    const view = render(<Probe />);
    await waitFor(() => expect(mockStore.ownerId).toBe("user-a"));
    mockStore.auth = false;
    view.rerender(<Probe />);
    await waitFor(() => expect(mockStore.ownerId).toBeNull());
    expect(screen.getByTestId("ids")).toBeEmptyDOMElement();
  });

  it("does not show an earlier account's cached records before new account data arrives", async () => {
    mockStore.ownerId = "user-a";
    mockStore.items = [record("a-private")];
    mockStore.userId = "user-b";
    mockStore.fetchNotifications.mockImplementation(() => new Promise(() => undefined));
    render(<Probe />);
    expect(screen.getByTestId("ids")).toBeEmptyDOMElement();
  });

  it("does not apply a delayed single-read receipt from A to B's same-id record", async () => {
    let finish!: () => void;
    mockStore.persistOne.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    mockStore.fetchNotifications.mockResolvedValue([record("shared-id")]);
    const view = render(<Probe />);
    await waitFor(() => expect(mockStore.ownerId).toBe("user-a"));
    await act(async () => screen.getByRole("button", { name: "Mark one" }).click());
    expect(mockStore.persistOne).toHaveBeenCalledWith("shared-id", "user-a");
    mockStore.userId = "user-b";
    view.rerender(<Probe />);
    await waitFor(() => expect(mockStore.ownerId).toBe("user-b"));
    await act(async () => { finish(); });
    expect(mockStore.items[0].isRead).toBe(false);
  });

  it("does not mark B's entire inbox read when A's delayed bulk receipt completes", async () => {
    let finish!: () => void;
    mockStore.persistAll.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    mockStore.fetchNotifications.mockResolvedValue([record("shared-id")]);
    const view = render(<Probe />);
    await waitFor(() => expect(mockStore.ownerId).toBe("user-a"));
    await act(async () => screen.getByRole("button", { name: "Mark all" }).click());
    expect(mockStore.persistAll).toHaveBeenCalledWith("user-a");
    mockStore.userId = "user-b";
    view.rerender(<Probe />);
    await waitFor(() => expect(mockStore.ownerId).toBe("user-b"));
    await act(async () => { finish(); });
    expect(mockStore.items[0].isRead).toBe(false);
  });
});
