import json
import tempfile
import unittest
import wave
import zipfile
from pathlib import Path

import audition


def wav_bytes():
    import io
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b"\x00\x00" * 160)
    return buf.getvalue()


class AuditionHarnessTests(unittest.TestCase):
    def make_root(self):
        td = tempfile.TemporaryDirectory()
        root = Path(td.name)
        archive_rel = "assets/phase1/audio/bundles/test-wav-v01.zip"
        internal = "assets/phase1/audio/test/test_event__v01.wav"
        archive = root / archive_rel
        archive.parent.mkdir(parents=True)
        payload = wav_bytes()
        with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_STORED) as zf:
            zf.writestr(internal, payload)
        manifest = {
            "events": [{
                "event_id": "test_event",
                "family": "test",
                "priority": "STANDARD",
                "loop": False,
                "assets": [{"archive": archive_rel, "internal_path": internal}],
            }]
        }
        manifest_path = root / "assets/phase1/audio/manifest.json"
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        return td, root, archive, internal, payload

    def test_prepare_extracts_byte_identical_and_indexes_manifest_asset(self):
        td, root, archive, internal, payload = self.make_root()
        self.addCleanup(td.cleanup)
        with tempfile.TemporaryDirectory(dir=audition.TOOL_DIR) as generated:
            source_before = archive.read_bytes()
            result = audition.prepare(root, Path(generated), exact=False)
            self.assertEqual(1, len(result["events"]))
            self.assertEqual("test_event", result["events"][0]["event_id"])
            extracted = Path(generated) / internal
            self.assertEqual(payload, extracted.read_bytes())
            self.assertEqual(source_before, archive.read_bytes())

    def test_missing_manifest_archive_fails(self):
        td, root, archive, _, _ = self.make_root()
        self.addCleanup(td.cleanup)
        archive.unlink()
        with tempfile.TemporaryDirectory(dir=audition.TOOL_DIR) as generated:
            with self.assertRaises(audition.HarnessError):
                audition.prepare(root, Path(generated), exact=False)

    def test_missing_internal_path_fails(self):
        td, root, _, _, _ = self.make_root()
        self.addCleanup(td.cleanup)
        manifest_path = root / "assets/phase1/audio/manifest.json"
        manifest = json.loads(manifest_path.read_text())
        manifest["events"][0]["assets"][0]["internal_path"] = "assets/phase1/audio/test/missing__v01.wav"
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        with tempfile.TemporaryDirectory(dir=audition.TOOL_DIR) as generated:
            with self.assertRaises(audition.HarnessError):
                audition.prepare(root, Path(generated), exact=False)

    def test_generated_path_rejects_traversal(self):
        with tempfile.TemporaryDirectory(dir=audition.TOOL_DIR) as generated:
            with self.assertRaises(audition.HarnessError):
                audition.safe_generated_path(Path(generated), "../escape.wav")

    def test_gate_assignment_comes_from_manifest_metadata(self):
        row = {"event_id": "predator_alert", "family": "hostile", "priority": "HIGH", "loop": False}
        self.assertIn("A", audition.gate_ids_for(row))
        loop_row = {"event_id": "amb_test", "family": "ambience", "priority": "BED", "loop": True}
        self.assertEqual({"D", "E"}, set(audition.gate_ids_for(loop_row)))


if __name__ == "__main__":
    unittest.main()
