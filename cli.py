"""Command-line entry point for the software integrations hub.

Usage:
    python cli.py tripo text "a low-poly fox" --output ./output
    python cli.py tripo image ./cat.png --output ./output
"""

import argparse
import asyncio
import sys

from dotenv import load_dotenv

from integrations.tripo import TripoError, generate_from_image, generate_from_text


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

    return parser


def main() -> None:
    load_dotenv()
    args = build_parser().parse_args()

    try:
        if args.command == "tripo" and args.mode == "text":
            files = asyncio.run(
                generate_from_text(args.prompt, args.output, negative_prompt=args.negative_prompt)
            )
        elif args.command == "tripo" and args.mode == "image":
            files = asyncio.run(generate_from_image(args.image_path, args.output))
        else:
            raise TripoError("Unknown command")
    except TripoError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)

    print("Generated files:")
    for model_type, path in files.items():
        if path:
            print(f"  {model_type}: {path}")


if __name__ == "__main__":
    main()
