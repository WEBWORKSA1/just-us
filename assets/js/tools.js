/* Just.us tools: days together, date jar, bucket list. */
(function () {
  "use strict";
  var JU = window.JU, $ = JU.$, $$ = JU.$$, esc = JU.esc;
  var GIFT = { 1: "paper", 2: "cotton", 3: "leather", 4: "fruit or flowers", 5: "wood", 10: "tin", 15: "crystal", 20: "china", 25: "silver", 30: "pearl", 40: "ruby", 50: "gold" };

  function fmt(d) { return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }); }

  /* ---------- days together ---------- */
  $$("[data-days]").forEach(function (el) {
    el.innerHTML = '<label for="since">The day it became “us”</label><input id="since" type="date" max="' + JU.day() + '" value="' + esc(JU.get("since", "")) + '"><div class="days-out" aria-live="polite"></div>';
    var inp = $("input", el), out = $(".days-out", el);
    function calc() {
      var v = inp.value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { out.innerHTML = ""; return; }
      var p = v.split("-").map(Number), start = new Date(p[0], p[1] - 1, p[2]), now = new Date();
      now.setHours(0, 0, 0, 0);
      var days = Math.round((now - start) / 864e5);
      if (days < 0) { out.innerHTML = '<p class="form-error">That date is in the future. Pick the day you got together.</p>'; return; }
      JU.set("since", v);
      var y = now.getFullYear() - start.getFullYear(), m = now.getMonth() - start.getMonth(), dd = now.getDate() - start.getDate();
      if (dd < 0) { m--; dd += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
      if (m < 0) { y--; m += 12; }
      var next = new Date(now.getFullYear(), start.getMonth(), start.getDate());
      if (next < now) next.setFullYear(now.getFullYear() + 1);
      var nth = next.getFullYear() - start.getFullYear(), toNext = Math.round((next - now) / 864e5);
      var marks = [100, 200, 300, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000, 15000, 20000].filter(function (x) { return x > days; }).slice(0, 4);
      var rows = marks.map(function (x) { var d = new Date(start.getTime()); d.setDate(d.getDate() + x); return "<tr><td>Day " + x.toLocaleString() + "</td><td>" + fmt(d) + "</td><td>in " + (x - days).toLocaleString() + " days</td></tr>"; }).join("");
      if (nth > 0) rows = "<tr><td>" + nth + (nth === 1 ? " year" : " years") + (GIFT[nth] ? " (traditional gift: " + GIFT[nth] + ")" : "") + "</td><td>" + fmt(next) + "</td><td>" + (toNext === 0 ? "today" : "in " + toNext + " days") + "</td></tr>" + rows;
      out.innerHTML = '<div class="stats"><div><b>' + days.toLocaleString() + "</b>days together</div><div><b>" + Math.floor(days / 7).toLocaleString() + "</b>weeks</div><div><b>" + y + "y " + m + "m " + dd + "d</b>in calendar time</div><div><b>" + (days * 24).toLocaleString() + "</b>hours</div></div>" +
        (toNext === 0 && nth > 0 ? '<p class="done">Happy anniversary. ' + nth + (nth === 1 ? " year" : " years") + " today.</p>" : "") +
        "<h2>Coming up</h2><table><tbody>" + rows + '</tbody></table><div class="gen-actions" style="margin-top:1rem"><button type="button" class="btn ghost" data-a="copy">Copy the numbers</button><a class="btn" href="' + JU.base + 'dates/anniversary/">Anniversary date ideas</a></div>';
      $('[data-a="copy"]', out).addEventListener("click", function () { JU.copy("We have been together " + days.toLocaleString() + " days (" + y + " years, " + m + " months, " + dd + " days). Counted on Just.us", "Copied"); });
    }
    inp.addEventListener("input", calc);
    calc();
  });

  /* ---------- printable date jar ---------- */
  $$("[data-jar]").forEach(function (el) {
    JU.data().then(function (d) {
      el.innerHTML = '<div class="row no-print"><div><label for="jn">How many slips</label><select id="jn"><option>12</option><option selected>24</option><option>36</option><option>52</option></select></div>' +
        '<div><label for="jw">Where</label><select id="jw"><option value="any">Home and out</option><option value="home">At home only</option><option value="out">Out only</option></select></div></div>' +
        '<div class="row no-print"><div><label for="jc">Budget</label><select id="jc"><option value="3">Any budget</option><option value="0">Free only</option><option value="1">Up to about $20</option><option value="2">Up to about $60</option></select></div>' +
        '<div><label for="jx">Add your own (one per line)</label><textarea id="jx" rows="2" maxlength="600"></textarea></div></div>' +
        '<div class="gen-actions no-print"><button type="button" class="btn" data-a="make">Fill the jar</button><button type="button" class="btn ghost" data-a="print" disabled>Print the slips</button></div><div class="slips"></div>';
      var slips = $(".slips", el);
      el.addEventListener("click", function (ev) {
        var b = ev.target.closest("[data-a]"); if (!b) return;
        if (b.getAttribute("data-a") === "print") { window.print(); return; }
        var w = $("#jw", el).value, c = +$("#jc", el).value, n = +$("#jn", el).value;
        var own = $("#jx", el).value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 20);
        var pool = JU.shuffle(d.ideas.filter(function (i) { return (w === "any" || i.where === w) && i.cost <= c; })).slice(0, Math.max(0, n - own.length));
        slips.innerHTML = own.map(function (t) { return '<div class="slip"><b>' + esc(t) + "</b>Our own idea</div>"; }).join("") +
          pool.map(function (i) { return '<div class="slip"><b>' + esc(i.title) + "</b>" + esc(i.desc) + "</div>"; }).join("");
        $('[data-a="print"]', el).disabled = !slips.children.length;
        if (!slips.children.length) slips.innerHTML = '<p class="muted">No ideas match those filters. Widen the budget or the place.</p>';
      });
    });
  });

  /* ---------- bucket list ---------- */
  $$("[data-bucket]").forEach(function (el) {
    var items = JU.get("bucket", []);
    el.innerHTML = '<form class="form inline"><label class="sr" for="bk">Add something to do together</label><input id="bk" maxlength="120" placeholder="Something we want to do together" autocomplete="off"><button class="btn" type="submit">Add</button></form>' +
      '<div class="gen-actions" style="margin:1rem 0"><button type="button" class="btn ghost small" data-a="suggest">Suggest five</button><button type="button" class="btn ghost small" data-a="copy">Copy the list</button><span class="count"></span></div><div class="progress"><b style="width:0"></b></div><ul class="bucket"></ul>';
    var ul = $(".bucket", el);
    function draw() {
      JU.set("bucket", items);
      var done = items.filter(function (i) { return i.done; }).length;
      $(".count", el).textContent = items.length ? done + " of " + items.length + " done" : "Your list is empty";
      $(".progress b", el).style.width = (items.length ? done / items.length * 100 : 0) + "%";
      ul.innerHTML = items.map(function (i, n) {
        return '<li class="' + (i.done ? "done-item" : "") + '"><input type="checkbox" id="b' + n + '" data-n="' + n + '"' + (i.done ? " checked" : "") + '><label for="b' + n + '" class="sr">Done</label><span>' + esc(i.t) + '</span><button type="button" data-x="' + n + '" aria-label="Remove ' + esc(i.t) + '">×</button></li>';
      }).join("");
    }
    function add(t) { t = t.trim(); if (t && !items.some(function (i) { return i.t === t; })) items.push({ t: t, done: false }); }
    $("form", el).addEventListener("submit", function (ev) { ev.preventDefault(); var i = $("#bk", el); add(i.value); i.value = ""; draw(); });
    el.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-x],[data-a]"); if (!b) return;
      if (b.hasAttribute("data-x")) { items.splice(+b.getAttribute("data-x"), 1); draw(); return; }
      if (b.getAttribute("data-a") === "copy") { JU.copy(items.map(function (i) { return (i.done ? "[x] " : "[ ] ") + i.t; }).join("\n") || "Our list is empty", "List copied"); return; }
      JU.data().then(function (d) { JU.shuffle(d.ideas).slice(0, 5).forEach(function (i) { add(i.title); }); draw(); });
    });
    el.addEventListener("change", function (ev) { var n = ev.target.getAttribute("data-n"); if (n !== null) { items[+n].done = ev.target.checked; draw(); } });
    draw();
  });
})();
