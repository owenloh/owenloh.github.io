# owenloh.github.io

Personal site for **Owen Loh**. One column, serif, laid out like a printed
paper: masthead, abstract, contents, then ten numbered entries. Five of the
entries carry a working demonstration.

| file | contents |
| --- | --- |
| `index.html` | the whole document, plus each demo's opening state |
| `style.css` | tokens, paper layout, demo components, responsive and print |
| `script.js` | the five demonstration models and their render passes |
| `assets/` | figures |

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

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```
