# Evidence assets

Files here are **never served directly** by Next.js (they are outside `/public`).
They are streamed only by `GET /api/ctf/evidence/[id]` and only with a valid,
single-use token (or a fresh token minted from the server-signed unlock proof).

Naming: `evidence_01` (displayed as `hints.jpg`) and `evidence_03`, with one of
these extensions, resolved in this order:

1. `.jpg`
2. `.jpeg`
3. `.png`

## Current contents

- `evidence_01.jpg` — the technical department (the hint), served as id 1 and
  displayed to the player as `hints.jpg`.
- `evidence_03.png` — the clean frame (id 3), served only after `final_photo`
  succeeds.

The retired `evidence_02.jpg` is archived in `archive/` (a subfolder the route
never scans), so id 2 returns 404 and the file is not part of the game anymore.

Metadata check: the live files were verified free of EXIF/XMP/eXIf/tEXt chunks
before being copied here. Keep it that way when replacing them.

`pnpm generate:evidence` writes throwaway placeholders to
`private-assets/placeholders/`; it never overwrites the real files above.
