import { describe, expect, it } from "vitest";
import { contextualLeadershipRemovalBlocker as blocker } from "../app/pages/return-register/contextualLeadershipProtection";
const meeting = {meeting_id:"m1",chairperson_user_id:"c1",chairperson:"Chair",secretary_user_id:"s1",secretary:"Secretary",organizer_user_id:"o1",organizer:"Organizer"};
const member = {meeting_id:"m1",user_id:"p1",role:"Member",name:"Participant"};
describe("PT-09 contextual leadership protection",()=>{
  it("allows a non-leader in the same meeting",()=>expect(blocker(meeting,member)).toBeNull());
  it("denies cross-meeting removal",()=>expect(blocker(meeting,{...member,meeting_id:"other"})).not.toBeNull());
  it("protects canonical secretary identity despite changed role",()=>expect(blocker(meeting,{...member,user_id:"s1"})).not.toBeNull());
  it("protects legacy named chair without a canonical user ID",()=>expect(blocker(meeting,{...member,user_id:undefined,name:"Chair"})).not.toBeNull());
  it("protects a legacy leadership role even if its display name changed",()=>expect(blocker(meeting,{...member,role:"Meeting Secretary"})).not.toBeNull());
  it("denies an ambiguous roster when a designated leadership identity is missing",()=>expect(blocker({...meeting,secretary_user_id:"",secretary:""},member)).not.toBeNull());
  it("denies a legacy participant without a canonical ID if any leader lacks a comparable name",()=>expect(blocker({...meeting,secretary:""},{...member,user_id:undefined})).not.toBeNull());
  it("denies a participant with an incomplete identity when a leader has only a name",()=>expect(blocker({...meeting,secretary_user_id:""},{...member,name:""})).not.toBeNull());
});
