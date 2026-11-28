import { describe, expect, it } from "vitest";
import { persistMinutesReviewTransition } from "../app/pages/archive-reports/minutesReviewPersistence";
const record = { id:"r1", minutes_id:"MIN-1", meeting_id:"MTG-1", version:"1.0", approval_status:"Draft", notes:"Original" };
const selection = {...record, source_revision:4};
const patch = () => ({approval_status:"Under Secretary Review"});
function gateway(options: { revision?:number; duplicate?:boolean; changed?:boolean; ambiguous?:boolean; fail?:boolean; lostScope?:boolean } = {}) {
  let rows = [{payload:{...record}, revision:options.revision ?? 4}];
  if (options.duplicate) rows.push({...rows[0]});
  let writes = 0;
  let allowed = true;
  return { get writes(){return writes;}, list:async()=>rows, assertCurrent(){if(!allowed)throw Error("scope changed");},
    async update(value:typeof record, rev:number){writes++; if(rev!==4)throw Error("wrong revision"); if(options.fail)throw Error("denied");
      rows=[{payload:options.changed?{...value, version:"9.0"}:value,revision:5}];
      if(options.lostScope)allowed=false;
      if(options.ambiguous)throw Error("lost acknowledgement"); return 5; }};
}
describe("MN-11/12/15 confirmed SQL revision workflow",()=>{
 it("saves exactly the selected revision and preserves other fields",async()=>{const g=gateway();expect(await persistMinutesReviewTransition(selection,patch,g)).toMatchObject({notes:"Original",approval_status:"Under Secretary Review"});expect(g.writes).toBe(1);});
 it("rejects stale revision without a write",async()=>{const g=gateway({revision:5});await expect(persistMinutesReviewTransition(selection,patch,g)).rejects.toThrow(/changed/);expect(g.writes).toBe(0);});
 it("rejects duplicate identity without a write",async()=>{const g=gateway({duplicate:true});await expect(persistMinutesReviewTransition(selection,patch,g)).rejects.toThrow(/ambiguous/);expect(g.writes).toBe(0);});
 it("does not retry a denied write",async()=>{const g=gateway({fail:true});await expect(persistMinutesReviewTransition(selection,patch,g)).rejects.toThrow(/denied/);expect(g.writes).toBe(1);});
 it("withholds success on lost acknowledgement without a second write",async()=>{const g=gateway({ambiguous:true});await expect(persistMinutesReviewTransition(selection,patch,g)).rejects.toThrow(/lost acknowledgement/);expect(g.writes).toBe(1);});
 it("rejects a different readback version",async()=>{const g=gateway({changed:true});await expect(persistMinutesReviewTransition(selection,patch,g)).rejects.toThrow(/verified/);});
 it("rejects scope change before readback",async()=>{const g=gateway({lostScope:true});await expect(persistMinutesReviewTransition(selection,patch,g)).rejects.toThrow(/scope changed/);});
 it.each([undefined,0,-1,4.5,"4",Number.MAX_SAFE_INTEGER])("rejects invalid selection revision %s",async rev=>{const g=gateway();await expect(persistMinutesReviewTransition({...selection,source_revision:rev},patch,g)).rejects.toThrow(/invalid/);expect(g.writes).toBe(0);});
});
