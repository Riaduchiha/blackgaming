"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Chakra_Petch } from "next/font/google";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const chakra = Chakra_Petch({ subsets: ["latin"], weight: ["500", "600", "700"] });
const num = chakra.className;

type SessionLigne = {
  id: number;
  poste_numero: number;
  client: string | null;
  debut: string;
  fin: string;
  montant: number;
  recu: number;
  rendu: number;
};

const PERIODES = ["Aujourd'hui", "Hier", "7 jours", "30 jours", "Tout"] as const;
type Periode = (typeof PERIODES)[number];

const supabase = createSupabaseBrowserClient();

function Icon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const paths: Record<string, string> = {
    search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35",
    download: "M12 3v12m0 0 4-4m-4 4-4-4M5 21h14",
    cash: "M3 7h18v10H3V7Zm9 2.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",
    clock: "M12 7v5l3 3 M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
    gamepad:
      "M7 9h10a5 5 0 0 1 5 5v0a4 4 0 0 1-7 2.6L14 15h-4l-1 1.6A4 4 0 0 1 2 14v0a5 5 0 0 1 5-5Z M8 12v4M6 14h4",
    up: "M12 19V5M6 11l6-6 6 6",
    down: "M12 5v14M6 13l6 6 6-6",
    x: "M6 6l12 12M18 6 6 18",
    inbox: "M4 12h4l2 3h4l2-3h4M4 12 6 5h12l2 7M4 12v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d={paths[name]} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatDureeCourte(ms: number) {
  const totalMin = Math.round(Math.max(0, ms) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = String(totalMin % 60).padStart(2, "0");
  return h > 0 ? `${h} h ${m}` : `${totalMin} min`;
}

function heureCourte(v: string) {
  return new Date(v).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function dateCourte(v: string) {
  const d = new Date(v);
  const label = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
}

function jourMinuit(decalage: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - decalage);
  return d.getTime();
}

function bornesPeriode(p: Periode): { debut: number; fin: number } | null {
  const finTemps = Date.now();
  if (p === "Aujourd'hui") return { debut: jourMinuit(0), fin: finTemps };
  if (p === "Hier") return { debut: jourMinuit(1), fin: jourMinuit(0) };
  if (p === "7 jours") return { debut: jourMinuit(6), fin: finTemps };
  if (p === "30 jours") return { debut: jourMinuit(29), fin: finTemps };
  return null;
}

function exporterCsv(lignes: SessionLigne[]) {
  const entetes = ["Poste", "Client", "Début", "Fin", "Durée (min)", "Montant (DA)", "Reçu (DA)", "Rendu (DA)"];
  const rangees = lignes.map((s) => {
    const dureeMin = Math.round((new Date(s.fin).getTime() - new Date(s.debut).getTime()) / 60000);
    return [
      s.poste_numero,
      s.client ?? "",
      new Date(s.debut).toLocaleString("fr-FR"),
      new Date(s.fin).toLocaleString("fr-FR"),
      dureeMin,
      s.montant,
      s.recu,
      s.rendu,
    ];
  });
  const contenu = [entetes, ...rangees]
    .map((ligne) => ligne.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob(["\ufeff" + contenu], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sessions-black-gaming-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionLigne[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [periode, setPeriode] = useState<Periode>("Aujourd'hui");
  const [recherche, setRecherche] = useState("");
  const [posteFiltre, setPosteFiltre] = useState<number | null>(null);

  const charger = useCallback(async () => {
    const { data, error } = await supabase
      .from("sessions")
      .select("id, poste_numero, client, debut, fin, montant, recu, rendu")
      .order("fin", { ascending: false })
      .limit(500);
    if (error) setErreur("Impossible de charger les sessions : " + error.message);
    else setSessions((data ?? []) as SessionLigne[]);
    setChargement(false);
  }, []);

  useEffect(() => {
    charger();
    const channel = supabase
      .channel("sessions-historique")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sessions" }, () => charger())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [charger]);

  const bornes = bornesPeriode(periode);

  const filtrees = useMemo(() => {
    return sessions.filter((s) => {
      const finMs = new Date(s.fin).getTime();
      if (bornes && (finMs < bornes.debut || finMs >= bornes.fin)) return false;
      if (posteFiltre !== null && s.poste_numero !== posteFiltre) return false;
      if (recherche.trim()) {
        const q = recherche.trim().toLowerCase();
        const matchClient = (s.client ?? "").toLowerCase().includes(q);
        const matchPoste = String(s.poste_numero).includes(q);
        if (!matchClient && !matchPoste) return false;
      }
      return true;
    });
  }, [sessions, bornes, posteFiltre, recherche]);

  const totalCa = filtrees.reduce((t, s) => t + s.montant, 0);
  const nb = filtrees.length;
  const ticketMoyen = nb ? Math.round(totalCa / nb) : 0;
  const dureeTotale = filtrees.reduce((t, s) => t + (new Date(s.fin).getTime() - new Date(s.debut).getTime()), 0);

  const postesPresents = Array.from(new Set(sessions.map((s) => s.poste_numero))).sort((a, b) => a - b);

  // Groupe les sessions filtrées par jour, pour un affichage lisible même sur "Tout"
  const groupes = useMemo(() => {
    const map = new Map<string, SessionLigne[]>();
    for (const s of filtrees) {
      const cle = new Date(s.fin).toDateString();
      const liste = map.get(cle) ?? [];
      liste.push(s);
      map.set(cle, liste);
    }
    return Array.from(map.entries()).sort(
      (a, b) => new Date(b[1][0].fin).getTime() - new Date(a[1][0].fin).getTime()
    );
  }, [filtrees]);

  if (chargement) {
    return (
      <div className="animate-pulse">
        <div className="mb-5 h-10 w-56 rounded bg-black/5" />
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-black/5" />
          ))}
        </div>
        <div className="h-96 rounded-xl bg-black/5" />
      </div>
    );
  }

  const KPIS = [
    { l: "Sessions", v: String(nb), icon: "gamepad" },
    { l: "Chiffre d'affaires", v: `${totalCa.toLocaleString("fr-FR")} DA`, icon: "cash" },
    { l: "Ticket moyen", v: nb ? `${ticketMoyen} DA` : "—", icon: "up" },
    { l: "Temps total joué", v: nb ? formatDureeCourte(dureeTotale) : "—", icon: "clock" },
  ];

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-ink">SESSIONS</h1>
          <p className="mt-1.5 text-sm text-muted">Historique complet des sessions encaissées.</p>
        </div>
        <button
          onClick={() => exporterCsv(filtrees)}
          disabled={filtrees.length === 0}
          className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-4 py-2.5 text-[13px] font-semibold text-ink transition hover:bg-[#f3f7ff] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="download" className="h-4 w-4" />
          Exporter en CSV
        </button>
      </div>

      {erreur && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{erreur}</div>}

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.l} className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_10px_30px_rgba(30,70,140,.06)]">
            <div className="mb-5 flex items-start justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{k.l}</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue/10 text-blue">
                <Icon name={k.icon} className="h-4 w-4" />
              </div>
            </div>
            <strong className={`${num} block text-2xl font-bold text-ink`}>{k.v}</strong>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {PERIODES.map((p) => (
            <button
              key={p}
              onClick={() => setPeriode(p)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                periode === p
                  ? "bg-gradient-to-r from-blue to-blue-light text-white shadow-[0_6px_16px_rgba(8,124,255,.3)]"
                  : "bg-white text-muted hover:text-ink"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <select
          value={posteFiltre ?? ""}
          onChange={(e) => setPosteFiltre(e.target.value === "" ? null : Number(e.target.value))}
          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-blue"
        >
          <option value="">Tous les postes</option>
          {postesPresents.map((n) => (
            <option key={n} value={n}>
              Poste {String(n).padStart(2, "0")}
            </option>
          ))}
        </select>

        <div className="relative ml-auto w-full max-w-[240px]">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Client ou n° poste"
            className="w-full rounded-lg border border-black/10 bg-white py-2 pl-9 pr-8 text-[13px] text-ink outline-none focus:border-blue"
          />
          {recherche && (
            <button
              onClick={() => setRecherche("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
            >
              <Icon name="x" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Liste groupée par jour */}
      {groupes.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-black/5 bg-white px-6 py-16 text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#eef4fc] text-[#147cff]">
            <Icon name="inbox" className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-ink">Aucune session sur cette période</p>
          <p className="mt-1 text-[12px] text-muted">Change les filtres, ou encaisse une session sur la page Postes.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupes.map(([cleJour, lignes]) => {
            const totalJour = lignes.reduce((t, s) => t + s.montant, 0);
            return (
              <div key={cleJour} className="overflow-hidden rounded-xl border border-black/5 bg-white">
                <div className="flex items-center justify-between bg-[#f8fafd] px-5 py-3">
                  <p className="text-[12px] font-semibold text-ink">{dateCourte(lignes[0].fin)}</p>
                  <p className="text-[12px] text-muted">
                    {lignes.length} session{lignes.length > 1 ? "s" : ""} ·{" "}
                    <span className={`${num} font-semibold text-ink`}>{totalJour.toLocaleString("fr-FR")} DA</span>
                  </p>
                </div>

                <div className="grid grid-cols-[56px_1fr_90px_80px_90px_70px] gap-3 border-b border-black/5 px-5 py-2 text-[10px] font-medium uppercase tracking-wide text-muted">
                  <span>Poste</span>
                  <span>Client</span>
                  <span>Créneau</span>
                  <span>Durée</span>
                  <span className="text-right">Montant</span>
                  <span className="text-right">Rendu</span>
                </div>

                {lignes.map((s) => (
                  <div
                    key={s.id}
                    className="grid grid-cols-[56px_1fr_90px_80px_90px_70px] items-center gap-3 border-b border-black/5 px-5 py-3 text-[13px] last:border-0 hover:bg-[#f8fafd]"
                  >
                    <span className={`${num} font-semibold text-ink`}>{String(s.poste_numero).padStart(2, "0")}</span>
                    <span className="truncate text-ink">{s.client ?? "—"}</span>
                    <span className="text-[12px] text-muted">
                      {heureCourte(s.debut)}–{heureCourte(s.fin)}
                    </span>
                    <span className="text-[12px] text-muted">
                      {formatDureeCourte(new Date(s.fin).getTime() - new Date(s.debut).getTime())}
                    </span>
                    <span className={`${num} text-right font-semibold text-ink`}>{s.montant} DA</span>
                    <span className="text-right text-[12px] text-muted">{s.rendu > 0 ? `${s.rendu} DA` : "—"}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
