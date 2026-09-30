"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function HomePage() {
  const router = useRouter();

  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");

  const handleConnexion = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErreur("");

    if (identifiant === "malek" && motDePasse === "malekchikour") {
      document.cookie = "bg_session=ok; path=/; max-age=86400";
      router.push("/admin");
    } else {
      setErreur("Identifiant ou mot de passe incorrect.");
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020817] text-white">
      {/* Fond principal */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(8,124,255,0.20),transparent_32%),radial-gradient(circle_at_85%_85%,rgba(38,139,255,0.12),transparent_30%),linear-gradient(145deg,#020817_0%,#03123d_48%,#061c59_100%)]" />

      {/* Grille lumineuse */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "70px 70px",
        }}
      />

      {/* Halo supérieur */}
      <div className="absolute left-1/2 top-[-180px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#087cff]/10 blur-[100px]" />

      {/* Décor droite */}
      <div className="absolute right-[-180px] top-[8%] h-[520px] w-[520px] rounded-full border border-white/[0.04]" />
      <div className="absolute right-[-100px] top-[17%] h-[360px] w-[360px] rounded-full border border-[#268bff]/10" />
      <div className="absolute right-[4%] top-[28%] h-3 w-3 rounded-full bg-[#268bff] shadow-[0_0_25px_8px_rgba(38,139,255,0.25)]" />

      {/* Décor gauche */}
      <div className="absolute bottom-[-180px] left-[-140px] h-[430px] w-[430px] rounded-full bg-[#087cff]/10 blur-[90px]" />

      {/* Symboles PlayStation */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <span
          className="absolute left-[10%] top-[22%] text-5xl font-light text-white/[0.07]"
          style={{ animation: "float 5s ease-in-out infinite" }}
        >
          △
        </span>

        <span
          className="absolute right-[13%] top-[42%] text-4xl font-light text-[#268bff]/10"
          style={{ animation: "float 6s ease-in-out infinite 1s" }}
        >
          ○
        </span>

        <span
          className="absolute bottom-[20%] left-[14%] text-4xl font-light text-white/[0.06]"
          style={{ animation: "float 7s ease-in-out infinite 0.5s" }}
        >
          □
        </span>

        <span
          className="absolute bottom-[14%] right-[19%] text-5xl font-light text-[#268bff]/10"
          style={{ animation: "float 5.5s ease-in-out infinite 1.5s" }}
        >
          ×
        </span>
      </div>

      {/* Contenu */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-[430px]">
          {/* Logo */}
          <div className="mb-7 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 scale-75 rounded-full bg-[#087cff]/20 blur-3xl" />

              <Image
                src="/logo.png"
                alt="BLACK GAMING"
                width={230}
                height={230}
                priority
                className="relative h-auto w-[190px] object-contain drop-shadow-[0_15px_40px_rgba(8,124,255,0.28)] sm:w-[210px]"
              />
            </div>
          </div>

          {/* Carte connexion */}
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.055] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
            {/* Ligne lumineuse */}
            <div className="absolute left-8 right-8 top-0 h-px bg-gradient-to-r from-transparent via-[#268bff]/70 to-transparent" />

            {/* Petit halo interne */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-[#087cff]/10 blur-3xl" />

            <div className="relative">
              {/* Titre */}
              <div className="mb-7 text-center">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.35em] text-[#5caeff]">
                  Espace sécurisé
                </p>

                <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-[28px]">
                  Connexion
                </h1>

                <p className="mt-2 text-sm text-white/45">
                  Connectez-vous à votre espace BLACK GAMING
                </p>
              </div>

              {/* Formulaire */}
              <form onSubmit={handleConnexion} className="space-y-5">
                {/* Identifiant */}
                <div>
                  <label
                    htmlFor="identifiant"
                    className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60"
                  >
                    Identifiant
                  </label>

                  <div className="relative">
                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#5caeff]">
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 21c.8-4 3.5-6 8-6s7.2 2 8 6" />
                      </svg>
                    </div>

                    <input
                      id="identifiant"
                      type="text"
                      value={identifiant}
                      onChange={(e) => setIdentifiant(e.target.value)}
                      placeholder="Votre identifiant"
                      autoComplete="username"
                      className="h-14 w-full rounded-2xl border border-white/10 bg-black/20 pl-12 pr-4 text-sm font-medium text-white outline-none transition placeholder:text-white/25 focus:border-[#268bff]/60 focus:bg-black/30 focus:ring-4 focus:ring-[#087cff]/10"
                    />
                  </div>
                </div>

                {/* Mot de passe */}
                <div>
                  <label
                    htmlFor="motDePasse"
                    className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60"
                  >
                    Mot de passe
                  </label>

                  <div className="relative">
                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#5caeff]">
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <rect x="4" y="10" width="16" height="10" rx="2" />
                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                      </svg>
                    </div>

                    <input
                      id="motDePasse"
                      type="password"
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                      placeholder="Votre mot de passe"
                      autoComplete="current-password"
                      className="h-14 w-full rounded-2xl border border-white/10 bg-black/20 pl-12 pr-4 text-sm font-medium text-white outline-none transition placeholder:text-white/25 focus:border-[#268bff]/60 focus:bg-black/30 focus:ring-4 focus:ring-[#087cff]/10"
                    />
                  </div>
                </div>

                {/* Erreur */}
                {erreur && (
                  <div className="flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                      !
                    </div>

                    <span>{erreur}</span>
                  </div>
                )}

                {/* Bouton */}
                <button
                  type="submit"
                  className="group relative mt-2 h-14 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#087cff] to-[#268bff] font-bold text-white shadow-[0_12px_35px_rgba(8,124,255,0.25)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(8,124,255,0.35)] active:translate-y-0"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                  <span className="relative flex items-center justify-center gap-3">
                    Se connecter

                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    >
                      <path d="M5 12h14" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
                  </span>
                </button>
              </form>

              {/* Bas de carte */}
              <div className="mt-7 flex items-center justify-center gap-2 text-[11px] text-white/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                Système opérationnel
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-[10px] font-medium uppercase tracking-[0.25em] text-white/20">
            BLACK GAMING • MANAGEMENT SYSTEM
          </p>
        </div>
      </div>
    </main>
  );
}