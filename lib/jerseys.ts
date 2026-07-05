export type KitVariant = "home" | "away" | "third";

export type DbFont = {
  id: string;
  name: string;
  slug: string;
  category: string;
  preview_text: string | null;
  font_url?: string;
  file_path?: string | null;
  delivery_file_path?: string | null;
  price: number;
  created_at?: string;
  updated_at?: string;
};

export type JerseyKit = {
  image: string;
  available: boolean;
  price?: number;
};

export type Jersey = {
  id: string;
  name: string;
  team: string;
  category: string;
  league: string;
  collection: string;
  description: string;
  price: number;
  image_front: string;
  image_back?: string;
  kit_images?: Partial<Record<KitVariant, string>>;
  kits: Record<KitVariant, JerseyKit>;
  country_colors: [string, string, string?];
  featured: boolean;
  fabric: string;
  weight_gsm: number;
  season: string;
  sizes: string[];
  breathability: number;
  durability: number;
  moisture_wicking: number;
};

export const kitOptions: { id: KitVariant; label: string }[] = [
  { id: "home", label: "Home Kit" },
  { id: "away", label: "Away Kit" },
  { id: "third", label: "Third Kit" },
];

export const kitImageFilters: Record<KitVariant, string> = {
  home: "saturate(1)",
  away: "hue-rotate(112deg) saturate(1.12)",
  third: "hue-rotate(220deg) saturate(0.95) brightness(0.92)",
};

export function getJerseyKitImage(jersey: Jersey, kit: KitVariant) {
  return jersey.kits[kit]?.image ?? jersey.kit_images?.[kit] ?? jersey.image_front;
}

export function isJerseyKitAvailable(jersey: Jersey, kit: KitVariant) {
  return jersey.kits[kit]?.available ?? false;
}

export function getFirstAvailableKit(jersey: Jersey): KitVariant {
  return kitOptions.find((kit) => isJerseyKitAvailable(jersey, kit.id))?.id ?? "home";
}

export function getJerseyKitPrice(jersey: Jersey, kit: KitVariant) {
  return jersey.kits[kit]?.price ?? jersey.price;
}

export function formatPriceAED(price: number) {
  return `AED ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(price)}`;
}

export const jerseys: Jersey[] = [
  {
    id: "world-cup-brazil-2026",
    name: "Brazil World Cup Jersey",
    team: "Brazil",
    category: "World Cup",
    league: "World Cup",
    collection: "Brazil 2026",
    description:
      "A World Cup catalog entry staged with Brazil-inspired green, yellow, and blue atmosphere.",
    price: 80,
    image_front: "/assets/tisa-shirt.png",
    image_back: "/assets/tisa-shirt.png",
    kits: {
      home: { image: "/assets/tisa-shirt.png", available: true, price: 80 },
      away: { image: "/assets/tisa-shirt.png", available: true, price: 85 },
      third: { image: "/assets/tisa-shirt.png", available: true, price: 90 },
    },
    country_colors: ["#009b3a", "#facc15", "#002776"],
    featured: true,
    fabric: "Performance knit",
    weight_gsm: 145,
    season: "2026",
    sizes: ["S", "M", "L", "XL", "2XL"],
    breathability: 92,
    durability: 88,
    moisture_wicking: 90,
  },
  {
    id: "world-cup-germany-2026",
    name: "Germany World Cup Jersey",
    team: "Germany",
    category: "World Cup",
    league: "World Cup",
    collection: "Germany 2026",
    description:
      "A World Cup catalog entry staged with Germany-inspired black, red, and gold atmosphere.",
    price: 80,
    image_front: "/assets/tisa-shirt.png",
    image_back: "/assets/tisa-shirt.png",
    kits: {
      home: { image: "/assets/tisa-shirt.png", available: true, price: 80 },
      away: { image: "/assets/tisa-shirt.png", available: true, price: 85 },
      third: { image: "/assets/tisa-shirt.png", available: false },
    },
    country_colors: ["#111111", "#dd0000", "#ffce00"],
    featured: true,
    fabric: "Performance knit",
    weight_gsm: 145,
    season: "2026",
    sizes: ["S", "M", "L", "XL", "2XL"],
    breathability: 91,
    durability: 87,
    moisture_wicking: 89,
  },
  {
    id: "world-cup-england-2026",
    name: "England World Cup Jersey",
    team: "England",
    category: "World Cup",
    league: "World Cup",
    collection: "England 2026",
    description:
      "A World Cup catalog entry staged with England-inspired white, red, and navy atmosphere.",
    price: 85,
    image_front: "/assets/tisa-shirt.png",
    image_back: "/assets/tisa-shirt.png",
    kits: {
      home: { image: "/assets/tisa-shirt.png", available: true, price: 85 },
      away: { image: "/assets/tisa-shirt.png", available: false },
      third: { image: "/assets/tisa-shirt.png", available: true, price: 90 },
    },
    country_colors: ["#ffffff", "#cf142b", "#1d2b53"],
    featured: true,
    fabric: "Performance knit",
    weight_gsm: 145,
    season: "2026",
    sizes: ["S", "M", "L", "XL", "2XL"],
    breathability: 93,
    durability: 88,
    moisture_wicking: 91,
  },
  {
    id: "world-cup-spain-2026",
    name: "Spain World Cup Jersey",
    team: "Spain",
    category: "World Cup",
    league: "World Cup",
    collection: "Spain 2026",
    description:
      "A World Cup catalog entry staged with Spain-inspired red and yellow atmosphere.",
    price: 80,
    image_front: "/assets/tisa-shirt.png",
    image_back: "/assets/tisa-shirt.png",
    kits: {
      home: { image: "/assets/tisa-shirt.png", available: true, price: 80 },
      away: { image: "/assets/tisa-shirt.png", available: true, price: 85 },
      third: { image: "/assets/tisa-shirt.png", available: false },
    },
    country_colors: ["#aa151b", "#ffc400", "#7a0f13"],
    featured: true,
    fabric: "Performance knit",
    weight_gsm: 150,
    season: "2026",
    sizes: ["S", "M", "L", "XL", "2XL"],
    breathability: 89,
    durability: 90,
    moisture_wicking: 88,
  },
  {
    id: "world-cup-argentina-2026",
    name: "Argentina World Cup Jersey",
    team: "Argentina",
    category: "World Cup",
    league: "World Cup",
    collection: "Argentina 2026",
    description:
      "A World Cup catalog entry staged with Argentina-inspired sky blue, white, and gold atmosphere.",
    price: 95,
    image_front: "/assets/tisa-shirt.png",
    image_back: "/assets/tisa-shirt.png",
    kits: {
      home: { image: "/assets/tisa-shirt.png", available: true, price: 95 },
      away: { image: "/assets/tisa-shirt.png", available: false },
      third: { image: "/assets/tisa-shirt.png", available: false },
    },
    country_colors: ["#75aadb", "#ffffff", "#f6b40e"],
    featured: true,
    fabric: "Performance knit",
    weight_gsm: 138,
    season: "2026",
    sizes: ["S", "M", "L", "XL", "2XL"],
    breathability: 95,
    durability: 86,
    moisture_wicking: 94,
  },
];

