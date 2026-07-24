"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Check, ChevronDown, Clock3, Search, Shirt, X } from "lucide-react";
import {
  formatPriceAED,
  getFirstAvailableKit,
  getJerseyKitImage,
  getJerseyKitPrice,
  isJerseyKitAvailable,
  kitOptions,
  type Jersey,
  type KitVariant,
} from "@/lib/jerseys";

type FeaturedJerseyShowcaseProps = {
  jerseys: Jersey[];
  onSelect: (jersey: Jersey) => void;
};

const teamLogoPaths: Record<string, string> = {
  argentina: "/assets/team-logos/world-cup/argentina.png",
  arsenal: "/assets/team-logos/premier-league/arsenal.png",
  "atletico madrid": "/assets/team-logos/la-liga/atletico-madrid.png",
  "aston villa": "/assets/team-logos/premier-league/aston-villa.png",
  barcelona: "/assets/team-logos/la-liga/barcelona.png",
  bournemouth: "/assets/team-logos/premier-league/bournemouth.png",
  brazil: "/assets/team-logos/world-cup/brazil.png",
  brentford: "/assets/team-logos/premier-league/brentford.png",
  "brighton & hove albion": "/assets/team-logos/premier-league/brighton-and-hove-albion.png",
  chelsea: "/assets/team-logos/premier-league/chelsea.png",
  "coventry city": "/assets/team-logos/premier-league/coventry-city.png",
  "crystal palace": "/assets/team-logos/premier-league/crystal-palace.png",
  everton: "/assets/team-logos/premier-league/everton.png",
  france: "/assets/team-logos/world-cup/france.png",
  fulham: "/assets/team-logos/premier-league/fulham.png",
  germany: "/assets/team-logos/world-cup/germany.png",
  "hull city": "/assets/team-logos/premier-league/hull-city.png",
  "ipswich town": "/assets/team-logos/premier-league/ipswich-town.png",
  "leeds united": "/assets/team-logos/premier-league/leeds-united.png",
  liverpool: "/assets/team-logos/premier-league/liverpool.png",
  "manchester city": "/assets/team-logos/premier-league/manchester-city.png",
  "manchester united": "/assets/team-logos/premier-league/manchester-united.png",
  "newcastle united": "/assets/team-logos/premier-league/newcastle-united.png",
  "nottingham forest": "/assets/team-logos/premier-league/nottingham-forest.png",
  portugal: "/assets/team-logos/world-cup/portugal.png",
  "real madrid": "/assets/team-logos/la-liga/real-madrid.png",
  spain: "/assets/team-logos/world-cup/spain.png",
  sunderland: "/assets/team-logos/premier-league/sunderland.png",
  "tottenham hotspur": "/assets/team-logos/premier-league/tottenham-hotspur.png",
};

const premierLeagueTeams = [
  "Arsenal",
  "Aston Villa",
  "Bournemouth",
  "Brentford",
  "Brighton & Hove Albion",
  "Chelsea",
  "Coventry City",
  "Crystal Palace",
  "Everton",
  "Fulham",
  "Hull City",
  "Ipswich Town",
  "Leeds United",
  "Liverpool",
  "Manchester City",
  "Manchester United",
  "Newcastle United",
  "Nottingham Forest",
  "Sunderland",
  "Tottenham Hotspur",
] as const;

const laLigaTeams = [
  "Atletico Madrid",
  "Barcelona",
  "Real Madrid",
] as const;

const leagueTeamNames: Record<string, readonly string[]> = {
  "la liga": laLigaTeams,
  "premier league": premierLeagueTeams,
};

const configuredLeagueNames = ["Premier League", "World Cup", "La Liga"];

