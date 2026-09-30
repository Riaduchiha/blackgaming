"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import WelcomeToast from "./WelcomeToast";

const NAV_GROUPS = [
  {
    label: "Activité",
    items: [
      { label: "Tableau de bord", href: "/admin", icon: "home" },
      { label: "Postes", href: "/admin/postes", icon: "gamepad" },
      { label: "Sessions", href: "/admin/sessions", icon: "clock" },
      { label: "Réservations", href: "/admin/reservations", icon: "calendar" },
    ],
  },
  {
    label: "Gestion",
    items: [
      { label: "Clients", href: "/admin/clients", icon: "users" },
      { label: "Caisse", href: "/admin/caisse", icon: "cash" },
      { label: "Produits & Stock", href: "/admin/stock", icon: "box" },
      { label: "Employés", href: "/admin/employes", icon: "id" },
      { label: "Statistiques", href: "/admin/stats", icon: "chart" },
    ],
  },
];

const NAV_MOBILE = [
  { label: "Accueil", href: "/admin", icon: "home" },
  { label: "Postes", href: "/admin/postes", icon: "gamepad" },
  { label: "Sessions", href: "/admin/sessions", icon: "clock" },
  { label: "Caisse", href: "/admin/caisse", icon: "cash" },
];

function Icon({ name, className = "h-[18px] w-[18px]" }: { name: string; className?: string }) {
  const paths: Record<string, string> = {
    home: "M4 11.5 12 4l8 7.5M6 10v9h12v-9",
    gamepad:
      "M7 9h10a5 5 0 0 1 5 5v0a4 4 0 0 1-7 2.6L14 15h-4l-1 1.6A4 4 0 0 1 2 14v0a5 5 0 0 1 5-5Z M8 12v4M6 14h4",
    clock: "M12 7v5l3 3 M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
    calendar:
      "M4 9h16M7 3v4M17 3v4M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z",
    users:
      "M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3 3-5 6-5s6 2 6 5M16 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14 12c2.5.4 4 2 4 4",
    cash: "M3 7h18v10H3V7Zm9 2.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",
    box: "M3 8l9-5 9 5-9 5-9-5Zm0 0v9l9 5m0-14v14m9-14v9l-9 5",
    id: "M4 5h16v14H4V5Zm4 4h.01M7 15h6M4 5l8 6 8-6",
    chart: "M4 20V10M11 20V4M18 20v-7",
    bell: "M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Zm4.5 10a1.5 1.5 0 0 0 3 0",
    more: "M5 12h.01M12 12h.01M19 12h.01",
    close: "M6 6l12 12M18 6 6 18",
    logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d={paths[name]} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function seDeconnecter() {
  document.cookie = "bg_session=; path=/; max-age=0";
  window.location.href = "/";
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [plusOuvert, setPlusOuvert] = useState(false);

  const dejaVisibles = new Set(NAV_MOBILE.map((i) => i.href));
  const autresItems = NAV_GROUPS.flatMap((g) => g.items).filter((i) => !dejaVisibles.has(i.href));

  return (
    <div className="min-h-screen bg-[#f3f7ff]">
      <WelcomeToast />

      <aside
        className="fixed inset-y-0 left-0 z-20 hidden w-[250px] overflow-y-auto p-5 text-white md:block"
        style={{
          background:
            "radial-gradient(circle at 10% 80%, rgba(0,132,255,.35), transparent 28%), linear-gradient(180deg, #073c9c 0%, #061c59 48%, #03123d 100%)",
        }}
      >
        <div className="mb-8 flex justify-center px-1">
          <Image
            src="/logo-sidebar.png"
            alt="Black Gaming"
            width={150}
            height={120}
            className="drop-shadow-[0_0_20px_rgba(8,124,255,0.35)]"
          />
        </div>

        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">
              {group.label}
            </p>
            <nav className="grid gap-1">
              {group.items.map((item) => {
                const actif = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${
                      actif
                        ? "bg-gradient-to-r from-[#147cff] to-[#0b65db] text-white shadow-[0_8px_22px_rgba(0,115,255,.35)]"
                        : "text-white/70 hover:translate-x-0.5 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon name={item.icon} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </aside>

      <div className="flex min-h-screen flex-col md:ml-[250px]">
        <header className="sticky top-0 z-10 hidden h-[60px] items-center justify-end border-b border-black/5 bg-white/80 px-8 backdrop-blur md:flex">
          <div className="flex items-center gap-5">
            <span className="text-[12px] text-muted">
              {new Date().toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
            </span>
            <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#eef4fc] text-muted hover:text-ink">
              <Icon name="bell" className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue to-blue-light text-xs font-bold text-white">
                M
              </div>
              <div className="hidden sm:block">
                <p className="text-[12px] font-semibold leading-none text-ink">Malek</p>
                <p className="mt-1 text-[10px] leading-none text-muted">Administrateur</p>
              </div>
              <button
                onClick={seDeconnecter}
                title="Se déconnecter"
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-red-50 hover:text-red-600"
              >
                <Icon name="logout" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main
          key={pathname}
          className="flex-1 animate-[page-in_0.4s_ease-out] px-4 pb-24 md:px-8 md:pb-8 md:pt-6"
          style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 20px)" }}
        >
          {children}
        </main>

        <footer className="hidden items-center justify-between border-t border-black/5 px-8 py-4 text-[10px] uppercase tracking-widest text-muted md:flex">
          <span>Black Gaming · Système de gestion</span>
          <span>Live Dashboard</span>
        </footer>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-black/5 bg-white pb-[env(safe-area-inset-bottom,0px)] md:hidden">
        {NAV_MOBILE.map((item) => {
          const actif = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium"
            >
              <Icon name={item.icon} className={`h-5 w-5 ${actif ? "text-[#147cff]" : "text-muted"}`} />
              <span className={actif ? "text-[#147cff]" : "text-muted"}>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setPlusOuvert(true)}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium"
        >
          <Icon name="more" className="h-5 w-5 text-muted" />
          <span className="text-muted">Plus</span>
        </button>
      </nav>

      {plusOuvert && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPlusOuvert(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)]">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-ink">Menu</p>
              <button
                onClick={() => setPlusOuvert(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-black/5"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {autresItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setPlusOuvert(false)}
                  className="flex flex-col items-center gap-2 rounded-xl border border-black/5 py-4 text-center"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef4fc] text-[#147cff]">
                    <Icon name={item.icon} className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-medium text-ink">{item.label}</span>
                </Link>
              ))}
            </div>

            <button
              onClick={seDeconnecter}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 py-3 text-[13px] font-semibold text-red-600"
            >
              <Icon name="logout" className="h-4 w-4" />
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}