export function getFeaturedJerseys() {
  return jerseys.filter((jersey) => jersey.featured);
}

export function getJerseyById(id: string) {
  return jerseys.find((jersey) => jersey.id === id) ?? null;
}

export function getTeamFontFamily(jersey: Jersey): string {
  const team = jersey.team.toLowerCase();
  if (team.includes("brazil")) return "BrazilFont, sans-serif";
  if (team.includes("germany")) return "GermanyFont, sans-serif";
  if (team.includes("england")) return "EnglandFont, sans-serif";
  if (team.includes("spain")) return "SpainFont, sans-serif";
  if (team.includes("argentina")) return "ArgentinaFont, sans-serif";
  if (team.includes("real madrid")) return "RealMadridFont, sans-serif";
  if (team.includes("manchester united")) return "ManchesterUnitedFont, sans-serif";
  return "sans-serif";
}

export function getJerseyFontSearchTerms(jersey: Jersey) {
  return [
    jersey.team,
    jersey.category,
    jersey.league,
    jersey.collection,
  ].map((value) => value.toLowerCase());
}

export function isFontRelevantToJersey(font: Pick<DbFont, "name" | "slug" | "category">, jersey: Jersey) {
  const haystack = `${font.name} ${font.slug} ${font.category}`.toLowerCase();
  return getJerseyFontSearchTerms(jersey).some((term) => haystack.includes(term));
}

export function getTeamPrintColor(jersey: Jersey, kit: KitVariant): string {
  const team = jersey.team.toLowerCase();
  if (team.includes("brazil")) {
    return kit === "home" ? "#002776" : "#ffffff";
  }
  if (team.includes("germany")) {
    return kit === "home" ? "#111111" : "#ffffff";
  }
  if (team.includes("england")) {
    return kit === "home" ? "#1d2b53" : "#ffffff";
  }
  if (team.includes("spain")) {
    return kit === "home" ? "#ffc400" : "#aa151b";
  }
  if (team.includes("argentina")) {
    return "#111111";
  }
  if (team.includes("real madrid")) {
    return kit === "home" ? "#111111" : "#ffffff";
  }
  if (team.includes("manchester united")) {
    return kit === "home" ? "#ffffff" : "#111111";
  }
  const primaryColor = jersey.country_colors[0] || "#111111";
  if (["#ffffff", "#ffce00", "#facc15"].includes(primaryColor.toLowerCase())) {
    return "#111111";
  }
  return "#ffffff";
}
