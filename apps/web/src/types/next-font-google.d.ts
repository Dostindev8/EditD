declare module "next/font/google" {
  import type { NextFontWithVariable } from "next/dist/compiled/@next/font/dist/types";

  type GoogleFontOptions = {
    subsets?: string[];
    weight?: string | string[];
    style?: string | string[];
    display?: "auto" | "block" | "swap" | "fallback" | "optional";
    variable?: string;
    preload?: boolean;
    fallback?: string[];
    adjustFontFallback?: boolean;
  };

  export function Inter(options?: GoogleFontOptions): NextFontWithVariable;
  export function Fraunces(options?: GoogleFontOptions): NextFontWithVariable;
}
