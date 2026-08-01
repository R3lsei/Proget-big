"""Génère les voix du jeu et écrit game/voices/manifest.json."""

import json
from pathlib import Path
from typing import Optional

from .client import ElevenLabsError, line_id, synthesize
from .lines import all_lines, load_json_lines


def generate_game_voices(
    output_dir: str = "./game/voices",
    voice_id: Optional[str] = None,
    api_key: Optional[str] = None,
    overwrite: bool = False,
    from_json: Optional[str] = None,
    dry_run: bool = False,
) -> dict:
    """Synthétise les répliques et met à jour le manifeste lu par le jeu."""
    lines = load_json_lines(from_json) if from_json else all_lines()
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    manifest_path = out_dir / "manifest.json"
    manifest: dict[str, str] = {}
    if manifest_path.exists():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8")).get("lines", {})
        except (ValueError, OSError):
            manifest = {}

    todo = [t for t in lines if overwrite or not (out_dir / f"{line_id(t)}.mp3").exists()]
    print(f"{len(lines)} réplique(s) — {len(todo)} à synthétiser, "
          f"{len(lines) - len(todo)} déjà en cache.")
    if dry_run:
        for t in todo:
            print(f"  [dry-run] {line_id(t)}.mp3  {t[:70]}")
        return {"lines": manifest, "generated": 0, "skipped": len(lines)}

    generated, failed = 0, []
    for i, text in enumerate(lines, 1):
        try:
            path = synthesize(text, output_dir, voice_id=voice_id,
                              api_key=api_key, overwrite=overwrite)
        except ElevenLabsError as exc:
            failed.append((text, str(exc)))
            print(f"  [{i}/{len(lines)}] ÉCHEC : {exc}")
            continue
        manifest[text] = path.name
        if text in [t for t in todo]:
            generated += 1
            print(f"  [{i}/{len(lines)}] {path.name}  {text[:60]}")

    manifest_path.write_text(
        json.dumps({"voice_id": voice_id or "default", "lines": manifest},
                   ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\nManifeste écrit : {manifest_path} ({len(manifest)} réplique(s)).")
    if failed:
        print(f"{len(failed)} échec(s) — ces répliques resteront en synthèse navigateur.")
    return {"lines": manifest, "generated": generated, "failed": failed}
