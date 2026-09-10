import { adminClient, apiError } from "@/lib/inventory/server";

type PublishableProduct = {
  id: string;
  name: string;
  team: string;
  category: string;
  season: string | null;
  status: "draft" | "active" | "archived";
  base_price: number;
  league_id: string | null;
  team_id: string | null;
  season_id: string | null;
  updated_at: string;
  product_variants?: Array<{
    available: boolean;
    price: number;
    inventory?: Array<{
      quantity: number;
      reserved: number;
      is_active?: boolean;
    }>;
  }>;
};

type ReferenceRow = {
  id: string;
  name: string;
  slug: string;
};

type TeamReferenceRow = ReferenceRow & {
  league_id: string | null;
};

const normalizeReference = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const resolveTeam = (
  product: PublishableProduct,
  teams: TeamReferenceRow[],
  leagueId: string | undefined,
) => {
  if (!leagueId) return undefined;
  if (product.team_id) {
    return teams.find((row) => row.id === product.team_id && row.league_id === leagueId);
  }

  const sources = [product.team, product.name].map(normalizeReference).filter(Boolean);
  const candidates = teams.filter((row) => {
    if (row.league_id !== leagueId) return false;
    const names = [normalizeReference(row.name), normalizeReference(row.slug)].filter(Boolean);
    return sources.some((source) => names.some((name) => source === name || source.startsWith(name)));
  });
  return candidates.length === 1 ? candidates[0] : undefined;
};

export async function POST(request: Request) {
  try {
    const db = await adminClient(request);
    const [productsResult, leaguesResult, teamsResult, seasonsResult] = await Promise.all([
      db
        .from("products")
        .select("id,name,team,category,season,status,base_price,league_id,team_id,season_id,updated_at,product_variants(available,price,inventory(quantity,reserved,is_active))")
        .eq("status", "draft"),
      db.from("leagues").select("id,name,slug"),
      db.from("teams").select("id,name,slug,league_id"),
      db.from("seasons").select("id,name,slug"),
    ]);
    if (productsResult.error) throw productsResult.error;
    if (leaguesResult.error) throw leaguesResult.error;
    if (teamsResult.error) throw teamsResult.error;
    if (seasonsResult.error) throw seasonsResult.error;

    const leagues = (leaguesResult.data ?? []) as ReferenceRow[];
    const teams = (teamsResult.data ?? []) as TeamReferenceRow[];
    const seasons = (seasonsResult.data ?? []) as ReferenceRow[];
    const drafts = (productsResult.data ?? []) as PublishableProduct[];
    const resolvedDrafts = drafts.map((product) => {
      const league = product.league_id
        ? leagues.find((row) => row.id === product.league_id)
        : leagues.find((row) => {
          const source = normalizeReference(product.category);
          return normalizeReference(row.name) === source || normalizeReference(row.slug) === source;
        });
      const season = product.season_id
        ? seasons.find((row) => row.id === product.season_id)
        : seasons.find((row) => {
          const source = normalizeReference(product.season);
          return normalizeReference(row.name) === source || normalizeReference(row.slug) === source;
        });
      const team = resolveTeam(product, teams, league?.id);

      return {
        ...product,
        resolvedLeagueId: league?.id ?? null,
        resolvedTeamId: team?.id ?? null,
        resolvedSeasonId: season?.id ?? null,
      };
    });
    const publishable = resolvedDrafts.filter((product) =>
      product.base_price > 0
      && Boolean(product.resolvedLeagueId && product.resolvedTeamId && product.resolvedSeasonId)
      && (product.product_variants ?? []).some((variant) =>
        variant.available
        && variant.price > 0
        && (variant.inventory ?? []).some((row) => row.is_active !== false && row.quantity - row.reserved > 0),
      ),
    );

    if (publishable.length > 0) {
      const { error: updateError } = await db.rpc("save_catalog", {
        p_records: publishable.map((product) => ({
          id: product.id,
          expectedUpdatedAt: product.updated_at,
          metadata: {
            status: "active",
            league_id: product.resolvedLeagueId,
            team_id: product.resolvedTeamId,
            season_id: product.resolvedSeasonId,
          },
          variants: [],
        })),
        p_import: false,
      });
      if (updateError) throw updateError;
    }

    return Response.json({
      published: publishable.map((product) => ({ id: product.id, name: product.name })),
      skipped: drafts.length - publishable.length,
    });
  } catch (error) {
    return apiError(error);
  }
}
