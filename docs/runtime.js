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

  /* ─── boot ──────────────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", () => {
    flowStepper("[data-flow]");
    folderAnatomy("[data-anatomy]");
    toggleCompare("[data-compare]");
    eventLogReveal("[data-event-log]");
  });

  window.docKit = { flowStepper, folderAnatomy, toggleCompare, eventLogReveal };
})();
