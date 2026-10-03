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
    // 본문(.page-body)이 하늘을 다 덮으면 그리지 않습니다. 히어로가 화면 위에 붙어 있어서(sticky) 위 관찰자는
    // 가려진 하늘도 '보인다'고 하고, 그대로면 홈을 끝까지 스크롤하는 내내 안 보이는 하늘을 화면 크기로 다시
    // 그립니다. 그래픽이 약한 폰(카톡 같은 인앱 브라우저)에서는 이게 스크롤 끊김의 거의 전부였습니다
    // (2026-10-03, CPU 4배 느리게 + 소프트웨어 그리기로 측정: 본문이 덮은 구간 늦은 프레임 63% -> 0%. 유리 효과·오로라는 차이 없음).
    var cover = document.querySelector('.page-body'), coverAt = Infinity;
    function measureCover() {
      // 본문 윗변이 화면 위로 둥근 모서리(34px)보다 더 올라가야 양쪽 모서리 틈까지 다 가려집니다
      coverAt = cover ? cover.getBoundingClientRect().top + window.scrollY + 40 : Infinity;
    }
    // 스크롤하는 동안에도 기본은 계속 그립니다(해가 멈추지 않게). 다만 이 기기가 스크롤하면서 하늘까지 그리느라
    // 프레임을 놓친다는 게 보이면(놓친 프레임이 30% 를 넘게 이어지면) 그때부터는 스크롤하는 동안만 멈추고, 손을 떼고
    // 0.15초 뒤 이어 그립니다. 시각(tod)은 그릴 때만 흐르므로 멈췄다 이어 그려도 해가 튀지 않습니다.
    var lastScroll = 0, prevT = 0, paintedPrev = false, lateRate = 0, pauseOnScroll = false, lastPaintT = 0;
    window.addEventListener('scroll', function () { lastScroll = Date.now(); }, { passive: true });
    function skyLoop(t) {
      var scrolling = Date.now() - lastScroll < 150;
      // 하늘을 그린 프레임 다음에만 잽니다. 본문이 덮은 동안 늦는 프레임은 하늘 탓이 아닙니다.
      if (scrolling && paintedPrev && prevT && !pauseOnScroll) {
        lateRate = lateRate * 0.9 + (t - prevT > 24 ? 0.1 : 0);
        if (lateRate > 0.3) pauseOnScroll = true;
      }
      prevT = t;
      paintedPrev = skyVisible && window.scrollY < coverAt && !(scrolling && pauseOnScroll);
      if (paintedPrev) {
        // 화면 주사율과 상관없이 90초에 하루가 가도록 실제 흐른 시간으로 셉니다. 프레임 수로 세던 때는
        // 120Hz 폰에서 해·별·구름이 두 배 빨랐고 느린 기기에서는 느렸습니다. 멈췄다 이어 그릴 땐 한 번에
        // 0.1초까지만 흘려서(해가 0.4도, 1~2px) 해가 튀지 않습니다. 초당 10프레임 이상이면 제 속도로 돕니다.
        var dt = lastPaintT ? Math.min((t - lastPaintT) / 1000, 0.1) : 1 / 60;
        lastPaintT = t;
        tod = (tod + 24 / DAY_SEC * dt) % 24;
        sframe += dt * 60;   // 별 반짝임·구름 흐름은 60fps 한 프레임 단위로 맞춰 둔 값이라 같은 단위로 셉니다
        paintSky();
      }
      requestAnimationFrame(skyLoop);
    }

    skyResize(); measureCover();
    window.addEventListener('load', measureCover);   // 글꼴·그림이 늦게 떠 히어로 높이가 바뀌어도 맞게
    window.addEventListener('resize', function () {
      clearTimeout(sky._rt); sky._rt = setTimeout(function () { skyResize(); measureCover(); }, 180);
    });
    if (!reduce) requestAnimationFrame(skyLoop);   // reduce 면 위에서 그린 한 장만 유지
  }

  /* ---- 홈 띠: 로고 애니메이션이 먼저, 로고가 완성되면 문구로 (홈에만 둡니다) ---- */
  /* 로고 인트로 — 원래 영상(logo-reveal.mp4)을 SVG 로 다시 그립니다.
     영상은 색이 그림 안에 박혀 있어 삼성인터넷 다크모드에서 띠와 색이 어긋나고, 카톡 같은
     안드로이드 WebView 는 재생 전 순간에 기본 재생 버튼 그림을 띄웠습니다. 브라우저가 직접
     그리면 둘 다 생기지 않습니다. 좌표는 영상과 같은 960x540 이고, 글자는 사이트 로고와 같은
     Poppins 800 글리프를 도형으로 옮겨서 웹폰트가 늦게 떠도 모양이 틀어지지 않습니다.
     아래 숫자는 전부 원래 영상을 프레임 단위로 재서 얻은 값입니다(초 단위). */
  var LOGO_INTRO = {
    duration: 3.6,
    glyphs: [
        'M256.6 309H295.3V335.5H222V211.1H256.6Z',
        'M299.2 285.9Q299.2 270.5 306 259.1Q312.8 247.6 324.5 241.4Q336.3 235.2 351.1 235.2Q365.9 235.2 377.7 241.4Q389.4 247.6 396.2 259.1Q403 270.5 403 285.9Q403 301.3 396.2 312.8Q389.4 324.4 377.6 330.6Q365.7 336.7 350.9 336.7Q336.1 336.7 324.4 330.6Q312.6 324.4 305.9 312.9Q299.2 301.4 299.2 285.9ZM367.9 285.9Q367.9 275.8 363 270.5Q358.2 265.3 351.1 265.3Q344 265.3 339.3 270.5Q334.5 275.8 334.5 285.9Q334.5 296.1 339.1 301.4Q343.7 306.7 350.9 306.7Q358.2 306.7 363 301.3Q367.9 296 367.9 285.9Z',
        'M479 250.3V236.5H513.5V334.4Q513.5 348.4 508.3 359.6Q503 370.8 491.7 377.5Q480.5 384.2 463.4 384.2Q440.5 384.2 426.7 373.4Q412.9 362.7 411 344.1H445.1Q446.1 348.9 450.4 351.6Q454.6 354.2 461.3 354.2Q479 354.2 479 334.4V321.7Q474.9 328.6 467.4 332.7Q459.9 336.7 449.8 336.7Q438 336.7 428.4 330.6Q418.8 324.4 413.2 312.8Q407.6 301.3 407.6 285.9Q407.6 270.5 413.2 259.1Q418.8 247.6 428.4 241.4Q438 235.2 449.8 235.2Q459.9 235.2 467.4 239.3Q474.9 243.4 479 250.3ZM460.9 265.4Q453.2 265.4 448.1 270.8Q442.9 276.2 442.9 285.9Q442.9 295.4 448.1 301Q453.2 306.6 460.9 306.6Q468.5 306.6 473.7 301.1Q479 295.6 479 285.9Q479 276.4 473.7 270.9Q468.5 265.4 460.9 265.4Z',
        'M564.1 236.5V335.5H529.5V236.5Z',
        'M633.5 265.3H618V335.5H583.2V265.3H572.5V236.5H583.2V235.6Q583.2 216.5 594.4 206.4Q605.6 196.2 626.6 196.2Q630.9 196.2 633.2 196.4V225.9Q631.8 225.7 629.3 225.7Q623.6 225.7 621 228.3Q618.3 230.8 618 236.5H633.5Z',
        'M748.7 236.5 685.8 382.6H648.3L671.9 331.3L631.3 236.5H669.8L690.6 292.6L710.7 236.5Z'
    ],
    dot: 'M526.7 209.7Q526.7 201.9 532.2 196.8Q537.8 191.7 547 191.7Q556 191.7 561.5 196.8Q567.1 201.9 567.1 209.7Q567.1 217.2 561.5 222.3Q556 227.3 547 227.3Q537.8 227.3 532.2 222.3Q526.7 217.2 526.7 209.7Z',
    dotC: [546.88, 209.48],
    white: [238, 241, 247], blue: [108, 134, 239], gray: [150, 151, 157]
  };

  /* 측정점 사이를 넘치지 않는 곡선으로 잇습니다(단조 3차 보간). 양 끝 밖은 끝값을 유지합니다. */
  function monoCurve(pts) {
    var n = pts.length, xs = [], ys = [], d = [], m = [], i;
    for (i = 0; i < n; i++) { xs[i] = pts[i][0]; ys[i] = pts[i][1]; }
    for (i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      var a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { var k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
    }
    return function (x) {
      if (x <= xs[0]) return ys[0];
      if (x >= xs[n - 1]) return ys[n - 1];
      var j = 0; while (x > xs[j + 1]) j++;
      var h = xs[j + 1] - xs[j], t = (x - xs[j]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[j] + (t3 - 2 * t2 + t) * h * m[j] +
        (-2 * t3 + 3 * t2) * ys[j + 1] + (t3 - t2) * h * m[j + 1];
    };
  }

  function buildLogoIntro() {
    var NS = 'http://www.w3.org/2000/svg', L = LOGO_INTRO;
    var el = function (tag, attrs, parent) {
      var e = document.createElementNS(NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(e);
      return e;
    };
    var svg = el('svg', { 'class': 'cta-logo', viewBox: '0 0 960 540', preserveAspectRatio: 'xMidYMid meet',
      'aria-hidden': 'true', focusable: 'false' });
    // 글자는 y=392 선 아래가 가려진 채로 솟아오릅니다. id 는 페이지마다 하나라 겹치지 않습니다.
    var cid = 'logoRise' + Math.random().toString(36).slice(2, 7);
    el('rect', { width: 960, height: 392 }, el('clipPath', { id: cid }, el('defs', {}, svg)));
    var word = el('g', { 'clip-path': 'url(#' + cid + ')' }, svg);
    var chars = [];
    for (var i = 0; i < L.glyphs.length; i++) chars.push(el('path', { d: L.glyphs[i], fill: 'rgb(' + L.white + ')' }, word));
    var sel = el('rect', { fill: 'none', stroke: 'rgb(' + L.gray + ')', 'stroke-width': 2.5,
      'stroke-dasharray': '7 5', 'stroke-dashoffset': 6.5, rx: 8, opacity: 0 }, svg);
    var sq = el('rect', { fill: 'none', 'stroke-width': 3, rx: 10, opacity: 0 }, svg);
    var ring = el('circle', { cx: 545.5, cy: 209.5, r: 0, fill: 'none', stroke: 'rgb(' + L.blue + ')',
      'stroke-width': 3, opacity: 0 }, svg);
    var dot = el('path', { d: L.dot, fill: 'rgb(' + L.blue + ')', opacity: 0 }, svg);

    // 글자 하나가 솟는 곡선(영상의 L 을 잰 값). 여섯 글자 모두 같은 곡선을 0.055초씩 늦게 따라갑니다.
    var rise = monoCurve([[0, 232], [0.04, 179], [0.08, 135], [0.12, 99], [0.16, 69], [0.20, 46],
      [0.24, 27], [0.28, 14], [0.32, 4], [0.36, -2], [0.40, -5], [0.44, -6], [0.48, -6], [0.52, -4],
      [0.56, -3], [0.60, -1], [0.64, 0]]);
    // 점이 i 에 닿는 순간 단어가 살짝 눌렸다 돌아옵니다(px, 글자마다 폭이 조금 다름)
    var dip = monoCurve([[2.26, 0], [2.28, 1], [2.32, 0.7], [2.36, 0.25], [2.40, 0]]);
    var dipAmp = [2, 2, 2.5, 3, 3, 3];
    // 점선 상자: o 를 감싼 뒤 i 위로 대각선 이동하며 줄어듭니다(진행도 0~1)
    var selPop = monoCurve([[1.18, 139], [1.20, 137], [1.24, 134], [1.28, 133]]);
    var selMove = monoCurve([[1.47, 0], [1.52, 0.036], [1.56, 0.144], [1.60, 0.40], [1.64, 0.746], [1.68, 0.921],
      [1.72, 0.982], [1.76, 0.997], [1.79, 1]]);
    var sqOp = monoCurve([[1.80, 0], [1.82, 1], [1.93, 1], [1.96, 0.89], [2.00, 0.67], [2.04, 0.34], [2.08, 0]]);
    // 점: 사각형 안에서 차오른 뒤 떨어져 i 에 닿으며 찌그러졌다가 튕겨 자리잡습니다
    var dotPop = monoCurve([[1.945, 0], [1.96, 0.3], [2.00, 0.925], [2.04, 1.05], [2.08, 1]]);
    var dotY = monoCurve([[2.08, -109], [2.12, -105], [2.16, -91], [2.20, -64], [2.24, -24.5],
      [2.28, 7], [2.32, 7.5], [2.36, -7], [2.42, 0]]);
    var dotSX = monoCurve([[2.08, 1], [2.20, 0.975], [2.24, 0.9], [2.28, 1.2], [2.32, 1.325], [2.36, 1.125], [2.42, 1]]);
    var dotSY = monoCurve([[2.08, 1], [2.20, 1], [2.24, 1.083], [2.28, 0.78], [2.32, 0.64], [2.36, 0.833], [2.42, 1]]);
    // 파동: 점이 자리잡을 곳을 중심으로 퍼지며 사라집니다
    var ringR = monoCurve([[2.26, 18], [2.28, 35.5], [2.32, 63.5], [2.36, 85.5], [2.40, 103.5], [2.44, 116.5],
      [2.48, 126.5], [2.52, 132.5], [2.56, 137.5], [2.60, 139.5], [2.64, 140.5], [2.68, 141]]);
    var ringA = monoCurve([[2.26, 0], [2.265, 0.34], [2.28, 0.33], [2.32, 0.32], [2.36, 0.27], [2.40, 0.26],
      [2.44, 0.22], [2.48, 0.16], [2.52, 0.15], [2.56, 0.11], [2.60, 0.08], [2.64, 0.03], [2.68, 0]]);

    var mix = function (a, b, p) {
      return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * p) + ',' + Math.round(a[1] + (b[1] - a[1]) * p) + ',' +
        Math.round(a[2] + (b[2] - a[2]) * p) + ')';
    };
    var smooth = function (p) { p = p < 0 ? 0 : p > 1 ? 1 : p; return p * p * (3 - 2 * p); };
    var box = function (r, cx, cy, size, sw) {       // size 는 선 두께까지 포함한 바깥 크기(영상에서 잰 값)
      var s = size - sw;
      r.setAttribute('x', (cx - s / 2).toFixed(2)); r.setAttribute('y', (cy - s / 2).toFixed(2));
      r.setAttribute('width', s.toFixed(2)); r.setAttribute('height', s.toFixed(2));
    };

    function render(t) {
      var i, p;
      var dp = dip(t);
      for (i = 0; i < chars.length; i++) chars[i].setAttribute('transform', 'translate(0 ' + (rise(t - (0.04 + 0.055 * i)) + dp * dipAmp[i]).toFixed(2) + ')');
      for (i = 0; i < 3; i++) chars[3 + i].setAttribute('fill', mix(L.white, L.blue, smooth((t - (2.26 + 0.0725 * i)) / 0.15)));

      if (t < 1.18 || t >= 1.835) sel.setAttribute('opacity', 0);
      else {
        p = selMove(t);
        sel.setAttribute('opacity', t < 1.815 ? 1 : 1 - (t - 1.815) / 0.02);
        box(sel, 351 + (546 - 351) * p, 288 + (100.5 - 288) * p, t < 1.47 ? selPop(t) : 133 + (62 - 133) * p, 2.5);
      }
      p = sqOp(t);
      sq.setAttribute('opacity', p.toFixed(3));
      if (p > 0) {
        box(sq, 545.5, 100.5, t < 1.845 ? 58 - Math.max(0, t - 1.815) / 0.03 * 6 : 52, 3);
        sq.setAttribute('stroke', mix(L.gray, L.blue, 0.8 * smooth((t - 1.815) / 0.06)));
      }
      if (t < 1.945) dot.setAttribute('opacity', 0);
      else {
        var c = L.dotC, s = t < 2.08 ? dotPop(t) : 1, sx = t < 2.08 ? s : dotSX(t), sy = t < 2.08 ? s : dotSY(t);
        var y = t < 2.08 ? -109 : dotY(t);
        dot.setAttribute('opacity', 1);
        dot.setAttribute('transform', 'translate(' + c[0] + ' ' + (c[1] + y).toFixed(2) + ') scale(' +
          sx.toFixed(3) + ' ' + sy.toFixed(3) + ') translate(' + (-c[0]) + ' ' + (-c[1]) + ')');
      }
      p = ringA(t);
      ring.setAttribute('opacity', p.toFixed(3));
      if (p > 0) ring.setAttribute('r', ringR(t).toFixed(2));
    }
    render(0);
    return { svg: svg, render: render, duration: L.duration };
  }

  document.querySelectorAll('.cta-band[data-intro]').forEach(function (band) {
    // 움직임 줄이기거나 관찰자가 없으면 인트로 없이 문구만 둡니다(CSS 는 .intro 가 있을 때만 문구를 숨깁니다)
    if (reduce || !('IntersectionObserver' in window) || !window.requestAnimationFrame) return;
    var intro = buildLogoIntro();
    // 첫 자식으로 넣어서, 문구에 걸린 nth-child 지연(3~5번째)이 그대로 맞습니다
    band.insertBefore(intro.svg, band.firstChild);
    // 인트로가 곧 등장 연출이라 스크롤 페이드(.rv)는 건너뜁니다. 반쯤 투명한 띠 위에서 로고가 움직이면 회색으로 보입니다.
    band.classList.add('intro'); band.classList.add('in');
    var over = false;
    var finish = function () { if (!over) { over = true; band.classList.add('done'); } };
    var bio = new IntersectionObserver(function (es) {
      var e = es[es.length - 1];
      // 띠가 60% 이상 보이면 시작합니다. 띠가 화면보다 훨씬 커서(글자 확대, 가로로 눕힌 작은 폰)
      // 60% 가 보일 수 없을 땐 화면의 60% 를 채우면 시작합니다. 안 그러면 문구가 끝까지 숨어 있습니다.
      if (!e.isIntersecting || (e.intersectionRatio < 0.6 && e.intersectionRect.height < window.innerHeight * 0.6)) return;
      bio.disconnect();
      // 원래 영상과 같은 속도(3.6초)로 끝까지 그립니다. 완성된 로고로 0.9초 머문 뒤 문구로 넘어갑니다.
      // (1.5배로 틀었을 땐 한 동작이 0.2초라 사이트의 다른 등장 0.7~0.9초보다 급해 보였습니다)
      band.classList.add('playing');
      var t0 = null;
      // 그리기가 아예 시작되지 않으면(백그라운드 탭 등) 문구가 숨은 채 남지 않게 6.5초 뒤 보여 줍니다.
      // 그리기가 시작되면 이 타이머는 끄고, 끝까지 그린 뒤 직접 넘어갑니다. 켜 두면 늦게 시작한
      // 애니메이션을 중간에 끊습니다(백그라운드 탭에서 5초 뒤 돌아오면 3.6초 중 1.5초에서 잘렸습니다).
      var guard = setTimeout(finish, 6500);
      var step = function (now) {
        if (over) return;
        if (t0 === null) { t0 = now; clearTimeout(guard); }
        var t = (now - t0) / 1000;
        intro.render(t < intro.duration ? t : intro.duration);
        if (t < intro.duration) requestAnimationFrame(step); else finish();
      };
      requestAnimationFrame(step);
    }, { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] });
    bio.observe(band);
  });

  /* ---- contact form (static site → composes an email) ---- */
  var form = document.getElementById('contactForm');
  if (form) {
    var ok = form.querySelector('.form-ok');
    var appSel = form.querySelector('#app');
    var setInvalid = function (field, bad) { field.classList.toggle('invalid', bad); };

    /* 고객지원에서 앱을 고르고 오면(contact.html?app=...) 그 앱으로 폼을 맞춰 둡니다.
       앱 이름을 여기 적어두지 않고 select 의 option 을 훑습니다. 앱이 늘거나 빠져도
       HTML 만 고치면 되고, 이 코드는 그대로 둡니다. */
    var want = (location.search.match(/[?&]app=([^&]*)/) || [])[1];
    if (appSel && want) {
      want = decodeURIComponent(want).toLowerCase();
      for (var oi = 0; oi < appSel.options.length; oi++) {
        if (appSel.options[oi].value.toLowerCase() === want && want) {
          appSel.selectedIndex = oi;
          var tp = form.querySelector('#topic');
          if (tp) tp.value = '서비스 문의';
          // 히어로가 제휴 이야기라 그냥 두면 잘못 온 줄 압니다. 폼까지 내려 줍니다.
          setTimeout(function () {
            form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
          }, 80);
          break;
        }
      }
    }
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
      var appName = (appSel && appSel.value) ? appSel.options[appSel.selectedIndex].text : '';
      var subject = '[Logify 문의] ' + (appName ? appName + ' · ' : '') +
        (g('topic') || '일반 문의') + ' — ' + g('name');
      var body = [
        '이름: ' + g('name'),
        '회사/소속: ' + (g('company') || '-'),
        '이메일: ' + g('email'),
        '연락처: ' + (g('phone') || '-'),
        '문의 유형: ' + (g('topic') || '-'),
        '문의할 앱: ' + (appName || '-'),
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
