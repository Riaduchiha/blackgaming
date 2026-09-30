"use client";

import { useState } from "react";
import Image from "next/image";

export default function WelcomeToast() {
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);

  if (!visible) return null;

  function fermer() {
    setClosing(true);
    setTimeout(() => setVisible(false), 250);
  }

  return (
    <div
      className="fixed right-4 top-4 z-30 w-[290px]"
      style={{
        animation: closing
          ? "toast-out 0.25s ease-in forwards"
          : "toast-in 0.5s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <div
        className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/10 p-4 shadow-[0_15px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl"
        style={{ backgroundColor: "rgba(7, 28, 85, 0.88)" }}
      >
        {/* liseré dégradé en haut */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue via-blue-light to-transparent" />
        {/* glow décoratif */}
        <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-blue/30 blur-2xl" />

        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
          <Image
            src="/logo-sidebar.png"
            alt="Black Gaming"
            width={30}
            height={24}
            style={{ animation: "pulse-soft 2.5s ease-in-out infinite" }}
          />
        </div>

        <div className="relative flex-1">
          <p className="text-[13px] font-bold text-white">Bonjour Malek</p>
          <p className="text-[11px] text-white/60">Content de te revoir</p>
        </div>

        <button
          onClick={fermer}
          className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}