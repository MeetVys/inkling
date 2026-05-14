(function () {
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

  updateProgress();
  updateActiveNav();
})();
