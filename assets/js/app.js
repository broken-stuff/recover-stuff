(function () {
  'use strict';

  var RISK = { 1: 'Safe to DIY', 2: 'Low risk', 3: 'Take care', 4: 'High risk', 5: 'Pro territory' };
  var DISCLAIMER = 'Educational DIY guide, no warranty. DIY recovery can cause permanent data loss. If the data is valuable, consider a professional first.';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // escape first, then turn `backtick` spans into <code>
  function rich(s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>'); }
  function store(key, val) {
    try {
      if (val === undefined) { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { /* storage unavailable */ }
    return null;
  }

  /* ---------- checklist enhancement (static pages and SPA) ---------- */
  function confetti() {
    if (REDUCED) return;
    var colors = ['#e0202e', '#ffd60a', '#2ee66b', '#2a6bff', '#1c4bd8'];
    for (var i = 0; i < 36; i++) {
      var s = document.createElement('span');
      s.className = 'confetti';
      s.setAttribute('aria-hidden', 'true');
      s.style.left = Math.random() * 100 + 'vw';
      s.style.background = colors[i % colors.length];
      s.style.animationDelay = Math.random() * 0.5 + 's';
      document.body.appendChild(s);
      setTimeout(function (el) { el.remove(); }, 2600, s);
    }
  }
  function enhanceMission(root) {
    var m = root.querySelector('.mission');
    if (!m) return;
    var key = 'rs:progress:' + m.getAttribute('data-key');
    var boxes = [].slice.call(m.querySelectorAll('.steps input'));
    var bar = m.querySelector('.bar'), fill = bar.firstElementChild;
    var count = m.querySelector('.count'), win = m.querySelector('.win');
    var saved = store(key);
    if (saved && saved.length) boxes.forEach(function (b, i) { b.checked = !!saved[i]; });
    function update(celebrate) {
      var n = boxes.filter(function (b) { return b.checked; }).length;
      fill.style.width = (n / boxes.length * 100) + '%';
      bar.setAttribute('aria-valuenow', n);
      count.textContent = n + ' of ' + boxes.length + ' done';
      var all = n === boxes.length;
      win.hidden = !all;
      if (all && celebrate) confetti();
    }
    boxes.forEach(function (b) {
      b.addEventListener('change', function () {
        store(key, boxes.map(function (x) { return x.checked; }));
        update(true);
      });
    });
    update(false);
  }

  /* ---------- SPA ---------- */
  var app = document.getElementById('app');
  if (!app) { enhanceMission(document); return; }

  var base = location.pathname.replace(/[^/]*$/, '');
  var G = null;

  function stepperHTML(active) {
    var names = ['Pick your device', 'What happened?', 'Your mission'];
    return '<ol class="stepper" aria-label="Progress">' + names.map(function (n, i) {
      var num = i + 1, cls = num === active ? 'is-current' : num < active ? 'is-done' : '';
      return '<li class="' + cls + '"' + (num === active ? ' aria-current="step"' : '') + '><span class="dot" aria-hidden="true">' +
        (num < active ? '✓' : num) + '</span><span class="lbl">' + n + '</span></li>';
    }).join('') + '</ol>';
  }

  function riskMeter(n) {
    var segs = [1, 2, 3, 4, 5].map(function (i) { return '<i class="' + (i <= n ? 'on r' + i : '') + '"></i>'; }).join('');
    return '<div class="risk r' + n + '" role="img" aria-label="Risk level ' + n + ' of 5: ' + RISK[n] + '"><div class="meter" aria-hidden="true">' + segs +
      '</div><span class="chip">' + n + '/5 · ' + RISK[n] + '</span></div>';
  }

  function learnChips(ids) {
    var names = (G && G.howto) || {};
    var list = (ids || []).filter(function (id) { return Object.prototype.hasOwnProperty.call(names, id); });
    if (!list.length) return '';
    return '<p class="learn">' + list.map(function (id) {
      return '<a class="learn-chip" href="' + base + 'guide/how-to/' + esc(id) + '/">Guide: ' + esc(names[id]) + '</a>';
    }).join('') + '</p>';
  }

  function missionHTML(d, s) {
    var r = G.results[d][s];
    var dv = G.devices.filter(function (x) { return x.id === d; })[0];
    var sy = G.symptoms.filter(function (x) { return x.id === s; })[0];
    var rel = '';
    var toolCards = r.tools.map(function (id) {
      var t = G.tools[id];
      return '<article class="card tool"><h3>' + esc(t.name) + '</h3><p>' + esc(t.desc) + '</p><ul class="meta"><li>' + esc(t.os.join(' · ')) + '</li><li>' + esc(t.cost) +
        '</li></ul><p class="links"><a href="' + esc(t.url) + '" target="_blank" rel="noopener noreferrer">Website</a><a href="' + esc(t.docsUrl) + '" target="_blank" rel="noopener noreferrer">Docs</a></p></article>';
    }).join('');
    var resCards = r.resources.map(function (id) {
      var x = G.resources[id];
      return '<article class="card res"><span class="tag">' + esc(x.type) + '</span><h3><a href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">' + esc(x.name) + '</a></h3><p>' + esc(x.desc) + '</p></article>';
    }).join('');
    return '<article class="mission" data-key="' + esc(d + '/' + s) + '">' +
      '<p class="eyebrow">' + esc(dv.icon) + ' ' + esc(dv.name) + ' · ' + esc(sy.icon) + ' ' + esc(sy.name) + '</p>' +
      '<h1 tabindex="-1">' + esc(r.title) + '</h1><p class="lead">' + esc(r.summary) + '</p>' +
      '<div class="badges">' + riskMeter(r.risk) + '<span class="odds">Success odds: <strong>' + esc(r.successOdds) + '</strong></span></div>' +
      '<p class="risknote">' + esc(r.riskNote) + '</p>' +
      '<section class="stop" aria-labelledby="stop-h"><h2 id="stop-h"><span aria-hidden="true">✋</span> Stop! Don\'t do this first</h2><ul>' + r.stopFirst.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></section>' +
      '<section aria-labelledby="steps-h"><h2 id="steps-h">Your steps</h2><div class="progress"><div class="bar" role="progressbar" aria-label="Steps completed" aria-valuemin="0" aria-valuemax="' + r.steps.length + '" aria-valuenow="0"><span style="width:0%"></span></div><span class="count" aria-live="polite">0 of ' + r.steps.length + ' done</span></div>' +
      '<ol class="steps">' + r.steps.map(function (st, i) {
        return '<li><label><input type="checkbox" data-i="' + i + '"><span class="box" aria-hidden="true"></span><span class="txt"><strong>' + esc(st.title) + '</strong><span>' + rich(st.detail) + '</span></span></label>' +
          '<details class="how"><summary>Show me how</summary><ol>' + (st.how || []).map(function (h) { return '<li>' + rich(h) + '</li>'; }).join('') + '</ol></details>' +
          learnChips(st.learn) + '</li>';
      }).join('') + '</ol><div class="win" hidden role="status"><strong>Mission complete! 🎉</strong> Check your recovered files open properly, then back them up in two places.</div></section>' +
      (toolCards ? '<section aria-labelledby="tools-h"><h2 id="tools-h">Tools you\'ll use</h2><div class="grid">' + toolCards + '</div></section>' : '') +
      (resCards ? '<section aria-labelledby="res-h"><h2 id="res-h">Learn from the experts</h2><div class="grid">' + resCards + '</div></section>' : '') +
      '<section class="pro" aria-labelledby="pro-h"><h2 id="pro-h"><span aria-hidden="true">🧑‍🔧</span> When to call a pro</h2><p>' + esc(r.callPro) + '</p><p class="findpro"><a href="' + base + 'guide/how-to/find-a-pro/">How to find a trustworthy pro →</a></p></section>' +
      '<section aria-labelledby="faq-h"><h2 id="faq-h">Questions people ask</h2><div class="faq">' + r.faq.map(function (f) { return '<details><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>'; }).join('') + '</div></section>' +
      '<p class="disclaimer inline"><strong>Before you start:</strong> ' + esc(DISCLAIMER) + '</p>' +
      '<div class="navrow"><button class="btn ghost" type="button" data-nav="back">← Back</button><button class="btn ghost" type="button" data-nav="restart">Start over</button>' +
      '<a class="btn" href="' + base + 'guide/' + d + '/' + s + '/">Printable page for this guide</a></div></article>';
  }

  function parse() {
    var q = new URLSearchParams(location.search || (location.hash ? '?' + location.hash.slice(1).replace(/^\?/, '') : ''));
    var d = q.get('d'), s = q.get('s');
    var has = function (o, k) { return !!k && Object.prototype.hasOwnProperty.call(o, k); };
    if (!has(G.results, d) || !G.devices.some(function (x) { return x.id === d; })) return { d: null, s: null };
    if (!has(G.results[d], s)) return { d: d, s: null };
    return { d: d, s: s };
  }
  function go(d, s, replace) {
    var url = base + (d ? '?d=' + d + (s ? '&s=' + s : '') : '');
    history[replace ? 'replaceState' : 'pushState'](null, '', url);
    render(true);
  }

  function render(focus) {
    var st = parse(), html, step, title = 'Recover Stuff: free step-by-step DIY data recovery guide';
    if (!st.d) {
      step = 1;
      html = '<section class="intro-panel" aria-label="About this site"><p>Recover Stuff is a free, step-by-step guide that helps everyday people try to get files back from hard drives, SSDs, USB sticks, SD cards and external drives. Pick your device, then pick what happened, and you get a plain-language plan with free tools and safety warnings.</p>' +
        '<p class="rule"><strong>Most important rule:</strong> stop using the device right now.</p>' +
        '<p class="intro-links"><a href="' + base + 'guide/how-to/glossary/">New here? Key terms (glossary)</a> <a href="' + base + 'guide/how-to/find-a-pro/">Need a professional?</a></p></section>' +
        '<h1 tabindex="-1">Step 1: Pick your device</h1><p class="lead">Which one lost its files? Tap a card to start your quest.</p><div class="cards">' +
        G.devices.map(function (d) {
          return '<button class="pick" type="button" data-d="' + d.id + '"><span class="ico" aria-hidden="true">' + d.icon + '</span><span class="t">' + esc(d.name) + '</span><span class="b">' + esc(d.blurb) + '</span></button>';
        }).join('') + '</div>' +
        '<p class="intro small">Free and educational. Nothing you click here touches your files.</p>';
    } else if (!st.s) {
      step = 2;
      var dv = G.devices.filter(function (x) { return x.id === st.d; })[0];
      title = dv.name + ' data recovery | Recover Stuff';
      html = '<h1 tabindex="-1">Step 2: What happened to your ' + esc(dv.name.toLowerCase()) + '?</h1><p class="lead">Pick the closest match.</p><div class="cards">' +
        G.symptoms.filter(function (s) { return G.results[st.d][s.id]; }).map(function (s) {
          return '<button class="pick" type="button" data-s="' + s.id + '"><span class="ico" aria-hidden="true">' + s.icon + '</span><span class="t">' + esc(s.name) + '</span><span class="b">' + esc(s.blurb) + '</span></button>';
        }).join('') + '</div><div class="navrow"><button class="btn ghost" type="button" data-nav="back">← Back</button><button class="btn ghost" type="button" data-nav="restart">Start over</button></div>';
    } else {
      step = 3;
      title = G.results[st.d][st.s].title + ' | Recover Stuff';
      html = missionHTML(st.d, st.s);
    }
    app.innerHTML = html;
    document.getElementById('stepper').innerHTML = stepperHTML(step);
    document.title = title;
    if (step === 3) enhanceMission(app);
    if (focus) {
      var h = app.querySelector('h1');
      if (h) h.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  }

  app.addEventListener('click', function (e) {
    var el = e.target.closest('[data-d],[data-s],[data-nav]');
    if (!el) return;
    var st = parse();
    if (el.hasAttribute('data-d')) go(el.getAttribute('data-d'));
    else if (el.hasAttribute('data-s')) go(st.d, el.getAttribute('data-s'));
    else if (el.getAttribute('data-nav') === 'restart') go();
    else if (el.getAttribute('data-nav') === 'back') go(st.s ? st.d : null);
  });
  window.addEventListener('popstate', function () { render(true); });

  fetch(base + 'data/guide.json').then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function (j) {
    G = j;
    render(false);
  }).catch(function () { /* keep the static, link-based fallback in place */ });
})();
