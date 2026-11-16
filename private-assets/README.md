# Evidence assets

Files here are **never served directly** by Next.js (they are outside `/public`).
They are streamed only by `GET /api/ctf/evidence/[id]` and only with a valid,
single-use token.

Naming: `evidence_01`, `evidence_02`, `evidence_03` with one of these extensions,
resolved in this order:

1. `.jpg`
2. `.jpeg`
3. `.png`

## Current contents

`evidence_01.png`, `evidence_02.png`, `evidence_03.png` are generated placeholders:

```bash
pnpm generate:evidence
```

- `evidence_01` — heavy blur (unusable silhouette)
- `evidence_02` — partial blur (recognisable shape)
- `evidence_03` — sharp

## Using real photos

Delete the generated PNG files and drop `evidence_01.jpg`, `evidence_02.jpg`,
`evidence_03.jpg` here. JPEG is preferred by the route, so no code change is needed.

Bake the blur into the image itself (the first two frames must stay unreadable);
never rely on CSS blur, it can be removed from the browser.
