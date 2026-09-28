---
name: add-furry-character
description: Add or update a reusable human, furry, anthro, toon, or creature character definition for Bunch: Character Studio. Use when the user wants to define a character, fursona, OC, mascot, or reusable visual identity with references and evaluation cases.
---

# Add Furry Character

## Done State

Create or update one character folder under the plugin's `assets/characters/` directory with a valid `character.md` identity profile, optional `references/` images, and a character-specific evaluation ledger. Testy Taupin is the bundled generic, reference-free sample; users may add any number of arbitrary characters.

## Workflow

1. Identify the character name, species (including human when appropriate), and 3-12 locked visual traits.
2. If relevant and known, choose a `paw_style`: `human-like-hands`, `hybrid-hands`, or `full-paws`.
3. If relevant and known, choose a `finger_count`: `auto`, `five`, or `toon-four`.
4. Use `scripts/new_character.py` when creating a fresh profile.
5. Optionally copy from `assets/characters/_template/character.md` for a hand-authored profile.
6. Put reference images in `assets/characters/<id>/references/`.
7. List reference image paths in `reference_images`.
8. For an important recurring character, add the construction block below; attach a turnaround/model sheet when available.
9. Customize `evals/cases.md` with character-specific pass criteria. The starter's ten situations are suggestions, not completed tests; replace inapplicable ones.
10. Keep explicitly creator-approved images in `goldens/` and actual failed outputs in `failures/`. Record the source, model, exact prompt, case, and review decision. Never move an image into `goldens/` based on automated scoring alone.
11. Run `scripts/validate_profiles.py`.
12. If required traits, palette values, or references are ambiguous, leave clear profile placeholders instead of inventing canon.

## Character Contract

Character profiles define identity only. Do not bake rendering style into a character unless it is an essential identity trait.

Required frontmatter:

```yaml
id: lowercase-kebab-case
display_name: Character Name
species: red fox
required_traits:
  - one concrete visual trait
  - another concrete visual trait
  - a third concrete visual trait
avoid:
  - generic species design
reference_images:
  - references/example.jpg
```

Useful optional fields:

```yaml
body_type: anthropomorphic character
default_style: toon-in-real-world
paw_style: hybrid-hands
finger_count: auto
aliases:
  - nickname
pronouns: they/them
personality_tags:
  - confident
  - gentle
```

## Continuity Block for Recurring Characters

Profiles are not merely ingredient lists. For a character expected to recur,
add a concise body section covering:

- **Model sheet / turnaround:** front, three-quarter, side, and back reference
  paths, or an explicit note that references are still needed.
- **Palette:** exact sampled or approved color names/values for fur, markings,
  eyes, hair, accessories, and clothing defaults. Never invent exact values.
- **Construction:** head-to-body proportion, eye and muzzle construction,
  nose, paw/hand construction, and species silhouette.
- **Wardrobe silhouettes:** recurring clothing shapes and the accessories that
  must read even in a small image.
- **Acting library:** five characteristic expressions and five characteristic
  gestures written as observable behavior, not labels such as “happy.”
- **Never list:** the concrete identity failures the generator must avoid.

Character identity still wins over rendering style. Reference images and
approved palette values are the source of truth when they exist.

## Character Evaluation Folder

`new_character.py` also creates:

```text
<character-id>/
  character.md       identity and construction
  references/        approved identity images listed in character.md
  evals/cases.md     proposed scenarios and character-specific pass criteria
  goldens/           explicitly approved results with provenance
  failures/          observed failures with defect descriptions
```

Keep evaluation cases, model outputs, and approvals separate. To compare image
models, use the same character version, references, scene brief, and evaluation
criteria; record the model and result for each run. Existing eval traces may be
linked from `evals/cases.md` rather than copied. Do not promote a candidate
image or a test prompt into canon without the creator's decision.

## Paw Style

Use `paw_style` to control hand anatomy:

- `human-like-hands`: human hand silhouette, fur/markings allowed, nails may remain nail-like.
- `hybrid-hands`: expressive anthro hands, short claws or claw-like nails, optional small pawpads only when palms are visible.
- `full-paws`: visibly paw-like hands with pawpads, claws, thicker digits, and less human nail structure.

When editing an existing photo, preserve object contact and gestures over forcing paw details. Pawpads should only appear on visible palm-side surfaces.

## Finger Count

Use `finger_count` independently from `paw_style`:

- `auto`: choose what fits the style, character, and pose.
- `five`: five digits per hand, including thumb.
- `toon-four`: four digits per hand, thumb plus three fingers.

For photo edits, preserve clear object contact over perfect digit count. If hands are partly hidden, do not invent visible extra fingers just to satisfy the count.

## Quality Rules

- `id` is lowercase kebab-case and matches the folder name.
- `required_traits` are concrete and visual, not vague praise.
- Reference images are role-labeled in the body when their use differs.
- `avoid` lists common drift risks: generic species, extra anatomy, wrong accessories, wrong age/presentation, or unwanted realism.
- No secrets, private contact info, credentials, or unrelated personal data belong in profiles.
