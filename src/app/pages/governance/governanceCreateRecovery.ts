import { useLayoutEffect, useRef } from "react";

export type GovernanceCreateAttempt = {
  signature: string;
  id: string;
  created_at: string;
  dispatched: boolean;
  recovered: boolean;
  assertCurrent: () => void;
};

// Only the exact pending form intent can recover a previously dispatched
// write. Account cache invalidation and unmount expire all such intents.
export function useGovernanceCreateRecovery() {
  const pending = useRef<GovernanceCreateAttempt | null>(null);
  const live = useRef(false);
  useLayoutEffect(() => {
    live.current = true;
    const clear = () => { pending.current = null; };
    window.addEventListener("convay:entity-cache-cleared", clear);
    return () => {
      live.current = false;
      clear();
      window.removeEventListener("convay:entity-cache-cleared", clear);
    };
  }, []);
  function begin(values: Record<string, unknown>, makeId: () => string): GovernanceCreateAttempt {
    if (!live.current) throw new Error("This form is no longer active.");
    const signature = JSON.stringify(values);
    if (!pending.current || pending.current.signature !== signature) {
      const attempt: GovernanceCreateAttempt = {
        signature, id: makeId(), created_at: new Date().toISOString(),
        dispatched: false, recovered: false,
        assertCurrent: () => {
          if (!live.current || pending.current !== attempt)
            throw new Error("This form's authorization context changed. Reopen the form.");
        },
      };
      pending.current = attempt;
    }
    return pending.current;
  }
  function complete(attempt: GovernanceCreateAttempt) {
    attempt.assertCurrent();
    pending.current = null;
  }
  return { begin, complete };
}
