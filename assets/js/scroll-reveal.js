/**
 * Scroll-reveal animation (ekft.vercel.app style).
 * Plain vanilla JS — no build step, no dependencies.
 *
 * Десктопная страница:
 *   <script src="./assets/js/scroll-reveal.js" defer></script>
 * Мобильная — тем же файлом, но с профилем:
 *   <script src="./assets/js/scroll-reveal.js" data-rv-profile="mobile" defer></script>
 *
 * Страницы рендерятся dc-рантаймом (React) и перерисовываются при смене
 * раздела, поэтому ниже стоит MutationObserver: он до-размечает узлы,
 * появившиеся после первого рендера. Вручную то же самое —
 * window.refreshScrollReveal().
 */
(function () {
  const EASE = 'cubic-bezier(0.16,1,0.3,1)';

  // У страниц разная структура секций и разный вкус анимации: на мобиле ход
  // короче и быстрее, зум картинок выключен (на узком экране он только мылит).
  const PROFILES = {
    desktop: {
      // `main > div` — обёртки подстраниц, `section > div` — обёртки секций
      // главной и CTA-полосы, `footer > div` — колонки подвала. Шапка
      // (`header > div`) намеренно не анимируется: она sticky.
      groups: 'main > div, section > div, footer > div',
      shift: 26, dur: 0.8, stagger: 70, staggerMax: 5,
      maskDur: 0.95, showAt: 0.92, imgZoom: true
    },
    mobile: {
      // Секции на мобильной странице обёрнуты иначе, подвал анимируется целиком.
      groups: 'main > section > div, main > div, main > section, footer, section > div',
      shift: 20, dur: 0.7, stagger: 60, staggerMax: 4,
      maskDur: 0.9, showAt: 0.94, imgZoom: false
    }
  };

  const tag = document.currentScript
    || document.querySelector('script[src*="scroll-reveal"]');
  const P = PROFILES[tag && tag.dataset.rvProfile] || PROFILES.desktop;

  let sweep, onScroll, ticker, raf, observer, pending;

  // Скрытое состояние = сдвиг вниз поверх собственного transform элемента.
  // translateY идёт первым, чтобы сдвиг был строго вертикальным, а не вдоль
  // повёрнутых осей.
  const hidden = el => `translateY(${P.shift}px) ${el.dataset.rvT || ''}`.trim();

  function setup() {
    const root = document.body;

    root.querySelectorAll(P.groups).forEach(g => {
      Array.from(g.children).forEach(el => {
        if (el.dataset.rv) return;
        if (el.getBoundingClientRect().height < 8) return;
        // Запоминаем собственные transform/opacity элемента: у декоративных
        // иконок-инструментов это `rotate(...)` и `opacity:0.22`, и если их
        // затереть, после появления иконка встанет прямо и непрозрачной.
        el.dataset.rvT = el.style.transform || '';
        el.dataset.rvO = el.style.opacity || '';
        el.dataset.rv = '1';
        el.style.transition = `opacity ${P.dur}s ${EASE}, transform ${P.dur}s ${EASE}`;
        el.style.opacity = '0';
        el.style.transform = hidden(el);
        if (!P.imgZoom) return;
        el.querySelectorAll('img').forEach(im => {
          if (im.style.transform) return; // у картинки свой transform — не трогаем
          im.dataset.rvZoom = '1';
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
      h.style.transition = `clip-path ${P.maskDur}s ${EASE}, transform ${P.maskDur}s ${EASE}`;
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
      const i = Math.min(Math.max(sibs.indexOf(el), 0), P.staggerMax);
      el.style.transitionDelay = (i * P.stagger) + 'ms';
      el.style.opacity = el.dataset.rvO || '1';
      el.style.transform = el.dataset.rvT || 'none';
      el.querySelectorAll('img[data-rv-zoom]').forEach(im => { im.style.transform = 'scale(1)'; });
      el.querySelectorAll('h1, h2').forEach((h, n) => setTimeout(() => showHeading(h), 110 + n * 90));
      if (el.matches('h1, h2')) setTimeout(() => showHeading(el), 110);
    };
    const hide = el => {
      delete el.dataset.rvDone;
      el.style.transitionDelay = '0ms';
      el.style.opacity = '0';
      el.style.transform = hidden(el);
      el.querySelectorAll('img[data-rv-zoom]').forEach(im => { im.style.transform = 'scale(1.06)'; });
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
      const showLine = atEnd ? Infinity : vh * P.showAt;
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
