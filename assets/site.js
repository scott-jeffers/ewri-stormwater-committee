/* ASCE EWRI Stormwater Modeling Committee — site behaviour */
(function () {
  document.documentElement.classList.remove('no-js');

  /* ---------- Header: scrolled state + mobile menu ---------- */
  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.nav-toggle');
  var mobile = document.getElementById('mobile-nav');

  function onScroll() {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  function setMenu(open) {
    if (!mobile || !toggle) return;
    mobile.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    var use = toggle.querySelector('use');
    if (use) {
      var base = use.getAttribute('href').split('#')[0];
      use.setAttribute('href', base + (open ? '#i-x' : '#i-menu'));
    }
  }
  if (toggle) {
    toggle.addEventListener('click', function () { setMenu(!mobile.classList.contains('is-open')); });
    mobile.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Wave field (brand motif drawn from the committee mark) ---------- */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var uid = 0;

  function buildField(el) {
    var n = parseInt(el.getAttribute('data-lines') || '34', 10);
    var animate = el.hasAttribute('data-animate') && !reduce;
    var W = 1000, H = 1000, STEPS = 48;
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.style.width = '100%';
    svg.style.height = '100%';
    var id = 'wf-grad-' + (++uid);
    var defs = document.createElementNS(NS, 'defs');
    var g = document.createElementNS(NS, 'linearGradient');
    g.setAttribute('id', id); g.setAttribute('gradientUnits', 'userSpaceOnUse');
    g.setAttribute('x1', '0'); g.setAttribute('y1', '0'); g.setAttribute('x2', String(W)); g.setAttribute('y2', '0');
    [['0', '#0a91bd'], ['0.45', '#00aadb'], ['0.75', '#2bb3a0'], ['1', '#5dba7d']].forEach(function (s) {
      var st = document.createElementNS(NS, 'stop'); st.setAttribute('offset', s[0]); st.setAttribute('stop-color', s[1]); g.appendChild(st);
    });
    defs.appendChild(g); svg.appendChild(defs);

    var paths = [];
    for (var i = 0; i < n; i++) {
      var p = document.createElementNS(NS, 'path');
      var t = i / (n - 1);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', 'url(#' + id + ')');
      p.setAttribute('stroke-width', (11 - 8.5 * t).toFixed(2));
      p.setAttribute('stroke-linecap', 'butt');
      svg.appendChild(p);
      paths.push(p);
    }

    function draw(time) {
      var phase = time * 0.00018;
      var center = 500 + Math.sin(phase) * 70;
      var sigma = 230 + Math.sin(phase * 0.7 + 1) * 30;
      for (var i = 0; i < n; i++) {
        var t = i / (n - 1);
        var x0 = 20 + t * (W - 40);
        // bulge strongest toward the middle-right columns, like the mark
        var amp = 95 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * (0.85 + 0.15 * Math.sin(phase * 1.3 + t * 3));
        var d = '';
        for (var s = 0; s <= STEPS; s++) {
          var y = -20 + (s / STEPS) * (H + 40);
          var g1 = Math.exp(-Math.pow((y - center) / sigma, 2));
          var ripple = Math.sin(y / 140 + phase * 2 + t * 2) * 6 * t;
          var x = x0 + amp * g1 + ripple;
          d += (s === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
        }
        paths[i].setAttribute('d', d);
      }
    }
    draw(0);
    el.appendChild(svg);

    if (animate) {
      var running = false, last = 0, raf = null;
      function loop(ts) {
        if (!running) return;
        if (ts - last > 33) { draw(ts); last = ts; }
        raf = requestAnimationFrame(loop);
      }
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            if (e.isIntersecting && !running) { running = true; raf = requestAnimationFrame(loop); }
            else if (!e.isIntersecting && running) { running = false; cancelAnimationFrame(raf); }
          });
        }).observe(el);
      }
    }
  }
  document.querySelectorAll('.wave-field').forEach(buildField);
})();
