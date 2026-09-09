/* ==========================================================================
   Owen Loh - the five demonstrations.

   Each block below is a small model plus a render pass. The page is complete
   and correct before this file runs: every demo's opening state is already in
   the markup, so this only takes over once the reader touches something.
   ========================================================================== */

(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var clamp = function (x, a, b) { return Math.min(b, Math.max(a, x)); };
  var pct = function (v) { return (clamp(v, 0, 1) * 100).toFixed(3) + '%'; };
  var svgEl = function (name) { return document.createElementNS('http://www.w3.org/2000/svg', name); };

  /* ------------------------------------------------------------------------
     1. Catalon: order intake

     Three inbound orders, each awkward in a different way. The pipeline is
     staged rather than instant because the staging is the point: mail is
     triaged before any model runs.
     ------------------------------------------------------------------------ */

  var MAILS = [
    {
      body: 'Subj: PO 4471 restock\n' +
        'ship to our Houston dock:\n' +
        '  2 drums acetone, technical 99.5%\n' +
        '  500 gal isopropanol (usual grade)\n' +
        'need by Friday, Net 30.',
      rows: [
        ['customer', 'Gulf Coast Solvents, Houston TX. Matched on alias 2 of 3.'],
        ['line 1', '2 x 55 gal drum. Acetone technical 99.5%. SKU ACE-T995-D55.'],
        ['line 2', '500 gal to 3,275 lb. Isopropanol 99%. Density 0.786. Contract price.'],
        ['terms', 'Net 30. Ship Fri 12 Sep. Houston dock, customer default.']
      ],
      note: 'Line two is the work. The price book is kept per pound, the order is in gallons, and the contract price beats list.'
    },
    {
      body: 'Subj: same as last month\n' +
        'Hi Dana, can we do the usual again please.\n' +
        'Bump the caustic to 3 totes this time.\n' +
        'Thanks, Ray',
      rows: [
        ['customer', 'Midland Chemical Co. Matched on sender history.'],
        ['prior', 'Repeats PO 3318, 14 Aug. Four lines recovered.'],
        ['line 3', 'Sodium hydroxide 50%. 2 totes to 3 totes. Tier price applies.'],
        ['terms', 'Net 45. Standing route, Thursday drop.']
      ],
      note: 'No product names, no quantities, no PO number. The order is the customer history plus one delta.'
    },
    {
      body: 'Subj: RFQ\n' +
        'Need pricing on 20 MT glycol, delivered Rotterdam.\n' +
        'Also when can you ship?',
      rows: [
        ['customer', 'Nordkem BV. New sender, domain matched.'],
        ['intent', 'Quotation request, not an order. Routed to sales.'],
        ['line 1', '20 MT monoethylene glycol. Delivered Rotterdam.'],
        ['terms', 'No PO issued. Draft held for pricing.']
      ],
      note: 'Triaged out before extraction. Most of the inbox is not an order, and paying a model to read it is how these systems get expensive.'
    }
  ];

  function orderIntake(root) {
    var mailEl = $('[data-po-mail]', root);
    var mailNo = $('[data-po-mailno]', root);
    var draft = $('.draft', root);
    var stateEl = $('[data-po-state]', root);
    var rowsEl = $('[data-po-rows]', root);
    var rail = $$('.rail-node', root);
    var runBtn = $('[data-po-run]', root);
    var nextBtn = $('[data-po-next]', root);
    var noteEl = $('[data-po-note]', root);
    var timeEl = $('[data-po-time]', root);

    var s = { mail: 0, stage: -1, done: false, ms: 0 };
    var timers = [];

    function clear() { timers.forEach(clearTimeout); timers = []; }

    function row(key, value, filled, status) {
      var div = document.createElement('div');
      div.className = 'draft-row' + (filled ? ' is-filled' : '') + (status ? ' is-status' : '');
      var dt = document.createElement('dt');
      dt.textContent = key;
      var dd = document.createElement('dd');
      dd.textContent = value;
      div.appendChild(dt);
      div.appendChild(dd);
      return div;
    }

    function render() {
      var m = MAILS[s.mail];
      mailEl.textContent = m.body;
      mailNo.textContent = (s.mail + 1) + ' / ' + MAILS.length;

      var state = s.done ? 'validated' : s.stage >= 0 ? 'filling' : 'empty';
      draft.dataset.state = state;
      stateEl.textContent = state;

      rowsEl.textContent = '';
      m.rows.forEach(function (r) {
        rowsEl.appendChild(row(r[0], s.done ? r[1] : '—', s.done, false));
      });
      rowsEl.appendChild(row(
        'status',
        s.done ? 'validated, ready for approval' : s.stage >= 0 ? 'running' : 'idle',
        s.done,
        true
      ));

      rail.forEach(function (node, i) {
        node.classList.toggle('is-on', s.stage >= i);
        node.classList.toggle('is-lit', i > 0 && s.stage >= i - 1);
      });

      runBtn.textContent = s.done ? 'Run again' : 'Process';
      timeEl.textContent = s.done ? (s.ms / 1000).toFixed(1) + ' s' : '';
      noteEl.textContent = s.done ? m.note : '';
    }

    runBtn.addEventListener('click', function () {
      clear();
      s.stage = -1;
      s.done = false;
      s.ms = 1900 + Math.round(Math.random() * 1100);
      render();
      [0, 1, 2, 3, 4].forEach(function (i) {
        timers.push(setTimeout(function () {
          s.stage = i;
          s.done = i === 4;
          render();
        }, 240 + i * 380));
      });
    });

    nextBtn.addEventListener('click', function () {
      clear();
      s.mail = (s.mail + 1) % MAILS.length;
      s.stage = -1;
      s.done = false;
      render();
    });

    render();
  }

  /* ------------------------------------------------------------------------
     2. PourDynamics: two variables, one cup

     An illustrative reduction of the extraction engine, not the engine. It
     exists to show the shape of the Jacobian: grind and flow move the cup,
     almost nothing else does.
     ------------------------------------------------------------------------ */

  function brew(g, f) {
    var fine = clamp((1200 - g) / 1000, 0, 1);
    var fn = clamp((f - 1) / 7, 0, 1);
    var ey = clamp(17 + 9 * fine - 3 * fn, 11, 27);
    var body = clamp(0.30 + 0.50 * fine + 0.0375 * (ey - 16) - 0.10 * fn, 0, 1);
    return {
      ey: ey,
      tds: ey * 0.0645,
      body: body,
      acidity: clamp(0.45 + 0.50 * fn - 0.055 * (ey - 18), 0, 1),
      bitter: clamp(0.18 + 0.072 * (ey - 14) + 0.18 * fine - 0.18 * fn, 0, 1),
      sweet: clamp(Math.exp(-Math.pow((ey - 19.5) / 3.2, 2)), 0, 1),
      clarity: clamp(0.40 + 0.42 * fn + 0.28 * (1 - fine) - 0.30 * body, 0, 1)
    };
  }

  var RADAR_ANGLES = [-90, -18, 54, 126, 198];

  function radarPoints(b) {
    return [b.acidity, b.sweet, b.body, b.bitter, b.clarity].map(function (v, i) {
      var r = 14 + clamp(v, 0, 1) * 64;
      var a = RADAR_ANGLES[i] * Math.PI / 180;
      return (110 + r * Math.cos(a)).toFixed(1) + ',' + (110 + r * Math.sin(a)).toFixed(1);
    }).join(' ');
  }

  function cupNote(ey) {
    if (ey < 17) return 'Under extracted. Sour, thin, finishes short.';
    if (ey > 22) return 'Over extracted. Drying and bitter, sweetness gone.';
    if (ey > 20.5) return 'Full and syrupy, bitterness at the edges.';
    return 'Balanced. Sweet through the middle, acidity present but not sharp.';
  }

  function brewDemo(root) {
    var grind = $('#grind', root);
    var flow = $('#flow', root);
    var outGrind = $('#out-grind', root);
    var outFlow = $('#out-flow', root);
    var tds = $('[data-brew-tds]', root);
    var ey = $('[data-brew-ey]', root);
    var radar = $('[data-brew-radar]', root);
    var jac = $$('[data-brew-jac] span:last-child', root);
    var cup = $('[data-brew-cup]', root);

    var fmt = function (v) { return (v >= 0 ? '+' : '') + v.toFixed(3); };

    function render() {
      var g = +grind.value;
      var f = +flow.value;
      var b = brew(g, f);
      var dFlow = brew(g, f + 1);
      var dGrind = brew(g + 100, f);

      outGrind.textContent = Math.round(g) + ' µm';
      outFlow.textContent = f.toFixed(1) + ' g/s';
      tds.textContent = b.tds.toFixed(2) + '%';
      ey.textContent = b.ey.toFixed(1) + '%';
      radar.setAttribute('points', radarPoints(b));

      jac[0].textContent = fmt(dFlow.bitter - b.bitter) + ' per g/s';
      jac[1].textContent = fmt(dGrind.acidity - b.acidity) + ' per 100 µm';
      jac[2].textContent = fmt(dGrind.body - b.body) + ' per 100 µm';

      cup.textContent = cupNote(b.ey);
    }

    grind.addEventListener('input', render);
    flow.addEventListener('input', render);
    render();
  }

  /* ------------------------------------------------------------------------
     3. SeisPilot: speak to the 3D volume

     The reflectors and the fault are static geometry and already in the
     markup. A command only moves the camera, toggles the velocity overlay,
     and writes the calls it planned.
     ------------------------------------------------------------------------ */

  var SEIS_W = 420;
  var SEIS_H = 230;

  var COMMANDS = [
    { text: 'go to the fault',
      calls: [['nav.setInline(2410)', 'ok'], ['view.centerOnPick("F3")', 'ok']],
      act: function (v) { return { cx: 0.62, zoom: Math.max(v.zoom, 1.6), vel: v.vel }; } },
    { text: 'zoom in',
      calls: [['view.zoom(1.5)', 'ok']],
      act: function (v) { return { cx: v.cx, zoom: Math.min(v.zoom * 1.5, 3.4), vel: v.vel }; } },
    { text: 'zoom out',
      calls: [['view.zoom(0.67)', 'ok']],
      act: function (v) { return { cx: v.cx, zoom: Math.max(v.zoom / 1.5, 1), vel: v.vel }; } },
    { text: 'toggle velocity',
      calls: [['overlay.set("velocity")', 'ok']],
      act: function (v) { return { cx: v.cx, zoom: v.zoom, vel: !v.vel }; } },
    { text: 'reset',
      calls: [['view.reset()', 'ok']],
      act: function () { return { cx: 0.5, zoom: 1, vel: false }; } },
    { text: 'delete the survey',
      calls: [['project.deleteSurvey("NS-4")', 'blocked'], ['audit.log("denied: not whitelisted")', 'ok']],
      act: function (v) { return v; } }
  ];

  function viewBoxFor(view) {
    var vw = SEIS_W / view.zoom;
    var vh = SEIS_H / view.zoom;
    var vx = clamp(view.cx * SEIS_W - vw / 2, 0, SEIS_W - vw);
    var vy = clamp(0.5 * SEIS_H - vh / 2, 0, SEIS_H - vh);
    return vx.toFixed(1) + ' ' + vy.toFixed(1) + ' ' + vw.toFixed(1) + ' ' + vh.toFixed(1);
  }

  function seisDemo(root) {
    var chips = $('[data-seis-chips]', root);
    var svg = $('[data-seis-svg]', root);
    var bands = $('[data-seis-bands]', root);
    var zoom = $('[data-seis-zoom]', root);
    var calls = $('[data-seis-calls]', root);

    var view = { cx: 0.5, zoom: 1, vel: false };
    var active = -1;
    var buttons = COMMANDS.map(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn chip';
      b.setAttribute('aria-pressed', 'false');
      b.textContent = '“' + c.text + '”';
      b.addEventListener('click', function () {
        view = c.act(view);
        active = i;
        render();
      });
      chips.appendChild(b);
      return b;
    });

    function renderBands() {
      bands.textContent = '';
      if (!view.vel) return;
      for (var k = 0; k < 5; k++) {
        var r = svgEl('rect');
        r.setAttribute('x', '0');
        r.setAttribute('y', String(8 + k * 44));
        r.setAttribute('width', String(SEIS_W));
        r.setAttribute('height', '40');
        r.setAttribute('fill', 'var(--acc)');
        r.setAttribute('fill-opacity', (0.05 + k * 0.045).toFixed(3));
        bands.appendChild(r);
      }
    }

    function renderCalls() {
      calls.textContent = '';
      var rows = active < 0
        ? [['awaiting an instruction', '', '·', 'is-idle']]
        : COMMANDS[active].calls.map(function (c) {
          var ok = c[1] === 'ok';
          return [c[0], c[1], ok ? '✓' : '✕', ok ? '' : 'is-blocked'];
        });

      rows.forEach(function (r) {
        var div = document.createElement('div');
        div.className = 'call ' + r[3];
        div.innerHTML = '<span class="call-mark"></span><span class="call-name"></span><span class="call-status"></span>';
        div.children[0].textContent = r[2];
        div.children[1].textContent = r[0];
        div.children[2].textContent = r[1];
        calls.appendChild(div);
      });
    }

    function render() {
      svg.setAttribute('viewBox', viewBoxFor(view));
      zoom.textContent = '×' + view.zoom.toFixed(1) + (view.vel ? ' · velocity' : '');
      buttons.forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === active)); });
      renderBands();
      renderCalls();
    }

    render();
  }

  /* ------------------------------------------------------------------------
     4. Discriminase: guide search

     The prefix trie decides how much of the database survives to the distance
     stage; the mismatch tolerance decides how much of the microbiome you cut
     along with the pathogen.
     ------------------------------------------------------------------------ */

  var GUIDE = 'GACCTTGCAAGTGCCGATAA';
  var MISMATCH_AT = { 0: [], 1: [], 2: [17], 3: [11, 17], 4: [4, 11, 17, 19] };
  var SUBSTITUTION = { 4: 'A', 11: 'C', 17: 'G', 19: 'C' };
  var SITES = 2300000;

  function guideDemo(root) {
    var mm = $('#mm', root);
    var pre = $('#pre', root);
    var outMm = $('#out-mm', root);
    var outPre = $('#out-pre', root);
    var bars = $$('[data-guide-bars] .bar', root);
    var seq = $('[data-guide-seq]', root);
    var closest = $('[data-guide-closest]', root);
    var verdict = $('[data-guide-verdict]', root);

    function setBar(bar, value, width) {
      $('dd', bar).textContent = value;
      $('.bar-fill', bar).style.width = width;
    }

    function render() {
      var tol = +mm.value;
      var prefix = +pre.value;

      var kept = Math.min(SITES, Math.round(SITES / Math.pow(4, prefix - 6) * 1.4));
      var onTarget = Math.max(1, Math.round(18 * Math.pow(1.9, tol) / 4));
      var offTarget = tol <= 1 ? 0 : Math.round(Math.pow(4.2, tol - 1) - 3);

      outMm.textContent = '≤ ' + tol;
      outPre.textContent = prefix + ' nt';

      setBar(bars[0], SITES.toLocaleString('en-US'), pct(1));
      setBar(bars[1], kept.toLocaleString('en-US'), pct(kept / SITES));
      setBar(bars[2], String(onTarget), pct(onTarget / 60));
      setBar(bars[3], String(offTarget), pct(offTarget / 60));
      bars[3].classList.toggle('is-offtarget', offTarget > 0);
      bars[3].classList.toggle('is-hit', offTarget === 0);

      var at = MISMATCH_AT[tol] || [];
      seq.textContent = '';
      GUIDE.split('').forEach(function (ch, i) {
        var span = document.createElement('span');
        var hit = at.indexOf(i) >= 0;
        span.textContent = hit ? SUBSTITUTION[i] : ch;
        if (hit) span.className = 'is-mismatch';
        seq.appendChild(span);
      });

      closest.textContent = at.length + (at.length === 1 ? ' mismatch' : ' mismatches');
      verdict.textContent = offTarget === 0
        ? 'No commensal hit inside tolerance. Guide is safe to order.'
        : offTarget < 6
          ? 'A handful of commensal hits. Tighten tolerance or pick another guide.'
          : 'Too permissive. This guide would cut the microbiome as well as the target.';
    }

    mm.addEventListener('input', render);
    pre.addEventListener('input', render);
    render();
  }

  /* ------------------------------------------------------------------------
     5. Battery: degrade a cell, read the curve

     A full cell curve is the difference of two half cell curves. Losing active
     material stretches one of them; losing lithium inventory slides them past
     each other. Both move the staging features without changing what they are.
     ------------------------------------------------------------------------ */

  function dvdq(lamP, lamN, lli) {
    var Uc = function (y) {
      return 4.22 - 0.62 * y
        - 0.20 * Math.tanh((y - 0.42) / 0.07)
        - 0.13 * Math.tanh((y - 0.74) / 0.05);
    };
    var Ua = function (x) {
      return 0.34 * Math.exp(-26 * x) + 0.128
        - 0.042 * Math.tanh((x - 0.20) / 0.028)
        - 0.036 * Math.tanh((x - 0.50) / 0.030)
        - 0.018 * Math.tanh((x - 0.78) / 0.035);
    };

    var cC = 1 - lamP / 100;
    var cN = 1 - lamN / 100;
    var off = lli / 100;
    var N = 260;
    var pts = [];

    for (var i = 0; i <= N; i++) {
      var q = i / N;
      // Keep both electrodes inside their valid lithiation window: the graphite
      // curve's exponential term at x -> 0 is an endpoint singularity, not a
      // staging peak.
      var y = clamp(0.06 + q * 0.86 / cC, 0.04, 0.96);
      var x = clamp((0.92 - off) - q * 0.84 / cN, 0.10, 0.94);
      pts.push(Uc(y) - Ua(x));
    }

    var dv = [];
    for (var j = 1; j < pts.length; j++) dv.push(Math.abs(pts[j] - pts[j - 1]) * N);
    return dv;
  }

  function ceiling(dv) {
    var sorted = dv.slice().sort(function (a, b) { return a - b; });
    return sorted[Math.floor(sorted.length * 0.98)] || 1;
  }

  function curvePath(dv, hi) {
    return dv.map(function (v, i) {
      var x = 34 + (i / (dv.length - 1)) * 374;
      var y = 164 - clamp(v / hi, 0, 1) * 152;
      return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }).join(' ');
  }

  function cellDemo(root) {
    var knobs = [
      { input: $('#lamP', root), out: $('#out-lamP', root) },
      { input: $('#lamN', root), out: $('#out-lamN', root) },
      { input: $('#lli', root), out: $('#out-lli', root) }
    ];
    var fresh = $('[data-cell-fresh]', root);
    var aged = $('[data-cell-aged]', root);
    var soh = $('[data-cell-soh]', root);
    var diag = $('[data-cell-diag]', root);

    var pristine = dvdq(0, 0, 0);

    function render() {
      var lamP = +knobs[0].input.value;
      var lamN = +knobs[1].input.value;
      var lli = +knobs[2].input.value;

      knobs.forEach(function (k) { k.out.textContent = k.input.value + '%'; });

      var dv = dvdq(lamP, lamN, lli);
      var hi = Math.max(ceiling(pristine), ceiling(dv));
      fresh.setAttribute('d', curvePath(pristine, hi));
      aged.setAttribute('d', curvePath(dv, hi));

      soh.textContent = clamp(100 - 0.55 * lamN - 0.35 * lamP - 0.75 * lli, 40, 100).toFixed(0) + '%';

      var dominant = Math.max(lamN, lamP, lli);
      diag.textContent = dominant < 5
        ? 'Fresh cell. Peaks sit where the half cell curves put them.'
        : dominant === lli
          ? 'Lithium inventory loss dominates. Peaks slide together without changing shape.'
          : dominant === lamN
            ? 'Anode loss dominates. The graphite staging peaks compress first.'
            : 'Cathode loss dominates. The upper voltage feature flattens out.';
    }

    knobs.forEach(function (k) { k.input.addEventListener('input', render); });
    render();
  }

  /* ---------------------------------------------------------------------- */

  var mount = [
    ['#d-po', orderIntake],
    ['#d-brew', brewDemo],
    ['#d-seis', seisDemo],
    ['#d-guide', guideDemo],
    ['#d-cell', cellDemo]
  ];

  mount.forEach(function (pair) {
    var root = $(pair[0]);
    if (root) pair[1](root);
  });
}());
