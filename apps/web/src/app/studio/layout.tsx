import { SplashGate } from "@/components/SplashGate";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <SplashGate>{children}</SplashGate>;
}
