/* Owen Loh — portfolio v5. Progressive enhancement only; page works without JS. */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function css(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }
  function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }
  function dpr() { return Math.min(window.devicePixelRatio || 1, 2); }

  var panelRedraw = {};          // panel id -> redraw()
  var activePanel = "panel-coffee";
  var themeListeners = [];
  function onThemeChange() { themeListeners.forEach(function (f) { try { f(); } catch (e) {} }); }

  /* ============================ Theme ============================ */
  var themeBtn = document.getElementById("theme-toggle");
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("theme", t); } catch (e) {}
    if (themeBtn) themeBtn.setAttribute("aria-pressed", String(t === "light"));
    onThemeChange();
  }
  if (themeBtn) themeBtn.addEventListener("click", function () {
    setTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light");
  });

  /* redraw the visible demo on theme change / resize */
  themeListeners.push(function () { var f = panelRedraw[activePanel]; if (f) f(); });
  var rzt;
  window.addEventListener("resize", function () { clearTimeout(rzt); rzt = setTimeout(function () { var f = panelRedraw[activePanel]; if (f) f(); }, 160); });

  function sizeCanvas(cv) {
    var w = cv.clientWidth || cv.width, h = w * (cv.height / cv.width || 0.4), d = dpr();
    cv.width = w * d; cv.height = h * d; cv.style.height = h + "px";
    var ctx = cv.getContext("2d"); ctx.setTransform(d, 0, 0, d, 0, 0);
    cv._w = w; cv._h = h; return ctx;
  }

  /* ====================== Coffee instrument ====================== */
  var grindEl = document.getElementById("grind"), flowEl = document.getElementById("flow");
  function model(grind, flow) {
    var fineness = clamp((1200 - grind) / 1000, 0, 1);
    var fn = clamp((flow - 1) / 7, 0, 1);
    var tau = 25 + (1 - fineness) * 70;
    var Tc = 45 + (8 - flow) * 22;
    var ey = 24 * (1 - Math.exp(-Tc / tau));
    var tds = ey * 0.063;
    var acidity = clamp(0.45 + 0.50 * fn - 0.055 * (ey - 18), 0, 1);
    var bitter = clamp(0.18 + 0.072 * (ey - 14) + 0.18 * fineness - 0.18 * fn, 0, 1);
    var body = clamp(0.30 + 0.50 * fineness + 0.0375 * (ey - 16) - 0.10 * fn, 0, 1);
    var sweet = clamp(Math.exp(-Math.pow((ey - 19.5) / 3.2, 2)), 0, 1);
    var clarity = clamp(0.40 + 0.42 * fn + 0.28 * (1 - fineness) - 0.30 * body, 0, 1);
    return { tau: tau, Tc: Tc, ey: ey, tds: tds, acidity: acidity, sweet: sweet, body: body, bitter: bitter, clarity: clarity };
  }
  function partial(field, grind, flow, which) {
    if (which === "grind") { var dg = 50; return (model(grind + dg, flow)[field] - model(grind - dg, flow)[field]) / (2 * dg) * 100 * 100; }
    var df = 0.25; return (model(grind, flow + df)[field] - model(grind, flow - df)[field]) / (2 * df) * 100;
  }
  var curve = document.getElementById("curve");
  var cctx = curve && curve.getContext ? curve.getContext("2d") : null;
  var radarShape = document.getElementById("radar-shape");
  var RADAR_ANGLES = [-90, -18, 54, 126, 198].map(function (d) { return d * Math.PI / 180; });
  function fmtSigned(v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1); }
  function setJac(id, v) { var el = document.getElementById(id); if (!el) return; el.textContent = fmtSigned(v); el.style.color = v >= 0 ? css("--accent") : css("--accent-2"); }
  function drawCurve(m) {
    if (!cctx) return; var cv = curve;
    var d = dpr(), cssW = cv.clientWidth || 520, cssH = cssW * 300 / 520;
    cv.width = cssW * d; cv.height = cssH * d; cv.style.height = cssH + "px"; cctx.setTransform(d, 0, 0, d, 0, 0);
    var W = cssW, H = cssH, padL = 36, padR = 12, padT = 12, padB = 24, xMax = 220, yMax = 26;
    var mx = function (t) { return padL + (t / xMax) * (W - padL - padR); }, my = function (y) { return (H - padB) - (y / yMax) * (H - padB - padT); };
    var line = css("--line"), faint = css("--faint"), accent = css("--accent"), text = css("--muted");
    cctx.clearRect(0, 0, W, H); cctx.font = "10px ui-monospace,monospace";
    cctx.strokeStyle = line; cctx.fillStyle = faint; cctx.lineWidth = 1;
    [0, 10, 20].forEach(function (y) { cctx.globalAlpha = .6; cctx.beginPath(); cctx.moveTo(padL, my(y)); cctx.lineTo(W - padR, my(y)); cctx.stroke(); cctx.globalAlpha = 1; cctx.fillText(y + "%", 4, my(y) + 3); });
    [0, 100, 200].forEach(function (t) { cctx.fillText(t + "s", mx(t) - 6, H - 8); });
    cctx.strokeStyle = accent; cctx.lineWidth = 2; cctx.beginPath();
    for (var t = 0; t <= xMax; t += 2) { var y = 24 * (1 - Math.exp(-t / m.tau)), X = mx(t), Y = my(y); t === 0 ? cctx.moveTo(X, Y) : cctx.lineTo(X, Y); }
    cctx.stroke();
    var rx = mx(m.Tc), ry = my(m.ey);
    cctx.strokeStyle = faint; cctx.setLineDash([3, 3]); cctx.lineWidth = 1; cctx.beginPath(); cctx.moveTo(rx, my(0)); cctx.lineTo(rx, ry); cctx.stroke(); cctx.setLineDash([]);
    cctx.fillStyle = accent; cctx.beginPath(); cctx.arc(rx, ry, 4, 0, 7); cctx.fill();
    cctx.fillStyle = text; cctx.fillText(m.ey.toFixed(1) + "% @ " + Math.round(m.Tc) + "s", Math.min(rx + 6, W - 78), ry - 6);
  }
  function drawRadar(m) {
    if (!radarShape) return;
    var vals = [m.acidity, m.sweet, m.body, m.bitter, m.clarity];
    radarShape.setAttribute("points", vals.map(function (v, i) {
      var r = 14 + clamp(v, 0, 1) * 64;
      return (110 + r * Math.cos(RADAR_ANGLES[i])).toFixed(1) + "," + (110 + r * Math.sin(RADAR_ANGLES[i])).toFixed(1);
    }).join(" "));
  }
  function renderFlavour(m) {
    var note = document.getElementById("flavour-note"), tagsEl = document.getElementById("flavour-tags");
    if (!note) return;
    var lead = m.acidity > m.bitter + 0.08 ? "Bright and lively" : m.bitter > m.acidity + 0.08 ? "Bold and bitter-forward" : "Balanced and even";
    var bodyW = m.body > 0.6 ? "a full, syrupy body" : m.body < 0.4 ? "a light, tea-like body" : "a medium body";
    var fin = m.clarity > 0.58 ? "a clean finish" : "a rounded, heavier finish";
    note.textContent = lead + ", with " + bodyW + " and " + fin + ". TDS " + m.tds.toFixed(2) + "% · EY " + m.ey.toFixed(1) + "%.";
    if (tagsEl) {
      var tags = [];
      tags.push(m.acidity > m.bitter + 0.08 ? "bright" : m.bitter > m.acidity + 0.08 ? "bitter-leaning" : "balanced");
      tags.push(m.body > 0.6 ? "full body" : m.body < 0.4 ? "light body" : "medium body");
      if (m.clarity > 0.58) tags.push("clean");
      if (m.sweet > 0.55) tags.push("sweet");
      if (m.bitter > 0.7) tags.push("intense");
      if (m.acidity > 0.72) tags.push("juicy");
      tagsEl.innerHTML = tags.slice(0, 4).map(function (t) { return "<li>" + t + "</li>"; }).join("");
    }
  }
  var lastM = null;
  function update() {
    if (!grindEl || !flowEl) return;
    var g = +grindEl.value, f = +flowEl.value, m = model(g, f); lastM = m;
    var set = function (id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
    set("o-grind", Math.round(g) + " µm"); set("o-flow", f.toFixed(1) + " g/s");
    set("o-tds", m.tds.toFixed(2) + "%"); set("o-ey", m.ey.toFixed(1) + "%");
    setJac("j1", partial("bitter", g, f, "flow")); setJac("j2", partial("acidity", g, f, "grind")); setJac("j3", partial("body", g, f, "grind"));
    drawCurve(m); drawRadar(m); renderFlavour(m);
  }
  if (grindEl && flowEl) {
    grindEl.addEventListener("input", update); flowEl.addEventListener("input", update);
    update(); panelRedraw["panel-coffee"] = update;
  }

  /* ====================== Tabs ====================== */
  var tabs = [].slice.call(document.querySelectorAll(".tabs [role=tab]"));
  var panels = [].slice.call(document.querySelectorAll(".showcase [role=tabpanel]"));
  function activateTab(tab, focus) {
    if (!tab) return;
    tabs.forEach(function (t) { var on = t === tab; t.setAttribute("aria-selected", on ? "true" : "false"); t.tabIndex = on ? 0 : -1; });
    var pid = tab.getAttribute("aria-controls");
    panels.forEach(function (p) { p.hidden = p.id !== pid; });
    activePanel = pid;
    var panel = document.getElementById(pid);
    if (panel && panel.hasAttribute("data-demo")) bootDemoPanel(panel);
    requestAnimationFrame(function () { var f = panelRedraw[pid]; if (f) f(); });
    if (focus && tab.focus) tab.focus();
  }
  function activateTabByName(name) {
    var t = document.getElementById("tab-" + name);
    if (t) { activateTab(t, false); var play = document.getElementById("play"); if (play) play.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }); }
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { activateTab(tab, false); });
    tab.addEventListener("keydown", function (e) {
      var n = tabs.length;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); activateTab(tabs[(i + 1) % n], true); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); activateTab(tabs[(i - 1 + n) % n], true); }
      else if (e.key === "Home") { e.preventDefault(); activateTab(tabs[0], true); }
      else if (e.key === "End") { e.preventDefault(); activateTab(tabs[n - 1], true); }
    });
  });

  /* ====================== Demos (lazy-init on tab activation) ====================== */
  var demoInited = [];
  var registry = { catalon: catalon, seismic: seismic, crispr: crispr, battery: battery };
  function bootDemoPanel(panel) {
    if (demoInited.indexOf(panel) !== -1) return;
    var fn = registry[panel.getAttribute("data-demo")], box = panel.querySelector("[data-demo-body]");
    if (!fn || !box) return;
    demoInited.push(panel);
    try { var rd = fn(box); if (rd) panelRedraw[panel.id] = rd; } catch (e) {}
  }

  function catalon(box) {
    var btn = box.querySelector("[data-act=run]"), stages = [].slice.call(box.querySelectorAll(".stages span")), out = box.querySelector(".po-out");
    if (!btn) return;
    function rowEl(a, b) { return '<div class="po-row"><span>' + a + '</span><span>' + b + '</span></div>'; }
    btn.addEventListener("click", function () {
      btn.disabled = true; out.classList.remove("po-empty"); out.innerHTML = ""; stages.forEach(function (s) { s.className = ""; });
      var i = 0;
      (function step() {
        if (i > 0) stages[i - 1].className = "done";
        if (i < stages.length) { stages[i].className = "on"; i++; setTimeout(step, 380); }
        else {
          out.innerHTML = '<div class="po-meta">customer resolved &middot; processed in 2.7 s</div>' +
            '<ul class="po-checks"><li>&#10003; inventory checked</li><li>&#10003; pricing matched</li><li>&#10003; email reply drafted</li><li>&#10003; ERP order ready</li></ul>' +
            rowEl("Acetone &middot; technical 99.5%", "2 drums &rarr; 110 gal") +
            rowEl("Isopropanol &middot; usual grade", "500 gal") +
            rowEl("terms", "Net 30 &middot; deliver Fri") +
            rowEl("status", "awaiting 1-click approval");
          btn.disabled = false; btn.textContent = "Run again ▸";
        }
      })();
    });
  }

  function seismic(box) {
    var cv = box.querySelector(".seis"); if (!cv) return;
    var ctx = cv.getContext("2d"), input = box.querySelector(".cmd"), echo = box.querySelector(".cmd-echo");
    var faultX = 0.62, raf = 0, st = { cx: .5, zoom: 1, vel: 0 }, tg = { cx: .5, zoom: 1, vel: 0 };
    function size() { ctx = sizeCanvas(cv); }
    function draw() {
      var W = cv._w, H = cv._h; if (!W) return;
      var accent = css("--accent"), faint = css("--faint"), muted = css("--muted");
      ctx.clearRect(0, 0, W, H);
      var half = 0.5 / st.zoom, x0 = st.cx - half;
      if (st.vel) { var g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, "rgba(90,140,230,.12)"); g.addColorStop(.5, "rgba(120,200,170,.10)"); g.addColorStop(1, "rgba(230,130,90,.14)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
      for (var li = 0; li < 13; li++) {
        var yBase = (li + 0.6) / 13.5; ctx.beginPath();
        for (var px = 0; px <= W; px += 3) { var u = x0 + (px / W) * (2 * half), amp = 0.012 + 0.009 * Math.sin(li * .9 + 1), y = yBase + amp * Math.sin(u * 20 + li * .7); if (u > faultX) y += 0.05; var Y = y * H; px === 0 ? ctx.moveTo(px, Y) : ctx.lineTo(px, Y); }
        ctx.strokeStyle = st.vel ? "rgba(255,255,255,.28)" : muted; ctx.globalAlpha = st.vel ? .7 : .55; ctx.lineWidth = 1.4; ctx.stroke(); ctx.globalAlpha = 1;
      }
      if (faultX > x0 && faultX < x0 + 2 * half) { var fx = ((faultX - x0) / (2 * half)) * W; ctx.strokeStyle = accent; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(fx, 0); ctx.lineTo(fx, H); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = accent; ctx.font = "10px ui-monospace,monospace"; ctx.fillText("fault", Math.min(fx + 5, W - 32), 13); }
      ctx.fillStyle = faint; ctx.font = "10px ui-monospace,monospace"; ctx.fillText("IL " + Math.round(900 + st.cx * 300) + " · ×" + st.zoom.toFixed(1) + (st.vel ? " · velocity" : ""), 6, H - 7);
    }
    function animate() { cancelAnimationFrame(raf); (function tick() { st.cx += (tg.cx - st.cx) * .16; st.zoom += (tg.zoom - st.zoom) * .16; st.vel = tg.vel; draw(); if (Math.abs(tg.cx - st.cx) > .002 || Math.abs(tg.zoom - st.zoom) > .01) raf = requestAnimationFrame(tick); })(); }
    function run(cmd) {
      cmd = (cmd || "").toLowerCase(); var m;
      if (/fault/.test(cmd)) { tg.cx = faultX; tg.zoom = Math.max(tg.zoom, 1.9); m = "→ navigated to the fault · IL 1024 / XL 2030"; }
      else if (/gas|bright|amplitude/.test(cmd)) { tg.cx = .28; tg.zoom = 2.1; m = "→ navigated to the bright (gas) zone"; }
      else if (/in\b|closer|zoom in/.test(cmd)) { tg.zoom = clamp(tg.zoom * 1.4, 1, 6); m = "→ zoom in ×" + tg.zoom.toFixed(1); }
      else if (/out|wider|zoom out/.test(cmd)) { tg.zoom = clamp(tg.zoom / 1.4, 1, 6); m = "→ zoom out ×" + tg.zoom.toFixed(1); }
      else if (/vel/.test(cmd)) { tg.vel = st.vel ? 0 : 1; m = "→ velocity model " + (tg.vel ? "on" : "off"); }
      else if (/left|west/.test(cmd)) { tg.cx = clamp(tg.cx - .16, .1, .9); m = "→ pan left"; }
      else if (/right|east/.test(cmd)) { tg.cx = clamp(tg.cx + .16, .1, .9); m = "→ pan right"; }
      else if (/reset|home|default/.test(cmd)) { tg.cx = .5; tg.zoom = 1; tg.vel = 0; m = "→ reset to default view"; }
      else { m = "? couldn't parse — try: go to the fault · zoom in · toggle velocity · reset"; }
      echo.textContent = m; animate();
    }
    if (input) input.addEventListener("keydown", function (e) { if (e.key === "Enter") { run(input.value); input.value = ""; } });
    [].forEach.call(box.querySelectorAll(".chips button"), function (b) { b.addEventListener("click", function () { run(b.getAttribute("data-cmd")); }); });
    size(); draw();
    return function () { size(); draw(); };
  }

  function crispr(box) {
    var L = 20, bases = "ACGT";
    var tEl = box.querySelector("#cr-target"), mEl = box.querySelector("#cr-match");
    var hamEl = box.querySelector("#cr-ham"), simEl = box.querySelector("#cr-sim");
    var thr = box.querySelector("#cr-thr"), thrO = box.querySelector("#cr-thr-o"), verdict = box.querySelector("#cr-verdict"), gen = box.querySelector("#cr-gen");
    if (!tEl || !thr) return;
    var target = "", nearest = "", ham = 0, sim = 0;
    function rseq(n) { var s = ""; for (var i = 0; i < n; i++) s += bases[Math.floor(Math.random() * 4)]; return s; }
    function hd(a, b) { var d = 0; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d; }
    function mutate(seq, k) {
      var arr = seq.split(""), idx = [], i, j, t;
      for (i = 0; i < seq.length; i++) idx.push(i);
      for (i = idx.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
      for (i = 0; i < k; i++) { var p = idx[i], nb; do { nb = bases[Math.floor(Math.random() * 4)]; } while (nb === arr[p]); arr[p] = nb; }
      return arr.join("");
    }
    function spans(seq, ref) { return seq.split("").map(function (c, i) { return '<span class="' + (c === ref[i] ? "m" : "x") + '">' + c + "</span>"; }).join(""); }
    function evaluate() {
      var t = +thr.value; thrO.textContent = t + "%";
      var risk = sim >= t;
      verdict.textContent = risk ? "✗ off-target risk — rejected (≥ " + t + "% similar to a commensal)" : "✓ unique guide — safe to target";
      verdict.className = "cr-verdict " + (risk ? "bad" : "good");
    }
    function gen2() {
      target = rseq(L);
      nearest = mutate(target, 3 + Math.floor(Math.random() * 7));
      ham = hd(target, nearest); sim = Math.round((L - ham) / L * 100);
      tEl.innerHTML = spans(target, nearest); mEl.innerHTML = spans(nearest, target);
      hamEl.textContent = ham + " / " + L; simEl.textContent = sim + "%";
      evaluate();
    }
    thr.addEventListener("input", evaluate);
    if (gen) gen.addEventListener("click", gen2);
    gen2();
  }

  function battery(box) {
    var cv = box.querySelector(".ocv"); if (!cv) return;
    var ctx = cv.getContext("2d"), lam = box.querySelector(".lam"), lli = box.querySelector(".lli");
    var lamO = box.querySelector(".lam-out"), lliO = box.querySelector(".lli-out"), rmseO = box.querySelector(".rmse"), fitO = box.querySelector(".fitq"), sohO = box.querySelector(".soh");
    var cellsCv = box.querySelector(".cells");
    var TRUE = { lam: 15, lli: -4 };
    function drawCells(Lv, Sv) {
      if (!cellsCv) return;
      var cx = cellsCv.getContext("2d");
      var w = cellsCv.clientWidth || 220, h = w * (cellsCv.height / cellsCv.width), d = dpr();
      cellsCv.width = w * d; cellsCv.height = h * d; cellsCv.style.height = h + "px"; cx.setTransform(d, 0, 0, d, 0, 0);
      var W = w, H = h, line = css("--line"), faint = css("--faint"), accent = css("--accent"), text = css("--text"), muted = css("--muted");
      cx.clearRect(0, 0, W, H);
      var cathodeCap = clamp(100 - Lv, 0, 100), lithium = clamp(100 + Sv, 0, 120), soh = clamp(Math.min(cathodeCap, lithium), 0, 100);
      var barW = Math.min(48, (W - 54) / 2), gap = (W - barW * 2) / 3, topPad = 34, baseY = H - 30, fullH = baseY - topPad;
      cx.font = "10px ui-monospace,monospace";
      function rr(x, y, wd, ht, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + wd, y, x + wd, y + ht, r); cx.arcTo(x + wd, y + ht, x, y + ht, r); cx.arcTo(x, y + ht, x, y, r); cx.arcTo(x, y, x + wd, y, r); cx.closePath(); }
      function yFor(p) { return baseY - fullH * clamp(p, 0, 100) / 100; }
      function battery(x, cap, label) {
        cx.fillStyle = line; cx.fillRect(x + barW * 0.34, topPad - 6, barW * 0.32, 6);   // terminal nub (pop-up)
        cx.strokeStyle = line; cx.lineWidth = 1.5; rr(x, topPad, barW, fullH, 5); cx.stroke();   // battery body
        var us = Math.min(cap, soh), uy = yFor(us);
        cx.save(); rr(x, topPad, barW, fullH, 5); cx.clip();
        cx.fillStyle = accent; cx.globalAlpha = .92; cx.fillRect(x, uy, barW, baseY - uy); cx.globalAlpha = 1;        // usable (blue-green)
        if (cap > soh + 0.5) { var ey = yFor(cap); cx.fillStyle = muted; cx.globalAlpha = .25; cx.fillRect(x, ey, barW, uy - ey); cx.globalAlpha = 1; }  // excess (wasted)
        cx.restore();
        cx.textAlign = "center"; cx.fillStyle = text; cx.fillText(Math.round(cap) + "%", x + barW / 2, H - 19);
        cx.fillStyle = faint; cx.fillText(label, x + barW / 2, H - 7);
      }
      battery(gap, cathodeCap, "cathode");
      battery(gap * 2 + barW, lithium, "anode·Li");
      var ys = yFor(soh);
      cx.strokeStyle = accent; cx.globalAlpha = .8; cx.setLineDash([4, 3]); cx.lineWidth = 1.4; cx.beginPath(); cx.moveTo(gap - 7, ys); cx.lineTo(W - gap + 7, ys); cx.stroke(); cx.setLineDash([]); cx.globalAlpha = 1;
      cx.fillStyle = accent; cx.textAlign = "left"; cx.fillText("usable / SoH " + Math.round(soh) + "%", 4, 13);
    }
    function cathode(z) { return 4.2 - 0.9 * z - 0.25 * Math.tanh((z - 0.5) * 6); }
    function anode(z) { return 0.09 + 0.34 * Math.exp(-z * 7) + 0.09 * Math.exp(-(z - 0.5) * (z - 0.5) * 38); }
    function cell(soc, L, S) { var peLo = 0.03 + L / 100 * 0.55, peHi = 0.97 - L / 100 * 0.55, neLo = 0.02 + S / 100, neHi = 0.95 + S / 100; return cathode(peLo + soc * (peHi - peLo)) - anode(clamp(neLo + soc * (neHi - neLo), 0, 1)); }
    function arr(L, S) { var a = []; for (var i = 0; i <= 60; i++) a.push(cell(i / 60, L, S)); return a; }
    var target = arr(TRUE.lam, TRUE.lli);
    function draw() {
      var L = +lam.value, S = +lli.value;
      lamO.textContent = L.toFixed(1) + "%"; lliO.textContent = (S >= 0 ? "+" : "") + S.toFixed(1) + "%";
      var cur = arr(L, S), e = 0; for (var i = 0; i < cur.length; i++) { var d = cur[i] - target[i]; e += d * d; }
      var rmse = Math.sqrt(e / cur.length);
      rmseO.textContent = rmse.toFixed(4) + " V";
      var q = rmse < 0.004 ? "excellent ✓" : rmse < 0.012 ? "good" : rmse < 0.03 ? "fair" : "poor";
      fitO.textContent = q; fitO.style.color = rmse < 0.012 ? css("--accent") : css("--accent-2");
      if (sohO) { sohO.textContent = Math.round(clamp(Math.min(100 - L, 100 + S), 0, 100)) + "%"; sohO.style.color = css("--accent"); }
      ctx = sizeCanvas(cv); var W = cv._w, H = cv._h, padL = 34, padR = 10, padT = 14, padB = 22, vmin = 2.6, vmax = 4.35;
      var line = css("--line"), faint = css("--faint"), accent = css("--accent");
      function X(s) { return padL + s * (W - padL - padR); } function Y(v) { return (H - padB) - ((v - vmin) / (vmax - vmin)) * (H - padT - padB); }
      ctx.clearRect(0, 0, W, H); ctx.font = "10px ui-monospace,monospace"; ctx.lineWidth = 1;
      [3, 3.5, 4].forEach(function (v) { ctx.strokeStyle = line; ctx.globalAlpha = .5; ctx.beginPath(); ctx.moveTo(padL, Y(v)); ctx.lineTo(W - padR, Y(v)); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillStyle = faint; ctx.fillText(v.toFixed(1), 6, Y(v) + 3); });
      ctx.fillStyle = faint; ctx.fillText("SOC →", W - 48, H - 7); ctx.fillText("0%", padL - 2, H - 7);
      ctx.strokeStyle = faint; ctx.setLineDash([2, 4]); ctx.lineWidth = 1.6; ctx.beginPath();
      for (var t = 0; t < target.length; t++) { var x = X(t / 60), y = Y(target[t]); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath();
      for (var j = 0; j < cur.length; j++) { var x2 = X(j / 60), y2 = Y(cur[j]); j ? ctx.lineTo(x2, y2) : ctx.moveTo(x2, y2); } ctx.stroke();
      ctx.fillStyle = accent; ctx.fillText("— reconstructed", padL + 2, padT + 2); ctx.fillStyle = faint; ctx.fillText("··· measured", padL + 110, padT + 2);
      drawCells(L, S);
    }
    lam.addEventListener("input", draw); lli.addEventListener("input", draw); draw(); return draw;
  }

  /* ====================== Command palette ====================== */
  var palette = document.getElementById("palette"), pInput = document.getElementById("palette-input"), pList = document.getElementById("palette-list"), pOpenBtn = document.getElementById("palette-open");
  var lastFocus = null, selIndex = 0, filtered = [];
  function jump(sel) { var el = document.querySelector(sel); if (el) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }); }
  function open_(url) { window.open(url, url.indexOf("mailto:") === 0 ? "_self" : "_blank", "noopener"); }
  var COMMANDS = [
    { label: "Coffee engine — physics demo", key: "tab", act: function () { activateTabByName("coffee"); } },
    { label: "Catalon — agentic AI demo", key: "tab", act: function () { activateTabByName("catalon"); } },
    { label: "Seismic — NL navigation demo", key: "tab", act: function () { activateTabByName("seismic"); } },
    { label: "CRISPR — complexity demo", key: "tab", act: function () { activateTabByName("crispr"); } },
    { label: "Battery — OCV fit demo", key: "tab", act: function () { activateTabByName("battery"); } },
    { label: "More work", key: "go", act: function () { jump("#work"); } },
    { label: "Open GitHub", key: "↗", act: function () { open_("https://github.com/owenloh"); } },
    { label: "Open LinkedIn", key: "↗", act: function () { open_("https://www.linkedin.com/in/olzm"); } },
    { label: "Book a call", key: "↗", act: function () { open_("https://calendar.app.google/BHBN9vUJ483jwWfq5"); } },
    { label: "Portfolio slides", key: "↗", act: function () { open_("https://1drv.ms/p/c/d26535d430fe7580/IQBM79UHrJJxT45lu3gBuvORAS9xCkHieKY0bC6gUYEi07g?e=sDbysZ"); } },
    { label: "PourDynamics repo", key: "↗", act: function () { open_("https://github.com/owenloh/PourDynamics"); } },
    { label: "Seismic Copilot repo (3D-MCP)", key: "↗", act: function () { open_("https://github.com/owenloh/3D-Software-MCP-Server"); } },
    { label: "Agentic-SEGY-Metadata-Parser repo", key: "↗", act: function () { open_("https://github.com/owenloh/Agentic-SEGY-Metadata-Parser"); } },
    { label: "Alistair-MCP repo", key: "↗", act: function () { open_("https://github.com/owenloh/Alistair-MCP"); } },
    { label: "usecatalon.com", key: "↗", act: function () { open_("https://usecatalon.com"); } },
    { label: "Toggle light / dark theme", key: "↹", act: function () { setTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light"); } }
  ];
  function renderList() {
    if (!pList) return;
    var q = (pInput.value || "").toLowerCase().trim();
    filtered = COMMANDS.filter(function (c) { return c.label.toLowerCase().indexOf(q) !== -1; }); selIndex = 0;
    if (!filtered.length) { pList.innerHTML = '<li class="palette-empty">no matches</li>'; return; }
    pList.innerHTML = filtered.map(function (c, i) { return '<li role="option" data-i="' + i + '" aria-selected="' + (i === 0) + '"><span>' + c.label + '</span><span class="pk">' + c.key + '</span></li>'; }).join("");
  }
  function markSel() { [].forEach.call(pList.children, function (li, i) { var on = i === selIndex; li.setAttribute("aria-selected", String(on)); if (on && li.scrollIntoView) li.scrollIntoView({ block: "nearest" }); }); }
  function openPalette() { if (!palette) return; lastFocus = document.activeElement; palette.hidden = false; pInput.value = ""; renderList(); pInput.focus(); }
  function closePalette() { if (!palette || palette.hidden) return; palette.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  function runSel() { var c = filtered[selIndex]; if (c) { closePalette(); c.act(); } }
  if (palette) {
    if (pOpenBtn) pOpenBtn.addEventListener("click", openPalette);
    palette.addEventListener("click", function (e) { if (e.target.hasAttribute("data-close")) closePalette(); });
    pInput.addEventListener("input", renderList);
    pList.addEventListener("click", function (e) { var li = e.target.closest("li[data-i]"); if (!li) return; selIndex = +li.getAttribute("data-i"); runSel(); });
    pInput.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); selIndex = Math.min(selIndex + 1, filtered.length - 1); markSel(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); selIndex = Math.max(selIndex - 1, 0); markSel(); }
      else if (e.key === "Enter") { e.preventDefault(); runSel(); }
      else if (e.key === "Escape") { e.preventDefault(); closePalette(); }
    });
    document.addEventListener("keydown", function (e) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || "") || e.target.isContentEditable;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || ((e.key === "k" || e.key === "/") && !typing && palette.hidden)) { e.preventDefault(); openPalette(); }
    });
  }

  /* ====================== Scroll progress ====================== */
  var progress = document.getElementById("progress");
  if (progress) {
    var onScroll = function () { var h = document.documentElement.scrollHeight - window.innerHeight; progress.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%"; };
    window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll); onScroll();
  }

  /* ====================== Ambient hero field ====================== */
  var field = document.getElementById("field");
  var fctx = field && field.getContext ? field.getContext("2d") : null;
  if (fctx && !reduceMotion && !matchMedia("(max-width: 640px)").matches) {
    var W = 0, Hh = 0, fd = Math.min(window.devicePixelRatio || 1, 1.5), parts = [], raf = 0, vis = true, mouse = { x: -1, y: -1 }, col = "";
    function fresize() { var r = field.getBoundingClientRect(); W = r.width; Hh = r.height; field.width = W * fd; field.height = Hh * fd; fctx.setTransform(fd, 0, 0, fd, 0, 0); }
    function seed() { parts = []; var n = Math.round(clamp(W / 14, 50, 110)); for (var i = 0; i < n; i++) parts.push({ x: Math.random() * W, y: Math.random() * Hh }); }
    function flow(x, y, t) { var k = .0042, vx = Math.cos(y * k + t) + Math.sin((x + y) * k * .6 - t * .7), vy = Math.sin(x * k - t) + Math.cos((x - y) * k * .6 + t * .5); if (mouse.x >= 0) { var dx = x - mouse.x, dy = y - mouse.y, d2 = dx * dx + dy * dy + 9000; vx += -dx / d2 * 16000; vy += -dy / d2 * 16000; } return { vx: vx, vy: vy }; }
    themeListeners.push(function () { col = css("--accent"); }); col = css("--accent");
    function frame(ts) { raf = requestAnimationFrame(frame); if (!vis) return; var t = (ts || 0) * .00018; fctx.fillStyle = css("--bg"); fctx.globalAlpha = .12; fctx.fillRect(0, 0, W, Hh); fctx.globalAlpha = 1; fctx.strokeStyle = col; fctx.lineWidth = 1; fctx.globalAlpha = .5; for (var i = 0; i < parts.length; i++) { var p = parts[i], v = flow(p.x, p.y, t), nx = p.x + v.vx * .9, ny = p.y + v.vy * .9; fctx.beginPath(); fctx.moveTo(p.x, p.y); fctx.lineTo(nx, ny); fctx.stroke(); p.x = nx; p.y = ny; if (p.x < 0 || p.x > W || p.y < 0 || p.y > Hh) { p.x = Math.random() * W; p.y = Math.random() * Hh; } } fctx.globalAlpha = 1; }
    var frt; window.addEventListener("resize", function () { clearTimeout(frt); frt = setTimeout(function () { fresize(); seed(); }, 150); });
    field.parentElement.addEventListener("mousemove", function (e) { var r = field.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    field.parentElement.addEventListener("mouseleave", function () { mouse.x = mouse.y = -1; });
    document.addEventListener("visibilitychange", function () { vis = !document.hidden; });
    new IntersectionObserver(function (es) { vis = es[0].isIntersecting && !document.hidden; }).observe(field);
    fresize(); seed(); raf = requestAnimationFrame(frame);
  }
})();
