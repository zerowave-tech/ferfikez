/**
 * Scroll-reveal animation (ekft.vercel.app style).
 * Plain vanilla JS — no build step, no dependencies.
 * Include with: <script src="./assets/js/scroll-reveal.js" defer></script>
 *
 * Страница рендерится dc-рантаймом (React) и перерисовывается при смене
 * раздела, поэтому ниже стоит MutationObserver: он до-размечает узлы,
 * появившиеся после первого рендера. Вручную то же самое —
 * window.refreshScrollReveal().
 */
(function () {
  const EASE = 'cubic-bezier(0.16,1,0.3,1)';
  let sweep, onScroll, ticker, raf, observer, pending;

  function setup() {
    const root = document.body;

    // Контейнеры страницы: `main > div` — обёртки подстраниц, `section > div` —
    // обёртки секций главной и CTA-полосы, `footer > div` — колонки подвала.
    // Шапка (`header > div`) намеренно не анимируется: она sticky.
    root.querySelectorAll('main > div, section > div, footer > div')
      .forEach(g => {
        Array.from(g.children).forEach(el => {
          if (el.dataset.rv) return;
          if (el.getBoundingClientRect().height < 8) return;
          el.dataset.rv = '1';
          el.style.transition = `opacity 0.8s ${EASE}, transform 0.8s ${EASE}`;
          el.style.opacity = '0';
          el.style.transform = 'translateY(26px)';
          el.querySelectorAll('img').forEach(im => {
            im.style.transition = `transform 1.2s ${EASE}`;
            im.style.transform = 'scale(1.06)';
          });
        });
      });

    // Headings get a clip-path mask reveal (line slides up out of a clipped box).
    root.querySelectorAll('h1, h2').forEach(h => {
      if (h.dataset.rvMask) return;
      h.dataset.rvMask = '1';
      h.style.display = 'block';
      h.style.clipPath = 'inset(0 0 100% 0)';
      h.style.transform = 'translateY(0.3em)';
      h.style.transition = `clip-path 0.95s ${EASE}, transform 0.95s ${EASE}`;
    });

    if (sweep) { sweep(); return; } // listeners/ticker already wired, just needed to tag new nodes

    const showHeading = h => {
      if (h.dataset.rvMaskDone) return;
      h.dataset.rvMaskDone = '1';
      h.style.clipPath = 'inset(0 0 -12% 0)';
      h.style.transform = 'none';
    };
    const show = el => {
      if (el.dataset.rvDone) return;
      el.dataset.rvDone = '1';
      const sibs = Array.from(el.parentElement.children).filter(c => c.dataset.rv);
      const i = Math.min(Math.max(sibs.indexOf(el), 0), 5);
      el.style.transitionDelay = (i * 70) + 'ms';
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.querySelectorAll('img').forEach(im => { im.style.transform = 'scale(1)'; });
      el.querySelectorAll('h1, h2').forEach((h, n) => setTimeout(() => showHeading(h), 110 + n * 90));
      if (el.matches('h1, h2')) setTimeout(() => showHeading(el), 110);
    };
    const hide = el => {
      delete el.dataset.rvDone;
      el.style.transitionDelay = '0ms';
      el.style.opacity = '0';
      el.style.transform = 'translateY(26px)';
      el.querySelectorAll('img').forEach(im => { im.style.transform = 'scale(1.06)'; });
    };
    const hideHeading = h => {
      delete h.dataset.rvMaskDone;
      h.style.clipPath = 'inset(0 0 100% 0)';
      h.style.transform = 'translateY(0.3em)';
    };

    sweep = () => {
      const vh = window.innerHeight;
      const doc = document.documentElement;
      const atEnd = window.scrollY + vh >= (doc.scrollHeight || 0) - 2;
      const showLine = atEnd ? Infinity : vh * 0.92;
      const hideLine = atEnd ? Infinity : vh * 1.15;
      document.querySelectorAll('[data-rv]').forEach(el => {
        const r = el.getBoundingClientRect();
        const done = el.dataset.rvDone;
        if (!done && r.top < showLine) show(el);
        else if (done && r.top > hideLine) hide(el);
      });
      document.querySelectorAll('h1, h2').forEach(h => {
        const r = h.getBoundingClientRect();
        const done = h.dataset.rvMaskDone;
        if (!done && r.top < showLine) showHeading(h);
        else if (done && r.top > hideLine) hideHeading(h);
      });
    };

    onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = null; sweep(); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // Тикер гоняет именно setup (разметка + проход), а не один sweep: React
    // может заменить узлы в момент, когда наблюдатель уже отработал.
    ticker = setInterval(setup, 500);
    requestAnimationFrame(sweep);
    setTimeout(sweep, 300);

    // Перерисовки dc-рантайма (смена раздела, вкладки услуг, фильтры блога)
    // добавляют новые узлы — их надо разметить сразу, не дожидаясь тикера.
    // Следим только за childList: собственные правки скрипта — это style и
    // data-атрибуты, они наблюдатель не будят, так что зацикливания нет.
    // Дебаунс на setTimeout, а не на rAF: в фоновой вкладке rAF не тикает.
    if (!observer) {
      observer = new MutationObserver(() => {
        if (pending) return;
        pending = setTimeout(() => { pending = null; setup(); }, 50);
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  window.refreshScrollReveal = setup; // call after injecting new DOM content

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
