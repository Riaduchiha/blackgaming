"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chakra_Petch } from "next/font/google";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const num = chakra.className;

type Statut = "libre" | "occupee" | "reservee";
type ConsoleType = "PS4" | "PS5";

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

const MONTANTS_RAPIDES = [200, 500, 1000, 2000];

const FILTRES = [
  "Tous",
  "Libres",
  "Occupés",
  "Réservés",
] as const;

type Filtre = (typeof FILTRES)[number];

const DUREES: { label: string; sec: number | null }[] = [
  { label: "Illimité", sec: null },
  { label: "10 min", sec: 600 },
  { label: "15 min", sec: 900 },
  { label: "30 min", sec: 1800 },
  { label: "1 h", sec: 3600 },
  { label: "2 h", sec: 7200 },
];

const supabase = createSupabaseBrowserClient();

/* =========================================================
   AUDIO
========================================================= */

let audioCtx: AudioContext | null = null;

function obtenirAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!audioCtx) {
    const Ctx =
      window.AudioContext ??
      (
        window as unknown as {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!Ctx) return null;

    audioCtx = new Ctx();
  }

  return audioCtx;
}

function bip(
  ctx: AudioContext,
  debut: number,
  freq: number,
  duree: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "square";
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(0.0001, debut);
  gain.gain.exponentialRampToValueAtTime(0.22, debut + 0.02);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    debut + duree
  );

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(debut);
  osc.stop(debut + duree + 0.05);
}

function sonnerAlarme(): boolean {
  const ctx = obtenirAudio();

  if (!ctx) return false;

  if (ctx.state !== "running") {
    ctx.resume().catch(() => {});
    return false;
  }

  const t = ctx.currentTime;

  bip(ctx, t, 880, 0.2);
  bip(ctx, t + 0.3, 880, 0.2);
  bip(ctx, t + 0.6, 1175, 0.4);

  return true;
}

function sonnerTest() {
  const ctx = obtenirAudio();

  if (!ctx) return;

  const jouer = () => {
    const t = ctx.currentTime;

    bip(ctx, t, 880, 0.15);
    bip(ctx, t + 0.2, 1175, 0.25);
  };

  if (ctx.state === "running") {
    jouer();
  } else {
    ctx.resume().then(jouer).catch(() => {});
  }
}

/* =========================================================
   ICÔNES
========================================================= */