const leagueLogoPaths: Record<string, string> = {
  "la liga": "/assets/league-logos/la-liga.png",
  "premier league": "/assets/league-logos/premier-league.png",
  "world cup": "/assets/league-logos/world-cup.png",
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getTeamKey(team: string) {
  const key = team.trim().toLowerCase();
  const aliases: Record<string, string> = {
    "afc bournemouth": "bournemouth",
    brighton: "brighton & hove albion",
    "brighton and hove albion": "brighton & hove albion",
    ipswich: "ipswich town",
    leeds: "leeds united",
    newcastle: "newcastle united",
    nottingham: "nottingham forest",
    tottenham: "tottenham hotspur",
  };

  return aliases[key] ?? key;
}

function getSeasonLabel(jersey: Jersey) {
  return jersey.season || jersey.collection || "Current season";
}

function colorWithAlpha(color: string, alpha: number) {
  const value = color.trim();
  const shortHex = /^#([\da-f])([\da-f])([\da-f])$/i.exec(value);
  const fullHex = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value);

  if (shortHex) {
    const [, red, green, blue] = shortHex;
    return `rgba(${parseInt(red + red, 16)}, ${parseInt(green + green, 16)}, ${parseInt(blue + blue, 16)}, ${alpha})`;
  }

  if (fullHex) {
    const [, red, green, blue] = fullHex;
    return `rgba(${parseInt(red, 16)}, ${parseInt(green, 16)}, ${parseInt(blue, 16)}, ${alpha})`;
  }

  return `color-mix(in srgb, ${value} ${Math.round(alpha * 100)}%, transparent)`;
}

