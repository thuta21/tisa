import { supabaseUrl } from "@/lib/supabase/config";

export const teamLogoBucket = "team-logos";

const defaultTeamLogos: Record<string, string> = {
  "inter-miami-cf": "/assets/team-logos/mls/inter-miami-cf.png",
  "inter miami cf": "/assets/team-logos/mls/inter-miami-cf.png",
  "inter miami": "/assets/team-logos/mls/inter-miami-cf.png",
  "bayern-munich": "/assets/team-logos/bundesliga/bayern-munich.svg",
  "bayern munich": "/assets/team-logos/bundesliga/bayern-munich.svg",
  "bayern münchen": "/assets/team-logos/bundesliga/bayern-munich.svg",
  psg: "/assets/team-logos/ligue-1/psg.svg",
  "paris saint-germain": "/assets/team-logos/ligue-1/psg.svg",
};

export function getDefaultTeamLogo(team?: string | null) {
  return team ? defaultTeamLogos[team.trim().toLowerCase()] ?? null : null;
}

export function getPublicTeamLogo(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("/") || path.startsWith("http://") || path.startsWith("https://")) return path;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl}/storage/v1/object/public/${teamLogoBucket}/${encodedPath}`;
}

export function getBundledTeamLogo(path?: string | null) {
  if (!path || path.startsWith("http://") || path.startsWith("https://")) return null;
  const normalizedPath = path.replace(/^\/+/, "");
  return normalizedPath.startsWith("assets/team-logos/")
    ? `/${normalizedPath}`
    : `/assets/team-logos/${normalizedPath}`;
}
