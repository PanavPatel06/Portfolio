// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", () => {
  // --- REVEAL ANIMATIONS (once per page load) ---
  // Word-by-word heading reveal: each word gets its own inline-block span
  // with an 80ms incremental delay, so headings "focus in" word by word.
  // Each element animates only the first time it scrolls into view.
  document.querySelectorAll(".reveal-words").forEach((heading) => {
    const words = heading.textContent.trim().split(/\s+/);
    heading.textContent = "";
    words.forEach((word, i) => {
      const span = document.createElement("span");
      span.className = "word";
      span.textContent = word;
      span.style.setProperty("--word-delay", `${i * 80}ms`);
      heading.appendChild(span);
      if (i < words.length - 1)
        heading.appendChild(document.createTextNode(" "));
    });
  });

  // Scroll reveal via IntersectionObserver
  const revealElements = document.querySelectorAll(".reveal, .reveal-words");

  if (window.IntersectionObserver) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" },
    );

    revealElements.forEach((el) => revealObserver.observe(el));
  } else {
    revealElements.forEach((el) => el.classList.add("in-view"));
  }

  // --- ANIMATED PIXEL GLYPH CANVASES ---
  // 40x40 CSS box, 80x80 buffer (2x), image-rendering: pixelated.
  // A seeded sparse grid of gray squares whose opacity flickers over time.
  const glyphs = document.querySelectorAll(".pixel-glyph");

  // Simple deterministic hash so each section's seed yields a stable pattern
  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Each section's glyph is a pixel icon describing the heading below it:
  // journey = ascending bars (career growth), showcase = grid of project tiles,
  // capabilities = code brackets, connect = envelope.
  const GLYPH_PATTERNS = {
    journey: [
      ".......#",
      ".......#",
      ".....#.#",
      ".....#.#",
      "...#.#.#",
      "...#.#.#",
      ".#.#.#.#",
      ".#.#.#.#",
    ],
    showcase: [
      ".###.###",
      ".###.###",
      ".###.###",
      "........",
      ".###.###",
      ".###.###",
      ".###.###",
      "........",
    ],
    capabilities: [
      "........",
      "..#..#..",
      ".#....#.",
      "#......#",
      "#......#",
      ".#....#.",
      "..#..#..",
      "........",
    ],
    connect: [
      "........",
      "########",
      "##....##",
      "#.#..#.#",
      "#..##..#",
      "#......#",
      "########",
      "........",
    ],
  };

  glyphs.forEach((canvas) => {
    const ctx = canvas.getContext("2d");
    const seed = canvas.dataset.seed || "glyph";
    const rand = mulberry32(hashString(seed));
    const GRID = 8;
    const CELL = 80 / GRID; // 10px cells in the 80x80 buffer (5px at 40px CSS size)
    const pattern = GLYPH_PATTERNS[seed];

    // Lit cells come from the icon bitmap (or a seeded sparse mask as fallback),
    // each with its own base gray shade for pixel-art texture.
    const cells = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const lit = pattern ? pattern[y][x] === "#" : rand() < 0.45;
        if (lit) {
          cells.push({ x, y, shade: 30 + Math.floor(rand() * 130) });
        }
      }
    }

    function render() {
      ctx.clearRect(0, 0, 80, 80);
      cells.forEach((cell) => {
        ctx.fillStyle = `rgb(${cell.shade}, ${cell.shade}, ${cell.shade})`;
        ctx.fillRect(cell.x * CELL, cell.y * CELL, CELL - 2, CELL - 2);
      });
    }

    // Generative shimmer: every STEP ms a few cells re-roll their gray shade
    // (occasionally fading near-canvas so a pixel "blinks"), while the icon
    // silhouette itself stays intact and readable.
    const STEP = 180;
    let last = 0;
    function tick(ts) {
      if (ts - last >= STEP) {
        last = ts;
        const changes = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < changes; i++) {
          const cell = cells[Math.floor(Math.random() * cells.length)];
          cell.shade =
            30 + Math.floor(Math.random() * (Math.random() < 0.12 ? 200 : 130));
        }
        render();
      }
      requestAnimationFrame(tick);
    }

    render();
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      requestAnimationFrame(tick);
    }
  });

  // --- MOBILE MENU TOGGLE ---
  const menuToggle = document.getElementById("menuToggle");
  const mobilePanel = document.getElementById("navMobilePanel");

  menuToggle.addEventListener("click", () => {
    const open = mobilePanel.classList.toggle("open");
    menuToggle.classList.toggle("active", open);
    menuToggle.setAttribute("aria-expanded", String(open));
  });

  mobilePanel.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobilePanel.classList.remove("open");
      menuToggle.classList.remove("active");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });

  // --- ACTIVE NAV LINK HIGHLIGHTING ---
  const sections = document.querySelectorAll("section[id]");
  const navAnchors = document.querySelectorAll(".nav-links a");

  window.addEventListener(
    "scroll",
    () => {
      let current = "";
      sections.forEach((section) => {
        if (window.scrollY >= section.offsetTop - 200) {
          current = section.getAttribute("id");
        }
      });

      navAnchors.forEach((link) => {
        link.classList.toggle(
          "active",
          current !== "" && link.getAttribute("href") === `#${current}`,
        );
      });
    },
    { passive: true },
  );

  // --- CONTACT FORM: DELIVER MESSAGE VIA WEB3FORMS ---
  // Static-site email relay: POSTs the form as JSON to Web3Forms, which
  // forwards it to the inbox tied to the access key below.
  // Get the key (free, no account): https://web3forms.com → enter your
  // email → the key arrives by email → paste it here.
  const WEB3FORMS_ACCESS_KEY = "6ccb0f54-d9fb-49cc-a66d-a5923dcdb044";
  const CONTACT_EMAIL = "panavbpatel@gmail.com";
  const contactForm = document.getElementById("contactForm");
  const submitBtn = contactForm.querySelector("button[type='submit']");

  function showToast(message) {
    const toast = document.createElement("div");
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      maxWidth: "320px",
      background: "#111111",
      color: "#F5F4F0",
      padding: "12px 24px",
      borderRadius: "14px",
      fontFamily: "'Geist', system-ui, sans-serif",
      fontSize: "12px",
      letterSpacing: "0.05em",
      lineHeight: "1.6",
      boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
      zIndex: "10000",
      opacity: "0",
      transform: "translateY(16px)",
      transition:
        "opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
    });
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(16px)";
      setTimeout(() => toast.remove(), 700);
    }, 4500);
  }

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nameVal = document.getElementById("name").value;
    const emailVal = document.getElementById("email").value;
    const messageVal = document.getElementById("message").value;

    submitBtn.disabled = true;
    submitBtn.textContent = "SENDING…";

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          name: nameVal,
          email: emailVal,
          message: messageVal,
          subject: `Portfolio contact from ${nameVal}`,
          from_name: "Portfolio Contact Form",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.message || `HTTP ${res.status}`);

      showToast(`Thanks ${nameVal} — your message has been sent.`);
      contactForm.reset();
    } catch (err) {
      showToast(
        `Something went wrong — please email me directly at ${CONTACT_EMAIL}.`,
      );
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "SEND MESSAGE";
    }
  });
});
