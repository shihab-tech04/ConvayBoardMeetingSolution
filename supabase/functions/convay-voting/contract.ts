// Strict wire contract. No user-controlled actor or authorization fields.
export type Scope = { tenantId: string; meetingId: string; sessionId: string };
export type Choice = 'For' | 'Against' | 'Abstain';
export type Command =
  | { action: 'motion'; agendaId: string; title: string; wording: string; seconderId?: string | null; notes?: string; amendments?: string; votingRequired?: boolean; requestId: string }
  | { action: 'open'; motionId: string; policyId: string; policyVersion: number; voteTitle?:string; voteNotes?:string; requestId: string }
  | { action: 'reopen'; motionId: string; policyId: string; policyVersion: number; priorRoundId: string; reason: string; voteTitle?:string; voteNotes?:string; requestId: string }
  | { action: 'cast'; roundId: string; choice: Choice; requestId: string }
  | { action: 'close'; roundId: string; requestId: string }
  | { action: 'read'; roundId: string }
  | { action: 'workspace' }
  | { action: 'archive' };
export const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
export const uuid = (x: unknown): x is string => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const identity = (x: unknown): x is string => typeof x === 'string' && /^[A-Za-z0-9_-]{1,180}$/.test(x);
const requestId = (x: unknown) => typeof x === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(x);
const wording = (x: unknown, max: number) => typeof x === 'string' && !!x.trim() && x.length <= max;
const choice = (x: unknown): x is Choice => x === 'For' || x === 'Against' || x === 'Abstain';
const keys = (x: Record<string,unknown>, allowed: string[]) => Object.keys(x).every(k => allowed.includes(k));
const integer = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= 0;
const unique = (ids: readonly string[]): boolean => new Set(ids).size === ids.length;
export function parseDiscovery(raw:unknown):{meetingId:string;sessionId:string}|null {
 if(!record(raw)||!keys(raw,['meetingId','sessionId','command'])||!identity(raw.meetingId)||!identity(raw.sessionId)||!record(raw.command)||!keys(raw.command,['action'])||raw.command.action!=='discover')return null;
 return {meetingId:raw.meetingId,sessionId:raw.sessionId};
}
export function parseRequest(raw: unknown): { scope: Scope; command: Command } | null {
  if (!record(raw) || !keys(raw,['tenantId','meetingId','sessionId','command']) || !uuid(raw.tenantId) || !identity(raw.meetingId) || !identity(raw.sessionId) || !record(raw.command)) return null;
  const c=raw.command;
  let valid=false;
  switch(c.action) {
    case 'motion': valid=keys(c,['action','agendaId','title','wording','seconderId','notes','requestId','amendments','votingRequired']) && identity(c.agendaId) && wording(c.title,500) && wording(c.wording,20000) && (c.seconderId===undefined || c.seconderId===null || uuid(c.seconderId)) && (c.notes===undefined || (typeof c.notes==='string' && c.notes.length<=20000)) && (c.amendments===undefined||(typeof c.amendments==='string'&&c.amendments.length<=20000)) && (c.votingRequired===undefined||typeof c.votingRequired==='boolean') && requestId(c.requestId); break;
    case 'open': case 'reopen': valid=keys(c,c.action==='open'?['action','motionId','policyId','policyVersion','requestId','voteTitle','voteNotes']:['action','motionId','policyId','policyVersion','priorRoundId','reason','requestId','voteTitle','voteNotes']) && uuid(c.motionId) && identity(c.policyId) && integer(c.policyVersion) && c.policyVersion>0 && (c.voteTitle===undefined||wording(c.voteTitle,500)) && (c.voteNotes===undefined||(typeof c.voteNotes==='string'&&c.voteNotes.length<=20000)) && requestId(c.requestId) && (c.action==='open' || (uuid(c.priorRoundId) && wording(c.reason,2000))); break;
    case 'cast': valid=keys(c,['action','roundId','choice','requestId']) && uuid(c.roundId) && choice(c.choice) && requestId(c.requestId); break;
    case 'close': valid=keys(c,['action','roundId','requestId']) && uuid(c.roundId) && requestId(c.requestId); break;
    case 'read': valid=keys(c,['action','roundId']) && uuid(c.roundId); break;
    case 'workspace': case 'archive': valid=keys(c,['action']); break;
  }
  return valid ? { scope:{tenantId:raw.tenantId,meetingId:raw.meetingId,sessionId:raw.sessionId},command:c as Command } : null;
}
// Decode ONLY after Auth has verified this exact token. SQL independently
// checks the persisted auth.sessions row, owner and expiration.
export function verifiedSession(jwt: string, verifiedUserId: string, now = Date.now()): string | null {
  try {
    const parts=jwt.split('.'); if(parts.length!==3 || !uuid(verifiedUserId)) return null;
    const b64=parts[1].replace(/-/g,'+').replace(/_/g,'/');
    const claims: unknown=JSON.parse(atob(b64.padEnd(Math.ceil(b64.length/4)*4,'=')));
    if(!record(claims) || claims.sub!==verifiedUserId || !uuid(claims.session_id) || typeof claims.exp!=='number' || !Number.isFinite(claims.exp) || claims.exp*1000<=now) return null;
    return claims.session_id;
  } catch { return null; }
}
// Reconstruct an allowlisted response, never forward arbitrary SQL payloads.
// Secret rounds may expose only final aggregate counts and own recorded flag.
export function projectReceipt(raw: unknown, scope: Scope, c: Command): Record<string,unknown> | null {
  if(!record(raw) || raw.tenantId!==scope.tenantId || raw.meetingId!==scope.meetingId || raw.sessionId!==scope.sessionId) return null;
  const base={...scope};
  if(c.action==='workspace') return projectWorkspace(raw,scope);
  if(c.action==='archive') return projectArchive(raw,scope);
  if(c.action==='motion') return uuid(raw.motionId)?{...base,motionId:raw.motionId}:null;
  if(c.action==='open'||c.action==='reopen') return uuid(raw.roundId)?{...base,roundId:raw.roundId}:null;
  if(raw.roundId!==c.roundId) return null;
  if(c.action==='cast') return raw.recorded===true && typeof raw.replayed==='boolean'?{...base,roundId:c.roundId,recorded:true,replayed:raw.replayed}:null;
  if(c.action==='close') return raw.outcome==='Passed'||raw.outcome==='Rejected'?{...base,roundId:c.roundId,outcome:raw.outcome}:null;
  if(!uuid(raw.motionId) || !integer(raw.round) || raw.round<1 || !identity(raw.policyId) || !integer(raw.policyVersion) || raw.policyVersion<1 || (typeof raw.state!=='string'||!['Open','Closed'].includes(raw.state)) || (typeof raw.method!=='string'||!['Open','Secret Ballot'].includes(raw.method)) || typeof raw.myRecorded!=='boolean' || !(raw.priorRound===null || uuid(raw.priorRound)) || !(raw.reopenReason===null || typeof raw.reopenReason==='string')) return null;
  const out:Record<string,unknown>={...base,roundId:c.roundId,motionId:raw.motionId,round:raw.round,state:raw.state,method:raw.method,policyId:raw.policyId,policyVersion:raw.policyVersion,priorRound:raw.priorRound,reopenReason:raw.reopenReason,myRecorded:raw.myRecorded};
  if(typeof raw.voteTitle==='string'&&typeof raw.voteNotes==='string')Object.assign(out,{voteTitle:raw.voteTitle,voteNotes:raw.voteNotes});
  ;
  const hasCounts=['for','against','abstain'].some(k=>k in raw);
  if(raw.state==='Closed' || (raw.method==='Open' && hasCounts)) {
    if(!integer(raw.for)||!integer(raw.against)||!integer(raw.abstain)) return null;
    if(raw.state==='Closed' && raw.outcome!=='Passed' && raw.outcome!=='Rejected') return null;
    Object.assign(out,{for:raw.for,against:raw.against,abstain:raw.abstain,outcome:raw.state==='Closed'?raw.outcome:null});
  }
  if(raw.method==='Open' && (raw.state==='Closed'||hasCounts) && 'ballots' in raw) {
    if(!Array.isArray(raw.ballots)||!raw.ballots.every(b=>record(b)&&uuid(b.voter)&&choice(b.choice))) return null;
    const ballots=raw.ballots.map(b=>({voter:b.voter,choice:b.choice}));
    if(!unique(ballots.map(b=>b.voter.toLowerCase())) || ballots.filter(b=>b.choice==='For').length!==raw.for || ballots.filter(b=>b.choice==='Against').length!==raw.against || ballots.filter(b=>b.choice==='Abstain').length!==raw.abstain) return null;
    out.ballots=ballots;
  }
  return out;
}

