/**
 * FitVed Booking Modal — Single Source of Truth
 * -----------------------------------------------
 * Reusable booking modal for all static HTML pages.
 * Uses the same Supabase table ("leads") as the React app.
 * No SDK needed — uses native fetch() with Supabase REST API.
 *
 * Usage:
 *   <script src="/booking-modal.js"></script>
 *   <button onclick="FitVed.openModal()">Book Free Trial</button>
 *   <button onclick="FitVed.openModal('Weight Loss Program')">Book</button>
 */

(function () {
  "use strict";

  // ── Supabase config — loaded from /booking-config.js (never commit that file) ──
  var _cfg = window.FVConfig || {};
  var SB_URL = _cfg.url;
  var SB_KEY = _cfg.key;

  if (!SB_URL || !SB_KEY) {
    console.warn("[FitVed] booking-config.js not loaded. Modal will not submit.");
  }

  // ── Program options (must match the React LeadModal SelectItem values) ────
  var PROGRAMS = [
    { label: "Personal Training (1-on-1)", value: "Personal Training" },
    { label: "Yoga Classes (Home / Society)", value: "Yoga Classes" },
    { label: "Weight Loss Program (12-Week)", value: "Weight Loss Program" },
    { label: "Senior Fitness (55+)", value: "Senior Fitness" },
    { label: "Prenatal / Postnatal Yoga", value: "Prenatal Yoga" },
    { label: "Clinical Rehab / Post-Surgery", value: "Clinical Rehab" },
    { label: "Strength Training", value: "Strength Training" },
    { label: "Women's Fitness", value: "Women's Fitness" },
    { label: "Online Classes (Worldwide)", value: "Online Classes" },
    { label: "Corporate Wellness", value: "Corporate Wellness" },
  ];

  // ── CSS injected once ─────────────────────────────────────────────────────
  var MODAL_CSS = [
    "#fv-modal-overlay{display:none;position:fixed;inset:0;z-index:99999;",
    "background:rgba(10,20,35,0.75);backdrop-filter:blur(4px);",
    "align-items:center;justify-content:center;padding:16px;}",
    "#fv-modal-overlay.fv-open{display:flex;}",
    "#fv-modal-box{background:#fff;border-radius:24px;padding:32px 28px;",
    "max-width:480px;width:100%;position:relative;box-shadow:0 24px 80px rgba(0,0,0,.25);",
    "font-family:'Outfit',system-ui,sans-serif;color:#1B314B;",
    "max-height:90vh;overflow-y:auto;}",
    "#fv-modal-close{position:absolute;top:14px;right:16px;background:none;",
    "border:none;cursor:pointer;font-size:20px;color:#1B314B;opacity:.4;",
    "line-height:1;padding:4px 8px;border-radius:8px;}",
    "#fv-modal-close:hover{opacity:.9;background:#f4f4f4;}",
    ".fv-eyebrow{font-size:11px;font-weight:800;text-transform:uppercase;",
    "letter-spacing:.1em;color:#FF6B35;display:block;margin-bottom:6px;}",
    ".fv-modal-title{font-size:clamp(22px,5vw,30px);font-weight:900;",
    "text-transform:uppercase;letter-spacing:-.01em;line-height:1.1;margin-bottom:8px;}",
    ".fv-modal-title span{color:#FF6B35;}",
    ".fv-modal-desc{font-size:13px;color:#627387;line-height:1.6;margin-bottom:20px;}",
    ".fv-label{display:block;font-size:11px;font-weight:700;text-transform:uppercase;",
    "letter-spacing:.07em;color:#1B314B;margin-bottom:6px;}",
    ".fv-input,.fv-select{width:100%;height:44px;padding:0 14px;border:1.5px solid rgba(27,49,75,.2);",
    "border-radius:10px;font-size:14px;font-family:inherit;color:#1B314B;",
    "background:#f9fafb;transition:border-color .2s;outline:none;box-sizing:border-box;}",
    ".fv-input:focus,.fv-select:focus{border-color:#FF6B35;background:#fff;}",
    ".fv-field{margin-bottom:14px;}",
    ".fv-submit{width:100%;height:48px;background:#FF6B35;color:#fff;border:none;",
    "border-radius:12px;font-size:14px;font-weight:900;text-transform:uppercase;",
    "letter-spacing:.08em;cursor:pointer;transition:all .2s;margin-top:6px;}",
    ".fv-submit:hover{background:#e6541f;transform:translateY(-1px);}",
    ".fv-submit:disabled{opacity:.6;cursor:not-allowed;transform:none;}",
    ".fv-trust{font-size:10px;text-align:center;color:#627387;margin-top:10px;",
    "font-weight:600;letter-spacing:.03em;}",
    ".fv-success{text-align:center;padding:20px 0;}",
    ".fv-success-icon{width:56px;height:56px;border-radius:50%;background:#e6f9ef;",
    "display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:26px;}",
    ".fv-success h3{font-size:22px;font-weight:900;text-transform:uppercase;",
    "letter-spacing:-.01em;margin-bottom:8px;}",
    ".fv-success p{font-size:13px;color:#627387;line-height:1.6;margin-bottom:20px;}",
    ".fv-done-btn{background:#1B314B;color:#fff;border:none;border-radius:24px;",
    "padding:12px 28px;font-size:13px;font-weight:700;text-transform:uppercase;",
    "letter-spacing:.06em;cursor:pointer;}",
    ".fv-error-msg{color:#d9534f;font-size:12px;margin-top:4px;display:none;}",
  ].join("");

  // ── Modal HTML template ───────────────────────────────────────────────────
  function buildModalHTML() {
    var opts = PROGRAMS.map(function (p) {
      return '<option value="' + p.value + '">' + p.label + "</option>";
    }).join("");

    return [
      '<div id="fv-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="fv-modal-heading">',
      '  <div id="fv-modal-box">',
      '    <button id="fv-modal-close" aria-label="Close booking modal">&#x2715;</button>',
      '    <div id="fv-modal-body">',
      '      <span class="fv-eyebrow">Start Risk-Free</span>',
      '      <h2 class="fv-modal-title" id="fv-modal-heading">BOOK YOUR <span>FREE HOME TRIAL</span></h2>',
      '      <p class="fv-modal-desc">Experience a 1-on-1 personal training or yoga session in your Bangalore society — no payment, no card, zero commitment.</p>',
      '      <form id="fv-lead-form" novalidate>',
      '        <div class="fv-field">',
      '          <label class="fv-label" for="fv-name">Full Name</label>',
      '          <input class="fv-input" id="fv-name" type="text" maxlength="100" placeholder="Enter your full name" required />',
      '          <span class="fv-error-msg" id="fv-name-err">Please enter your name (min 2 chars)</span>',
      '        </div>',
      '        <div class="fv-field">',
      '          <label class="fv-label" for="fv-phone">Phone Number</label>',
      '          <input class="fv-input" id="fv-phone" type="tel" inputmode="numeric" maxlength="10" placeholder="10-digit mobile number" required />',
      '          <span class="fv-error-msg" id="fv-phone-err">Enter a valid 10-digit Indian mobile number</span>',
      '        </div>',
      '        <div class="fv-field">',
      '          <label class="fv-label" for="fv-interest">I\'m Interested In...</label>',
      '          <select class="fv-select" id="fv-interest">',
      '            <option value="">Select an option</option>',
      opts,
      '          </select>',
      '        </div>',
      '        <button class="fv-submit" id="fv-submit-btn" type="submit">Confirm Free Trial Session</button>',
      '        <p class="fv-trust">🔒 100% Free &bull; No Payment Required &bull; Police Verified Trainers</p>',
      '      </form>',
      '    </div>',
      '    <div id="fv-modal-success" class="fv-success" style="display:none">',
      '      <div class="fv-success-icon">&#x2713;</div>',
      '      <h3>Trial Booking Confirmed!</h3>',
      '      <p>Our team will call you within 24 hours to match your trainer and confirm session timing.</p>',
      '      <button class="fv-done-btn" id="fv-done-btn">Done</button>',
      '    </div>',
      '    <div id="fv-modal-duplicate" class="fv-success" style="display:none">',
      '      <div class="fv-success-icon">&#x2713;</div>',
      '      <h3>Already Registered!</h3>',
      '      <p>Our records show you&#39;ve already submitted this form. Our team will contact you shortly &#8212; no need to submit again.</p>',
      '      <button class="fv-done-btn" id="fv-dup-done-btn">Got it</button>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join("");
  }

  // ── Validation helpers ────────────────────────────────────────────────────
  function isValidPhone(v) {
    return /^[6-9]\d{9}$/.test(v.trim());
  }
  function isValidName(v) {
    return v.trim().length >= 2 && v.trim().length <= 100;
  }

  // ── Supabase REST insert (no SDK) ─────────────────────────────────────────
  function insertLead(payload) {
    return fetch(SB_URL + "/rest/v1/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SB_KEY,
        "Authorization": "Bearer " + SB_KEY,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(payload),
    });
  }


  // ── GA4 event helper ──────────────────────────────────────────────────────
  function trackEvent(name, params) {
    try {
      if (typeof window.gtag === "function") window.gtag("event", name, params || {});
    } catch (e) { /* silent */ }
  }

  // ── Source derived from current page URL ──────────────────────────────────
  function getSource() {
    var p = window.location.pathname.replace(/\//g, "").replace(/\.html$/, "") || "home";
    return p + "_booking_modal";
  }

  // ── Core modal controller ─────────────────────────────────────────────────
  var _currentPreset = "";

  function init() {
    // Inject CSS once
    if (!document.getElementById("fv-modal-css")) {
      var style = document.createElement("style");
      style.id = "fv-modal-css";
      style.textContent = MODAL_CSS;
      document.head.appendChild(style);
    }

    // Inject HTML once
    if (!document.getElementById("fv-modal-overlay")) {
      var div = document.createElement("div");
      div.innerHTML = buildModalHTML();
      document.body.appendChild(div.firstChild);
      attachListeners();
    }
  }

  function attachListeners() {
    var overlay = document.getElementById("fv-modal-overlay");
    var closeBtn = document.getElementById("fv-modal-close");
    var doneBtn = document.getElementById("fv-done-btn");
    var dupDoneBtn = document.getElementById("fv-dup-done-btn");
    var form = document.getElementById("fv-lead-form");

    // Close on overlay click (outside box)
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });

    // Close button
    closeBtn.addEventListener("click", closeModal);

    // Done buttons
    doneBtn.addEventListener("click", closeModal);
    if (dupDoneBtn) dupDoneBtn.addEventListener("click", closeModal);

    // Escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });

    // Form submit
    form.addEventListener("submit", handleSubmit);
  }

  function openModal(presetProgram) {
    init();

    _currentPreset = presetProgram || "";

    // Reset form state
    var form = document.getElementById("fv-lead-form");
    var success = document.getElementById("fv-modal-success");
    var body = document.getElementById("fv-modal-body");
    var nameErr = document.getElementById("fv-name-err");
    var phoneErr = document.getElementById("fv-phone-err");
    var submitBtn = document.getElementById("fv-submit-btn");

    form.reset();
    success.style.display = "none";
    body.style.display = "block";
    var dupDiv = document.getElementById("fv-modal-duplicate");
    if (dupDiv) dupDiv.style.display = "none";
    submitBtn.disabled = false;
    submitBtn.textContent = "Confirm Free Trial Session";
    if (nameErr) nameErr.style.display = "none";
    if (phoneErr) phoneErr.style.display = "none";

    // Pre-select the interest dropdown
    if (_currentPreset) {
      var select = document.getElementById("fv-interest");
      // Try exact value match first, then partial label match
      var matched = false;
      for (var i = 0; i < PROGRAMS.length; i++) {
        var p = PROGRAMS[i];
        if (
          p.value === _currentPreset ||
          p.value.toLowerCase() === _currentPreset.toLowerCase() ||
          p.label.toLowerCase().indexOf(_currentPreset.toLowerCase()) !== -1
        ) {
          select.value = p.value;
          matched = true;
          break;
        }
      }
      if (!matched) select.value = "";
    }

    // Show modal
    var overlay = document.getElementById("fv-modal-overlay");
    overlay.classList.add("fv-open");
    document.body.style.overflow = "hidden";

    // Focus first field
    setTimeout(function () {
      var nameInput = document.getElementById("fv-name");
      if (nameInput) nameInput.focus();
    }, 60);
  }

  function closeModal() {
    var overlay = document.getElementById("fv-modal-overlay");
    if (overlay) {
      overlay.classList.remove("fv-open");
      document.body.style.overflow = "";
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    var nameInput = document.getElementById("fv-name");
    var phoneInput = document.getElementById("fv-phone");
    var interest = document.getElementById("fv-interest");
    var nameErr = document.getElementById("fv-name-err");
    var phoneErr = document.getElementById("fv-phone-err");
    var submitBtn = document.getElementById("fv-submit-btn");

    var name = nameInput.value.trim();
    var phone = phoneInput.value.trim().replace(/\D/g, "");
    var prog = interest.value || "Personal Training";

    // Client-side validation
    var valid = true;
    nameErr.style.display = "none";
    phoneErr.style.display = "none";

    if (!isValidName(name)) {
      nameErr.style.display = "block";
      nameInput.focus();
      valid = false;
    }
    if (!isValidPhone(phone)) {
      phoneErr.style.display = "block";
      if (valid) phoneInput.focus();
      valid = false;
    }
    if (!valid) return;

    // Submit
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";

    // ── Client-side duplicate check (localStorage) ─────────────────────────
    var submittedPhones = [];
    try {
      submittedPhones = JSON.parse(localStorage.getItem("fitved_submitted_phones") || "[]");
    } catch(e) { submittedPhones = []; }

    if (submittedPhones.indexOf(phone) !== -1) {
      document.getElementById("fv-modal-body").style.display = "none";
      document.getElementById("fv-modal-success").style.display = "none";
      document.getElementById("fv-modal-duplicate").style.display = "block";
      trackEvent("enquiry_duplicate", { source: getSource() });
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    try {
      var res = await insertLead({
        name: name,
        phone: phone,
        interest: prog,
        source: getSource(),
      });

      if (!res.ok) {
        var errBody = await res.json().catch(function() { return {}; });
        // 23505 = unique_violation — same phone already registered
        if (res.status === 409 || (errBody && errBody.code === "23505")) {
          submittedPhones.push(phone);
          try { localStorage.setItem("fitved_submitted_phones", JSON.stringify(submittedPhones)); } catch(e){}
          document.getElementById("fv-modal-body").style.display = "none";
          document.getElementById("fv-modal-success").style.display = "none";
          document.getElementById("fv-modal-duplicate").style.display = "block";
          trackEvent("enquiry_duplicate", { source: getSource() });
          return;
        }
        throw new Error("Supabase error: " + res.status + " " + JSON.stringify(errBody));
      }

      // Save phone to localStorage to prevent duplicate submissions
      submittedPhones.push(phone);
      try { localStorage.setItem("fitved_submitted_phones", JSON.stringify(submittedPhones)); } catch(e){}

      trackEvent("enquiry_submitted", { source: getSource(), program: prog });
      localStorage.setItem("fitved_form_submitted", "true");

      // Show success state
      document.getElementById("fv-modal-body").style.display = "none";
      document.getElementById("fv-modal-success").style.display = "block";

    } catch (err) {
      console.error("[FitVed Modal] Submit error:", err);
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirm Free Trial Session";
      alert("Something went wrong. Please try again or WhatsApp us at +91 9606047293");
    }
  }

  // ── Listen for the event fired by the React app (cross-page consistency) ──
  window.addEventListener("open_consult_modal", function () {
    openModal();
  });

  // ── Public API ────────────────────────────────────────────────────────────
  window.FitVed = window.FitVed || {};
  window.FitVed.openModal = openModal;
  window.FitVed.closeModal = closeModal;

  // Auto-init on DOMContentLoaded so the overlay is ready before first click
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