export default function FeaturedJerseyShowcase({ jerseys, onSelect }: FeaturedJerseyShowcaseProps) {
  const firstJersey = jerseys[0];
  const [selectedLeague, setSelectedLeague] = useState(firstJersey?.league ?? "");
  const [selectedTeam, setSelectedTeam] = useState(firstJersey?.team ?? "");
  const [selectedSeason, setSelectedSeason] = useState(firstJersey ? getSeasonLabel(firstJersey) : "");
  const [selectedKit, setSelectedKit] = useState<KitVariant>(
    firstJersey ? getFirstAvailableKit(firstJersey) : "home",
  );
  const [leagueMenuOpen, setLeagueMenuOpen] = useState(false);
  const [leagueSearch, setLeagueSearch] = useState("");
  const [highlightedLeagueIndex, setHighlightedLeagueIndex] = useState(0);
  const [comingSoonTeam, setComingSoonTeam] = useState<string | null>(null);

  const leagues = useMemo(
    () => unique([...configuredLeagueNames, ...jerseys.map((jersey) => jersey.league)]),
    [jerseys],
  );
  const filteredLeagues = useMemo(() => {
    const query = leagueSearch.trim().toLowerCase();
    return query ? leagues.filter((league) => league.toLowerCase().includes(query)) : leagues;
  }, [leagueSearch, leagues]);
  const leagueJerseys = useMemo(
    () => jerseys.filter((jersey) => jersey.league === selectedLeague),
    [jerseys, selectedLeague],
  );
  const teams = useMemo(() => {
    const configuredTeams = leagueTeamNames[selectedLeague.trim().toLowerCase()] ?? [];
    const teamNames = new Map<string, string>();
    const productTeamKeys = new Set(leagueJerseys.map((jersey) => getTeamKey(jersey.team)));

    [...configuredTeams, ...leagueJerseys.map((jersey) => jersey.team)].forEach((team) => {
      const key = getTeamKey(team);
      if (!teamNames.has(key)) teamNames.set(key, team);
    });

    return Array.from(teamNames.values()).sort((firstTeam, secondTeam) => {
      const firstHasProduct = productTeamKeys.has(getTeamKey(firstTeam));
      const secondHasProduct = productTeamKeys.has(getTeamKey(secondTeam));

      if (firstHasProduct !== secondHasProduct) {
        return firstHasProduct ? -1 : 1;
      }

      return firstTeam.localeCompare(secondTeam, "en", { sensitivity: "base" });
    });
  }, [leagueJerseys, selectedLeague]);
  const availableTeamKeys = useMemo(
    () => new Set(leagueJerseys.map((jersey) => getTeamKey(jersey.team))),
    [leagueJerseys],
  );
  const selectedLeagueHasProducts = leagueJerseys.length > 0;
  const teamJerseys = useMemo(
    () => leagueJerseys.filter((jersey) => getTeamKey(jersey.team) === getTeamKey(selectedTeam)),
    [leagueJerseys, selectedTeam],
  );

  const selectedJersey = useMemo(
    () => teamJerseys.find((jersey) => getSeasonLabel(jersey) === selectedSeason) ?? teamJerseys[0] ?? leagueJerseys[0] ?? firstJersey,
    [firstJersey, leagueJerseys, selectedSeason, teamJerseys],
  );

  useEffect(() => {
    if (!leagueMenuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLeagueMenuOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [leagueMenuOpen]);

  useEffect(() => {
    if (!comingSoonTeam) return;
    const timer = window.setTimeout(() => setComingSoonTeam(null), 4200);
    return () => window.clearTimeout(timer);
  }, [comingSoonTeam]);

  if (!selectedJersey) return null;

  const activeKit = isJerseyKitAvailable(selectedJersey, selectedKit)
    ? selectedKit
    : getFirstAvailableKit(selectedJersey);
  const colors = selectedJersey.country_colors;
  const primaryColor = colors[0] ?? "#171717";
  const secondaryColor = colors[1] ?? "#f5f5f5";
  const accentColor = colors[2] ?? primaryColor;
  const selectedPrice = getJerseyKitPrice(selectedJersey, activeKit);
  const selectedLeagueLogo = leagueLogoPaths[selectedLeague.trim().toLowerCase()];
  const selectedTeamLogo = teamLogoPaths[getTeamKey(selectedJersey.team)];
  const selectedKitData = selectedJersey.kits[activeKit] as typeof selectedJersey.kits[typeof activeKit] & {
    sizes?: string[];
    stock?: number;
  };
  const sizes = selectedKitData.sizes?.length ? selectedKitData.sizes : selectedJersey.sizes;

  const selectLeague = (league: string) => {
    const nextJersey = jerseys.find((jersey) => jersey.league === league);
    const configuredTeams = leagueTeamNames[league.trim().toLowerCase()] ?? [];
    setComingSoonTeam(null);
    setSelectedLeague(league);

    if (nextJersey) {
      setSelectedTeam(nextJersey.team);
      setSelectedSeason(getSeasonLabel(nextJersey));
      return;
    }

    setSelectedTeam(configuredTeams[0] ?? "");
    setSelectedSeason("");
  };

  const selectTeam = (team: string) => {
    const nextJersey = leagueJerseys.find(
      (jersey) => getTeamKey(jersey.team) === getTeamKey(team),
    );
    if (!nextJersey) {
      setComingSoonTeam(team);
      return;
    }
    setComingSoonTeam(null);
    setSelectedTeam(nextJersey.team);
    setSelectedSeason(getSeasonLabel(nextJersey));
  };

  const chooseLeague = (league: string) => {
    selectLeague(league);
    setLeagueMenuOpen(false);
    setLeagueSearch("");
    setHighlightedLeagueIndex(0);
  };

  return (
    <section className="tisa-showcase-surface relative isolate flex min-h-[100svh] w-full flex-col overflow-hidden pt-[73px] text-neutral-950 md:min-h-screen">
      <div className="relative z-30 mx-auto w-full max-w-7xl px-5 pt-4 sm:px-6 md:pt-5">
        <div className="inline-flex max-w-full items-center gap-1.5 overflow-visible rounded-[20px] border border-black/[0.08] bg-white/90 p-1.5 shadow-[0_16px_45px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:gap-2">
          <div className="relative z-40 w-[200px] shrink-0 sm:w-[215px]">
            <button
              type="button"
              role="combobox"
              aria-label="Choose a league"
              aria-haspopup="listbox"
              aria-expanded={leagueMenuOpen}
              aria-controls="league-options"
              onClick={() => {
                setLeagueMenuOpen((open) => !open);
                setLeagueSearch("");
                setHighlightedLeagueIndex(Math.max(0, leagues.indexOf(selectedLeague)));
              }}
              className={`flex h-12 w-full items-center justify-between gap-3 rounded-[14px] border px-3.5 text-left text-[13px] font-bold text-[#E10714] outline-none transition-all duration-200 focus:ring-2 focus:ring-[#E10714]/20 ${leagueMenuOpen ? "border-[#E10714] bg-[#E10714]/[0.055] shadow-sm" : "border-[#E10714]/45 bg-white hover:border-[#E10714] hover:bg-[#E10714]/[0.035]"}`}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                {selectedLeagueLogo && (
                  <span className="relative size-6 shrink-0">
                    <Image src={selectedLeagueLogo} alt="" fill sizes="24px" className="object-contain" />
                  </span>
                )}
                <span className="truncate">{selectedLeague}</span>
              </span>
              <ChevronDown className={`shrink-0 transition-transform ${leagueMenuOpen ? "rotate-180" : ""}`} size={17} />
            </button>

            {leagueMenuOpen && (
              <button
                type="button"
                aria-label="Close league picker"
                onClick={() => setLeagueMenuOpen(false)}
                className="fixed inset-0 z-30 cursor-default"
              />
            )}

            <AnimatePresence>
              {leagueMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                  className="absolute left-0 top-[calc(100%+0.75rem)] z-40 w-full rounded-2xl border border-black/10 bg-white p-2 shadow-2xl shadow-black/15"
                >
                  <label className="relative block">
                    <span className="sr-only">Search leagues</span>
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                    <input
                      autoFocus
                      value={leagueSearch}
                      onChange={(event) => {
                        setLeagueSearch(event.target.value);
                        setHighlightedLeagueIndex(0);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowDown") {
                          event.preventDefault();
                          setHighlightedLeagueIndex((index) => Math.min(index + 1, filteredLeagues.length - 1));
                        }
                        if (event.key === "ArrowUp") {
                          event.preventDefault();
                          setHighlightedLeagueIndex((index) => Math.max(index - 1, 0));
                        }
                        if (event.key === "Enter" && filteredLeagues[highlightedLeagueIndex]) {
                          event.preventDefault();
                          chooseLeague(filteredLeagues[highlightedLeagueIndex]);
                        }
                      }}
                      placeholder="Search leagues..."
                      className="h-11 w-full rounded-xl border border-black/10 bg-neutral-50 pl-10 pr-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[#E10714] focus:ring-2 focus:ring-[#E10714]/10"
                    />
                  </label>

                  <div id="league-options" role="listbox" aria-label="Leagues" className="mt-2 max-h-56 overflow-y-auto">
                    {filteredLeagues.length > 0 ? filteredLeagues.map((league, index) => {
                      const selected = league === selectedLeague;
                      const highlighted = index === highlightedLeagueIndex;
                      const leagueLogo = leagueLogoPaths[league.trim().toLowerCase()];
                      return (
                        <button
                          key={league}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onMouseEnter={() => setHighlightedLeagueIndex(index)}
                          onClick={() => chooseLeague(league)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${selected ? "bg-[#E10714]/8 text-[#E10714]" : highlighted ? "bg-neutral-100 text-neutral-950" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"}`}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            {leagueLogo && (
                              <span className="relative size-6 shrink-0">
                                <Image src={leagueLogo} alt="" fill sizes="24px" className="object-contain" />
                              </span>
                            )}
                            <span className="truncate">{league}</span>
                          </span>
                          {selected && <Check size={16} strokeWidth={2.5} />}
                        </button>
                      );
                    }) : (
                      <p className="px-3 py-5 text-center text-sm text-neutral-400">No leagues found</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="mx-1 h-8 w-px shrink-0 bg-black/10" aria-hidden="true" />

            <div className="flex items-center gap-1.5" role="tablist" aria-label="Choose a team">
            {teams.map((team) => {
              const teamKey = getTeamKey(team);
              const available = availableTeamKeys.has(teamKey);
              const active = available && teamKey === getTeamKey(selectedTeam);
              const teamLogo = teamLogoPaths[teamKey];
              return (
                <button
                  key={team}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={available ? team : `${team}, coming soon`}
                  title={available ? team : `${team} — Coming soon`}
                  onClick={() => selectTeam(team)}
                  className={`relative flex size-12 shrink-0 items-center justify-center rounded-[14px] border p-2 outline-none transition-all duration-200 focus:ring-2 focus:ring-[#E10714]/20 ${active ? "border-[#E10714] bg-[#E10714]/[0.055] text-[#E10714] shadow-[0_8px_20px_rgba(225,7,20,0.12)]" : available ? "border-transparent bg-black/[0.025] text-neutral-600 hover:-translate-y-0.5 hover:border-[#E10714]/30 hover:bg-white hover:text-[#E10714] hover:shadow-md" : "border-transparent bg-black/[0.018] text-neutral-400 opacity-60 hover:-translate-y-0.5 hover:border-black/10 hover:bg-white hover:opacity-100 hover:shadow-md"}`}
                >
                  {teamLogo ? (
                    <span className="relative size-8 shrink-0">
                      <Image src={teamLogo} alt="" fill sizes="32px" className="object-contain" />
                    </span>
                  ) : (
                    <span aria-hidden="true" className="text-xs font-black uppercase tracking-tight">
                      {team.split(/\s+/).map((word) => word[0]).join("").slice(0, 3)}
                    </span>
                  )}
                  {!available && (
                    <span className="absolute -right-1 -top-1 grid size-[17px] place-items-center rounded-full border-2 border-white bg-neutral-800 text-white shadow-sm">
                      <Clock3 size={8} strokeWidth={2.7} />
                    </span>
                  )}
                </button>
              );
            })}
            </div>

            {teamJerseys.length > 1 && (
              <>
                <span className="mx-1 h-8 w-px shrink-0 bg-black/10" aria-hidden="true" />
                <label className="relative shrink-0">
                  <span className="sr-only">Choose a season</span>
                  <select
                    value={getSeasonLabel(selectedJersey)}
                    onChange={(event) => setSelectedSeason(event.target.value)}
                    className="h-12 min-w-[132px] appearance-none rounded-[14px] border border-[#E10714]/45 bg-white py-0 pl-3.5 pr-9 text-[13px] font-semibold text-[#E10714] outline-none transition-all hover:border-[#E10714] hover:bg-[#E10714]/[0.035] focus:border-[#E10714] focus:ring-2 focus:ring-[#E10714]/20"
                  >
                    {teamJerseys.map((jersey) => {
                      const season = getSeasonLabel(jersey);
                      return <option key={jersey.id} value={season}>{season}</option>;
                    })}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#E10714]" size={15} />
                </label>
              </>
            )}
          </div>
        </div>

        <AnimatePresence>
          {comingSoonTeam && (
            <motion.div
              role="status"
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-5 top-[calc(100%+0.75rem)] z-20 flex w-[min(340px,calc(100%-2.5rem))] items-center gap-3 rounded-2xl border border-black/10 bg-white/95 p-3 shadow-[0_18px_48px_rgba(0,0,0,0.16)] backdrop-blur-xl sm:left-6"
            >
              <span className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-neutral-100">
                {teamLogoPaths[getTeamKey(comingSoonTeam)] ? (
                  <Image
                    src={teamLogoPaths[getTeamKey(comingSoonTeam)]}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-contain p-2"
                  />
                ) : (
                  <Clock3 size={18} className="text-neutral-500" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#E10714]">Coming soon</span>
                <span className="mt-0.5 block truncate text-sm font-bold text-neutral-950">{comingSoonTeam}</span>
                <span className="block text-xs text-neutral-500">New kits are being prepared.</span>
              </span>
              <button
                type="button"
                aria-label="Close coming soon message"
                onClick={() => setComingSoonTeam(null)}
                className="grid size-8 shrink-0 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
              >
                <X size={15} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {selectedLeagueHasProducts ? (
      <div className="relative z-10 mx-auto grid w-full max-w-[1320px] flex-1 grid-cols-1 items-center gap-5 px-5 py-5 sm:px-6 md:grid-cols-[0.78fr_1.45fr_1fr] md:gap-5 md:py-7 lg:grid-cols-[0.72fr_1.55fr_1fr] lg:gap-7">
        <div className="order-2 z-20 grid grid-cols-2 gap-5 rounded-[24px] border border-white/90 bg-white/72 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.07)] backdrop-blur-xl md:order-1 md:block md:p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">Price</p>
            <p className="mt-1.5 text-3xl font-black tracking-[-0.05em] sm:text-4xl">{formatPriceAED(selectedPrice)}</p>
            <p className="mt-1 text-[11px] font-medium text-neutral-400">VAT included</p>
          </div>
          <div className="md:mt-7 md:border-t md:border-black/[0.06] md:pt-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">Available sizes</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {sizes.length > 0 ? sizes.slice(0, 6).map((size) => (
                <span key={size} className="grid h-9 min-w-9 place-items-center rounded-full border border-black/[0.08] bg-white px-2.5 text-[11px] font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#E10714] hover:bg-[#E10714] hover:text-white hover:shadow-md hover:shadow-[#E10714]/15">{size}</span>
              )) : <span className="text-sm text-neutral-500">Check details</span>}
            </div>
          </div>
          <div className="col-span-2 md:mt-7 md:border-t md:border-black/[0.06] md:pt-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
              <span className="grid size-5 place-items-center rounded-full bg-emerald-500 text-white"><Check size={11} strokeWidth={3} /></span>
              {selectedKitData?.stock ? `${selectedKitData.stock} ready to order` : "Availability shown in details"}
            </div>
          </div>
        </div>

        <div className="order-1 relative isolate z-10 min-h-[380px] md:order-2 md:min-h-[500px] lg:min-h-[590px]">
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 aspect-square w-[88%] max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 shadow-[inset_0_0_80px_rgba(255,255,255,0.85),0_24px_90px_rgba(0,0,0,0.06)] transition-colors duration-700"
            style={{
              background: `radial-gradient(circle at 50% 42%, rgba(255,255,255,0.98) 0%, ${colorWithAlpha(secondaryColor, 0.12)} 54%, ${colorWithAlpha(primaryColor, 0.08)} 100%)`,
            }}
          />
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 aspect-square w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-black/[0.07]" />
          <div
            className="pointer-events-none absolute bottom-[7%] left-1/2 z-10 h-14 w-[66%] -translate-x-1/2 rounded-[50%] blur-xl transition-colors duration-700"
            style={{
              background: `radial-gradient(ellipse at center, ${colorWithAlpha(primaryColor, 0.18)} 0%, rgba(0,0,0,0.12) 44%, transparent 74%)`,
            }}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedJersey.id}-${activeKit}`}
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 z-20"
            >
              <SafeJerseyImage
                source={getJerseyKitImage(selectedJersey, activeKit)}
                alt={`${selectedJersey.team} ${activeKit} jersey`}
                sizes="(max-width: 768px) 90vw, 52vw"
                priority
                className="object-contain drop-shadow-[0_32px_38px_rgba(0,0,0,0.28)]"
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="order-3 z-20 rounded-[28px] border border-white/90 bg-white/78 p-5 shadow-[0_20px_65px_rgba(0,0,0,0.09)] backdrop-blur-xl md:p-6">
          <div className="flex items-center gap-3">
            <AnimatePresence mode="wait">
              {selectedTeamLogo && (
                <motion.div
                  key={selectedJersey.team}
                  initial={{ opacity: 0, y: 6, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.94 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="relative size-11 shrink-0 overflow-hidden rounded-[13px] border border-black/[0.08] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.07)]"
                >
                  <Image
                    src={selectedTeamLogo}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-contain p-2.5"
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">Featured kit</p>
              <p className="mt-1 text-xs font-semibold text-neutral-500">{selectedJersey.team} · {getSeasonLabel(selectedJersey)}</p>
            </div>
          </div>
          <h1 className="mt-5 max-w-md text-3xl font-black leading-[0.96] tracking-[-0.055em] sm:text-4xl md:text-3xl lg:text-[38px]">{selectedJersey.name}</h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-neutral-500">{selectedJersey.description || `${selectedJersey.team}'s ${getSeasonLabel(selectedJersey)} shirt, ready for your name and number.`}</p>

          <div className="mt-6 border-t border-black/[0.06] pt-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400">Choose kit</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {kitOptions.map((kit) => {
                const available = isJerseyKitAvailable(selectedJersey, kit.id);
                const active = activeKit === kit.id;
                return (
                  <button
                    key={kit.id}
                    type="button"
                    disabled={!available}
                    aria-pressed={active}
                    onClick={() => setSelectedKit(kit.id)}
                    className={`group rounded-2xl border p-2 text-center transition-all duration-200 ${active ? "border-[#E10714] bg-[#E10714]/[0.04] shadow-[0_8px_24px_rgba(225,7,20,0.1)]" : available ? "border-black/[0.07] bg-white/70 hover:-translate-y-0.5 hover:border-black/15 hover:bg-white hover:shadow-md" : "cursor-not-allowed border-black/[0.04] bg-white/30 opacity-35"}`}
                  >
                    <span className="relative mx-auto block h-14 w-full">
                      {available ? <SafeJerseyImage source={getJerseyKitImage(selectedJersey, kit.id)} alt="" sizes="84px" /> : <Shirt className="absolute inset-0 m-auto text-neutral-300" size={24} />}
                    </span>
                    <span className="mt-1 block text-[10px] font-bold">{kit.label.replace(" Kit", "")}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelect(selectedJersey)}
            className="mt-6 flex h-14 w-full items-center justify-between rounded-full bg-[#E10714] pl-6 pr-2 text-sm font-bold text-white shadow-[0_14px_32px_rgba(225,7,20,0.25)] transition-all hover:-translate-y-0.5 hover:bg-[#c90612] hover:shadow-[0_18px_38px_rgba(225,7,20,0.3)] active:translate-y-0"
          >
            View jersey details
            <span className="grid size-10 place-items-center rounded-full bg-white text-[#E10714]"><ArrowUpRight size={17} /></span>
          </button>
        </div>
      </div>
      ) : (
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-5 py-10 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/90 bg-white/78 px-6 py-12 text-center shadow-[0_24px_80px_rgba(0,0,0,0.09)] backdrop-blur-xl sm:px-10 sm:py-16"
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-1"
              style={{
                background: `linear-gradient(90deg, ${colorWithAlpha(primaryColor, 0.15)}, #E10714, ${colorWithAlpha(accentColor, 0.15)})`,
              }}
            />
            <span className="mx-auto inline-flex items-center gap-2 rounded-full bg-[#E10714]/[0.07] px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#E10714]">
              <Clock3 size={13} />
              Coming soon
            </span>
            <h1 className="mx-auto mt-5 max-w-xl text-4xl font-black tracking-[-0.055em] text-neutral-950 sm:text-5xl">
              {selectedLeague} collection
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-neutral-500 sm:text-base">
              We&apos;re preparing the newest shirts from your favourite clubs. Select a team to preview what&apos;s coming next.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {teams.map((team) => {
                const teamLogo = teamLogoPaths[getTeamKey(team)];
                return (
                  <button
                    key={team}
                    type="button"
                    onClick={() => selectTeam(team)}
                    aria-label={`${team}, coming soon`}
                    title={`${team} — Coming soon`}
                    className="group relative grid size-20 place-items-center rounded-[22px] border border-black/[0.07] bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#E10714]/30 hover:shadow-[0_14px_30px_rgba(0,0,0,0.1)]"
                  >
                    {teamLogo ? (
                      <span className="relative size-12">
                        <Image src={teamLogo} alt="" fill sizes="48px" className="object-contain" />
                      </span>
                    ) : (
                      <span className="text-sm font-black text-neutral-400">
                        {team.split(/\s+/).map((word) => word[0]).join("").slice(0, 3)}
                      </span>
                    )}
                    <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border-2 border-white bg-neutral-800 text-white">
                      <Clock3 size={9} strokeWidth={2.7} />
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </section>
  );
}

function SafeJerseyImage({
  source,
  alt,
  sizes,
  priority = false,
  className = "object-contain",
}: {
  source: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={source}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`select-none ${className}`}
      onError={(event) => {
        event.currentTarget.src = "/assets/tisa-shirt.png";
      }}
    />
  );
}
