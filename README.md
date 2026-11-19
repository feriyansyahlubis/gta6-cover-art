# Vice City Cover Studio

[![make.fun](https://img.shields.io/badge/make.fun-bounty-ff2e88)](https://make.fun/)
[![competition](https://img.shields.io/badge/competition-gta6--cover--art--01-7b2fbe)](https://make.fun/c/gta6-cover-art-01)

**Vice City Cover Studio** — a make.fun entry for the [Make GTA 6 Cover Art](https://make.fun/c/gta6-cover-art-01) bounty. An offline web app that turns your photo and a caption into GTA-poster-style cover art: multi-panel layouts, bold sunset lettering, a Vice City colour grade, exported as a PNG to share. Your photos never leave your machine.

## How it works

1. **Add photos** — from your machine (or try the bundled samples).
2. **Pick a layout** — Hero + Three, Four Panel, Mosaic, Full Bleed, Snapshots, Duo Split.
3. **Pick a post size** — 1080 × 1080, 1080 × 1350, or 1920 × 1080.
4. **Pick a colour grade** — Vice Sunset, Neon Nights, Golden Hour, Miami Noir, Palm Dusk.
5. **Write your caption** — big title, neon script subtitle, tag line.
6. **Crop each panel** — click a panel, drag to move its photo, scroll to zoom, or use the sliders.
7. **Export PNG** — one size, or all three at once.

The cover engine draws everything on canvas: a striped synthwave sun, palm silhouettes, a gradient Anton title with a Pacifico neon subtitle, film grain, a vignette and a poster frame. No Rockstar Games logo, artwork or fonts — all lettering is our own, set in Anton and Pacifico (SIL Open Font License, vendored under `app/fonts/`).

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

100% offline static files — no CDN, no libraries, no network requests. Works from any static file server.

## Layout

- `app/` — the web app (`index.html`, `style.css`, `src/` engine, `fonts/`, `samples/`)
- `screenshots/` — the cover and the editor, taken with the app's own `?shot=` scenes
- `main.ts` — the entry program: copies `app/` + `screenshots/` to `/output` and writes `dossier.json`
- `serve.ts` — local static server for trying the app

## License

MIT — see [LICENSE](LICENSE). Fonts under `app/fonts/` are licensed under the SIL Open Font License 1.1 (see `app/fonts/OFL.txt`).
