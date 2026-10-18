# TISA — Wear Your Loyalty

A 30-second vertical brand promo built around a simple conversion path:
**fan identity → jersey choice → contact TISA**.

## Deliverables

- `TISA-Wear-Your-Loyalty-30s.mp4` — 1080×1920, 30fps, H.264/yuv420p, AAC stereo. Original electronic score and transition sound design.
- `TISA-Wear-Your-Loyalty-30s-silent.mp4` — the same picture without audio.
- `tisa-cover.png` — full-resolution closing card.
- `storyboard.jpg` — twelve sampled frames for review.
- `caption-mm.txt` — suggested Burmese social caption and contact links.
- `source/` and `assets/` — reproducible animation/audio code and the actual TISA catalog cutouts used in the film.

## Timeline

| Time | Purpose | Motion |
| --- | --- | --- |
| 00–03 | Hook: Your team. Your colors. | Beat cuts, masked type, jersey swaps |
| 03–06 | Emotional positioning: Wear your loyalty | Staggered typography and hero entrance |
| 06–10 | Find your colors | Arsenal, Liverpool, Manchester United and Manchester City carousel |
| 10–14 | Club or country | Nine-team staggered grid |
| 14–18 | Every angle | Front-to-back jersey flip |
| 18–22 | Home. Away. Your way. | Opposing jersey entrances and kinetic ribbon |
| 22–26 | Conversion: Pick / find / message | Three moving step cards |
| 26–30 | Contact hold | Brand lockup, actual number, website and WhatsApp QR |

The expanded lineup adds **Arsenal, Liverpool and Manchester United** alongside
Manchester City, Barcelona, Real Madrid, Paris, Argentina and Brazil. Arsenal
leads the hero shot, with Liverpool in the pick-your-team step.

The last card uses **+971 54 383 1461** and a QR for
`https://wa.me/971543831461`. Website: `https://tisa-iota.vercel.app`.
Facebook: `https://www.facebook.com/profile.php?id=100095189741020`.

The score was synthesized for this video from oscillators and generated noise;
it contains no downloaded music or samples. Jersey photography and the TISA logo
come from the existing project. The supplied `assets/logo.png` is used in the header, transition wipes, message step and closing card. The promo does not add price, stock, delivery,
authenticity or sponsorship claims.

## Re-render

From this directory:

```sh
npm install
python3 source/soundtrack.py
npm run render
```

The audio source requires NumPy. The renderer uses macOS system DIN Condensed,
and Arial fonts; update those registration paths
for another operating system. Frame timing is deterministic at 30fps.

This is a standalone media deliverable. It does not change the admin renderer,
post to social accounts, or require an OpenAI API key.
