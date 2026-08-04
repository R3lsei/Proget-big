"""Assistant d'installation des voix du jeu NOVA-7.

Lancez simplement :   python installer_voix.py

L'assistant pose les questions une par une et se charge du reste : dépendances,
clé API, choix de la voix, écoute d'un extrait, génération des 74 répliques.
Votre clé n'est jamais affichée à l'écran ni envoyée ailleurs qu'à ElevenLabs.
"""

import getpass
import os
import re
import subprocess
import sys
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ENV_FILE = ROOT / ".env"
VOICES_DIR = ROOT / "game" / "voices"
KEY_URL = "https://elevenlabs.io/app/settings/api-keys"

V = "\033[92m"; J = "\033[93m"; R = "\033[91m"; G = "\033[1m"; Z = "\033[0m"
if os.name == "nt" and not os.environ.get("WT_SESSION"):
    V = J = R = G = Z = ""  # vieux terminaux Windows : pas de couleurs


def titre(texte: str) -> None:
    print(f"\n{G}{texte}{Z}\n" + "─" * min(len(texte), 60))


def ok(texte: str) -> None:
    print(f"  {V}✓{Z} {texte}")


def souci(texte: str) -> None:
    print(f"  {R}✗{Z} {texte}")


def info(texte: str) -> None:
    print(f"  {J}·{Z} {texte}")


def demander(question: str, defaut: str = "") -> str:
    suffixe = f" [{defaut}]" if defaut else ""
    reponse = input(f"\n{question}{suffixe} : ").strip()
    return reponse or defaut


def oui_non(question: str, defaut: bool = True) -> bool:
    d = "O/n" if defaut else "o/N"
    while True:
        r = input(f"\n{question} ({d}) : ").strip().lower()
        if not r:
            return defaut
        if r in ("o", "oui", "y", "yes"):
            return True
        if r in ("n", "non", "no"):
            return False
        print("  Répondez par o (oui) ou n (non).")


# ------------------------------------------------------------------
# 1. Dépendances
# ------------------------------------------------------------------
def etape_dependances() -> bool:
    titre("1/5  Vérification des outils nécessaires")
    try:
        import elevenlabs  # noqa: F401
        ok("La bibliothèque ElevenLabs est déjà installée.")
        return True
    except ImportError:
        pass

    info("Il manque la bibliothèque ElevenLabs.")
    if not oui_non("Voulez-vous que je l'installe maintenant ?"):
        souci("Installation annulée. Relancez quand vous serez prêt.")
        return False

    print("\n  Installation en cours, patientez…\n")
    res = subprocess.run(
        [sys.executable, "-m", "pip", "install", "-r", str(ROOT / "requirements.txt")],
        cwd=str(ROOT),
    )
    if res.returncode != 0:
        souci("L'installation a échoué.")
        info("Essayez à la main :  pip install elevenlabs python-dotenv")
        return False
    try:
        import elevenlabs  # noqa: F401
    except ImportError:
        souci("La bibliothèque reste introuvable après installation.")
        info("Fermez puis rouvrez votre terminal, et relancez cet assistant.")
        return False
    ok("Installation terminée.")
    return True


# ------------------------------------------------------------------
# 2. Clé API
# ------------------------------------------------------------------
def lire_cle_existante() -> str:
    if not ENV_FILE.exists():
        return ""
    for ligne in ENV_FILE.read_text(encoding="utf-8").splitlines():
        if ligne.startswith("ELEVENLABS_API_KEY="):
            return ligne.split("=", 1)[1].strip()
    return ""


def ecrire_env(cle: str = None, voix: str = None) -> None:
    """Met à jour .env sans écraser les autres réglages (clé Tripo…)."""
    lignes = ENV_FILE.read_text(encoding="utf-8").splitlines() if ENV_FILE.exists() else []
    maj = {}
    if cle is not None:
        maj["ELEVENLABS_API_KEY"] = cle
    if voix is not None:
        maj["ELEVENLABS_VOICE_ID"] = voix

    sorties, vus = [], set()
    for ligne in lignes:
        m = re.match(r"([A-Z_]+)=", ligne)
        if m and m.group(1) in maj:
            sorties.append(f"{m.group(1)}={maj[m.group(1)]}")
            vus.add(m.group(1))
        else:
            sorties.append(ligne)
    for k, v in maj.items():
        if k not in vus:
            sorties.append(f"{k}={v}")
    ENV_FILE.write_text("\n".join(sorties) + "\n", encoding="utf-8")


