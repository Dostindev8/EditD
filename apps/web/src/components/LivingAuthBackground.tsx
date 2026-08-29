"use client";

import { useEffect, useState } from "react";

const BG = "/brand/splash-landscape-poster.jpg";

/**
 * Cinematic living backdrop: slow landscape drift + soft mist layers.
 * Respects prefers-reduced-motion. Does not change auth/splash timing contracts.
 */
export function LivingAuthBackground({ intensify = false }: { intensify?: boolean }) {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div className="auth-living-bg pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className={`auth-living-plate ${reduce ? "auth-living-plate--static" : ""} ${intensify ? "auth-living-plate--intense" : ""}`}>
        <img src={BG} alt="" className="auth-living-img" decoding="async" />
      </div>
      {!reduce ? (
        <>
          <div className="auth-cloud auth-cloud--a" />
          <div className="auth-cloud auth-cloud--b" />
          <div className="auth-cloud auth-cloud--c" />
          <div className="auth-mist" />
        </>
      ) : null}
      <div className="auth-living-vignette" />
    </div>
  );
}
