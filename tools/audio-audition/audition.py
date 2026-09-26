#!/usr/bin/env python3
"""Offline, manifest-driven audition harness for P1-AUD-002 PR #95."""
from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import re
import shutil
import sys
import threading
import webbrowser
import zipfile
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlparse

EXPECTED_AUDIO_HEAD = "fc9e838589b43d103e26e772dea7bb4dc59f2b89"
EXPECTED_MANIFEST_BLOB = "089e8822bc2f7827a26b489d27a80867061dd9f1"
EXPECTED_ARCHIVE_BLOBS = {
    "assets/phase1/audio/bundles/ambience-wav-v01.zip": "98c32a9a9344ed36fd9a5bdb99f0a9c2a1746f3f",
    "assets/phase1/audio/bundles/crafting-wav-v01.zip": "88ffb6a43ea36215621572cf382eae37b78401f0",
    "assets/phase1/audio/bundles/hostile-wav-v01.zip": "74335cdb070c5d4ecfce71db30727eedb5f4c82c",
    "assets/phase1/audio/bundles/interactions-wav-v01.zip": "f467bd38f9442bb158a51bebdff2694301b58474",
    "assets/phase1/audio/bundles/machines-wav-v01.zip": "8e5b1575d855b74c4d62f71b047cb3a53ada3935",
    "assets/phase1/audio/bundles/music-wav-v01.zip": "840dcf60c4216666824891706d1fd60c48f87b16",
    "assets/phase1/audio/bundles/progression-wav-v01.zip": "5e9c17f2ac1a013ddd5502a628f1b20bcb7c5bf1",
    "assets/phase1/audio/bundles/ruin-wav-v01.zip": "dfc7872ee40a605eb2feaa6388b83fbbd9e9c371",
    "assets/phase1/audio/bundles/survival-wav-v01.zip": "f3ed0574c3191db61b2c429e7b39d26df5b86c14",
    "assets/phase1/audio/bundles/ui-wav-v01.zip": "69f58f34db15483c255ecd9462977abba9a392a7",
    "assets/phase1/audio/bundles/weather-wav-v01.zip": "477ee9da5a1e4a1a925e44ffa57f15473c4842e1",
    "assets/phase1/audio/bundles/wildlife-wav-v01.zip": "18368a8900bd0c247fc30ad5593cdcae39607104",
}

TOOL_DIR = Path(__file__).resolve().parent
DEFAULT_GENERATED = TOOL_DIR / ".generated" / "current"
VARIANT_RE = re.compile(r"__(?:loop__)?(v\d+)\.wav$", re.IGNORECASE)


class HarnessError(RuntimeError):
    pass


def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def source_path(audio_root: Path, repo_relative: str) -> Path:
    root = audio_root.resolve()
    candidate = (root / PurePosixPath(repo_relative)).resolve()
    if candidate != root and root not in candidate.parents:
        raise HarnessError(f"Path escapes audio root: {repo_relative}")
    return candidate


def safe_generated_path(generated_root: Path, internal_path: str) -> Path:
    posix = PurePosixPath(internal_path)
    if posix.is_absolute() or ".." in posix.parts:
        raise HarnessError(f"Unsafe ZIP internal path: {internal_path}")
    root = generated_root.resolve()
    candidate = (root / Path(*posix.parts)).resolve()
    if candidate != root and root not in candidate.parents:
        raise HarnessError(f"Generated path escapes local directory: {internal_path}")
    return candidate


def load_manifest(audio_root: Path, exact: bool = True) -> tuple[dict, bytes]:
    path = source_path(audio_root, "assets/phase1/audio/manifest.json")
    if not path.is_file():
        raise HarnessError(f"Missing required manifest: {path}")
    raw = path.read_bytes()
    if exact and git_blob_sha(raw) != EXPECTED_MANIFEST_BLOB:
        raise HarnessError(
            "manifest.json is not the exact PR #95 manifest. "
            f"Expected audio head {EXPECTED_AUDIO_HEAD}."
        )
    try:
        manifest = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HarnessError(f"Cannot parse manifest.json: {exc}") from exc
    if not isinstance(manifest.get("events"), list):
        raise HarnessError("manifest.json must contain an events array")
    return manifest, raw


