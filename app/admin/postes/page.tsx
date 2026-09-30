"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Chakra_Petch } from "next/font/google";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const chakra = Chakra_Petch({ subsets: ["latin"], weight: ["500", "600", "700"] });
const num = chakra.className;

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

const TARIF_HORAIRE = 300; // DA / heure (modifiable plus tard dans Paramètres)
const HEURE = 3_600_000;
const MONTANTS_RAPIDES = [200, 500, 1000, 2000];
const FILTRES = ["Tous", "Libres", "Occupés", "Réservés"] as const;
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

/* ---------- Son (généré par le navigateur, aucun fichier audio) ---------- */

let audioCtx: AudioContext | null = null;

function obtenirAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function bip(ctx: AudioContext, debut: number, freq: number, duree: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, debut);
  gain.gain.exponentialRampToValueAtTime(0.22, debut + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
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
  if (ctx.state === "running") jouer();
  else ctx.resume().then(jouer).catch(() => {});
}

/* ---------- Petits utilitaires ---------- */

function Icon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const paths: Record<string, string> = {
    play: "M8 5v14l11-7-11-7Z",
    stop: "M6 6h12v12H6z",
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6",
    check: "M5 12.5 10 17.5 19 7.5",
    close: "M6 6l12 12M18 6 6 18",
    alarm: "M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Zm4.5 10a1.5 1.5 0 0 0 3 0",
    volume: "M11 5 6 9H3v6h3l5 4V5Z M15.5 8.5a5 5 0 0 1 0 7 M18.5 5.5a9 9 0 0 1 0 13",
    volumeOff: "M11 5 6 9H3v6h3l5 4V5Z M16 9l5 6 M21 9l-5 6",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d={paths[name]} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Anneau({ progression, couleur }: { progression: number; couleur: string }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <svg width="40" height="40" viewBox="0 0 44 44" className="-rotate-90">
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="3" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke={couleur}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - progression)}
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
  if (sec < 3600) return `${Math.round(sec / 60)} min`;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

