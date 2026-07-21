(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const i18n = window.SalonI18n;
  i18n?.init?.();
  const t = (key, variables = {}) => i18n?.t?.(key, variables) ?? key;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compactLayout = window.matchMedia("(max-width: 820px)");
  const mobileNavLayout = window.matchMedia("(max-width: 1180px)");
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

  /* Header and mobile navigation */
  const header = document.querySelector("#siteHeader");
  const menuToggle = document.querySelector(".menu-toggle");
  const primaryNav = document.querySelector("#primaryNav");
  const navLinks = [...document.querySelectorAll('.primary-nav a[href^="#"]')];
  const languageSelect = document.querySelector("#languageSelect");
  const languageStatus = document.querySelector("#languageStatus");

  const updateMenuLabel = () => {
    if (!menuToggle) return;
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-label", t(isOpen ? "menu.close" : "menu.open"));
  };

  const closeMenu = () => {
    if (!menuToggle || !primaryNav) return;
    menuToggle.setAttribute("aria-expanded", "false");
    updateMenuLabel();
    primaryNav.classList.remove("is-open");
    header?.classList.remove("is-open");
    body.classList.remove("menu-open");
  };

  menuToggle?.addEventListener("click", () => {
    const shouldOpen = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(shouldOpen));
    updateMenuLabel();
    primaryNav?.classList.toggle("is-open", shouldOpen);
    header?.classList.toggle("is-open", shouldOpen);
    body.classList.toggle("menu-open", shouldOpen);
  });

  navLinks.forEach((link) => link.addEventListener("click", closeMenu));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  /* Scroll-driven hero: image sequence now, real video later */
  const hero = document.querySelector("[data-scroll-hero]");
  const heroFrames = [...document.querySelectorAll(".hero-frame")];
  const heroCopies = [...document.querySelectorAll("[data-hero-copy]")];
  const heroProgress = document.querySelector(".hero-progress-track i");
  const heroCount = document.querySelector(".hero-progress-count b");
  const scrollCue = document.querySelector(".scroll-cue");
  const heroVideo = document.querySelector("#heroVideo");
  let currentHeroChapter = -1;
  let scrollTicking = false;

  const setHeroChapter = (chapter) => {
    if (chapter === currentHeroChapter) return;
    currentHeroChapter = chapter;
    heroFrames.forEach((frame, index) => frame.classList.toggle("is-active", index === chapter));
    heroCopies.forEach((copy, index) => {
      const active = index === chapter;
      copy.classList.toggle("is-active", active);
      copy.setAttribute("aria-hidden", String(!active));
    });
    if (heroCount) heroCount.textContent = String(chapter + 1).padStart(2, "0");
  };

  const updateHero = () => {
    scrollTicking = false;
    if (!hero || reduceMotion.matches) return;

    const rect = hero.getBoundingClientRect();
    const scrollDistance = Math.max(1, hero.offsetHeight - window.innerHeight);
    const progress = clamp(-rect.top / scrollDistance);
    const framePosition = progress * (heroFrames.length - 1);
    const chapter = Math.round(framePosition);

    heroFrames.forEach((frame, index) => {
      const distance = Math.abs(index - framePosition);
      const opacity = clamp(1 - distance);
      frame.style.opacity = opacity.toFixed(3);
      frame.style.zIndex = String(1 + Math.round(opacity * 2));
      frame.style.transform = `scale(${(1.045 - progress * 0.02 + distance * 0.004).toFixed(4)})`;
    });

    if (heroVideo?.classList.contains("is-ready") && Number.isFinite(heroVideo.duration)) {
      const targetTime = progress * heroVideo.duration;
      if (Math.abs(heroVideo.currentTime - targetTime) > 0.035) heroVideo.currentTime = targetTime;
    }

    setHeroChapter(chapter);
    if (heroProgress) heroProgress.style.transform = `scaleY(${progress.toFixed(4)})`;
    if (scrollCue) scrollCue.style.opacity = String(clamp(1 - progress * 10));
  };

  const updateHeader = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 48);
  };

  const onScroll = () => {
    updateHeader();
    if (!scrollTicking) {
      window.requestAnimationFrame(updateHero);
      window.requestAnimationFrame(updateCertificates);
      scrollTicking = true;
    }
  };

  /* To switch to the final salon video later, add a src attribute to #heroVideo. */
  if (heroVideo?.getAttribute("src")) {
    heroVideo.addEventListener("loadedmetadata", () => {
      heroVideo.classList.add("is-ready");
      heroFrames.forEach((frame) => (frame.hidden = true));
      updateHero();
    });
  }

  /* Section reveal and current navigation */
  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0.12 }
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  const observedSections = [...document.querySelectorAll("main section[id]")].filter(
    (section) => section.id !== "home"
  );
  if ("IntersectionObserver" in window) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        navLinks.forEach((link) => {
          const active = link.getAttribute("href") === `#${visible.target.id}`;
          link.classList.toggle("is-active", active);
          if (active) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      },
      { rootMargin: "-28% 0px -55%", threshold: [0.05, 0.2, 0.5] }
    );
    observedSections.forEach((section) => navObserver.observe(section));
  }

  /* Gallery filter */
  const filterButtons = [...document.querySelectorAll("[data-filter]")];
  const galleryCards = [...document.querySelectorAll(".gallery-card")];
  let visibleGalleryCards = galleryCards;

  const filterGallery = (filter) => {
    filterButtons.forEach((button) => {
      const active = button.dataset.filter === filter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    galleryCards.forEach((card) => {
      const visible = filter === "all" || card.dataset.category === filter;
      card.classList.toggle("is-hidden", !visible);
    });
    visibleGalleryCards = galleryCards.filter((card) => !card.classList.contains("is-hidden"));
  };

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => filterGallery(button.dataset.filter || "all"));
  });

  /* Accessible gallery lightbox */
  const lightbox = document.querySelector("#galleryLightbox");
  const lightboxImage = lightbox?.querySelector("figure img");
  const lightboxCaption = lightbox?.querySelector("figcaption");
  const lightboxClose = lightbox?.querySelector(".lightbox-close");
  const lightboxPrev = lightbox?.querySelector(".lightbox-prev");
  const lightboxNext = lightbox?.querySelector(".lightbox-next");
  let lightboxIndex = 0;
  let lastGalleryTrigger = null;

  const renderLightbox = () => {
    const card = visibleGalleryCards[lightboxIndex];
    if (!card || !lightboxImage || !lightboxCaption) return;
    const sourceImage = card.querySelector("img");
    lightboxImage.src = card.dataset.image || sourceImage?.src || "";
    lightboxImage.alt = sourceImage?.alt || t("gallery.fallbackAlt");
    lightboxCaption.textContent = card.dataset.caption || "MAGIC HAIR";
  };

  const openLightbox = (card) => {
    if (!lightbox) return;
    visibleGalleryCards = galleryCards.filter((item) => !item.classList.contains("is-hidden"));
    lightboxIndex = Math.max(0, visibleGalleryCards.indexOf(card));
    lastGalleryTrigger = card;
    renderLightbox();
    if (typeof lightbox.showModal === "function") lightbox.showModal();
    else lightbox.setAttribute("open", "");
    lightboxClose?.focus();
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    if (typeof lightbox.close === "function" && lightbox.open) lightbox.close();
    else lightbox.removeAttribute("open");
    lastGalleryTrigger?.focus();
  };

  const stepLightbox = (direction) => {
    if (!visibleGalleryCards.length) return;
    lightboxIndex = (lightboxIndex + direction + visibleGalleryCards.length) % visibleGalleryCards.length;
    renderLightbox();
  };

  galleryCards.forEach((card) => card.addEventListener("click", () => openLightbox(card)));
  lightboxClose?.addEventListener("click", closeLightbox);
  lightboxPrev?.addEventListener("click", () => stepLightbox(-1));
  lightboxNext?.addEventListener("click", () => stepLightbox(1));
  lightbox?.addEventListener("close", () => lastGalleryTrigger?.focus());
  lightbox?.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  lightbox?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") stepLightbox(-1);
    if (event.key === "ArrowRight") stepLightbox(1);
  });

  /* Circular, scroll-controlled certificates */
  const certificateSection = document.querySelector("[data-certificate-section]");
  const certificateOrbit = document.querySelector(".certificate-orbit");
  const certificateCards = [...document.querySelectorAll("[data-cert]")];
  const certificateCurrent = document.querySelector("[data-cert-current]");
  const certificatePrev = document.querySelector("[data-cert-prev]");
  const certificateNext = document.querySelector("[data-cert-next]");
  let currentCertificate = 0;

  function layoutCertificateOrbit(phase) {
    if (!certificateOrbit || compactLayout.matches || reduceMotion.matches) {
      certificateCards.forEach((card) => {
        card.style.removeProperty("transform");
        card.style.removeProperty("opacity");
        card.style.removeProperty("filter");
        card.style.removeProperty("z-index");
        card.removeAttribute("aria-hidden");
      });
      return;
    }

    const width = certificateOrbit.clientWidth;
    const height = certificateOrbit.clientHeight;
    const radiusX = Math.min(width * 0.29, 285);
    const radiusY = Math.min(height * 0.33, 210);
    const total = certificateCards.length;

    certificateCards.forEach((card, index) => {
      const angle = ((index - phase) / total) * Math.PI * 2;
      const depth = Math.cos(angle);
      const x = Math.cos(angle) * radiusX;
      const y = Math.sin(angle) * radiusY;
      const normalizedDepth = (depth + 1) / 2;
      const scale = 0.56 + normalizedDepth * 0.44;
      const opacity = 0.18 + normalizedDepth * 0.82;
      const blur = (1 - normalizedDepth) * 1.8;
      card.style.transform = `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px)) scale(${scale.toFixed(3)})`;
      card.style.opacity = opacity.toFixed(3);
      card.style.filter = `blur(${blur.toFixed(2)}px)`;
      card.style.zIndex = String(Math.round(normalizedDepth * 100));
      card.setAttribute("aria-hidden", String(normalizedDepth < 0.32));
    });
  }

  function updateCertificates() {
    if (!certificateSection || !certificateCards.length) return;
    if (compactLayout.matches || reduceMotion.matches) {
      layoutCertificateOrbit(0);
      return;
    }

    const rect = certificateSection.getBoundingClientRect();
    const distance = Math.max(1, certificateSection.offsetHeight - window.innerHeight);
    const progress = clamp(-rect.top / distance);
    const phase = progress * (certificateCards.length - 1);
    const active = Math.round(phase);
    layoutCertificateOrbit(phase);

    if (active !== currentCertificate) {
      currentCertificate = active;
      if (certificateCurrent) certificateCurrent.textContent = String(active + 1).padStart(2, "0");
    }
  }

  const scrollToCertificate = (index) => {
    if (!certificateSection || !certificateCards.length) return;
    const target = (index + certificateCards.length) % certificateCards.length;
    if (compactLayout.matches) {
      certificateCards[target]?.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", inline: "center", block: "nearest" });
      return;
    }
    const distance = certificateSection.offsetHeight - window.innerHeight;
    const y = window.scrollY + certificateSection.getBoundingClientRect().top + (target / (certificateCards.length - 1)) * distance;
    window.scrollTo({ top: y, behavior: reduceMotion.matches ? "auto" : "smooth" });
  };

  certificatePrev?.addEventListener("click", () => scrollToCertificate(currentCertificate - 1));
  certificateNext?.addEventListener("click", () => scrollToCertificate(currentCertificate + 1));

  /* Manual testimonial slider */
  const testimonials = [...document.querySelectorAll("[data-testimonial]")];
  const testimonialDots = [...document.querySelectorAll("[data-testimonial-dot]")];
  const testimonialPrev = document.querySelector("[data-testimonial-prev]");
  const testimonialNext = document.querySelector("[data-testimonial-next]");
  let testimonialIndex = 0;

  const showTestimonial = (index) => {
    if (!testimonials.length) return;
    testimonialIndex = (index + testimonials.length) % testimonials.length;
    testimonials.forEach((testimonial, itemIndex) => {
      const active = itemIndex === testimonialIndex;
      testimonial.classList.toggle("is-active", active);
      testimonial.setAttribute("aria-hidden", String(!active));
    });
    testimonialDots.forEach((dot, itemIndex) => {
      const active = itemIndex === testimonialIndex;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-pressed", String(active));
    });
  };

  testimonialPrev?.addEventListener("click", () => showTestimonial(testimonialIndex - 1));
  testimonialNext?.addEventListener("click", () => showTestimonial(testimonialIndex + 1));
  testimonialDots.forEach((dot) => {
    dot.addEventListener("click", () => showTestimonial(Number(dot.dataset.testimonialDot)));
  });

  /* Demo contact form validation */
  const contactForm = document.querySelector("#contactForm");
  const formStatus = contactForm?.querySelector(".form-status");
  const consentError = contactForm?.querySelector(".consent-error");

  const setFieldError = (field, messageKey = "") => {
    const wrapper = field.closest(".field");
    const error = wrapper?.querySelector(".field-error");
    const hasError = Boolean(messageKey);
    wrapper?.classList.toggle("has-error", hasError);
    field.setAttribute("aria-invalid", String(hasError));
    if (error) {
      error.dataset.messageKey = messageKey;
      error.textContent = messageKey ? t(messageKey) : "";
    }
  };

  const setFormStatus = (messageKey = "") => {
    if (!formStatus) return;
    formStatus.dataset.messageKey = messageKey;
    formStatus.textContent = messageKey ? t(messageKey) : "";
  };

  const renderFormMessages = () => {
    contactForm?.querySelectorAll("[data-message-key]").forEach((element) => {
      const { messageKey } = element.dataset;
      element.textContent = messageKey ? t(messageKey) : "";
    });
  };

  contactForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    setFormStatus();

    const name = contactForm.elements.namedItem("name");
    const email = contactForm.elements.namedItem("email");
    const message = contactForm.elements.namedItem("message");
    const consent = contactForm.elements.namedItem("consent");
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const messageValue = String(message.value).trim();

    setFieldError(name, String(name.value).trim().length < 2 ? "form.errorName" : "");
    setFieldError(email, !emailPattern.test(String(email.value).trim()) ? "form.errorEmail" : "");
    setFieldError(message, messageValue && messageValue.length < 10 ? "form.errorMessage" : "");

    const consentMessageKey = consent.checked ? "" : "form.errorConsent";
    if (consentError) {
      consentError.dataset.messageKey = consentMessageKey;
      consentError.textContent = consentMessageKey ? t(consentMessageKey) : "";
    }
    consent.setAttribute("aria-invalid", String(Boolean(consentMessageKey)));

    const firstInvalid = contactForm.querySelector('[aria-invalid="true"]');
    if (firstInvalid) {
      firstInvalid.focus();
      setFormStatus("form.errorSummary");
      return;
    }

    setFormStatus("form.success");
  });

  contactForm?.querySelectorAll("input, textarea").forEach((field) => {
    field.addEventListener("input", () => {
      if (field.getAttribute("aria-invalid") === "true" && field.closest(".field")) setFieldError(field, "");
      if (field.name === "consent" && field.checked && consentError) {
        consentError.dataset.messageKey = "";
        consentError.textContent = "";
        field.setAttribute("aria-invalid", "false");
      }
    });
  });

  /* Initial state and efficient updates */
  const refreshLayout = () => {
    updateHero();
    updateCertificates();
    if (!mobileNavLayout.matches) closeMenu();
  };

  let resizeTimer;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(refreshLayout, 100);
  });
  reduceMotion.addEventListener?.("change", refreshLayout);
  compactLayout.addEventListener?.("change", refreshLayout);
  mobileNavLayout.addEventListener?.("change", refreshLayout);
  window.addEventListener("scroll", onScroll, { passive: true });

  const currentYear = new Date().getFullYear();
  document.querySelector("#currentYear").textContent = String(currentYear);

  const experienceYears = document.querySelector("#experienceYears");
  let calculatedExperienceYears = 15;
  if (experienceYears) {
    const baseYear = Number(experienceYears.dataset.baseYear);
    const baseYears = Number(experienceYears.dataset.baseYears);
    calculatedExperienceYears = Number.isFinite(baseYear) && Number.isFinite(baseYears)
      ? Math.max(baseYears, baseYears + currentYear - baseYear)
      : 15;
  }

  const renderExperience = () => {
    if (experienceYears) {
      experienceYears.textContent = t("about.experienceValue", { years: calculatedExperienceYears });
    }
  };

  languageSelect?.addEventListener("change", () => {
    i18n?.setLanguage?.(languageSelect.value);
    if (languageStatus) languageStatus.textContent = t("language.changed");
    closeMenu();
  });

  window.addEventListener("salon:languagechange", (event) => {
    if (languageSelect) languageSelect.value = event.detail?.language || i18n?.language || "de";
    updateMenuLabel();
    renderExperience();
    renderFormMessages();
    if (lightbox?.open) renderLightbox();
  });

  if (languageSelect) languageSelect.value = i18n?.language || "de";
  updateMenuLabel();
  renderExperience();
  setHeroChapter(0);
  showTestimonial(0);
  updateHeader();
  updateHero();
  updateCertificates();
  root.classList.add("is-ready");
})();