def collect_assets(manifest: dict) -> list[dict]:
    rows = []
    for event in manifest["events"]:
        for asset in event.get("assets", []):
            internal_path = asset.get("internal_path")
            archive = asset.get("archive")
            if not isinstance(internal_path, str) or not internal_path.lower().endswith(".wav"):
                raise HarnessError(f"Event {event.get('event_id')} has invalid internal WAV path")
            if not isinstance(archive, str) or not archive.lower().endswith(".zip"):
                raise HarnessError(f"Event {event.get('event_id')} has invalid archive path")
            match = VARIANT_RE.search(internal_path)
            rows.append({
                "event_id": event.get("event_id"),
                "family": event.get("family"),
                "priority": event.get("priority"),
                "loop": bool(event.get("loop")),
                "variant": match.group(1).lower() if match else "variant-from-path",
                "archive": archive,
                "internal_path": internal_path,
                "duration_seconds": asset.get("duration_seconds"),
                "sample_rate_hz": asset.get("sample_rate_hz"),
                "channels": asset.get("channels"),
                "sample_format": asset.get("sample_format"),
            })
    if not rows:
        raise HarnessError("Manifest contains no WAV assets")
    return rows


def fingerprint_sources(audio_root: Path, archives: set[str], exact: bool = True) -> dict:
    info = {}
    for archive in sorted(archives):
        path = source_path(audio_root, archive)
        if not path.is_file():
            raise HarnessError(f"Referenced archive does not exist: {path}")
        raw = path.read_bytes()
        blob = git_blob_sha(raw)
        if exact:
            expected = EXPECTED_ARCHIVE_BLOBS.get(archive)
            if expected is None:
                raise HarnessError(f"Unexpected archive for exact PR #95: {archive}")
            if blob != expected:
                raise HarnessError(
                    f"Archive differs from PR #95: {archive}. "
                    f"Expected Git blob {expected}, got {blob}."
                )
        info[archive] = {"git_blob": blob, "sha256": sha256_bytes(raw), "bytes": len(raw)}
    if exact and set(archives) != set(EXPECTED_ARCHIVE_BLOBS):
        missing = sorted(set(EXPECTED_ARCHIVE_BLOBS) - set(archives))
        extra = sorted(set(archives) - set(EXPECTED_ARCHIVE_BLOBS))
        raise HarnessError(f"Exact PR #95 archive set mismatch; missing={missing}, extra={extra}")
    return info


def gate_ids_for(row: dict) -> list[str]:
    event_id, family, priority = str(row["event_id"]), str(row["family"]), str(row["priority"])
    gates = []
    if event_id in {
        "predator_alert", "predator_chase", "predator_attack_windup",
        "predator_attack_release", "predator_recovery",
    }:
        gates.append("A")
    if family == "survival" and (priority in {"HIGH", "CRITICAL"} or "warning" in event_id):
        gates.append("B")
    if "cold_rain" in event_id:
        gates.append("C")
    if row["loop"]:
        gates.append("D")
    if family in {"ambience", "music"} or priority == "CRITICAL":
        gates.append("E")
    if family == "ruin" or "ancient_alloy_shard" in event_id:
        gates.append("F")
    return gates


