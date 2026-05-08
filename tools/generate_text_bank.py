import json
import random
import re
from dataclasses import dataclass


def word_count(text: str) -> int:
    # Count "words" in a predictable way for UI stats.
    return len([w for w in re.split(r"\s+", text.strip()) if w])


@dataclass(frozen=True)
class BankConfig:
    count: int = 200
    seed: int = 20260507


INTRO = [
    "The rain tapped gently against the glass as the room settled into a softer rhythm.",
    "A slow fan turned overhead, pushing cool air through a warm, quiet afternoon.",
    "Streetlight glow pooled on the sidewalk, and the city sounded far away for once.",
    "A kettle clicked off, and the kitchen returned to its small, steady hush.",
    "Clouds moved like brushed charcoal across the sky, softening every edge of the day.",
    "A late bus sighed at the corner, doors folding shut with a calm, familiar sound.",
    "Vinyl crackled faintly, like static from a kinder world, and the beat stayed patient.",
    "The window was slightly open, letting in night air and the scent of wet leaves.",
    "Your desk lamp drew a clean circle of light, and everything outside it could wait.",
    "Snow fell in small, quiet decisions, and the street looked newly forgiven.",
]

MIDDLE = [
    "You typed without rushing, letting each word land the way a note lands in a loop.",
    "The mug beside you cooled, but the warmth stayed in your hands and in your posture.",
    "Somewhere a neighbor laughed, then the sound faded, leaving only the soft soundtrack of keys.",
    "You paused once, breathed in, and the next sentence arrived like a gentle reply.",
    "The playlist kept its distance—no sharp corners, just a steady pulse under everything.",
    "Outside, traffic softened to a murmur, and inside, the cursor kept a quiet promise.",
    "Each line felt like sweeping a floor: simple, repetitive, and strangely satisfying.",
    "You watched the letters appear as if they were footprints across fresh paper.",
    "A small imperfection in the beat made it human, and that made it easier to continue.",
    "You didn’t need to be fast—only present, only consistent, only here.",
]

END = [
    "When you reached the end, the room felt lighter, as if the noise had been typed out of it.",
    "By the last word, your shoulders had dropped, and the quiet had moved a little closer.",
    "You finished the paragraph and noticed your breathing, steady and unforced.",
    "The sentence ended cleanly, and the moment did too—softly, without demands.",
    "The cursor blinked like a calm metronome, and you let the silence keep time.",
    "You stopped with a small exhale, and the night kept going, gentle and unchanged.",
    "The final period felt like turning down a dimmer switch: not off, just kinder.",
    "You reached the end and rested your hands, letting the after-sound of typing fade.",
    "The last line landed, and the room returned to stillness, exactly enough.",
    "You finished, and for a second, nothing asked anything of you at all.",
]

MOODS = [
    (["lofi", "rain", "night"], "light", 2),
    (["lofi", "coffee", "morning"], "light", 1),
    (["zen", "wind", "afternoon"], "light", 1),
    (["lofi", "neon", "city"], "medium", 2),
    (["zen", "tea", "evening"], "light", 1),
    (["lofi", "vinyl", "study"], "medium", 2),
    (["zen", "snow", "quiet"], "light", 2),
    (["lofi", "ocean", "dusk"], "light", 2),
    (["zen", "forest", "breath"], "light", 1),
    (["lofi", "train", "late"], "medium", 3),
]

TITLES = [
    "Quiet Rain",
    "Lamp Circle",
    "Late Bus",
    "Soft Kettle",
    "Vinyl Patience",
    "Window Air",
    "Neon Distance",
    "Snow Decisions",
    "Tea Evening",
    "Ocean Loop",
    "Forest Breath",
    "City Hush",
    "Paper Footprints",
    "Still Cursor",
    "Warm Hands",
    "Muted Morning",
    "Dusk Pulse",
    "Small Exhale",
    "After Sound",
    "Gentle Reply",
]


def build_passage(rng: random.Random) -> str:
    a = rng.choice(INTRO)
    b = rng.choice(MIDDLE)
    c = rng.choice(END)
    # Keep variety without getting too long.
    if rng.random() < 0.35:
        b2 = rng.choice([m for m in MIDDLE if m != b])
        return f"{a} {b} {b2} {c}"
    return f"{a} {b} {c}"


def main() -> None:
    cfg = BankConfig()
    rng = random.Random(cfg.seed)

    items = []
    for i in range(cfg.count):
        title = f"{rng.choice(TITLES)} {i+1:03d}"
        mood, punctuation, difficulty = rng.choice(MOODS)
        text = build_passage(rng)
        items.append(
            {
                "id": f"lofi-zen-{i+1:03d}",
                "title": title,
                "text": text,
                "mood": mood,
                "difficulty": difficulty,
                "wordCount": word_count(text),
                "punctuation": punctuation,
            }
        )

    out_path = "docs/text-bank.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()

