#!/usr/bin/env node
// Development entry point. The installable package owns the implementation.
import { main } from "../plugins/bunch-character-studio/scripts/diddy-bridge.mjs";
export { generatePreparedFurryScene } from "../plugins/bunch-character-studio/scripts/diddy-bridge.mjs";

void main().catch(() => {
  process.stderr.write("DIDdy bridge failed.\n");
  process.exitCode = 1;
});
