import { describe, expect, it } from "vitest";
import { resolveMeetingLeadership } from "../app/pages/return-register/meetingLeadership";
import { leadershipRosterRoles, validateLeadershipRoster } from "../app/pages/return-register/leadershipRoster";
const users = [{id:"chair",name:"Chair"},{id:"secretary",name:"Secretary"},{id:"organizer",name:"Organizer"}];
const values = {chairperson:"chair",secretary:"secretary",organizer:"organizer"};
const resolved = resolveMeetingLeadership(values,users);
const roster = [{user_id:"chair",participant_type:"Chairperson",is_required:true},{user_id:"secretary",participant_type:"Meeting Secretary",is_required:true},{user_id:"organizer",participant_type:"Organizer",is_required:true}];
describe("PT-09 canonical leadership roster validation",()=>{
  it("accepts required assigned leadership",()=>expect(validateLeadershipRoster(roster,resolved)).toEqual([]));
  it("rejects removal of the assigned secretary",()=>expect(validateLeadershipRoster(roster.filter(x=>x.user_id!=="secretary"),resolved)).not.toEqual([]));
  it("rejects demoting the assigned chair by unchecking required",()=>expect(validateLeadershipRoster(roster.map(x=>x.user_id==="chair"?{...x,is_required:false}:x),resolved)).not.toEqual([]));
  it("rejects replacing the secretary role with a general member role",()=>expect(validateLeadershipRoster(roster.map(x=>x.user_id==="secretary"?{...x,participant_type:"Member"}:x),resolved)).not.toEqual([]));
  it("rejects duplicate leader links",()=>expect(validateLeadershipRoster([...roster,roster[0]],resolved)).not.toEqual([]));
  it("allows explicitly assigned dual roles without duplicating the user",()=>{const dual=resolveMeetingLeadership({...values,organizer:"chair"},users);expect(leadershipRosterRoles(dual).get("chair")).toEqual(["Chairperson","Organizer"]);expect(validateLeadershipRoster(roster.filter(x=>x.user_id!=="organizer"),dual)).toEqual([])});
  it("rejects unresolved canonical leadership",()=>expect(validateLeadershipRoster(roster,resolveMeetingLeadership({...values,secretary:"missing"},users))).not.toEqual([]));
});