function Icon({
  name,
  className = "h-4 w-4",
}: {
  name: string;
  className?: string;
}) {
  const paths: Record<string, string> = {
    play: "M8 5v14l11-7-11-7Z",

    stop: "M6 6h12v12H6z",

    user:
      "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6",

    check:
      "M5 12.5 10 17.5 19 7.5",

    close:
      "M6 6l12 12M18 6 6 18",

    alarm:
      "M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Zm4.5 10a1.5 1.5 0 0 0 3 0",

    volume:
      "M11 5 6 9H3v6h3l5 4V5Z M15.5 8.5a5 5 0 0 1 0 7 M18.5 5.5a9 9 0 0 1 0 13",

    volumeOff:
      "M11 5 6 9H3v6h3l5 4V5Z M16 9l5 6 M21 9l-5 6",

    gamepad:
      "M7 9h10a5 5 0 0 1 5 5v0a4 4 0 0 1-7 2.6L14 15h-4l-1 1.6A4 4 0 0 1 2 14v0a5 5 0 0 1 5-5Z M8 12v4M6 14h4",

    plus:
      "M12 5v14M5 12h14",

    minus:
      "M5 12h14",

    cash:
      "M3 7h18v10H3V7Zm9 2.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",

    clock:
      "M12 7v5l3 3M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",

    calendar:
      "M4 9h16M7 3v4M17 3v4M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z",

    chevron:
      "M6 9l6 6 6-6",

    refresh:
      "M20 11a8 8 0 1 0 2 5M20 5v6h-6",

    wallet:
      "M3 7h18v13H3V7Zm0 0 2-3h14l3 3M16 13h5",
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d={paths[name] ?? paths.clock}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function getConsoleType(numero: number): ConsoleType {
  return numero <= 6 ? "PS4" : "PS5";
}

function getConsoleLabel(numero: number) {
  return `${getConsoleType(numero)}-${String(numero).padStart(
    2,
    "0"
  )}`;
}

function getConsoleStyle(type: ConsoleType) {
  if (type === "PS5") {
    return {
      badge:
        "border-violet-200 bg-violet-50 text-violet-700",
      dot: "bg-violet-500",
      glow: "shadow-[0_12px_35px_rgba(124,58,237,.10)]",
    };
  }

  return {
    badge:
      "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
    glow: "shadow-[0_12px_35px_rgba(20,124,255,.10)]",
  };
}

function Anneau({
  progression,
  couleur,
}: {
  progression: number;
  couleur: string;
}) {
  const r = 18;
  const c = 2 * Math.PI * r;

  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      className="-rotate-90"
    >
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,.12)"
        strokeWidth="3"
      />

      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke={couleur}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={
          c * (1 - Math.min(1, progression))
        }
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

function formatLimite(sec: number) {
  if (sec < 3600) {
    return `${Math.round(sec / 60)} min`;
  }

  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);

  return m === 0
    ? `${h} h`
    : `${h} h ${String(m).padStart(2, "0")}`;
}

function heureCourte(valeur: string | number) {
  return new Date(valeur).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calculerMontant(debut: string, fin: number) {
  const heures =
    Math.max(
      0,
      fin - new Date(debut).getTime()
    ) / HEURE;

  return Math.ceil(
    (heures * TARIF_HORAIRE) / 10
  ) * 10;
}

function estimer(sec: number) {
  return Math.ceil(
    ((sec / 3600) * TARIF_HORAIRE) / 10
  ) * 10;
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

const STATUT_LABEL: Record<Statut, string> = {
  libre: "Libre",
  occupee: "Occupé",
  reservee: "Réservé",
};

/* =========================================================
   PAGE
========================================================= */

export default function PostesPage() {
  const [postes, setPostes] = useState<Poste[]>([]);
  const [sessions, setSessions] = useState<SessionLigne[]>([]);

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const [maintenant, setMaintenant] = useState(Date.now());

  const [filtre, setFiltre] =
    useState<Filtre>("Tous");

  const [selectionId, setSelectionId] =
    useState<number | null>(null);

  const [nomClient, setNomClient] = useState("");

  const [montantRecu, setMontantRecu] =
    useState(0);

  const [finFige, setFinFige] =
    useState<number | null>(null);

  const [dernier, setDernier] =
    useState<{
      numero: number;
      montant: number;
      rendu: number;
    } | null>(null);

  const [limiteChoisie, setLimiteChoisie] =
    useState<number | null>(null);

  const [limiteCustom, setLimiteCustom] =
    useState("");

  const [ignorees, setIgnorees] =
    useState<Set<string>>(new Set());

  const [son, setSon] = useState(true);

  const [sonBloque, setSonBloque] =
    useState(false);

  const [encaissementValide, setEncaissementValide] =
    useState(false);

  const ca = sessions.reduce(
    (total, session) =>
      total + session.montant,
    0
  );

  const caAffiche = useCompteur(ca);

  /* =======================================================
     TEMPS
  ======================================================= */

  const ecouleDe = (p: Poste) =>
    p.debut
      ? maintenant -
        new Date(p.debut).getTime()
      : 0;

  const limiteMs = (p: Poste) =>
    p.limite_sec != null
      ? p.limite_sec * 1000
      : null;

  const estExpire = (p: Poste) => {
    const lim = limiteMs(p);

    return (
      p.statut === "occupee" &&
      !!p.debut &&
      lim !== null &&
      ecouleDe(p) >= lim
    );
  };

  const cle = (p: Poste) =>
    `${p.id}|${p.debut}|${p.limite_sec}`;

  const alertes = postes.filter(
    (p) =>
      estExpire(p) &&
      !ignorees.has(cle(p))
  );

  /* =======================================================
     SESSIONS
  ======================================================= */

  const chargerSessions = useCallback(
    async () => {
      const debutJour = new Date();

      debutJour.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from("sessions")
        .select(
          "id, poste_numero, client, debut, fin, montant"
        )
        .gte(
          "fin",
          debutJour.toISOString()
        )
        .order("fin", {
          ascending: false,
        });

      setSessions(
        (data ?? []) as SessionLigne[]
      );
    },
    []
  );

  /* =======================================================
     AUDIO
  ======================================================= */

  const jouerAlarme = useCallback(() => {
    setSonBloque(!sonnerAlarme());
  }, []);

  useEffect(() => {
    const timer = setInterval(
      () => setMaintenant(Date.now()),
      1000
    );

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function surTouche(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectionId(null);
      }
    }

    window.addEventListener(
      "keydown",
      surTouche
    );

    return () =>
      window.removeEventListener(
        "keydown",
        surTouche
      );
  }, []);

  useEffect(() => {
    const debloquer = () => {
      const ctx = obtenirAudio();

      if (!ctx) return;

      if (ctx.state === "running") {
        setSonBloque(false);
      } else {
        ctx
          .resume()
          .then(() => setSonBloque(false))
          .catch(() => {});
      }
    };

    window.addEventListener(
      "pointerdown",
      debloquer
    );

    window.addEventListener(
      "keydown",
      debloquer
    );

    return () => {
      window.removeEventListener(
        "pointerdown",
        debloquer
      );

      window.removeEventListener(
        "keydown",
        debloquer
      );
    };
  }, []);

  useEffect(() => {
    if (!son || alertes.length === 0) {
      return;
    }

    jouerAlarme();

    const id = setInterval(
      jouerAlarme,
      5000
    );

    return () => clearInterval(id);
  }, [
    alertes.length,
    son,
    jouerAlarme,
  ]);

  /* =======================================================
     CHARGEMENT + REALTIME
  ======================================================= */

  useEffect(() => {
    async function charger() {
      const {
        data,
        error,
      } = await supabase
        .from("postes")
        .select("*")
        .order("numero");

      if (error) {
        setErreur(
          "Impossible de charger les postes : " +
            error.message
        );
      } else {
        setPostes(
          (data ?? []) as Poste[]
        );
      }

      setChargement(false);
    }

    charger();
    chargerSessions();

    const channel = supabase
      .channel("postes-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "postes",
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const ancienne = payload.old as {
              id?: number;
            };

            if (ancienne?.id) {
              setPostes((prev) =>
                prev.filter(
                  (p) =>
                    p.id !== ancienne.id
                )
              );
            }

            return;
          }

          const ligne =
            payload.new as Poste;

          if (!ligne?.id) return;

          setPostes((prev) => {
            const existe = prev.some(
              (p) => p.id === ligne.id
            );

            if (!existe) {
              return [...prev, ligne].sort(
                (a, b) =>
                  a.numero - b.numero
              );
            }

            return prev.map((p) =>
              p.id === ligne.id
                ? ligne
                : p
            );
          });
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

  /* =======================================================
     ACTIONS
  ======================================================= */

  async function majPoste(
    id: number,
    champs: Partial<Poste>
  ) {
    setErreur("");

    const { error } =
      await supabase
        .from("postes")
        .update(champs)
        .eq("id", id);

    if (error) {
      setErreur(
        "Action impossible : " +
          error.message
      );

      return false;
    }

    setPostes((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, ...champs }
          : p
      )
    );

    return true;
  }

  function ignorer(p: Poste) {
    setIgnorees((prev) =>
      new Set(prev).add(cle(p))
    );
  }

  function choisir(id: number) {
    setSelectionId(id);

    setNomClient("");
    setMontantRecu(0);
    setFinFige(null);
    setDernier(null);

    setLimiteChoisie(null);
    setLimiteCustom("");

    setEncaissementValide(false);

    const p = postes.find(
      (x) => x.id === id
    );

    if (p && estExpire(p)) {
      ignorer(p);
    }
  }

  function fermerPanneau() {
    setSelectionId(null);
    setFinFige(null);
    setEncaissementValide(false);
  }

  function basculerSon() {
    const suivant = !son;

    setSon(suivant);

    if (suivant) {
      sonnerTest();
    }
  }

  async function demarrer(p: Poste) {
    const ok = await majPoste(
      p.id,
      {
        statut: "occupee",
        debut:
          new Date().toISOString(),
        client:
          nomClient.trim() ||
          p.client ||
          "Client comptoir",
        limite_sec: limiteChoisie,
      }
    );

    if (ok) {
      setNomClient("");
      setLimiteChoisie(null);
      setLimiteCustom("");
    }
  }

  async function reserver(p: Poste) {
    const ok = await majPoste(
      p.id,
      {
        statut: "reservee",
        client:
          nomClient.trim() ||
          "Client réservé",
      }
    );

    if (ok) {
      setNomClient("");
    }
  }

  async function annulerReservation(
    p: Poste
  ) {
    await majPoste(p.id, {
      statut: "libre",
      client: null,
    });
  }

  async function prolonger(
    p: Poste,
    minutes: number
  ) {
    if (!p.debut) return;

    const ecoule = Math.floor(
      (Date.now() -
        new Date(p.debut).getTime()) /
        1000
    );

    const base =
      p.limite_sec != null &&
      p.limite_sec > ecoule
        ? p.limite_sec
        : ecoule;

    await majPoste(p.id, {
      limite_sec:
        base + minutes * 60,
    });
  }

  async function programmerAlerte(
    p: Poste,
    minutes: number
  ) {
    if (!p.debut) return;

    const ecoule = Math.floor(
      (Date.now() -
        new Date(p.debut).getTime()) /
        1000
    );

    await majPoste(p.id, {
      limite_sec:
        ecoule + minutes * 60,
    });
  }

  async function retirerLimite(
    p: Poste
  ) {
    await majPoste(p.id, {
      limite_sec: null,
    });
  }

  function terminer(p: Poste) {
    setFinFige(Date.now());
    setMontantRecu(0);
    setEncaissementValide(false);
    ignorer(p);
  }

  async function encaisser(p: Poste) {
    if (
      !p.debut ||
      finFige === null
    ) {
      return;
    }

    const montant =
      calculerMontant(
        p.debut,
        finFige
      );

    if (montantRecu < montant) {
      setErreur(
        `Montant insuffisant. Il manque ${
          montant - montantRecu
        } DA.`
      );

      return;
    }

    const rendu =
      Math.max(
        0,
        montantRecu - montant
      );

    const { error } =
      await supabase
        .from("sessions")
        .insert({
          poste_numero: p.numero,
          client: p.client,
          debut: p.debut,
          fin: new Date(
            finFige
          ).toISOString(),
          montant,
          recu: montantRecu,
          rendu,
        });

    if (error) {
      setErreur(
        "Encaissement impossible : " +
          error.message
      );

      return;
    }

    const ok = await majPoste(
      p.id,
      {
        statut: "libre",
        debut: null,
        client: null,
        limite_sec: null,
      }
    );

    if (ok) {
      await chargerSessions();

      setDernier({
        numero: p.numero,
        montant,
        rendu,
      });

      setEncaissementValide(true);
      setFinFige(null);
      setMontantRecu(0);
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (chargement) {
    return (
      <div className="animate-pulse">
        <div className="mb-5 h-10 w-40 rounded bg-black/5" />

        <div className="mb-6 h-36 rounded-2xl bg-black/5" />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({
            length: 8,
          }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-black/5"
            />
          ))}
        </div>
      </div>
    );
  }

  /* =======================================================
     CALCULS
  ======================================================= */

  const selection =
    postes.find(
      (p) => p.id === selectionId
    ) ?? null;

  const total = selection?.debut
    ? calculerMontant(
        selection.debut,
        finFige ?? maintenant
      )
    : 0;

  const monnaie =
    montantRecu - total;

  const ecouleSel = selection
    ? ecouleDe(selection)
    : 0;

  const limMsSel = selection
    ? limiteMs(selection)
    : null;

  const restantSel =
    limMsSel !== null
      ? limMsSel - ecouleSel
      : null;

  const depasseSel = selection
    ? estExpire(selection)
    : false;

  const nbLibres = postes.filter(
    (p) => p.statut === "libre"
  ).length;

  const nbOccupes = postes.filter(
    (p) => p.statut === "occupee"
  ).length;

  const nbReserves = postes.filter(
    (p) => p.statut === "reservee"
  ).length;

  const tauxOccupation =
    postes.length
      ? Math.round(
          (nbOccupes /
            postes.length) *
            100
        )
      : 0;

  const compteurs: Record<
    Filtre,
    number
  > = {
    Tous: postes.length,
    Libres: nbLibres,
    Occupés: nbOccupes,
    Réservés: nbReserves,
  };

  const postesFiltres =
    postes.filter((p) => {
      if (filtre === "Libres") {
        return p.statut === "libre";
      }

      if (filtre === "Occupés") {
        return (
          p.statut ===
          "occupee"
        );
      }

      if (filtre === "Réservés") {
        return (
          p.statut ===
          "reservee"
        );
      }

      return true;
    });

  /* =======================================================
     PLANNING
  ======================================================= */

  const finDate = new Date(
    maintenant
  );

  finDate.setMinutes(0, 0, 0);
  finDate.setHours(
    finDate.getHours() + 2
  );

  const fenetreFin =
    finDate.getTime();

  const minuit = new Date(
    maintenant
  );

  minuit.setHours(0, 0, 0, 0);

  const debutsMs = [
    ...sessions.map((s) =>
      new Date(s.debut).getTime()
    ),

    ...postes
      .filter(
        (p) =>
          p.statut === "occupee" &&
          p.debut
      )
      .map((p) =>
        new Date(
          p.debut as string
        ).getTime()
      ),
  ];

  const plusTot = debutsMs.length
    ? Math.min(...debutsMs)
    : maintenant - 6 * HEURE;

  const debutDate = new Date(
    Math.min(
      plusTot,
      fenetreFin - 6 * HEURE
    )
  );

  debutDate.setMinutes(0, 0, 0);

  const fenetreDebut = Math.max(
    debutDate.getTime(),
    minuit.getTime()
  );

  const span =
    fenetreFin - fenetreDebut;

  const pct = (t: number) =>
    Math.min(
      100,
      Math.max(
        0,
        ((t - fenetreDebut) /
          span) *
          100
      )
    );

  const pas =
    span > 10 * HEURE
      ? 2 * HEURE
      : HEURE;

  const ticks: number[] = [];

  for (
    let t = fenetreDebut;
    t <= fenetreFin;
    t += pas
  ) {
    ticks.push(t);
  }

  /* =======================================================
     COURBE CA
  ======================================================= */

  const W = 220;
  const H = 44;

  const triees = [...sessions].sort(
    (a, b) =>
      new Date(a.fin).getTime() -
      new Date(b.fin).getTime()
  );

  const maxCa = ca || 1;

  const largeurCourbe = Math.max(
    maintenant - fenetreDebut,
    1
  );

  const xCourbe = (t: number) =>
    Math.min(
      W,
      Math.max(
        0,
        ((t - fenetreDebut) /
          largeurCourbe) *
          W
      )
    );

  const yCourbe = (v: number) =>
    H -
    3 -
    (v / maxCa) *
      (H - 8);

  let cumul = 0;

  let ligne = `M 0 ${yCourbe(0)}`;

  let yPrec = yCourbe(0);

  triees.forEach((s) => {
    cumul += s.montant;

    const x = xCourbe(
      new Date(s.fin).getTime()
    );

    const y = yCourbe(cumul);

    ligne += ` L ${x} ${yPrec} L ${x} ${y}`;

    yPrec = y;
  });

  ligne += ` L ${W} ${yPrec}`;

  const aire = `${ligne} L ${W} ${H} L 0 ${H} Z`;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="pb-6">
      {/* =================================================
          ALERTES AMÉLIORÉES
      ================================================= */}

      {alertes.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3 sm:top-5 sm:px-4">
          {alertes.map((p) => {
            const depassement =
              Math.max(
                0,
                ecouleDe(p) -
                  (p.limite_sec ?? 0) *
                    1000
              );

            return (
              <div
                key={cle(p)}
                className="pointer-events-auto w-full max-w-[520px] overflow-hidden rounded-2xl border border-red-200 bg-white shadow-[0_18px_55px_rgba(127,29,29,.25)]"
                style={{
                  animation:
                    "toast-in .35s cubic-bezier(.16,1,.3,1)",
                }}
              >
                {/* bande rouge */}
                <div className="h-1 w-full bg-red-500" />

                <div className="p-3.5 sm:p-4">
                  <div className="flex items-start gap-3">
                    {/* icône */}
                    <div
                      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"
                      style={{
                        animation:
                          "alert-ring 1.8s ease-in-out infinite",
                      }}
                    >
                      <span className="absolute inset-0 rounded-xl border border-red-200" />

                      <Icon
                        name="alarm"
                        className="relative h-5 w-5"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-md bg-red-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-red-700">
                              Temps écoulé
                            </span>

                            <span
                              className={`rounded-md px-2 py-1 text-[9px] font-black ${
                                getConsoleType(
                                  p.numero
                                ) === "PS5"
                                  ? "bg-violet-50 text-violet-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {getConsoleType(
                                p.numero
                              )}
                            </span>
                          </div>

                          <p className="mt-1.5 truncate text-[14px] font-bold text-ink sm:text-[15px]">
                            {getConsoleLabel(
                              p.numero
                            )}
                            <span className="mx-1.5 text-black/20">
                              ·
                            </span>
                            {p.client ||
                              "Client comptoir"}
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            ignorer(p)
                          }
                          aria-label="Fermer l'alerte"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Icon
                            name="close"
                            className="h-4 w-4"
                          />
                        </button>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted">
                        <span>
                          Limite :{" "}
                          <strong className="text-ink">
                            {formatLimite(
                              p.limite_sec ??
                                0
                            )}
                          </strong>
                        </span>

                        <span>
                          Dépassement :{" "}
                          <strong className="text-red-600">
                            +
                            {formatDuree(
                              depassement
                            )}
                          </strong>
                        </span>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() =>
                            prolonger(
                              p,
                              10
                            )
                          }
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3 py-2.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-red-700 active:scale-[.98] sm:flex-none"
                        >
                          <Icon
                            name="plus"
                            className="h-3.5 w-3.5"
                          />
                          +10 min
                        </button>

                        <button
                          onClick={() =>
                            choisir(p.id)
                          }
                          className="flex flex-1 items-center justify-center rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[11px] font-bold text-ink transition hover:bg-[#f3f7ff] active:scale-[.98] sm:flex-none"
                        >
                          Voir le poste
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-black tracking-tight text-ink">
              POSTES
            </h1>

            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600">
              10 consoles
            </span>
          </div>

          <p className="mt-1.5 text-sm text-muted">
            Gestion des consoles ·{" "}
            <strong className="text-ink">
              300 DA / heure
            </strong>
          </p>
        </div>

        <button
          onClick={basculerSon}
          className="flex w-fit items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[12px] font-semibold text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f3f7ff]"
        >
          <Icon
            name={
              son
                ? "volume"
                : "volumeOff"
            }
            className="h-4 w-4"
          />

          {son
            ? "Alarme activée"
            : "Alarme coupée"}
        </button>
      </div>

      {son && sonBloque && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-medium text-amber-800">
          Clique une fois sur la page pour
          autoriser l'alarme sonore du navigateur.
        </div>
      )}

      {erreur && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          <span className="min-w-0">
            {erreur}
          </span>

          <button
            onClick={() =>
              setErreur("")
            }
            className="shrink-0 text-red-400 hover:text-red-700"
          >
            <Icon name="close" />
          </button>
        </div>
      )}

      {/* =================================================
          SYNTHESE DARK
      ================================================= */}

      <div
        className="relative mb-7 overflow-hidden rounded-3xl px-4 py-5 text-white shadow-[0_18px_50px_rgba(3,18,61,.18)] sm:px-6 sm:py-6 md:px-7"
        style={{
          background:
            "radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px) 0 0 / 18px 18px, radial-gradient(circle at 92% 0%, rgba(38,140,255,.35), transparent 42%), linear-gradient(135deg, #061c59 0%, #03123d 100%)",
        }}
      >
        <div className="grid items-center gap-6 lg:grid-cols-[auto_1fr_auto]">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-medium text-white/55">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Système en direct
            </p>

            <p
              className={`${num} mt-2 text-[36px] font-bold leading-none tracking-tight sm:text-[42px]`}
            >
              {caAffiche.toLocaleString(
                "fr-FR"
              )}

              <span className="ml-2 text-lg font-medium text-white/40">
                DA
              </span>
            </p>

            <div className="mt-3 flex items-end gap-3">
              <svg
                width={W}
                height={H}
                viewBox={`0 0 ${W} ${H}`}
                className="max-w-full overflow-visible"
              >
                <defs>
                  <linearGradient
                    id="courbe-ca"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#4aa8ff"
                      stopOpacity="0.45"
                    />

                    <stop
                      offset="100%"
                      stopColor="#4aa8ff"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>

                <path
                  d={aire}
                  fill="url(#courbe-ca)"
                />

                <path
                  d={ligne}
                  fill="none"
                  stroke="#4aa8ff"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>

              <p className="hidden pb-1 text-[11px] leading-tight text-white/45 sm:block">
                {sessions.length} session
                {sessions.length > 1
                  ? "s"
                  : ""}
                <br />
                encaissée
                {sessions.length > 1
                  ? "s"
                  : ""}
              </p>
            </div>
          </div>

          <div className="lg:px-6">
            <div className="mb-2.5 flex items-baseline justify-between">
              <p className="text-[11px] font-medium text-white/55">
                Occupation de la salle
              </p>

              <p
                className={`${num} text-sm font-semibold`}
              >
                {tauxOccupation}%

                <span className="ml-2 text-white/40">
                  {nbOccupes} /{" "}
                  {postes.length}
                </span>
              </p>
            </div>

            <div className="flex gap-1.5">
              {postes.map((p) => (
                <button
                  key={p.id}
                  onClick={() =>
                    choisir(p.id)
                  }
                  title={`${getConsoleLabel(
                    p.numero
                  )} · ${
                    STATUT_LABEL[
                      p.statut
                    ]
                  }`}
                  className={`h-3 flex-1 rounded-sm transition hover:scale-y-150 ${
                    p.statut ===
                    "occupee"
                      ? estExpire(p)
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

            <div className="mt-3 flex gap-4 text-[10px] text-white/45">
              <span>
                <strong className="text-white">
                  6
                </strong>{" "}
                PS4
              </span>

              <span>
                <strong className="text-white">
                  4
                </strong>{" "}
                PS5
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 sm:flex sm:gap-7 text-[12px]">
            {[
              {
                label: "Libres",
                value: nbLibres,
                dot: "bg-white/40",
              },
              {
                label: "Occupés",
                value: nbOccupes,
                dot: "bg-[#4aa8ff]",
              },
              {
                label: "Réservés",
                value: nbReserves,
                dot: "bg-amber-400",
              },
            ].map((x) => (
              <div key={x.label}>
                <p className="flex items-center gap-1.5 text-white/50">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${x.dot}`}
                  />
                  {x.label}
                </p>

                <p
                  className={`${num} mt-0.5 text-2xl font-semibold`}
                >
                  {x.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =================================================
          FILTRES
      ================================================= */}

      <div className="mb-5 flex gap-5 overflow-x-auto border-b border-black/10">
        {FILTRES.map((f) => (
          <button
            key={f}
            onClick={() =>
              setFiltre(f)
            }
            className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-[13px] font-semibold transition ${
              filtre === f
                ? "border-[#147cff] text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {f}

            <span
              className={`${num} ml-1.5 rounded-full bg-black/[0.04] px-1.5 py-0.5 text-[10px] text-muted`}
            >
              {compteurs[f]}
            </span>
          </button>
        ))}
      </div>

      {/* =================================================
          CARTES POSTES
      ================================================= */}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {postesFiltres.map(
          (p, i) => {
            const actif =
              p.id === selectionId;

            const enCours =
              p.statut ===
                "occupee" &&
              !!p.debut;

            const ecoule =
              ecouleDe(p);

            const lim =
              limiteMs(p);

            const depasse =
              estExpire(p);

            const restant =
              lim !== null
                ? lim - ecoule
                : null;

            const type =
              getConsoleType(
                p.numero
              );

            const consoleStyle =
              getConsoleStyle(type);

            const base = depasse
              ? "border-red-400 bg-[#3a0c14] text-white"
              : enCours
                ? "border-[#0b3a94] bg-[#061c59] text-white"
                : p.statut ===
                    "reservee"
                  ? "border-black/5 border-l-[3px] border-l-amber-400 bg-white text-ink"
                  : "border-black/5 bg-white text-ink";

            const anim = depasse
              ? `rise .5s ease-out ${
                  i * 40
                }ms both`
              : enCours
                ? `rise .5s ease-out ${
                    i * 40
                  }ms both, glow-pulse 3.2s ease-in-out ${
                    i * 40 + 500
                  }ms infinite`
                : `rise .5s ease-out ${
                    i * 40
                  }ms both`;

            return (
              <button
                key={p.id}
                onClick={() =>
                  choisir(p.id)
                }
                style={{
                  animation: anim,
                }}
                className={`group relative flex min-h-[235px] flex-col overflow-hidden rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-1 hover:shadow-xl active:scale-[.99] ${base} ${
                  actif
                    ? "ring-2 ring-[#147cff] ring-offset-2 ring-offset-[#f3f7ff]"
                    : ""
                }`}
              >
                {/* haut */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${
                          depasse
                            ? "border-red-300/30 bg-red-500/20 text-red-200"
                            : enCours
                              ? "border-white/10 bg-white/10 text-white/70"
                              : consoleStyle.badge
                        }`}
                      >
                        {type}
                      </span>

                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          depasse
                            ? "bg-red-400"
                            : enCours
                              ? "animate-pulse bg-blue-400"
                              : p.statut ===
                                  "reservee"
                                ? "bg-amber-400"
                                : "bg-emerald-500"
                        }`}
                      />
                    </div>

                    <p
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        depasse
                          ? "text-red-300"
                          : enCours
                            ? "text-white/45"
                            : "text-muted"
                      }`}
                    >
                      {depasse
                        ? "Temps écoulé"
                        : STATUT_LABEL[
                            p.statut
                          ]}
                    </p>

                    <p
                      className={`${num} mt-0.5 text-[42px] font-bold leading-none tracking-tight`}
                    >
                      {String(
                        p.numero
                      ).padStart(
                        2,
                        "0"
                      )}
                    </p>
                  </div>

                  {enCours && (
                    <Anneau
                      progression={
                        lim
                          ? Math.min(
                              1,
                              ecoule /
                                lim
                            )
                          : (ecoule %
                              HEURE) /
                            HEURE
                      }
                      couleur={
                        depasse
                          ? "#f87171"
                          : "#4aa8ff"
                      }
                    />
                  )}
                </div>

                {/* contenu */}
                <div className="mt-auto pt-5">
                  {enCours ? (
                    <>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
                          <Icon
                            name="user"
                            className="h-3 w-3"
                          />
                        </span>

                        <p className="truncate text-[11px] font-medium text-white/65">
                          {p.client}
                        </p>
                      </div>

                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-white/35">
                            Temps
                          </p>

                          <p
                            className={`${num} mt-0.5 text-xl font-bold tabular-nums`}
                          >
                            {formatDuree(
                              ecoule
                            )}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[9px] uppercase tracking-wider text-white/35">
                            À payer
                          </p>

                          <p
                            className={`${num} mt-0.5 text-lg font-bold ${
                              depasse
                                ? "text-red-300"
                                : "text-[#4aa8ff]"
                            }`}
                          >
                            {calculerMontant(
                              p.debut as string,
                              maintenant
                            )}{" "}
                            DA
                          </p>
                        </div>
                      </div>

                      {lim !==
                        null &&
                      restant !==
                        null ? (
                        <div className="mt-3">
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div
                              className={`h-full rounded-full ${
                                depasse
                                  ? "bg-red-500"
                                  : "bg-[#4aa8ff]"
                              }`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  (ecoule /
                                    lim) *
                                    100
                                )}%`,
                              }}
                            />
                          </div>

                          <p
                            className={`${num} mt-1.5 text-[10px] font-semibold ${
                              depasse
                                ? "text-red-300"
                                : "text-white/45"
                            }`}
                          >
                            {depasse
                              ? `+${formatDuree(
                                  -restant
                                )}`
                              : `reste ${formatDuree(
                                  restant
                                )}`}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-3 text-[10px] text-white/30">
                          Session sans limite
                        </p>
                      )}
                    </>
                  ) : p.statut ===
                    "reservee" ? (
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted">
                        Réservé pour
                      </p>

                      <p className="mt-1 truncate text-[13px] font-semibold text-ink">
                        {p.client}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-muted">
                          Disponible
                        </p>

                        <p className="mt-1 text-[13px] font-semibold text-ink">
                          Prêt à jouer
                        </p>
                      </div>

                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          consoleStyle.badge
                        }`}
                      >
                        <Icon
                          name="play"
                          className="h-3.5 w-3.5"
                        />
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          }
        )}
      </div>

      {/* =================================================
          PLANNING
      ================================================= */}

      <div className="mt-9">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <h2
              className={`${num} text-base font-bold text-ink`}
            >
              Planning de la journée
            </h2>

            <p className="mt-0.5 text-[11px] text-muted">
              Sessions poste par poste.
            </p>
          </div>

          <div className="hidden items-center gap-4 text-[11px] text-muted sm:flex">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-sm bg-[#147cff]/80" />
              Terminée
            </span>

            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-sm bg-gradient-to-r from-[#0b3a94] to-[#4aa8ff]" />
              En cours
            </span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white p-5 shadow-[0_10px_30px_rgba(3,18,61,.04)]">
          <div className="min-w-[650px]">
            <div className="mb-1.5 flex gap-3">
              <div className="w-[72px] shrink-0" />

              <div className="relative h-4 flex-1">
                {ticks.map(
                  (t) => (
                    <span
                      key={t}
                      className={`${num} absolute -translate-x-1/2 text-[10px] text-muted`}
                      style={{
                        left: `${pct(
                          t
                        )}%`,
                      }}
                    >
                      {String(
                        new Date(
                          t
                        ).getHours()
                      ).padStart(
                        2,
                        "0"
                      )}
                      h
                    </span>
                  )
                )}

                <span
                  className={`${num} absolute -translate-x-1/2 rounded bg-red-500 px-1.5 py-px text-[9px] font-semibold text-white`}
                  style={{
                    left: `${pct(
                      maintenant
                    )}%`,
                    top: -1,
                  }}
                >
                  {heureCourte(
                    maintenant
                  )}
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-[84px] right-0">
                {ticks.map(
                  (t) => (
                    <div
                      key={t}
                      className="absolute inset-y-0 border-l border-black/[0.06]"
                      style={{
                        left: `${pct(
                          t
                        )}%`,
                      }}
                    />
                  )
                )}

                <div
                  className="absolute inset-y-0 border-l-2 border-red-400/80"
                  style={{
                    left: `${pct(
                      maintenant
                    )}%`,
                  }}
                />
              </div>

              {postes.map(
                (p) => {
                  const type =
                    getConsoleType(
                      p.numero
                    );

                  return (
                    <div
                      key={p.id}
                      className="flex h-9 items-center gap-3"
                    >
                      <span
                        className={`${num} flex w-[72px] shrink-0 items-center gap-2 text-[10px] font-bold text-muted`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            type ===
                            "PS5"
                              ? "bg-violet-500"
                              : "bg-blue-500"
                          }`}
                        />

                        {getConsoleLabel(
                          p.numero
                        )}
                      </span>

                      <div className="relative h-5 flex-1 rounded-md bg-[#f3f7ff]">
                        {sessions
                          .filter(
                            (s) =>
                              s.poste_numero ===
                              p.numero
                          )
                          .map(
                            (s) => {
                              const a =
                                pct(
                                  new Date(
                                    s.debut
                                  ).getTime()
                                );

                              const b =
                                pct(
                                  new Date(
                                    s.fin
                                  ).getTime()
                                );

                              return (
                                <div
                                  key={
                                    s.id
                                  }
                                  title={`${getConsoleLabel(
                                    s.poste_numero
                                  )} · ${
                                    s.client ??
                                    "—"
                                  } · ${heureCourte(
                                    s.debut
                                  )} à ${heureCourte(
                                    s.fin
                                  )} · ${
                                    s.montant
                                  } DA`}
                                  className="absolute inset-y-0.5 rounded-[4px] bg-[#147cff]/80"
                                  style={{
                                    left: `${a}%`,
                                    width: `${Math.max(
                                      b -
                                        a,
                                      0.6
                                    )}%`,
                                  }}
                                />
                              );
                            }
                          )}

                        {p.statut ===
                          "occupee" &&
                          p.debut && (
                            <div
                              title={`${getConsoleLabel(
                                p.numero
                              )} · ${
                                p.client ??
                                "—"
                              } · en cours depuis ${heureCourte(
                                p.debut
                              )}`}
                              className={`absolute inset-y-0.5 rounded-[4px] bg-gradient-to-r ${
                                estExpire(
                                  p
                                )
                                  ? "from-red-800 to-red-500"
                                  : "from-[#0b3a94] to-[#4aa8ff]"
                              }`}
                              style={{
                                left: `${pct(
                                  new Date(
                                    p.debut
                                  ).getTime()
                                )}%`,
                                width: `${Math.max(
                                  pct(
                                    maintenant
                                  ) -
                                    pct(
                                      new Date(
                                        p.debut
                                      ).getTime()
                                    ),
                                  0.6
                                )}%`,
                              }}
                            />
                          )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =================================================
          HISTORIQUE
      ================================================= */}

      <div className="mt-9">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <h2
              className={`${num} text-base font-bold text-ink`}
            >
              Sessions du jour
            </h2>

            <p className="mt-0.5 text-[11px] text-muted">
              Historique des encaissements.
            </p>
          </div>

          <p className="text-[11px] text-muted">
            {sessions.length} au total
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_10px_30px_rgba(3,18,61,.04)]">
          <div className="hidden grid-cols-[100px_1fr_100px_100px_70px] gap-3 border-b border-black/5 bg-[#f8fafd] px-5 py-3 text-[9px] font-bold uppercase tracking-wider text-muted sm:grid">
            <span>Poste</span>
            <span>Client</span>
            <span>Durée</span>
            <span className="text-right">
              Montant
            </span>
            <span className="text-right">
              Fin
            </span>
          </div>

          {sessions.length ===
          0 ? (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3f7ff] text-muted">
                <Icon
                  name="wallet"
                  className="h-5 w-5"
                />
              </div>

              <p className="mt-3 text-[13px] font-semibold text-ink">
                Aucun encaissement
              </p>

              <p className="mt-1 text-[11px] text-muted">
                Les sessions encaissées apparaîtront ici.
              </p>
            </div>
          ) : (
            sessions
              .slice(0, 8)
              .map((s) => {
                const type =
                  getConsoleType(
                    s.poste_numero
                  );

                return (
                  <div
                    key={s.id}
                    className="grid grid-cols-2 gap-3 border-b border-black/5 px-5 py-4 last:border-0 sm:grid-cols-[100px_1fr_100px_100px_70px] sm:items-center"
                  >
                    <div>
                      <span
                        className={`rounded-md border px-2 py-1 text-[9px] font-black ${
                          type ===
                          "PS5"
                            ? "border-violet-100 bg-violet-50 text-violet-700"
                            : "border-blue-100 bg-blue-50 text-blue-700"
                        }`}
                      >
                        {getConsoleLabel(
                          s.poste_numero
                        )}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-ink">
                        {s.client ??
                          "Client comptoir"}
                      </p>

                      <p className="mt-0.5 text-[10px] text-muted sm:hidden">
                        {formatDureeCourte(
                          new Date(
                            s.fin
                          ).getTime() -
                            new Date(
                              s.debut
                            ).getTime()
                        )}
                      </p>
                    </div>

                    <span className="hidden text-[11px] text-muted sm:block">
                      {formatDureeCourte(
                        new Date(
                          s.fin
                        ).getTime() -
                          new Date(
                            s.debut
                          ).getTime()
                      )}
                    </span>

                    <span
                      className={`${num} text-right text-[14px] font-bold text-ink`}
                    >
                      {s.montant.toLocaleString(
                        "fr-FR"
                      )}{" "}
                      DA
                    </span>

                    <span className="text-right text-[11px] text-muted">
                      {heureCourte(
                        s.fin
                      )}
                    </span>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* =================================================
          DRAWER
      ================================================= */}

      {selection && (
        <>
          <div
            className="fixed inset-0 z-40 bg-[#03123d]/40 backdrop-blur-[3px]"
            style={{
              animation:
                "fade-in .25s ease-out",
            }}
            onClick={
              fermerPanneau
            }
          />

          <aside
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[450px] flex-col bg-white shadow-[-20px_0_60px_rgba(3,18,61,.28)]"
            style={{
              animation:
                "drawer-in .32s cubic-bezier(.16,1,.3,1)",
            }}
          >
            {/* HEADER DRAWER */}
            <div
              className="relative shrink-0 overflow-hidden px-5 pb-5 pt-5 text-white sm:px-6 sm:pb-6 sm:pt-6"
              style={{
                background:
                  "radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px) 0 0 / 18px 18px, radial-gradient(circle at 100% 0%, rgba(38,140,255,.4), transparent 50%), linear-gradient(135deg, #061c59, #03123d)",
              }}
            >
              <button
                onClick={
                  fermerPanneau
                }
                aria-label="Fermer"
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20"
              >
                <Icon name="close" />
              </button>

              <div className="mb-3 flex items-center gap-2">
                <span
                  className={`rounded-md border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
                    getConsoleType(
                      selection.numero
                    ) === "PS5"
                      ? "border-violet-300/30 bg-violet-400/15 text-violet-200"
                      : "border-blue-300/30 bg-blue-400/15 text-blue-200"
                  }`}
                >
                  {getConsoleType(
                    selection.numero
                  )}
                </span>

                <span className="text-[10px] font-medium text-white/40">
                  Console de jeu
                </span>
              </div>

              <div className="flex items-end gap-3">
                <p
                  className={`${num} text-[52px] font-bold leading-none sm:text-[58px]`}
                >
                  {String(
                    selection.numero
                  ).padStart(
                    2,
                    "0"
                  )}
                </p>

                <span
                  className={`mb-2 rounded-full px-3 py-1.5 text-[10px] font-bold ${
                    depasseSel
                      ? "bg-red-500/30 text-red-200"
                      : selection.statut ===
                          "occupee"
                        ? "bg-[#4aa8ff]/25 text-[#9fd0ff]"
                        : selection.statut ===
                            "reservee"
                          ? "bg-amber-400/25 text-amber-200"
                          : "bg-emerald-400/20 text-emerald-300"
                  }`}
                >
                  {depasseSel
                    ? "Temps écoulé"
                    : STATUT_LABEL[
                        selection.statut
                      ]}
                </span>
              </div>

              {selection.client && (
                <p className="mt-3 flex items-center gap-1.5 text-[12px] text-white/70">
                  <Icon
                    name="user"
                    className="h-3.5 w-3.5"
                  />

                  {selection.client}
                </p>
              )}
            </div>

            {/* CORPS */}
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
              {erreur && (
                <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[12px] text-red-600">
                  {erreur}
                </div>
              )}

              {/* SUCCÈS ENCAISSEMENT */}
              {dernier &&
                dernier.numero ===
                  selection.numero &&
                selection.statut ===
                  "libre" && (
                  <div className="mb-5 overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50">
                    <div className="flex items-center gap-3 px-4 py-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
                        <Icon
                          name="check"
                          className="h-5 w-5"
                        />
                      </div>

                      <div>
                        <p className="text-[13px] font-bold text-emerald-800">
                          Encaissement validé
                        </p>

                        <p className="mt-0.5 text-[11px] text-emerald-700">
                          {dernier.montant.toLocaleString(
                            "fr-FR"
                          )}{" "}
                          DA encaissés
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 border-t border-emerald-100 bg-white/50">
                      <div className="px-4 py-3">
                        <p className="text-[9px] uppercase tracking-wider text-muted">
                          Montant
                        </p>

                        <p
                          className={`${num} mt-0.5 text-base font-bold text-ink`}
                        >
                          {dernier.montant.toLocaleString(
                            "fr-FR"
                          )}{" "}
                          DA
                        </p>
                      </div>

                      <div className="border-l border-emerald-100 px-4 py-3">
                        <p className="text-[9px] uppercase tracking-wider text-muted">
                          Monnaie
                        </p>

                        <p
                          className={`${num} mt-0.5 text-base font-bold text-emerald-700`}
                        >
                          {dernier.rendu.toLocaleString(
                            "fr-FR"
                          )}{" "}
                          DA
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* LIBRE / RESERVE */}
              {selection.statut !==
                "occupee" && (
                <div>
                  <div className="mb-5 rounded-2xl border border-black/5 bg-[#f8fafd] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      Nouvelle session
                    </p>

                    <p className="mt-1 text-[13px] font-semibold text-ink">
                      Préparer{" "}
                      {getConsoleLabel(
                        selection.numero
                      )}
                    </p>
                  </div>

                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted">
                    Nom du client
                  </label>

                  <div className="relative">
                    <Icon
                      name="user"
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                    />

                    <input
                      value={nomClient}
                      onChange={(e) =>
                        setNomClient(
                          e.target.value
                        )
                      }
                      placeholder={
                        selection.client ??
                        "Client comptoir"
                      }
                      className="w-full rounded-xl border border-black/10 bg-white py-3 pl-10 pr-3 text-sm text-ink outline-none transition focus:border-[#147cff] focus:ring-4 focus:ring-[#147cff]/10"
                    />
                  </div>

                  <p className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-wider text-muted">
                    Durée de la session
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {DUREES.map(
                      (d) => {
                        const actifD =
                          limiteChoisie ===
                            d.sec &&
                          limiteCustom ===
                            "";

                        return (
                          <button
                            key={
                              d.label
                            }
                            onClick={() => {
                              setLimiteChoisie(
                                d.sec
                              );

                              setLimiteCustom(
                                ""
                              );
                            }}
                            className={`rounded-xl border px-2 py-3 text-center transition ${
                              actifD
                                ? "border-[#147cff] bg-[#147cff]/[0.07] ring-1 ring-[#147cff]"
                                : "border-black/10 hover:bg-[#f3f7ff]"
                            }`}
                          >
                            <p
                              className={`${num} text-[14px] font-bold ${
                                actifD
                                  ? "text-[#147cff]"
                                  : "text-ink"
                              }`}
                            >
                              {
                                d.label
                              }
                            </p>

                            <p className="mt-0.5 text-[9px] text-muted">
                              {d.sec
                                ? `${estimer(
                                    d.sec
                                  )} DA`
                                : "Temps réel"}
                            </p>
                          </button>
                        );
                      }
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <input
                      inputMode="numeric"
                      value={
                        limiteCustom
                      }
                      onChange={(e) => {
                        const v =
                          e.target.value
                            .replace(
                              /\D/g,
                              ""
                            )
                            .slice(
                              0,
                              3
                            );

                        setLimiteCustom(
                          v
                        );

                        const n =
                          parseInt(
                            v,
                            10
                          );

                        setLimiteChoisie(
                          n > 0
                            ? n * 60
                            : null
                        );
                      }}
                      placeholder="Autre durée"
                      className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-3 text-sm text-ink outline-none transition focus:border-[#147cff]"
                    />

                    <span className="text-[11px] font-medium text-muted">
                      minutes
                    </span>
                  </div>

                  <p className="mt-3 text-[10px] leading-relaxed text-muted">
                    {limiteChoisie
                      ? `Alarme après ${formatLimite(
                          limiteChoisie
                        )}. Facturation au temps réel : ${TARIF_HORAIRE} DA / heure.`
                      : "Aucune limite. La session continue jusqu'à son encaissement."}
                  </p>

                  <button
                    onClick={() =>
                      demarrer(
                        selection
                      )
                    }
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#147cff] py-3.5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(20,124,255,.22)] transition hover:-translate-y-0.5 hover:bg-[#0b65db]"
                  >
                    <Icon name="play" />
                    Démarrer la session
                  </button>

                  {selection.statut ===
                  "libre" ? (
                    <button
                      onClick={() =>
                        reserver(
                          selection
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-black/10 py-3 text-sm font-semibold text-ink transition hover:bg-[#f3f7ff]"
                    >
                      Réserver ce poste
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        annulerReservation(
                          selection
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-black/10 py-3 text-sm font-semibold text-muted transition hover:bg-[#f3f7ff]"
                    >
                      Annuler la réservation
                    </button>
                  )}
                </div>
              )}

              {/* SESSION EN COURS */}
              {selection.statut ===
                "occupee" &&
                selection.debut &&
                finFige === null && (
                  <div>
                    {depasseSel &&
                      restantSel !==
                        null &&
                      limMsSel !==
                        null && (
                        <div
                          className="mb-5 flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-red-700"
                          style={{
                            animation:
                              "alert-ring 1.6s ease-in-out infinite",
                          }}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white">
                            <Icon
                              name="alarm"
                              className="h-5 w-5"
                            />
                          </div>

                          <div>
                            <p className="text-[13px] font-bold">
                              Temps écoulé
                            </p>

                            <p className="mt-0.5 text-[11px]">
                              Dépassement de{" "}
                              {formatDuree(
                                -restantSel
                              )}
                            </p>
                          </div>
                        </div>
                      )}

                    <div className="rounded-2xl border border-black/5 bg-[#f8fafd] p-5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                        Temps de jeu
                      </p>

                      <p
                        className={`${num} mt-2 text-[40px] font-bold leading-none tabular-nums text-ink sm:text-[46px]`}
                      >
                        {formatDuree(
                          ecouleSel
                        )}
                      </p>

                      <div className="mt-4 flex items-end justify-between">
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-muted">
                            À payer actuellement
                          </p>

                          <p
                            className={`${num} mt-1 text-2xl font-bold text-[#147cff]`}
                          >
                            {total.toLocaleString(
                              "fr-FR"
                            )}{" "}
                            DA
                          </p>
                        </div>

                        <p className="text-[10px] text-muted">
                          Depuis{" "}
                          {heureCourte(
                            selection.debut
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                      {limMsSel !==
                        null &&
                      restantSel !==
                        null ? (
                        <>
                          <div className="mb-2 flex items-baseline justify-between">
                            <p className="text-[11px] font-semibold text-muted">
                              {depasseSel
                                ? "Dépassement"
                                : "Temps restant"}
                            </p>

                            <p
                              className={`${num} text-base font-bold tabular-nums ${
                                depasseSel
                                  ? "text-red-600"
                                  : "text-ink"
                              }`}
                            >
                              {depasseSel
                                ? "+"
                                : ""}

                              {formatDuree(
                                Math.abs(
                                  restantSel
                                )
                              )}
                            </p>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-black/5">
                            <div
                              className={`h-full rounded-full transition-all ${
                                depasseSel
                                  ? "bg-red-500"
                                  : "bg-[#147cff]"
                              }`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  (ecouleSel /
                                    limMsSel) *
                                    100
                                )}%`,
                              }}
                            />
                          </div>

                          <p className="mt-2 text-[10px] text-muted">
                            Limite :{" "}
                            {formatLimite(
                              selection.limite_sec ??
                                0
                            )}
                          </p>

                          <p className="mb-2 mt-5 text-[10px] font-bold uppercase tracking-wider text-muted">
                            Prolonger
                          </p>

                          <div className="grid grid-cols-3 gap-2">
                            {[5, 10, 15].map(
                              (m) => (
                                <button
                                  key={m}
                                  onClick={() =>
                                    prolonger(
                                      selection,
                                      m
                                    )
                                  }
                                  className={`${num} rounded-xl border border-black/10 bg-white py-2.5 text-[12px] font-bold text-ink transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600`}
                                >
                                  +{m} min
                                </button>
                              )
                            )}
                          </div>

                          <button
                            onClick={() =>
                              retirerLimite(
                                selection
                              )
                            }
                            className="mt-3 text-[10px] font-semibold text-muted transition hover:text-ink"
                          >
                            Retirer la limite
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                            Programmer une alarme
                          </p>

                          <div className="grid grid-cols-4 gap-2">
                            {[10, 15, 30, 60].map(
                              (m) => (
                                <button
                                  key={m}
                                  onClick={() =>
                                    programmerAlerte(
                                      selection,
                                      m
                                    )
                                  }
                                  className={`${num} rounded-xl border border-black/10 bg-white py-2.5 text-[11px] font-bold text-ink transition hover:bg-[#f3f7ff]`}
                                >
                                  {m ===
                                  60
                                    ? "1 h"
                                    : `${m} min`}
                                </button>
                              )
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() =>
                        terminer(
                          selection
                        )
                      }
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#061c59] py-3.5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(3,18,61,.18)] transition hover:-translate-y-0.5 hover:bg-[#03123d]"
                    >
                      <Icon name="stop" />
                      Terminer et encaisser
                    </button>
                  </div>
                )}

              {/* =================================================
                  ENCAISSEMENT
              ================================================= */}

              {selection.statut ===
                "occupee" &&
                selection.debut &&
                finFige !== null && (
                  <div>
                    <div className="mb-5 overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-[#061c59] to-[#03123d] text-white shadow-[0_15px_40px_rgba(3,18,61,.20)]">
                      <div className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/45">
                              À ENCAISSER
                            </p>

                            <p className="mt-1 text-[13px] font-semibold text-white/80">
                              {getConsoleLabel(
                                selection.numero
                              )}
                            </p>
                          </div>

                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                            <Icon
                              name="cash"
                              className="h-5 w-5"
                            />
                          </div>
                        </div>

                        <div className="mt-6">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">
                            Total à payer
                          </p>

                          <p
                            className={`${num} mt-1 text-[40px] font-bold leading-none sm:text-[46px]`}
                          >
                            {total.toLocaleString(
                              "fr-FR"
                            )}

                            <span className="ml-2 text-base font-medium text-white/45">
                              DA
                            </span>
                          </p>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-white/35">
                              Durée
                            </p>

                            <p
                              className={`${num} mt-1 text-sm font-semibold`}
                            >
                              {formatDuree(
                                finFige -
                                  new Date(
                                    selection.debut
                                  ).getTime()
                              )}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-[9px] uppercase tracking-wider text-white/35">
                              Fin
                            </p>

                            <p
                              className={`${num} mt-1 text-sm font-semibold`}
                            >
                              {heureCourte(
                                finFige
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-white/10 bg-white/[0.04] px-5 py-3">
                        <p className="text-[10px] text-white/50">
                          Facturation :{" "}
                          <strong className="text-white/80">
                            {TARIF_HORAIRE} DA / heure
                          </strong>
                        </p>
                      </div>
                    </div>

                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
                        Montant reçu
                      </label>

                      {montantRecu >=
                        total &&
                        montantRecu >
                          0 && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                            <Icon
                              name="check"
                              className="h-3 w-3"
                            />
                            Paiement complet
                          </span>
                        )}
                    </div>

                    <div className="relative">
                      <input
                        autoFocus
                        inputMode="numeric"
                        value={
                          montantRecu ===
                          0
                            ? ""
                            : String(
                                montantRecu
                              )
                        }
                        onChange={(e) =>
                          setMontantRecu(
                            parseInt(
                              e.target.value.replace(
                                /\D/g,
                                ""
                              ),
                              10
                            ) || 0
                          )
                        }
                        placeholder="0"
                        className={`${num} w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-4 pr-14 text-2xl font-bold text-ink outline-none transition focus:border-[#147cff] focus:ring-4 focus:ring-[#147cff]/10`}
                      />

                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted">
                        DA
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {MONTANTS_RAPIDES.map(
                        (m) => (
                          <button
                            key={m}
                            onClick={() =>
                              setMontantRecu(
                                (v) =>
                                  v + m
                              )
                            }
                            className={`${num} rounded-xl border border-black/10 bg-white py-3 text-[11px] font-bold text-ink transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600`}
                          >
                            +{m}
                          </button>
                        )
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        onClick={() =>
                          setMontantRecu(
                            total
                          )
                        }
                        className="rounded-xl border border-blue-200 bg-blue-50 py-3 text-[11px] font-bold text-blue-700 transition hover:bg-blue-100"
                      >
                        Paiement exact
                      </button>

                      <button
                        onClick={() =>
                          setMontantRecu(0)
                        }
                        className="rounded-xl border border-black/10 bg-white py-3 text-[11px] font-bold text-muted transition hover:bg-[#f3f7ff] hover:text-ink"
                      >
                        Effacer
                      </button>
                    </div>

                    {/* RENDU */}
                    <div
                      className={`mt-4 overflow-hidden rounded-2xl border ${
                        montantRecu ===
                        0
                          ? "border-black/5 bg-[#f8fafd]"
                          : monnaie >=
                              0
                            ? "border-emerald-100 bg-emerald-50"
                            : "border-red-100 bg-red-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 px-4 py-4">
                        <div>
                          <p
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              montantRecu ===
                              0
                                ? "text-muted"
                                : monnaie >=
                                    0
                                  ? "text-emerald-700"
                                  : "text-red-600"
                            }`}
                          >
                            {montantRecu ===
                            0
                              ? "À calculer"
                              : monnaie >=
                                  0
                                ? "Monnaie à rendre"
                                : "Montant manquant"}
                          </p>

                          <p
                            className={`mt-1 text-[11px] ${
                              montantRecu ===
                              0
                                ? "text-muted"
                                : monnaie >=
                                    0
                                  ? "text-emerald-600"
                                  : "text-red-500"
                            }`}
                          >
                            {montantRecu ===
                            0
                              ? "Entre le montant donné par le client"
                              : monnaie >=
                                  0
                                ? "Le client a payé suffisamment"
                                : "Le paiement ne peut pas encore être validé"}
                          </p>
                        </div>

                        <p
                          className={`${num} shrink-0 text-xl font-bold sm:text-2xl ${
                            montantRecu ===
                            0
                              ? "text-muted"
                              : monnaie >=
                                  0
                                ? "text-emerald-700"
                                : "text-red-600"
                          }`}
                        >
                          {montantRecu ===
                          0
                            ? "—"
                            : Math.abs(
                                monnaie
                              ).toLocaleString(
                                "fr-FR"
                              )}{" "}
                          {montantRecu >
                            0 && "DA"}
                        </p>
                      </div>

                      {montantRecu >
                        0 &&
                        monnaie >=
                          0 && (
                          <div className="border-t border-emerald-100 bg-white/40 px-4 py-2.5 text-center text-[10px] font-bold text-emerald-700">
                            Rendre{" "}
                            {monnaie.toLocaleString(
                              "fr-FR"
                            )}{" "}
                            DA au client
                          </div>
                        )}
                    </div>

                    {/* BOUTON ENCAISSER */}
                    <button
                      onClick={() =>
                        encaisser(
                          selection
                        )
                      }
                      disabled={
                        montantRecu <
                        total
                      }
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-sm font-bold text-white shadow-[0_10px_25px_rgba(5,150,105,.18)] transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
                        <Icon
                          name="check"
                          className="h-4 w-4"
                        />
                      </span>

                      {montantRecu <
                      total
                        ? `Il manque ${(
                            total -
                            montantRecu
                          ).toLocaleString(
                            "fr-FR"
                          )} DA`
                        : "Valider l'encaissement"}
                    </button>

                    <button
                      onClick={() =>
                        setFinFige(null)
                      }
                      className="mt-3 w-full py-2 text-[11px] font-semibold text-muted transition hover:text-ink"
                    >
                      ← Reprendre le chrono
                    </button>
                  </div>
                )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}