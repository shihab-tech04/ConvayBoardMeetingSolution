import test from 'node:test';
import assert from 'node:assert/strict';
import {votingHandler} from '../../functions/convay-voting/handler.ts';
import {parseRequest,projectReceipt,confirmsVotingMutation} from '../../functions/convay-voting/contract.ts';
const actor='11111111-1111-4111-8111-111111111111', sid='51111111-1111-4111-8111-111111111111', round='22222222-2222-4222-8222-222222222222', motion='33333333-3333-4333-8333-333333333333';
const scope={tenantId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',meetingId:'MTG-SHARED',sessionId:'SES-A'};
const cmd={action:'cast',roundId:round,choice:'For',requestId:'request_000000000001'};
const read={action:'read',roundId:round};
const base={...scope,roundId:round,motionId:motion,round:1,state:'Open',method:'Secret Ballot',policyId:'policy',policyVersion:1,priorRound:null,reopenReason:null,myRecorded:true};
const jwt=(claims={})=>['e30',Buffer.from(JSON.stringify({sub:actor,session_id:sid,exp:Date.now()/1000+3600,...claims})).toString('base64url'),'fixture'].join('.');
const req=(command=cmd,opts={})=>new Request('https://example.invalid/vote',{method:'POST',headers:{Authorization:'Bearer '+jwt(),Origin:'https://shihab-tech04.github.io',...opts.headers},body:JSON.stringify({...scope,command,...opts.body})});
const run=(overrides={})=>{let calls=[];let h=votingHandler({enabled:true,verifyUser:async()=>actor,safeBallotLogging:async()=>true,rpc:async args=>{calls.push(args);return {ok:true,data:{...scope,roundId:round,recorded:true,replayed:false,choice:'For',actorId:actor}};},...overrides});return {h,calls};};
test('only server verified actor/session forwarded; response strips leaked fields',async()=>{const {h,calls}=run();const r=await h(req());assert.equal(r.status,200);assert.deepEqual(calls[0],{p_actor_id:actor,p_auth_session_id:sid,p_tenant_id:scope.tenantId,p_meeting_id:scope.meetingId,p_session_id:scope.sessionId,p_command:cmd});assert.deepEqual(await r.json(),{...scope,roundId:round,recorded:true,replayed:false});assert.equal(r.headers.get('Cache-Control'),'no-store');});
test('disabled never invokes auth or RPC',async()=>{const {h,calls}=run({enabled:false,verifyUser:async()=>{throw Error('called')}});assert.equal((await h(req())).status,503);assert.equal(calls.length,0);});
for(const [label,command,body] of [['forged actor',{...cmd,actorId:actor},{}],['forged scope',cmd,{actorId:actor}],['invalid choice',{...cmd,choice:'Other'},{}],['missing request',{action:'cast',roundId:round,choice:'For'},{}],['invalid tenant',cmd,{tenantId:null}],['invalid session',cmd,{sessionId:''}],['invalid policy',{action:'open',motionId:motion,policyId:'policy',policyVersion:0,requestId:cmd.requestId},{}]])test(label,async()=>{const {h,calls}=run();assert.equal((await h(req(command,{body}))).status,400);assert.equal(calls.length,0);});
for(const [label,claims] of [['wrong user',{sub:round}],['expired token',{exp:0}],['missing session',{session_id:null}]])test(label,async()=>{const {h,calls}=run();assert.equal((await h(req(cmd,{headers:{Authorization:'Bearer '+jwt(claims)}}))).status,401);assert.equal(calls.length,0);});
test('unverified user denied',async()=>{const {h,calls}=run({verifyUser:async()=>null});assert.equal((await h(req())).status,401);assert.equal(calls.length,0);});
test('wrong origin denied before RPC',async()=>{const {h,calls}=run();assert.equal((await h(req(cmd,{headers:{Origin:'https://evil.invalid'}}))).status,403);assert.equal(calls.length,0);});
for(const [code,status] of [['42501',403],['23505',409],['40001',409],['23514',409],['22023',400],['XX000',503]])test('safe SQL error '+code,async()=>{const {h}=run({rpc:async()=>({ok:false,code,data:{message:'For',actorId:actor}})});const r=await h(req());assert.equal(r.status,status);assert(!JSON.stringify(await r.json()).includes(actor));});
test('scope mismatch rejected',async()=>{const {h}=run({rpc:async()=>({ok:true,data:{...scope,sessionId:'SES-B',roundId:round,recorded:true,replayed:false}})});assert.equal((await h(req())).status,502);});
test('secret in-progress result strips tally, ballots and unexpected fields',()=>{const r=projectReceipt({...base,for:1,against:2,abstain:0,ballots:[{voter:actor,choice:'For'}],actorId:actor},scope,read);assert.deepEqual(r,base);});
test('secret closed result preserves totals, strips names',()=>{const r=projectReceipt({...base,state:'Closed',for:1,against:2,abstain:0,outcome:'Rejected',ballots:[{voter:actor,choice:'For'}]},scope,read);assert.equal(r.for,1);assert.equal(r.outcome,'Rejected');assert(!('ballots' in r));});
test('malformed closed result denied',()=>assert.equal(projectReceipt({...base,state:'Closed',for:-1,against:0,abstain:0,outcome:'Passed'},scope,read),null));
test('open named ballot projections strip extras',()=>{const r=projectReceipt({...base,method:'Open',for:1,against:0,abstain:0,ballots:[{voter:actor,choice:'For',sessionId:sid}]},scope,read);assert.deepEqual(r.ballots,[{voter:actor,choice:'For'}]);});
test('request validation preserves Bangla and does not infer policy',()=>{assert(parseRequest({...scope,command:{action:'motion',agendaId:'AG-1',title:'প্রস্তাব',wording:'বিবরণ',requestId:cmd.requestId}}));assert.equal(parseRequest({...scope,command:{action:'open',motionId:motion,requestId:cmd.requestId}}),null);});

test('unsafe log configuration denies before sending ballot',async()=>{const {h,calls}=run({safeBallotLogging:async()=>false});assert.equal((await h(req())).status,503);assert.equal(calls.length,0);});
test('archive is actor-independent and strips secret markers',()=>{const row={...base,state:'Closed',for:1,against:0,abstain:0,outcome:'Passed',agendaId:'AG-1',title:'Motion',wording:'Text',closedAt:'2026-11-25T12:00:00Z',numerator:1,denominator:1,basis:'cast',comparison:'gte',ballots:[{voter:actor,choice:'For'}],requestId:cmd.requestId};const r=projectReceipt({...scope,rounds:[row]},scope,{action:'archive'});assert.equal(r.rounds[0].for,1);for(const k of ['ballots','myRecorded','requestId','tenantId','actorId'])assert(!Object.hasOwn(r.rounds[0],k));});
const discoveryRequest=()=>new Request('https://example.invalid/vote',{method:'POST',headers:{Authorization:'Bearer '+jwt()},body:JSON.stringify({meetingId:scope.meetingId,sessionId:scope.sessionId,command:{action:'discover'}})});
test('only explicit authenticated legacy scope yields legacy mode',async()=>{const {h,calls}=run({resolveScope:async()=>({...scope,tenantId:null})});const r=await h(discoveryRequest());assert.equal(r.status,200);assert.deepEqual(await r.json(),{kind:'legacy',meetingId:scope.meetingId,sessionId:scope.sessionId});assert.equal(calls.length,0);});
test('scope discovery rejects stale session instead of fallback',async()=>{const {h,calls}=run({resolveScope:async()=>({...scope,sessionId:'SES-B'})});assert.equal((await h(discoveryRequest())).status,403);assert.equal(calls.length,0);});
test('company discovery returns sanitized authoritative workspace',async()=>{const {h}=run({resolveScope:async()=>scope,rpc:async args=>({ok:true,data:{...scope,motions:[{motionId:motion,agendaId:'AG-1',title:'M',wording:'W',proposerId:actor,seconderId:null,notes:'',amendments:'',votingRequired:true,createdAt:'2026-11-25T00:00:00Z'}],rounds:[{...base,canCast:true,reopenAllowed:false,for:1,ballots:[{voter:actor,choice:'For'}]}],policies:[],eligibleAgendaIds:['AG-1'],canManage:true,quorumMet:true}})});const r=await h(discoveryRequest());assert.equal(r.status,200);const x=await r.json();assert.equal(x.kind,'company');assert.equal(x.rounds[0].canCast,true);assert(!('ballots' in x.rounds[0]));assert(!('for' in x.rounds[0]));});

// Nested scope is optional in the SQL projection, but a contradictory scope must fail closed.
const scopeMotion={motionId:motion,agendaId:'AG-1',title:'M',wording:'W',proposerId:actor,seconderId:null,notes:'',amendments:'',votingRequired:true,createdAt:'2026-11-25T00:00:00Z'};
const workspaceRow={...base,canCast:true,reopenAllowed:false};
const archiveRow={...base,state:'Closed',for:1,against:0,abstain:0,outcome:'Passed',agendaId:'AG-1',title:'M',wording:'W',closedAt:'2026-11-25T12:00:00Z',numerator:1,denominator:1,basis:'cast',comparison:'gte'};
const workspaceOf=row=>({...scope,motions:[scopeMotion],rounds:[row],policies:[],eligibleAgendaIds:['AG-1'],canManage:true,quorumMet:true});
for(const [key,value] of [['tenantId','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],['meetingId','MTG-OTHER'],['sessionId','SES-B']]){
 test('workspace rejects nested contradictory '+key,()=>assert.equal(projectReceipt(workspaceOf({...workspaceRow,[key]:value}),scope,{action:'workspace'}),null));
 test('archive rejects nested contradictory '+key,()=>assert.equal(projectReceipt({...scope,rounds:[{...archiveRow,[key]:value}]},scope,{action:'archive'}),null));
}
test('nested rows may omit redundant scope',()=>{const omit=({tenantId,meetingId,sessionId,...row})=>row;assert(projectReceipt(workspaceOf(omit(workspaceRow)),scope,{action:'workspace'}));assert(projectReceipt({...scope,rounds:[omit(archiveRow)]},scope,{action:'archive'}));});

// Do not coerce malformed JSON arrays into valid enum labels.
for(const [field,value] of [['state',['Open']],['method',['Secret Ballot']]])test('round rejects non-string '+field,()=>assert.equal(projectReceipt({...base,[field]:value},scope,read),null));
const strictPolicy={policyId:'policy',version:1,method:'Secret Ballot',numerator:1,denominator:2,basis:'cast',comparison:'gte',seconderRequired:false,reopenAllowed:false};
for(const [field,value] of [['method',['Secret Ballot']],['basis',['cast']],['comparison',['gte']]])test('workspace rejects non-string policy '+field,()=>assert.equal(projectReceipt({...workspaceOf(workspaceRow),policies:[{...strictPolicy,[field]:value}]},scope,{action:'workspace'}),null));
for(const [field,value] of [['basis',['cast']],['comparison',['gte']]])test('archive rejects non-string policy '+field,()=>assert.equal(projectReceipt({...scope,rounds:[{...archiveRow,[field]:value}]},scope,{action:'archive'}),null));
test('valid policy enums retain exact original values',()=>{const v=projectReceipt({...workspaceOf(workspaceRow),policies:[strictPolicy]},scope,{action:'workspace'});assert.deepEqual(v.policies,[strictPolicy]);});


// A projection must not inflate results or introduce ambiguous identities.
const closedWorkspaceRow={...archiveRow,canCast:false,reopenAllowed:true};
const secondRound='44444444-4444-4444-8444-444444444444';
test('workspace rejects duplicate motion identity',()=>assert.equal(projectReceipt({...workspaceOf(workspaceRow),motions:[scopeMotion,{...scopeMotion,title:'Conflicting'}]},scope,{action:'workspace'}),null));
test('workspace rejects duplicate policy version',()=>assert.equal(projectReceipt({...workspaceOf(workspaceRow),policies:[strictPolicy,{...strictPolicy,numerator:2}]},scope,{action:'workspace'}),null));
test('workspace rejects duplicate closed round identity',()=>assert.equal(projectReceipt({...workspaceOf(closedWorkspaceRow),rounds:[closedWorkspaceRow,closedWorkspaceRow]},scope,{action:'workspace'}),null));
test('archive rejects duplicate round identity',()=>assert.equal(projectReceipt({...scope,rounds:[archiveRow,archiveRow]},scope,{action:'archive'}),null));
test('archive rejects conflicting round number for same motion',()=>assert.equal(projectReceipt({...scope,rounds:[archiveRow,{...archiveRow,roundId:secondRound}]},scope,{action:'archive'}),null));
test('workspace rejects conflicting round number for same motion',()=>assert.equal(projectReceipt({...workspaceOf(closedWorkspaceRow),rounds:[closedWorkspaceRow,{...closedWorkspaceRow,roundId:secondRound}]},scope,{action:'workspace'}),null));
test('distinct historical rounds remain available',()=>{const reopened={...archiveRow,roundId:secondRound,round:2,priorRound:round,reopenReason:'Approved retry'};assert.equal(projectReceipt({...scope,rounds:[archiveRow,reopened]},scope,{action:'archive'}).rounds.length,2);});
test('named ballot projection rejects duplicate voter',()=>assert.equal(projectReceipt({...base,method:'Open',for:2,against:0,abstain:0,ballots:[{voter:actor,choice:'For'},{voter:actor,choice:'For'}]},scope,read),null));
test('named ballot projection rejects mismatched tally',()=>assert.equal(projectReceipt({...base,method:'Open',for:0,against:1,abstain:0,ballots:[{voter:actor,choice:'For'}]},scope,read),null));
test('aggregate-only open projection stays valid',()=>assert(projectReceipt({...base,method:'Open',for:1,against:0,abstain:0},scope,read)));


// Independent SQL readback must prove the original command, not just an ID.
const motionIntent={action:'motion',agendaId:'AG-1',title:'M',wording:'W',requestId:cmd.requestId};
const openIntent={action:'open',motionId:motion,policyId:'policy',policyVersion:1,requestId:cmd.requestId};
const fullRound={...workspaceRow,voteTitle:'M',voteNotes:''};
const motionAck={...scope,motionId:motion};
const roundAck={...scope,roundId:round};
const check=(command,ack,workspace,who=actor)=>confirmsVotingMutation(scope,who,command,ack,workspace);
test('motion readback confirms all original fields and defaults',()=>assert(check(motionIntent,motionAck,workspaceOf(fullRound))));
for(const [field,value] of [['agendaId','AG-2'],['title','Other'],['wording','Other'],['proposerId',secondRound],['seconderId',secondRound],['notes','Other'],['amendments','Other'],['votingRequired',false]])test('motion readback rejects changed '+field,()=>assert(!check(motionIntent,motionAck,{...workspaceOf(fullRound),motions:[{...scopeMotion,[field]:value}]})));
test('motion readback confirms explicit optional values',()=>{const intent={...motionIntent,seconderId:secondRound,notes:'Notes',amendments:'Amend',votingRequired:false};assert(check(intent,motionAck,{...workspaceOf(fullRound),motions:[{...scopeMotion,seconderId:secondRound,notes:'Notes',amendments:'Amend',votingRequired:false}]}));});
test('open readback confirms motion, policy and SQL title fallback',()=>assert(check(openIntent,roundAck,workspaceOf(fullRound))));
for(const [field,value] of [['motionId',secondRound],['policyId','other'],['policyVersion',2],['voteTitle','Other'],['voteNotes','Other'],['priorRound',secondRound],['round',2],['reopenReason','Other']])test('open readback rejects changed '+field,()=>assert(!check(openIntent,roundAck,workspaceOf({...fullRound,[field]:value}))));
test('open readback tolerates a valid concurrently closed round',()=>assert(check(openIntent,roundAck,workspaceOf({...fullRound,state:'Closed',outcome:'Passed'}))));
test('reopen requires previous closed round and original policy/content',()=>{const intent={...openIntent,action:'reopen',priorRoundId:round,reason:'Approved retry'};const ack={...scope,roundId:secondRound};const previous={...fullRound,state:'Closed',outcome:'Passed'};const next={...fullRound,roundId:secondRound,round:2,priorRound:round,reopenReason:'Approved retry'};const ws={...workspaceOf(next),rounds:[previous,next]};assert(check(intent,ack,ws));assert(!check(intent,ack,{...ws,rounds:[next]}));assert(!check(intent,ack,{...ws,rounds:[previous,{...next,reopenReason:'Wrong'}]}));assert(!check(intent,ack,{...ws,rounds:[{...previous,state:'Open'},next]}));});
test('cast checks only own recorded flag and exact round, not secret choice',()=>{assert(check(cmd,{...roundAck,recorded:true},workspaceOf(fullRound)));assert(!check(cmd,{...roundAck,recorded:true},workspaceOf({...fullRound,myRecorded:false})));assert(!check(cmd,{...roundAck,roundId:secondRound,recorded:true},workspaceOf({...fullRound,roundId:secondRound})));});
test('close checks exact round and confirmed terminal outcome',()=>{const intent={action:'close',roundId:round,requestId:cmd.requestId};const ack={...roundAck,outcome:'Passed'};assert(check(intent,ack,workspaceOf({...fullRound,state:'Closed',outcome:'Passed'})));assert(!check(intent,ack,workspaceOf({...fullRound,state:'Closed',outcome:'Rejected'})));assert(!check(intent,ack,workspaceOf(fullRound)));});
for(const field of ['tenantId','meetingId','sessionId'])test('readback rejects wrong '+field+' even for matching round ID',()=>{assert(!check(openIntent,roundAck,{...workspaceOf(fullRound),[field]:'wrong'}));assert(!check(openIntent,{...roundAck,[field]:'wrong'},workspaceOf(fullRound)));});
