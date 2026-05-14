(function () {
  // ============== UI chrome (baseline) ==============
  const progress = document.querySelector(".progress");
  const focusToggle = document.getElementById("focusToggle");
  const printButton = document.getElementById("printButton");
  const flowNodes = Array.from(document.querySelectorAll(".flow-node"));
  const flowTitle = document.getElementById("flowTitle");
  const flowText = document.getElementById("flowText");
  const navLinks = Array.from(document.querySelectorAll(".nav a"));
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  let flowDetails = {};
  const flowSource = document.getElementById("flow-details");
  if (flowSource) {
    try {
      flowDetails = JSON.parse(flowSource.textContent || "{}");
    } catch (err) {
      console.warn("flow-details JSON parse failed", err);
    }
  }

  function updateProgress() {
    if (!progress) return;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
    progress.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
  }

  function updateActiveNav() {
    if (!sections.length) return;
    const current = sections.reduce((active, section) => {
      const rect = section.getBoundingClientRect();
      return rect.top <= 150 ? section : active;
    }, sections[0]);
    navLinks.forEach((link) => {
      const isActive = current && link.getAttribute("href") === `#${current.id}`;
      link.classList.toggle("active", isActive);
    });
  }

  flowNodes.forEach((node) => {
    node.addEventListener("click", () => {
      const detail = flowDetails[node.dataset.step];
      if (!detail || !flowTitle || !flowText) return;
      flowNodes.forEach((item) => item.classList.remove("active"));
      node.classList.add("active");
      flowTitle.textContent = detail.title;
      flowText.textContent = detail.text;
    });
  });

  if (focusToggle) {
    focusToggle.addEventListener("click", () => {
      const enabled = document.body.classList.toggle("focus-mode");
      focusToggle.setAttribute("aria-pressed", String(enabled));
      focusToggle.textContent = enabled ? "Exit focus" : "Focus mode";
    });
  }

  if (printButton) {
    printButton.addEventListener("click", () => window.print());
  }

  document.addEventListener("input", (event) => {
    if (event.target.matches("[contenteditable='true']")) {
      event.target.dataset.edited = "true";
    }
  });

  window.addEventListener("scroll", () => {
    updateProgress();
    updateActiveNav();
  }, { passive: true });
  window.addEventListener("resize", updateProgress, { passive: true });

  // ============== Helpers ==============
  function escapeXml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;"
    }[c]));
  }

  function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // ============== Behavioral primitives ==============

  // parseCsv: minimal CSV parser. Returns array of objects keyed by header row.
  function parseCsv(text) {
    const lines = String(text || "").trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(s => s.trim());
    return lines.slice(1).map(line => {
      const cells = line.split(",").map(s => s.trim());
      const row = {};
      headers.forEach((h, i) => { row[h] = cells[i]; });
      return row;
    });
  }

  // renderBarChart: horizontal bar chart into an <svg> placeholder.
  function renderBarChart(svgEl, data, opts) {
    opts = opts || {};
    if (!svgEl || !Array.isArray(data) || !data.length) return;
    const max = opts.max || Math.max(...data.map(d => Number(d.value) || 0));
    const padding = { top: 24, right: 70, bottom: 12, left: 150 };
    const barH = 30;
    const gap = 14;
    const width = svgEl.clientWidth || 620;
    const height = padding.top + padding.bottom + data.length * (barH + gap) - gap;
    const chartW = Math.max(60, width - padding.left - padding.right);
    const palette = opts.palette || ["#9f4f32", "#bd8128", "#647257", "#314f65"];
    svgEl.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svgEl.setAttribute("preserveAspectRatio", "xMinYMid meet");
    svgEl.setAttribute("role", "img");
    svgEl.setAttribute("aria-label", opts.ariaLabel || "Bar chart");
    const suffix = opts.suffix || "";
    const parts = [];
    parts.push(`<line x1="${padding.left}" y1="${padding.top - 6}" x2="${padding.left}" y2="${height - padding.bottom + 4}" stroke="#b8975f" stroke-width="1" opacity="0.5"/>`);
    data.forEach((d, i) => {
      const y = padding.top + i * (barH + gap);
      const value = Number(d.value) || 0;
      const w = (value / max) * chartW;
      const color = d.color || palette[i % palette.length];
      parts.push(`<text x="${padding.left - 14}" y="${y + barH / 2}" text-anchor="end" dominant-baseline="middle" font-family="IBM Plex Mono, monospace" font-size="13" fill="#30261c">${escapeXml(d.label)}</text>`);
      parts.push(`<rect x="${padding.left}" y="${y}" width="${Math.max(2, w)}" height="${barH}" rx="6" fill="${color}" opacity="0.88"><title>${escapeXml(d.label)}: ${escapeXml(String(value))}${escapeXml(suffix)}</title></rect>`);
      parts.push(`<text x="${padding.left + w + 10}" y="${y + barH / 2}" dominant-baseline="middle" font-family="IBM Plex Mono, monospace" font-size="13" font-weight="600" fill="#6f614f">${escapeXml(String(value))}${escapeXml(suffix)}</text>`);
    });
    svgEl.innerHTML = parts.join("");
  }

  // clickToExplain: generic click-to-reveal harness.
  function clickToExplain(rootEl, panelTitleEl, panelTextEl, dataMap) {
    if (!rootEl || !dataMap) return;
    const triggers = Array.from(rootEl.querySelectorAll("[data-explain]"));
    triggers.forEach(t => {
      t.addEventListener("click", () => {
        const entry = dataMap[t.dataset.explain];
        if (!entry) return;
        triggers.forEach(other => other.classList.remove("active"));
        t.classList.add("active");
        if (panelTitleEl) panelTitleEl.textContent = entry.title || "";
        if (panelTextEl) panelTextEl.textContent = entry.text || "";
      });
    });
  }

  // glossary: highlight terms in a scope, attach click-to-reveal tooltip.
  function glossary(scopeEl, terms) {
    if (!scopeEl || !terms || !Object.keys(terms).length) return;
    const sortedTerms = Object.keys(terms).sort((a, b) => b.length - a.length);
    const skipSelectors = "h1, h2, h3, code, pre, summary, .term, script, style, a, .pill, .eyebrow, .nav, .topbar, .stamp, .meta-item span, .section-kicker, .flow-node span, .footer";
    sortedTerms.forEach(term => {
      const re = new RegExp(`(?<![\\w-])(${escapeRegex(term)})(?![\\w-])`, "i");
      const walker = document.createTreeWalker(scopeEl, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (parent.closest(skipSelectors)) return NodeFilter.FILTER_REJECT;
          return re.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      const nodes = [];
      let n;
      while ((n = walker.nextNode())) nodes.push(n);
      nodes.forEach(textNode => {
        const text = textNode.nodeValue;
        const match = re.exec(text);
        if (!match) return;
        const before = text.slice(0, match.index);
        const matched = match[1];
        const after = text.slice(match.index + matched.length);
        const span = document.createElement("span");
        span.className = "term";
        span.tabIndex = 0;
        span.dataset.term = term;
        span.textContent = matched;
        const parent = textNode.parentNode;
        if (before) parent.insertBefore(document.createTextNode(before), textNode);
        parent.insertBefore(span, textNode);
        if (after) parent.insertBefore(document.createTextNode(after), textNode);
        parent.removeChild(textNode);
      });
    });

    let activePopover = null;
    function closePopover() {
      if (activePopover) {
        activePopover.remove();
        activePopover = null;
      }
    }
    scopeEl.addEventListener("click", (e) => {
      const t = e.target.closest(".term");
      if (!t) return;
      e.preventDefault();
      e.stopPropagation();
      const key = t.dataset.term;
      let def = terms[key];
      if (!def) {
        const entry = Object.entries(terms).find(([k]) => k.toLowerCase() === String(key).toLowerCase());
        if (entry) def = entry[1];
      }
      if (!def) return;
      if (activePopover && activePopover.parentElement === t) {
        closePopover();
        return;
      }
      closePopover();
      const pop = document.createElement("span");
      pop.className = "term-tooltip";
      pop.textContent = def;
      t.appendChild(pop);
      activePopover = pop;
    });
    scopeEl.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const t = e.target.closest(".term");
      if (!t) return;
      e.preventDefault();
      t.click();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closePopover();
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".term")) closePopover();
    });
  }

  // ============== Per-doc auto-wiring ==============
  // Charts: <svg data-chart="<id>"> reads JSON from <script id="<id>"> and renders.
  document.querySelectorAll("[data-chart]").forEach(svg => {
    const src = document.getElementById(svg.dataset.chart);
    if (!src) return;
    let payload;
    try {
      payload = JSON.parse(src.textContent);
    } catch (err) {
      console.warn("chart data parse failed", err);
      return;
    }
    if (payload.csv) {
      const rows = parseCsv(payload.csv);
      const labelKey = payload.labelKey || Object.keys(rows[0] || {})[0];
      const valueKey = payload.valueKey || Object.keys(rows[0] || {})[1];
      const data = rows.map(r => ({ label: r[labelKey], value: Number(r[valueKey]) }));
      renderBarChart(svg, data, {
        ariaLabel: payload.ariaLabel,
        suffix: payload.suffix,
        max: payload.max,
        palette: payload.palette
      });
    } else if (Array.isArray(payload.data)) {
      renderBarChart(svg, payload.data, {
        ariaLabel: payload.ariaLabel,
        suffix: payload.suffix,
        max: payload.max,
        palette: payload.palette
      });
    }
  });

  // Glossary: read terms from <script id="glossary"> and highlight inside <main>.
  const glossarySrc = document.getElementById("glossary");
  if (glossarySrc) {
    let terms;
    try {
      terms = JSON.parse(glossarySrc.textContent);
    } catch (err) {
      console.warn("glossary parse failed", err);
    }
    if (terms) {
      const scope = document.querySelector("main") || document.body;
      glossary(scope, terms);
    }
  }

  updateProgress();
  updateActiveNav();

  // Expose primitives so per-doc inline scripts can call them.
  window.docKit = { parseCsv, renderBarChart, clickToExplain, glossary };
})();
