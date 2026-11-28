import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LiveMeetingMedia } from '../../../src/app/pages/meetings/LiveMeetingMedia';
const test = (window as any).__convayMediaTest;
if (!test || location.hostname !== '127.0.0.1' || test.serverUrl !== 'ws://127.0.0.1:7880') throw new Error('Local media fixture only');
function Fixture() {
  const [mic, setMic] = useState(false), [cam, setCam] = useState(false), [share, setShare] = useState(false);
  const [confirmed, setConfirmed] = useState(false), [presence, setPresence] = useState('disconnected');
  const [layout, setLayout] = useState<'gallery'|'speaker'>('gallery');
  return <main style={{height:'95vh',display:'flex',flexDirection:'column'}}>
    <div><button onClick={()=>setMic(v=>!v)}>Toggle microphone</button><button onClick={()=>setCam(v=>!v)}>Toggle camera</button>
    <button onClick={()=>setShare(v=>!v)}>Toggle screen sharing</button><button onClick={()=>setLayout(v=>v==='gallery'?'speaker':'gallery')}>Toggle layout</button></div>
    <output data-testid="presence">{presence}</output><output data-testid="share-confirmation">{confirmed?'confirmed':'off'}</output>
    <LiveMeetingMedia meetingId="LOCAL-MEDIA" expectedSessionId="LOCAL-SESSION" micOn={mic} camOn={cam} sharing={share}
      onMicChange={setMic} onCamChange={setCam} onSharingChange={v=>{setConfirmed(v);setShare(v);}}
      onPresence={(connected,identity)=>setPresence(connected?String(identity):'disconnected')}
      requestAdmission={async()=>new Response(JSON.stringify({serverUrl:test.serverUrl,participantToken:test.token,sessionId:'LOCAL-SESSION'}),{status:200})} layout={layout}/>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
