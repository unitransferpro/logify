/* Logify site interactions */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- year stamp ---- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---- page load flag (kicks hero reveal) ---- */
  window.addEventListener('load', function () { document.body.classList.add('loaded'); });
  // fallback so text never gets stuck hidden
  setTimeout(function () { document.body.classList.add('loaded'); }, 1200);

  /* ---- nav: scrolled state + mobile sheet ---- */
  var nav = document.querySelector('.nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 12); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  var toggle = document.querySelector('.nav-toggle');
  var sheet = document.querySelector('.nav-mobile');
  if (toggle && sheet) {
    toggle.addEventListener('click', function () {
      var open = sheet.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    sheet.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        sheet.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---- scroll reveal ---- */
  var rvs = document.querySelectorAll('.rv');
  if (rvs.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      rvs.forEach(function (el) { el.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      rvs.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---- count-up stats ---- */
  var nums = document.querySelectorAll('[data-count]');
  if (nums.length) {
    var run = function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var suffix = el.getAttribute('data-suffix') || '';
      var dp = (el.getAttribute('data-count').split('.')[1] || '').length;
      if (reduce) { el.textContent = target.toFixed(dp) + suffix; return; }
      var start = null, dur = 1400;
      var tick = function (t) {
        if (!start) start = t;
        var p = Math.min((t - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(dp) + suffix;
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = target.toFixed(dp) + suffix;
      };
      requestAnimationFrame(tick);
    };
    if (!('IntersectionObserver' in window)) {
      nums.forEach(run);
    } else {
      var io2 = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { run(e.target); io2.unobserve(e.target); }
        });
      }, { threshold: 0.5 });
      nums.forEach(function (el) { io2.observe(el); });
    }
  }

  /* ---- roadmap timeline: draw the progress line + light nodes ---- */
  var tl = document.querySelector('.timeline');
  if (tl) {
    if (reduce || !('IntersectionObserver' in window)) {
      tl.classList.add('lit');
    } else {
      var tlio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('lit'); tlio.unobserve(e.target); }
        });
      }, { threshold: 0.3 });
      tlio.observe(tl);
    }
  }

  /* ============================================================
     HERO — the "gap finder"
     A drifting field of market-signal dots. A reticle sweeps to
     the emptiest region and locks onto it: find the gap.
     ============================================================ */
  var canvas = document.getElementById('gapfield');
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, dots = [], gap = null, gapPrev = null, gapNext = null;
    var morph = 1, lastSwap = 0, INK = '13,15,20', BLUE = '59,91,219';
    var mx = 0.5, my = 0.5, tmx = 0.5, tmy = 0.5;

    function resize() {
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildDots();
    }
    function buildDots() {
      var area = W * H;
      var count = Math.min(120, Math.max(46, Math.round(area / 12000)));
      dots = [];
      for (var i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
          r: Math.random() * 1.7 + 1.1,
          blue: Math.random() < 0.16,
          depth: Math.random() * 0.7 + 0.35,
          ph: Math.random() * Math.PI * 2
        });
      }
      if (!gap) { gap = pickGap(); gapNext = gap; }
    }
    function pickGap() {
      // keep the reticle in the open right-hand region so it never
      // collides with the left-aligned hero copy
      var narrow = W < 760;
      var gw = Math.max(140, Math.min(W * (narrow ? 0.34 : 0.17), 250));
      var gh = Math.max(108, Math.min(H * 0.26, 190));
      var xMin = narrow ? W * 0.28 : W * 0.56;
      var xMax = W - gw - 18;
      var x = xMin + Math.random() * Math.max(0, xMax - xMin);
      var y = H * (0.30 + Math.random() * 0.30) - gh / 2;
      x = Math.max(16, Math.min(xMax, x));
      y = Math.max(70, Math.min(H - gh - 24, y));
      return { x: x, y: y, w: gw, h: gh };
    }
    function lerpRect(a, b, t) {
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
               w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t };
    }
    function inRect(px, py, r, pad) {
      return px > r.x - pad && px < r.x + r.w + pad && py > r.y - pad && py < r.y + r.h + pad;
    }

    function draw(now) {
      ctx.clearRect(0, 0, W, H);
      mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
      var offx = (mx - 0.5) * 26, offy = (my - 0.5) * 20;

      // swap the gap target every ~4.6s with an eased morph
      if (!lastSwap) lastSwap = now;
      if (now - lastSwap > 4600 && morph >= 1) {
        gapPrev = { x: gap.x, y: gap.y, w: gap.w, h: gap.h };
        gapNext = pickGap(); morph = 0; lastSwap = now;
      }
      if (morph < 1) {
        morph = Math.min(1, morph + 0.012);
        var e = 1 - Math.pow(1 - morph, 3);
        gap = lerpRect(gapPrev, gapNext, e);
      }
      var rgap = { x: gap.x + offx * 0.4, y: gap.y + offy * 0.4, w: gap.w, h: gap.h };
      var cx0 = rgap.x + rgap.w / 2, cy0 = rgap.y + rgap.h / 2;

      // scan beam sweeping down the field
      var beamY = ((now * 0.045) % (H + 200)) - 100;
      var bg = ctx.createLinearGradient(0, beamY - 70, 0, beamY + 70);
      bg.addColorStop(0, 'rgba(59,91,219,0)');
      bg.addColorStop(0.5, 'rgba(59,91,219,0.05)');
      bg.addColorStop(1, 'rgba(59,91,219,0)');
      ctx.fillStyle = bg; ctx.fillRect(0, beamY - 70, W, 140);
      ctx.strokeStyle = 'rgba(59,91,219,0.14)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, beamY); ctx.lineTo(W, beamY); ctx.stroke();

      // signal dots (with subtle pointer parallax + beam highlight)
      var near = [];
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        d.x += d.vx; d.y += d.vy;
        if (d.x < -6) d.x = W + 6; if (d.x > W + 6) d.x = -6;
        if (d.y < -6) d.y = H + 6; if (d.y > H + 6) d.y = -6;
        var px = d.x + offx * d.depth, py = d.y + offy * d.depth;
        var fade = inRect(px, py, rgap, -12) ? 0.06 : 1;
        var beamBoost = Math.max(0, 1 - Math.abs(py - beamY) / 55);
        var tw = 0.55 + 0.45 * Math.sin(d.ph + now * 0.001);
        var a = (d.blue ? 0.5 : 0.22) * tw * fade + beamBoost * 0.35 * fade;
        ctx.beginPath(); ctx.arc(px, py, d.r + beamBoost * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + (d.blue ? BLUE : INK) + ',' + a.toFixed(3) + ')';
        ctx.fill();
        if (fade === 1) {
          var dist = Math.hypot(px - cx0, py - cy0);
          if (dist < 220) near.push([px, py, dist]);
        }
      }

      // connector lines: nearest signals point at the detected gap
      near.sort(function (a, b) { return a[2] - b[2]; });
      for (var k = 0; k < Math.min(5, near.length); k++) {
        var n = near[k], al = (1 - n[2] / 220) * 0.2;
        ctx.beginPath(); ctx.moveTo(n[0], n[1]); ctx.lineTo(cx0, cy0);
        ctx.strokeStyle = 'rgba(59,91,219,' + al.toFixed(3) + ')';
        ctx.lineWidth = 1; ctx.stroke();
      }

      drawReticle(rgap, now);
      requestAnimationFrame(draw);
    }

    function drawReticle(r, now) {
      var len = 22, off = 0, pulse = 0.6 + 0.4 * Math.sin(now * 0.003);
      ctx.strokeStyle = 'rgba(' + BLUE + ',' + (0.85).toFixed(2) + ')';
      ctx.lineWidth = 2; ctx.lineCap = 'round';
      var corners = [
        [r.x, r.y, 1, 1], [r.x + r.w, r.y, -1, 1],
        [r.x, r.y + r.h, 1, -1], [r.x + r.w, r.y + r.h, -1, -1]
      ];
      corners.forEach(function (c) {
        ctx.beginPath();
        ctx.moveTo(c[0] + c[2] * off, c[1] + c[3] * (off + len));
        ctx.lineTo(c[0] + c[2] * off, c[1] + c[3] * off);
        ctx.lineTo(c[0] + c[2] * (off + len), c[1] + c[3] * off);
        ctx.stroke();
      });
      // soft fill + crosshair centre
      ctx.fillStyle = 'rgba(' + BLUE + ',0.05)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      var cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      ctx.beginPath(); ctx.arc(cx, cy, 3.2 * pulse + 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + BLUE + ',' + (0.9 * pulse).toFixed(2) + ')'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 14 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(' + BLUE + ',' + (0.25 * pulse).toFixed(2) + ')';
      ctx.lineWidth = 1; ctx.stroke();
      // label
      var label = 'GAP FOUND';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(' + BLUE + ',0.9)';
      ctx.fillText(label, r.x, r.y - 9);
    }

    function staticFrame() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        var fade = inRect(d.x, d.y, gap, -12) ? 0.06 : 1;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + (d.blue ? BLUE : INK) + ',' + ((d.blue ? 0.5 : 0.2) * fade) + ')';
        ctx.fill();
      }
      drawReticle(gap, 0);
    }

    resize();
    window.addEventListener('resize', function () {
      clearTimeout(canvas._rt); canvas._rt = setTimeout(resize, 180);
    });
    if (!reduce) {
      window.addEventListener('pointermove', function (ev) {
        var rect = canvas.getBoundingClientRect();
        if (rect.height) { tmx = (ev.clientX - rect.left) / rect.width; tmy = (ev.clientY - rect.top) / rect.height; }
      }, { passive: true });
    }
    if (reduce) staticFrame(); else requestAnimationFrame(draw);
  }

  /* ---- contact form (static site → composes an email) ---- */
  var form = document.getElementById('contactForm');
  if (form) {
    var ok = form.querySelector('.form-ok');
    var setInvalid = function (field, bad) { field.classList.toggle('invalid', bad); };
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var valid = true;
      form.querySelectorAll('[data-validate]').forEach(function (input) {
        var field = input.closest('.field');
        var v = (input.value || '').trim();
        var bad = !v;
        if (input.type === 'email' && v) bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        setInvalid(field, bad);
        if (bad) valid = false;
      });
      var agree = form.querySelector('#agree');
      if (agree && !agree.checked) { valid = false; agree.closest('.check').style.color = '#d63b53'; }
      else if (agree) { agree.closest('.check').style.color = ''; }
      if (!valid) return;

      var g = function (n) { var el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };
      var subject = '[Logify 문의] ' + (g('topic') || '일반 문의') + ' — ' + g('name');
      var body = [
        '이름: ' + g('name'),
        '회사/소속: ' + (g('company') || '-'),
        '이메일: ' + g('email'),
        '연락처: ' + (g('phone') || '-'),
        '문의 유형: ' + (g('topic') || '-'),
        '',
        g('message')
      ].join('\n');
      window.location.href = 'mailto:service@logify.co.kr?subject=' +
        encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      if (ok) { ok.classList.add('show'); ok.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); }
      form.reset();
    });
  }
})();
