# Dixi design direction: Lightfield

Written without the `refero-design` skill's live reference tooling (not run in this pass); references below are
those found in `docs/research/2026-10-10-landscape.md` plus the product's physics.

## Reference lock
- Physics: a projector emits light; black is "no light", so the wall shows through. UI must be luminous shapes on black, never dark-grey panels that read as a washed rectangle. (Decision: `--lf-bg #05080A` near-black, no large filled grey surfaces.)
- Reach, not mouse: [LUMOplay](https://www.lumoplay.com/) floor/wall apps use large, high-contrast targets. (Decision: 160 px cards, 64 px dock items, 12 px minimum label size.)
- Viewing distance: text is read at 1-3 m. (Decision: body 15 px minimum on the launcher, muted text still above 9:1.)

## Decision ledger
| Decision | Why | Rejected |
|---|---|---|
| Dark-first, light only for docs | projection | glassmorphism blur panels (wash out on walls) |
| One accent, cyan `#00F5FF` | it already exists in the app; max contrast on black | purple gradient of the old favicon |
| Corner brackets + dot as the mark | it is the 4-point calibration and the cursor | hand icon (cliché) |
| No gradients, no glow except hover on cards | glow bleeds on real projectors | neon glow everywhere |

## Tokens
| Token | Dark (projected) | Light (docs) | Contrast on bg |
|---|---|---|---|
| `--lf-bg` | `#05080A` | `#F4F8F9` | |
| `--lf-text` | `#E8F4F5` | `#0B1316` | 17.9 / 17.6 |
| `--lf-text-muted` | `#9FB4B8` | `#4A5F64` | 9.3 / 6.3 |
| `--lf-accent` | `#00F5FF` | `#00727A` | 14.8 / 5.3 |
| `--lf-ok` | `#00FF87` | `#007A45` | 15.0 / 5.1 |
| `--lf-warn` | `#FFB800` | `#8A5A00` | 11.6 / 5.5 |
| `--lf-err` | `#FF4D8D` | `#C2185B` | 6.4 / 5.5 |

All text pairs meet WCAG AA (4.5:1). The old error pink `#FF006E` was replaced by `#FF4D8D` for legibility on black.
Tokens are live in `packages/frontend/src/index.css`.

## Type
System UI stack (no webfont load: kiosks are often offline). Scale: 44 wordmark, 18 card title, 15 body, 13 secondary, 12 minimum. Weight 600 for labels, 700 for the wordmark. Monospace (`SF Mono`/Consolas) for numbers in the HUD.

## Icon and glyph style
Stroke 5 on a 64 grid, round caps, 2-unit corner radius, no fills except the cursor dot. Scene glyphs stay simple geometric Unicode until the Scene SDK (U5) lets each scene ship an SVG.

## Motion
120 ms, `cubic-bezier(0.2, 0, 0, 1)`, transform and shadow only. `prefers-reduced-motion` collapses all transitions (implemented in `index.css`). Cursor and content tracking is never eased; latency beats smoothness.

## Surfaces
1. Projected canvas (Launcher, Dock, scenes, calibration overlay): the primary surface.
2. VisionHUD / camera preview: operator-facing, small, bottom-left.
3. README and docs: light or dark logo via `<picture>`.
4. Favicon: `assets/brand/mark.svg`.

## Audit and status
- Done in this PR: tokens, focus-visible rings (3 px cyan), reduced-motion, Launcher and Dock restyled onto classes (`shell.css`) with `aria-current` and a dialog role, new favicon and launcher mark. Muted text raised from 0.6-0.65 opacity white to `#9FB4B8`.
- Remaining: VisionHUD, CalibrationOverlay, DrawScene and the legacy HUD still use inline hex values; migrate when touched (U1/U5).
- Screenshots: `docs/design-shots/launcher-{before,after}.png` (headless Chromium, fake camera, so scene cards show their disabled state).
