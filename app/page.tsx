"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (identifiant === "malek" && motDePasse === "malekchikour") {
      document.cookie = "bg_session=ok; path=/; max-age=86400";
      router.push("/admin");
    } else {
      setErreur("Identifiant ou mot de passe incorrect.");
    }
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6"
      style={{
        background:
          "radial-gradient(circle at 80% 15%, rgba(39,126,255,.25), transparent 30%), linear-gradient(160deg, #073c9c 0%, #061c59 48%, #03123d 100%)",
      }}
    >
      <div className="pointer-events-none absolute -right-40 -top-32 h-[500px] w-[500px] rounded-full border border-blue-light/30" />
      <div className="pointer-events-none absolute -right-32 top-10 h-[420px] w-[420px] rounded-full bg-blue/20 blur-[100px]" />

      <svg
        className="pointer-events-none absolute left-[8%] top-[15%] h-16 w-16 animate-[float_6s_ease-in-out_infinite] opacity-20 md:h-24 md:w-24"
        viewBox="0 0 64 40"
        fill="none"
      >
        <path
          d="M14 10h36a10 10 0 0 1 10 10v4a10 10 0 0 1-10 10c-3 0-5-1.5-7-4l-3-4H24l-3 4c-2 2.5-4 4-7 4A10 10 0 0 1 4 24v-4A10 10 0 0 1 14 10z"
          stroke="white"
          strokeWidth="2"
        />
        <circle cx="46" cy="18" r="1.6" fill="white" />
        <circle cx="50" cy="22" r="1.6" fill="white" />
        <circle cx="46" cy="26" r="1.6" fill="white" />
        <circle cx="42" cy="22" r="1.6" fill="white" />
        <path d="M16 18v8M12 22h8" stroke="white" strokeWidth="2" />
      </svg>

      <span className="pointer-events-none absolute right-[12%] top-[22%] animate-[float_5s_ease-in-out_infinite] text-3xl text-white/15 md:text-5xl">
        △
      </span>
      <span className="pointer-events-none absolute right-[20%] top-[55%] animate-[float_7s_ease-in-out_infinite] text-3xl text-white/15 md:text-5xl">
        ○
      </span>
      <span className="pointer-events-none absolute left-[15%] bottom-[18%] animate-[float_6.5s_ease-in-out_infinite] text-3xl text-white/15 md:text-5xl">
        ✕
      </span>
      <span className="pointer-events-none absolute left-[25%] top-[65%] animate-[float_5.5s_ease-in-out_infinite] text-3xl text-white/15 md:text-5xl">
        □
      </span>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <Image
          src="/logo.png"
          alt="Black Gaming"
          width={230}
          height={230}
          priority
          className="mb-4"
        />

        <form
          onSubmit={handleSubmit}
          className="w-full rounded-2xl bg-white p-8 shadow-[0_14px_35px_rgba(0,0,0,0.35)]"
        >
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
            Identifiant
          </label>
          <input
            type="text"
            value={identifiant}
            onChange={(e) => setIdentifiant(e.target.value)}
            className="mb-5 w-full rounded-xl border border-black/10 bg-[#f3f7ff] px-4 py-3 text-sm text-ink outline-none transition focus:border-blue"
            placeholder="ton identifiant"
          />

          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
            Mot de passe
          </label>
          <input
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="mb-3 w-full rounded-xl border border-black/10 bg-[#f3f7ff] px-4 py-3 text-sm text-ink outline-none transition focus:border-blue"
            placeholder="••••••••"
          />

          {erreur && (
            <p className="mb-4 text-xs font-medium text-red-500">{erreur}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-blue to-blue-light py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(8,124,255,0.35)] transition hover:opacity-90"
          >
            Se connecter
          </button>
        </form>
      </div>
    </main>
  );
}