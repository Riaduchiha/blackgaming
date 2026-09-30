"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function WelcomeToast() {
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = 6500;
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((value) => {
        const next = value - step;

        if (next <= 0) {
          clearInterval(timer);
          setClosing(true);

          setTimeout(() => {
            setVisible(false);
          }, 400);

          return 0;
        }

        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, []);

  function fermer() {
    setClosing(true);

    setTimeout(() => {
      setVisible(false);
    }, 400);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed right-5 top-5 z-[100] w-[360px] max-w-[calc(100vw-24px)]"
      style={{
        animation: closing
          ? "toast-out 0.4s cubic-bezier(0.4,0,1,1) forwards"
          : "toast-in 0.65s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <div className="relative overflow-hidden rounded-[22px] border border-white/[0.12] bg-[#061638]/95 shadow-[0_25px_80px_rgba(0,0,0,0.55),0_0_40px_rgba(8,124,255,0.12)] backdrop-blur-2xl">

        {/* Glow principal */}
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#087cff]/20 blur-[55px]" />

        {/* Glow secondaire */}
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-[#268bff]/10 blur-[50px]" />

        {/* Ligne lumineuse supérieure */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#087cff] to-transparent" />

        {/* Contenu */}
        <div className="relative flex gap-3.5 p-4">

          {/* Logo */}
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[17px] border border-white/10 bg-gradient-to-br from-[#0b4db8] to-[#03123d] shadow-[0_0_30px_rgba(8,124,255,0.32)]">
  <Image
    src="/logo.png"
    alt="Black Gaming"
    width={52}
    height={52}
    className="relative h-12 w-12 object-contain"
    priority
  />
</div>

          {/* Texte */}
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-extrabold tracking-[0.01em] text-white">
                Bonjour Malek
              </p>

              <span className="h-1.5 w-1.5 rounded-full bg-[#087cff] shadow-[0_0_8px_rgba(8,124,255,0.9)]" />
            </div>

            <p className="mt-1 text-[11px] font-medium leading-relaxed text-white/55">
              Content de te revoir sur Black Gaming.
            </p>

            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#087cff] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#087cff]" />
                </span>

                <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#6fb5ff]">
                  Système actif
                </span>
              </div>
            </div>
          </div>

          {/* Bouton fermer */}
          <button
            onClick={fermer}
            className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.04] text-white/35 transition-all duration-200 hover:border-white/15 hover:bg-white/[0.09] hover:text-white active:scale-90"
            aria-label="Fermer la notification"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 3L9 9M9 3L3 9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Barre de progression */}
        <div className="relative h-[2px] w-full bg-white/[0.04]">
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#087cff] to-[#54aaff] shadow-[0_0_8px_rgba(8,124,255,0.7)] transition-[width] duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}