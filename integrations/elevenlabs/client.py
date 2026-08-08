"""ElevenLabs integration: text-to-speech for the NOVA-7 game voice-over.

Wraps the official `elevenlabs` SDK. Lines are synthesised ahead of time into
audio files that ship with the game, so the browser never sees the API key and
the game still works offline.
"""

import os
from pathlib import Path
from typing import Iterable, Optional

# Voix par défaut : une voix française grave et posée pour le Dr Lenoir.
# Remplaçable par n'importe quel voice_id via --voice ou ELEVENLABS_VOICE_ID.
DEFAULT_VOICE_ID = "onwK4e9ZLuTAKqWW03F9"  # "Daniel" — grave, calme
DEFAULT_MODEL = "eleven_multilingual_v2"   # nécessaire pour un français correct
DEFAULT_FORMAT = "mp3_44100_128"


class ElevenLabsError(RuntimeError):
    """Raised when the API key is missing or a synthesis request fails."""


def _require_api_key(api_key: Optional[str]) -> str:
    key = api_key or os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        raise ElevenLabsError(
            "ELEVENLABS_API_KEY is not set. Add it to a .env file or export it "
            "in your shell. Get one at https://elevenlabs.io/app/settings/api-keys"
        )
    return key


def line_id(text: str) -> str:
    """Stable filename for a line of dialogue.

    FNV-1a over the UTF-8 bytes. Deliberately not hashlib: the browser has to
    compute the very same id synchronously to find the file (see the matching
    lineId() in game/js/audio.js), and crypto.subtle is async-only.
    """
    h = 0x811C9DC5
    for byte in text.strip().encode("utf-8"):
        h = ((h ^ byte) * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"


def _client(api_key: Optional[str]):
    try:
        from elevenlabs.client import ElevenLabs
    except ImportError as exc:  # pragma: no cover - dependency guard
        raise ElevenLabsError(
            "The `elevenlabs` package is missing. Run: pip install -r requirements.txt"
        ) from exc
    return ElevenLabs(api_key=_require_api_key(api_key))


def synthesize(
    text: str,
    output_dir: str = "./game/voices",
    voice_id: Optional[str] = None,
    model_id: str = DEFAULT_MODEL,
    api_key: Optional[str] = None,
    overwrite: bool = False,
) -> Path:
    """Synthesise one line and return the path to the written mp3.

    Existing files are reused unless `overwrite` is set, so re-running a batch
    only costs credits for lines that actually changed.
    """
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{line_id(text)}.mp3"
    if path.exists() and not overwrite:
        return path

    voice = voice_id or os.environ.get("ELEVENLABS_VOICE_ID") or DEFAULT_VOICE_ID
    client = _client(api_key)
    try:
        stream = client.text_to_speech.convert(
            voice_id=voice,
            text=text,
            model_id=model_id,
            output_format=DEFAULT_FORMAT,
        )
        audio = b"".join(stream)
    except ElevenLabsError:
        raise
    except Exception as exc:
        raise ElevenLabsError(f"synthesis failed for {text[:48]!r}: {exc}") from exc

    if not audio:
        raise ElevenLabsError(f"empty audio returned for {text[:48]!r}")
    path.write_bytes(audio)
    return path


def synthesize_batch(
    lines: Iterable[str],
    output_dir: str = "./game/voices",
    voice_id: Optional[str] = None,
    model_id: str = DEFAULT_MODEL,
    api_key: Optional[str] = None,
    overwrite: bool = False,
    on_progress=None,
) -> dict[str, str]:
    """Synthesise many lines, returning {text: relative filename}."""
    manifest: dict[str, str] = {}
    todo = list(lines)
    for i, text in enumerate(todo, 1):
        path = synthesize(
            text, output_dir, voice_id=voice_id, model_id=model_id,
            api_key=api_key, overwrite=overwrite,
        )
        manifest[text] = path.name
        if on_progress:
            on_progress(i, len(todo), text, path)
    return manifest


def list_voices(api_key: Optional[str] = None) -> list[dict]:
    """Return the available voices, to pick a voice_id for the Dr Lenoir role."""
    client = _client(api_key)
    try:
        response = client.voices.get_all()
    except Exception as exc:
        raise ElevenLabsError(f"could not list voices: {exc}") from exc
    return [
        {
            "voice_id": v.voice_id,
            "name": v.name,
            "labels": getattr(v, "labels", {}) or {},
        }
        for v in response.voices
    ]
