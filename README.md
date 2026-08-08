# Proget-big

Ce dépôt contient **NOVA-7**, un jeu d'énigmes à la première personne où le
joueur résout les obstacles en montrant de vrais objets de son domicile à sa
webcam — le jeu les reconnaît, en déduit les propriétés physiques, et en dérive
ce qu'ils permettent de faire.

> **État : conception validée, jalon 0 en cours.**
> Le développement est bloqué tant que le banc de mesure de détection n'a pas
> été exécuté — voir [docs/TASKS.md](docs/TASKS.md).

## Documentation

Tout part de **[docs/README.md](docs/README.md)**.
Les quatre documents qui font autorité : [SPEC](docs/SPEC.md) ·
[GAMEPLAY](docs/GAMEPLAY.md) · [ARCHITECTURE](docs/ARCHITECTURE.md) ·
[BALANCING](docs/BALANCING.md).

## Lancer le jeu

Double-cliquez sur `JOUER-Windows.bat` (ou `JOUER-Mac-Linux.command`), ou :

```bash
python serve.py          # sert le jeu et ouvre le navigateur
```

La caméra exige `http://localhost` : ouvrir `index.html` directement ne
fonctionnera pas, c'est une règle de sécurité des navigateurs.

## Doubler les voix (optionnel)

Double-cliquez sur `INSTALLER-LES-VOIX-Windows.bat`, ou consultez
[game/README.md](game/README.md).

## Le banc de mesure

```bash
cd tools/spike-detection && python3 -m http.server 8000
```

Mesure sur votre machine la latence de la détection open-vocabulary. Ses
résultats conditionnent le design du scanner.

---

# Intégrations

Le dépôt sert aussi de hub d'intégrations logicielles, utilisées par le jeu.

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

# List ElevenLabs voices, then voice the NOVA-7 game dialogue
python cli.py elevenlabs list
python cli.py elevenlabs voices --dry-run   # preview, spends no credits
python cli.py elevenlabs voices             # writes game/voices/*.mp3
python cli.py elevenlabs say "Bonjour" --output ./output
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
