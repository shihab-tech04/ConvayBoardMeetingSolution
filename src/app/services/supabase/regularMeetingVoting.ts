import {convayAuth} from './convayAuth';
import {parseRequest,projectReceipt,type Scope,type Command,type WorkspaceView,record,uuid} from '../../../../supabase/functions/convay-voting/contract';
export type {Scope,Command};
// A command ID is created once by the caller and retained in memory until
// its authoritative readback is known. Never persist ballot choice to storage.
export const newVotingRequestId=()=> 'vote_'+crypto.randomUUID().replace(/-/g,'');
export async function submitScopedVote(scope:Scope,command:Command,isCurrent:()=>boolean):Promise<Record<string,unknown>> {
 if(!isCurrent()||!parseRequest({...scope,command}))throw new Error('Voting scope changed or request invalid.');
 const res=await convayAuth.authenticatedRequest('/functions/v1/convay-voting',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...scope,command})});
 const result=projectReceipt(await res.json(),scope,command);
 if(!isCurrent()||!result)throw new Error('Voting response could not be verified for this session.');
 return result;
}
export async function castAndReadScopedVote(scope:Scope,command:Extract<Command,{action:'cast'}>,isCurrent:()=>boolean){
 await submitScopedVote(scope,command,isCurrent);
 const saved=await submitScopedVote(scope,{action:'read',roundId:command.roundId},isCurrent);
 if(saved.myRecorded!==true)throw new Error('Ballot not yet confirmed. Retry the same request.');
 return saved;
}

export type VotingDiscovery={kind:'legacy';meetingId:string;sessionId:string}|({kind:'company'}&WorkspaceView);
export async function discoverScopedVoting(meetingId:string,sessionId:string,isCurrent:()=>boolean):Promise<VotingDiscovery>{
 if(!isCurrent())throw new Error('Voting scope changed.');
 const res=await convayAuth.authenticatedRequest('/functions/v1/convay-voting',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({meetingId,sessionId,command:{action:'discover'}})});
 const raw:unknown=await res.json();
 if(!isCurrent()||!record(raw)||raw.meetingId!==meetingId||raw.sessionId!==sessionId)throw new Error('Voting scope could not be verified.');
 if(raw.kind==='legacy'&&!Object.prototype.hasOwnProperty.call(raw,'tenantId'))return {kind:'legacy',meetingId,sessionId};
 if(raw.kind==='company'&&uuid(raw.tenantId)){
  const projected=projectReceipt(raw,{tenantId:raw.tenantId,meetingId,sessionId},{action:'workspace'});
  if(projected)return {kind:'company',...projected} as VotingDiscovery;
 }
 throw new Error('Voting workspace unavailable.');
}
