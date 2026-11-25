import {parseRequest,projectReceipt,verifiedSession,record} from './contract.ts';
export type Dependencies={enabled:boolean;verifyUser:(jwt:string)=>Promise<string|null>;safeBallotLogging?:()=>Promise<boolean>;rpc:(args:Record<string,unknown>)=>Promise<{ok:boolean;code?:string;data?:unknown}>};
const origins=new Set(['https://shihab-tech04.github.io','http://localhost:5173','http://127.0.0.1:5173']);
export function votingHandler(deps:Dependencies) {
 return async (req:Request):Promise<Response>=>{
  const headers=new Headers({'Content-Type':'application/json','Cache-Control':'no-store',Vary:'Origin','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info'});
  const origin=req.headers.get('Origin');if(origin&&origins.has(origin))headers.set('Access-Control-Allow-Origin',origin);
  const fail=(status:number,error:string)=>new Response(JSON.stringify({error}),{status,headers});
  if(origin&&!origins.has(origin))return fail(403,'Origin not allowed.');
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return fail(405,'Method not allowed.');
  if(!deps.enabled)return fail(503,'Transactional voting is not activated.');
  const auth=req.headers.get('Authorization')??'';
  if(!auth.startsWith('Bearer '))return fail(401,'Sign in again.');
  try {
   const jwt=auth.slice(7).trim();const actor=await deps.verifyUser(jwt);
   const session=actor&&verifiedSession(jwt,actor);if(!actor||!session)return fail(401,'Sign in again.');
   const body=await req.text();if(body.length>65536)return fail(413,'Voting request too large.');
   let raw:unknown;try{raw=JSON.parse(body)}catch{return fail(400,'Invalid voting request.');}
   const parsed=parseRequest(raw);if(!parsed)return fail(400,'Invalid voting request.');
   const {scope,command}=parsed;
   if(command.action==='cast' && (!deps.safeBallotLogging || !await deps.safeBallotLogging()))return fail(503,'Voting privacy verification is unavailable.');
   const result=await deps.rpc({p_actor_id:actor,p_auth_session_id:session,p_tenant_id:scope.tenantId,p_meeting_id:scope.meetingId,p_session_id:scope.sessionId,p_command:command});
   if(!result.ok){if(result.code==='42501')return fail(403,'Voting permission denied.');if(['23505','23514','40001'].includes(result.code??''))return fail(409,'Voting state changed. Refresh before retrying.');if(['22023','22P02'].includes(result.code??''))return fail(400,'Invalid voting request.');return fail(503,'Voting could not be confirmed.');}
   const receipt=projectReceipt(result.data,scope,command);if(!receipt||!record(receipt))return fail(502,'Voting receipt could not be verified.');
   return new Response(JSON.stringify(receipt),{status:200,headers});
  } catch {return fail(503,'Voting could not be confirmed.');}
 };
}
