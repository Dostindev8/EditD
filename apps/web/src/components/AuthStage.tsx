import { BrandMark } from "@/components/BrandMark";
import { CollaboratorLockup } from "@/components/CollaboratorMark";
import { LivingAuthBackground } from "@/components/LivingAuthBackground";

export function AuthStage({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-stage relative min-h-dvh overflow-hidden">
      <LivingAuthBackground />
      <div className="auth-stage-veil pointer-events-none absolute inset-0" />
      <div className="auth-stage-orbs pointer-events-none absolute inset-0" aria-hidden />

      <div className="auth-stage-ui mx-auto grid min-h-dvh w-full max-w-6xl lg:grid-cols-2">
        <aside className="hidden flex-col items-center justify-center px-8 py-16 lg:flex xl:px-12">
          <BrandMark size="hero" />
          <p className="brand-serif mt-8 text-center text-3xl tracking-[0.12em] text-[#2FA84F]">editD</p>
          <p className="mt-3 max-w-sm text-center text-sm leading-relaxed text-[#E7EFE9]/90">
            LCS.Dominican — Creación audiovisual con IA
          </p>
          <div className="mt-12">
            <CollaboratorLockup size="md" />
          </div>
        </aside>
        <section className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-8">{children}</section>
      </div>
    </div>
  );
}
