"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Inter } from "next/font/google";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const inter = Inter({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

const num = inter.className;

type Statut = "libre" | "occupee" | "reservee";

type Poste = {
  id: number;
  numero: number;
  statut: Statut;
  client: string | null;
  debut: string | null;
  limite_sec: number | null;
};

type SessionLigne = {
  id: number;
  poste_numero: number;
  client: string | null;
  debut: string;
  fin: string;
  montant: number;
};

const TARIF_HORAIRE = 300;
const HEURE = 3_600_000;

const supabase = createSupabaseBrowserClient();

const ACCES = [
  {
    label: "Postes",
    desc: "Démarrer et encaisser",
    href: "/admin/postes",
    icon: "gamepad",
  },
  {
    label: "Réservations",
    desc: "Créneaux à venir",
    href: "/admin/reservations",
    icon: "calendar",
  },
  {
    label: "Caisse",
    desc: "Snacks et boissons",
    href: "/admin/caisse",
    icon: "cash",
  },
  {
    label: "Produits & Stock",
    desc: "Inventaire",
    href: "/admin/stock",
    icon: "box",
  },
  {
    label: "Statistiques",
    desc: "Analyse détaillée",
    href: "/admin/stats",
    icon: "chart",
  },
  {
    label: "Employés",
    desc: "Équipe et horaires",
    href: "/admin/employes",
    icon: "id",
  },
];

const BOUTIQUE = [
  {
    nom: "Manette Pro sans fil",
    categorie: "Accessoire",
    image: "/products/manette-ps5.jpg",
    bg: "from-[#03143b] via-[#0752c4] to-[#041a55]",
  },
  {
    nom: "Casque gaming surround",
    categorie: "Audio",
    image: "/products/casque.jpg",
    bg: "from-[#1a0f24] via-[#5a2f8f] to-[#0f0a1a]",
  },
  {
    nom: "Figurines de collection",
    categorie: "Collector",
    image: "/products/figurines.jpg",
    bg: "from-[#2b0f14] via-[#7c1f26] to-[#1a0b0d]",
  },
  {
    nom: "Jeux CD",
    categorie: "Jeux",
    image: "/products/jeux-cd.jpg",
    bg: "from-[#1a1a2e] via-[#3d3d6b] to-[#0f0f1a]",
  },
];

