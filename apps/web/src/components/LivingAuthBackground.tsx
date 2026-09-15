"use client";

import { useEffect, useRef, useState } from "react";

const BG = "/brand/splash-landscape-poster.jpg";

/** Full cinematic cycle — slow traverse (45–90s). */
const CYCLE_MS = 72_000;
const CYCLE_INTENSE_MS = 58_000;

/**
 * Living cinematic landscape: GPU-driven Ken Burns / camera glide via rAF.
 * UI stays on a separate layer (AuthStage z-10). Same source image only —
 * no invented scenery. Honors prefers-reduced-motion.
 */
export function LivingAuthBackground({ intensify = false }: { intensify?: boolean }) {
  const plateRef = useRef<HTMLDivElement>(null);
  const hazeRef = useRef<HTMLDivElement>(null);
  const [reduce, setReduce] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = BG;
    const mark = () => setReady(true);
    img.decode().then(mark).catch(mark);
    if (img.complete) mark();
  }, []);

  useEffect(() => {
    if (reduce || !ready) return;
    const plate = plateRef.current;
    const haze = hazeRef.current;
    if (!plate) return;

    let raf = 0;
    let running = true;
    const start = performance.now();
    const cycle = intensify ? CYCLE_INTENSE_MS : CYCLE_MS;

    const tick = (now: number) => {
      if (!running) return;
      const phase = ((now - start) % cycle) / cycle;
      const a = phase * Math.PI * 2;

      // Closed-path organic camera: horizontal glide + micro vertical + slow zoom.
      // Amplitudes kept small so mountains stay recognizable (no warp).
      const x = Math.sin(a) * 2.35 + Math.sin(a * 2) * 0.45;
      const y = Math.cos(a * 0.82) * 1.05 + Math.sin(a * 1.37) * 0.32;
      const scale = 1.085 + Math.sin(a * 0.5) * 0.028; // ~1.057–1.113

      plate.style.transform = `translate3d(${x}%, ${y}%, 0) scale(${scale})`;

      if (haze) {
        // Same photograph, slower & larger — soft depth without inventing clouds.
        const hx = Math.sin(a) * 1.35 + Math.sin(a * 1.5) * 0.25;
        const hy = Math.cos(a * 0.82) * 0.65;
        const hs = 1.14 + Math.sin(a * 0.5) * 0.018;
        haze.style.transform = `translate3d(${hx}%, ${hy}%, 0) scale(${hs})`;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [reduce, ready, intensify]);

  return (
    <div
      className={`auth-living-bg pointer-events-none absolute inset-0 overflow-hidden${ready ? " auth-living-bg--ready" : ""}`}
      aria-hidden
    >
      <div className="auth-living-viewport">
        {/* Depth haze: same landscape, soft-light — parallax only */}
        <div
          ref={hazeRef}
          className={`auth-living-plate auth-living-plate--haze${reduce ? " auth-living-plate--static" : ""}`}
        >
          <img
            src={BG}
            alt=""
            className="auth-living-img"
            decoding="async"
            draggable={false}
          />
        </div>

        <div
          ref={plateRef}
          className={`auth-living-plate${reduce ? " auth-living-plate--static" : ""}`}
        >
          <img
            src={BG}
            alt=""
            className="auth-living-img"
            decoding="async"
            fetchPriority="high"
            draggable={false}
          />
        </div>
      </div>

      <div className="auth-living-vignette" />
    </div>
  );
}
