# Proget-big — Software Integrations Hub

A small hub for connecting Claude/CLI workflows to external software, built one
integration at a time. First integration: **Tripo3D** (AI text-to-3D and
image-to-3D generation).

Also in this repo: **[NOVA-7 : Protocole Évasion](game/README.md)** — a
browser FPS escape game where real objects shown to your webcam are detected
(COCO-SSD) and materialized as usable in-game items. See `game/README.md`.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env
# then edit .env and set TRIPO_API_KEY
```

Get an API key from https://platform.tripo3d.ai.

## Usage

```bash
# Generate a 3D model from a text prompt
python cli.py tripo text "a low-poly red fox" --output ./output

# Generate a 3D model from an image
python cli.py tripo image ./cat.png --output ./output
```

Generated files (`.glb` model, and PBR variant when available) are downloaded
into the `--output` directory.

## Project layout

```
integrations/
  tripo/
    client.py   # generate_from_text / generate_from_image, wraps the official tripo3d SDK
cli.py          # command-line entry point
tests/          # unit tests (mocked, no network calls)
```

Future integrations should live under their own `integrations/<name>/` package
and get their own subcommand in `cli.py`.

## Notes

- Uses the official [`tripo3d`](https://github.com/VAST-AI-Research/tripo-python-sdk)
  Python SDK rather than hand-rolled HTTP calls, since Tripo's upload flow
  involves short-lived S3 credentials.
- Never commit your real `TRIPO_API_KEY` — it belongs in `.env` (already
  git-ignored) or your shell environment, never in source.