function Icon({
  name,
  className = "h-4 w-4",
}: {
  name: string;
  className?: string;
}) {
  const paths: Record<string, string> = {
    gamepad:
      "M7 9h10a5 5 0 0 1 5 5v0a4 4 0 0 1-7 2.6L14 15h-4l-1 1.6A4 4 0 0 1 2 14v0a5 5 0 0 1 5-5Z M8 12v4M6 14h4",

    calendar:
      "M4 9h16M7 3v4M17 3v4M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z",

    cash:
      "M3 7h18v10H3V7Zm9 2.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",

    box:
      "M3 8l9-5 9 5-9 5-9-5Zm0 0v9l9 5m0-14v14m9-14v9l-9 5",

    chart:
      "M4 20V10M11 20V4M18 20v-7",

    id:
      "M4 5h16v14H4V5Zm4 4h.01M7 15h6M4 5l8 6 8-6",

    arrow:
      "M5 12h14M13 6l6 6-6 6",

    alarm:
      "M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Zm4.5 10a1.5 1.5 0 0 0 3 0",

    up:
      "M12 19V5M6 11l6-6 6 6",

    down:
      "M12 5v14M6 13l6 6 6-6",
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d={paths[name]}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatDuree(ms: number) {
  const s = Math.floor(Math.max(0, ms) / 1000);

  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");

  return `${h}:${m}:${sec}`;
}

function formatDureeCourte(ms: number) {
  const totalMin = Math.round(Math.max(0, ms) / 60000);

  const h = Math.floor(totalMin / 60);
  const m = String(totalMin % 60).padStart(2, "0");

  return h > 0 ? `${h} h ${m}` : `${totalMin} min`;
}

function heureCourte(valeur: string | number) {
  return new Date(valeur).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calculerMontant(debut: string, fin: number) {
  const heures =
    Math.max(0, fin - new Date(debut).getTime()) / HEURE;

  return Math.ceil((heures * TARIF_HORAIRE) / 10) * 10;
}

function useCompteur(cible: number) {
  const [valeur, setValeur] = useState(0);
  const depart = useRef(0);

  useEffect(() => {
    const from = depart.current;
    const t0 = performance.now();

    let raf = 0;

    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 700);
      const eased = 1 - Math.pow(1 - p, 3);

      const v = Math.round(
        from + (cible - from) * eased
      );

      setValeur(v);
      depart.current = v;

      if (p < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [cible]);

  return valeur;
}

const apparition = (delai: number) => ({
  animation: `rise .5s ease-out ${delai}ms both`,
});

export default function TableauDeBordPage() {
  const [postes, setPostes] = useState<Poste[]>([]);
  const [sessions, setSessions] = useState<SessionLigne[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [maintenant, setMaintenant] = useState(Date.now());
  const [monte, setMonte] = useState(false);

  const chargerSessions = useCallback(async () => {
    const debut = new Date();

    debut.setHours(0, 0, 0, 0);
    debut.setDate(debut.getDate() - 6);

    const { data, error } = await supabase
      .from("sessions")
      .select(
        "id, poste_numero, client, debut, fin, montant"
      )
      .gte("fin", debut.toISOString())
      .order("fin", { ascending: false });

    if (error) {
      setErreur(
        "Impossible de charger les sessions : " +
          error.message
      );
    }

    setSessions(
      (data ?? []) as SessionLigne[]
    );
  }, []);

  useEffect(() => {
    const t = setInterval(
      () => setMaintenant(Date.now()),
      1000
    );

    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    async function charger() {
      const { data, error } = await supabase
        .from("postes")
        .select("*")
        .order("numero");

      if (error) {
        setErreur(
          "Impossible de charger les postes : " +
            error.message
        );
      } else {
        setPostes(data as Poste[]);
      }

      await chargerSessions();

      setChargement(false);
    }

    charger();

    const channel = supabase
      .channel("dashboard-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "postes",
        },
        (payload) => {
          const ligne = payload.new as Poste;

          if (ligne?.id) {
            setPostes((prev) =>
              prev.map((p) =>
                p.id === ligne.id ? ligne : p
              )
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sessions",
        },
        () => {
          chargerSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chargerSessions]);

  useEffect(() => {
    if (chargement) return;

    const t = setTimeout(
      () => setMonte(true),
      80
    );

    return () => clearTimeout(t);
  }, [chargement]);

  const jourMinuit = (decalage: number) => {
    const d = new Date(maintenant);

    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - decalage);

    return d.getTime();
  };

  const debutAuj = jourMinuit(0);
  const debutHier = jourMinuit(1);

  const finDe = (s: SessionLigne) =>
    new Date(s.fin).getTime();

  const somme = (liste: SessionLigne[]) =>
    liste.reduce((t, s) => t + s.montant, 0);

  const sessionsAuj = sessions.filter(
    (s) => finDe(s) >= debutAuj
  );

  const sessionsHier = sessions.filter(
    (s) =>
      finDe(s) >= debutHier &&
      finDe(s) < debutAuj
  );

  const ca = somme(sessionsAuj);
  const caHier = somme(sessionsHier);

  const caAffiche = useCompteur(ca);

  const delta =
    caHier > 0
      ? Math.round(
          ((ca - caHier) / caHier) * 100
        )
      : null;

  const ticketMoyen = sessionsAuj.length
    ? Math.round(ca / sessionsAuj.length)
    : 0;

  const dureeMoyenne = sessionsAuj.length
    ? sessionsAuj.reduce(
        (t, s) =>
          t +
          (finDe(s) -
            new Date(s.debut).getTime()),
        0
      ) / sessionsAuj.length
    : 0;

  const jours = Array.from(
    { length: 7 },
    (_, i) => {
      const decalage = 6 - i;

      const debut = jourMinuit(decalage);

      const suivant =
        decalage === 0
          ? Infinity
          : jourMinuit(decalage - 1);

      const total = somme(
        sessions.filter(
          (s) =>
            finDe(s) >= debut &&
            finDe(s) < suivant
        )
      );

      const label = new Date(
        debut
      )
        .toLocaleDateString("fr-FR", {
          weekday: "short",
        })
        .replace(".", "");

      return {
        debut,
        total,
        label,
        estAuj: decalage === 0,
      };
    }
  );

  const maxJour = Math.max(
    ...jours.map((j) => j.total),
    1
  );

  const totalSemaine = jours.reduce(
    (t, j) => t + j.total,
    0
  );

  const moyenneJour = Math.round(
    totalSemaine / 7
  );

  const meilleur = jours.reduce(
    (m, j) =>
      j.total > m.total ? j : m,
    jours[0]
  );

  const meilleurNom = new Date(
    meilleur.debut
  ).toLocaleDateString("fr-FR", {
    weekday: "long",
  });

  const parPoste = postes.map((p) => {
    const ss = sessionsAuj.filter(
      (s) =>
        s.poste_numero === p.numero
    );

    return {
      numero: p.numero,
      total: somme(ss),
      nb: ss.length,
    };
  });

  const maxPoste = Math.max(
    ...parPoste.map((x) => x.total),
    1
  );

  const classement = [...parPoste]
    .sort((a, b) => b.total - a.total)
    .filter((x) => x.total > 0)
    .slice(0, 5);

  const occupes = postes
    .filter(
      (p) =>
        p.statut === "occupee" &&
        p.debut
    )
    .sort(
      (a, b) =>
        new Date(
          a.debut as string
        ).getTime() -
        new Date(
          b.debut as string
        ).getTime()
    );

  const reserves = postes.filter(
    (p) => p.statut === "reservee"
  );

  const nbLibres = postes.filter(
    (p) => p.statut === "libre"
  ).length;

  const ecoule = (p: Poste) =>
    maintenant -
    new Date(
      p.debut as string
    ).getTime();

  const depasse = (p: Poste) =>
    p.limite_sec != null &&
    ecoule(p) >=
      p.limite_sec * 1000;

  const enAlerte =
    occupes.filter(depasse).length;

  const enCoursMontant =
    occupes.reduce(
      (t, p) =>
        t +
        calculerMontant(
          p.debut as string,
          maintenant
        ),
      0
    );

  const tauxOccupation =
    postes.length
      ? Math.round(
          (occupes.length /
            postes.length) *
            100
        )
      : 0;

  const heure = new Date(
    maintenant
  ).getHours();

  const salut =
    heure >= 18 || heure < 5
      ? "Bonsoir"
      : "Bonjour";

  const dateBrute =
    new Date(
      maintenant
    ).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

  const dateLongue =
    dateBrute.charAt(0).toUpperCase() +
    dateBrute.slice(1);

  if (chargement) {
    return (
      <div className="animate-pulse">
        <div className="mb-5 h-10 w-72 rounded bg-black/5" />

        <div className="mb-6 h-64 rounded-2xl bg-black/5" />

        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          <div className="h-80 rounded-xl bg-black/5" />

          <div className="h-80 rounded-xl bg-black/5" />
        </div>
      </div>
    );
  }

  const KPIS = [
    {
      l: "Sessions encaissées",
      v: String(sessionsAuj.length),
      s: "aujourd'hui",
    },
    {
      l: "Ticket moyen",
      v: sessionsAuj.length
        ? `${ticketMoyen} DA`
        : "—",
      s: "par session",
    },
    {
      l: "Durée moyenne",
      v: sessionsAuj.length
        ? formatDureeCourte(
            dureeMoyenne
          )
        : "—",
      s: "par session",
    },
    {
      l: "7 derniers jours",
      v: `${totalSemaine.toLocaleString(
        "fr-FR"
      )} DA`,
      s: `moy. ${moyenneJour.toLocaleString(
        "fr-FR"
      )} DA / jour`,
    },
  ];

  return (
    <div className={num}>
      {/* EN-TÊTE */}

      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#147cff] shadow-[0_0_10px_rgba(20,124,255,.8)]" />

            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#147cff]">
              Administration
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-ink sm:text-4xl">
            TABLEAU DE BORD
          </h1>

          <p className="mt-2 text-[13px] font-medium text-muted">
            Vue en direct de l'activité{" "}
            <span className="font-extrabold text-ink">
              BLACK GAMING
            </span>
            .
          </p>
        </div>

        <Link
          href="/admin/postes"
          className="group flex w-fit items-center gap-2.5 rounded-xl bg-[#061c59] px-4 py-3 text-[12px] font-bold text-white shadow-[0_8px_24px_rgba(6,28,89,.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#147cff] hover:shadow-[0_12px_28px_rgba(20,124,255,.28)]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 transition group-hover:bg-white/20">
            <Icon
              name="gamepad"
              className="h-4 w-4"
            />
          </span>

          <span>Ouvrir les postes</span>

          <Icon
            name="arrow"
            className="h-3.5 w-3.5 opacity-50 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
          />
        </Link>
      </div>

      {erreur && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {erreur}
        </div>
      )}

      {/* BLOC PRINCIPAL */}

      <div
        className="relative mb-6 overflow-hidden rounded-[22px] text-white shadow-[0_20px_60px_rgba(3,18,61,.16)]"
        style={{
          ...apparition(0),

          background:
            "radial-gradient(rgba(255,255,255,.06) 1px, transparent 1px) 0 0 / 18px 18px, linear-gradient(90deg, rgba(3,18,61,.96) 0%, rgba(3,18,61,.85) 55%, rgba(6,28,89,.6) 100%), url('/hero-dashboard.jpg') center / cover no-repeat, linear-gradient(135deg, #061c59 0%, #03123d 100%)",
        }}
      >
        <div className="grid gap-8 px-7 pt-7 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="flex items-center gap-2 text-[12px] font-semibold text-white/60">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />

                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>

              {salut} Malek · {dateLongue}
            </p>

            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">
              Chiffre d'affaires du jour
            </p>

            <div className="mt-1 flex flex-wrap items-end gap-4">
              <p
                className={`${num} text-[56px] font-black leading-none tracking-tight tabular-nums`}
              >
                {caAffiche.toLocaleString(
                  "fr-FR"
                )}

                <span className="ml-2 text-xl font-bold text-white/45">
                  DA
                </span>
              </p>

              <span
                className={`mb-2 flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold ${
                  delta === null
                    ? "bg-white/10 text-white/60"
                    : delta >= 0
                    ? "bg-emerald-400/20 text-emerald-300"
                    : "bg-red-400/20 text-red-300"
                }`}
              >
                {delta !== null && (
                  <Icon
                    name={
                      delta >= 0
                        ? "up"
                        : "down"
                    }
                    className="h-3 w-3"
                  />
                )}

                {delta === null
                  ? "Pas de session hier"
                  : `${Math.abs(
                      delta
                    )} % vs hier`}
              </span>
            </div>

            {enCoursMontant > 0 && (
              <p className="mt-2 text-[12px] font-medium text-white/50">
                +{" "}
                {enCoursMontant.toLocaleString(
                  "fr-FR"
                )}{" "}
                DA en cours de session,
                pas encore encaissés
              </p>
            )}
          </div>

          <div className="lg:pt-1">
            <div className="mb-2.5 flex items-baseline justify-between">
              <p className="text-[11px] font-bold text-white/55">
                Occupation de la salle
              </p>

              <p
                className={`${num} text-sm font-black`}
              >
                {tauxOccupation}%

                <span className="ml-2 font-semibold text-white/40">
                  {occupes.length} /{" "}
                  {postes.length}
                </span>
              </p>
            </div>

            <div className="flex gap-1.5">
              {postes.map((p) => (
                <Link
                  key={p.id}
                  href="/admin/postes"
                  title={`Poste ${p.numero}`}
                  className={`h-3 flex-1 rounded-sm transition hover:scale-y-150 ${
                    p.statut === "occupee"
                      ? depasse(p)
                        ? "animate-pulse bg-red-500"
                        : "animate-pulse bg-[#4aa8ff]"
                      : p.statut ===
                        "reservee"
                      ? "bg-amber-400"
                      : "bg-white/15 hover:bg-white/30"
                  }`}
                />
              ))}
            </div>

            <div className="mt-5 flex gap-7 text-[12px]">
              {[
                {
                  l: "Libres",
                  v: nbLibres,
                  c: "bg-white/40",
                },
                {
                  l: "Occupés",
                  v: occupes.length,
                  c: "bg-[#4aa8ff]",
                },
                {
                  l: "Réservés",
                  v: reserves.length,
                  c: "bg-amber-400",
                },
              ].map((x) => (
                <div key={x.l}>
                  <p className="flex items-center gap-1.5 font-medium text-white/50">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${x.c}`}
                    />

                    {x.l}
                  </p>

                  <p
                    className={`${num} mt-0.5 text-2xl font-black`}
                  >
                    {x.v}
                  </p>
                </div>
              ))}
            </div>

            {enAlerte > 0 && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/20 px-3 py-2 text-[12px] font-bold text-red-200">
                <Icon
                  name="alarm"
                  className="h-4 w-4 shrink-0"
                />

                {enAlerte} session
                {enAlerte > 1
                  ? "s"
                  : ""}{" "}
                au-delà du temps
                limite
              </div>
            )}
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-y-5 border-t border-white/10 py-5 lg:grid-cols-4 lg:divide-x lg:divide-white/10">
          {KPIS.map((k) => (
            <div
              key={k.l}
              className="px-7"
            >
              <p className="text-[11px] font-bold text-white/50">
                {k.l}
              </p>

              <p
                className={`${num} mt-1 text-2xl font-black tabular-nums`}
              >
                {k.v}
              </p>

              <p className="mt-0.5 text-[11px] font-medium text-white/40">
                {k.s}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_400px]">
        {/* GAUCHE */}

        <div className="space-y-6">
          {/* 7 JOURS */}

          <div
            className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_8px_30px_rgba(20,50,100,.04)]"
            style={apparition(120)}
          >
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2
                  className={`${num} text-base font-black text-ink`}
                >
                  Chiffre d'affaires ·
                  7 jours
                </h2>

                <p className="mt-0.5 text-[11px] font-medium text-muted">
                  Passe la souris sur
                  une barre pour voir
                  le montant.
                </p>
              </div>

              {meilleur.total > 0 && (
                <p className="text-[12px] font-medium text-muted">
                  Meilleur jour :{" "}
                  <span className="font-bold text-ink">
                    {meilleurNom}
                  </span>{" "}
                  ·{" "}
                  <span
                    className={`${num} font-black text-ink`}
                  >
                    {meilleur.total.toLocaleString(
                      "fr-FR"
                    )}{" "}
                    DA
                  </span>
                </p>
              )}
            </div>

            <div className="flex items-end gap-3">
              {jours.map((j) => (
                <div
                  key={j.debut}
                  className="group flex flex-1 flex-col items-center justify-end gap-2"
                >
                  <span
                    className={`${num} text-[11px] font-black transition ${
                      j.estAuj
                        ? "text-ink"
                        : "text-transparent group-hover:text-ink"
                    }`}
                  >
                    {j.total.toLocaleString(
                      "fr-FR"
                    )}
                  </span>

                  <div className="flex h-40 w-full items-end">
                    <div
                      className={`w-full rounded-t-md transition-all duration-700 ease-out ${
                        j.estAuj
                          ? "bg-gradient-to-t from-[#147cff] to-[#4aa8ff]"
                          : "bg-[#147cff]/25 group-hover:bg-[#147cff]/45"
                      }`}
                      style={{
                        height: monte
                          ? `${Math.max(
                              (j.total /
                                maxJour) *
                                100,
                              j.total > 0
                                ? 4
                                : 1.5
                            )}%`
                          : "0%",
                      }}
                    />
                  </div>

                  <span
                    className={`text-[11px] font-bold ${
                      j.estAuj
                        ? "text-ink"
                        : "text-muted"
                    }`}
                  >
                    {j.estAuj
                      ? "Auj."
                      : j.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* POSTES */}

          <div
            className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_8px_30px_rgba(20,50,100,.04)]"
            style={apparition(200)}
          >
            <div className="mb-3">
              <h2
                className={`${num} text-base font-black text-ink`}
              >
                Postes les plus
                rentables aujourd'hui
              </h2>

              <p className="mt-0.5 text-[11px] font-medium text-muted">
                Classement selon le
                montant encaissé.
              </p>
            </div>

            {classement.length === 0 ? (
              <p className="py-8 text-center text-[13px] font-semibold text-muted">
                Aucune session encaissée
                aujourd'hui.
              </p>
            ) : (
              classement.map((x) => (
                <div
                  key={x.numero}
                  className="flex items-center gap-3 py-2.5"
                >
                  <span
                    className={`${num} flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#061c59] text-[13px] font-black text-white`}
                  >
                    {String(
                      x.numero
                    ).padStart(2, "0")}
                  </span>

                  <div className="flex-1">
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="text-[12px] font-medium text-muted">
                        {x.nb} session
                        {x.nb > 1
                          ? "s"
                          : ""}
                      </span>

                      <span
                        className={`${num} text-[13px] font-black text-ink`}
                      >
                        {x.total.toLocaleString(
                          "fr-FR"
                        )}{" "}
                        DA
                      </span>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#147cff] to-[#4aa8ff] transition-all duration-700 ease-out"
                        style={{
                          width: monte
                            ? `${
                                (x.total /
                                  maxPoste) *
                                100
                              }%`
                            : "0%",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* DROITE */}

        <div className="space-y-6">
          {/* SESSIONS */}

          <div
            className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_8px_30px_rgba(20,50,100,.04)]"
            style={apparition(160)}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h2
                  className={`${num} text-base font-black text-ink`}
                >
                  Sessions en cours
                </h2>

                <span
                  className={`${num} rounded-md bg-[#eef4fc] px-2 py-0.5 text-[12px] font-black text-[#147cff]`}
                >
                  {occupes.length}
                </span>
              </div>

              <Link
                href="/admin/postes"
                className="flex items-center gap-1 text-[12px] font-bold text-[#147cff]"
              >
                Ouvrir

                <Icon
                  name="arrow"
                  className="h-3 w-3"
                />
              </Link>
            </div>

            {occupes.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#eef4fc] text-[#147cff]">
                  <Icon
                    name="gamepad"
                    className="h-5 w-5"
                  />
                </div>

                <p className="text-[13px] font-black text-ink">
                  Aucun poste occupé
                </p>

                <p className="mt-1 text-[12px] font-medium text-muted">
                  Toute la salle est
                  disponible.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {occupes.map((p) => {
                  const ec = ecoule(p);

                  const lim =
                    p.limite_sec != null
                      ? p.limite_sec *
                        1000
                      : null;

                  const dep =
                    depasse(p);

                  return (
                    <Link
                      key={p.id}
                      href="/admin/postes"
                      className={`block rounded-xl border px-4 py-3 transition hover:-translate-y-0.5 ${
                        dep
                          ? "border-red-200 bg-red-50"
                          : "border-black/5 bg-[#f8fafd]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`${num} flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[15px] font-black text-white ${
                            dep
                              ? "bg-red-600"
                              : "bg-[#061c59]"
                          }`}
                        >
                          {String(
                            p.numero
                          ).padStart(2, "0")}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-black text-ink">
                            {p.client}
                          </p>

                          <p className="text-[11px] font-medium text-muted">
                            depuis{" "}
                            {heureCourte(
                              p.debut as string
                            )}

                            {dep ? (
                              <span className="font-bold text-red-600">
                                {" "}
                                · temps
                                écoulé
                              </span>
                            ) : lim !==
                              null ? (
                              ` · reste ${formatDuree(
                                lim - ec
                              )}`
                            ) : (
                              ""
                            )}
                          </p>
                        </div>

                        <div className="text-right">
                          <p
                            className={`${num} text-[15px] font-black tabular-nums ${
                              dep
                                ? "text-red-600"
                                : "text-ink"
                            }`}
                          >
                            {formatDuree(
                              ec
                            )}
                          </p>

                          <p
                            className={`${num} text-[11px] font-black text-[#147cff]`}
                          >
                            {calculerMontant(
                              p.debut as string,
                              maintenant
                            )}{" "}
                            DA
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {reserves.length > 0 && (
              <div className="mt-5 border-t border-black/5 pt-4">
                <p className="mb-2 text-[12px] font-semibold text-muted">
                  Réservés{" "}
                  <span
                    className={`${num} ml-1 font-black text-ink`}
                  >
                    {reserves.length}
                  </span>
                </p>

                <div className="space-y-2">
                  {reserves.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 rounded-lg border border-black/5 border-l-[3px] border-l-amber-400 bg-white px-3.5 py-2.5"
                    >
                      <span
                        className={`${num} text-[15px] font-black text-ink`}
                      >
                        {String(
                          p.numero
                        ).padStart(
                          2,
                          "0"
                        )}
                      </span>

                      <span className="truncate text-[12px] font-medium text-muted">
                        {p.client}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ACCES RAPIDE */}

          <div
            className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_8px_30px_rgba(20,50,100,.04)]"
            style={apparition(240)}
          >
            <h2
              className={`${num} mb-4 text-base font-black text-ink`}
            >
              Accès rapide
            </h2>

            <div className="grid grid-cols-2 gap-2.5">
              {ACCES.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center gap-3 rounded-xl border border-black/5 px-3 py-3 transition hover:-translate-y-0.5 hover:bg-[#f3f7ff]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eef4fc] text-[#147cff]">
                    <Icon
                      name={a.icon}
                      className="h-[18px] w-[18px]"
                    />
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-black text-ink">
                      {a.label}
                    </p>

                    <p className="truncate text-[11px] font-medium text-muted">
                      {a.desc}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BOUTIQUE */}

      <div
        className="mt-8"
        style={apparition(300)}
      >
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2
              className={`${num} text-base font-black text-ink`}
            >
              Boutique
            </h2>

            <p className="mt-0.5 text-[11px] font-medium text-muted">
              Accessoires et articles
              de collection.
            </p>
          </div>

          <Link
            href="/admin/stock"
            className="flex items-center gap-1 text-[12px] font-bold text-[#147cff]"
          >
            Gérer les produits

            <Icon
              name="arrow"
              className="h-3 w-3"
            />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {BOUTIQUE.map((b) => (
            <div
              key={b.nom}
              className="overflow-hidden rounded-2xl border border-black/5 bg-white transition hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(30,70,140,.14)]"
            >
              <div
                className={`relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br ${b.bg}`}
              >
                <span className="absolute left-3 top-3 z-10 rounded-full bg-black/30 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white/90 backdrop-blur">
                  {b.categorie}
                </span>

                {b.image ? (
                  <Image
                    src={b.image}
                    alt={b.nom}
                    fill
                    sizes="(min-width: 1280px) 20vw, 50vw"
                    className="object-cover"
                  />
                ) : (
                  <svg
                    viewBox="0 0 64 40"
                    className="h-12 w-12 opacity-90"
                    fill="none"
                  >
                    <path
                      d="M14 10h36a10 10 0 0 1 10 10v4a10 10 0 0 1-10 10c-3 0-5-1.5-7-4l-3-4H24l-3 4c-2 2.5-4 4-7 4A10 10 0 0 1 4 24v-4A10 10 0 0 1 14 10z"
                      stroke="white"
                      strokeWidth="2"
                    />

                    <circle
                      cx="46"
                      cy="18"
                      r="1.6"
                      fill="white"
                    />

                    <circle
                      cx="50"
                      cy="22"
                      r="1.6"
                      fill="white"
                    />

                    <circle
                      cx="46"
                      cy="26"
                      r="1.6"
                      fill="white"
                    />

                    <circle
                      cx="42"
                      cy="22"
                      r="1.6"
                      fill="white"
                    />
                  </svg>
                )}
              </div>

              <div className="px-4 py-3">
                <h3 className="text-[13px] font-black text-ink">
                  {b.nom}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}