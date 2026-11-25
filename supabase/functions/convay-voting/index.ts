import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {votingHandler} from './handler.ts';
const url=Deno.env.get('SUPABASE_URL')??'';
const anon=Deno.env.get('SUPABASE_ANON_KEY')??'';
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
Deno.serve(votingHandler({
 enabled:Deno.env.get('CONVAY_TRANSACTIONAL_VOTING_ENABLED')==='true' && !!url && !!anon && !!service,
 async verifyUser(jwt){const r=await fetch(url+'/auth/v1/user',{headers:{apikey:anon,Authorization:'Bearer '+jwt},cache:'no-store'});if(!r.ok)return null;const u=await r.json();return typeof u.id==='string'?u.id:null;},
 async safeBallotLogging(){const r=await fetch(url+'/rest/v1/rpc/convay_vote_logging_preflight',{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:'{}',cache:'no-store'});return r.ok && await r.json()===true;},
 async rpc(args){const r=await fetch(url+'/rest/v1/rpc/convay_vote_command_scoped',{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:JSON.stringify(args),cache:'no-store'});const data=await r.json().catch(()=>null);return r.ok?{ok:true,data}:{ok:false,code:typeof data?.code==='string'?data.code:undefined};}
}));
