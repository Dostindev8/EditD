"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { markSplashPending } from "@/components/SplashOverlay";
import { BrandMark } from "@/components/BrandMark";
import { CollaboratorLockup } from "@/components/CollaboratorMark";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      await api(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        body: JSON.stringify(mode === "login" ? { email, password } : { email, password, name }),
      });
      markSplashPending();
      router.push("/studio");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="w-full max-w-md">
      <div className="mb-8 flex flex-col items-center text-center lg:hidden">
        <BrandMark size="lg" />
        <p className="brand-serif mt-4 text-2xl tracking-[0.12em] text-[#2FA84F]">editD</p>
        <p className="mt-2 text-sm text-[#E7EFE9]/85">LCS.Dominican — Creación audiovisual con IA</p>
      </div>

      <h1 className="brand-serif text-3xl text-[#2FA84F] sm:text-4xl">
        {mode === "login" ? "Entrar" : "Crear cuenta"}
      </h1>

      <form onSubmit={onSubmit} className="auth-glass mt-6 space-y-5 p-5 sm:p-7">
        {mode === "register" ? (
          <label className="block text-sm text-[#E7EFE9]">
            Nombre
            <div className="auth-field mt-1.5">
              <span className="auth-field-icon" aria-hidden>
                <UserIcon />
              </span>
              <input
                required
                minLength={2}
                autoComplete="name"
                placeholder="Tu nombre"
                className="auth-field-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </label>
        ) : null}

        <label className="block text-sm text-[#E7EFE9]">
          Correo
          <div className="auth-field mt-1.5">
            <span className="auth-field-icon" aria-hidden>
              <MailIcon />
            </span>
            <input
              required
              type="email"
              autoComplete="email"
              placeholder="Ingresa tu correo electrónico"
              className="auth-field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </label>

        <label className="block text-sm text-[#E7EFE9]">
          Contraseña
          <div className="auth-field mt-1.5">
            <span className="auth-field-icon" aria-hidden>
              <LockIcon />
            </span>
            <input
              required
              minLength={8}
              type={showPass ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="Ingresa tu contraseña"
              className="auth-field-input auth-field-input--with-action"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="auth-field-action"
              aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick={() => setShowPass((v) => !v)}
            >
              {showPass ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </label>

        {error ? (
          <p className="text-sm text-[#C7CDD1]" role="alert">
            {error}
          </p>
        ) : null}

        <button
          disabled={pending}
          className="w-full rounded-[10px] bg-[#2FA84F] py-3 text-[15px] font-semibold text-[#0C1712] transition-colors hover:bg-[#1E7A3E] hover:text-[#E7EFE9] disabled:opacity-50"
        >
          {pending ? "…" : mode === "login" ? "Iniciar sesión" : "Registrarme"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#E7EFE9]/80 sm:text-left">
        {mode === "login" ? (
          <>
            ¿Sin cuenta?{" "}
            <Link className="font-medium text-[#2FA84F] hover:underline" href="/register">
              Crear una
            </Link>
          </>
        ) : (
          <>
            ¿Ya tienes cuenta?{" "}
            <Link className="font-medium text-[#2FA84F] hover:underline" href="/login">
              Entrar
            </Link>
          </>
        )}
      </p>

      <div className="mt-10 lg:hidden">
        <CollaboratorLockup />
      </div>
    </main>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6.5h16v11H4v-11Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="m5 7.5 7 5.5 7-5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 19c1.5-3 4-4.5 6.5-4.5S17 16 18.5 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M10.5 6.3A10 10 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3.2 3.6M7.2 7.8A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1.1 0 2.1-.2 3-.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
