"""Actual LiveKit microphone-to-STT worker; no production activation here.

Run only in an authorized server-side agent environment with explicit dispatch,
a verified private authorization/persistence gateway, and approved quotas.
There is intentionally no automatic dispatch, synthetic transcript, local
transcript file, browser API key, or LLM/TTS component.
"""
import asyncio
import logging
import os
import re
import time
import uuid
from urllib.parse import urlparse

import aiohttp
from livekit import rtc
from livekit.agents import AgentServer, AutoSubscribe, JobContext, cli, inference, stt
from caption_contract import (CaptureContext, TOPIC, authorized_recipients,
                              lease_deadline, track_scope, validate_final_text)

LOG = logging.getLogger("convay-caption-worker")
server = AgentServer()
MODEL = "speechmatics/linden-1"  # documented en and bn real-time STT


class TrustedGateway:
    def __init__(self, http):
        project = os.environ.get("CONVAY_SUPABASE_PROJECT_REF", "")
        if not re.fullmatch(r"[a-z0-9]{20}", project):
            raise RuntimeError("Authorized Convay project is not configured")
        self.url = f"https://{project}.supabase.co/functions/v1/convay-caption-control"
        self.token = os.environ.get("CONVAY_CAPTION_WORKER_TOKEN", "")
        if len(self.token) < 32:
            raise RuntimeError("Authorized caption worker is not configured")
        self.http = http

    async def request(self, action, context, track=None, **extra):
        body = context.body() | (track or {}) | extra | {"action": action}
        async with self.http.post(
            self.url, json=body,
            headers={"Authorization": "Bearer " + self.token},
            allow_redirects=False,
        ) as response:
            if response.status != 200:
                raise PermissionError("Caption gateway rejected operation")
            if response.content_length is not None and response.content_length > 32768:
                raise PermissionError("Invalid caption gateway response")
            return await response.json()

    async def authorize(self, context, track=None):
        result = await self.request("authorize", context, track)
        return lease_deadline(context, result, track)


