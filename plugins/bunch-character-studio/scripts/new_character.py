#!/usr/bin/env python3
import argparse
import pathlib
import re


ROOT = pathlib.Path(__file__).resolve().parents[1]


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return re.sub(r"-+", "-", slug) or "character"


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a character definition and evaluation folder.")
    parser.add_argument("name")
    parser.add_argument("--species", required=True)
    parser.add_argument("--trait", action="append", default=[])
    parser.add_argument("--avoid", action="append", default=[])
    parser.add_argument("--body-type")
    parser.add_argument("--default-style")
    parser.add_argument(
        "--paw-style",
        choices=["human-like-hands", "hybrid-hands", "full-paws"],
    )
    parser.add_argument(
        "--finger-count",
        choices=["auto", "five", "toon-four"],
    )
    parser.add_argument("--id")
    args = parser.parse_args()

    char_id = slugify(args.id or args.name)
    char_dir = ROOT / "assets" / "characters" / char_id
    profile_path = char_dir / "character.md"
    if profile_path.exists():
        raise SystemExit(f"Refusing to overwrite existing profile: {profile_path}")
    refs_dir = char_dir / "references"
    refs_dir.mkdir(parents=True, exist_ok=True)

    traits = args.trait or [
        "describe the character's approved colors and markings",
        "describe the character's face, hair, and silhouette",
        "describe the character's required clothing or accessories",
    ]
    avoid = args.avoid or ["unapproved changes to required traits", "extra anatomy"]

    profile = [
        "---",
        f"id: {char_id}",
        f"display_name: {args.name}",
        f"species: {args.species}",
        *([f"body_type: {args.body_type}"] if args.body_type else []),
        *([f"default_style: {args.default_style}"] if args.default_style else []),
        *([f"paw_style: {args.paw_style}"] if args.paw_style else []),
        *([f"finger_count: {args.finger_count}"] if args.finger_count else []),
        "required_traits:",
        *[f"  - {trait}" for trait in traits],
        "avoid:",
        *[f"  - {item}" for item in avoid],
        "reference_images: []",
        "---",
        "",
        f"# {args.name}",
        "",
        "## Reference status",
        "",
        "Add approved identity references to `references/` and list them in `reference_images`. "
        "Label each image's role and approval status here. Candidate art is not canon.",
        "",
        "## Model sheet and construction",
        "",
        "Record approved front, three-quarter, side, and back views; palette; proportions; "
        "anatomy; silhouette; wardrobe; and accessories. Leave unknowns explicit.",
        "",
        "## Acting library",
        "",
        "Describe characteristic expressions and gestures as visible actions.",
        "",
        "## Never list",
        "",
        "Record concrete identity failures to avoid. Put observed image examples in `failures/`.",
        "",
        "## Evaluation evidence",
        "",
        "Customize `evals/cases.md`. Store only explicitly approved results in `goldens/`; "
        "store observed failed results in `failures/`. Keep model, prompt, and source "
        "references with each comparison. These folders do not change the character's canon.",
        "",
    ]
    profile_path.write_text("\n".join(profile), encoding="utf-8")
    (char_dir / "evals").mkdir(exist_ok=True)
    (char_dir / "goldens").mkdir(exist_ok=True)
    (char_dir / "failures").mkdir(exist_ok=True)
    (char_dir / "evals" / "cases.md").write_text(
        "# Character evaluation cases\n\n"
        "These are proposed tests, not approved canon or completed results. "
        "Customize each case for this character before running it. "
        "Use the same brief and references when comparing image models.\n\n"
        "| ID | Situation | Character-specific pass criteria | Status | Result / trace |\n"
        "| --- | --- | --- | --- | --- |\n"
        "| 01 | Neutral turnaround | Define approved views and identity locks | pending | |\n"
        "| 02 | Anatomy topology | Define counts, attachment, and symmetry | pending | |\n"
        "| 03 | Squash and stretch | Define silhouette limits | pending | |\n"
        "| 04 | Running | Define motion and anatomy checks | pending | |\n"
        "| 05 | Prop interaction | Choose a relevant prop and contact checks | pending | |\n"
        "| 06 | Seated | Define support, clothing, and tail checks | pending | |\n"
        "| 07 | Back view | Define markings and silhouette checks | pending | |\n"
        "| 08 | Extreme expression | Define face and identity checks | pending | |\n"
        "| 09 | Character contact | Choose a relevant partner and occlusion checks | pending | |\n"
        "| 10 | Style retention | Choose separate rendering styles; keep identity fixed | pending | |\n",
        encoding="utf-8",
    )
    (char_dir / "goldens" / "README.md").write_text(
        "# Approved results\n\n"
        "Put only creator-approved images here. For each image, record its source, "
        "approval, intended use, and related evaluation case in this file. "
        "A generated result is a candidate until explicitly approved.\n",
        encoding="utf-8",
    )
    (char_dir / "failures" / "README.md").write_text(
        "# Observed failures\n\n"
        "Keep actual failed outputs with the prompt/model, related evaluation case, "
        "and a concrete description of the defect. Never invent a failure example "
        "or treat an unreviewed image as a failure.\n",
        encoding="utf-8",
    )
    print(profile_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
