---
name: make-tf-comic
description: Create a transformation (TF) comic or sequential fursona transformation with panel-by-panel staging, persistent character identity, readable lettering, and isolated panel repair. Use for TF sequences, human-to-anthro comics, species changes, transformation strips, and before/during/after comic pages.
---

# Make a Transformation Comic

## Deliverable

Create an ordered transformation comic with a stable subject, a legible change
across panels, and a final form matching the chosen character. Include a short
panel-by-panel text transcript. A storyboard or prompt board is an intermediate
deliverable; never call it a finished comic.

## Establish the brief

1. Resolve the starting subject, final character, and any attached references.
   Use existing character/style profiles and user answers before asking questions.
   Ask only when the subject or final form is ambiguous. For a real photo with
   multiple people, identify the selected subject before editing.
2. Separate starting-appearance, final-identity, style, setting, and pose image
   roles. Inspect local images before using them. Never invent access to private
   Bunch references or infer a subject from hosting or fronting.
3. Respect the requested transformation direction, mechanism, tone, panel count,
   dialogue, wardrobe treatment, and ending. Otherwise use four panels: baseline,
   first sign, unmistakable midpoint, completed transformation with a payoff.
   Default to playful wonder, intact clothing adapted to the final silhouette,
   minimal dialogue, and no gore. These defaults yield to explicit user direction.
4. Use the user's chosen style; otherwise use the final character's default style.
   Keep style distinct from anatomy and identity.

## Plan continuity

Use [panel-board.md](references/panel-board.md) to present a compact board.
List only visible changes at each step, plus traits that have already changed
and must remain. Give every panel one new story beat and one specific physical
reaction. A transformation must progress rather than present unrelated outfits
or four finished portraits. Honor intentional reversals only when requested.

Track ear replacement (no accidental human-plus-animal duplicates), muzzle,
fur/markings, hands and digit counts, legs/feet, tail attachment, proportions,
accessories, clothing, prop contact, and stage-specific exceptions to the final
profile. Do not apply all final traits to the baseline or midpoint. Do not add
a tail, horns, or wings absent from the selected final design.

Lock the environment, lighting direction, clothing colors/graphics, handedness,
props, and recognizable face/acting anchors. Permit deliberate camera and pose
changes in a drawn comic while tracking screen direction and spatial continuity.
For a photo-preserving sequence, default to a fixed camera, crop, background,
and other people; use localized subject edits. Ask about scope only if the
requested action requires restaging that locked photo.

## Block, render, and repair

1. If the user requested a finished comic, show the concise board and continue
   with reasonable defaults. Pause only for a material ambiguity or a requested
   approval checkpoint. If they asked for a script or board only, stop there.
2. Make a rough layout/blocking pass when staging is complex or requested.
   Check reading order, silhouette, pacing, and room for dialogue before polish.
   Skip blocking when the user requests a direct final pass or the strip is simple.
3. Prefer independent numbered panel assets, using the same identity references
   throughout. Attach the approved prior panel as continuity guidance when useful,
   while retaining the original identity reference to avoid cumulative drift.
   Generate a whole page directly only when suitable; do not claim separate panel
   files exist if the tool returned a single image.
4. Prompt each panel with its ID, current transformation state, newly changing
   trait, held traits, action, camera, environment, image roles, and exact text.
   Final-identity references describe the destination, not the current stage.
   Honor higher-level image tool requirements for generation and editing.
5. Validate progression and continuity against the board. Repair only the failed
   panel or named region, holding approved neighbors and all unrelated details.
   A panel-3 tail repair must not silently regenerate panels 1, 2, and 4.
6. Assemble the requested page or strip using available supported tools. Default
   to a clearly ordered 2-by-2 page for four panels; offer a vertical strip for
   phone reading. Use large high-contrast lettering and spacious gutters. If
   exact lettering fails, fix it or deliver clearly labeled unlettered art with
   the exact script; do not pretend misspelled text is correct. Keep speech
   bubbles clear of faces, hands, and the transformation itself.
7. Return the comic and a concise accessible transcript in reading order. Name
   any unresolved defect. Request one compact review of progression, continuity,
   acting, and readability after the requested batch; do not interrupt every
   panel with the ordinary single-image scorecard unless the user wants that.

Record eligible source/output evidence through `record-eval-trace` when the host
provides actual source/output files and the exact prompt. Use the original photo
for photo edits and the immediate parent for repairs. Never substitute the
finished image for a missing source or fabricate a receipt. Without local tools,
finish with the available image output and transcript and state the limitation
briefly when relevant. Do not save generated comic images as new character canon
without an explicit request.
