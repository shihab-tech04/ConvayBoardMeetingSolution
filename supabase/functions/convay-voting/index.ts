import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {votingHandler} from './handler.ts';
import {meetingLookupParams,uniqueSavedMeeting} from '../convay-livekit/tenantScope.ts';
import {record} from './contract.ts';
const url=Deno.env.get('SUPABASE_URL')??'';
const anon=Deno.env.get('SUPABASE_ANON_KEY')??'';
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
Deno.serve(votingHandler({
 enabled:Deno.env.get('CONVAY_TRANSACTIONAL_VOTING_ENABLED')==='true' && !!url && !!anon && !!service,
 async verifyUser(jwt){const r=await fetch(url+'/auth/v1/user',{headers:{apikey:anon,Authorization:'Bearer '+jwt},cache:'no-store'});if(!r.ok)return null;const u=await r.json();return typeof u.id==='string'?u.id:null;},
 async resolveScope(jwt,meetingId,sessionId){
  const get=async(params:URLSearchParams)=>{const r=await fetch(url+'/rest/v1/convay_entity_records?'+params.toString(),{headers:{apikey:anon,Authorization:'Bearer '+jwt},cache:'no-store'});if(!r.ok)throw Error('Registry unavailable');return await r.json();};
  const meeting=uniqueSavedMeeting(await get(meetingLookupParams(meetingId)),meetingId);
  if(!meeting||meeting.payload.meeting_id!==meetingId||!Object.hasOwn(meeting,'tenant_id'))return null;
  const params=new URLSearchParams({select:'record_id,tenant_id,payload',entity_key:'eq.bms.liveSessions','payload->>meeting_id':'eq.'+meetingId,'payload->>session_status':'in.(active,paused)',tenant_id:meeting.tenant_id===null?'is.null':'eq.'+meeting.tenant_id,limit:'2'});
  const sessions=await get(params);
  if(!Array.isArray(sessions)||sessions.length!==1||!record(sessions[0])||sessions[0].record_id!==sessionId||sessions[0].tenant_id!==meeting.tenant_id||!record(sessions[0].payload)||sessions[0].payload.id!==sessionId)return null;
  return {tenantId:meeting.tenant_id,meetingId,sessionId};
 },
 async safeBallotLogging(){const r=await fetch(url+'/rest/v1/rpc/convay_vote_logging_preflight',{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:'{}',cache:'no-store'});return r.ok && await r.json()===true;},
 async rpc(args){const r=await fetch(url+'/rest/v1/rpc/convay_vote_command_scoped',{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify(args),cache:'no-store'});const data=await r.json().catch(()=>null);return r.ok?{ok:true,data}:{ok:false,code:typeof data?.code==='string'?data.code:undefined};}
}));
