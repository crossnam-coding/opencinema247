# OPEN CINEMA 24/7 — channel site

One-page site for the YouTube channel **OPEN CINEMA 24/7** (`@OpenCinema247`), operated by Eokmanjangja Pictures (주식회사 억만장자픽처스).

Static HTML/CSS/JS, no build step — open `index.html` or serve the folder.

- Hero: a Three.js cinema front at night (marquee chase bulbs, a changeable-letter board that flips through the first slate, a neon OPEN 24/7, one door ajar) with UnrealBloom. Scrolling walks you to the door.
- Motion: GSAP ScrollTrigger. EN default, KO toggle — nothing is stored (no cookies, no localStorage), no analytics.
- Everything is self-hosted (`vendor/` Three.js 0.170 + GSAP 3.12.5, `assets/fonts/` woff2) — no third-party requests.
- Debug params: `?no3d=1` (no WebGL), `?nomotion=1` (no animation), `?font=…` / `?kofont=…` / `?title=N` (marquee letters).

© 2026 Eokmanjangja Pictures Co., Ltd. Channel art belongs to the channel; fonts under their respective open licenses (OFL).
