# ChatGPT Web Quickstart

Furry Image Studio can run on ChatGPT web without a local Codex plugin.

## One-time setup

1. Create a ChatGPT Project named **Furry Image Studio**.
2. Upload `PROJECT_LIBRARY.md` to that Project.
3. Paste `PROJECT_INSTRUCTIONS.md` into the Project instructions.
4. Start image work inside that Project.

That gives the web client the same character/style rules for ordinary image
generation, photo transformation, repair, and personalized sticker packs.

## What web mode can do

- generate new character art with ChatGPT Images
- edit an attached photo into a character
- repair one named defect while preserving the rest
- run the ten-reaction sticker interview
- show and revise the ten prompt records
- generate cheap blocking poses
- repair one sticker without rerolling the other nine
- apply a final character reference after blocking is approved
- prepare Telegram-ready sticker metadata

## What web mode does not assume

A normal ChatGPT web Project does not automatically have:

- local plugin scripts
- local filesystem paths
- the Telegram publishing helper
- the local eval recorder

When those are unavailable, stop at an exportable manifest rather than claiming
publication or local trace recording succeeded.

## Sticker starter

Paste this into a chat inside the Project:

```text
Make me a personalized ten-reaction sticker pack.

Do not generate polished character art yet. Interview me first about how this
person actually communicates, then propose the ten reaction performances
together for approval. Once I approve them, make a cheap blocking pass. Treat
each sticker independently so I can repair one without changing the other nine.
Ask for or use my character reference only after the blocking poses are right.
```

The default semantic slots are:

1. Yes / approval
2. No / rejection
3. Applause / praise
4. Thanks
5. Sorry / oops
6. Laugh
7. Love / affection
8. Confused / what?
9. Congrats
10. Bye / goodnight

These are meanings, not mandatory gestures.

## With Bunch connected

If Bunch is available in the same chat, explicitly name the person whose pack
you want. Furry Image Studio should use Bunch's saved direction board when one
exists and use the person's private appearance references only for the final
character pass.

Example:

```text
Use Bunch to make Tally Arcade's sticker pack. Load her saved reaction board if
there is one. Block the poses first, then use her approved Bunch appearance
references for the final renders.
```

Never choose a person merely because they are hosting or fronting.
