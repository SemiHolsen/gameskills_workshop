# Bobby's Boom Band

Workshop project (Game Skills, day 2): a single-screen 16:9, 16-bit arcade rhythm game.

- **Audience:** Pre-School · All genders · Noise
- **Genre:** Music - Abstract
- **Platform:** Arcade – 1980s cabinet

## Play

Open `index.html` in a browser. It is fully self-contained (images and code are inlined).

- Pick a band member: **Spike** (guitar), **Paws** (drums) or **Capy** (synth).
- Press **Start**, wait for the countdown, then hit the arrows as they reach the targets
  (arrow keys, WASD, or click/tap the pads and belts). Hold long notes.
- Hits lock into the loop and play every pass; misses play a wobbly, out-of-tune version.
- The crowd turns happy or angry depending on how you play.
- While the loop is stopped, you can try out the instrument freely.

## Folders

- `src/` – source: `template.html` (page), `game.js` (game + audio), `sprites.js` (pixel icons),
  `img/` (resized images). Rebuild with `cd src && node build.js` (writes `../index.html`).
- `art/` – original character illustrations and logo.
- `sketches/` – the original hand-drawn design sketches.
