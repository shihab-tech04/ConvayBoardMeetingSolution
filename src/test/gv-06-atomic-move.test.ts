import { describe, expect, it, vi } from "vitest";
import { commitAtomicUnitMove, type UnitMoveIntent, type UnitMoveGateway } from "../app/pages/governance/modals/atomicUnitMove";
const intent: UnitMoveIntent = { unit_id:"unit-one", expected_parent_id:"old-parent", new_parent_id:"new-parent", effective_date:"2026-11-20", reason:"Organizational restructuring", request_id:"move-request-one" };
const receipt = { unit_id:intent.unit_id, previous_parent_id:intent.expected_parent_id, new_parent_id:intent.new_parent_id, request_id:intent.request_id, revision:4, audit_event_id:"audit-4", history_record_id:"history-4" };
function gateway(): UnitMoveGateway {
  return {send:vi.fn(async()=>receipt), read:vi.fn(async()=>({parent_unit_id:intent.new_parent_id,revision:4}))};
}
describe("GV-06 atomic move enforcement",()=>{
  it("accepts matched server ACK, immutable audit and readback", async()=> {
    const g=gateway(); expect(await commitAtomicUnitMove(intent,g)).toEqual(receipt);
    expect(g.send).toHaveBeenCalledTimes(1); expect(g.read).toHaveBeenCalledWith(intent.unit_id);
  });
  it("denies same parent and self parent without server mutation", async()=> {
    const g=gateway();
    await expect(commitAtomicUnitMove({...intent,new_parent_id:intent.unit_id},g)).rejects.toThrow();
    await expect(commitAtomicUnitMove({...intent,new_parent_id:intent.expected_parent_id!},g)).rejects.toThrow();
    expect(g.send).not.toHaveBeenCalled();
  });
  it("denies missing audit/history proof without fake completion", async()=> {
    const g=gateway();g.send=vi.fn(async()=>({...receipt,history_record_id:""}));
    await expect(commitAtomicUnitMove(intent,g)).rejects.toThrow(/acknowledgement/);expect(g.read).not.toHaveBeenCalled();
  });
  it("denies stale or conflicting readback", async()=> {
    const g=gateway(); g.read=vi.fn(async()=>({parent_unit_id:"old-parent",revision:3}));
    await expect(commitAtomicUnitMove(intent,g)).rejects.toThrow(/readback/);
  });
  it("preserves idempotency request key after network error", async()=> {
    const g=gateway();g.send=vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(receipt);
    await expect(commitAtomicUnitMove(intent,g)).rejects.toThrow("network");
    await commitAtomicUnitMove(intent,g);
    expect((g.send as ReturnType<typeof vi.fn>).mock.calls[0][0].request_id).toBe(intent.request_id);
    expect((g.send as ReturnType<typeof vi.fn>).mock.calls[1][0].request_id).toBe(intent.request_id);
  });
  it("denies malformed effective date",async()=>{const g=gateway();await expect(commitAtomicUnitMove({...intent,effective_date:"tomorrow"},g)).rejects.toThrow();expect(g.send).not.toHaveBeenCalled();});
});
