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

  // --- ASCII-ART PORTRAIT ---
  // Renders the photo named in data-src as typewriter-style ASCII art: the
  // image is sampled into a grid of cells, each cell's brightness is mapped
  // to a character from a density ramp (dense glyphs for shadow, blank for
  // highlight), then drawn in the site's monospace font. Swapping the
  // source file automatically regenerates the portrait.
  const ASCII_RAMP = " .:-=+*#%@";
  const ASCII_FONT_SIZE = 0.5; // canvas px per row
  const ASCII_CHAR_ASPECT = 0.6; // Geist Mono glyph width / height

  document.querySelectorAll(".ascii-portrait").forEach(canvas => {
    const ctx = canvas.getContext("2d");
    const targetRatio = 3 / 4; // matches the frame's portrait crop

    const cellH = ASCII_FONT_SIZE;
    const cellW = ASCII_FONT_SIZE * ASCII_CHAR_ASPECT;

    function draw(img) {
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      if (sw / sh > targetRatio) {
        const cropW = sh * targetRatio;
        sx = (sw - cropW) / 2;
        sw = cropW;
      } else {
        const cropH = sw / targetRatio;
        sy = (sh - cropH) * 0.25; // bias toward the top so faces stay framed
        sh = cropH;
      }

      const gridCols = Math.round(660 / cellW);
      const gridRows = Math.round(880 / cellH);

      // Downsample the cropped photo straight to one pixel per grid cell —
      // the browser's own image smoothing does the brightness averaging
      const sample = document.createElement("canvas");
      sample.width = gridCols;
      sample.height = gridRows;
      const sctx = sample.getContext("2d");
      sctx.imageSmoothingEnabled = true;
      sctx.drawImage(img, sx, sy, sw, sh, 0, 0, gridCols, gridRows);
      const px = sctx.getImageData(0, 0, gridCols, gridRows).data;

      canvas.width = gridCols * cellW;
      canvas.height = gridRows * cellH;
      ctx.fillStyle = "rgba(17, 17, 17, 0.88)";
      ctx.font = `${ASCII_FONT_SIZE}px "Geist Mono", ui-monospace, monospace`;
      ctx.textBaseline = "top";

      // Punch up contrast (and lift brightness slightly, since the source
      // is a dim night photo) so highlights clear to blank paper and
      // shadows pack in dense ink — otherwise a busy midtone background
      // drowns the subject in a flat wash of mid-ramp characters
      const CONTRAST = 1.55;
      const BRIGHTNESS = 0.05;

      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          const i = (row * gridCols + col) * 4;
          let luminance = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
          luminance = (luminance - 0.5) * CONTRAST + 0.5 + BRIGHTNESS;
          luminance = Math.max(0, Math.min(1, luminance));
          const level = Math.floor((1 - luminance) * (ASCII_RAMP.length - 1));
          const char = ASCII_RAMP[level];
          if (char === " ") continue;
          ctx.fillText(char, col * cellW, row * cellH);
        }
      }
    }

    const img = new Image();
    img.onload = () => {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => draw(img));
      } else {
        draw(img);
      }
    };
    img.src = canvas.dataset.src;
  });

  // --- PORTRAIT CLICK-TO-REVEAL ---
  // Clicking the ASCII portrait crossfades to the real photo (grayscale,
  // via CSS filter, so it stays on-theme); clicking again returns to the
  // ASCII rendering. The .is-photo class drives the transition in CSS.
  const portraitToggle = document.getElementById("portraitToggle");
  const portraitHint = document.getElementById("portraitHint");

  if (portraitToggle && portraitHint) {
    portraitToggle.addEventListener("click", () => {
      const isPhoto = portraitToggle.classList.toggle("is-photo");
      portraitToggle.setAttribute("aria-pressed", String(isPhoto));
      portraitHint.textContent = isPhoto ? "Click to view ASCII art" : "Click to view photo";
    });
  }

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
