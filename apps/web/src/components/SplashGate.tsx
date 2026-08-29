"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SplashOverlay, shouldPlaySplash } from "./SplashOverlay";

export function SplashGate({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    setShow(shouldPlaySplash());
    setReady(true);
  }, []);

  const loadPromise = useMemo(
    () =>
      Promise.all([
        typeof document !== "undefined" && document.fonts ? document.fonts.ready : Promise.resolve(),
      ]).then(() => undefined),
    [],
  );

  const onDone = useCallback(() => {
    setFading(true);
    window.setTimeout(() => {
      setShow(false);
      setFading(false);
    }, 520);
  }, []);

  if (!ready) {
    return <div className="min-h-dvh bg-[#0C1712]" />;
  }

  const overlayVisible = show && !fading;
  const contentVisible = !show || fading;

  return (
    <>
      {show ? <SplashOverlay onDone={onDone} loadPromise={loadPromise} fading={fading} /> : null}
      <div
        className="min-h-dvh transition-opacity duration-500 ease-out"
        style={{
          opacity: contentVisible ? 1 : 0,
          pointerEvents: overlayVisible ? "none" : "auto",
        }}
        aria-hidden={overlayVisible ? true : undefined}
      >
        {children}
      </div>
    </>
  );
}
