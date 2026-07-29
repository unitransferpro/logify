/* ============================================================
   Logify — 단일 스크립트
   순서: 연도 스탬프 · 나브(스크롤 상태 + 모바일 시트) · 스크롤 리빌 ·
        히어로 하늘 캔버스(#skyfield) · 문의 폼 검증 + mailto 조립
   ES5 스타일, 빌드·의존성 없음.
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- 올해 연도 ---- */
  var years = document.querySelectorAll('[data-year]');
  for (var y = 0; y < years.length; y++) years[y].textContent = new Date().getFullYear();

  /* ---- 나브: 스크롤 상태 + 히어로 카피 페이드 ---- */
  var nav = document.querySelector('.nav');
  var heroCopy = document.querySelector('.skyhero .inner');
  if (nav || heroCopy) {
    var onScroll = function () {
      var sy = window.scrollY;
      if (nav) nav.classList.toggle('solid', sy > 40);
      if (heroCopy) {
        var k = Math.min(1, sy / (window.innerHeight * 0.5));
        heroCopy.style.opacity = String(1 - k);
        heroCopy.style.transform = 'translateY(' + (-k * 26).toFixed(1) + 'px)';
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---- 모바일 메뉴 ---- */
  var toggle = document.querySelector('.nav-toggle');
  var sheet = document.querySelector('.nav-sheet');
  if (toggle && sheet) {
    toggle.addEventListener('click', function () {
      var open = sheet.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    var links = sheet.querySelectorAll('a');
    for (var l = 0; l < links.length; l++) {
      links[l].addEventListener('click', function () {
        sheet.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    }
  }

  /* ---- 스크롤 리빌 ----
     화면에 들어온 요소를 켭니다. 관찰자(IntersectionObserver)나 rAF 에 의존하면
     탭이 비활성일 때 콜백이 오지 않아 본문이 영영 숨는 경우가 있어,
     스크롤마다 위치를 직접 재고 마지막에는 무조건 켜는 안전장치를 둡니다. */
  var rvs = [].slice.call(document.querySelectorAll('.rv'));
  if (rvs.length) {
    var revealAll = function () {
      for (var i = 0; i < rvs.length; i++) rvs[i].classList.add('in');
      rvs = [];
      window.removeEventListener('scroll', onReveal);
      window.removeEventListener('resize', onReveal);
    };
    var revealVisible = function () {
      var line = window.innerHeight * 0.92;
      for (var i = rvs.length - 1; i >= 0; i--) {
        if (rvs[i].getBoundingClientRect().top < line) {
          rvs[i].classList.add('in');
          rvs.splice(i, 1);
        }
      }
      if (!rvs.length) {
        window.removeEventListener('scroll', onReveal);
        window.removeEventListener('resize', onReveal);
      }
    };
    var last = 0;
    var onReveal = function () {
      var now = Date.now();
      if (now - last < 80) return;
      last = now;
      revealVisible();
    };

    if (reduce) {
      revealAll();
    } else {
      revealVisible();
      window.addEventListener('scroll', onReveal, { passive: true });
      window.addEventListener('resize', onReveal);
      window.addEventListener('load', revealVisible);
      /* 안전장치: 어떤 이유로든 못 켰으면 3초 뒤 전부 보이게 합니다 */
      setTimeout(function () { if (rvs.length) revealAll(); }, 3000);
    }
  }

  /* ============================================================
     히어로 — 하루의 빛
     해와 달이 하나의 타원 궤도에서 정반대 지점을 함께 돕니다.
     하늘색은 12개 시간대 사이를 오가고, 화면 아래쪽은 본문 패널
     색으로 녹아들어 히어로와 본문 사이 경계선을 없앱니다.
     ============================================================ */
  var sky = document.getElementById('skyfield');
  if (sky && sky.getContext) {
    var sctx = sky.getContext('2d');
    var sdpr = Math.min(window.devicePixelRatio || 1, 2);
    var SW = 0, SH = 0, sframe = 0, tod = 7.4;
    var DAY_SEC = 90;
    var GROUND = [11, 13, 19];

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

      var th = Math.PI * (tod - 6) / 12;
      // 넓은 화면은 오른쪽 여백을 도는 큰 궤도, 좁은 화면은 문장 위를 지나는 얕은 궤도
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
        var x = ((cl.x + sframe * cl.sp) % 1.25 - 0.12) * w, cyy = cl.y * h;
        var tint = mixc(pal.b, dusk > 0.25 ? CLOUD_DUSK : CLOUD_DAY, 0.55);
        var ccg = sctx.createRadialGradient(x, cyy, 0, x, cyy, cl.w * w);
        ccg.addColorStop(0, rgba(tint, cl.a * (0.5 + dusk * 0.9)));
        ccg.addColorStop(1, rgba(tint, 0));
        sctx.save();
        sctx.translate(x, cyy); sctx.scale(1, cl.h / cl.w); sctx.translate(-x, -cyy);
        sctx.fillStyle = ccg;
        sctx.beginPath(); sctx.arc(x, cyy, cl.w * w, 0, Math.PI * 2); sctx.fill();
        sctx.restore();
      }

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
    if (!reduce) requestAnimationFrame(skyLoop);
  }

  /* ---- 문의 폼 (서버가 없어 메일 앱을 띄웁니다) ---- */
  var form = document.getElementById('contactForm');
  if (form) {
    var ok = form.querySelector('.form-ok');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var valid = true;
      var required = form.querySelectorAll('[data-validate]');
      for (var i = 0; i < required.length; i++) {
        var input = required[i];
        var field = input.closest('.field');
        var v = (input.value || '').trim();
        var bad = !v;
        if (input.type === 'email' && v) bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        if (field) field.classList.toggle('invalid', bad);
        if (bad) valid = false;
      }
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
