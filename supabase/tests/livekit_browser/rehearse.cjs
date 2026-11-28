/* Real loopback LiveKit transport and actual Convay media component, not hosted UAT. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const tools = process.env.MEDIA_TOOLS_DIR;
assert(tools, 'Disposable tools directory required');
const { chromium } = require(path.join(tools,'node_modules/playwright'));
const { AccessToken, RoomServiceClient } = require(path.join(tools,'node_modules/livekit-server-sdk'));
const sdk = fs.readFileSync(path.join(tools,'node_modules/livekit-client/dist/livekit-client.umd.min.js'));
const URL='http://127.0.0.1:5173/supabase/tests/livekit_browser/fixture.html';
const serverUrl='ws://127.0.0.1:7880';
const service=new RoomServiceClient('http://127.0.0.1:7880','devkey','secret');
const room='convay-isolated-media-'+process.pid;
const sdkUrl='https://cdn.jsdelivr.net/npm/livekit-client@2.23.0/dist/livekit-client.umd.min.js';
const wait=async (test,label,ms=30000)=>{const until=Date.now()+ms;while(Date.now()<until){if(await test())return;await new Promise(r=>setTimeout(r,300));}throw Error(label);};
async function token(identity){const t=new AccessToken('devkey','secret',{identity,name:identity,ttl:300});t.addGrant({roomJoin:true,room,canPublish:true,canSubscribe:true,canPublishData:false,roomAdmin:false});return await t.toJwt();}
async function pageFor(browser,identity){
  const context=await browser.newContext({permissions:['camera','microphone']});
  // Observe real peer connections; no mock transport or fake provider success.
  await context.addInitScript(({token,serverUrl})=>{
    window.__convayMediaTest={token,serverUrl};window.__realPeers=[];
    const Native=window.RTCPeerConnection;
    window.RTCPeerConnection=new Proxy(Native,{construct(target,args,newTarget){const pc=Reflect.construct(target,args,newTarget);window.__realPeers.push(pc);return pc;}});
  },{token:await token(identity),serverUrl});
  await context.route('**/*',async route=>{const u=route.request().url();if(u===sdkUrl)return route.fulfill({status:200,contentType:'application/javascript',body:sdk});if(u.startsWith('http://127.0.0.1:5173/'))return route.continue();return route.abort();});
  const page=await context.newPage();await page.goto(URL);await wait(async()=>await page.getByTestId('presence').textContent()===identity,'Provider connection not confirmed: '+identity);
  return {page,context,identity};
}
async function peers(){return await service.listParticipants(room);}
async function tracks(identity){return (await peers()).find(p=>p.identity===identity)?.tracks??[];}
async function bytes(page,kind){return page.evaluate(async kind=>{let bytes=0;for(const pc of window.__realPeers){if(pc.connectionState==='closed')continue;for(const s of (await pc.getStats()).values())if(s.type==='inbound-rtp'&&(s.kind??s.mediaType)===kind)bytes+=s.bytesReceived??0;}return bytes;},kind);}
function tile(page,identity){return page.getByRole('article',{name:identity+' connected'}).locator('video');}
async function remoteFrames(page,identity){return tile(page,identity).evaluateAll(videos=>videos.some(v=>v.videoWidth>0&&v.readyState>=2&&v.getVideoPlaybackQuality().totalVideoFrames>0));}
async function remoteTrack(page,identity){return tile(page,identity).evaluateAll(videos=>videos[0]?.srcObject?.getVideoTracks()[0]?.id??null);}
async function main(){
  await service.createRoom({name:room,maxParticipants:4,emptyTimeout:30});
  const browser=await chromium.launch({headless:false,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required','--auto-select-desktop-capture-source=Entire screen','--enable-usermedia-screen-capturing']});
  try{
    const a=await pageFor(browser,'convay-test-a');const b=await pageFor(browser,'convay-test-b');
    await wait(async()=> (await peers()).length===2,'Two distinct provider participants required');
    assert.equal((await tracks(a.identity)).length,0);assert.equal((await tracks(b.identity)).length,0);
    console.log('REAL_PROVIDER_DEVICE_OPTIONAL_PASS');
    for(const peer of [a,b]){await peer.page.getByRole('button',{name:'Toggle microphone'}).click();await peer.page.getByRole('button',{name:'Toggle camera'}).click();}
    for(const [receiver,sender] of [[a,b],[b,a]]){
      await wait(async()=>await remoteFrames(receiver.page,sender.identity),'Decoded remote camera frames missing');
      await wait(async()=>await bytes(receiver.page,'audio')>1000&&await bytes(receiver.page,'video')>1000,'Actual inbound audio/video RTP missing');
      const first=await bytes(receiver.page,'audio');await wait(async()=>await bytes(receiver.page,'audio')>first,'Remote audio RTP stopped');
    }
    console.log('REAL_PROVIDER_TWO_WAY_AUDIO_VIDEO_PASS');
    // An unrelated camera event and layout change must not replace live audio.
    const audio=a.page.locator('audio');await audio.waitFor({state:'attached'});assert.equal(await audio.count(),1);
    await audio.evaluate(el=>{el.dataset.mediaRehearsal='original';});
    await b.page.getByRole('button',{name:'Toggle camera'}).click();
    await wait(async()=>!(await tracks(b.identity)).some(t=>Number(t.source)===1&&!t.muted),'Camera not disabled');
    await a.page.getByRole('button',{name:'Toggle layout'}).click();await a.page.getByRole('region',{name:'Live speaker layout'}).waitFor();
    assert.equal(await audio.count(),1);assert.equal(await audio.getAttribute('data-media-rehearsal'),'original','Unchanged incoming audio was replaced');
    await a.page.getByRole('button',{name:'Toggle layout'}).click();await a.page.getByRole('region',{name:'Live gallery layout'}).waitFor();
    await b.page.getByRole('button',{name:'Toggle camera'}).click();
    await wait(async()=>await remoteFrames(a.page,b.identity),'Remote camera did not recover');
    console.log('REAL_PROVIDER_AUDIO_CONTINUITY_PASS');
    // Actual Chromium desktop picker in disposable Xvfb display.
    const cameraTrack=await remoteTrack(b.page,a.identity);assert(cameraTrack);
    await a.page.bringToFront();await a.page.getByRole('button',{name:'Toggle screen sharing'}).click();
    await wait(async()=>await a.page.getByTestId('share-confirmation').textContent()==='confirmed','Screen share not confirmed',45000);
    await wait(async()=>(await tracks(a.identity)).some(t=>Number(t.source)===3),'Provider screen-share publication missing');
    await wait(async()=>{const id=await remoteTrack(b.page,a.identity);return !!id&&id!==cameraTrack&&await remoteFrames(b.page,a.identity);},'Remote screen-share track not decoded');
    const videoBefore=await bytes(b.page,'video');await wait(async()=>await bytes(b.page,'video')>videoBefore,'Remote share RTP stopped');
    await a.page.getByRole('button',{name:'Toggle screen sharing'}).click();await wait(async()=>!(await tracks(a.identity)).some(t=>Number(t.source)===3),'Provider screen-share remained published');
    await wait(async()=>await a.page.getByTestId('share-confirmation').textContent()==='off','Screen-share indicator not cleared');
    console.log('REAL_PROVIDER_SCREEN_SHARE_START_STOP_PASS');
    await service.removeParticipant(room,b.identity);
    await wait(async()=>await b.page.getByTestId('presence').textContent()==='disconnected','Provider removal not reflected by component');
    await wait(async()=>!(await peers()).some(p=>p.identity===b.identity),'Removed identity remains in provider room');
    await wait(async()=>await a.page.getByRole('article',{name:b.identity+' connected'}).count()===0,'Removed participant still visible');
    await b.context.close();const recovered=await pageFor(browser,b.identity);
    await wait(async()=>(await peers()).some(p=>p.identity===recovered.identity),'New real provider session failed');
    console.log('REAL_PROVIDER_REMOVAL_AND_NEW_CONNECTION_PASS');
    // Provider termination, not Convay authenticated meeting-close RPC.
    await service.deleteRoom(room);for(const p of [a,recovered])await wait(async()=>await p.page.getByTestId('presence').textContent()==='disconnected','Provider close not reflected');
    console.log('REAL_PROVIDER_ROOM_CLOSURE_PASS');
  }finally{await browser.close();await service.deleteRoom(room).catch(()=>{});}
}
main().catch(err=>{console.error(err.message);process.exitCode=1;});
