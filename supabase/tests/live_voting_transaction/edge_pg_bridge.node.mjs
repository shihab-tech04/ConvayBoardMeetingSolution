// Disposable test only: actual Edge handler and client contract projection call
// actual PostgreSQL RPC via a local adapter. Auth identities are synthetic; this
// does NOT assert Supabase Auth, HTTP infrastructure or provider acceptance.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { votingHandler } from '../../functions/convay-voting/handler.ts';
import { projectReceipt } from '../../functions/convay-voting/contract.ts';
const host='11111111-1111-4111-8111-111111111111', voter='22222222-2222-4222-8222-222222222222';
const hs='51111111-1111-4111-8111-111111111111', vs='52222222-2222-4222-8222-222222222222';
const a='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', b='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const scope={tenantId:a,meetingId:'MTG-SHARED',sessionId:'SES-A'};
const foreign={...scope,tenantId:b,sessionId:'SES-B'};
const q=s=>"'"+String(s).replaceAll("'","''")+"'";
function pg(sql,service=true){
 const p=spawnSync('docker',['exec','-i','convay-voting','psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','fixture'],{
  input:'\\set VERBOSITY verbose\n'+(service?'set role service_role;\n':'')+sql+';\n',encoding:'utf8',maxBuffer:1024*1024
 });
 if(p.error||p.status!==0)return {ok:false,code:p.stderr?.match(/ERROR:\s+([0-9A-Z]{5}):/)?.[1]??'XX000'};
 return {ok:true,value:p.stdout.trim()};
}
function operator(sql){assert(pg(sql,false).ok,'Disposable operator setup failed');}
function rpc(p){
 const r=pg('select public.convay_vote_command_scoped('+[q(p.p_actor_id)+'::uuid',q(p.p_auth_session_id)+'::uuid',q(p.p_tenant_id)+'::uuid',q(p.p_meeting_id),q(p.p_session_id),q(JSON.stringify(p.p_command))+'::jsonb'].join(',')+')');
 return r.ok?{ok:true,data:JSON.parse(r.value)}:r;
}
const jwt=(sub,sid)=>['e30',Buffer.from(JSON.stringify({sub,session_id:sid,exp:Date.now()/1000+3600})).toString('base64url'),'synthetic-only'].join('.');
const htoken=jwt(host,hs),vtoken=jwt(voter,vs),wrongSession=jwt(host,vs);
const identities=new Map([[htoken,host],[vtoken,voter],[wrongSession,host]]);
const handler=votingHandler({enabled:true,verifyUser:async token=>identities.get(token)??null,safeBallotLogging:async()=>{const r=pg('select public.convay_vote_logging_preflight()');return r.ok&&r.value==='t';},resolveScope:async(token,meetingId,sessionId)=>identities.has(token)&&meetingId===scope.meetingId&&sessionId===scope.sessionId?scope:null,rpc:async p=>rpc(p)});
let n=0;
async function request(token,command,s=scope,expected=200){
 const req=new Request('https://fixture.invalid/vote',{method:'POST',headers:{Authorization:'Bearer '+token,Origin:'https://shihab-tech04.github.io','Content-Type':'application/json'},body:JSON.stringify({...s,command})});
 const res=await handler(req);assert.equal(res.status,expected,'Unexpected Edge status for '+command.action);
 const value=await res.json();assert.equal(res.headers.get('cache-control'),'no-store');
 if(expected!==200){assert.deepEqual(Object.keys(value),['error']);n++;return value;}
 const projected=projectReceipt(value,s,command);assert(projected,'Actual SQL receipt rejected by client projection for '+command.action);
 n++;return projected;
}
operator('update convay_private.transactional_voting_gate set enabled=true where singleton=true');
const motion=await request(htoken,{action:'motion',agendaId:'AG-1',title:'পরীক্ষার প্রস্তাব',wording:'Synthetic bridge fixture',requestId:'bridge_motion_000001'});
const round=await request(htoken,{action:'open',motionId:motion.motionId,policyId:'fixture-race',policyVersion:1,requestId:'bridge_open_00000001'});
const ballot={action:'cast',roundId:round.roundId,choice:'For',requestId:'bridge_cast_00000001'};
await request(wrongSession,ballot,scope,403);
await request(htoken,{action:'read',roundId:round.roundId},foreign,403);
const cast=await request(htoken,ballot);assert.equal(cast.recorded,true);assert(!('choice' in cast));
const duplicate=await request(htoken,ballot);assert.equal(duplicate.replayed,true);
const sealed=await request(vtoken,{action:'read',roundId:round.roundId});assert(!('for' in sealed));assert(!('ballots' in sealed));
operator('update convay_private.live_attendance_company_gate set enabled=false where singleton=true');
await request(vtoken,{...ballot,requestId:'bridge_cast_00000002'},scope,403);
const suspended=await request(vtoken,{action:'workspace'});assert.equal(suspended.quorumMet,false);assert(!suspended.rounds.some(r=>r.canCast));
operator('update convay_private.live_attendance_company_gate set enabled=true where singleton=true');
await request(vtoken,{...ballot,requestId:'bridge_cast_00000002'},scope,403);
const refresh=pg('select public.convay_commit_live_attendance_scoped('+[q(host)+'::uuid',q(scope.meetingId),q(host),q('Present'),"(select revision from public.convay_entity_records where tenant_id="+q(a)+"::uuid and entity_key='bms.attendance' and payload->>'participant_id'="+q(host)+")",q('bridge_fresh_0000001'),'true',q('Online'),q(a)+'::uuid',q(scope.sessionId)].join(',')+')',false);assert(refresh.ok,'Fresh attendance RPC failed');
const other=await request(vtoken,{...ballot,requestId:'bridge_cast_00000002'});assert(other.recorded);
const closed=await request(htoken,{action:'close',roundId:round.roundId,requestId:'bridge_close_0000001'});assert.equal(closed.outcome,'Passed');
const result=await request(vtoken,{action:'read',roundId:round.roundId});assert.equal(result.for,2);assert(!('ballots' in result));
operator("update public.convay_entity_records set payload=payload||'{\"session_status\":\"ended\"}'::jsonb where tenant_id="+q(a)+"::uuid and entity_key='bms.liveSessions' and record_id='SES-A'");
const ha=await request(htoken,{action:'archive'}),va=await request(vtoken,{action:'archive'});assert.deepEqual(ha,va);assert(ha.rounds.some(r=>r.roundId===round.roundId&&r.for===2&&!('ballots' in r)&&!('myRecorded' in r)));
await request(htoken,{action:'archive'},foreign,403);
console.log(n+' real Edge-to-PostgreSQL/client-projection checks PASS (synthetic Auth adapter; no hosted access)');
