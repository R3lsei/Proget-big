"""Génère les voix du jeu et écrit game/voices/manifest.json."""

import json
import re
import shutil
from pathlib import Path
from typing import Optional

from .client import ElevenLabsError, line_id, synthesize
from .lines import all_lines, load_json_lines

AUDIO_SUFFIXES = (".mp3", ".wav", ".m4a", ".ogg")


def print_script(numbered: bool = True) -> list[str]:
    """Affiche les répliques à enregistrer, numérotées.

    Sert au parcours manuel : on génère chaque réplique sur le site
    d'ElevenLabs, on télécharge, et on nomme le fichier avec son numéro.
    """
    lines = all_lines()
    for i, text in enumerate(lines, 1):
        print(f"{i:02d}. {text}" if numbered else text)
    return lines


def import_folder(
    folder: str,
    output_dir: str = "./game/voices",
    move: bool = False,
) -> dict:
    """Importe des voix téléchargées à la main.

    Les fichiers doivent commencer par le numéro de la réplique (01.mp3,
    02.mp3, « 03 - lenoir.mp3 »…), tel qu'affiché par `elevenlabs script`.
    Ils sont copiés sous le nom attendu par le jeu et le manifeste est écrit.
    """
    src = Path(folder)
    if not src.is_dir():
        raise ElevenLabsError(f"dossier introuvable : {folder}")

    lines = all_lines()
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    found: dict[int, Path] = {}
    ignored: list[str] = []
    for f in sorted(src.iterdir()):
        if not f.is_file() or f.suffix.lower() not in AUDIO_SUFFIXES:
            continue
        m = re.match(r"0*(\d+)", f.name)
        if not m:
            ignored.append(f.name)
            continue
        n = int(m.group(1))
        if not 1 <= n <= len(lines):
            ignored.append(f"{f.name} (numéro {n} hors des 1–{len(lines)})")
            continue
        if n in found:
            ignored.append(f"{f.name} (numéro {n} déjà pris par {found[n].name})")
            continue
        found[n] = f

    manifest: dict[str, str] = {}
    manifest_path = out_dir / "manifest.json"
    if manifest_path.exists():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8")).get("lines", {})
        except (ValueError, OSError):
            manifest = {}

    for n, f in sorted(found.items()):
        text = lines[n - 1]
        target = out_dir / f"{line_id(text)}.mp3"
        (shutil.move if move else shutil.copy2)(str(f), str(target))
        manifest[text] = target.name
        print(f"  {n:02d} -> {target.name}   {text[:56]}")

    manifest_path.write_text(
        json.dumps({"voice_id": "import", "lines": manifest},
                   ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    missing = [n for n in range(1, len(lines) + 1) if n not in found]
    print(f"\n{len(found)} réplique(s) importée(s) sur {len(lines)}.")
    if missing:
        preview = ", ".join(str(n) for n in missing[:12])
        suite = "…" if len(missing) > 12 else ""
        print(f"Manquantes ({len(missing)}) : {preview}{suite}")
        print("Elles resteront en synthèse navigateur — le jeu fonctionne quand même.")
    for name in ignored:
        print(f"Ignoré : {name}")
    print(f"Manifeste écrit : {manifest_path}")
    return {"imported": len(found), "missing": missing, "ignored": ignored}


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
