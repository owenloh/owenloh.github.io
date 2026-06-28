# owenloh.github.io — personal portfolio

A fast, single static page for **Owen Loh** that behaves like an instrument, not
a résumé: drag two controls and watch a live extraction curve, flavour radar and
`J = dy/dx` sensitivities respond.

- `index.html` — markup, meta/Open Graph, JSON-LD `Person` schema, the
  instrument, expandable `<details>` deep-dives, and the command-palette template
- `style.css` — dark (default) + light theme, instrument/radar/slider styling,
  responsive, motion-guarded
- `script.js` — optional progressive enhancement: theme toggle, ambient physics
  field, the instrument model + curve/radar/Jacobian, command palette (`k`),
  scroll progress + reveal
- `.github/workflows/deploy-pages.yml` — self-enabling GitHub Pages deploy
- `.nojekyll` — serve files as-is

No build step, no frameworks, no external requests, no trackers. The page is
fully readable and navigable with JavaScript disabled; the interactivity is
enhancement on top.

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

The coffee instrument is an **illustrative toy model**, not the validated
engine — the real one (a DFN extraction model) lives at
https://github.com/owenloh/PourDynamics
