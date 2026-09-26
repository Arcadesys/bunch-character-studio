---
name: make-sticker-pack
description: Create a personalized ten-reaction sticker pack by interviewing for communication style, locking ten performances, blocking poses cheaply, repairing one sticker at a time, applying character references only after pose approval, and optionally publishing the final static set to Telegram.
---

# Make Sticker Pack

## Done State

Return a coherent set of ten useful reaction stickers that feel like the selected person or character, with each sticker independently reviewable and repairable. If Telegram publishing is requested and the local helper is available, publish the approved set and return the add-stickers URL.

## Core Rule

Do not begin with polished character art.

First learn how the subject communicates, then direct ten tiny performances, then block them cheaply, then apply the character reference, then publish.

The ten default semantic slots are:

| id | intent | default emoji |
| --- | --- | --- |
| yes | Yes / approval | 👍 |
| no | No / rejection | 👎 |
| applause | Praise / applause | 👏 |
| thanks | Thank you | 🙏 |
| sorry | Sorry / oops | 😬 |
| laugh | Laughter | 😂 |
| love | Love / affection | ❤️ |
| confused | Confusion / what? | ❓ |
| congrats | Congratulations | 🎉 |
| bye | Bye / goodnight | 👋 |

These are intents, not fixed gestures. Never assume a thumbs-up, bow, sign, text caption, or stock emoji pose is correct for the subject.

## Phase 1: Personality Interview

Start conversationally. Learn enough to direct the ten reactions without asking the user to fill out a giant form.

Useful dimensions:

- exuberant vs restrained
- theatrical vs deadpan
- affectionate vs reserved
- physical vs verbal communicator
- formal vs casual
- cultural gestures or etiquette
- signed language
- common facial expressions
- signature gestures, props, or phrases
- whether text belongs on stickers
- gestures or portrayals to avoid

If a connected private character source is available, use it only for the explicitly selected subject. Import appearance facts and references, but still interview for communication style unless those preferences are explicitly documented.

For Bunch / DIDdy-style private alter data, never infer the active subject from hosting/fronting state. Use only the alter the user explicitly names or selects.

When confident, summarize the communication profile in 3-6 bullets and say that you are ready to direct the ten performances.

## Phase 2: Prompt Board

Create one editable record per sticker.

Use this schema:

```csv
sticker_id,intent,emoji,performance,expression,gesture,framing,intensity,text,visual_notes,status,revision
```

Example:

```csv
thanks,Thanks,🙏,Signs THANK-YOU warmly,soft smile,ASL thank-you,chest-up,medium,,keep hands readable,draft,0
```

Present all ten together before generating art.

Each card/row should make clear:

- intent
- performance
- expression
- gesture
- framing
- intensity
- optional text

Ask for edits until the user approves the full board.

Do not silently swap the user's culturally or personally meaningful gesture for a generic stock pose.

State transition:

`DRAFT -> APPROVED_FOR_BLOCKING`

## Phase 3: Blocking Pass

Generate the cheapest useful visual test of the acting.

Blocking is for:

- silhouette
- gesture
- pose
- face direction
- expression read
- crop
- hand placement
- prop placement

Prefer:

- rough gesture drawing
- simple mannequin or generic toon body
- minimal line work
- flat or no shading
- plain background
- no polish
- no final costume detail
- no text unless text placement itself is the thing being tested

Do not use the final appearance reference yet unless body structure is essential to the pose, such as a tail, wings, mobility device, unusual anatomy, or species-specific gesture.

Generate each sticker as an independent asset with a stable `sticker_id`.

State transition per sticker:

`APPROVED_FOR_BLOCKING -> BLOCKED`

## Phase 4: Blocking Review

Show the ten blocking images together when the host UI permits.

Ask one question:

**Does each performance feel like how this person would react?**

Every sticker is independent. Never reroll the whole pack because one sticker is wrong.

For each sticker track:

```text
sticker_id
current_prompt
current_image
revision_history
approval_state
```

## Phase 5: Single-Sticker Repair

When the user dislikes one blocking image, repair only that sticker.

Carry forward:

- stable sticker ID
- current image
- existing prompt
- the user's requested correction
- relevant communication constraints

Default action: **Repair this sticker**

Escape hatch: **Regenerate this sticker from scratch**

Do not touch the other nine.

When possible use image editing / repair rather than a full redraw.

Examples of valid corrections:

- "Make the apology smaller and more embarrassed."
- "The hands are wrong; this should be ASL THANK-YOU."
- "Keep the pose but make the face deadpan."
- "The tail should carry the emotion instead of the arms."

State transition:

`BLOCKED -> REVISION -> BLOCK_APPROVED`

## Phase 6: Character Pass

Only after the acting is approved should the final appearance reference enter the workflow.

If the user has not supplied a reference, ask for one now.

If an explicitly selected connected character profile already provides approved references, use those with user authorization.

Compose each final prompt from:

```text
approved performance
+ approved blocking composition
+ character reference(s)
+ appearance invariants
+ rendering style
```

Preserve:

- identity
- species
- markings
- hairstyle / fur / feathers / scales
- clothing
- body type
- accessories
- tail / ear / wing anatomy
- paw style and finger count when defined
- any "do not change" constraints

The final render should preserve the approved acting. Do not let character-detail generation rewrite the pose.

State transition:

`BLOCK_APPROVED -> CHARACTER_RENDERED`

## Phase 7: Final Review and Repair

Return to the same ten independent sticker records.

Each sticker can be:

- approved
- repaired
- regenerated

A final repair should use `repair-furry-image` principles: change one named defect while preserving the rest.

State transition:

`CHARACTER_RENDERED -> FINAL_REVISION -> FINAL_APPROVED`

Pack is ready only when all ten are final-approved.

## Phase 8: Telegram Preparation

Prepare one manifest entry per final sticker:

```json
{
  "id": "thanks",
  "path": "/absolute/path/to/thanks.png",
  "emoji": "🙏"
}
```

The static-sticker helper accepts a JSON manifest with a top-level `stickers` array.

Example:

```json
{
  "stickers": [
    {"id":"yes","path":"/tmp/yes.png","emoji":"👍"},
    {"id":"no","path":"/tmp/no.png","emoji":"👎"}
  ]
}
```

Before publishing:

- use transparent backgrounds where appropriate
- ensure files are valid static Telegram sticker images
- keep each file's emoji metadata aligned to its semantic slot
- never publish a draft or unapproved sticker

## Phase 9: Telegram Publish

If the user asks to publish and the installed plugin can run local scripts, use:

```bash
node scripts/telegram-stickers.mjs create \
  --user-id <telegram-user-id> \
  --name <telegram-set-name> \
  --title "<human title>" \
  --input <manifest.json>
```

The helper reads `TELEGRAM_BOT_TOKEN` from the environment. Never ask the user to paste a bot token into chat and never print the token.

The helper uploads each file with `uploadStickerFile`, creates a static set with `createNewStickerSet`, and prints the final `https://t.me/addstickers/<name>` URL.

If the host cannot execute the helper, return the prepared manifest and exact next command without claiming publication succeeded.

## Completion UX

Primary completion message:

**Your sticker pack is ready.**

Then show:

- Telegram add-pack link if publication succeeded
- local/exported sticker files
- the final ten-row prompt/metadata table

Any creator-support or tip link belongs after successful delivery and must remain optional and non-gating.

## Accessibility Defaults

Prefer large readable silhouettes, clear hand shapes, strong pose readability, and no essential information conveyed only by tiny text or color. When a gesture has cultural or signed-language meaning, accuracy outranks decorative flourish.
