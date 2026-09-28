---
id: character-id
display_name: Character Name
species: human, species, or hybrid species
required_traits:
  - approved colors and markings
  - face, hair, anatomy, and silhouette
  - required markings, outfit, accessories, or silhouette
avoid:
  - generic identity drift
  - missing required markings or accessories
  - extra limbs, tails, wings, horns, or ears
reference_images: []
---

# Character Name

Replace this template with one reusable character identity. Add reference images to `references/`, then list them in `reference_images`.

Keep this profile about identity only. Rendering choices belong in `assets/styles/`.
Add `body_type`, `default_style`, `paw_style`, and `finger_count` only when they are known and relevant.

## Reference status

List each approved identity reference, its role (model sheet, detail, or wardrobe), and who approved it. Keep candidates separate until reviewed.

## Model sheet and construction

Record approved front, three-quarter, side, and back views; palette; proportions; anatomy; silhouette; wardrobe; and accessories. Mark unknown details as unknown rather than inventing them.

## Acting library

Describe characteristic expressions and gestures as visible actions.

## Never list

Record concrete identity failures to avoid. Keep actual failed images in `failures/`.

## Evaluation evidence

Customize `evals/cases.md` for this character. Keep only creator-approved results in `goldens/` and observed failed results in `failures/`. Record model, exact prompt, source references, and related case for each image. These examples do not silently change canon.

`paw_style` options:

- `human-like-hands`: human hand shape, fur or markings allowed, nails may remain nail-like.
- `hybrid-hands`: expressive anthro hands with subtle paw traits, short claws or claw-like nails, optional small pads only when palms are visible.
- `full-paws`: clearly paw-like hands with pawpads, claws, thicker digits, and less human nail structure.

`finger_count` options:

- `auto`: choose what fits the character, style, and source pose.
- `five`: five digits per hand, including thumb.
- `toon-four`: four digits per hand, thumb plus three fingers, common for cartoon/toon styles.
