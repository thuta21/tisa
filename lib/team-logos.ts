import { supabaseUrl } from "@/lib/supabase/config";

export const teamLogoBucket = "team-logos";

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