function heureCourte(valeur: string | number) {
  return new Date(valeur).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// Arrondi au multiple de 10 DA supérieur : pas de pièces de 1 DA à rendre
function calculerMontant(debut: string, fin: number) {
  const heures = Math.max(0, fin - new Date(debut).getTime()) / HEURE;
  return Math.ceil((heures * TARIF_HORAIRE) / 10) * 10;
}

function estimer(sec: number) {
  return Math.ceil(((sec / 3600) * TARIF_HORAIRE) / 10) * 10;
}

// Compteur qui s'anime vers la nouvelle valeur
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
      const v = Math.round(from + (cible - from) * eased);
      setValeur(v);
      depart.current = v;
      if (p < 1) raf = requestAnimationFrame(tick);
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

export default function PostesPage() {
  const [postes, setPostes] = useState<Poste[]>([]);
  const [sessions, setSessions] = useState<SessionLigne[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [maintenant, setMaintenant] = useState(Date.now());
  const [filtre, setFiltre] = useState<Filtre>("Tous");
  const [selectionId, setSelectionId] = useState<number | null>(null);
  const [nomClient, setNomClient] = useState("");
  const [montantRecu, setMontantRecu] = useState(0);
  const [finFige, setFinFige] = useState<number | null>(null);
  const [dernier, setDernier] = useState<{ numero: number; montant: number; rendu: number } | null>(null);
  const [limiteChoisie, setLimiteChoisie] = useState<number | null>(null);
  const [limiteCustom, setLimiteCustom] = useState("");
  const [ignorees, setIgnorees] = useState<Set<string>>(new Set());
  const [son, setSon] = useState(true);
  const [sonBloque, setSonBloque] = useState(false);

  const ca = sessions.reduce((t, s) => t + s.montant, 0);
  const caAffiche = useCompteur(ca);

  // ---- Helpers liés au temps ----
  const ecouleDe = (p: Poste) => (p.debut ? maintenant - new Date(p.debut).getTime() : 0);
  const limiteMs = (p: Poste) => (p.limite_sec != null ? p.limite_sec * 1000 : null);
  const estExpire = (p: Poste) => {
    const lim = limiteMs(p);
    return p.statut === "occupee" && !!p.debut && lim !== null && ecouleDe(p) >= lim;
  };
  const cle = (p: Poste) => `${p.id}|${p.debut}|${p.limite_sec}`;
  const alertes = postes.filter((p) => estExpire(p) && !ignorees.has(cle(p)));

  const chargerSessions = useCallback(async () => {
    const debutJour = new Date();
    debutJour.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("sessions")
      .select("id, poste_numero, client, debut, fin, montant")
      .gte("fin", debutJour.toISOString())
      .order("fin", { ascending: false });
    setSessions((data ?? []) as SessionLigne[]);
  }, []);

  const jouerAlarme = useCallback(() => {
    setSonBloque(!sonnerAlarme());
  }, []);

  useEffect(() => {
    const t = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function surTouche(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectionId(null);
    }
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, []);

  // Les navigateurs exigent un clic avant d'autoriser le son : on le débloque au premier clic
  useEffect(() => {
    const debloquer = () => {
      const ctx = obtenirAudio();
      if (!ctx) return;
      if (ctx.state === "running") setSonBloque(false);
      else ctx.resume().then(() => setSonBloque(false)).catch(() => {});
    };
    window.addEventListener("pointerdown", debloquer);
    window.addEventListener("keydown", debloquer);
    return () => {
      window.removeEventListener("pointerdown", debloquer);
      window.removeEventListener("keydown", debloquer);
    };
  }, []);

  // Alarme : sonne tout de suite, puis toutes les 5 s tant qu'une alerte n'est pas prise en compte
  useEffect(() => {
    if (!son || alertes.length === 0) return;
    jouerAlarme();
    const id = setInterval(jouerAlarme, 5000);
    return () => clearInterval(id);
  }, [alertes.length, son, jouerAlarme]);

  useEffect(() => {
    async function charger() {
      const { data, error } = await supabase.from("postes").select("*").order("numero");
      if (error) setErreur("Impossible de charger les postes : " + error.message);
      else setPostes(data as Poste[]);
      setChargement(false);
    }
    charger();
    chargerSessions();

    const channel = supabase
      .channel("postes-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "postes" }, (payload) => {
        const ligne = payload.new as Poste;
        if (ligne?.id) setPostes((prev) => prev.map((p) => (p.id === ligne.id ? ligne : p)));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sessions" }, () => {
        chargerSessions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chargerSessions]);

  async function majPoste(id: number, champs: Partial<Poste>) {
    setErreur("");
    const { error } = await supabase.from("postes").update(champs).eq("id", id);
    if (error) {
      setErreur("Action impossible : " + error.message);
      return false;
    }
    setPostes((prev) => prev.map((p) => (p.id === id ? { ...p, ...champs } : p)));
    return true;
  }

  function ignorer(p: Poste) {
    setIgnorees((prev) => new Set(prev).add(cle(p)));
  }

  function choisir(id: number) {
    setSelectionId(id);
    setNomClient("");
    setMontantRecu(0);
    setFinFige(null);
    setDernier(null);
    setLimiteChoisie(null);
    setLimiteCustom("");
    const p = postes.find((x) => x.id === id);
    if (p && estExpire(p)) ignorer(p);
  }

  function fermerPanneau() {
    setSelectionId(null);
    setFinFige(null);
  }

  function basculerSon() {
    const suivant = !son;
    setSon(suivant);
    if (suivant) sonnerTest();
  }

  async function demarrer(p: Poste) {
    const ok = await majPoste(p.id, {
      statut: "occupee",
      debut: new Date().toISOString(),
      client: nomClient.trim() || p.client || "Client comptoir",
      limite_sec: limiteChoisie,
    });
    if (ok) {
      setNomClient("");
      setLimiteChoisie(null);
      setLimiteCustom("");
    }
  }

  async function reserver(p: Poste) {
    const ok = await majPoste(p.id, { statut: "reservee", client: nomClient.trim() || "Client réservé" });
    if (ok) setNomClient("");
  }

  async function annulerReservation(p: Poste) {
    await majPoste(p.id, { statut: "libre", client: null });
  }

  // Prolonger : à partir de la limite actuelle, ou de maintenant si elle est déjà dépassée
  async function prolonger(p: Poste, minutes: number) {
    if (!p.debut) return;
    const ecoule = Math.floor((Date.now() - new Date(p.debut).getTime()) / 1000);
    const base = p.limite_sec != null && p.limite_sec > ecoule ? p.limite_sec : ecoule;
    await majPoste(p.id, { limite_sec: base + minutes * 60 });
  }

  // Programmer une alarme dans N minutes à partir de maintenant
  async function programmerAlerte(p: Poste, minutes: number) {
    if (!p.debut) return;
    const ecoule = Math.floor((Date.now() - new Date(p.debut).getTime()) / 1000);
    await majPoste(p.id, { limite_sec: ecoule + minutes * 60 });
  }

  async function retirerLimite(p: Poste) {
    await majPoste(p.id, { limite_sec: null });
  }

  function terminer(p: Poste) {
    setFinFige(Date.now());
    ignorer(p);
  }

  async function encaisser(p: Poste) {
    if (!p.debut || finFige === null) return;
    const montant = calculerMontant(p.debut, finFige);
    const rendu = Math.max(0, montantRecu - montant);
    const { error } = await supabase.from("sessions").insert({
      poste_numero: p.numero,
      client: p.client,
      debut: p.debut,
      fin: new Date(finFige).toISOString(),
      montant,
      recu: montantRecu,
      rendu,
    });
    if (error) {
      setErreur("Encaissement impossible : " + error.message);
      return;
    }
    const ok = await majPoste(p.id, { statut: "libre", debut: null, client: null, limite_sec: null });
    if (ok) {
      await chargerSessions();
      setDernier({ numero: p.numero, montant, rendu });
      setFinFige(null);
      setMontantRecu(0);
    }
  }

  if (chargement) {
    return (
      <div className="animate-pulse">
        <div className="mb-5 h-10 w-40 rounded bg-black/5" />
        <div className="mb-6 h-36 rounded-2xl bg-black/5" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-black/5" />
          ))}
        </div>
      </div>
    );
  }

  const selection = postes.find((p) => p.id === selectionId) ?? null;
  const total = selection?.debut ? calculerMontant(selection.debut, finFige ?? maintenant) : 0;
  const monnaie = montantRecu - total;
  const ecouleSel = selection ? ecouleDe(selection) : 0;
  const limMsSel = selection ? limiteMs(selection) : null;
  const restantSel = limMsSel !== null ? limMsSel - ecouleSel : null;
  const depasseSel = selection ? estExpire(selection) : false;

  const nbLibres = postes.filter((p) => p.statut === "libre").length;
  const nbOccupes = postes.filter((p) => p.statut === "occupee").length;
  const nbReserves = postes.filter((p) => p.statut === "reservee").length;
  const tauxOccupation = postes.length ? Math.round((nbOccupes / postes.length) * 100) : 0;

  const compteurs: Record<Filtre, number> = {
    Tous: postes.length,
    Libres: nbLibres,
    Occupés: nbOccupes,
    Réservés: nbReserves,
  };

  const postesFiltres = postes.filter((p) => {
    if (filtre === "Libres") return p.statut === "libre";
    if (filtre === "Occupés") return p.statut === "occupee";
    if (filtre === "Réservés") return p.statut === "reservee";
    return true;
  });

  // ---- Fenêtre de temps du planning ----
  const finDate = new Date(maintenant);
  finDate.setMinutes(0, 0, 0);
  finDate.setHours(finDate.getHours() + 2);
  const fenetreFin = finDate.getTime();
  const minuit = new Date(maintenant);
  minuit.setHours(0, 0, 0, 0);
  const debutsMs = [
    ...sessions.map((s) => new Date(s.debut).getTime()),
    ...postes.filter((p) => p.statut === "occupee" && p.debut).map((p) => new Date(p.debut as string).getTime()),
  ];
  const plusTot = debutsMs.length ? Math.min(...debutsMs) : maintenant - 6 * HEURE;
  const debutDate = new Date(Math.min(plusTot, fenetreFin - 6 * HEURE));
  debutDate.setMinutes(0, 0, 0);
  const fenetreDebut = Math.max(debutDate.getTime(), minuit.getTime());
  const span = fenetreFin - fenetreDebut;
  const pct = (t: number) => Math.min(100, Math.max(0, ((t - fenetreDebut) / span) * 100));

  const pas = span > 10 * HEURE ? 2 * HEURE : HEURE;
  const ticks: number[] = [];
  for (let t = fenetreDebut; t <= fenetreFin; t += pas) ticks.push(t);

  // ---- Courbe du CA (en escalier) ----
  const W = 220;
  const H = 44;
  const triees = [...sessions].sort((a, b) => new Date(a.fin).getTime() - new Date(b.fin).getTime());
  const maxCa = ca || 1;
  const largeurCourbe = Math.max(maintenant - fenetreDebut, 1);
  const xCourbe = (t: number) => Math.min(W, Math.max(0, ((t - fenetreDebut) / largeurCourbe) * W));
  const yCourbe = (v: number) => H - 3 - (v / maxCa) * (H - 8);
  let cumul = 0;
  let ligne = `M 0 ${yCourbe(0)}`;
  let yPrec = yCourbe(0);
  triees.forEach((s) => {
    cumul += s.montant;
    const x = xCourbe(new Date(s.fin).getTime());
    const y = yCourbe(cumul);
    ligne += ` L ${x} ${yPrec} L ${x} ${y}`;
    yPrec = y;
  });
  ligne += ` L ${W} ${yPrec}`;
  const aire = `${ligne} L ${W} ${H} L 0 ${H} Z`;

  return (
    <div>
      {/* Alertes de fin de temps */}
      {alertes.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
          {alertes.map((p) => (
            <div
              key={cle(p)}
              className="pointer-events-auto flex w-[440px] max-w-full items-start gap-4 rounded-2xl border border-red-300/30 px-5 py-4 text-white backdrop-blur-xl"
              style={{
                background: "linear-gradient(135deg, rgba(185,28,28,.97), rgba(127,29,29,.96))",
                animation: "toast-in .4s cubic-bezier(.16,1,.3,1), alert-ring 1.6s ease-in-out .4s infinite",
              }}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Icon name="alarm" className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold">Temps écoulé · Poste {String(p.numero).padStart(2, "0")}</p>
                <p className="mt-0.5 truncate text-[12px] text-white/75">
                  {p.client} · limite de {formatLimite(p.limite_sec ?? 0)} atteinte
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => prolonger(p, 10)}
                    className="rounded-md bg-white px-3 py-1.5 text-[11px] font-bold text-red-700 transition hover:bg-red-50"
                  >
                    +10 min
                  </button>
                  <button
                    onClick={() => choisir(p.id)}
                    className="rounded-md bg-white/15 px-3 py-1.5 text-[11px] font-semibold transition hover:bg-white/25"
                  >
                    Voir le poste
                  </button>
                </div>
              </div>
              <button
                onClick={() => ignorer(p)}
                aria-label="Ignorer"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/15 hover:text-white"
              >
                <Icon name="close" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-ink">POSTES</h1>
          <p className="mt-1.5 text-sm text-muted">
            {postes.length} postes · tarif {TARIF_HORAIRE} DA / heure
          </p>
        </div>
        <button
          onClick={basculerSon}
          className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3.5 py-2 text-[12px] font-semibold text-ink transition hover:bg-[#f3f7ff]"
        >
          <Icon name={son ? "volume" : "volumeOff"} className="h-4 w-4" />
          {son ? "Alarme sonore activée" : "Alarme sonore coupée"}
        </button>
      </div>

      {son && sonBloque && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-[12px] font-medium text-amber-800">
          Le navigateur bloque le son tant que tu n'as pas cliqué sur la page. Clique n'importe où pour l'activer.
        </div>
      )}

      {erreur && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{erreur}</div>}

      {/* Bande de synthèse */}
      <div
        className="relative mb-6 overflow-hidden rounded-2xl px-7 py-6 text-white"
        style={{
          background:
            "radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px) 0 0 / 18px 18px, radial-gradient(circle at 92% 0%, rgba(38,140,255,.35), transparent 42%), linear-gradient(135deg, #061c59 0%, #03123d 100%)",
        }}
      >
        <div className="grid items-center gap-8 lg:grid-cols-[auto_1fr_auto]">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-medium text-white/55">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              En direct · chiffre d'affaires du jour
            </p>
            <p className={`${num} mt-2 text-[44px] font-bold leading-none tracking-tight tabular-nums`}>
              {caAffiche.toLocaleString("fr-FR")} <span className="text-lg font-medium text-white/45">DA</span>
            </p>
            <div className="mt-3 flex items-end gap-4">
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
                <defs>
                  <linearGradient id="courbe-ca" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4aa8ff" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#4aa8ff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={aire} fill="url(#courbe-ca)" />
                <path d={ligne} fill="none" stroke="#4aa8ff" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
              <p className="pb-1 text-[11px] leading-tight text-white/45">
                {sessions.length} session{sessions.length > 1 ? "s" : ""}
                <br />
                encaissée{sessions.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="lg:px-6">
            <div className="mb-2.5 flex items-baseline justify-between">
              <p className="text-[11px] font-medium text-white/55">Occupation de la salle</p>
              <p className={`${num} text-sm font-semibold`}>
                {tauxOccupation}%
                <span className="ml-2 text-white/40">
                  {nbOccupes} / {postes.length}
                </span>
              </p>
            </div>
            <div className="flex gap-1.5">
              {postes.map((p) => (
                <button
                  key={p.id}
                  onClick={() => choisir(p.id)}
                  title={`Poste ${p.numero} · ${STATUT_LABEL[p.statut]}`}
                  className={`h-3 flex-1 rounded-sm transition hover:scale-y-150 ${
                    p.statut === "occupee"
                      ? estExpire(p)
                        ? "animate-pulse bg-red-500"
                        : "animate-pulse bg-[#4aa8ff]"
                      : p.statut === "reservee"
                        ? "bg-amber-400"
                        : "bg-white/15 hover:bg-white/30"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-7 text-[12px]">
            {[
              { l: "Libres", v: nbLibres, c: "bg-white/40" },
              { l: "Occupés", v: nbOccupes, c: "bg-[#4aa8ff]" },
              { l: "Réservés", v: nbReserves, c: "bg-amber-400" },
            ].map((x) => (
              <div key={x.l}>
                <p className="flex items-center gap-1.5 text-white/50">
                  <span className={`h-1.5 w-1.5 rounded-full ${x.c}`} />
                  {x.l}
                </p>
                <p className={`${num} mt-0.5 text-2xl font-semibold`}>{x.v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="mb-4 flex gap-6 border-b border-black/10">
        {FILTRES.map((f) => (
          <button
            key={f}
            onClick={() => setFiltre(f)}
            className={`-mb-px border-b-2 pb-2.5 text-[13px] font-medium transition ${
              filtre === f ? "border-[#147cff] text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {f} <span className={`${num} ml-1 text-[11px] text-muted`}>{compteurs[f]}</span>
          </button>
        ))}
      </div>

      {/* Cartes des postes */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {postesFiltres.map((p, i) => {
          const actif = p.id === selectionId;
          const enCours = p.statut === "occupee" && !!p.debut;
          const ecoule = ecouleDe(p);
          const lim = limiteMs(p);
          const depasse = estExpire(p);
          const restant = lim !== null ? lim - ecoule : null;
          const base = depasse
            ? "border-red-500 bg-[#3a0c14] text-white"
            : p.statut === "occupee"
              ? "border-[#0b3a94] bg-[#061c59] text-white"
              : p.statut === "reservee"
                ? "border-black/5 border-l-[3px] border-l-amber-400 bg-white text-ink"
                : "border-black/5 bg-white text-ink";
          const anim = depasse
            ? `rise .5s ease-out ${i * 40}ms both, alert-ring 1.6s ease-in-out ${i * 40 + 500}ms infinite`
            : enCours
              ? `rise .5s ease-out ${i * 40}ms both, glow-pulse 3.2s ease-in-out ${i * 40 + 500}ms infinite`
              : `rise .5s ease-out ${i * 40}ms both`;
          return (
            <button
              key={p.id}
              onClick={() => choisir(p.id)}
              style={{ animation: anim }}
              className={`relative flex flex-col rounded-xl border p-4 text-left transition hover:-translate-y-0.5 ${base} ${
                actif ? "ring-2 ring-[#147cff] ring-offset-2 ring-offset-[#f3f7ff]" : ""
              }`}
            >
              <div className="flex w-full items-start justify-between">
                <div>
                  <p
                    className={`text-[10px] font-medium ${
                      depasse ? "font-bold text-red-300" : enCours ? "text-white/50" : "text-muted"
                    }`}
                  >
                    {depasse ? "Temps écoulé" : STATUT_LABEL[p.statut]}
                  </p>
                  <p className={`${num} text-[34px] font-bold leading-none`}>{String(p.numero).padStart(2, "0")}</p>
                </div>
                {enCours && (
                  <Anneau
                    progression={lim ? Math.min(1, ecoule / lim) : (ecoule % HEURE) / HEURE}
                    couleur={depasse ? "#f87171" : "#4aa8ff"}
                  />
                )}
              </div>

              <div className="mt-4 min-h-[72px] w-full">
                {enCours ? (
                  <>
                    <p className="truncate text-[11px] text-white/60">{p.client}</p>
                    <div className="mt-0.5 flex items-baseline justify-between">
                      <p className={`${num} text-lg font-semibold tabular-nums`}>{formatDuree(ecoule)}</p>
                      <p className={`${num} text-[12px] font-semibold ${depasse ? "text-red-300" : "text-[#4aa8ff]"}`}>
                        {calculerMontant(p.debut as string, maintenant)} DA
                      </p>
                    </div>
                    {lim !== null && restant !== null ? (
                      <div className="mt-2">
                        <div className="h-1 overflow-hidden rounded-full bg-white/15">
                          <div
                            className={`h-full rounded-full ${depasse ? "bg-red-500" : "bg-[#4aa8ff]"}`}
                            style={{ width: `${Math.min(100, (ecoule / lim) * 100)}%` }}
                          />
                        </div>
                        <p
                          className={`${num} mt-1 text-[10px] font-semibold ${
                            depasse ? "text-red-300" : "text-white/55"
                          }`}
                        >
                          {depasse ? `+${formatDuree(-restant)} de dépassement` : `reste ${formatDuree(restant)}`}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 text-[10px] text-white/35">Sans limite de temps</p>
                    )}
                  </>
                ) : p.statut === "reservee" ? (
                  <p className="truncate text-[12px] text-muted">{p.client}</p>
                ) : (
                  <p className="text-[12px] text-muted">Disponible</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Planning de la journée */}
      <div className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <h2 className={`${num} text-base font-semibold text-ink`}>Planning de la journée</h2>
            <p className="mt-0.5 text-[11px] text-muted">Chaque barre est une session, poste par poste.</p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-sm bg-[#147cff]/80" /> Terminée
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-sm bg-gradient-to-r from-[#0b3a94] to-[#4aa8ff]" /> En cours
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-black/5 bg-white p-5">
          <div className="mb-1.5 flex gap-3">
            <div className="w-9 shrink-0" />
            <div className="relative h-4 flex-1">
              {ticks.map((t) => (
                <span
                  key={t}
                  className={`${num} absolute -translate-x-1/2 text-[10px] text-muted`}
                  style={{ left: `${pct(t)}%` }}
                >
                  {String(new Date(t).getHours()).padStart(2, "0")}h
                </span>
              ))}
              <span
                className={`${num} absolute -translate-x-1/2 rounded bg-red-500 px-1.5 py-px text-[9px] font-semibold text-white`}
                style={{ left: `${pct(maintenant)}%`, top: -1 }}
              >
                {heureCourte(maintenant)}
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-12 right-0">
              {ticks.map((t) => (
                <div
                  key={t}
                  className="absolute inset-y-0 border-l border-black/[0.06]"
                  style={{ left: `${pct(t)}%` }}
                />
              ))}
              <div className="absolute inset-y-0 border-l-2 border-red-400/80" style={{ left: `${pct(maintenant)}%` }} />
            </div>

            {postes.map((p) => (
              <div key={p.id} className="flex h-7 items-center gap-3">
                <span className={`${num} w-9 shrink-0 text-[11px] font-semibold text-muted`}>
                  {String(p.numero).padStart(2, "0")}
                </span>
                <div className="relative h-5 flex-1 rounded bg-[#f3f7ff]">
                  {sessions
                    .filter((s) => s.poste_numero === p.numero)
                    .map((s) => {
                      const a = pct(new Date(s.debut).getTime());
                      const b = pct(new Date(s.fin).getTime());
                      return (
                        <div
                          key={s.id}
                          title={`Poste ${s.poste_numero} · ${s.client ?? "—"} · ${heureCourte(s.debut)} à ${heureCourte(s.fin)} · ${s.montant} DA`}
                          className="absolute inset-y-0.5 rounded-[4px] bg-[#147cff]/80"
                          style={{ left: `${a}%`, width: `${Math.max(b - a, 0.6)}%` }}
                        />
                      );
                    })}
                  {p.statut === "occupee" && p.debut && (
                    <div
                      title={`Poste ${p.numero} · ${p.client ?? "—"} · en cours depuis ${heureCourte(p.debut)}`}
                      className={`absolute inset-y-0.5 rounded-[4px] bg-gradient-to-r ${
                        estExpire(p) ? "from-red-800 to-red-500" : "from-[#0b3a94] to-[#4aa8ff]"
                      }`}
                      style={{
                        left: `${pct(new Date(p.debut).getTime())}%`,
                        width: `${Math.max(pct(maintenant) - pct(new Date(p.debut).getTime()), 0.6)}%`,
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Historique du jour */}
      <div className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className={`${num} text-base font-semibold text-ink`}>Sessions du jour</h2>
          <p className="text-[11px] text-muted">{sessions.length} au total</p>
        </div>
        <div className="overflow-hidden rounded-xl border border-black/5 bg-white">
          <div className="grid grid-cols-[60px_1fr_90px_90px_60px] gap-3 border-b border-black/5 bg-[#f8fafd] px-5 py-2.5 text-[10px] font-medium uppercase tracking-wide text-muted">
            <span>Poste</span>
            <span>Client</span>
            <span>Durée</span>
            <span className="text-right">Montant</span>
            <span className="text-right">Fin</span>
          </div>
          {sessions.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-muted">Aucune session encaissée aujourd'hui.</p>
          ) : (
            sessions.slice(0, 8).map((s) => (
              <div
                key={s.id}
                className="grid grid-cols-[60px_1fr_90px_90px_60px] items-center gap-3 border-b border-black/5 px-5 py-3 text-[13px] last:border-0"
              >
                <span className={`${num} font-semibold text-ink`}>{String(s.poste_numero).padStart(2, "0")}</span>
                <span className="truncate text-ink">{s.client ?? "—"}</span>
                <span className="text-muted">
                  {formatDureeCourte(new Date(s.fin).getTime() - new Date(s.debut).getTime())}
                </span>
                <span className={`${num} text-right font-semibold text-ink`}>{s.montant} DA</span>
                <span className="text-right text-[12px] text-muted">{heureCourte(s.fin)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Panneau de contrôle : s'ouvre par-dessus la page dès qu'on clique un poste */}
      {selection && (
        <>
          <div
            className="fixed inset-0 z-40 bg-[#03123d]/30 backdrop-blur-[2px]"
            style={{ animation: "fade-in .25s ease-out" }}
            onClick={fermerPanneau}
          />
          <aside
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col bg-white shadow-[-20px_0_60px_rgba(3,18,61,.25)]"
            style={{ animation: "drawer-in .32s cubic-bezier(.16,1,.3,1)" }}
          >
            {/* En-tête */}
            <div
              className="relative shrink-0 overflow-hidden px-6 pb-6 pt-6 text-white"
              style={{
                background:
                  "radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px) 0 0 / 18px 18px, radial-gradient(circle at 100% 0%, rgba(38,140,255,.4), transparent 50%), linear-gradient(135deg, #061c59, #03123d)",
              }}
            >
              <button
                onClick={fermerPanneau}
                aria-label="Fermer"
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20"
              >
                <Icon name="close" />
              </button>
              <p className="text-[11px] font-medium text-white/55">Poste</p>
              <div className="flex items-end gap-3">
                <p className={`${num} text-[56px] font-bold leading-none`}>
                  {String(selection.numero).padStart(2, "0")}
                </p>
                <span
                  className={`mb-2 rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                    depasseSel
                      ? "bg-red-500/30 text-red-200"
                      : selection.statut === "occupee"
                        ? "bg-[#4aa8ff]/25 text-[#9fd0ff]"
                        : selection.statut === "reservee"
                          ? "bg-amber-400/25 text-amber-200"
                          : "bg-emerald-400/20 text-emerald-300"
                  }`}
                >
                  {depasseSel ? "Temps écoulé" : STATUT_LABEL[selection.statut]}
                </span>
              </div>
              {selection.client && (
                <p className="mt-3 flex items-center gap-1.5 text-[12px] text-white/70">
                  <Icon name="user" className="h-3.5 w-3.5" /> {selection.client}
                </p>
              )}
            </div>

            {/* Corps */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {erreur && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-[12px] text-red-600">{erreur}</div>}

              {dernier && dernier.numero === selection.numero && selection.statut === "libre" && (
                <div className="mb-5 flex items-start gap-3 rounded-lg bg-emerald-50 px-4 py-3">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div className="text-[12px] text-emerald-800">
                    <p className="font-semibold">Encaissé : {dernier.montant} DA</p>
                    <p>Monnaie rendue : {dernier.rendu} DA</p>
                  </div>
                </div>
              )}

              {/* Poste libre ou réservé : préparer la session */}
              {selection.statut !== "occupee" && (
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-muted">Nom du client</label>
                  <input
                    value={nomClient}
                    onChange={(e) => setNomClient(e.target.value)}
                    placeholder={selection.client ?? "Optionnel"}
                    className="w-full rounded-lg border border-black/10 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-[#147cff]"
                  />

                  <p className="mb-2 mt-5 text-[12px] font-medium text-muted">Durée de la session</p>
                  <div className="grid grid-cols-3 gap-2">
                    {DUREES.map((d) => {
                      const actifD = limiteChoisie === d.sec && limiteCustom === "";
                      return (
                        <button
                          key={d.label}
                          onClick={() => {
                            setLimiteChoisie(d.sec);
                            setLimiteCustom("");
                          }}
                          className={`rounded-lg border px-2 py-2.5 text-center transition ${
                            actifD
                              ? "border-[#147cff] bg-[#147cff]/[0.07] ring-1 ring-[#147cff]"
                              : "border-black/10 hover:bg-[#f3f7ff]"
                          }`}
                        >
                          <p className={`${num} text-[14px] font-bold ${actifD ? "text-[#147cff]" : "text-ink"}`}>
                            {d.label}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted">
                            {d.sec ? `${estimer(d.sec)} DA` : "Temps réel"}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <input
                      inputMode="numeric"
                      value={limiteCustom}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 3);
                        setLimiteCustom(v);
                        const n = parseInt(v, 10);
                        setLimiteChoisie(n > 0 ? n * 60 : null);
                      }}
                      placeholder="Autre durée"
                      className="w-full rounded-lg border border-black/10 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-[#147cff]"
                    />
                    <span className="text-[12px] text-muted">min</span>
                  </div>

                  <p className="mt-3 text-[11px] leading-relaxed text-muted">
                    {limiteChoisie
                      ? `Une alarme rouge sonnera au bout de ${formatLimite(limiteChoisie)}. La facturation reste au temps réel (${TARIF_HORAIRE} DA / heure).`
                      : "Sans limite : la session tourne jusqu'à ce que tu la termines."}
                  </p>

                  <button
                    onClick={() => demarrer(selection)}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#147cff] py-3 text-sm font-semibold text-white transition hover:bg-[#0b65db]"
                  >
                    <Icon name="play" />
                    Démarrer la session
                  </button>
                  {selection.statut === "libre" ? (
                    <button
                      onClick={() => reserver(selection)}
                      className="mt-2 w-full rounded-lg border border-black/10 py-3 text-sm font-semibold text-ink transition hover:bg-[#f3f7ff]"
                    >
                      Réserver ce poste
                    </button>
                  ) : (
                    <button
                      onClick={() => annulerReservation(selection)}
                      className="mt-2 w-full rounded-lg border border-black/10 py-3 text-sm font-semibold text-muted transition hover:bg-[#f3f7ff]"
                    >
                      Annuler la réservation
                    </button>
                  )}
                </div>
              )}

              {/* Poste occupé : chrono en cours */}
              {selection.statut === "occupee" && selection.debut && finFige === null && (
                <div>
                  {depasseSel && restantSel !== null && limMsSel !== null && (
                    <div
                      className="mb-5 flex items-center gap-3 rounded-lg bg-red-50 px-4 py-3 text-red-700"
                      style={{ animation: "alert-ring 1.6s ease-in-out infinite" }}
                    >
                      <Icon name="alarm" className="h-5 w-5 shrink-0" />
                      <div>
                        <p className="text-[13px] font-bold">Temps écoulé</p>
                        <p className="text-[11px]">
                          La limite de {formatLimite(selection.limite_sec ?? 0)} est dépassée de{" "}
                          {formatDuree(-restantSel)}.
                        </p>
                      </div>
                    </div>
                  )}

                  <p className="text-[12px] text-muted">Durée écoulée</p>
                  <p className={`${num} mt-1 text-[48px] font-bold leading-none tabular-nums text-ink`}>
                    {formatDuree(ecouleSel)}
                  </p>
                  <p className={`${num} mt-2 text-xl font-semibold text-[#147cff]`}>{total} DA</p>
                  <p className="mt-1 text-[11px] text-muted">
                    Début à {heureCourte(selection.debut)} · {TARIF_HORAIRE} DA / heure
                  </p>

                  <div className="mt-6 rounded-xl border border-black/5 bg-[#f8fafd] p-4">
                    {limMsSel !== null && restantSel !== null ? (
                      <>
                        <div className="mb-2 flex items-baseline justify-between">
                          <p className="text-[12px] font-medium text-muted">
                            {depasseSel ? "Dépassement" : "Temps restant"}
                          </p>
                          <p
                            className={`${num} text-lg font-bold tabular-nums ${
                              depasseSel ? "text-red-600" : "text-ink"
                            }`}
                          >
                            {depasseSel ? "+" : ""}
                            {formatDuree(Math.abs(restantSel))}
                          </p>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-black/10">
                          <div
                            className={`h-full rounded-full transition-all ${depasseSel ? "bg-red-500" : "bg-[#147cff]"}`}
                            style={{ width: `${Math.min(100, (ecouleSel / limMsSel) * 100)}%` }}
                          />
                        </div>
                        <p className="mt-2 text-[11px] text-muted">
                          Limite : {formatLimite(selection.limite_sec ?? 0)}
                        </p>

                        <p className="mb-2 mt-4 text-[12px] font-medium text-muted">Prolonger</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[5, 10, 15].map((m) => (
                            <button
                              key={m}
                              onClick={() => prolonger(selection, m)}
                              className={`${num} rounded-md border border-black/10 bg-white py-2 text-[13px] font-semibold text-ink transition hover:bg-[#f3f7ff]`}
                            >
                              +{m} min
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => retirerLimite(selection)}
                          className="mt-3 text-[11px] font-medium text-muted transition hover:text-ink"
                        >
                          Retirer la limite
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="mb-2 text-[12px] font-medium text-muted">Programmer une alarme dans…</p>
                        <div className="grid grid-cols-4 gap-2">
                          {[10, 15, 30, 60].map((m) => (
                            <button
                              key={m}
                              onClick={() => programmerAlerte(selection, m)}
                              className={`${num} rounded-md border border-black/10 bg-white py-2 text-[12px] font-semibold text-ink transition hover:bg-[#f3f7ff]`}
                            >
                              {m === 60 ? "1 h" : `${m} min`}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => terminer(selection)}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#061c59] py-3 text-sm font-semibold text-white transition hover:bg-[#03123d]"
                  >
                    <Icon name="stop" />
                    Terminer et encaisser
                  </button>
                </div>
              )}

              {/* Poste occupé : chrono figé, encaissement */}
              {selection.statut === "occupee" && selection.debut && finFige !== null && (
                <div>
                  <div className="mb-4 flex items-baseline justify-between text-[12px] text-muted">
                    <span>Durée</span>
                    <span className={`${num} text-sm font-semibold tabular-nums text-ink`}>
                      {formatDuree(finFige - new Date(selection.debut).getTime())}
                    </span>
                  </div>

                  <div className="mb-5 flex items-center justify-between rounded-lg bg-[#061c59] px-4 py-3.5 text-white">
                    <span className="text-[12px] text-white/60">Total à payer</span>
                    <span className={`${num} text-2xl font-bold`}>{total} DA</span>
                  </div>

                  <label className="mb-1.5 block text-[12px] font-medium text-muted">Montant reçu</label>
                  <div className="relative mb-3">
                    <input
                      inputMode="numeric"
                      value={montantRecu === 0 ? "" : String(montantRecu)}
                      onChange={(e) => setMontantRecu(parseInt(e.target.value.replace(/\D/g, ""), 10) || 0)}
                      placeholder="0"
                      className={`${num} w-full rounded-lg border border-black/10 bg-white px-3.5 py-3 pr-12 text-xl font-semibold text-ink outline-none transition focus:border-[#147cff]`}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] text-muted">DA</span>
                  </div>

                  <div className="mb-4 grid grid-cols-3 gap-2">
                    {MONTANTS_RAPIDES.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMontantRecu((v) => v + m)}
                        className={`${num} rounded-md border border-black/10 py-2 text-[13px] font-semibold text-ink transition hover:bg-[#f3f7ff]`}
                      >
                        +{m}
                      </button>
                    ))}
                    <button
                      onClick={() => setMontantRecu(total)}
                      className="rounded-md border border-black/10 py-2 text-[13px] font-semibold text-[#147cff] transition hover:bg-[#f3f7ff]"
                    >
                      Exact
                    </button>
                    <button
                      onClick={() => setMontantRecu(0)}
                      className="col-span-2 rounded-md border border-black/10 py-2 text-[13px] font-semibold text-muted transition hover:bg-[#f3f7ff]"
                    >
                      Effacer
                    </button>
                  </div>

                  <div
                    className={`mb-4 flex items-center justify-between rounded-lg px-4 py-3 ${
                      montantRecu === 0 ? "bg-[#f8fafd]" : monnaie >= 0 ? "bg-emerald-50" : "bg-red-50"
                    }`}
                  >
                    <span
                      className={`text-[12px] font-medium ${
                        montantRecu === 0 ? "text-muted" : monnaie >= 0 ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {montantRecu === 0 || monnaie >= 0 ? "Monnaie à rendre" : "Il manque"}
                    </span>
                    <span
                      className={`${num} text-xl font-bold ${
                        montantRecu === 0 ? "text-muted" : monnaie >= 0 ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {montantRecu === 0 ? 0 : Math.abs(monnaie)} DA
                    </span>
                  </div>

                  <button
                    onClick={() => encaisser(selection)}
                    disabled={montantRecu < total}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Icon name="check" />
                    Valider l'encaissement
                  </button>
                  <button
                    onClick={() => setFinFige(null)}
                    className="mt-2 w-full py-2 text-[12px] font-medium text-muted transition hover:text-ink"
                  >
                    Reprendre le chrono
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
