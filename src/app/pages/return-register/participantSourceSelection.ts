import type { DraftParticipantLink } from "../../components/forms/ParticipantSelectorStep";
import type { GovernanceBody } from "../../data/boardMeetingData";
import type { GovernanceMembership } from "../../data/governanceMemberships";
type Source = DraftParticipantLink["selection_sources"][number];
export const hasParticipantSource = (link: Pick<DraftParticipantLink,"selection_sources">, type:string,id:string) => link.selection_sources.some(s=>s.type===type&&s.source_id===id);
export function appendParticipantSource(link:DraftParticipantLink, source:Source):DraftParticipantLink {
  return hasParticipantSource(link,source.type,source.source_id)?link:{...link,selection_sources:[...link.selection_sources,source]};
}
export function removeParticipantSource(link:DraftParticipantLink,type:string,id:string,protectedParticipant:boolean):DraftParticipantLink|null {
  if (!hasParticipantSource(link,type,id)) return link;
  const sources=link.selection_sources.filter(s=>s.type!==type||s.source_id!==id);
  if (!sources.length) return protectedParticipant?link:null;
  if (protectedParticipant && link.selection_sources.some(s=>s.type===type&&s.source_id===id&&s.source_label==="Meeting Leadership")) return link;
  return {...link,selection_sources:sources};
}
// Resolve body aliases uniquely. Do not use matching display names as a membership predicate.
export function resolveSelectedBody(bodies:readonly GovernanceBody[],value:string) {
  if (!value) return undefined;
  const byId=bodies.filter(b=>b.id===value||b.body_id===value);
  const matches=byId.length?byId:bodies.filter(b=>b.body_name===value);
  return matches.length===1&&String(matches[0].status??"Active").toLowerCase()==="active"?matches[0]:undefined;
}
export function effectiveBoardMemberships(body:GovernanceBody|undefined,memberships:readonly GovernanceMembership[],meetingDate:string) {
  if (!body||!/^\d{4}-\d{2}-\d{2}$/.test(meetingDate)) return [];
  const rows=memberships.filter(m=>(m.gov_body_id===body.id||m.gov_body_id===body.body_id)&&m.status==="active"&&/^\d{4}-\d{2}-\d{2}$/.test(m.start_date)&&m.start_date<=meetingDate&&(!m.end_date||(/^\d{4}-\d{2}-\d{2}$/.test(m.end_date)&&m.end_date>=meetingDate)));
  // A person with ambiguous simultaneous assignments must be reconciled by governance.
  return rows.filter(m=>rows.filter(row=>row.user_id===m.user_id).length===1);
}
export function consistentParticipantClassification(link:DraftParticipantLink):DraftParticipantLink {
  if (link.participant_type==="Observer") return {...link,member_category:"general",voting_eligible:false,quorum_eligible:false};
  if (link.member_category==="general"&&link.quorum_eligible) return {...link,quorum_eligible:false};
  return link;
}
