// Strict wire contract. No user-controlled actor or authorization fields.
export type Scope = { tenantId: string; meetingId: string; sessionId: string };
export type Choice = 'For' | 'Against' | 'Abstain';
export type Command =
  | { action: 'motion'; agendaId: string; title: string; wording: string; seconderId?: string | null; notes?: string; requestId: string }
  | { action: 'open'; motionId: string; policyId: string; policyVersion: number; requestId: string }
  | { action: 'reopen'; motionId: string; policyId: string; policyVersion: number; priorRoundId: string; reason: string; requestId: string }
  | { action: 'cast'; roundId: string; choice: Choice; requestId: string }
  | { action: 'close'; roundId: string; requestId: string }
  | { action: 'read'; roundId: string };
export const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
export const uuid = (x: unknown): x is string => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const identity = (x: unknown): x is string => typeof x === 'string' && /^[A-Za-z0-9_-]{1,180}$/.test(x);
const requestId = (x: unknown) => typeof x === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(x);
const wording = (x: unknown, max: number) => typeof x === 'string' && !!x.trim() && x.length <= max;
const choice = (x: unknown): x is Choice => x === 'For' || x === 'Against' || x === 'Abstain';
const keys = (x: Record<string,unknown>, allowed: string[]) => Object.keys(x).every(k => allowed.includes(k));
const integer = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= 0;
export function parseRequest(raw: unknown): { scope: Scope; command: Command } | null {
  if (!record(raw) || !keys(raw,['tenantId','meetingId','sessionId','command']) || !uuid(raw.tenantId) || !identity(raw.meetingId) || !identity(raw.sessionId) || !record(raw.command)) return null;
  const c=raw.command;
  let valid=false;
  switch(c.action) {
    case 'motion': valid=keys(c,['action','agendaId','title','wording','seconderId','notes','requestId']) && identity(c.agendaId) && wording(c.title,500) && wording(c.wording,20000) && (c.seconderId===undefined || c.seconderId===null || uuid(c.seconderId)) && (c.notes===undefined || (typeof c.notes==='string' && c.notes.length<=20000)) && requestId(c.requestId); break;
    case 'open': case 'reopen': valid=keys(c,c.action==='open'?['action','motionId','policyId','policyVersion','requestId']:['action','motionId','policyId','policyVersion','priorRoundId','reason','requestId']) && uuid(c.motionId) && identity(c.policyId) && integer(c.policyVersion) && c.policyVersion>0 && requestId(c.requestId) && (c.action==='open' || (uuid(c.priorRoundId) && wording(c.reason,2000))); break;
    case 'cast': valid=keys(c,['action','roundId','choice','requestId']) && uuid(c.roundId) && choice(c.choice) && requestId(c.requestId); break;
    case 'close': valid=keys(c,['action','roundId','requestId']) && uuid(c.roundId) && requestId(c.requestId); break;
    case 'read': valid=keys(c,['action','roundId']) && uuid(c.roundId); break;
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
  if(c.action==='motion') return uuid(raw.motionId)?{...base,motionId:raw.motionId}:null;
  if(c.action==='open'||c.action==='reopen') return uuid(raw.roundId)?{...base,roundId:raw.roundId}:null;
  if(raw.roundId!==c.roundId) return null;
  if(c.action==='cast') return raw.recorded===true && typeof raw.replayed==='boolean'?{...base,roundId:c.roundId,recorded:true,replayed:raw.replayed}:null;
  if(c.action==='close') return raw.outcome==='Passed'||raw.outcome==='Rejected'?{...base,roundId:c.roundId,outcome:raw.outcome}:null;
  if(!uuid(raw.motionId) || !integer(raw.round) || raw.round<1 || !identity(raw.policyId) || !integer(raw.policyVersion) || raw.policyVersion<1 || !['Open','Closed'].includes(String(raw.state)) || !['Open','Secret Ballot'].includes(String(raw.method)) || typeof raw.myRecorded!=='boolean' || !(raw.priorRound===null || uuid(raw.priorRound)) || !(raw.reopenReason===null || typeof raw.reopenReason==='string')) return null;
  const out:Record<string,unknown>={...base,roundId:c.roundId,motionId:raw.motionId,round:raw.round,state:raw.state,method:raw.method,policyId:raw.policyId,policyVersion:raw.policyVersion,priorRound:raw.priorRound,reopenReason:raw.reopenReason,myRecorded:raw.myRecorded};
  const hasCounts=['for','against','abstain'].some(k=>k in raw);
  if(raw.state==='Closed' || (raw.method==='Open' && hasCounts)) {
    if(!integer(raw.for)||!integer(raw.against)||!integer(raw.abstain)) return null;
    if(raw.state==='Closed' && raw.outcome!=='Passed' && raw.outcome!=='Rejected') return null;
    Object.assign(out,{for:raw.for,against:raw.against,abstain:raw.abstain,outcome:raw.state==='Closed'?raw.outcome:null});
  }
  if(raw.method==='Open' && (raw.state==='Closed'||hasCounts) && 'ballots' in raw) {
    if(!Array.isArray(raw.ballots)||!raw.ballots.every(b=>record(b)&&uuid(b.voter)&&choice(b.choice))) return null;
    out.ballots=raw.ballots.map(b=>({voter:b.voter,choice:b.choice}));
  }
  return out;
}