def prepare(audio_root: Path, generated_root: Path = DEFAULT_GENERATED, exact: bool = True) -> dict:
    audio_root = audio_root.resolve()
    manifest, manifest_raw = load_manifest(audio_root, exact=exact)
    rows = collect_assets(manifest)
    archives = {row["archive"] for row in rows}
    before = fingerprint_sources(audio_root, archives, exact=exact)

    generated_root = generated_root.resolve()
    tool_root = TOOL_DIR.resolve()
    if generated_root != tool_root and tool_root not in generated_root.parents:
        raise HarnessError("Generated directory must remain inside tools/audio-audition/**")
    if generated_root.exists():
        shutil.rmtree(generated_root)
    generated_root.mkdir(parents=True, exist_ok=True)

    handles = {}
    try:
        for archive in sorted(archives):
            handles[archive] = zipfile.ZipFile(source_path(audio_root, archive), "r")

        generated_assets = []
        for row in rows:
            zf = handles[row["archive"]]
            try:
                info = zf.getinfo(row["internal_path"])
            except KeyError as exc:
                raise HarnessError(
                    f"Manifest-listed WAV missing from {row['archive']}: {row['internal_path']}"
                ) from exc
            if info.is_dir():
                raise HarnessError(f"Manifest-listed WAV resolves to directory: {row['internal_path']}")
            data = zf.read(info)
            if len(data) < 12 or data[:4] != b"RIFF" or data[8:12] != b"WAVE":
                raise HarnessError(f"Extracted asset is not RIFF/WAVE: {row['internal_path']}")
            out = safe_generated_path(generated_root, row["internal_path"])
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_bytes(data)
            if out.read_bytes() != data:
                raise HarnessError(f"Generated WAV byte mismatch: {row['internal_path']}")
            generated_assets.append({
                **row,
                "gates": gate_ids_for(row),
                "audio_url": "/generated/" + "/".join(PurePosixPath(row["internal_path"]).parts),
                "sha256": sha256_bytes(data),
                "bytes": len(data),
            })
    finally:
        for handle in handles.values():
            handle.close()

    after = fingerprint_sources(audio_root, archives, exact=exact)
    if before != after:
        raise HarnessError("Source ZIP bytes changed during extraction; refusing result")

    index = {
        "schema_version": 1,
        "task": "#119 / P1-DEVOPS-003",
        "audio_source": {
            "task": "#80 / P1-AUD-002",
            "pull_request": "#95",
            "expected_head": EXPECTED_AUDIO_HEAD,
            "manifest_git_blob": git_blob_sha(manifest_raw),
            "root": str(audio_root),
            "archive_fingerprints": before,
        },
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "generated_root": str(generated_root),
        "events": generated_assets,
    }
    (generated_root / "index.json").write_text(json.dumps(index, indent=2), encoding="utf-8")
    return index


class HarnessHandler(SimpleHTTPRequestHandler):
    server_version = "ProZ0AudioAudition/1.0"

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/index":
            self._send_file(Path(self.server.generated_root, "index.json"), "application/json; charset=utf-8")
            return
        if parsed.path.startswith("/generated/"):
            try:
                target = safe_generated_path(
                    Path(self.server.generated_root), unquote(parsed.path[len("/generated/"):])
                )
            except HarnessError:
                self.send_error(HTTPStatus.BAD_REQUEST)
                return
            self._send_file(target)
            return
        if parsed.path in {"/", "/index.html"}:
            self._send_file(TOOL_DIR / "index.html")
            return
        if parsed.path in {"/app.js", "/style.css"}:
            self._send_file(TOOL_DIR / parsed.path.lstrip("/"))
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def _send_file(self, target: Path, mime: str | None = None):
        if not target.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        data = target.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", mime or mimetypes.guess_type(str(target))[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt: str, *args):
        sys.stderr.write("[audio-audition] " + fmt % args + "\n")


def serve(index: dict, generated_root: Path, host: str, port: int, open_browser: bool) -> None:
    httpd = ThreadingHTTPServer((host, port), HarnessHandler)
    httpd.generated_root = str(generated_root.resolve())
    url = f"http://{host}:{httpd.server_address[1]}/"
    print(f"Validated exact PR #95 pack: {len(index['events'])} WAV assets")
    print(f"Audition UI: {url}")
    print("This tool does not claim listening occurred. Human review is still required.")
    if open_browser:
        threading.Timer(0.35, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        httpd.server_close()


def clean_generated() -> None:
    root = TOOL_DIR / ".generated"
    if root.exists():
        shutil.rmtree(root)
    print(f"Removed generated review files: {root}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Validate, extract and locally audition exact P1-AUD-002 PR #95 audio."
    )
    parser.add_argument("--audio-root", type=Path, help="Root containing assets/phase1/audio/manifest.json")
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--clean", action="store_true")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-open", action="store_true")
    args = parser.parse_args(argv)

    if args.clean:
        clean_generated()
        return 0
    if not args.audio_root:
        parser.error(
            "--audio-root is required. Point at the exact PR #95 audio pack from head "
            f"{EXPECTED_AUDIO_HEAD}; current main is never used implicitly."
        )
    try:
        index = prepare(args.audio_root, DEFAULT_GENERATED, exact=True)
    except (HarnessError, OSError, zipfile.BadZipFile) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    print(
        f"PASS: manifest parsed; {len(index['events'])} WAV assets extracted byte-for-byte; "
        f"{len(index['audio_source']['archive_fingerprints'])} archives verified."
    )
    if args.validate_only:
        return 0
    serve(index, DEFAULT_GENERATED, args.host, args.port, open_browser=not args.no_open)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
