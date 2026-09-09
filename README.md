# owenloh.github.io

Personal site for **Owen Loh**. One column, serif, laid out like a printed
paper: masthead, abstract, contents, then ten numbered entries. Five of the
entries carry a working demonstration.

| file | contents |
| --- | --- |
| `index.html` | the whole document, plus each demo's opening state |
| `style.css` | tokens, paper layout, demo components, responsive and print |
| `script.js` | the five demonstration models and their render passes |
| `assets/` | figures, fonts, the share card |
| `favicon.svg`, `favicon.ico`, `apple-touch-icon.png` | the OL mark |
| `site.webmanifest`, `robots.txt`, `sitemap.xml`, `404.html` | the rest of a whole site |

## The demonstrations

1. **Order intake** (Catalon) - three awkward inbound orders staged through
   triage, matching, pricing and a validated ERP draft.
2. **Two variables, one cup** (PourDynamics) - a reduction of the extraction
   engine, there to show the shape of the Jacobian.
3. **Speak to the 3D volume** (SeisPilot) - planned API calls against a live
   section, including one the whitelist refuses.
4. **Guide search** (Discriminase) - prefix filter and mismatch tolerance
   against 2.3 million protospacer sites.
5. **Degrade a cell** (battery inverse problem) - dV/dQ features moving under
   electrode loss and lithium inventory loss.

The models in `script.js` are illustrative reductions, not the shipped
engines. The real ones live in their own repositories, linked from each entry.

The page is complete before JavaScript runs: every demo's opening state is in
the markup, so the document reads the same with scripting off.

## The mark

`favicon.svg` is OL set in Source Serif 4 at weight 650 and optical size 8 -
the small-text master, so the strokes hold up at 16px - with the outlines
converted to paths. Nothing about it depends on a font being installed. Every
other icon, and the 1200x630 share card in `assets/og.png`, is rendered from
that same source.

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```
