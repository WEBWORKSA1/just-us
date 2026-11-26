/* Just.us play: date generator, idea filters, question decks, the daily duo, games and the quiz. */
(function () {
  "use strict";
  var JU = window.JU, $ = JU.$, $$ = JU.$$, esc = JU.esc, COST = ["Free", "$", "$$", "$$$"];

  function ideaHTML(i, starter) {
    return "<h3>" + esc(i.title) + "</h3><p>" + esc(i.desc) + '</p><ul class="meta"><li>' + COST[i.cost] + "</li><li>" + (i.where === "home" ? "At home" : "Out") + "</li><li>~" + i.mins + " min</li></ul>" +
      (starter ? '<p class="starter"><b>Ask each other:</b> ' + esc(starter) + "</p>" : "");
  }

  /* ---------- date generator ---------- */
  $$("[data-gen]").forEach(function (el) {
    var mini = el.getAttribute("data-gen") === "mini";
    var opts = {
      where: [["any", "Anywhere"], ["home", "At home"], ["out", "Out"]],
      cost: [["any", "Any budget"], ["0", "Free"], ["1", "Under $20"], ["2", "$20 and up"]],
      time: [["any", "Any length"], ["s", "Under 1 hr"], ["m", "1–2 hrs"], ["l", "2 hrs+"]],
      mood: [["any", "Any mood"], ["cozy", "Cozy"], ["active", "Active"], ["creative", "Creative"], ["foodie", "Foodie"], ["adventure", "Adventurous"], ["long-distance", "Long-distance"]]
    };
    var keys = mini ? ["where", "cost"] : ["where", "cost", "time", "mood"], F = {}, cur = null, seen = [], veto = 3;
    el.innerHTML = keys.map(function (k) {
      F[k] = "any";
      return '<div class="seg" role="group" aria-label="' + k + '">' + opts[k].map(function (o, n) {
        return '<button type="button" class="chip" data-k="' + k + '" data-v="' + o[0] + '" aria-pressed="' + (n === 0) + '">' + o[1] + "</button>";
      }).join("") + "</div>";
    }).join("") + '<div class="gen-card" aria-live="polite"><p class="muted">Pick what fits tonight, then spin.</p></div>' +
      '<div class="gen-actions"><button type="button" class="btn" data-a="spin">Spin a date</button><button type="button" class="btn ghost small" data-a="veto" disabled>Veto · 3 left</button>' +
      '<button type="button" class="btn ghost small" data-a="save" disabled>Save</button><button type="button" class="btn ghost small" data-a="share" disabled>Share</button></div>';
    var card = $(".gen-card", el);
    function act(a) { return $('[data-a="' + a + '"]', el); }
    JU.data().then(function (d) {
      function pool() {
        return d.ideas.filter(function (i) {
          if (F.where !== "any" && i.where !== F.where) return false;
          if (F.cost !== "any" && (F.cost === "2" ? i.cost < 2 : i.cost !== +F.cost)) return false;
          if (F.time === "s" && i.mins > 60) return false;
          if (F.time === "m" && (i.mins <= 60 || i.mins > 120)) return false;
          if (F.time === "l" && i.mins <= 120) return false;
          if (F.mood && F.mood !== "any" && i.tags.indexOf(F.mood) < 0) return false;
          return true;
        });
      }
      function sync() {
        act("veto").disabled = !cur || veto < 1;
        act("veto").textContent = veto > 0 ? "Veto · " + veto + " left" : "No vetoes left";
        act("save").disabled = act("share").disabled = !cur;
        act("save").textContent = cur && JU.saved().indexOf(cur.slug) > -1 ? "Saved ✓" : "Save";
        act("spin").textContent = cur ? "Spin again" : "Spin a date";
      }
      function spin() {
        var all = pool(), p = all.filter(function (i) { return seen.indexOf(i.slug) < 0; });
        if (!p.length) { seen = []; p = all; }
        if (!p.length) { cur = null; card.innerHTML = "<p>No date fits every filter. Loosen one and spin again.</p>"; card.classList.remove("pop"); sync(); return; }
        cur = JU.rand(p); seen.push(cur.slug);
        card.innerHTML = ideaHTML(cur, JU.rand(JU.rand(d.decks).q));
        card.classList.remove("pop"); void card.offsetWidth; card.classList.add("pop");
        sync();
      }
      el.addEventListener("click", function (ev) {
        var b = ev.target.closest("button"); if (!b) return;
        var k = b.getAttribute("data-k"), a = b.getAttribute("data-a");
        if (k) { F[k] = b.getAttribute("data-v"); $$('[data-k="' + k + '"]', el).forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); seen = []; return; }
        if (a === "spin") { spin(); }
        else if (a === "veto" && cur && veto > 0) { veto--; spin(); }
        else if (a === "save" && cur) { JU.toggleSave(cur.slug); sync(); }
        else if (a === "share" && cur) { JU.share(cur.title, "Date idea from Just.us: " + cur.title, JU.url("dates/#" + cur.slug)); }
      });
    });
  });

  /* ---------- saved ideas ---------- */
  $$("[data-saved]").forEach(function (el) {
    function draw() {
      JU.data().then(function (d) {
        var s = JU.saved(), items = d.ideas.filter(function (i) { return s.indexOf(i.slug) > -1; });
        el.innerHTML = items.length ? '<ul class="saved-list">' + items.map(function (i) {
          return '<li><a href="#' + i.slug + '">' + esc(i.title) + '</a><button type="button" class="chip" data-drop="' + i.slug + '">Remove</button></li>';
        }).join("") + "</ul>" : '<p class="muted">Nothing saved yet. Tap Save on any idea and it will wait here, on this device.</p>';
      });
    }
    el.addEventListener("click", function (ev) { var b = ev.target.closest("[data-drop]"); if (b) JU.toggleSave(b.getAttribute("data-drop")); });
    document.addEventListener("ju:saved", draw);
    draw();
  });

  /* ---------- filter bar above a list of ideas ---------- */
  $$("[data-filter]").forEach(function (bar) {
    var list = $(bar.getAttribute("data-filter")); if (!list) return;
    var items = $$(".idea", list), q = "", f = "all";
    bar.innerHTML = '<label class="sr" for="fq">Search these ideas</label><input id="fq" type="search" placeholder="Search these ideas"><span class="seg">' +
      [["all", "All"], ["free", "Free"], ["cheap", "Under $20"], ["home", "At home"], ["out", "Out"]].map(function (o, n) {
        return '<button type="button" class="chip" data-f="' + o[0] + '" aria-pressed="' + (n === 0) + '">' + o[1] + "</button>";
      }).join("") + '</span><span class="count" aria-live="polite"></span>';
    function apply() {
      var n = 0;
      items.forEach(function (it) {
        var c = +it.getAttribute("data-cost"), w = it.getAttribute("data-where");
        var ok = f === "all" || (f === "free" && c === 0) || (f === "cheap" && c <= 1) || f === w;
        if (ok && q) ok = it.textContent.toLowerCase().indexOf(q) > -1;
        it.hidden = !ok; if (ok) n++;
      });
      $(".count", bar).textContent = n + (n === 1 ? " idea" : " ideas");
    }
    $("input", bar).addEventListener("input", function () { q = this.value.trim().toLowerCase(); apply(); });
    bar.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-f]"); if (!b) return;
      f = b.getAttribute("data-f"); $$("[data-f]", bar).forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); apply();
    });
    apply();
  });

  /* ---------- question deck player ---------- */
  $$(".player").forEach(function (el) {
    JU.data().then(function (d) {
      var slug = el.getAttribute("data-deck"), qs = [];
      d.decks.forEach(function (k) { if (slug === "all" || k.slug === slug) k.q.forEach(function (q) { qs.push({ q: q, deck: k.name }); }); });
      if (!qs.length) return;
      if (slug === "all") qs = JU.shuffle(qs);
      var n = slug === "all" ? 0 : Math.min(JU.get("pos." + slug, 0), qs.length - 1);
      el.innerHTML = '<div class="qcard"><p class="eyebrow"></p><p class="qtext" aria-live="polite"></p></div><div class="gen-actions"><button type="button" class="btn" data-a="next">Next question</button>' +
        '<button type="button" class="btn ghost small" data-a="prev">Back</button><button type="button" class="btn ghost small" data-a="mix">Shuffle</button><button type="button" class="btn ghost small" data-a="copy">Copy</button><span class="count"></span></div>';
      function show() {
        $(".eyebrow", el).textContent = qs[n].deck;
        $(".qtext", el).textContent = qs[n].q;
        $(".count", el).textContent = (n + 1) + " of " + qs.length;
        if (slug !== "all") JU.set("pos." + slug, n);
      }
      el.addEventListener("click", function (ev) {
        var b = ev.target.closest("[data-a]"); if (!b) return;
        var a = b.getAttribute("data-a");
        if (a === "next") n = (n + 1) % qs.length;
        else if (a === "prev") n = (n - 1 + qs.length) % qs.length;
        else if (a === "mix") { qs = JU.shuffle(qs); n = 0; }
        else if (a === "copy") { JU.copy(qs[n].q, "Question copied"); return; }
        show();
      });
      show();
    });
  });

  /* ---------- daily duo: both answer, then both answers appear ---------- */
  $$(".duo").forEach(function (el) {
    var day = el.getAttribute("data-daily"), ui = $(".duo-ui", el);
    function ask(label, btn, cb) {
      ui.innerHTML = '<label for="duo-t">' + label + '</label><textarea id="duo-t" rows="3" maxlength="600"></textarea><button type="button" class="btn">' + btn + '</button><p class="muted small">Answers stay on this device. Nothing you type here is sent anywhere.</p>';
      var t = $("textarea", ui);
      $("button", ui).addEventListener("click", function () { var v = t.value.trim(); if (!v) { t.focus(); return; } cb(v); });
    }
    function start() {
      ask("Partner one: type your answer", "Hide it and pass the phone", function (a) {
        ask("Partner two: your turn", "Reveal both answers", function (b) {
          JU.set("duo." + day, [a, b]);
          var s = JU.get("streak", { last: "", n: 0 }), today = JU.day(), y = JU.day(new Date(Date.now() - 864e5));
          if (s.last !== today) { s = { last: today, n: s.last === y ? s.n + 1 : 1 }; JU.set("streak", s); }
          reveal(a, b);
        });
      });
    }
    function reveal(a, b) {
      var s = JU.get("streak", { last: "", n: 0 });
      ui.innerHTML = '<div class="reveal"><div><span class="eyebrow">Partner one</span><p>' + esc(a) + '</p></div><div><span class="eyebrow">Partner two</span><p>' + esc(b) + "</p></div></div>" +
        (s.n > 0 ? '<p class="streak">' + s.n + (s.n === 1 ? " day" : " days") + " in a row. Come back tomorrow for the next one.</p>" : "") +
        '<button type="button" class="btn ghost small">Answer again</button>';
      $("button", ui).addEventListener("click", start);
    }
    var saved = JU.get("duo." + day, null);
    if (saved) { reveal(saved[0], saved[1]); } else { start(); }
  });

  /* ---------- would you rather: two secret picks, then compare ---------- */
  $$("[data-wyr]").forEach(function (el) {
    JU.data().then(function (d) {
      var rounds, n, same, first;
      function reset() { rounds = JU.shuffle(d.wyr).slice(0, 10); n = 0; same = 0; first = null; show(); }
      function show() {
        if (n >= rounds.length) {
          var pct = Math.round(same / rounds.length * 100);
          el.innerHTML = '<p class="eyebrow">Final score</p><p class="score">' + same + " / " + rounds.length + "</p><p>You picked the same thing " + pct + "% of the time. " +
            (pct >= 70 ? "You two are finishing each other’s sentences." : pct >= 40 ? "Enough in common to agree, enough difference to stay interesting." : "Opposites, clearly. Ask about the ones you split on; that is where the good stories are.") +
            '</p><div class="gen-actions"><button type="button" class="btn" data-a="again">Play ten more</button><button type="button" class="btn ghost" data-share="We matched ' + same + ' out of 10 on Would You Rather at Just.us">Share the game</button></div>';
          return;
        }
        var r = rounds[n];
        el.innerHTML = '<p class="eyebrow">Round ' + (n + 1) + " of " + rounds.length + " · " + (first === null ? "player one picks" : "player two picks") + '</p><p class="qtext">Would you rather…</p><div class="wyr"><button type="button" class="opt" data-o="0">' + esc(r[0]) +
          '</button><button type="button" class="opt" data-o="1">' + esc(r[1]) + '</button></div><p class="muted small">' + (first === null ? "Pick, then pass the phone. Your choice stays hidden." : "Player one has chosen. No peeking, no hints.") + "</p>";
      }
      el.addEventListener("click", function (ev) {
        var b = ev.target.closest("[data-o],[data-a]"); if (!b) return;
        var a = b.getAttribute("data-a");
        if (a === "next") { n++; first = null; show(); return; }
        if (a === "again") { reset(); return; }
        var o = +b.getAttribute("data-o");
        if (first === null) { first = o; show(); return; }
        var r = rounds[n], match = o === first; if (match) same++;
        function who(i) { var w = []; if (first === i) w.push("Player one"); if (o === i) w.push("Player two"); return w.length ? "<small>" + w.join(" + ") + "</small>" : ""; }
        el.innerHTML = '<p class="eyebrow">Round ' + (n + 1) + " of " + rounds.length + '</p><p class="qtext">' + (match ? "Same pick." : "You split.") + '</p><div class="wyr"><div class="opt' + (who(0) ? " picked" : "") + '">' + esc(r[0]) + who(0) +
          '</div><div class="opt' + (who(1) ? " picked" : "") + '">' + esc(r[1]) + who(1) + '</div></div><p class="muted small">' + (match ? "Why that one? Compare reasons." : "Each make the case for your side in one sentence.") + '</p><button type="button" class="btn" data-a="next">' + (n + 1 < rounds.length ? "Next round" : "See the score") + "</button>";
      });
      reset();
    });
  });

  /* ---------- how well do you know me ---------- */
  $$("[data-knowme]").forEach(function (el) {
    JU.data().then(function (d) {
      var names = JU.get("names", ["", ""]), prompts, n, score, guess;
      function setup() {
        el.innerHTML = '<div class="row"><div><label for="kn0">Player one</label><input id="kn0" maxlength="20" autocomplete="off" value="' + esc(names[0]) + '"></div><div><label for="kn1">Player two</label><input id="kn1" maxlength="20" autocomplete="off" value="' + esc(names[1]) +
          '"></div></div><button type="button" class="btn" data-a="start">Start ten rounds</button><p class="muted small">Names stay on this device. Each of you guesses five answers about the other.</p>';
      }
      function round() {
        if (n >= 10) { return end(); }
        var subj = n % 2, g = 1 - subj;
        el.innerHTML = '<p class="eyebrow">Round ' + (n + 1) + " of 10 · " + esc(names[g]) + ' guesses</p><p class="qtext">' + esc(prompts[n].replace("{name}", names[subj])) + '</p><label for="kg">' + esc(names[g]) + ', type your guess</label><input id="kg" maxlength="120" autocomplete="off"><button type="button" class="btn" data-a="lock">Lock it in</button>';
        $("#kg", el).focus();
      }
      function judge() {
        var subj = n % 2, g = 1 - subj;
        el.innerHTML = '<p class="eyebrow">Round ' + (n + 1) + ' of 10</p><p class="qtext">' + esc(prompts[n].replace("{name}", names[subj])) + "</p><p>" + esc(names[g]) + " guessed: <strong>" + esc(guess) + "</strong></p><p>" + esc(names[subj]) +
          ', say the real answer out loud. How close was that?</p><div class="gen-actions"><button type="button" class="btn" data-s="2">Nailed it</button><button type="button" class="btn ghost" data-s="1">Close</button><button type="button" class="btn ghost" data-s="0">Not quite</button></div>';
      }
      function end() {
        var total = score[0] + score[1];
        el.innerHTML = '<p class="eyebrow">Final score</p><p class="score">' + total + ' / 20</p><div class="stats"><div><b>' + score[0] + "</b>" + esc(names[0]) + " out of 10</div><div><b>" + score[1] + "</b>" + esc(names[1]) + " out of 10</div></div><p>" +
          (total >= 16 ? "You know each other very well. Try the deep deck next." : total >= 10 ? "Solid. The misses are the interesting part: pick one and ask for the story behind it." : "Plenty left to discover, which is good news. Start with the getting-to-know-you deck.") +
          '</p><div class="gen-actions"><button type="button" class="btn" data-a="start">Play again</button><a class="btn ghost" href="' + JU.base + 'questions/">Open the question decks</a></div>';
      }
      el.addEventListener("click", function (ev) {
        var b = ev.target.closest("[data-a],[data-s]"); if (!b) return;
        var a = b.getAttribute("data-a");
        if (a === "start") {
          var i0 = $("#kn0", el), i1 = $("#kn1", el);
          if (i0) { names = [i0.value.trim() || "Player one", i1.value.trim() || "Player two"]; JU.set("names", names); }
          prompts = JU.shuffle(d.know).slice(0, 10); n = 0; score = [0, 0]; round();
        } else if (a === "lock") {
          guess = $("#kg", el).value.trim(); if (!guess) { $("#kg", el).focus(); return; } judge();
        } else if (b.hasAttribute("data-s")) { score[1 - (n % 2)] += +b.getAttribute("data-s"); n++; round(); }
      });
      el.addEventListener("keydown", function (ev) { if (ev.key === "Enter" && ev.target.id === "kg") { ev.preventDefault(); $('[data-a="lock"]', el).click(); } });
      setup();
    });
  });

  /* ---------- care-style quiz ---------- */
  $$("[data-quiz]").forEach(function (el) {
    var S = [
      ["Kind words", "You feel most cared for when it is said out loud: a specific thank-you, a note, hearing why you matter. Silence can read as indifference even when none is meant.", "Say one specific thing you appreciate, every day this week."],
      ["Undivided time", "You feel most cared for when someone is fully present: phone away, no multitasking, doing something together. Distraction stings more than distance.", "Block thirty minutes with phones in another room."],
      ["Practical help", "You feel most cared for when someone lightens the load: a task handled without being asked, a problem quietly solved. For you, effort is affection.", "Take one chore off their list without mentioning it."],
      ["Thoughtful gestures", "You feel most cared for through small, well-chosen tokens: the snack they remembered, a postcard, a saved article. It is the noticing, not the price.", "Bring home one small thing that shows you were paying attention."],
      ["Physical closeness", "You feel most cared for through touch and nearness: a long hug, a hand on the shoulder, sitting close. Being apart or untouched feels like being far away.", "Offer a twenty-second hug at hello and goodbye."]
    ];
    JU.data().then(function (d) {
      var n, sc, theirs = (location.hash.match(/p=([\d.]+)/) || [])[1];
      theirs = theirs ? theirs.split(".").map(Number) : null;
      if (theirs && theirs.length !== 5) theirs = null;
      function top(a) { var m = 0; a.forEach(function (v, i) { if (v > a[m]) m = i; }); return m; }
      function q() {
        if (n >= d.quiz.length) { return result(); }
        var item = d.quiz[n], order = JU.shuffle([0, 1, 2, 3, 4]);
        el.innerHTML = '<div class="progress"><b style="width:' + (n / d.quiz.length * 100) + '%"></b></div><p class="eyebrow">Question ' + (n + 1) + " of " + d.quiz.length + '</p><p class="qtext">' + esc(item.q) + '</p><div class="wyr" style="grid-template-columns:1fr">' +
          order.map(function (i) { return '<button type="button" class="opt" data-i="' + i + '">' + esc(item.a[i]) + "</button>"; }).join("") + "</div>";
      }
      function result() {
        var t = top(sc), max = Math.max.apply(null, sc) || 1, order = [0, 1, 2, 3, 4].sort(function (a, b) { return sc[b] - sc[a]; });
        JU.set("quiz", sc);
        var html = '<p class="eyebrow">Your care style</p><p class="qtext">' + S[t][0] + "</p><p>" + S[t][1] + '</p><div class="bars">' + order.map(function (i) {
          return '<div class="bar"><span>' + S[i][0] + "<em>" + sc[i] + '</em></span><i><b style="width:' + (sc[i] / max * 100) + '%"></b></i></div>';
        }).join("") + "</div>";
        if (theirs) {
          var o = top(theirs);
          html += '<div class="callout"><p><strong>Compared with the person who sent you this:</strong> their top style is ' + S[o][0].toLowerCase() + "; yours is " + S[t][0].toLowerCase() + ". " +
            (o === t ? "You speak the same dialect, which makes care easy to give. Watch that you do not neglect the other four." : "People tend to give care the way they like to receive it. This week, try theirs: " + S[o][2].toLowerCase()) + "</p></div>";
        } else {
          html += '<div class="callout"><p><strong>Try this:</strong> tell your person what you just learned, then send them the link below. When they finish, the page compares your two results.</p></div>';
        }
        el.innerHTML = html + '<div class="gen-actions"><button type="button" class="btn" data-a="send">Send to my person</button><button type="button" class="btn ghost" data-a="redo">Retake</button></div>';
      }
      el.addEventListener("click", function (ev) {
        var b = ev.target.closest("[data-i],[data-a]"); if (!b) return;
        var a = b.getAttribute("data-a");
        if (a === "go" || a === "redo") { n = 0; sc = [0, 0, 0, 0, 0]; q(); }
        else if (a === "send") { JU.share("Care-style quiz", "I took the care-style quiz on Just.us. Take it and the page will compare our results.", JU.url("quiz/#p=" + sc.join("."))); }
        else if (b.hasAttribute("data-i")) { sc[+b.getAttribute("data-i")]++; n++; q(); }
      });
      el.innerHTML = (theirs ? '<p class="callout">Someone sent you their result. Take the quiz and you will see how your two styles compare.</p>' : "") +
        '<p class="qtext">' + d.quiz.length + ' quick scenarios. No right answers.</p><p class="muted">Pick the option that would make you feel most cared for. It takes about two minutes and nothing is stored off this device.</p><button type="button" class="btn" data-a="go">Start the quiz</button>';
    });
  });
})();
