export const tones = ["showcase", "fan", "comparison"] as const;
export type Tone = (typeof tones)[number];
export type Kit = "home" | "away" | "third";
export type SourceImage = {
  id: string;
  kit: Kit;
  side: "front" | "back";
  path: string;
  label: string;
};
export type MarketingProduct = {
  id: string;
  name: string;
  slug: string;
  team: string;
  league: string;
  season: string;
  sleeve: string;
  images: SourceImage[];
};
export type Snapshot = Omit<MarketingProduct, "images"> & {
  images: SourceImage[];
};
export type Draft = {
  id: string;
  product_id: string | null;
  snapshot: Snapshot;
  selected_images: string[];
  tone: Tone;
  caption: string;
  revision: number;
  status: "draft" | "ready" | "exported";
  archived: boolean;
  created_at: string;
  updated_at: string;
};
export type Asset = {
  id: string;
  draft_id: string;
  revision: number;
  kind: "source" | "poster" | "video";
  path: string;
  mime: string;
  bytes: number;
  source_id: string | null;
  created_at: string;
};
export type Job = {
  id: string;
  draft_id: string;
  revision: number;
  kind: "ai" | "poster" | "video";
  state: "running" | "succeeded" | "failed";
  error: string | null;
  result: { variations?: string[]; assetId?: string } | null;
  created_at: string;
  finished_at: string | null;
  expires_at: string;
  input_tokens: number;
  output_tokens: number;
};
