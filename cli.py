"""Command-line entry point for the software integrations hub.

Usage:
    python cli.py tripo text "a low-poly fox" --output ./output
    python cli.py tripo image ./cat.png --output ./output

    python cli.py elevenlabs voices                 # doubler tout le jeu
    python cli.py elevenlabs voices --dry-run       # lister sans dépenser
    python cli.py elevenlabs list                   # voix disponibles
    python cli.py elevenlabs say "Bonjour Sujet 23" # une seule réplique
"""

import argparse
import asyncio
import sys

try:
    from dotenv import load_dotenv
except ImportError:  # dépendance facultative
    def load_dotenv() -> None:
        pass


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Software integrations hub")
    subparsers = parser.add_subparsers(dest="command", required=True)

    tripo_parser = subparsers.add_parser("tripo", help="Generate a 3D model with Tripo3D")
    tripo_sub = tripo_parser.add_subparsers(dest="mode", required=True)

    text_parser = tripo_sub.add_parser("text", help="Generate a model from a text prompt")
    text_parser.add_argument("prompt")
    text_parser.add_argument("--negative-prompt", default=None)
    text_parser.add_argument("--output", default="./output")

    image_parser = tripo_sub.add_parser("image", help="Generate a model from an image file")
    image_parser.add_argument("image_path")
    image_parser.add_argument("--output", default="./output")

    el = subparsers.add_parser("elevenlabs", help="Text-to-speech with ElevenLabs")
    el_sub = el.add_subparsers(dest="mode", required=True)

    voices = el_sub.add_parser("voices", help="Voice the NOVA-7 game dialogue")
    voices.add_argument("--output", default="./game/voices")
    voices.add_argument("--voice", default=None, help="ElevenLabs voice_id")
    voices.add_argument("--overwrite", action="store_true", help="re-synthesise cached lines")
    voices.add_argument("--from-json", default=None,
                        help="lines exported by NOVA.spokenLines() in the browser console")
    voices.add_argument("--dry-run", action="store_true", help="list without spending credits")

    el_sub.add_parser("list", help="List the voices available on your account")

    say = el_sub.add_parser("say", help="Synthesise a single line")
    say.add_argument("text")
    say.add_argument("--output", default="./output")
    say.add_argument("--voice", default=None)

    return parser


def main() -> None:
    load_dotenv()
    args = build_parser().parse_args()

    if args.command == "tripo":
        run_tripo(args)
    elif args.command == "elevenlabs":
        run_elevenlabs(args)


def run_tripo(args) -> None:
    from integrations.tripo import TripoError, generate_from_image, generate_from_text

    try:
        if args.mode == "text":
            files = asyncio.run(
                generate_from_text(args.prompt, args.output, negative_prompt=args.negative_prompt)
            )
        else:
            files = asyncio.run(generate_from_image(args.image_path, args.output))
    except TripoError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)

    print("Generated files:")
    for model_type, path in files.items():
        if path:
            print(f"  {model_type}: {path}")


def run_elevenlabs(args) -> None:
    from integrations.elevenlabs import (
        ElevenLabsError, generate_game_voices, list_voices, synthesize,
    )

    try:
        if args.mode == "voices":
            generate_game_voices(
                output_dir=args.output,
                voice_id=args.voice,
                overwrite=args.overwrite,
                from_json=args.from_json,
                dry_run=args.dry_run,
            )
        elif args.mode == "list":
            for v in list_voices():
                labels = ", ".join(f"{k}={x}" for k, x in v["labels"].items()) or "—"
                print(f"  {v['voice_id']}  {v['name']:<24} {labels}")
        elif args.mode == "say":
            path = synthesize(args.text, args.output, voice_id=args.voice, overwrite=True)
            print(f"Écrit : {path}")
    except ElevenLabsError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
