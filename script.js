/* Owen Loh — portfolio v2. Progressive enhancement only; page works without JS. */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var css = function (name) { return getComputedStyle(root).getPropertyValue(name).trim(); };

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
  var themeListeners = [];
  function onThemeChange() { themeListeners.forEach(function (f) { try { f(); } catch (e) {} }); }

  /* ====================== Extraction instrument ====================== */
  var grindEl = document.getElementById("grind");
  var flowEl = document.getElementById("flow");

  function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }

  function model(grind, flow) {
    var fineness = clamp((1200 - grind) / 1000, 0, 1);   // 0 coarse .. 1 fine
    var fn = clamp((flow - 1) / 7, 0, 1);                // 0 slow .. 1 fast
    var tau = 25 + (1 - fineness) * 70;                  // extraction time constant (s)
    var Tc = 45 + (8 - flow) * 22;                       // contact-time window (s)
    var ey = 24 * (1 - Math.exp(-Tc / tau));            // realised extraction yield (%)
    var tds = ey * 0.063;
    var acidity = clamp(0.45 + 0.50 * fn - 0.055 * (ey - 18), 0, 1);
    var bitter  = clamp(0.18 + 0.072 * (ey - 14) + 0.18 * fineness - 0.18 * fn, 0, 1);
    var body    = clamp(0.30 + 0.50 * fineness + 0.0375 * (ey - 16) - 0.10 * fn, 0, 1);
    var sweet   = clamp(Math.exp(-Math.pow((ey - 19.5) / 3.2, 2)), 0, 1);
    var clarity = clamp(0.40 + 0.42 * fn + 0.28 * (1 - fineness) - 0.30 * body, 0, 1);
    return { fineness: fineness, fn: fn, tau: tau, Tc: Tc, ey: ey, tds: tds,
             acidity: acidity, sweet: sweet, body: body, bitter: bitter, clarity: clarity };
  }

  // central-difference partial of field f w.r.t. grind/flow, scaled to "flavour points" per step
  function partial(field, grind, flow, which) {
    var dg = 50, df = 0.25;
    if (which === "grind") {
      var a = model(grind - dg, flow)[field], b = model(grind + dg, flow)[field];
      return (b - a) / (2 * dg) * 100 * 100;   // pts per +100 µm
    }
    var c = model(grind, flow - df)[field], d = model(grind, flow + df)[field];
    return (d - c) / (2 * df) * 100 * 1;        // pts per +1 g/s
  }

  var curve = document.getElementById("curve");
  var cctx = curve && curve.getContext ? curve.getContext("2d") : null;
  var radarShape = document.getElementById("radar-shape");
  var RADAR_ANGLES = [-90, -18, 54, 126, 198].map(function (d) { return d * Math.PI / 180; });

  function fmtSigned(v) { return (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1); }
  function setJac(id, v) {
    var el = document.getElementById(id); if (!el) return;
    el.textContent = fmtSigned(v);
    el.style.color = v >= 0 ? css("--accent") : css("--accent-2");
  }

  function drawCurve(m) {
    if (!cctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cssW = curve.clientWidth || 520, cssH = cssW * 300 / 520;
    curve.width = cssW * dpr; curve.height = cssH * dpr;
    curve.style.height = cssH + "px";
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var W = cssW, H = cssH, padL = 36, padR = 12, padT = 12, padB = 24;
    var xMax = 220, yMax = 26;
    var mx = function (t) { return padL + (t / xMax) * (W - padL - padR); };
    var my = function (y) { return (H - padB) - (y / yMax) * (H - padB - padT); };
    var line = css("--line"), faint = css("--faint"), accent = css("--accent"), text = css("--muted");
    cctx.clearRect(0, 0, W, H);
    cctx.font = "10px " + "ui-monospace, monospace";
    // gridlines + labels
    cctx.strokeStyle = line; cctx.fillStyle = faint; cctx.lineWidth = 1;
    [0, 10, 20].forEach(function (y) {
      cctx.globalAlpha = 0.6; cctx.beginPath(); cctx.moveTo(padL, my(y)); cctx.lineTo(W - padR, my(y)); cctx.stroke();
      cctx.globalAlpha = 1; cctx.fillText(y + "%", 4, my(y) + 3);
    });
    [0, 100, 200].forEach(function (t) { cctx.fillText(t + "s", mx(t) - 6, H - 8); });
    // extraction curve y(t) = 24(1 - e^{-t/tau})
    cctx.strokeStyle = accent; cctx.lineWidth = 2; cctx.beginPath();
    for (var t = 0; t <= xMax; t += 2) {
      var y = 24 * (1 - Math.exp(-t / m.tau));
      var X = mx(t), Y = my(y);
      if (t === 0) cctx.moveTo(X, Y); else cctx.lineTo(X, Y);
    }
    cctx.stroke();
    // realised point at Tc
    var rx = mx(m.Tc), ry = my(m.ey);
    cctx.strokeStyle = faint; cctx.setLineDash([3, 3]); cctx.lineWidth = 1;
    cctx.beginPath(); cctx.moveTo(rx, my(0)); cctx.lineTo(rx, ry); cctx.stroke(); cctx.setLineDash([]);
    cctx.fillStyle = accent; cctx.beginPath(); cctx.arc(rx, ry, 4, 0, 7); cctx.fill();
    cctx.fillStyle = text; cctx.fillText(m.ey.toFixed(1) + "% @ " + Math.round(m.Tc) + "s", Math.min(rx + 6, W - 78), ry - 6);
  }

  function drawRadar(m) {
    if (!radarShape) return;
    var vals = [m.acidity, m.sweet, m.body, m.bitter, m.clarity];
    var pts = vals.map(function (v, i) {
      var r = 14 + clamp(v, 0, 1) * 64;
      var x = 110 + r * Math.cos(RADAR_ANGLES[i]);
      var y = 110 + r * Math.sin(RADAR_ANGLES[i]);
      return x.toFixed(1) + "," + y.toFixed(1);
    });
    radarShape.setAttribute("points", pts.join(" "));
  }

  var lastM = null;
  function update() {
    if (!grindEl || !flowEl) return;
    var g = +grindEl.value, f = +flowEl.value;
    var m = model(g, f); lastM = m;
    var og = document.getElementById("o-grind"); if (og) og.textContent = Math.round(g) + " µm";
    var of = document.getElementById("o-flow"); if (of) of.textContent = f.toFixed(1) + " g/s";
    var ot = document.getElementById("o-tds"); if (ot) ot.textContent = m.tds.toFixed(2) + "%";
    var oe = document.getElementById("o-ey"); if (oe) oe.textContent = m.ey.toFixed(1) + "%";
    setJac("j1", partial("bitter", g, f, "flow"));
    setJac("j2", partial("acidity", g, f, "grind"));
    setJac("j3", partial("body", g, f, "grind"));
    drawCurve(m); drawRadar(m);
  }

  if (grindEl && flowEl) {
    grindEl.addEventListener("input", update);
    flowEl.addEventListener("input", update);
    themeListeners.push(function () { if (lastM) { drawCurve(lastM); update(); } });
    window.addEventListener("resize", function () { if (lastM) drawCurve(lastM); });
    update();
  }

  /* ====================== Command palette ====================== */
  var palette = document.getElementById("palette");
  var pInput = document.getElementById("palette-input");
  var pList = document.getElementById("palette-list");
  var pOpenBtn = document.getElementById("palette-open");
  var lastFocus = null, selIndex = 0, filtered = [];

  var COMMANDS = [
    { label: "Instrument — computable sensitivities", key: "go", act: function () { jump("#instrument"); } },
    { label: "Selected work", key: "go", act: function () { jump("#work"); } },
    { label: "Research — battery state-of-health", key: "go", act: function () { jump("#research"); } },
    { label: "Open GitHub", key: "↗", act: function () { open_("https://github.com/owenloh"); } },
    { label: "Open LinkedIn", key: "↗", act: function () { open_("https://www.linkedin.com/in/olzm"); } },
    { label: "Email Owen", key: "↗", act: function () { open_("mailto:owenloh0607@gmail.com"); } },
    { label: "PourDynamics repo", key: "↗", act: function () { open_("https://github.com/owenloh/PourDynamics"); } },
    { label: "3D-Software-MCP-Server repo", key: "↗", act: function () { open_("https://github.com/owenloh/3D-Software-MCP-Server"); } },
    { label: "Agentic-SEGY-Metadata-Parser repo", key: "↗", act: function () { open_("https://github.com/owenloh/Agentic-SEGY-Metadata-Parser"); } },
    { label: "Alistair-MCP repo", key: "↗", act: function () { open_("https://github.com/owenloh/Alistair-MCP"); } },
    { label: "usecatalon.com", key: "↗", act: function () { open_("https://usecatalon.com"); } },
    { label: "Toggle light / dark theme", key: "↹", act: function () { setTheme(root.getAttribute("data-theme") === "light" ? "dark" : "light"); } }
  ];
  function jump(sel) { var el = document.querySelector(sel); if (el) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }); }
  function open_(url) { window.open(url, url.indexOf("mailto:") === 0 ? "_self" : "_blank", "noopener"); }

  function renderList() {
    if (!pList) return;
    var q = (pInput.value || "").toLowerCase().trim();
    filtered = COMMANDS.filter(function (c) { return c.label.toLowerCase().indexOf(q) !== -1; });
    selIndex = 0;
    if (!filtered.length) { pList.innerHTML = '<li class="palette-empty">no matches</li>'; return; }
    pList.innerHTML = filtered.map(function (c, i) {
      return '<li role="option" data-i="' + i + '" aria-selected="' + (i === 0) + '"><span>' + c.label + '</span><span class="pk">' + c.key + '</span></li>';
    }).join("");
  }
  function markSel() {
    [].forEach.call(pList.children, function (li, i) {
      var on = i === selIndex; li.setAttribute("aria-selected", String(on));
      if (on && li.scrollIntoView) li.scrollIntoView({ block: "nearest" });
    });
  }
  function openPalette() {
    if (!palette) return;
    lastFocus = document.activeElement;
    palette.hidden = false; pInput.value = ""; renderList();
    pInput.focus();
  }
  function closePalette() {
    if (!palette || palette.hidden) return;
    palette.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function runSel() { var c = filtered[selIndex]; if (c) { closePalette(); c.act(); } }

  if (palette) {
    if (pOpenBtn) pOpenBtn.addEventListener("click", openPalette);
    palette.addEventListener("click", function (e) { if (e.target.hasAttribute("data-close")) closePalette(); });
    pInput.addEventListener("input", renderList);
    pList.addEventListener("click", function (e) {
      var li = e.target.closest("li[data-i]"); if (!li) return;
      selIndex = +li.getAttribute("data-i"); runSel();
    });
    pInput.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); selIndex = Math.min(selIndex + 1, filtered.length - 1); markSel(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); selIndex = Math.max(selIndex - 1, 0); markSel(); }
      else if (e.key === "Enter") { e.preventDefault(); runSel(); }
      else if (e.key === "Escape") { e.preventDefault(); closePalette(); }
    });
    document.addEventListener("keydown", function (e) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || "")) || e.target.isContentEditable;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || ((e.key === "k" || e.key === "/") && !typing && palette.hidden)) {
        e.preventDefault(); openPalette();
      }
    });
  }

  /* ====================== Scroll progress + reveal ====================== */
  var progress = document.getElementById("progress");
  if (progress) {
    var onScroll = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll); onScroll();
  }

  /* ====================== Project demos (lazy-init on open) ====================== */
  (function () {
    var demoRedraws = [];
    var inited = [];
    function dpr() { return Math.min(window.devicePixelRatio || 1, 2); }
    function sizeCanvas(cv) {
      var w = cv.clientWidth || cv.width;
      var h = w * (cv.height / cv.width || 0.4);
      var d = dpr();
      cv.width = w * d; cv.height = h * d; cv.style.height = h + "px";
      var ctx = cv.getContext("2d"); ctx.setTransform(d, 0, 0, d, 0, 0);
      cv._w = w; cv._h = h; return ctx;
    }
    var registry = { catalon: catalon, seismic: seismic, crispr: crispr, battery: battery };
    function boot(d) {
      if (inited.indexOf(d) !== -1) return;
      var fn = registry[d.getAttribute("data-demo")];
      var box = d.querySelector("[data-demo-body]");
      if (!fn || !box) return;
      inited.push(d);
      try { fn(box); } catch (e) {}
    }
    [].forEach.call(document.querySelectorAll("details[data-demo]"), function (d) {
      if (d.open) boot(d);
      d.addEventListener("toggle", function () { if (d.open) boot(d); });
    });
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { demoRedraws.forEach(function (f) { try { f(); } catch (e) {} }); }, 160); });
    themeListeners.push(function () { demoRedraws.forEach(function (f) { try { f(); } catch (e) {} }); });

    /* ---- Catalon: agentic PO pipeline ---- */
    function catalon(box) {
      var btn = box.querySelector("[data-act=run]");
      var stages = [].slice.call(box.querySelectorAll(".stages span"));
      var out = box.querySelector(".po-out");
      if (!btn) return;
      function rowEl(a, b) { return '<div class="po-row"><span>' + a + '</span><span>' + b + '</span></div>'; }
      btn.addEventListener("click", function () {
        btn.disabled = true; out.hidden = true; out.innerHTML = "";
        stages.forEach(function (s) { s.className = ""; });
        var i = 0;
        (function step() {
          if (i > 0) stages[i - 1].className = "done";
          if (i < stages.length) { stages[i].className = "on"; i++; setTimeout(step, 380); }
          else {
            out.hidden = false;
            out.innerHTML =
              '<div class="po-meta">&#10003; customer resolved &middot; ERP draft ready &middot; 2.7 s</div>' +
              rowEl("Acetone &middot; technical 99.5%", "2 drums &rarr; 110 gal") +
              rowEl("Isopropanol &middot; usual grade", "500 gal") +
              rowEl("terms", "Net 30 &middot; deliver Fri") +
              rowEl("status", "awaiting 1-click approval");
            btn.disabled = false; btn.textContent = "Run again ▸";
          }
        })();
      });
    }

    /* ---- Seismic: natural-language navigation ---- */
    function seismic(box) {
      var cv = box.querySelector(".seis"); if (!cv) return;
      var ctx = cv.getContext("2d");
      var input = box.querySelector(".cmd"), echo = box.querySelector(".cmd-echo");
      var faultX = 0.62, raf = 0;
      var st = { cx: 0.5, zoom: 1, vel: 0 }, tg = { cx: 0.5, zoom: 1, vel: 0 };
      function size() { ctx = sizeCanvas(cv); }
      function draw() {
        var W = cv._w, H = cv._h; if (!W) return;
        var line = css("--line"), accent = css("--accent"), faint = css("--faint"), muted = css("--muted");
        ctx.clearRect(0, 0, W, H);
        var half = 0.5 / st.zoom, x0 = st.cx - half;
        if (st.vel) {
          var g = ctx.createLinearGradient(0, 0, W, 0);
          g.addColorStop(0, "rgba(90,140,230,0.12)"); g.addColorStop(0.5, "rgba(120,200,170,0.10)"); g.addColorStop(1, "rgba(230,130,90,0.14)");
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        }
        var layers = 13;
        for (var li = 0; li < layers; li++) {
          var yBase = (li + 0.6) / (layers + 0.5);
          ctx.beginPath();
          for (var px = 0; px <= W; px += 3) {
            var u = x0 + (px / W) * (2 * half);
            var amp = 0.012 + 0.009 * Math.sin(li * 0.9 + 1);
            var y = yBase + amp * Math.sin(u * 20 + li * 0.7);
            if (u > faultX) y += 0.05;
            var Y = y * H;
            if (px === 0) ctx.moveTo(px, Y); else ctx.lineTo(px, Y);
          }
          ctx.strokeStyle = st.vel ? "rgba(255,255,255,0.28)" : muted;
          ctx.globalAlpha = st.vel ? 0.7 : 0.55; ctx.lineWidth = 1.4; ctx.stroke(); ctx.globalAlpha = 1;
        }
        if (faultX > x0 && faultX < x0 + 2 * half) {
          var fx = ((faultX - x0) / (2 * half)) * W;
          ctx.strokeStyle = accent; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.moveTo(fx, 0); ctx.lineTo(fx, H); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = accent; ctx.font = "10px ui-monospace,monospace";
          ctx.fillText("fault", Math.min(fx + 5, W - 32), 13);
        }
        ctx.fillStyle = faint; ctx.font = "10px ui-monospace,monospace";
        ctx.fillText("IL " + Math.round(900 + st.cx * 300) + " · ×" + st.zoom.toFixed(1) + (st.vel ? " · velocity" : ""), 6, H - 7);
      }
      function animate() {
        cancelAnimationFrame(raf);
        (function tick() {
          st.cx += (tg.cx - st.cx) * 0.16; st.zoom += (tg.zoom - st.zoom) * 0.16; st.vel = tg.vel;
          draw();
          if (Math.abs(tg.cx - st.cx) > 0.002 || Math.abs(tg.zoom - st.zoom) > 0.01) raf = requestAnimationFrame(tick);
        })();
      }
      function run(cmd) {
        cmd = (cmd || "").toLowerCase(); var m;
        if (/fault/.test(cmd)) { tg.cx = faultX; tg.zoom = Math.max(tg.zoom, 1.9); m = "→ navigated to the fault · IL 1024 / XL 2030"; }
        else if (/gas|bright|amplitude/.test(cmd)) { tg.cx = 0.28; tg.zoom = 2.1; m = "→ navigated to the bright (gas) zone"; }
        else if (/in\b|closer|zoom in/.test(cmd)) { tg.zoom = clamp(tg.zoom * 1.4, 1, 6); m = "→ zoom in ×" + tg.zoom.toFixed(1); }
        else if (/out|wider|zoom out/.test(cmd)) { tg.zoom = clamp(tg.zoom / 1.4, 1, 6); m = "→ zoom out ×" + tg.zoom.toFixed(1); }
        else if (/vel/.test(cmd)) { tg.vel = st.vel ? 0 : 1; m = "→ velocity model " + (tg.vel ? "on" : "off"); }
        else if (/left|west/.test(cmd)) { tg.cx = clamp(tg.cx - 0.16, 0.1, 0.9); m = "→ pan left"; }
        else if (/right|east/.test(cmd)) { tg.cx = clamp(tg.cx + 0.16, 0.1, 0.9); m = "→ pan right"; }
        else if (/reset|home|default/.test(cmd)) { tg.cx = 0.5; tg.zoom = 1; tg.vel = 0; m = "→ reset to default view"; }
        else { m = "? couldn't parse — try: go to the fault · zoom in · toggle velocity · reset"; }
        echo.textContent = m; animate();
      }
      if (input) input.addEventListener("keydown", function (e) { if (e.key === "Enter") { run(input.value); input.value = ""; } });
      [].forEach.call(box.querySelectorAll(".chips button"), function (b) { b.addEventListener("click", function () { run(b.getAttribute("data-cmd")); }); });
      demoRedraws.push(function () { size(); draw(); });
      size(); draw();
    }

    /* ---- CRISPR: complexity O(mn) vs O(m log n) ---- */
    function crispr(box) {
      var cv = box.querySelector(".cplx"); if (!cv) return;
      var ctx = cv.getContext("2d");
      var sl = box.querySelector(".n"), nO = box.querySelector(".n-out");
      var tN = box.querySelector(".t-naive"), tF = box.querySelector(".t-fast"), tS = box.querySelector(".t-speed");
      var C_FAST = 1.09, C_NAIVE = 1.545, LO = 3, HI = 9;
      function fmtN(n) { return n >= 1e9 ? (n / 1e9).toFixed(1) + "B bp" : n >= 1e6 ? (n / 1e6).toFixed(0) + "M bp" : n >= 1e3 ? (n / 1e3).toFixed(0) + "k bp" : Math.round(n) + " bp"; }
      function fmtT(s) { return s < 1 ? (s * 1000).toFixed(0) + " ms" : s < 90 ? s.toFixed(1) + " s" : s < 5400 ? (s / 60).toFixed(1) + " min" : s < 172800 ? (s / 3600).toFixed(1) + " h" : s < 3.15e7 ? (s / 86400).toFixed(1) + " days" : (s / 3.15e7).toFixed(1) + " yr"; }
      function fmtBig(x) { return x >= 1e6 ? (x / 1e6).toFixed(1) + "M" : x >= 1e3 ? (x / 1e3).toFixed(0) + "k" : Math.round(x).toString(); }
      function draw() {
        var n = Math.pow(10, +sl.value), naive = n * C_NAIVE, fast = Math.log2(n) * C_FAST;
        nO.textContent = fmtN(n);
        tN.textContent = fmtT(naive); tN.style.color = css("--accent-2");
        tF.textContent = fmtT(fast); tF.style.color = css("--accent");
        tS.textContent = "×" + fmtBig(naive / fast);
        ctx = sizeCanvas(cv); var W = cv._w, H = cv._h, padL = 8, padR = 8, padT = 10, padB = 10;
        var accent = css("--accent"), a2 = css("--accent-2"), faint = css("--faint");
        ctx.clearRect(0, 0, W, H);
        var tmin = Math.log2(Math.pow(10, LO)) * C_FAST, tmax = Math.pow(10, HI) * C_NAIVE;
        var lgmin = Math.log10(tmin), lgmax = Math.log10(tmax);
        function X(l) { return padL + ((l - LO) / (HI - LO)) * (W - padL - padR); }
        function Y(t) { return (H - padB) - ((Math.log10(Math.max(t, 1e-6)) - lgmin) / (lgmax - lgmin)) * (H - padT - padB); }
        function plot(f, c) { ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); for (var l = LO; l <= HI; l += 0.05) { var x = X(l), y = Y(f(l)); l === LO ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
        plot(function (l) { return Math.pow(10, l) * C_NAIVE; }, a2);
        plot(function (l) { return Math.log2(Math.pow(10, l)) * C_FAST; }, accent);
        var lc = Math.log10(n);
        ctx.strokeStyle = faint; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(lc), padT); ctx.lineTo(X(lc), H - padB); ctx.stroke(); ctx.setLineDash([]);
        function dot(y, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X(lc), y, 3.5, 0, 7); ctx.fill(); }
        dot(Y(naive), a2); dot(Y(fast), accent);
      }
      sl.addEventListener("input", draw); demoRedraws.push(draw); draw();
    }

    /* ---- Battery: OCV decomposition fit ---- */
    function battery(box) {
      var cv = box.querySelector(".ocv"); if (!cv) return;
      var ctx = cv.getContext("2d");
      var lam = box.querySelector(".lam"), lli = box.querySelector(".lli");
      var lamO = box.querySelector(".lam-out"), lliO = box.querySelector(".lli-out");
      var rmseO = box.querySelector(".rmse"), fitO = box.querySelector(".fitq");
      var TRUE = { lam: 15, lli: -4 };
      function cathode(z) { return 4.2 - 0.9 * z - 0.25 * Math.tanh((z - 0.5) * 6); }
      function anode(z) { return 0.09 + 0.34 * Math.exp(-z * 7) + 0.09 * Math.exp(-(z - 0.5) * (z - 0.5) * 38); }
      function cell(soc, L, S) {
        var peLo = 0.03 + L / 100 * 0.55, peHi = 0.97 - L / 100 * 0.55;
        var neLo = 0.02 + S / 100, neHi = 0.95 + S / 100;
        return cathode(peLo + soc * (peHi - peLo)) - anode(clamp(neLo + soc * (neHi - neLo), 0, 1));
      }
      function arr(L, S) { var a = []; for (var i = 0; i <= 60; i++) a.push(cell(i / 60, L, S)); return a; }
      var target = arr(TRUE.lam, TRUE.lli);
      function draw() {
        var L = +lam.value, S = +lli.value;
        lamO.textContent = L.toFixed(1) + "%"; lliO.textContent = (S >= 0 ? "+" : "") + S.toFixed(1) + "%";
        var cur = arr(L, S), e = 0;
        for (var i = 0; i < cur.length; i++) { var d = cur[i] - target[i]; e += d * d; }
        var rmse = Math.sqrt(e / cur.length);
        rmseO.textContent = rmse.toFixed(4) + " V";
        var q = rmse < 0.004 ? "excellent ✓" : rmse < 0.012 ? "good" : rmse < 0.03 ? "fair" : "poor";
        fitO.textContent = q; fitO.style.color = rmse < 0.012 ? css("--accent") : css("--accent-2");
        ctx = sizeCanvas(cv); var W = cv._w, H = cv._h, padL = 34, padR = 10, padT = 14, padB = 22;
        var line = css("--line"), faint = css("--faint"), accent = css("--accent"), muted = css("--muted");
        var vmin = 2.6, vmax = 4.35;
        function X(s) { return padL + s * (W - padL - padR); }
        function Y(v) { return (H - padB) - ((v - vmin) / (vmax - vmin)) * (H - padT - padB); }
        ctx.clearRect(0, 0, W, H); ctx.font = "10px ui-monospace,monospace"; ctx.lineWidth = 1;
        [3, 3.5, 4].forEach(function (v) { ctx.strokeStyle = line; ctx.globalAlpha = .5; ctx.beginPath(); ctx.moveTo(padL, Y(v)); ctx.lineTo(W - padR, Y(v)); ctx.stroke(); ctx.globalAlpha = 1; ctx.fillStyle = faint; ctx.fillText(v.toFixed(1), 6, Y(v) + 3); });
        ctx.fillStyle = faint; ctx.fillText("SOC →", W - 48, H - 7); ctx.fillText("0%", padL - 2, H - 7);
        ctx.strokeStyle = faint; ctx.setLineDash([2, 4]); ctx.lineWidth = 1.6; ctx.beginPath();
        for (var t = 0; t < target.length; t++) { var x = X(t / 60), y = Y(target[t]); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath();
        for (var j = 0; j < cur.length; j++) { var x2 = X(j / 60), y2 = Y(cur[j]); j ? ctx.lineTo(x2, y2) : ctx.moveTo(x2, y2); } ctx.stroke();
        ctx.fillStyle = accent; ctx.fillText("— reconstructed", padL + 2, padT + 2);
        ctx.fillStyle = faint; ctx.fillText("··· measured", padL + 110, padT + 2);
      }
      lam.addEventListener("input", draw); lli.addEventListener("input", draw);
      demoRedraws.push(draw); draw();
    }
  })();

  /* ====================== Ambient hero field ====================== */
  var field = document.getElementById("field");
  var fctx = field && field.getContext ? field.getContext("2d") : null;
  var smallScreen = matchMedia("(max-width: 640px)").matches;
  if (fctx && !reduceMotion && !smallScreen) {
    var W = 0, Hh = 0, dpr = Math.min(window.devicePixelRatio || 1, 1.5), parts = [], raf = 0, vis = true;
    var mouse = { x: -1, y: -1 };
    function resize() {
      var r = field.getBoundingClientRect(); W = r.width; Hh = r.height;
      field.width = W * dpr; field.height = Hh * dpr; fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function seed() {
      parts = []; var n = Math.round(clamp(W / 14, 50, 110));
      for (var i = 0; i < n; i++) parts.push({ x: Math.random() * W, y: Math.random() * Hh });
    }
    function flow(x, y, t) {
      var k = 0.0042;
      var vx = Math.cos(y * k + t) + Math.sin((x + y) * k * 0.6 - t * 0.7);
      var vy = Math.sin(x * k - t) + Math.cos((x - y) * k * 0.6 + t * 0.5);
      if (mouse.x >= 0) { var dx = x - mouse.x, dy = y - mouse.y, d2 = dx * dx + dy * dy + 9000; vx += -dx / d2 * 16000; vy += -dy / d2 * 16000; }
      return { vx: vx, vy: vy };
    }
    var col = "";
    function refreshCol() { col = css("--accent"); }
    themeListeners.push(refreshCol); refreshCol();
    var t0 = 0;
    function frame(ts) {
      raf = requestAnimationFrame(frame);
      if (!vis) return;
      var t = (ts || 0) * 0.00018;
      fctx.fillStyle = css("--bg");
      fctx.globalAlpha = 0.12; fctx.fillRect(0, 0, W, Hh); fctx.globalAlpha = 1;
      fctx.strokeStyle = col; fctx.lineWidth = 1; fctx.globalAlpha = 0.5;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i], v = flow(p.x, p.y, t);
        var nx = p.x + v.vx * 0.9, ny = p.y + v.vy * 0.9;
        fctx.beginPath(); fctx.moveTo(p.x, p.y); fctx.lineTo(nx, ny); fctx.stroke();
        p.x = nx; p.y = ny;
        if (p.x < 0 || p.x > W || p.y < 0 || p.y > Hh) { p.x = Math.random() * W; p.y = Math.random() * Hh; }
      }
      fctx.globalAlpha = 1;
    }
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { resize(); seed(); }, 150); });
    field.parentElement.addEventListener("mousemove", function (e) { var r = field.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    field.parentElement.addEventListener("mouseleave", function () { mouse.x = mouse.y = -1; });
    document.addEventListener("visibilitychange", function () { vis = !document.hidden; });
    var heroIO = new IntersectionObserver(function (es) { vis = es[0].isIntersecting && !document.hidden; });
    heroIO.observe(field);
    resize(); seed(); raf = requestAnimationFrame(frame);
  }
})();
