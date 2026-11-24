"""Strict service-owned authorization contract for LM-05 caption processing.

No browser input authorizes capture. The worker must obtain current room,
track and recipient authorization from the trusted gateway before processing
or sending any speech. Missing or malformed responses fail closed.
"""
from dataclasses import dataclass
import json
import math
import re
import time

UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
ROOM = re.compile(r"^cv-room-[0-9a-f]{40}$")
SESSION = re.compile(r"^SES-[A-Za-z0-9_-]{1,176}$")
SPEAKER = re.compile(r"^cv-user-[0-9a-f]{40}$")
TRACK = re.compile(r"^TR_[A-Za-z0-9_-]{1,180}$")
JOB = re.compile(r"^[A-Za-z0-9_-]{1,180}$")
LANGUAGES = frozenset(("en", "bn"))
TOPIC = "convay.caption.v1"


@dataclass(frozen=True)
class CaptureContext:
    capture_id: str
    room_name: str
    session_id: str
    language: str
    job_id: str

    @classmethod
    def from_dispatch(cls, raw: str, room_name: str, job_id: str):
        try:
            data = json.loads(raw)
        except (ValueError, TypeError):
            raise ValueError("Invalid explicit caption dispatch") from None
        if not isinstance(data, dict) or set(data) != {
            "captureId", "roomName", "sessionId", "language"
        }:
            raise ValueError("Invalid caption dispatch fields")
        fields = [data[key] for key in ("captureId", "roomName", "sessionId", "language")]
        if not all(isinstance(v, str) for v in fields):
            raise ValueError("Invalid caption dispatch identity")
        capture, room, session, language = fields
        if not (UUID.fullmatch(capture) and ROOM.fullmatch(room)
                and room == room_name and SESSION.fullmatch(session)
                and language in LANGUAGES and JOB.fullmatch(job_id)):
            raise ValueError("Caption dispatch does not match assigned room")
        return cls(capture, room, session, language, job_id)

    def body(self):
        return {"captureId": self.capture_id, "roomName": self.room_name,
                "sessionId": self.session_id, "language": self.language,
                "jobId": self.job_id}


def track_scope(identity, track_sid):
    if not isinstance(identity, str) or not SPEAKER.fullmatch(identity):
        raise ValueError("Unknown caption speaker")
    if not isinstance(track_sid, str) or not TRACK.fullmatch(track_sid):
        raise ValueError("Unknown audio track")
    return {"speakerIdentity": identity, "trackSid": track_sid}


def validate_scope(context, response, track=None):
    if not isinstance(response, dict) or response.get("allowed") is not True:
        raise PermissionError("Caption authorization denied")
    expected = context.body() | (track or {})
    if any(response.get(key) != value for key, value in expected.items()):
        raise PermissionError("Caption authorization scope mismatch")


def lease_deadline(context, response, track=None, now=None):
    validate_scope(context, response, track)
    seconds = response.get("leaseSeconds")
    if type(seconds) not in (float, int) or not math.isfinite(seconds) or not 0 < seconds <= 5:
        raise PermissionError("Invalid caption authorization lease")
    return (time.monotonic() if now is None else now) + seconds


def validate_final_text(text):
    if not isinstance(text, str) or not text.strip() or len(text.encode("utf-8")) > 8192:
        raise ValueError("Invalid final transcript segment")
    return text.strip()


def authorized_recipients(context, track, segment_id, response):
    validate_scope(context, response, track)
    if response.get("persisted") is not True or response.get("segmentId") != segment_id:
        raise PermissionError("Transcript persistence has not been acknowledged")
    identities = response.get("recipientIdentities")
    if not isinstance(identities, list) or len(identities) > 4 or any(
        not isinstance(identity, str) or not SPEAKER.fullmatch(identity)
        for identity in identities
    ):
        raise PermissionError("Invalid caption delivery recipients")
    # Empty means NO delivery, never a broadcast.
    return list(dict.fromkeys(identities))
