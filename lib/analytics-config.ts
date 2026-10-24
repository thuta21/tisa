export const TISA_MEASUREMENT_ID = "G-HZEBCV1FMR";

export type AnalyticsConfig = { enabled: boolean; measurementId: string; origin: string };

export function getAnalyticsConfig(env: Record<string, string | undefined>): AnalyticsConfig {
  const measurementId = env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? TISA_MEASUREMENT_ID;
  let origin = "";
  try {
    const url = new URL(env.NEXT_PUBLIC_SITE_URL ?? "https://tisa-iota.vercel.app");
    if (url.protocol === "https:") origin = url.origin;
  } catch { /* Invalid configuration leaves analytics disabled. */ }
  return { measurementId, origin, enabled: env.VERCEL_ENV === "production" && Boolean(origin) && /^G-[A-Z0-9]+$/.test(measurementId) };
}

// An allowlist keeps account, authentication and admin URLs out of measurement.
export function isAnalyticsPath(path: string) {
  return /^(?:\/(?:shop|contact|customer-care|privacy|terms|fonts|pricelists|launch)?|\/jersey\/[a-z0-9-]+)\/?$/.test(path);
}
