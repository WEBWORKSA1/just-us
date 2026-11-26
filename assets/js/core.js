/* Just.us core: navigation, storage, forms, shared helpers. */
(function () {
  "use strict";
  var D = document, H = D.documentElement, C = window.JU_CONFIG || {};

  var JU = window.JU = {
    base: H.getAttribute("data-base") || "./",
    $: function (s, r) { return (r || D).querySelector(s); },
    $$: function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); },
    get: function (k, d) { try { var v = localStorage.getItem("ju." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("ju." + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
    esc: function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); },
    rand: function (a) { return a[Math.floor(Math.random() * a.length)]; },
    shuffle: function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; },
    day: function (d) { d = d || new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); },
    url: function (path) { return new URL(JU.base + path, location.href).href; },
    data: function () {
      if (!JU._d) JU._d = fetch(JU.base + "assets/data/app.json?v=" + (H.getAttribute("data-v") || "")).then(function (r) { return r.json(); });
      return JU._d;
    },
    toast: function (msg) {
      var t = D.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
      D.body.appendChild(t); setTimeout(function () { t.remove(); }, 2400);
    },
    copy: function (text, msg) {
      function ok() { JU.toast(msg || "Copied"); }
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(ok, legacy); } else { legacy(); }
      function legacy() { var t = D.createElement("textarea"); t.value = text; D.body.appendChild(t); t.select(); try { D.execCommand("copy"); ok(); } catch (e) { /* ignore */ } t.remove(); }
    },
    share: function (title, text, url) {
      if (navigator.share) { navigator.share({ title: title, text: text, url: url }).catch(function () { /* cancelled */ }); } else { JU.copy(url, "Link copied"); }
    },
    saved: function () { return JU.get("saved", []); },
    toggleSave: function (slug) {
      var s = JU.saved(), i = s.indexOf(slug);
      if (i > -1) { s.splice(i, 1); } else { s.push(slug); }
      JU.set("saved", s); JU.syncSaves(); return i < 0;
    },
    syncSaves: function () {
      var s = JU.saved();
      JU.$$("[data-save]").forEach(function (b) { var on = s.indexOf(b.getAttribute("data-save")) > -1; b.setAttribute("aria-pressed", on); b.textContent = on ? "Saved ✓" : "Save"; });
      D.dispatchEvent(new CustomEvent("ju:saved"));
    }
  };

  /* navigation */
  var toggle = JU.$(".nav-toggle"), nav = JU.$("#nav");
  if (toggle && nav) toggle.addEventListener("click", function () { var open = nav.classList.toggle("open"); toggle.setAttribute("aria-expanded", open); });

  /* delegated clicks: save buttons, video embeds, share links */
  D.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-save],[data-yt],[data-share]");
    if (!b) return;
    if (b.hasAttribute("data-save") && !b.closest("[data-gen]")) { JU.toggleSave(b.getAttribute("data-save")); return; }
    if (b.hasAttribute("data-yt")) {
      var f = D.createElement("iframe"); f.className = "yt-frame"; f.title = b.getAttribute("aria-label") || "Video";
      f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"; f.allowFullscreen = true;
      f.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(b.getAttribute("data-yt")) + "?autoplay=1";
      b.replaceWith(f); return;
    }
    if (b.hasAttribute("data-share")) { ev.preventDefault(); JU.share(D.title, b.getAttribute("data-share") || D.title, location.href); }
  });
  JU.syncSaves();
  if (location.hash.length > 1) { var hit = D.getElementById(location.hash.slice(1)); if (hit && hit.classList.contains("idea")) hit.classList.add("hit"); }

  /* countdowns: <span data-until="YYYY-MM-DD"> */
  JU.$$("[data-until]").forEach(function (el) {
    var left = Math.ceil((new Date(el.getAttribute("data-until") + "T23:59:59Z") - Date.now()) / 864e5);
    el.textContent = left > 1 ? left + " days left" : left === 1 ? "Last day" : "Closed for this month";
  });

  /* optional payment buttons on the support page */
  JU.$$("[data-pay]").forEach(function (el) {
    var names = { paypal: "PayPal", stripe: "Card (Stripe)", kofi: "Ko-fi", buymeacoffee: "Buy Me a Coffee" }, p = C.payments || {}, html = "";
    Object.keys(names).forEach(function (k) { if (/^https:\/\//.test(p[k] || "")) html += '<a class="btn" target="_blank" rel="noopener" href="' + JU.esc(p[k]) + '">Give with ' + names[k] + "</a> "; });
    if (html) { el.innerHTML = html; el.hidden = false; }
  });

  /* multi-step forms: <form data-steps> with <fieldset class="step"> children */
  JU.$$("form[data-steps]").forEach(function (f) {
    var steps = JU.$$(".step", f), n = 0, bar = JU.$(".progress b", f);
    function show() {
      steps.forEach(function (s, i) { s.hidden = i !== n; });
      if (bar) bar.style.width = ((n + 1) / steps.length * 100) + "%";
      var first = JU.$("input,select,textarea", steps[n]); if (first && n > 0) first.focus();
    }
    f.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-next],[data-prev]"); if (!b) return;
      if (b.hasAttribute("data-next")) {
        var bad = JU.$$("input,select,textarea", steps[n]).filter(function (i) { return !i.checkValidity(); })[0];
        if (bad) { bad.reportValidity(); return; }
        n = Math.min(n + 1, steps.length - 1);
      } else { n = Math.max(n - 1, 0); }
      show();
    });
    show();
  });

  /* forms: every <form data-form> posts to the relay; the inbox is assembled only here */
  function inbox() {
    var k = C._k || [], v = (C._v || []).slice().reverse();
    return v.map(function (n, i) { return String.fromCharCode(n ^ k[i % k.length]); }).join("");
  }
  JU.$$("form[data-form]").forEach(function (f) {
    f.setAttribute("novalidate", "");
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var bad = JU.$$("input,select,textarea", f).filter(function (i) { return !i.checkValidity(); })[0];
      if (bad) { var st = bad.closest(".step"); if (st && st.hidden) { JU.$$(".step", f).forEach(function (s) { s.hidden = s !== st; }); } bad.reportValidity(); return; }
      var o = {}, btn = JU.$("[type=submit]", f), label = btn.textContent, name = f.getAttribute("data-form");
      new FormData(f).forEach(function (v, k) { if (v === "") return; o[k] = o[k] ? o[k] + ", " + v : v; });
      function done() {
        f.hidden = true; JU.set("sent." + name, JU.day());
        var d = D.getElementById(f.getAttribute("data-done")); if (d) { d.hidden = false; d.focus(); }
      }
      function fail() {
        btn.disabled = false; btn.textContent = label;
        var m = JU.$(".form-error", f); if (!m) { m = D.createElement("p"); m.className = "form-error"; m.setAttribute("role", "alert"); f.appendChild(m); }
        m.textContent = "That did not send. Please check your connection and try again in a moment.";
      }
      if (o._honey) { done(); return; }
      o._subject = "[Just.us] " + (f.getAttribute("data-subject") || name);
      o._template = "table"; o._captcha = "false"; o.form = name; o.page = location.pathname;
      btn.disabled = true; btn.textContent = "Sending…";
      fetch((C.relay || "") + inbox(), { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(o) })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (j && String(j.success) === "true") { done(); } else { fail(); } })
        .catch(fail);
    });
  });
})();
