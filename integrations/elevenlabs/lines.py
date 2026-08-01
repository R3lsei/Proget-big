"""Les répliques doublées de NOVA-7.

Le jeu retombe sur la synthèse du navigateur pour toute réplique absente, donc
cette liste n'a pas besoin d'être exhaustive — mais plus elle l'est, plus la
narration est incarnée. Pour attraper ce qui manque : jouez une partie puis
tapez `NOVA.spokenLines()` dans la console du navigateur.
"""

import json
import re
from pathlib import Path

# Répliques fixes du Dr Lenoir, dans l'ordre de la partie.
STORY_LINES = [
    # Chapitre 1 — le réveil
    "Sujet 23, tu m'entends ? Ici le docteur Lenoir. Montre à ta caméra un "
    "objet qui coupe, et je le matérialiserai pour libérer tes mains.",
    "Liens sectionnés. Bien joué. Maintenant, sors de cette cellule.",
    # Chapitre 2 — sortir
    "Il te faut un objet pour faire levier.",
    "La grille cède. Rampe dans le conduit.",
    "Cette serrure se crochète. Trouve le bon outil.",
    "Serrure crochetée. La voie est libre.",
    "Même les gardiens doutaient. Tu n'es pas le monstre de cette histoire.",
    # Chapitre 3 — caméra et code
    "Attention, caméra active au fond du couloir. Neutralise-la avant la porte.",
    "Pirate la caméra, ou lance quelque chose pour la détourner.",
    "Caméra piratée. Le confinement de la porte est levé.",
    "Belle diversion. La caméra est aveuglée.",
    "Repéré ! Baisse-toi et neutralise cette caméra !",
    "La caméra t'observe. Neutralise-la d'abord.",
    "Une page cornée. Sept salles gardent trois étages. Un seul sujet reste. "
    "Neuf gardiens veillent.",
    "Il faut le code. Un livre, ou un appareil pour pirater le clavier.",
    "Clavier piraté. Porte déverrouillée.",
    "Code accepté. Belle déduction, Sujet 23.",
    # Chapitre 4 — feu, armoire, vapeur
    "Ce feu ne s'éteindra qu'avec un liquide. Une bouteille fera l'affaire.",
    "Feu éteint. Traverse vite, avant que ça ne reprenne.",
    "Brise la vitre, ou crochète la serrure.",
    "Vitre brisée.",
    "Armoire crochetée.",
    "Badge niveau 4 récupéré. Direction la salle des serveurs.",
    "Cette vapeur découpe la peau. Protège-toi, ou chronomètre les jets.",
    "Valve refermée. La vapeur est coupée, le sas est accessible.",
    "Cycle chronométré. Valve refermée entre deux jets. Bien vu.",
    "La vapeur bloque le sas. Occupe-toi de la valve.",
    # Chapitre 5 — serveurs
    "Ce terminal se pirate. Téléphone ou ordinateur, à toi de voir.",
    "Grille laser désactivée. Le cœur de NOVA 7 est à toi. La sortie est "
    "droit devant.",
    # Final — chien et sortie
    "Recule ! Trouve-lui à manger.",
    "Le chien est occupé à manger. File vers la porte.",
    "Le chien est distrait. Vite, la porte.",
    "Occupe-toi du chien d'abord !",
    "Accès refusé. Il te faut le badge niveau 4 du laboratoire.",
    "Accès autorisé. Monte dans l'ascenseur, Sujet 23. Tu es libre.",
    "Bien joué, Sujet 23. Tu es libre. Mais NOVA 7 n'était que le niveau "
    "moins 4. Il en reste trois.",
    # Divers
    "Liaison optique impossible. Vérifie les autorisations de ta caméra.",
]

_GAME_JS = Path(__file__).resolve().parents[2] / "game" / "js" / "items.js"


def object_lines(items_js: Path | None = None) -> list[str]:
    """« Ça, c'est un couteau. » — une réplique par objet reconnu.

    Les noms sont lus dans game/js/items.js pour rester alignés avec le moteur
    de règles, plutôt que recopiés ici (source unique de vérité).
    """
    path = items_js or _GAME_JS
    if not path.exists():
        return []
    source = path.read_text(encoding="utf-8")
    names = re.findall(r"fr:\s*'((?:[^'\\]|\\.)*)'", source)
    seen, lines = set(), []
    for raw in names:
        name = raw.replace("\\'", "'")
        if name in seen:
            continue
        seen.add(name)
        lines.append(f"Ça, c'est {name}.")
    return lines


def all_lines() -> list[str]:
    """Toutes les répliques à générer, sans doublon, dans un ordre stable."""
    seen, out = set(), []
    for line in STORY_LINES + object_lines():
        clean = " ".join(line.split())
        if clean not in seen:
            seen.add(clean)
            out.append(clean)
    return out


def load_json_lines(path: str) -> list[str]:
    """Charge une liste de répliques exportée par NOVA.spokenLines()."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("le fichier doit contenir un tableau JSON de chaînes")
    return [" ".join(str(s).split()) for s in data if str(s).strip()]
