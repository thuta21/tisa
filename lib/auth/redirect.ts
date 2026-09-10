const redirectBase = "https://tisa.local";

export function getSafeRedirectPath(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(value)) return fallback;

  try {
    const url = new URL(value, redirectBase);
    if (url.origin !== redirectBase) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function getSafeAdminRedirectPath(value: string | null | undefined) {
  const path = getSafeRedirectPath(value, "/admin");
  return path === "/admin" || path.startsWith("/admin/") || path.startsWith("/admin?")
    ? path
    : "/admin";
}
