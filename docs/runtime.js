/* runtime.js — doc tutorial
   Chrome primitives + four invented primitives for this doc:
     flowStepper, folderAnatomy, toggleCompare, eventLogReveal
   conversationSim is plain markup; no JS primitive needed.
*/

(function () {
  "use strict";

  /* ─── chrome: progress bar ──────────────────────────────────────── */
  const progress = document.querySelector(".progress");
  if (progress) {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      progress.style.width = pct + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ─── chrome: focus toggle ──────────────────────────────────────── */
  const focusToggle = document.getElementById("focusToggle");
  if (focusToggle) {
    focusToggle.addEventListener("click", () => {
      const pressed = focusToggle.getAttribute("aria-pressed") === "true";
      focusToggle.setAttribute("aria-pressed", String(!pressed));
      document.body.classList.toggle("focus-on", !pressed);
    });
  }

  /* ─── chrome: print ─────────────────────────────────────────────── */
  const printButton = document.getElementById("printButton");
  if (printButton) {
    printButton.addEventListener("click", () => window.print());
  }

  /* ─── invented: flowStepper ─────────────────────────────────────── */
  /* Clickable horizontal 5-step pipeline. Reads steps from
     <script type="application/json" id="flow-data"> and a target
     selector. Renders into [data-flow] element. Clicking a step
     swaps the panel content. */
  function flowStepper(rootSelector) {
    const root = document.querySelector(rootSelector);
    const dataEl = document.getElementById("flow-data");
    if (!root || !dataEl) return;
    let steps;
    try { steps = JSON.parse(dataEl.textContent); } catch (e) { return; }

    const stepsEl = root.querySelector(".steps");
    const panelText = root.querySelector(".panel .text");
    const panelExample = root.querySelector(".panel .example");

    steps.forEach((s, i) => {
      const btn = document.createElement("button");
      btn.className = "step";
      btn.type = "button";
      btn.setAttribute("aria-pressed", i === 0 ? "true" : "false");
      btn.dataset.idx = String(i);
      btn.innerHTML = '<div class="n">0' + (i + 1) + '</div><div class="title">' + s.title + '</div>';
      btn.addEventListener("click", () => activate(i));
      stepsEl.appendChild(btn);
    });

    function activate(i) {
      const buttons = stepsEl.querySelectorAll(".step");
      buttons.forEach((b, j) => b.setAttribute("aria-pressed", String(i === j)));
      const s = steps[i];
      panelText.innerHTML =
        '<div class="what">' + s.what + '</div><div>' + s.detail + '</div>';
      panelExample.innerHTML = s.example;
    }
    activate(0);
  }

  /* ─── invented: folderAnatomy ───────────────────────────────────── */
  /* Click-to-reveal interactive folder tree. Reads file definitions
     from <script type="application/json" id="anatomy-data">. */
  function folderAnatomy(rootSelector) {
    const root = document.querySelector(rootSelector);
    const dataEl = document.getElementById("anatomy-data");
    if (!root || !dataEl) return;
    let files;
    try { files = JSON.parse(dataEl.textContent); } catch (e) { return; }

    const detail = root.querySelector(".detail");
    const tree = root.querySelector(".tree");

    function render(file) {
      detail.innerHTML =
        '<div class="file-name">' + file.path + '</div>' +
        '<h3>' + file.title + '</h3>' +
        '<div class="role-strip">' + file.role + '</div>' +
        '<p>' + file.body + '</p>' +
        (file.bullets
          ? '<ul>' + file.bullets.map((b) => "<li>" + b + "</li>").join("") + "</ul>"
          : "");
    }

    const buttons = tree.querySelectorAll("button[data-file]");
    buttons.forEach((b, idx) => {
      b.addEventListener("click", () => {
        buttons.forEach((bb) => bb.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        const key = b.dataset.file;
        const file = files.find((f) => f.key === key);
        if (file) render(file);
      });
      if (idx === 0) {
        b.setAttribute("aria-pressed", "true");
        const file = files.find((f) => f.key === b.dataset.file);
        if (file) render(file);
      }
    });
  }

  /* ─── invented: toggleCompare ───────────────────────────────────── */
  /* Two-tab before/after toggle. Tabs are buttons in .tabs; panels
     are .panel elements with data-key matching tab data-key. */
  function toggleCompare(rootSelector) {
    const root = document.querySelector(rootSelector);
    if (!root) return;
    const tabs = root.querySelectorAll(".tab");
    const panels = root.querySelectorAll(".panel");
    function activate(key) {
      tabs.forEach((t) => t.setAttribute("aria-pressed", String(t.dataset.key === key)));
      panels.forEach((p) => p.setAttribute("data-active", String(p.dataset.key === key)));
    }
    tabs.forEach((t) => t.addEventListener("click", () => activate(t.dataset.key)));
    // initial: first tab
    if (tabs.length) activate(tabs[0].dataset.key);
  }

  /* ─── invented: eventLogReveal ──────────────────────────────────── */
  /* Reads the doc's own doc-source.json (same folder) and pretty-prints
     the events[] array into a <pre> inside [data-event-log].
     This is the "meta" computational behavior — the doc reads its own
     manifest and shows you how it was built. */
  function eventLogReveal(rootSelector) {
    const root = document.querySelector(rootSelector);
    if (!root) return;
    const pre = root.querySelector("pre");
    if (!pre) return;
    fetch("doc-source.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("manifest not found");
        return r.json();
      })
      .then((m) => {
        if (!m.events || !m.events.length) {
          pre.textContent = "(no events recorded yet)";
          return;
        }
        const lines = m.events.map((e) =>
          [
            "event #" + e.n + "  " + e.ts,
            "  verb:        " + e.verb,
            "  instruction: " + (e.instruction || "(none)"),
            "  files:       " + (e.files_touched || []).join(", "),
            "  invented:    " +
              ((e.structures_invented || []).map((s) => s.name).join(", ") || "—") +
              " | behaviors: " +
              ((e.behaviors_invented || []).map((b) => b.name).join(", ") || "—"),
            "  summary:     " + (e.summary || ""),
          ].join("\n")
        );
        pre.textContent = lines.join("\n\n");
      })
      .catch((err) => {
        pre.textContent =
          "(manifest unavailable when opened via file://; this works when served over http)";
      });
  }

  /* ─── invented: funnel ──────────────────────────────────────────── */
  /* Reactive funnel chart. Reads inline JSON from <script id="funnel-data">,
     computes percentages from raw counts (first row = 100% baseline), renders
     SVG bars with hover tooltip, a raw/percent toggle, and per-row
     click-to-explain drawer. The proof of the four pillars in one component:
       - Interactive  : hover, toggle, click-to-explain
       - Computational: percentages computed from data, not hardcoded
       - Aesthetic    : inherits warm-notebook palette
       - Warm         : gentle transitions, paper tones
     Used by the compare panel to demonstrate what markdown literally cannot do. */
  function funnel(rootSelector) {
    const root = document.querySelector(rootSelector);
    const dataEl = document.getElementById("funnel-data");
    if (!root || !dataEl) return;
    let data;
    try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }
    if (!data.length) return;

    const baseline = data[0].users; // first row is 100%
    const enriched = data.map((d) => ({
      ...d,
      pct: (d.users / baseline) * 100,
    }));

    const barsEl = root.querySelector(".funnel-bars");
    const tipEl = root.querySelector(".funnel-tip");
    const drawerEl = root.querySelector(".funnel-drawer");
    const drawerTitle = drawerEl.querySelector(".drawer-title");
    const drawerBody = drawerEl.querySelector(".drawer-body");
    const toggleEl = root.querySelector(".funnel-toggle");

    let mode = "pct"; // 'pct' | 'raw'
    let activeIdx = -1;

    function fmtVal(d, m) {
      return m === "pct" ? d.pct.toFixed(1) + "%" : d.users.toLocaleString();
    }
    function fmtBoth(d) {
      return d.users.toLocaleString() + " users · " + d.pct.toFixed(1) + "% of " + enriched[0].step;
    }

    function render() {
      barsEl.innerHTML = "";
      enriched.forEach((d, i) => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "funnel-row";
        row.dataset.idx = String(i);
        row.setAttribute("aria-pressed", String(i === activeIdx));
        row.innerHTML =
          '<span class="funnel-step">' + d.step + '</span>' +
          '<span class="funnel-bar-wrap"><span class="funnel-bar" style="width:' + d.pct.toFixed(2) + '%"></span></span>' +
          '<span class="funnel-val">' + fmtVal(d, mode) + '</span>';
        row.addEventListener("mousemove", (ev) => showTip(ev, d));
        row.addEventListener("mouseenter", (ev) => showTip(ev, d));
        row.addEventListener("mouseleave", hideTip);
        row.addEventListener("focus", (ev) => showTipForRow(row, d));
        row.addEventListener("blur", hideTip);
        row.addEventListener("click", () => openDrawer(i, d));
        barsEl.appendChild(row);
      });
    }
    function showTip(ev, d) {
      tipEl.textContent = fmtBoth(d);
      tipEl.style.opacity = "1";
      const rect = root.getBoundingClientRect();
      tipEl.style.left = (ev.clientX - rect.left + 14) + "px";
      tipEl.style.top = (ev.clientY - rect.top + 14) + "px";
    }
    function showTipForRow(rowEl, d) {
      tipEl.textContent = fmtBoth(d);
      tipEl.style.opacity = "1";
      const rect = root.getBoundingClientRect();
      const rr = rowEl.getBoundingClientRect();
      tipEl.style.left = (rr.right - rect.left + 12) + "px";
      tipEl.style.top = (rr.top - rect.top + 4) + "px";
    }
    function hideTip() {
      tipEl.style.opacity = "0";
    }
    function openDrawer(i, d) {
      activeIdx = i;
      const rows = barsEl.querySelectorAll(".funnel-row");
      rows.forEach((r, j) => r.setAttribute("aria-pressed", String(j === i)));
      drawerTitle.textContent = d.step + " — " + fmtBoth(d);
      drawerBody.textContent = d.explain || "(no explanation recorded yet)";
      drawerEl.setAttribute("data-open", "true");
    }

    if (toggleEl) {
      toggleEl.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => {
          mode = btn.dataset.mode;
          toggleEl.querySelectorAll("button").forEach((b) =>
            b.setAttribute("aria-pressed", String(b === btn))
          );
          render();
        });
      });
    }

    render();
  }

  /* ─── boot ──────────────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", () => {
    flowStepper("[data-flow]");
    folderAnatomy("[data-anatomy]");
    toggleCompare("[data-compare]");
    funnel("[data-funnel]");
    eventLogReveal("[data-event-log]");
  });

  window.docKit = { flowStepper, folderAnatomy, toggleCompare, funnel, eventLogReveal };
})();
