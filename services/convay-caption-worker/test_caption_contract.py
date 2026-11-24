import json
import unittest
from caption_contract import (CaptureContext, authorized_recipients, lease_deadline,
                              track_scope, validate_final_text)

ROOM = "cv-room-" + "a" * 40
ACTOR = "cv-user-" + "b" * 40
CAPTURE = "11111111-1111-4111-8111-111111111111"
SEGMENT = "22222222-2222-4222-8222-222222222222"
META = {"captureId": CAPTURE, "roomName": ROOM, "sessionId": "SES-1-R2", "language": "bn"}
CTX = CaptureContext.from_dispatch(json.dumps(META), ROOM, "AJ_test")
TRACK = track_scope(ACTOR, "TR_mic")
ACK = CTX.body() | TRACK | {"allowed": True, "persisted": True,
                           "segmentId": SEGMENT, "recipientIdentities": [ACTOR]}


class CaptionContractTest(unittest.TestCase):
    def test_dispatch_requires_exact_assigned_room_and_supported_language(self):
        self.assertEqual(CTX.language, "bn")
        with self.assertRaises(ValueError):
            CaptureContext.from_dispatch(json.dumps(META), "cv-room-"+"c"*40, "AJ_test")
        with self.assertRaises(ValueError):
            CaptureContext.from_dispatch(json.dumps(META | {"language": "unsupported"}), ROOM, "AJ_test")
        with self.assertRaises(ValueError):
            CaptureContext.from_dispatch("", ROOM, "AJ_test")

    def test_lease_is_short_and_current_track_bound(self):
        self.assertEqual(lease_deadline(CTX, ACK | {"leaseSeconds": 4}, TRACK, now=100), 104)
        for invalid in (True, 0, -1, 6, float("inf"), "4"):
            with self.assertRaises(PermissionError):
                lease_deadline(CTX, ACK | {"leaseSeconds": invalid}, TRACK)
        with self.assertRaises(PermissionError):
            lease_deadline(CTX, ACK | {"leaseSeconds": 4, "sessionId": "SES-1"}, TRACK)

    def test_no_anonymous_or_forged_track_identity(self):
        with self.assertRaises(ValueError):
            track_scope("Guest", "TR_mic")
        with self.assertRaises(ValueError):
            track_scope(ACTOR, "../../foreign")

    def test_delivery_requires_sql_receipt_and_explicit_recipient_allowlist(self):
        self.assertEqual(authorized_recipients(CTX, TRACK, SEGMENT, ACK), [ACTOR])
        self.assertEqual(authorized_recipients(CTX, TRACK, SEGMENT, ACK | {"recipientIdentities": []}), [])
        self.assertEqual(authorized_recipients(CTX, TRACK, SEGMENT, ACK | {"recipientIdentities": [ACTOR, ACTOR]}), [ACTOR])
        for wrong in ({"persisted": False}, {"allowed": False}, {"roomName": "other"},
                      {"segmentId": CAPTURE}, {"recipientIdentities": ["all"]},
                      {"recipientIdentities": [ACTOR] * 5}):
            with self.assertRaises(PermissionError):
                authorized_recipients(CTX, TRACK, SEGMENT, ACK | wrong)

    def test_english_bengali_text_is_preserved_without_fabrication(self):
        self.assertEqual(validate_final_text("  সভা শুরু  "), "সভা শুরু")
        self.assertEqual(validate_final_text("Meeting started"), "Meeting started")
        for text in ("", " ", "x" * 8193, None):
            with self.assertRaises(ValueError):
                validate_final_text(text)


if __name__ == "__main__":
    unittest.main()
