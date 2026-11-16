# Bunch: Character Studio

**Your character. Across pictures, transformations, stickers, and comics.**

Formerly Furry Image Studio. This is a collection of character-art workflows
for Codex and ChatGPT, with reusable character and style profiles. It uses your
host's image generation/editing capabilities; access and usage limits come from
that host. The core workflow needs no separate image API key or Bunch account.

## Choose your setup

### ChatGPT web or mobile

1. Create a ChatGPT Project called **Bunch: Character Studio**.
2. Upload `chatgpt/PROJECT_LIBRARY.md` as a Project file.
3. Open `chatgpt/PROJECT_INSTRUCTIONS.md` and paste the text inside its code block
   into Project instructions.
4. Start a chat in the Project, attach your character references, and try a
   prompt below. Use the same Project from the mobile app.

The Project companion supports creative work. Local evaluation scripts and
Telegram publishing require a suitable desktop setup or connected tools.

### Codex / ChatGPT Desktop with Codex plugins

Extract this package to a folder you will keep. In a terminal, change into the
extracted `bunch-character-studio` folder, then run:

```sh
codex plugin marketplace add "$PWD"
codex plugin add bunch-character-studio@bunch-character-studio
codex plugin list
```

Open a new task to load the installed skills. The local package includes the
comic workflow; installing from the public repository will include it only
after that update is published. If `codex` is unavailable, use the Project
setup above. Existing installations can remove and add this plugin to refresh
the cache; keep personal profiles outside the installed cache before doing so.

## Try it

**Add your character:**

> Help me define my character from these references. Capture the traits that
> must stay consistent, and keep identity separate from the rendering style.

**Transform a photo:**

> Turn the person on the left into my character in Toon in Real World style.
> Preserve the photo, clothing, pose, objects, and everyone else.

**Make a TF comic:**

> Make a four-panel comic of me turning into my fursona while trying to finish
> my coffee. Playful surprise, intact clothing, no dialogue. Keep the cafe and
> mug consistent. Show clear intermediate stages and finish with a payoff.

**Make stickers:**

> Make me a personalized ten-reaction sticker pack. Interview me about how I
> communicate, block the acting first, then apply my character references.

**Repair a panel:**

> Fix only panel 3: the tail should attach at the pelvis. Keep the other panels,
> expression, clothing, framing, and lettering unchanged.

## What to expect

- Character references guide identity; styles guide rendering.
- Comic boards track the transformation state so features do not appear early
  or disappear between panels. You also receive a text transcript.
- Image consistency is a goal that requires review and sometimes repair.
- Add or update your own character library explicitly. Chat history alone is
  not a durable replacement for a saved profile.
- Optional Bunch private references require an authenticated connector and a
  compatible host. Optional Telegram publishing requires separate configuration.

Included: ten desktop skills, character/style templates and public example
profiles, local helper scripts, and the ChatGPT Project companion. Personal
photo galleries, private evaluation runs, credentials, and development
dependencies are excluded.

Source and development documentation:
https://github.com/Arcadesys/bunch-character-studio

This preview adds the TF comic workflow to public source revision
`cb3113081e8d5b7faf913b888cf01376a3c73b8e`. See `PACKAGE_INFO.json` for versions
and `SHA256SUMS.txt` for per-file checksums.