export type MotionView={motionId:string;agendaId:string;title:string;wording:string;proposerId:string;seconderId:string|null;notes:string;amendments:string;votingRequired:boolean;createdAt:string};
export type PolicyView={policyId:string;version:number;method:'Open'|'Secret Ballot';numerator:number;denominator:number;basis:'decisive'|'cast'|'electorate';comparison:'gt'|'gte';seconderRequired:boolean;reopenAllowed:boolean};
export type RoundView={roundId:string;motionId:string;round:number;state:'Open'|'Closed';method:'Open'|'Secret Ballot';policyId:string;policyVersion:number;priorRound:string|null;reopenReason:string|null;myRecorded:boolean;voteTitle?:string;voteNotes?:string;canCast:boolean;reopenAllowed:boolean;for?:number;against?:number;abstain?:number;outcome?:'Passed'|'Rejected'|null;ballots?:{voter:string;choice:Choice}[]};
export type WorkspaceView=Scope&{motions:MotionView[];rounds:RoundView[];policies:PolicyView[];eligibleAgendaIds:string[];canManage:boolean;quorumMet:boolean};
const string=(x:unknown):x is string=>typeof x==='string';
const date=(x:unknown):x is string=>string(x)&&Number.isFinite(Date.parse(x));
function policy(x:unknown):PolicyView|null {
 if(!record(x)||!identity(x.policyId)||!integer(x.version)||x.version<1||(typeof x.method!=='string'||!['Open','Secret Ballot'].includes(x.method))||!integer(x.numerator)||!integer(x.denominator)||x.numerator<1||x.numerator>x.denominator||(typeof x.basis!=='string'||!['decisive','cast','electorate'].includes(x.basis))||(typeof x.comparison!=='string'||!['gt','gte'].includes(x.comparison))||typeof x.seconderRequired!=='boolean'||typeof x.reopenAllowed!=='boolean')return null;
 return {policyId:x.policyId,version:x.version,method:x.method,numerator:x.numerator,denominator:x.denominator,basis:x.basis,comparison:x.comparison,seconderRequired:x.seconderRequired,reopenAllowed:x.reopenAllowed} as PolicyView;
}
function motion(x:unknown):MotionView|null {
 if(!record(x)||!uuid(x.motionId)||!identity(x.agendaId)||!string(x.title)||!string(x.wording)||!uuid(x.proposerId)||!(x.seconderId===null||uuid(x.seconderId))||!string(x.notes)||!string(x.amendments)||typeof x.votingRequired!=='boolean'||!date(x.createdAt))return null;
 return {motionId:x.motionId,agendaId:x.agendaId,title:x.title,wording:x.wording,proposerId:x.proposerId,seconderId:x.seconderId,notes:x.notes,amendments:x.amendments,votingRequired:x.votingRequired,createdAt:x.createdAt};
}
// Nested SQL rows may omit scope, but must never contradict the verified parent scope.
const nestedScopeMatches=(row:Record<string,unknown>,scope:Scope):boolean =>
 (['tenantId','meetingId','sessionId'] as const).every(key=>!Object.prototype.hasOwnProperty.call(row,key)||row[key]===scope[key]);