def etape_cle() -> str:
    titre("2/5  Votre clé ElevenLabs")

    existante = lire_cle_existante()
    if existante and not existante.startswith("your_"):
        apercu = existante[:4] + "…" + existante[-4:]
        if oui_non(f"Une clé est déjà enregistrée ({apercu}). La garder ?"):
            return existante

    print(f"""
  Il vous faut une clé — c'est gratuit, et notre jeu tient largement
  dans le quota offert (2 872 caractères en tout).

  1. Créez un compte sur elevenlabs.io si ce n'est pas fait
  2. Ouvrez la page « API Keys » de vos paramètres
  3. Créez une clé et copiez-la
""")
    if oui_non("Voulez-vous que j'ouvre la page dans votre navigateur ?"):
        try:
            webbrowser.open(KEY_URL)
            ok("Page ouverte.")
        except Exception:
            info(f"Ouvrez cette adresse à la main : {KEY_URL}")

    print(f"""
  {J}Collez maintenant votre clé ci-dessous.{Z}
  Elle ne s'affichera pas pendant la saisie, c'est normal — c'est pour
  éviter qu'elle traîne à l'écran. Collez puis appuyez sur Entrée.
""")
    for essai in range(3):
        cle = getpass.getpass("  Votre clé : ").strip()
        if not cle:
            souci("Rien n'a été saisi.")
            continue
        if cle.startswith("your_"):
            souci("C'est le texte d'exemple, pas une vraie clé.")
            continue
        if len(cle) < 20:
            souci("Cette clé semble trop courte. Vérifiez la copie.")
            continue
        return cle
        # (les tentatives restantes servent aux erreurs ci-dessus)
    souci("Trois tentatives sans clé valide. Relancez l'assistant.")
    return ""


def verifier_cle(cle: str):
    """Retourne la liste des voix si la clé fonctionne, sinon None."""
    from integrations.elevenlabs import ElevenLabsError, list_voices

    print("\n  Vérification de la clé auprès d'ElevenLabs…")
    try:
        voix = list_voices(api_key=cle)
    except ElevenLabsError as exc:
        souci("La clé a été refusée.")
        message = str(exc)
        if "401" in message or "unauthorized" in message.lower():
            info("Clé invalide ou expirée : recréez-en une sur le site.")
        elif "connect" in message.lower() or "network" in message.lower():
            info("Pas de connexion internet ? Vérifiez votre réseau.")
        else:
            info(message[:160])
        return None
    ok(f"Clé valide — {len(voix)} voix disponibles sur votre compte.")
    return voix


# ------------------------------------------------------------------
# 3. Choix de la voix
# ------------------------------------------------------------------
def etape_voix(voix: list, cle: str) -> str:
    titre("3/5  La voix du Dr Lenoir")

    if not voix:
        info("Aucune voix trouvée : la voix par défaut du projet sera utilisée.")
        return ""

    print("  Voix disponibles sur votre compte :\n")
    for i, v in enumerate(voix, 1):
        etiquettes = v.get("labels") or {}
        desc = ", ".join(str(x) for x in etiquettes.values()) or "—"
        print(f"   {i:2d}. {v['name']:<22} {desc[:44]}")

    print(f"\n  {J}Conseil :{Z} choisissez une voix masculine posée. Vous pourrez")
    print("  en écouter un extrait avant de tout générer.")

    while True:
        rep = demander(f"Numéro de la voix (1-{len(voix)}), ou Entrée pour la voix par défaut")
        if not rep:
            info("Voix par défaut du projet retenue.")
            return ""
        if rep.isdigit() and 1 <= int(rep) <= len(voix):
            choisie = voix[int(rep) - 1]
            ok(f"Voix retenue : {choisie['name']}")
            if oui_non("Écouter un court extrait avant de continuer ?"):
                if not extrait(choisie["voice_id"], cle):
                    continue
                if not oui_non("Cette voix vous convient ?"):
                    continue
            return choisie["voice_id"]
        souci(f"Entrez un nombre entre 1 et {len(voix)}.")


