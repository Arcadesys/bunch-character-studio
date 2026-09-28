---
name: transform-diddy-alter
description: Transform an attached snapshot into one explicitly named private DIDdy alter (for example, "Make me Melody Arcade") using selected appearance references without exposing them in prompts or changing presence.
---

# Transform DIDdy Alter

## Done State

Return a user-selected transformation of the attached snapshot, using the exact
named alter's approved private appearance references, with an eval receipt and
an optional, explicit private-gallery keeper receipt. This workflow never
infers or changes hosting, fronting, or a profile picture.

## Required boundary

- The user must attach the snapshot and explicitly name the alter. Resolve the
  literal name or alias with DIDdy; do not guess from conversation context.
- `prepare_furry_transform` supplies only benign alter context in tool output.
  Its selected reference URLs and capabilities are private metadata, never
  prompt text, shell arguments, tool text, transcripts, or user-facing output.
- DIDdy remains the authority for alter data and selected appearance references.
  Do not copy private DIDdy profiles, notes, or photos into this plugin's
  profiles or public assets.
- This skill routes image work to `transform-person-to-character`; do not
  replace its composition, preservation, anatomy, or prompt rules.

## Private handoff workflow

1. Confirm that an edit target snapshot is attached and that the user named one
   alter. Call `prepare_furry_transform` for that exact name. If references are
   unavailable or the host cannot read tool metadata programmatically, report
   `HOST_ADAPTER_REQUIRED` and stop; preparation alone is not a transformation.
2. Start the installed helper in a PTY with echo disabled:

   ```bash
   stty -echo; node <installed-plugin-root>/scripts/diddy-bridge.mjs
   ```

   Programmatically write one newline-terminated metadata manifest to stdin:
   `{ "action": "materialize", "referenceMedia": [...] }`.
   Never paste or log that manifest. The helper emits only private local paths
   and a temporary directory.
3. Inspect the snapshot and the local reference paths. Label the snapshot as
   `edit target` and those paths as `character reference` inputs. Follow
   `transform-person-to-character` exactly for prompt construction, editing,
   preservation checks, and scorecard. The selected DIDdy appearance notes are
   character-lock facts; do not turn a generic species guess into a profile.
4. Before removing references, run `record-eval-trace` with the actual snapshot
   as source, generated local image as output, and exact sent prompt. Return its
   receipt. If editing or recording fails, report that honestly.
5. In a finally path, start the helper again and programmatically send
   `{ "action": "cleanup", "directory": "..." }` followed by a newline.
   Cleanup applies after the trace attempt, whether it succeeded or failed.

## Explicit keeper save

Only if the user selects a generated result to keep:

1. Call `prepare_furry_result_upload` with the exact resolved alter ID, a fresh
   request ID, filename, and JPEG/PNG/WebP content type. Its metadata is bound
   to that owner, alter, and request.
2. Run the installed helper in a no-echo PTY and programmatically send one
   metadata manifest containing `action: "save"`, the endpoint/capability,
   selected alter ID, and the chosen generated local file path. Configure
   `DIDDY_PUBLIC_ORIGIN` only with DIDdy's public origin before invoking it.
3. Report only the benign keeper receipt. A successful save writes the private
   gallery; it never promotes a profile picture or changes hosting/fronting.
   Replaying the same request and bytes is safe; a changed result for that
   request conflicts and requires a fresh user-approved request ID.

Never save a result merely because it was generated. Never claim a real
transformation without a real user snapshot and a host that completed the
metadata-to-attachment handoff.
