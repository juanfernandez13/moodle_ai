// Shared duration for finite UI and WebGL responses. Ambient wind is continuous.
(() => {
  const duration = 0.3;
  document.documentElement.style.setProperty('--motion-duration', `${duration * 1000}ms`);
  window.MoodleMotion = Object.freeze({
    duration,
    track(initial) {
      let from = initial, to = initial, value = initial, elapsed = duration;
      return {
        set(next) { if (next === to) return; from = value; to = next; elapsed = 0; },
        step(dt) {
          elapsed = Math.min(duration, elapsed + dt);
          const t = elapsed / duration, eased = 1 - (1 - t) ** 3;
          value = from + (to - from) * eased;
          return value;
        }
      };
    }
  });
})();
