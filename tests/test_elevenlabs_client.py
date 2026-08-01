import json
import os
import tempfile
from pathlib import Path
from unittest import TestCase
from unittest.mock import MagicMock, patch

from integrations.elevenlabs.client import ElevenLabsError, line_id, synthesize
from integrations.elevenlabs.generate import generate_game_voices
from integrations.elevenlabs.lines import all_lines, object_lines


class LineIdTests(TestCase):
    def test_is_stable_and_hex(self):
        self.assertEqual(line_id("Vitre brisée."), line_id("Vitre brisée."))
        self.assertRegex(line_id("Vitre brisée."), r"^[0-9a-f]{8}$")

    def test_ignores_surrounding_whitespace(self):
        self.assertEqual(line_id("  Vitre brisée. "), line_id("Vitre brisée."))

    def test_matches_the_browser_implementation(self):
        # Valeurs produites par lineId() dans game/js/audio.js — si elles
        # divergent, le jeu ne trouve plus aucun fichier de voix.
        self.assertEqual(
            line_id("Liens sectionnés. Bien joué. Maintenant, sors de cette cellule."),
            "f6760da0",
        )
        self.assertEqual(line_id("Vitre brisée."), line_id("Vitre brisée."))

    def test_distinguishes_different_lines(self):
        self.assertNotEqual(line_id("Vitre brisée."), line_id("Armoire crochetée."))


class LinesTests(TestCase):
    def test_object_lines_come_from_the_rules_engine(self):
        lines = object_lines()
        self.assertTrue(any("des ciseaux" in l for l in lines))
        self.assertTrue(all(l.startswith("Ça, c'est ") for l in lines))

    def test_all_lines_are_unique(self):
        lines = all_lines()
        self.assertEqual(len(lines), len(set(lines)))
        self.assertGreater(len(lines), 50)


class SynthesizeTests(TestCase):
    def test_requires_api_key(self):
        os.environ.pop("ELEVENLABS_API_KEY", None)
        with self.assertRaises(ElevenLabsError):
            synthesize("bonjour", api_key=None)

    @patch("integrations.elevenlabs.client._client")
    def test_writes_audio_and_reuses_cache(self, mock_client):
        mock_client.return_value.text_to_speech.convert.return_value = [b"ID3", b"data"]
        with tempfile.TemporaryDirectory() as tmp:
            path = synthesize("bonjour", tmp, api_key="k")
            self.assertTrue(path.exists())
            self.assertEqual(path.read_bytes(), b"ID3data")
            self.assertEqual(mock_client.return_value.text_to_speech.convert.call_count, 1)

            # deuxième appel : le fichier existe, aucune requête supplémentaire
            synthesize("bonjour", tmp, api_key="k")
            self.assertEqual(mock_client.return_value.text_to_speech.convert.call_count, 1)

    @patch("integrations.elevenlabs.client._client")
    def test_rejects_empty_audio(self, mock_client):
        mock_client.return_value.text_to_speech.convert.return_value = []
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ElevenLabsError):
                synthesize("bonjour", tmp, api_key="k")


class GenerateTests(TestCase):
    def test_dry_run_spends_nothing(self):
        with tempfile.TemporaryDirectory() as tmp:
            with patch("integrations.elevenlabs.generate.synthesize") as mock_syn:
                generate_game_voices(output_dir=tmp, dry_run=True)
                mock_syn.assert_not_called()
            self.assertFalse((Path(tmp) / "manifest.json").exists())

    def test_writes_manifest_the_game_can_read(self):
        with tempfile.TemporaryDirectory() as tmp:
            def fake(text, out, **kw):
                p = Path(out) / f"{line_id(text)}.mp3"
                p.write_bytes(b"ID3")
                return p

            with patch("integrations.elevenlabs.generate.synthesize", side_effect=fake):
                generate_game_voices(output_dir=tmp)

            manifest = json.loads((Path(tmp) / "manifest.json").read_text(encoding="utf-8"))
            self.assertIn("lines", manifest)
            intro = next(t for t in manifest["lines"] if "docteur Lenoir" in t)
            # le jeu cherche voices/<id>.mp3 : le manifeste doit pointer dessus
            self.assertEqual(manifest["lines"][intro], f"{line_id(intro)}.mp3")
            self.assertTrue((Path(tmp) / manifest["lines"][intro]).exists())

    def test_failed_line_does_not_abort_the_batch(self):
        with tempfile.TemporaryDirectory() as tmp:
            calls = {"n": 0}

            def flaky(text, out, **kw):
                calls["n"] += 1
                if calls["n"] == 2:
                    raise ElevenLabsError("boom")
                p = Path(out) / f"{line_id(text)}.mp3"
                p.write_bytes(b"ID3")
                return p

            with patch("integrations.elevenlabs.generate.synthesize", side_effect=flaky):
                result = generate_game_voices(output_dir=tmp)

            self.assertEqual(len(result["failed"]), 1)
            self.assertGreater(len(result["lines"]), 1)
