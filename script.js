/* Progressive enhancement only — the page works fully without this file. */
(function () {
  "use strict";
  var root = document.documentElement;
  var btn = document.getElementById("theme-toggle");
  if (!btn) { return; }

  btn.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
    btn.setAttribute("aria-pressed", String(next === "light"));
  });
})();
