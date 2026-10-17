// Configure the public production origin so canonical and sharing URLs are correct.
export function getSiteUrl(): URL | undefined {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) return undefined;
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("NEXT_PUBLIC_SITE_URL must be an HTTP(S) URL");
  return new URL(url.origin);
}
