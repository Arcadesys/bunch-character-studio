# Preview validation — 0.2.0-preview.1

Prepared November 16, 2026, from public revision
`cb3113081e8d5b7faf913b888cf01376a3c73b8e`, with the TF comic workflow and
user-package additions in this preview.

- All eight Python release-contract checks passed: marketplace wiring, manifest,
  mirrored package, skill metadata, profiles, and helper entry points.
- Twelve Node unit checks passed across the sticker helper, judge pipeline, and
  checksum-backed eval recorder.
- The comic workflow was exercised independently on a script-only four-panel
  human-to-fox request with exactly two ears and no tail. Its board retained
  wardrobe, coffee mug, setting, intermediate anatomy, and final-form constraints.
- The Project instructions are under 8,000 characters.
- The ZIP builder verifies archive integrity and exact included bytes, includes
  per-file SHA-256 checksums, and selects the public plugin and Project companion.

The full `make test` run was attempted but stopped because this environment
blocks loopback listeners used by the optional private bridge integration tests
(`EPERM`). The recorder's TypeScript integration runner was also blocked from
creating its IPC socket. Those integration checks remain unverified here.

This is a shareable preview. No new image-generation trial, external Telegram
publication, authenticated Bunch integration, or fresh-host plugin installation
was performed. A script-only workflow check does not establish visual fidelity.
No public release was created by building this archive.
