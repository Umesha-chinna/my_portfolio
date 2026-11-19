(function () {
  "use strict";
  document.documentElement.classList.add("js");
  var CFG = window.SITE_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Apply editable config to links ---------- */
  $$("[data-link]").forEach(function (a) {
    var k = a.getAttribute("data-link");
    if (k === "email") {
      a.href = "mailto:" + CFG.email;
      if (a.getAttribute("data-text") === "email") a.textContent = CFG.email;
    } else if (CFG[k]) {
      a.href = CFG[k];
    }
  });
  $$("[data-project]").forEach(function (a) {
    var u = (CFG.projects || {})[a.getAttribute("data-project")];
    if (u) a.href = u;
  });
  $("#year").textContent = new Date().getFullYear();

  /* ---------- Navbar ---------- */
  var navbar = $("#navbar"), toggle = $("#navToggle"), links = $("#navLinks"), toTop = $("#toTop");
  toggle.addEventListener("click", function () {
    var open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
    toggle.firstElementChild.className = open ? "fa-solid fa-xmark" : "fa-solid fa-bars";
  });
  $$("a", links).forEach(function (a) {
    a.addEventListener("click", function () {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.firstElementChild.className = "fa-solid fa-bars";
    });
  });
  toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });

  var sections = $$("main section[id]");
  var navAnchors = $$("a", links);
  function onScroll() {
    var y = window.scrollY;
    navbar.classList.toggle("scrolled", y > 10);
    toTop.classList.toggle("show", y > 500);
    var current = "home";
    sections.forEach(function (s) { if (y + 120 >= s.offsetTop) current = s.id; });
    if (current === "what-i-do") current = "about";
    navAnchors.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + current); });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Reveal on scroll ---------- */
  var reveals = $$(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Resume upload / replace (local preview) ---------- */
  var frame = $("#resumeFrame"), dl = $("#downloadResume"), op = $("#openResume");
  var admin = $("#resumeAdmin"), upload = $("#resumeUpload"), reset = $("#resumeReset");
  var DEFAULT_PDF = "assets/resume.pdf", blobUrl = null;
  // The upload panel is shown only when the page is opened with ?admin in the URL.
  if (/[?&]admin\b/.test(location.search)) admin.hidden = false;

  function setResume(url) {
    frame.src = url; dl.href = url; op.href = url;
  }
  upload.addEventListener("change", function () {
    var f = upload.files[0];
    if (!f) return;
    if (f.type !== "application/pdf") { alert("Please choose a PDF file."); upload.value = ""; return; }
    if (f.size > 10 * 1024 * 1024) { alert("File is too large (max 10 MB)."); upload.value = ""; return; }
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = URL.createObjectURL(f);
    setResume(blobUrl);
  });
  reset.addEventListener("click", function () {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = null; upload.value = "";
    setResume(DEFAULT_PDF);
  });

  /* ---------- Contact form ---------- */
  var form = $("#contactForm"), btn = $("#submitBtn"), statusEl = $("#formStatus");
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var COOLDOWN_MS = 30000, lastSent = 0;

  function showStatus(type, msg) {
    statusEl.className = "status show " + type;
    statusEl.textContent = msg;
  }
  function setErr(field, msg) {
    var wrap = form[field].closest(".field");
    wrap.classList.toggle("invalid", !!msg);
    $('.err[data-for="' + field + '"]').textContent = msg || "";
  }
  function validate() {
    var v = {
      name: form.name.value.trim(), email: form.email.value.trim(),
      subject: form.subject.value.trim(), message: form.message.value.trim()
    };
    var ok = true;
    function check(f, cond, msg) { setErr(f, cond ? "" : msg); if (!cond) ok = false; }
    check("name", v.name.length >= 2, "Please enter your full name.");
    check("email", EMAIL_RE.test(v.email), "Please enter a valid email address.");
    check("subject", v.subject.length >= 3, "Please enter a subject (min 3 characters).");
    check("message", v.message.length >= 10, "Message must be at least 10 characters.");
    return ok ? v : null;
  }
  ["name", "email", "subject", "message"].forEach(function (f) {
    form[f].addEventListener("input", function () { setErr(f, ""); });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    statusEl.className = "status";
    var data = validate();
    if (!data) return;
    if (form.website.value) return; // honeypot filled: silently drop
    if (!CFG.appsScriptUrl) {
      showStatus("error", "The contact form isn't connected yet. Please email me directly at " + CFG.email + ".");
      return;
    }
    if (Date.now() - lastSent < COOLDOWN_MS) {
      showStatus("error", "Please wait a few seconds before sending another message.");
      return;
    }

    btn.disabled = true;
    btn.querySelector("span").textContent = "Sending...";

    // text/plain keeps this a "simple" request (no CORS preflight), which Apps Script requires.
    fetch(CFG.appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(data)
    })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (res) {
        if (res && res.result === "success") {
          lastSent = Date.now();
          form.reset();
          showStatus("success", "Thank you! Your message has been sent successfully.");
        } else {
          throw new Error((res && res.message) || "Unknown error");
        }
      })
      .catch(function (err) {
        console.error("Contact form error:", err);
        showStatus("error", "Sorry, your message could not be sent. Please try again later or email me at " + CFG.email + ".");
      })
      .finally(function () {
        btn.disabled = false;
        btn.querySelector("span").textContent = "Submit Message";
      });
  });
})();
