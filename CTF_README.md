# IGC CTF – THE INSIDER THREAT

> A browser-based Capture The Flag experience built on a simulated macOS desktop.
> Players investigate an internal security breach at IGC by navigating a fake
> filesystem, decrypting archives, and following clues left behind by the insider.

---

## Overview

**Scenario:** IGC's internal network was compromised from the inside. Players assume
the role of a security investigator tasked with uncovering the identity of the
insider threat. Progress is gated behind password challenges. The experience runs
entirely in the browser; **every answer is verified server-side** in
`POST /api/ctf/verify` and no answer, hash or clue-to-answer mapping is shipped in
the client bundle.

**Tech stack:** Next.js 14 (App Router) · React 18 · Zustand (persist) · Tailwind CSS · framer-motion

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and replace every `REPLACE_ME_*` value.
`.gitignore` ignores `.env*` and keeps only the example file tracked, so the example
must never contain a real answer.

| Variable | Challenge | Description |
|---|---|---|
| `CTF_LOGIN` | `login` | Founding year of IGC (stage 1, lockscreen) |
| `CTF_CLASSIFIED` | `classified_file` | Password obtained by decrypting the encrypted archive |
| `CTF_CONFIDENTIAL` | `confidential_data` | Data provided by the telecom operator |
| `CTF_DATE` | `three_fields` | Date of the attack, `DD/MM` (e.g. `15/10`) |
| `CTF_TIME` | `three_fields` | Time of the attack, `HH:MM` (e.g. `20:04`) |
| `CTF_LOCATION` | `three_fields` | Room, pipe-separated accepted variants (`room A\|salle A`) |
| `CTF_TECH_ASSISTANT` | `final_photo` | Full name of the IGC technical assistant |
| `CTF_PROOF_SECRET` | – | Server-only HMAC key for unlock proofs (falls back to `CTF_TECH_ASSISTANT`) |
| `TRUST_PROXY` | – | Set to `1` only behind a trusted reverse proxy (see rate limit below) |

> [!CAUTION]
> Never commit `.env.local`. It contains the real answers.

---

## Game Flow

```
Stage 1 ─► 2 ─────► 3 ────────────► 4 ──────────────► 5 ─────────► 6 ────────► 7
 Login    Desktop  classified_file  confidential_data  Vault solves  Log read   Final photo
```

| Stage | Unlocked by | What becomes visible |
|---|---|---|
| 1 | – | Lockscreen (`CTF_LOGIN`) |
| 2 | Login | Desktop, `instagram_account.txt`, `classified_file.txt` (locked) |
| 3 | `CTF_CLASSIFIED` on `classified_file.txt` | `Classified/` folder (sidebar + Finder) |
| 4 | `CTF_CONFIDENTIAL` on `confidential_data.txt` | Password Vault app (opens automatically, and in the Dock) |
| 5 | Vault: date + time + location | `Logs/last_activity.log` |
| 6 | Opening / `cat` the log | `.evidence/` folder (stage 6) |
| 7 | `CTF_TECH_ASSISTANT` on `evidence_03.jpg` | The photo, download, victory screen |

### Stage details

1. **Lockscreen.** The app boots to an Apple-style boot then an IGC lockscreen.
   The desktop is unlocked with the IGC founding year.
2. **Desktop.** The Finder exposes `Documents/`.
   `classified_file.txt` carries a lock badge: its content never renders until the
   password is accepted.
3. **Classified.** Solving `classified_file` reveals the hidden `Classified/` folder
   with `phone_number.txt` (readable) and `confidential_data.txt` (locked), and shows
   the first hacker popup.
4. **Operator.** `confidential_data.txt` needs the data given by the telecom operator
   after the team identifies the real name (Truecaller). Solving it opens the
   **Password Vault** window.
5. **Vault.** Three simultaneous fields with their in-game clues:
   - Date — *"The day I decided to attack the IGC system was a special day for
     Tunisians... Eid Jala2."*
   - Time — *"Remember the last time Tunisia won the Africa Cup of Nations. Convert
     that year into a time."*
   - Location — *"I didn't attack the system from outside. I was sitting where I was
     interviewing new members (ED25). Where was I?"*
   Success writes `Logs/last_activity.log`. A wrong submission shakes and answers
   "Access denied".
6. **Evidence trail.** The log points at `/home/igc/.evidence/`. In the Terminal,
   `ls` hides dot-files, `ls -a` / `ls -la` reveal them, and `cd .evidence` works.
   In the Finder the folder only appears with the hidden-files toggle.
