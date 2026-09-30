"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type NotificationType =
  | "session"
  | "poste"
  | "alerte"
  | "reservation";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  href: string;
  unread: boolean;
};

type Poste = {
  id: number;
  numero: number;
  statut: "libre" | "occupee" | "reservee";
  client: string | null;
  debut: string | null;
  limite_sec: number | null;
};

const supabase = createSupabaseBrowserClient();

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: "clock" | "gamepad" | "calendar" | "x" | "arrow";
  className?: string;
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "clock") {
    return (
      <svg viewBox="0 0 24 24" className={className} {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "gamepad") {
    return (
      <svg viewBox="0 0 24 24" className={className} {...common}>
        <path d="M7 8h10a5 5 0 0 1 4.8 6.4l-1 3.1a2.5 2.5 0 0 1-4.5.5L15 16H9l-1.3 2a2.5 2.5 0 0 1-4.5-.5l-1-3.1A5 5 0 0 1 7 8Z" />
        <path d="M8 11v4M6 13h4" />
        <path d="M16 12h.01M18 14h.01" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg viewBox="0 0 24 24" className={className} {...common}>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    );
  }

  if (name === "x") {
    return (
      <svg viewBox="0 0 24 24" className={className} {...common}>
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} {...common}>
      <path d="M5 12h13" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function playNotificationSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";

    oscillator.frequency.setValueAtTime(
      880,
      audioContext.currentTime
    );

    oscillator.frequency.exponentialRampToValueAtTime(
      1320,
      audioContext.currentTime + 0.12
    );

    gain.gain.setValueAtTime(
      0.0001,
      audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.08,
      audioContext.currentTime + 0.02
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audioContext.currentTime + 0.35
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.35);

    oscillator.onended = () => {
      audioContext.close().catch(() => {});
    };
  } catch {
    // Le son est optionnel.
  }
}

function getNotificationStyle(type: NotificationType) {
  switch (type) {
    case "session":
      return {
        icon: "clock" as const,
        bg: "bg-blue-50",
        text: "text-blue-600",
      };

    case "reservation":
      return {
        icon: "calendar" as const,
        bg: "bg-violet-50",
        text: "text-violet-600",
      };

    case "poste":
      return {
        icon: "gamepad" as const,
        bg: "bg-emerald-50",
        text: "text-emerald-600",
      };

    default:
      return {
        icon: "clock" as const,
        bg: "bg-red-50",
        text: "text-red-600",
      };
  }
}

export default function NotificationCenter() {
  const [mounted, setMounted] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const [notifications, setNotifications] = useState<
    Notification[]
  >([]);

  const knownPostes = useRef<Map<number, Poste>>(new Map());
  const initialized = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let actif = true;

    async function charger() {
      const { data, error } = await supabase
        .from("postes")
        .select(
          "id, numero, statut, client, debut, limite_sec"
        )
        .order("numero");

      if (error || !data || !actif) return;

      const postes = data as Poste[];

      if (!initialized.current) {
        const alertesInitiales: Notification[] = [];
        const maintenant = Date.now();

        for (const poste of postes) {
          knownPostes.current.set(poste.id, poste);

          if (poste.statut === "reservee") {
            alertesInitiales.push({
              id: `reservation-${poste.id}`,
              type: "reservation",
              title: `Poste ${poste.numero} réservé`,
              message:
                poste.client?.trim() ||
                "Une réservation est actuellement active.",
              time: "Maintenant",
              href: "/admin/reservations",
              unread: true,
            });
          }

          if (
            poste.statut === "occupee" &&
            poste.debut &&
            poste.limite_sec
          ) {
            const debut = new Date(poste.debut).getTime();
            const limite =
              debut + poste.limite_sec * 1000;

            if (maintenant > limite) {
              alertesInitiales.push({
                id: `alerte-${poste.id}`,
                type: "alerte",
                title: `Poste ${poste.numero} dépassé`,
                message:
                  "La durée prévue de la session est dépassée.",
                time: "Maintenant",
                href: "/admin/postes",
                unread: true,
              });
            }
          }
        }

        setNotifications(alertesInitiales.slice(0, 20));
        initialized.current = true;
      }
    }

    charger();

    const channel = supabase
      .channel("blackgaming-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "postes",
        },
        (payload) => {
          const nouveau = payload.new as Poste;
          const ancien = payload.old as Partial<Poste>;

          if (!nouveau?.id) return;

          const precedent =
            knownPostes.current.get(nouveau.id) ||
            (ancien as Poste);

          knownPostes.current.set(nouveau.id, nouveau);

          if (!precedent) return;

          const maintenant = new Date();

          if (
            precedent.statut !== "occupee" &&
            nouveau.statut === "occupee"
          ) {
            const notification: Notification = {
              id: `session-${nouveau.id}-${Date.now()}`,
              type: "session",
              title: "Nouvelle session",
              message: `Le poste ${nouveau.numero} vient d'être occupé.`,
              time: formatTime(maintenant),
              href: "/admin/postes",
              unread: true,
            };

            setNotifications((current) =>
              [notification, ...current].slice(0, 20)
            );

            playNotificationSound();
          }

          if (
            precedent.statut !== "reservee" &&
            nouveau.statut === "reservee"
          ) {
            const notification: Notification = {
              id: `reservation-${nouveau.id}-${Date.now()}`,
              type: "reservation",
              title: "Nouvelle réservation",
              message:
                nouveau.client?.trim() ||
                `Le poste ${nouveau.numero} est réservé.`,
              time: formatTime(maintenant),
              href: "/admin/reservations",
              unread: true,
            };

            setNotifications((current) =>
              [notification, ...current].slice(0, 20)
            );

            playNotificationSound();
          }

          if (
            precedent.statut === "occupee" &&
            nouveau.statut === "libre"
          ) {
            const notification: Notification = {
              id: `poste-${nouveau.id}-${Date.now()}`,
              type: "poste",
              title: "Poste disponible",
              message: `Le poste ${nouveau.numero} est maintenant libre.`,
              time: formatTime(maintenant),
              href: "/admin/postes",
              unread: true,
            };

            setNotifications((current) =>
              [notification, ...current].slice(0, 20)
            );

            playNotificationSound();
          }
        }
      )
      .subscribe();

    return () => {
      actif = false;
      supabase.removeChannel(channel);
    };
  }, [mounted]);

  /*
   * IMPORTANT :
   * Aucun fond.
   * Aucun carré.
   * Aucune icône de cloche.
   * Seulement le logo BlackGaming.
   */
  if (!mounted) {
    return (
      <div className="relative">
        <img
          src="/logo.png"
          alt="BlackGaming"
          className="h-11 w-11 object-contain"
        />
      </div>
    );
  }

  const unread = notifications.filter(
    (notification) => notification.unread
  ).length;

  function ouvrirNotifications() {
    setOuvert((value) => !value);

    if (!ouvert) {
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          unread: false,
        }))
      );
    }
  }

  function toutEffacer() {
    setNotifications([]);
  }

  return (
    <div className="relative">
      {/* LOGO SEUL */}
      <button
        type="button"
        onClick={ouvrirNotifications}
        aria-label="Notifications"
        className="group relative flex h-11 w-11 items-center justify-center bg-transparent p-0"
      >
        <img
          src="/logo.png"
          alt="BlackGaming"
          className="h-11 w-11 object-contain transition-transform duration-200 group-hover:scale-110"
        />

        {unread > 0 && (
          <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_0_2px_white]" />
        )}
      </button>

      {ouvert && (
        <>
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setOuvert(false)}
            className="fixed inset-0 z-40 cursor-default"
          />

          <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-[390px] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(3,18,61,0.22)]">
            <div className="relative overflow-hidden bg-[#061c59] px-5 py-4 text-white">
              <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-[#087cff]/30 blur-2xl" />

              <div className="relative flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <img
                      src="/logo.png"
                      alt="BlackGaming"
                      className="h-9 w-9 object-contain"
                    />

                    <p className="text-sm font-bold">
                      Notifications
                    </p>
                  </div>

                  <p className="mt-1 text-xs text-blue-100/70">
                    Centre de notifications BlackGaming
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <span className="rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-bold text-white">
                      {unread} nouvelle
                      {unread > 1 ? "s" : ""}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setOuvert(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80 transition hover:bg-white/15 hover:text-white"
                  >
                    <Icon name="x" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="max-h-[430px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <img
                    src="/logo.png"
                    alt="BlackGaming"
                    className="mx-auto h-16 w-16 object-contain"
                  />

                  <p className="mt-4 text-sm font-bold text-[#10275b]">
                    Tout est calme
                  </p>

                  <p className="mx-auto mt-1 max-w-[240px] text-xs leading-5 text-[#8394b4]">
                    Les nouvelles sessions, réservations et
                    alertes apparaîtront ici automatiquement.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map((notification) => {
                    const style = getNotificationStyle(
                      notification.type
                    );

                    return (
                      <Link
                        key={notification.id}
                        href={notification.href}
                        onClick={() => setOuvert(false)}
                        className="group block px-4 py-4 transition hover:bg-[#f7faff]"
                      >
                        <div className="flex gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.bg} ${style.text}`}
                          >
                            <Icon
                              name={style.icon}
                              className="h-[18px] w-[18px]"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <p className="text-[13px] font-bold text-[#10275b]">
                                  {notification.title}
                                </p>

                                {notification.unread && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                )}
                              </div>

                              <span className="shrink-0 text-[10px] font-medium text-[#9aa8bf]">
                                {notification.time}
                              </span>
                            </div>

                            <p className="mt-1 text-xs leading-5 text-[#7183a3]">
                              {notification.message}
                            </p>

                            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-[#087cff] opacity-0 transition group-hover:opacity-100">
                              Voir
                              <Icon
                                name="arrow"
                                className="h-3 w-3"
                              />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-[#fbfdff] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>

                <span className="text-[10px] font-semibold text-[#7183a3]">
                  Synchronisation en direct
                </span>
              </div>

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={toutEffacer}
                  className="text-[10px] font-bold text-[#087cff] transition hover:text-[#061c59]"
                >
                  Tout effacer
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}