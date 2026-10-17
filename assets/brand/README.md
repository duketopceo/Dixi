# Dixi brand assets (proposal)

Status: **proposal, owner sign-off pending.** Hand-written SVG, no raster source, no stock icons.

## Construction

- Grid: 64 x 64. Mark = four calibration corner brackets (stroke 5, round caps, 2-unit corner radius,
  inset 6) around a single filled dot (r 8) at centre.
- Meaning: the brackets are Dixi's four-point calibration targets (the projected surface); the dot is the
  fingertip cursor. The mark is the product's one interaction, "point at a surface".
- Wordmark: D, I, X, I drawn as 6-unit strokes with round caps on a 40-unit cap height (no font needed,
  `wordmark.svg` uses `currentColor`).
- Legibility: `mark-16.png` is the 16 px render; brackets stay 1.25 px, dot stays 4 px across.

## Colour

| Role | On light | On dark |
|---|---|---|
| Brackets / wordmark | `#0B1316` | `#E8F4F5` |
| Dot | `#00727A` | `#00F5FF` |

Contrast of dot vs. background: 5.33:1 (light), 14.83:1 (dark).

## Files

`mark.svg` (follows `prefers-color-scheme`; used as the app favicon), `logo.svg` / `logo-dark.svg`
(mark + wordmark), `wordmark.svg`, `social-card.svg` (1280x640), PNG previews rendered with `resvg` and
optimised with `oxipng`.
