import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#03123d] px-6 text-white">
      {/* Effets de fond */}
      <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#087cff]/10 blur-[120px]" />

      <div className="absolute left-10 top-10 h-2 w-2 rounded-full bg-[#087cff] opacity-70" />
      <div className="absolute right-20 top-32 h-1.5 w-1.5 rounded-full bg-[#268bff] opacity-60" />
      <div className="absolute bottom-24 left-24 h-1.5 w-1.5 rounded-full bg-[#087cff] opacity-50" />
      <div className="absolute bottom-32 right-16 h-2 w-2 rounded-full bg-[#268bff] opacity-70" />

      {/* Contenu */}
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center">
        {/* Logo */}
        <div className="mb-8">
          <Image
            src="/logo.png"
            alt="BlackGaming"
            width={150}
            height={150}
            priority
            className="h-auto w-[130px] object-contain drop-shadow-[0_0_30px_rgba(8,124,255,0.35)]"
          />
        </div>

        {/* 404 */}
        <div className="relative">
          <h1 className="select-none text-[150px] font-black leading-none tracking-[-0.08em] text-white sm:text-[190px]">
            404
          </h1>

          <div className="absolute bottom-3 left-1/2 h-3 w-40 -translate-x-1/2 rounded-full bg-[#087cff]/30 blur-xl" />
        </div>

        {/* Message */}
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#268bff]">
            GAME OVER
          </p>

          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Cette page n&apos;existe pas
          </h2>

          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#9eb0d0] sm:text-base">
            La page que tu recherches est introuvable ou a peut-être été
            déplacée. Retourne dans la zone de jeu et continue ta session.
          </p>
        </div>

        {/* Boutons */}
        <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#087cff] px-7 text-sm font-bold text-white shadow-[0_10px_30px_rgba(8,124,255,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#268bff] hover:shadow-[0_15px_35px_rgba(8,124,255,0.35)]"
          >
            <span>←</span>
            Retour à l&apos;accueil
          </Link>

          <Link
            href="/admin"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-7 text-sm font-bold text-white backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-[#087cff]/40 hover:bg-white/10"
          >
            Espace administration
          </Link>
        </div>

        {/* Petite signature */}
        <div className="mt-12 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#7184a8]">
          <span className="h-px w-8 bg-white/10" />
          BlackGaming
          <span className="h-px w-8 bg-white/10" />
        </div>
      </div>
    </main>
  );
}