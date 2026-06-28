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
    { label: "Awards", key: "go", act: function () { jump("#awards"); } },
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

  if (!reduceMotion && "IntersectionObserver" in window) {
    var blocks = [].slice.call(document.querySelectorAll(".block"));
    blocks.forEach(function (el) { el.classList.add("reveal"); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
    blocks.forEach(function (el) { io.observe(el); });
    // safety net: never leave content hidden
    setTimeout(function () { blocks.forEach(function (el) { el.classList.add("in"); }); }, 2200);
  }

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
