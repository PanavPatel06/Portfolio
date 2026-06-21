// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", () => {

  // --- MOBILE MENU TOGGLE ---
  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");
  const links = document.querySelectorAll(".nav-links a");

  menuToggle.addEventListener("click", () => {
    menuToggle.classList.toggle("active");
    navLinks.classList.toggle("active");
  });

  links.forEach(link => {
    link.addEventListener("click", () => {
      menuToggle.classList.remove("active");
      navLinks.classList.remove("active");
    });
  });

  // --- CUSTOM CURSOR TRACKER ---
  const cursor = document.getElementById("customCursor");
  const cursorDot = document.getElementById("customCursorDot");

  if (window.innerWidth > 768 && typeof gsap !== "undefined") {
    const cursorX = gsap.quickTo(cursor, "left", { duration: 0.3, ease: "power3" });
    const cursorY = gsap.quickTo(cursor, "top", { duration: 0.3, ease: "power3" });
    const dotX = gsap.quickTo(cursorDot, "left", { duration: 0.1, ease: "power3" });
    const dotY = gsap.quickTo(cursorDot, "top", { duration: 0.1, ease: "power3" });

    window.addEventListener("mousemove", (e) => {
      cursorX(e.clientX);
      cursorY(e.clientY);
      dotX(e.clientX);
      dotY(e.clientY);
    });

    // Hover effect on links, buttons, and cards
    const hoverElements = document.querySelectorAll("a, button, .project-card, .skill-tag, input, textarea, .social-icon, .timeline-content");
    hoverElements.forEach(elem => {
      elem.addEventListener("mouseenter", () => {
        cursor.style.width = "45px";
        cursor.style.height = "45px";
        cursor.style.borderColor = "var(--accent-secondary)";
        cursor.style.backgroundColor = "rgba(168, 85, 247, 0.1)";
      });
      elem.addEventListener("mouseleave", () => {
        cursor.style.width = "20px";
        cursor.style.height = "20px";
        cursor.style.borderColor = "var(--accent-primary)";
        cursor.style.backgroundColor = "transparent";
      });
    });
  }

  // --- ACTIVE HEADER SECTION HIGHLIGHTING ---
  const sections = document.querySelectorAll("section, .timeline-section, .hero");
  window.addEventListener("scroll", () => {
    let current = "";
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      if (window.scrollY >= (sectionTop - 200)) {
        const id = section.getAttribute("id");
        if (id) current = id;
      }
    });

    links.forEach(link => {
      link.classList.remove("active");
      const href = link.getAttribute("href");
      if (current && href.includes(current)) {
        link.classList.add("active");
      }
    });
  });

  // --- SCROLL TO TOP ---
  const scrollTopBtn = document.getElementById("scrollTopBtn");
  scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });

  // --- PAGE LOAD INTRO ANIMATIONS (GSAP) ---
  if (typeof gsap !== "undefined") {
    const introTimeline = gsap.timeline();

    // Header slide down
    introTimeline.from("header", {
      y: -80,
      opacity: 0,
      duration: 1,
      ease: "power4.out"
    });

    // Hero section staggering elements
    introTimeline.from(".hero-tag", {
      y: 20,
      opacity: 0,
      duration: 0.6,
      ease: "power2.out"
    }, "-=0.5");

    introTimeline.from(".hero-title", {
      y: 30,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out"
    }, "-=0.4");

    introTimeline.from(".hero-description", {
      y: 20,
      opacity: 0,
      duration: 0.6,
      ease: "power2.out"
    }, "-=0.4");

    introTimeline.from(".hero-actions", {
      y: 20,
      opacity: 0,
      duration: 0.6,
      ease: "power2.out"
    }, "-=0.4");

    // Floating badges entry
    introTimeline.from(".floating-badge", {
      scale: 0,
      opacity: 0,
      stagger: 0.15,
      duration: 0.8,
      ease: "back.out(1.7)"
    }, "-=0.6");

    // Hero graphic element spin fade
    introTimeline.from(".hero-art-container", {
      scale: 0.8,
      opacity: 0,
      duration: 1.2,
      ease: "power2.out"
    }, "-=1.2");
  } else {
    // Fallback: If GSAP is not loaded, ensure hero section is visible immediately
    console.warn("GSAP is not loaded. Using static layout rendering fallback.");
  }


  // --- SCROLL REVEAL VIA NATIVE INTERSECTIONOBSERVER (Foolproof & High Performance) ---
  const revealElements = document.querySelectorAll(".timeline-item, .project-card, .skill-category-card, .contact-info, .contact-form");
  
  if (window.IntersectionObserver) {
    const observerOptions = {
      root: null,
      threshold: 0.15,
      rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
      let delayIndex = 0;
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          
          // Apply a stagger effect by checking visibility within the current batch
          setTimeout(() => {
            element.classList.add("reveal-visible");
          }, delayIndex * 150);
          
          delayIndex++;
          observer.unobserve(element);
        }
      });
    }, observerOptions);

    revealElements.forEach(el => {
      revealObserver.observe(el);
    });
  } else {
    // Fallback: If IntersectionObserver is not supported (old browsers), show cards immediately
    revealElements.forEach(el => {
      el.classList.add("reveal-visible");
    });
  }


  // --- CONTACT FORM SUBMISSION TOAST ---
  const contactForm = document.getElementById("contactForm");
  
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    
    const nameVal = document.getElementById("name").value;

    // Create custom success notification element
    const toast = document.createElement("div");
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.right = "20px";
    toast.style.background = "var(--accent-gradient)";
    toast.style.color = "#000";
    toast.style.padding = "1rem 2rem";
    toast.style.borderRadius = "10px";
    toast.style.fontWeight = "bold";
    toast.style.boxShadow = "0 10px 30px rgba(0,245,255,0.3)";
    toast.style.zIndex = "10000";
    toast.style.transform = "translateY(100px)";
    toast.style.opacity = "0";
    toast.textContent = `Thanks ${nameVal}! Message sent successfully.`;

    document.body.appendChild(toast);

    if (typeof gsap !== "undefined") {
      // Animate toast using GSAP
      const toastTimeline = gsap.timeline();
      toastTimeline.to(toast, {
        y: 0,
        opacity: 1,
        duration: 0.5,
        ease: "power3.out"
      });
      toastTimeline.to(toast, {
        y: 100,
        opacity: 0,
        duration: 0.5,
        delay: 3,
        ease: "power3.in",
        onComplete: () => {
          toast.remove();
        }
      });
    } else {
      // Static fallback for Toast display
      toast.style.transform = "translateY(0)";
      toast.style.opacity = "1";
      setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 500);
      }, 3000);
    }

    // Reset Form
    contactForm.reset();
  });
});
