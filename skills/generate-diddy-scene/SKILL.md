---
name: generate-diddy-scene
description: Generate a fresh private multi-character scene from explicitly named DIDdy alters using their canonical selected references through a metadata-safe local handoff.
---

# Generate DIDdy Scene

## Done State

Return a newly generated scene using every explicitly named alter's canonical
selected reference, with the resolved canonical identities and prompt matched
to local attachments. This never infers or changes hosting, fronting, or a
profile picture.

## Required boundary

- Call `prepare_furry_scene` with the exact `alterNames` and requested scene.
  Proceed only when its full tool result has `isError !== true`,
  `structuredContent.ready === true`, and status `READY` or `PREPARED`.
- The public structured content must contain `prompt` and ordered `identities`
  with `alterId`, `alterName`, and `referenceImageId`. `_meta.referenceMedia`
  contains the corresponding private `src` values and is never placed in a
  prompt, shell argument, transcript, user-facing output, or callback input.
- Require exactly one `character_reference` per canonical identity, matching
  alter ID, alter name, and reference image ID. Missing, duplicate, or
  mismatched references are a preparation failure.

## Codex host handoff

When the host exposes the full tool result to programmatic orchestration:

1. In a no-echo PTY, start the installed `scripts/diddy-bridge.mjs`. Write a
   newline-terminated `materialize-scene` manifest whose `toolResult` is the
   complete prepared result held in memory. The helper validates ready/status,
   identity IDs/names/image IDs, and each capability URL path before download.
   Do not print or serialize the manifest into model-facing text.
2. Read the benign response: `references` maps each canonical alter ID, name,
   image ID, and content type to one local `path`. Confirm it exactly matches
   the structured identities, then inspect every local reference. Follow
   `../generate-character-image/SKILL.md` for the scene brief, prompt,
   composition, low-vision default, authorship checks, and creator scorecard.
   Attach every local path as a character reference to the fresh image-
   generation call, and use only the canonical public `prompt` for that call.
3. Generate the scene. A host with an in-process callback can instead call
   `generatePreparedFurryScene({ toolResult, generateScene })` from the helper;
   it performs the same validation, passes only local mapping plus canonical
   prompt/identities to the callback, sanitizes callback errors, and cleans up
   in `finally`. In that callback path, run `record-eval-trace` before the
   callback returns, while the participating local references still exist.
4. Before cleanup, run `record-eval-trace` with an actual participating local
   reference as source, the generated local image as output, and the exact
   generation prompt. Then, in a finally path, send `cleanup` with the returned
   temporary directory. Report success only after a real generation returns a
   local output and the trace outcome is known. Do not treat scene preparation,
   materialization, or a test callback as generated art.

If the active host cannot access `_meta` programmatically or cannot attach all
local references to the generation call, report `HOST_ADAPTER_REQUIRED` and
the unavailable capability. Do not claim that an image was generated.