7. **Final photo.** Photos lists `evidence_01` and `evidence_02`; `evidence_03` is
   locked. The name of the IGC technical assistant unlocks it. On success the image
   is fetched with a single-use token, a large **TAKE ME TO THE PRESIDENT** banner
   appears with a Download button, and the case is marked closed.

---

## Hidden files

| Action | Shortcut |
|---|---|
| Show / hide dot-files (Finder, Desktop, sidebar) | `Ctrl`/`Cmd` + `Shift` + `.` |
| Terminal | `ls -a`, `ls -la`, `cd .evidence` |

Hidden items are filtered **and** removed from search results, and a locked file's
content is never rendered: the item only opens after the server accepts the answer.

---

## Security model

- **Server-side verification only.** Answers live in `.env.local` and are compared in
  `src/app/api/ctf/verify/route.ts`. Nothing is imported into client components.
- **No client-side hash or fallback.** The old lockscreen SHA-256 path has been
  removed: the only way to unlock is the API. There is no offline oracle.
- **Rate limit.** 10 attempts/min per challenge per client when `TRUST_PROXY=1`
  (`x-real-ip`, then first `x-forwarded-for` entry); otherwise the socket IP is used
  with a larger 30/min per-IP budget, and there is no shared `unknown` bucket. The
  vault's `three_fields` challenge keeps a separate bucket per field, so a wrong date
  never eats the time or location budget. Expired buckets are purged; exceeding the
  limit returns `429` with `Retry-After`. In-memory: use Redis if you scale out.
- **One-time evidence tokens.** `src/lib/ctf-tokens.ts` stores tokens with a 5-minute
  TTL scoped to evidence ids. Each `(token, id)` pair can be served exactly once; the
  token disappears when its ids are exhausted. The vault issues a token for
  `evidence_01`/`evidence_02`, the final photo issues a token for `evidence_03` only.
- **Unlock proof + IndexedDB.** `final_photo` also returns an opaque HMAC-signed,
  24-hour proof (`src/lib/ctf-proof.ts`). After F5 consumes the original token, the
  client exchanges that proof at `POST /api/ctf/proof` for a fresh single-use token —
  no password re-entry. Large images are cached in IndexedDB (`src/lib/evidence-store.ts`)
  so they survive a refresh too. The proof contains no answer or answer hash.
- **Images outside `/public`.** Evidence lives in `private-assets/` and is streamed by
  `/api/ctf/evidence/[id]` only with a valid token (`Cache-Control: no-store`).
  The route accepts `.jpg`, `.jpeg` and `.png` and prefers JPEG, so real photos can be
  dropped in place of the generated placeholders.

---

## Evidence placeholders

```bash
pnpm generate:evidence
```

Writes `private-assets/evidence_01.png` (heavily blurred), `evidence_02.png`
(partially blurred) and `evidence_03.png` (sharp) with no external dependency.
To use real photos, delete those files and drop `evidence_01.jpg`,
`evidence_02.jpg`, `evidence_03.jpg` in the same folder — the route picks JPEG first.
Blur must be baked into the image, never applied with CSS.

---

## Reset between teams

Press `Ctrl` + `Alt` + `R` first. `Ctrl` + `Shift` + `R` also works, but Chrome and
Firefox reserve it for a hard reload, so prefer `Ctrl` + `Alt` + `R`. A confirmation
modal appears; confirming:

- resets the CTF store (stage 1, no unlocks, no popups, no evidence),
- rebuilds the virtual filesystem,
- closes every window,
- clears cached evidence images (memory + `igc-evidence` IndexedDB),
- clears the `igc-session` sessionStorage flag,
- returns to the lockscreen.

Manual equivalent in DevTools → Application:

1. `localStorage`: delete `ctf-storage`, `macos-filesystem-storage`
   (optionally `desktop-storage`, `mac-dock-storage`).
2. `sessionStorage`: delete `igc-session`.
3. Hard refresh.

---

## Storage keys

| Key | Storage | Content |
|---|---|---|
| `ctf-storage` | localStorage | stage, unlocks, popups, tokens, unlock proof, small evidence images |
| `igc-evidence` | IndexedDB | large evidence images that exceed the localStorage limit |
| `macos-filesystem-storage` | localStorage | virtual filesystem |
| `desktop-storage` | localStorage | wallpaper / theme preferences |
| `mac-dock-storage` | localStorage | dock order |
| `igc-session` | sessionStorage | unlocked desktop for this tab |

Both persisted stores carry a `version` and a `migrate` function: visitors with an
older `localStorage` get the new CTF tree on next load, while files they created
themselves are preserved.

---

## Full test walkthrough

1. `pnpm install`, fill `.env.local`, `pnpm dev`.
2. **Stage 1** — wrong password → "Incorrect Password"; correct `CTF_LOGIN` → desktop.
   Refresh the tab: still unlocked (sessionStorage). New tab: lockscreen again.
