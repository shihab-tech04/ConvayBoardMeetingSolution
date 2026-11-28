import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {discoverScopedVoting,submitScopedVote,type VotingDiscovery} from '../../services/supabase/regularMeetingVoting';
import {confirmsVotingMutation,type WorkspaceView,type VotingMutation} from '../../../../supabase/functions/convay-voting/contract';
export type {VotingMutation} from '../../../../supabase/functions/convay-voting/contract';
export function useRegularMeetingVoting(enabled:boolean,meetingId:string,sessionId:string,actorId:string,accessKey:string){
 const epoch=useMemo(()=>({enabled,meetingId,sessionId,actorId,accessKey}),[enabled,meetingId,sessionId,actorId,accessKey]);
 const current=useRef<typeof epoch|null>(epoch);current.current=epoch;
 useEffect(()=>{current.current=epoch;return()=>{if(current.current===epoch)current.current=null;};},[epoch]);
 const sequence=useRef(0);const inFlight=useRef<object|null>(null);
 const [saved,setSaved]=useState<{epoch:typeof epoch;data:VotingDiscovery|null;error:string|null}>({epoch,data:null,error:null});
 const [pending,setPending]=useState<{epoch:typeof epoch;command:VotingMutation}|null>(null);
 const [busy,setBusy]=useState<object|null>(null);
 const data=saved.epoch===epoch?saved.data:null;
 const error=saved.epoch===epoch?saved.error:null;
 const unresolved=pending?.epoch===epoch?pending.command:null;
 useEffect(()=>{setPending(previous=>previous?.epoch===epoch?previous:null);},[epoch]);
 const isCurrent=useCallback(()=>current.current===epoch,[epoch]);
 const refresh=useCallback(async()=>{
   if(!enabled||!meetingId||!sessionId||!actorId||!isCurrent())return null;
   const id=++sequence.current;
   try{const result=await discoverScopedVoting(meetingId,sessionId,isCurrent);if(!isCurrent()||id!==sequence.current)return null;setSaved({epoch,data:result,error:null});return result;}
   catch{if(isCurrent()&&id===sequence.current)setSaved({epoch,data:null,error:'Voting could not be verified. Refresh before continuing.'});return null;}
 },[enabled,meetingId,sessionId,actorId,isCurrent,epoch]);
 useEffect(()=>{if(!enabled||!sessionId||!actorId)return;let stopped=false;const tick=async()=>{if(!stopped&&!inFlight.current)await refresh();};void tick();const interval=setInterval(()=>void tick(),4000);return()=>{stopped=true;clearInterval(interval);};},[enabled,sessionId,actorId,refresh]);
 const execute=useCallback(async(command:VotingMutation)=>{
   if(!isCurrent()||data?.kind!=='company'||inFlight.current|| (unresolved&&JSON.stringify(unresolved)!==JSON.stringify(command)))return false;
   const token={};inFlight.current=token;setBusy(epoch);setPending({epoch,command});
   // Invalidate any poll that began before this command. No optimistic tally.
   ++sequence.current;
   const scope={tenantId:data.tenantId,meetingId:data.meetingId,sessionId:data.sessionId};
   try{
     const receipt=await submitScopedVote(scope,command,isCurrent);
     const next=await refresh();
     if(!isCurrent()||next?.kind!=='company'||!confirmsVotingMutation(scope,actorId,command,receipt,next))throw Error('Readback mismatch');
     setPending(null);return true;
   }catch{if(isCurrent())setSaved(prev=>({epoch,data:prev.epoch===epoch?prev.data:null,error:'The command is not confirmed. Retry the same request or refresh.'}));return false;}
   finally{if(inFlight.current===token)inFlight.current=null;if(isCurrent())setBusy(null);}
 },[isCurrent,data,unresolved,epoch,refresh,actorId]);
 return {mode:!enabled||data?.kind==='legacy'?'legacy':data?.kind==='company'?'company':'pending',workspace:data?.kind==='company'?data as WorkspaceView:null,error,busy:busy===epoch,pending:unresolved,refresh,execute} as const;
}
export type RegularMeetingVoting=ReturnType<typeof useRegularMeetingVoting>;
