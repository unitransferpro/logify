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
  /* 히어로 카피는 본문 패널이 덮어 올라오는 만큼 같이 사라집니다. */
  var nav = document.querySelector('.nav');
  var heroCopy = document.querySelector('.hero-sky .container');
  if (nav || heroCopy) {
    var onScroll = function () {
      var y = window.scrollY;
      if (nav) nav.classList.toggle('scrolled', y > 12);
      if (heroCopy) {
        var k = Math.min(1, y / (window.innerHeight * 0.5));
        heroCopy.style.opacity = String(1 - k);
        heroCopy.style.transform = 'translateY(' + (-k * 26).toFixed(1) + 'px)';
      }
    };
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
     HERO — 하루의 빛
     해와 달이 하나의 타원 궤도를 정반대 지점에서 함께 돕니다.
     하늘색은 12개 시간대 사이를 오가고, 화면 아래쪽은 다음 섹션
     배경색으로 녹아들어 히어로와 본문 사이 경계선을 없앱니다.
     ============================================================ */
  var sky = document.getElementById('skyfield');
  if (sky && sky.getContext) {
    var sctx = sky.getContext('2d');
    var sdpr = Math.min(window.devicePixelRatio || 1, 2);
    var SW = 0, SH = 0, sframe = 0, tod = 7.4;      // tod: 0~24 시각
    var DAY_SEC = 90;                                // 하루 한 바퀴에 걸리는 시간
    var GROUND = [11, 13, 19];                       // .page-body 위쪽이 얹히는 어두운 색

    var SKY_KEYS = [
      [0.0,  '#050813', '#080c1c', '#0d1428'],
      [4.2,  '#070c1c', '#101830', '#233052'],
      [5.6,  '#152040', '#3a3560', '#8a5568'],
      [6.6,  '#20406e', '#6a5a86', '#e0895e'],
      [8.0,  '#1d4f8c', '#4f86bd', '#c9c3ba'],
      [12.0, '#14559f', '#3f8ed2', '#a8d2ee'],
      [16.0, '#1a5395', '#4a86c4', '#c6d8e4'],
      [18.0, '#2b4a86', '#8a6a86', '#e8a05e'],
      [18.9, '#233a70', '#8a4f68', '#d9663f'],
      [20.0, '#101a3c', '#2e2a56', '#5a3552'],
      [21.5, '#070c1c', '#101830', '#1c2340'],
      [24.0, '#050813', '#080c1c', '#0d1428']
    ];
    function hx(c) {
      return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)];
    }
    function mixc(a, b, k) {
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    }
    function rgba(c, a) {
      return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')';
    }
    function smooth(k) { return k * k * (3 - 2 * k); }
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    for (var ki = 0; ki < SKY_KEYS.length; ki++) {
      SKY_KEYS[ki][4] = hx(SKY_KEYS[ki][1]);
      SKY_KEYS[ki][5] = hx(SKY_KEYS[ki][2]);
      SKY_KEYS[ki][6] = hx(SKY_KEYS[ki][3]);
    }
    function palette(t) {
      var i = 0;
      while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1][0] <= t) i++;
      var k = smooth((t - SKY_KEYS[i][0]) / (SKY_KEYS[i + 1][0] - SKY_KEYS[i][0]));
      return {
        a: mixc(SKY_KEYS[i][4], SKY_KEYS[i + 1][4], k),
        b: mixc(SKY_KEYS[i][5], SKY_KEYS[i + 1][5], k),
        c: mixc(SKY_KEYS[i][6], SKY_KEYS[i + 1][6], k)
      };
    }
    var SUN_LOW = hx('#ff9a4d'), SUN_HIGH = hx('#fff6dc');
    var HALO_LOW = hx('#ff7a33'), HALO_HIGH = hx('#ffe9b8');
    var WARM_AM = hx('#ffb26b'), WARM_PM = hx('#ff8a4a');
    var CLOUD_DAY = hx('#ffffff'), CLOUD_DUSK = hx('#ffd0a0');

    var stars = [], clouds = [], si;
    for (si = 0; si < 140; si++) {
      stars.push({ x: Math.random(), y: Math.random() * 0.62, r: Math.random() * 1.1 + 0.35,
                   ph: Math.random() * Math.PI * 2, sp: 0.6 + Math.random() * 1.6 });
    }
    for (si = 0; si < 5; si++) {
      clouds.push({ x: Math.random(), y: 0.14 + Math.random() * 0.34, w: 0.24 + Math.random() * 0.30,
                    h: 0.026 + Math.random() * 0.04, sp: 0.000045 + Math.random() * 0.00008,
                    a: 0.07 + Math.random() * 0.09 });
    }

    function skyResize() {
      SW = sky.clientWidth; SH = sky.clientHeight;
      sky.width = SW * sdpr; sky.height = SH * sdpr;
      sctx.setTransform(sdpr, 0, 0, sdpr, 0, 0);
      paintSky();
    }

    function paintSky() {
      var w = SW, h = SH, pal = palette(tod), i;
      var horizon = h * 0.86;

      var g = sctx.createLinearGradient(0, 0, 0, horizon);
      g.addColorStop(0, rgba(pal.a, 1));
      g.addColorStop(0.55, rgba(pal.b, 1));
      g.addColorStop(1, rgba(pal.c, 1));
      sctx.fillStyle = g; sctx.fillRect(0, 0, w, h);

      // 해와 달: 같은 궤도의 정반대 지점. 문장을 피해 오른쪽에 둡니다.
      var th = Math.PI * (tod - 6) / 12;
      // 넓은 화면: 오른쪽 여백을 도는 큰 궤도.
      // 좁은 화면: 문장 위쪽만 지나는 얕은 궤도 (글씨를 가리지 않게).
      var narrow = w < 760;
      var cx = w * (narrow ? 0.50 : 0.82);
      var rx = w * (narrow ? 0.36 : 0.16);
      var ry = h * (narrow ? 0.30 : 0.78);
      var cy = narrow ? h * 0.34 : horizon;
      var sunX = cx - Math.cos(th) * rx, sunY = cy - Math.sin(th) * ry, sunAlt = Math.sin(th);
      var moonX = cx + Math.cos(th) * rx, moonY = cy + Math.sin(th) * ry, moonAlt = -sunAlt;
      var night = clamp((-sunAlt - 0.06) * 3.0, 0, 1);
      var dusk = clamp(1 - Math.abs(sunAlt) * 3.4, 0, 1);

      if (night > 0.02) {
        for (i = 0; i < stars.length; i++) {
          var st = stars[i];
          var tw = 0.55 + 0.45 * Math.sin(sframe * 0.02 * st.sp + st.ph);
          sctx.beginPath();
          sctx.fillStyle = 'rgba(255,252,240,' + (night * tw * 0.85) + ')';
          sctx.arc(st.x * w, st.y * h, st.r, 0, Math.PI * 2); sctx.fill();
        }
      }

      if (moonAlt > 0.01) {
        var mA = clamp(moonAlt * 4.5, 0, 1);
        var low = 1 - clamp(moonAlt * 3.2, 0, 1);
        var mCore = mixc([255, 255, 250], [255, 214, 164], low * 0.85);
        var mRim = mixc([206, 216, 240], [242, 190, 142], low * 0.80);
        var solid = clamp(0.55 + 0.55 * mA, 0, 1);

        var mg = sctx.createRadialGradient(moonX, moonY, 14, moonX, moonY, 86);
        mg.addColorStop(0, rgba(mCore, 0.20 * mA));
        mg.addColorStop(0.34, rgba(mCore, 0.07 * mA));
        mg.addColorStop(1, rgba(mCore, 0));
        sctx.fillStyle = mg;
        sctx.beginPath(); sctx.arc(moonX, moonY, 86, 0, Math.PI * 2); sctx.fill();

        var md = sctx.createRadialGradient(moonX - 6, moonY - 7, 2, moonX, moonY, 22);
        md.addColorStop(0, rgba(mCore, solid));
        md.addColorStop(1, rgba(mRim, 0.94 * solid));
        sctx.fillStyle = md;
        sctx.beginPath(); sctx.arc(moonX, moonY, 22, 0, Math.PI * 2); sctx.fill();

        var crater = (1 - low) * solid * 0.34;
        if (crater > 0.02) {
          sctx.fillStyle = rgba([168, 180, 212], crater);
          sctx.beginPath(); sctx.arc(moonX - 6, moonY - 4, 4.6, 0, Math.PI * 2); sctx.fill();
          sctx.beginPath(); sctx.arc(moonX + 5, moonY + 5, 3.2, 0, Math.PI * 2); sctx.fill();
          sctx.beginPath(); sctx.arc(moonX + 2, moonY - 8, 2.4, 0, Math.PI * 2); sctx.fill();
        }
      }

      if (sunAlt > -0.10) {
        var sA = clamp((sunAlt + 0.10) * 5.0, 0, 1);
        var core = mixc(SUN_LOW, SUN_HIGH, clamp(sunAlt * 1.6, 0, 1));
        var halo = mixc(HALO_LOW, HALO_HIGH, clamp(sunAlt * 1.4, 0, 1));

        var hg = sctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 320);
        hg.addColorStop(0, rgba(halo, 0.40 * sA));
        hg.addColorStop(0.18, rgba(halo, 0.20 * sA));
        hg.addColorStop(0.45, rgba(halo, 0.07 * sA));
        hg.addColorStop(1, rgba(halo, 0));
        sctx.fillStyle = hg;
        sctx.beginPath(); sctx.arc(sunX, sunY, 320, 0, Math.PI * 2); sctx.fill();

        // 지평선에 가까울수록 살짝 눌린 모양 (대기 굴절)
        var squash = 1 - 0.22 * (1 - clamp(sunAlt * 4, 0, 1));
        sctx.save();
        sctx.translate(sunX, sunY); sctx.scale(1, squash); sctx.translate(-sunX, -sunY);
        var cg = sctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 26);
        cg.addColorStop(0, rgba(mixc(core, [255, 255, 255], 0.55), sA));
        cg.addColorStop(0.62, rgba(core, sA));
        cg.addColorStop(1, rgba(core, 0.82 * sA));
        sctx.fillStyle = cg;
        sctx.beginPath(); sctx.arc(sunX, sunY, 26, 0, Math.PI * 2); sctx.fill();
        sctx.restore();
      }

      if (dusk > 0.01) {
        var warm = tod < 12 ? WARM_AM : WARM_PM;
        var lg = sctx.createRadialGradient(sunX, horizon, 0, sunX, horizon, w * 0.62);
        lg.addColorStop(0, rgba(warm, 0.42 * dusk));
        lg.addColorStop(0.45, rgba(warm, 0.14 * dusk));
        lg.addColorStop(1, rgba(warm, 0));
        sctx.fillStyle = lg; sctx.fillRect(0, 0, w, h);
      }

      for (i = 0; i < clouds.length; i++) {
        var cl = clouds[i];
        var x = ((cl.x + sframe * cl.sp) % 1.25 - 0.12) * w, y = cl.y * h;
        var tint = mixc(pal.b, dusk > 0.25 ? CLOUD_DUSK : CLOUD_DAY, 0.55);
        var ccg = sctx.createRadialGradient(x, y, 0, x, y, cl.w * w);
        ccg.addColorStop(0, rgba(tint, cl.a * (0.5 + dusk * 0.9)));
        ccg.addColorStop(1, rgba(tint, 0));
        sctx.save();
        sctx.translate(x, y); sctx.scale(1, cl.h / cl.w); sctx.translate(-x, -y);
        sctx.fillStyle = ccg;
        sctx.beginPath(); sctx.arc(x, y, cl.w * w, 0, Math.PI * 2); sctx.fill();
        sctx.restore();
      }

      // 아래쪽은 본문 패널 색으로 녹아듭니다 (경계선 제거)
      var fg = sctx.createLinearGradient(0, horizon - h * 0.30, 0, h);
      fg.addColorStop(0, rgba(GROUND, 0));
      fg.addColorStop(0.42, rgba(GROUND, 0.30));
      fg.addColorStop(0.74, rgba(GROUND, 0.82));
      fg.addColorStop(1, rgba(GROUND, 1));
      sctx.fillStyle = fg;
      sctx.fillRect(0, horizon - h * 0.30, w, h - horizon + h * 0.30);
    }

    var skyVisible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        skyVisible = entries[0].isIntersecting;
      }).observe(sky);
    }
    function skyLoop() {
      if (skyVisible) {
        tod = (tod + 24 / (DAY_SEC * 60)) % 24;
        sframe++;
        paintSky();
      }
      requestAnimationFrame(skyLoop);
    }

    skyResize();
    window.addEventListener('resize', function () {
      clearTimeout(sky._rt); sky._rt = setTimeout(skyResize, 180);
    });
    if (!reduce) requestAnimationFrame(skyLoop);   // reduce 면 위에서 그린 한 장만 유지
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