function projectWorkspace(raw:Record<string,unknown>,scope:Scope):WorkspaceView|null {
 if(!Array.isArray(raw.motions)||!Array.isArray(raw.rounds)||!Array.isArray(raw.policies)||typeof raw.canManage!=='boolean'||typeof raw.quorumMet!=='boolean'||!Array.isArray(raw.eligibleAgendaIds)||!raw.eligibleAgendaIds.every(identity))return null;
 const motions=raw.motions.map(motion),policies=raw.policies.map(policy);
 if(motions.some(x=>!x)||policies.some(x=>!x))return null;
 if(!unique((motions as MotionView[]).map(m=>m.motionId.toLowerCase()))||!unique((policies as PolicyView[]).map(p=>`${p.policyId}:${p.version}`)))return null;
 const rounds=raw.rounds.map(r=>{
  if(!record(r)||!nestedScopeMatches(r,scope)||!uuid(r.roundId)||typeof r.canCast!=='boolean'||typeof r.reopenAllowed!=='boolean')return null;
  const projected=projectReceipt({...r,...scope},scope,{action:'read',roundId:r.roundId});if(!projected)return null;
  const {tenantId:_,meetingId:__,sessionId:___,...round}=projected;
  return {...round,canCast:r.canCast,reopenAllowed:r.reopenAllowed} as RoundView;
 });
 if(rounds.some(x=>!x)||rounds.filter(r=>r?.state==='Open').length>1||rounds.some(r=>!motions.some(m=>m?.motionId===r?.motionId)))return null;
 const verifiedRounds=rounds as RoundView[];
 if(!unique(verifiedRounds.map(r=>r.roundId.toLowerCase()))||!unique(verifiedRounds.map(r=>`${r.motionId.toLowerCase()}:${r.round}`)))return null;
 return {...scope,motions:motions as MotionView[],policies:policies as PolicyView[],rounds:rounds as RoundView[],eligibleAgendaIds:raw.eligibleAgendaIds as string[],canManage:raw.canManage,quorumMet:raw.quorumMet};
}
function projectArchive(raw:Record<string,unknown>,scope:Scope):Record<string,unknown>|null {
 if(!Array.isArray(raw.rounds))return null;
 const rounds=raw.rounds.map(r=>{
  if(!record(r)||!nestedScopeMatches(r,scope)||!uuid(r.roundId)||r.state!=='Closed'||!identity(r.agendaId)||!string(r.title)||!string(r.wording)||!date(r.closedAt))return null;
  const projected=projectReceipt({...r,...scope,myRecorded:false},scope,{action:'read',roundId:r.roundId});
  if(!projected||!integer(r.numerator)||!integer(r.denominator)||r.numerator<1||r.numerator>r.denominator||(typeof r.basis!=='string'||!['decisive','cast','electorate'].includes(r.basis))||(typeof r.comparison!=='string'||!['gt','gte'].includes(r.comparison)))return null;
  const {tenantId:_,meetingId:__,sessionId:___,myRecorded:____,...round}=projected;
  return {...round,agendaId:r.agendaId,title:r.title,wording:r.wording,closedAt:r.closedAt,numerator:r.numerator,denominator:r.denominator,basis:r.basis,comparison:r.comparison};
 });
 if(rounds.some(r=>!r))return null;
 // Each accepted projection already has a verified UUID and round number.
 const ids=raw.rounds.map(r=>r.roundId.toLowerCase());
 const motionRounds=raw.rounds.map(r=>`${r.motionId.toLowerCase()}:${r.round}`);
 return unique(ids)&&unique(motionRounds)?{...scope,rounds}:null;
}

