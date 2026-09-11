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
| `favicon.svg`, `favicon.ico`, `apple-touch-icon.png` | the O1 mark |
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

`favicon.svg` is O1 set in Source Serif 4 at weight 650 and optical size 8 -
the small-text master, so the strokes hold up at 16px - with the outlines
converted to paths. Nothing about it depends on a font being installed. The
digit is drawn shorter than the capital, so it is scaled to the cap band;
sizing is by cap height rather than ink width, which keeps the letters the
same size whatever the monogram spells. Every other icon, and the 1200x630
share card in `assets/og.png`, is rendered from that same source.

The masthead name resettles `Owen Loh` into `O1 Loh` one character position at
a time, which is where the mark comes from. It runs on hover, and once
unprompted on the reader's first scroll - a phone has no hover, so without that
nobody there would ever find it. The span is pinned to the wider of the two
spellings so nothing on the page moves, and the churn only draws on characters
the two spellings already contain. Under `prefers-reduced-motion` the hover
swaps the name outright and the scroll reveal does not run at all.

## The opening, and small screens

The name sits at the golden section of the viewport, `1 - 0.618` down, so the
document opens on a title page's worth of quiet. That offset is in `svh` rather
than `vh`: on a phone `vh` measures the viewport with the browser chrome
retracted, which would push the name below the fold before the reader has
scrolled at all.

Below 640px the layout keeps its desktop shape and steps the type down into it,
rather than collapsing to one column - a stretched single column blows the
instruments up rather than shrinking them, and the flavour radar is 250px wide
on a desktop. Two arrangements cannot survive the width and are marked as
exceptions in the stylesheet: the inbox and the ERP draft it produces stack,
and the stage rail wraps into pairs. The contents drops the descriptive tail
after each project name so that every row fits one line.

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```
