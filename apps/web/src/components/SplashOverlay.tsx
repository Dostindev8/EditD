"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { LivingAuthBackground } from "@/components/LivingAuthBackground";

const SPLASH_MS = 4000;
const BAR_DONE_MS = 3400;
const SESSION_KEY = "lcs_splash_session";
const LOGIN_FLAG = "lcs_show_splash";

export function shouldPlaySplash() {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(SESSION_KEY) === "1") return false;
  return sessionStorage.getItem(LOGIN_FLAG) === "1" || sessionStorage.getItem(SESSION_KEY) !== "1";
}

export function markSplashPending() {
  sessionStorage.setItem(LOGIN_FLAG, "1");
  sessionStorage.removeItem(SESSION_KEY);
}

export function SplashOverlay({
  onDone,
  loadPromise,
  fading = false,
}: {
  onDone: () => void;
  loadPromise: Promise<void>;
  fading?: boolean;
}) {
  const [t, setT] = useState(0);
  const [bgReady, setBgReady] = useState(false);
  const started = useRef(false);
  const done = useRef(false);

  useEffect(() => {
    const preload = async () => {
      const img = new Image();
      img.src = "/brand/splash-landscape-poster.jpg";
      await img.decode().catch(() => undefined);
      const logo = new Image();
      logo.src = "/brand/logo-d.png";
      await logo.decode().catch(() => undefined);
      const lcs = new Image();
      lcs.src = "/brand/logo-lcs.png";
      await lcs.decode().catch(() => undefined);
      setBgReady(true);
    };

    const start = performance.now();
    started.current = true;
    preload();
    void loadPromise.catch(() => undefined);

    const id = window.setInterval(() => {
      const elapsed = performance.now() - start;
      setT(elapsed);
      if (elapsed >= SPLASH_MS && !done.current) {
        done.current = true;
        sessionStorage.setItem(SESSION_KEY, "1");
        sessionStorage.removeItem(LOGIN_FLAG);
        onDone();
      }
    }, 16);

    const hard = window.setTimeout(() => {
      if (!done.current) {
        done.current = true;
        sessionStorage.setItem(SESSION_KEY, "1");
        sessionStorage.removeItem(LOGIN_FLAG);
        onDone();
      }
    }, SPLASH_MS);

    return () => {
      clearInterval(id);
      clearTimeout(hard);
    };
  }, [loadPromise, onDone]);

  const progress = Math.min(1, t / BAR_DONE_MS);
  const showTitles = t >= 2200;
  const glow = t >= 800 && t < 2200;
  const fadeOut = t >= 3400 || fading;
  const logoOpacity = t < 800 ? t / 800 : 1;

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden bg-[#0C1712] transition-opacity duration-500 ease-out"
      style={{ opacity: fading ? 0 : 1 }}
      role="dialog"
      aria-label="Apertura editD"
    >
      {bgReady ? <LivingAuthBackground intensify /> : null}

      <div
        className="absolute inset-0"
        style={{
          background: bgReady
            ? "radial-gradient(circle at 50% 42%, rgba(12,23,18,0.15) 0%, rgba(12,23,18,0.78) 70%)"
            : "#0C1712",
        }}
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
        <div className="relative flex items-center justify-center">
          {glow ? (
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-52 sm:w-52"
              style={{
                boxShadow: "0 0 48px 8px rgba(47,168,79,0.35)",
                opacity: 0.9,
              }}
            />
          ) : null}
          <img
            src="/brand/logo-d.png"
            alt="editD"
            width={866}
            height={866}
            className="brand-mark relative h-28 w-28 object-contain sm:h-36 sm:w-36"
            style={{
              opacity: logoOpacity,
              transform: glow ? "scale(1.02)" : "scale(1)",
              filter: glow
                ? "drop-shadow(0 0 22px rgba(47,168,79,0.55))"
                : "drop-shadow(0 12px 28px rgba(0,0,0,0.4))",
            }}
          />
        </div>

        {showTitles ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: fadeOut ? 0 : 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mt-8 text-center"
          >
            <p className="brand-serif text-xl tracking-[0.28em] text-[#E7EFE9] sm:text-2xl">editD</p>
            <p className="mt-3 text-sm tracking-[0.35em] text-[#2FA84F]">LCS.DOMINICAN</p>
            <div className="mt-8 flex flex-col items-center gap-2">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#C7CDD1]/70">En colaboración con</p>
              <img
                src="/brand/logo-lcs.png"
                alt="Logic Code Spot"
                width={1024}
                height={512}
                className="brand-mark h-10 w-auto max-w-[6.5rem] object-contain"
              />
            </div>
            <div
              className="mx-auto mt-8 h-[3px] w-48 overflow-hidden rounded-full"
              style={{ background: "rgba(199,205,209,0.2)" }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            >
              <div
                className="h-full rounded-full bg-[#C7CDD1]"
                style={{ width: `${progress * 100}%`, transition: "width 80ms linear" }}
              />
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