// A successful command receipt is not proof that the requested record was saved.
// Reconcile the immutable command intent against independently fetched SQL state.
// A round may already be closed by another authorized host; its identity and
// original policy/content must still match. Secret choices never enter readback.
export type VotingMutation=Exclude<Command,{action:'read'|'workspace'|'archive'}>;
export function confirmsVotingMutation(scope:Scope,actorId:string,command:VotingMutation,receipt:Record<string,unknown>,workspace:WorkspaceView):boolean {
 if(![receipt,workspace].every(row=>row.tenantId===scope.tenantId&&row.meetingId===scope.meetingId&&row.sessionId===scope.sessionId))return false;
 if(command.action==='motion'){
  const m=workspace.motions.find(m=>m.motionId===receipt.motionId);
  return !!m&&m.proposerId===actorId&&m.agendaId===command.agendaId&&m.title===command.title&&m.wording===command.wording&&m.seconderId===(command.seconderId??null)&&m.notes===(command.notes??'')&&m.amendments===(command.amendments??'')&&m.votingRequired===(command.votingRequired??true);
 }
 const r=workspace.rounds.find(r=>r.roundId===receipt.roundId);
 if(!r)return false;
 if(command.action==='cast')return r.roundId===command.roundId&&receipt.recorded===true&&r.myRecorded;
 if(command.action==='close')return r.roundId===command.roundId&&r.state==='Closed'&&r.outcome===receipt.outcome;
 const m=workspace.motions.find(m=>m.motionId===command.motionId);
 if(!m||r.motionId!==command.motionId||r.policyId!==command.policyId||r.policyVersion!==command.policyVersion||r.voteTitle!==(command.voteTitle||m.title)||r.voteNotes!==(command.voteNotes??''))return false;
 if(command.action==='open')return r.round===1&&r.priorRound===null&&r.reopenReason===null;
 const prior=workspace.rounds.find(p=>p.roundId===command.priorRoundId);
 return !!prior&&prior.state==='Closed'&&prior.motionId===r.motionId&&prior.policyId===r.policyId&&prior.policyVersion===r.policyVersion&&r.round===prior.round+1&&r.priorRound===command.priorRoundId&&r.reopenReason===command.reason;
}