3. **Stage 2** — Finder → `Documents`: `classified_file.txt` shows a lock badge.
   Double-click → password modal, **no file content anywhere**.
   `.evidence` and `last_activity.log` are absent.
4. **Stage 3** — Enter `CTF_CLASSIFIED` → content opens, `Classified/` appears in the
   sidebar, hacker popup #1 appears once.
5. **Stage 4** — `classified_file` → `Classified/phone_number.txt` readable; open
   `confidential_data.txt`, enter `CTF_CONFIDENTIAL` → Vault window opens, dock icon
   appears, hacker popup #2.
6. **Stage 5** — Vault: `CTF_DATE`, `CTF_TIME`, `CTF_LOCATION` → success animation,
   `Logs/last_activity.log` appears.
7. **Stage 6** — hacker popup #3 ("Find me if you can..." then "Connection
   terminated...") appears at stage 5. Open the log (cat or Finder) → stage 6.
   Terminal: `ls` hides `.evidence`; `ls -a` shows it; `cd /home/igc/.evidence`
   works; `ls -a` lists the three images.
8. **Stage 7** — Photos: `evidence_01`/`02` load through the API. `evidence_03` asks
   for `CTF_TECH_ASSISTANT`; success shows the image, **TAKE ME TO THE PRESIDENT**,
   Download, and a discreet victory banner.
9. **Rate limit** — 11 wrong answers on one challenge within a minute → `429`.
10. **Reset** — `Ctrl`+`Alt`+`R` (or `Ctrl`+`Shift`+`R`) → modal → confirm → lockscreen, empty VFS, no popups.
11. **Token reuse** — replaying a consumed `/api/ctf/evidence/…?token=…` URL → `403`.
12. **Build** — `pnpm build` and `npx tsc --noEmit` pass.

---

## Test from stage 3 to 7

Short regression checklist (run after any stage change):

- [ ] `Ctrl`+`Alt`+`R` → confirm → lockscreen, fresh state (no unlocks, no VFS changes, no cached evidence images).
- [ ] Stage 3 — `classified_file.txt` opens PasswordModal from Finder, Desktop and Terminal (`cat`, `open`, `unlock`); no content before success. Wrong answer shakes + "Access denied", no stage change. Correct answer shows content, popup 1 once, Classified in sidebar (badge `2`) and in `ls /home/igc`. F5 keeps the unlock.
- [ ] Stage 4 — `phone_number.txt` readable; `confidential_data.txt` locked on every surface. Correct answer opens the Vault, shows popup 2 once as a non-blocking toast, and makes the Vault dock icon available.
- [ ] Stage 5 — three clues shown; wrong submission shakes with no field hint; success leaves `Logs/last_activity.log` visible in Finder/Terminal/sidebar with the exact content; popup 3 once; message says "check the Logs folder".
- [ ] Stage 6 — `ls /home/igc` hides `.evidence`; `ls -a` / `ls -la` show it; `cd /home/igc/.evidence` works; Finder reveals it only with Ctrl/Cmd+Shift+.; reading the log advances to stage 6 once.
- [ ] Stage 7 — 01/02 load through the protected API; 03 needs the clue; success shows the image, TAKE ME TO THE PRESIDENT, a working Download, `completed=true`, no new popup.
- [ ] F5 on the final photo — image still loads without re-entering the password; repeat with a small PNG and a >1 MB JPEG.
- [ ] Wrong answers refused; 11 wrong answers in a minute → `429`; normal play never refused.
- [ ] `grep -R 'CTF_' .next/static` finds no names, answers or hashes; `pnpm build` and `npx tsc --noEmit` pass.

---

## Files of interest

```
src/app/api/ctf/verify/route.ts        server answers + rate limit + tokens
src/app/api/ctf/evidence/[id]/route.ts one-time evidence streaming
src/lib/rate-limit.ts                  IP/challenge buckets
src/lib/ctf-tokens.ts                  scoped single-use tokens
src/lib/ctf-visibility.ts              stage gate + dot-file toggle
src/lib/ctf-actions.ts                 unlock → stage transitions
src/stores/ctfStore.ts                 stage machine (v2)
src/stores/fileSystemStore.ts          VFS with revealStage (v2)
src/components/ctf/PasswordModal.tsx   password prompt
src/components/ctf/PasswordVault.tsx   three-field vault (stage 5)
src/components/ctf/HackerPopup.tsx     hacker alerts
scripts/generate-evidence.js           placeholder evidence generator
private-assets/                        evidence files (not served directly)
```
