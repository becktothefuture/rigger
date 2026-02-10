const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

if (!prefersReduced.matches) {
  const items = Array.from(document.querySelectorAll("[data-parallax]")).map(
    (el) => ({
      el,
      speed: parseFloat(el.dataset.parallax || "0.06"),
      base: 0,
    })
  );

  const measure = () => {
    items.forEach((item) => {
      const rect = item.el.getBoundingClientRect();
      item.base = rect.top + window.scrollY;
    });
  };

  let ticking = false;

  const update = () => {
    const scrollY = window.scrollY;
    const viewport = window.innerHeight;

    items.forEach((item) => {
      const offset = (scrollY + viewport * 0.35 - item.base) * item.speed;
      item.el.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
    });

    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  };

  measure();
  update();

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    measure();
    onScroll();
  });
}