@server.rtc_session(agent_name="convay-captions")
async def entrypoint(ctx: JobContext):
    # Reject automatic or malformed job metadata before joining a room.
    try:
        context = CaptureContext.from_dispatch(ctx.job.metadata, ctx.job.room.name, ctx.job.id)
    except (ValueError, TypeError, AttributeError):
        LOG.warning("Rejected invalid caption dispatch")
        return

    stop = asyncio.Event()
    tasks = set()
    tracks = {}
    pending = set()

    def supervise(coro):
        task = asyncio.create_task(coro)
        tasks.add(task)
        def finished(item):
            tasks.discard(item)
            if not item.cancelled() and item.exception() is not None:
                # Do not log provider payload, speech or gateway secrets.
                LOG.warning("Caption operation terminated")
        task.add_done_callback(finished)
        return task

    async with aiohttp.ClientSession(
        timeout=aiohttp.ClientTimeout(total=3), trust_env=False
    ) as http:
        gateway = TrustedGateway(http)
        try:
            await gateway.authorize(context)
        except Exception:
            LOG.warning("Caption room authorization denied")
            return

        async def subscribe_if_allowed(publication, participant):
            if publication.kind != rtc.TrackKind.KIND_AUDIO or publication.source != rtc.TrackSource.SOURCE_MICROPHONE:
                return
            sid = publication.sid
            if sid in pending or sid in tracks:
                return
            pending.add(sid)
            try:
                scope = track_scope(participant.identity, sid)
                await gateway.authorize(context, scope)
                if not stop.is_set():
                    publication.set_subscribed(True)
            except Exception:
                publication.set_subscribed(False)
            finally:
                pending.discard(sid)

        async def transcribe(track, publication, participant):
            scope = track_scope(participant.identity, publication.sid)
            # A subscription callback alone is not permission to process speech.
            deadline = await gateway.authorize(context, scope)
            audio = rtc.AudioStream(track, sample_rate=16000, num_channels=1)
            model = inference.STT(model=MODEL, language=context.language)
            try:
                async with model.stream() as speech:
                    async def feed_audio():
                        nonlocal deadline
                        try:
                            async for item in audio:
                                if stop.is_set():
                                    break
                                if time.monotonic() >= deadline - 0.75:
                                    deadline = await gateway.authorize(context, scope)
                                if time.monotonic() >= deadline:
                                    raise PermissionError("Caption authorization expired")
                                # Never push audio after current lease expires.
                                speech.push_frame(item.frame)
                        finally:
                            speech.end_input()

                    async def receive_final():
                        async for event in speech:
                            if stop.is_set():
                                return
                            if event.type != stt.SpeechEventType.FINAL_TRANSCRIPT or not event.alternatives:
                                continue
                            text = validate_final_text(event.alternatives[0].text)
                            segment_id = str(uuid.uuid4())
                            # Durable SQL acknowledgement must precede delivery.
                            # The gateway also rechecks current consent, track,
                            # session and the recipient list at append time.
                            result = await gateway.request(
                                "append-final", context, scope,
                                segmentId=segment_id, text=text,
                            )
                            recipients = authorized_recipients(context, scope, segment_id, result)
                            if recipients and not stop.is_set():
                                await ctx.room.local_participant.send_text(
                                    text, destination_identities=recipients, topic=TOPIC,
                                    attributes={
                                        "capture_id": context.capture_id,
                                        "session_id": context.session_id,
                                        "speaker_identity": scope["speakerIdentity"],
                                        "track_sid": scope["trackSid"],
                                        "segment_id": segment_id,
                                        "language": context.language,
                                        "final": "true",
                                    },
                                )
                    pump = asyncio.create_task(feed_audio())
                    consume = asyncio.create_task(receive_final())
                    try:
                        done, _ = await asyncio.wait((pump, consume), return_when=asyncio.FIRST_COMPLETED)
                        for item in done:
                            item.result()
                        if pump in done and not consume.done():
                            # Bounded drain of final provider events after track
                            # end; append still requires current authorization.
                            await asyncio.wait_for(consume, timeout=3)
                    finally:
                        for item in (pump, consume):
                            if not item.done():
                                item.cancel()
                        await asyncio.gather(pump, consume, return_exceptions=True)
            finally:
                await audio.aclose()
                await model.aclose()

        async def run_track(track, publication, participant):
            sid = publication.sid
            try:
                if publication.kind == rtc.TrackKind.KIND_AUDIO and publication.source == rtc.TrackSource.SOURCE_MICROPHONE:
                    await transcribe(track, publication, participant)
            finally:
                tracks.pop(sid, None)
                publication.set_subscribed(False)

        @ctx.room.on("track_published")
        def published(publication, participant):
            supervise(subscribe_if_allowed(publication, participant))

        @ctx.room.on("track_subscribed")
        def subscribed(track, publication, participant):
            if publication.sid not in tracks:
                tracks[publication.sid] = supervise(run_track(track, publication, participant))

        @ctx.room.on("track_unsubscribed")
        def unsubscribed(_track, publication, _participant):
            task = tracks.get(publication.sid)
            if task:
                task.cancel()

        @ctx.room.on("disconnected")
        def disconnected(*_args):
            stop.set()

        async def monitor_room():
            while not stop.is_set():
                try:
                    await gateway.authorize(context)
                except Exception:
                    stop.set()
                    return
                try:
                    await asyncio.wait_for(stop.wait(), timeout=2)
                except asyncio.TimeoutError:
                    pass

        try:
            # Do not subscribe to room audio automatically. Every microphone
            # publication requires its own current server authorization.
            await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_NONE)
            if ctx.room.name != context.room_name:
                raise PermissionError("Connected to a different caption room")
            for participant in ctx.room.remote_participants.values():
                for publication in participant.track_publications.values():
                    supervise(subscribe_if_allowed(publication, participant))
            supervise(monitor_room())
            await stop.wait()
        finally:
            stop.set()
            remaining = list(tasks)
            for task in remaining:
                task.cancel()
            await asyncio.gather(*remaining, return_exceptions=True)
            await ctx.room.disconnect()


if __name__ == "__main__":
    cli.run_app(server)