def extrait(voice_id: str, cle: str) -> bool:
    from integrations.elevenlabs import ElevenLabsError, synthesize

    phrase = "Sujet 23, tu m'entends ? Ici le docteur Lenoir."
    print("\n  Génération de l'extrait…")
    try:
        chemin = synthesize(phrase, str(ROOT / "output"), voice_id=voice_id,
                            api_key=cle, overwrite=True)
    except ElevenLabsError as exc:
        souci(f"Extrait impossible : {str(exc)[:120]}")
        return False
    ok(f"Extrait enregistré : {chemin}")
    info("Ouvrez ce fichier pour l'écouter (double-clic).")
    try:
        if sys.platform == "darwin":
            subprocess.run(["open", str(chemin)], check=False)
        elif os.name == "nt":
            os.startfile(str(chemin))  # noqa: S606
        else:
            subprocess.run(["xdg-open", str(chemin)], check=False)
    except Exception:
        pass
    return True


# ------------------------------------------------------------------
# 4. Génération
# ------------------------------------------------------------------
def etape_generation(cle: str, voice_id: str) -> bool:
    from integrations.elevenlabs.generate import generate_game_voices
    from integrations.elevenlabs.lines import all_lines

    titre("4/5  Génération des voix")
    lignes = all_lines()
    caracteres = sum(len(l) for l in lignes)
    deja = len(list(VOICES_DIR.glob("*.mp3"))) if VOICES_DIR.exists() else 0

    print(f"  {len(lignes)} répliques, soit {caracteres} caractères au total.")
    if deja:
        info(f"{deja} fichier(s) déjà présent(s) : ils ne seront pas régénérés.")
    print("  Comptez une à deux minutes.")

    if not oui_non("On lance la génération ?"):
        info("Génération annulée. Vos réglages sont enregistrés dans .env.")
        return False

    print()
    try:
        generate_game_voices(output_dir=str(VOICES_DIR),
                             voice_id=voice_id or None, api_key=cle)
    except Exception as exc:
        souci(f"La génération s'est interrompue : {str(exc)[:160]}")
        info("Relancez l'assistant : les répliques déjà faites seront conservées.")
        return False

    produits = len(list(VOICES_DIR.glob("*.mp3")))
    ok(f"{produits} réplique(s) doublée(s) dans game/voices/")
    return True


# ------------------------------------------------------------------
# 5. Lancement
# ------------------------------------------------------------------
def etape_jeu() -> None:
    titre("5/5  C'est prêt")
    print("""  Pour jouer et entendre le résultat :

      python serve.py

  Le navigateur s'ouvrira tout seul. Dès la première phrase, le
  Dr Lenoir doit parler avec sa nouvelle voix.
""")
    if oui_non("Lancer le jeu maintenant ?"):
        subprocess.run([sys.executable, str(ROOT / "serve.py")], cwd=str(ROOT))


# ------------------------------------------------------------------
def main() -> None:
    print(f"""
{G}╔════════════════════════════════════════════════════════╗
║   NOVA-7 — Installation des voix du Dr Lenoir          ║
╚════════════════════════════════════════════════════════╝{Z}

  Cet assistant fait tout à votre place. Répondez simplement
  aux questions ; vous pouvez l'interrompre à tout moment avec
  Ctrl+C et le relancer plus tard sans rien perdre.
""")

    if not etape_dependances():
        return

    sys.path.insert(0, str(ROOT))
    cle = etape_cle()
    if not cle:
        return

    voix = verifier_cle(cle)
    if voix is None:
        info("Clé non enregistrée. Relancez l'assistant avec une clé valide.")
        return

    ecrire_env(cle=cle)
    ok("Clé enregistrée dans le fichier .env (exclu de Git, elle ne partira pas sur GitHub).")

    voice_id = etape_voix(voix, cle)
    ecrire_env(voix=voice_id)

    if etape_generation(cle, voice_id):
        etape_jeu()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n  Assistant interrompu. Vos réglages déjà enregistrés sont conservés.")
        sys.exit(0)
