// Vercel puts Deployment Protection (SSO login) on team-scoped aliases, branch aliases and
// per-deployment URLs by default, so tracking links built on those hosts never reach the app.
export function isProtectedVercelHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const hostname = host.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  if (!hostname.endsWith(".vercel.app")) return false;
  const label = hostname.slice(0, -".vercel.app".length);
  if (label.includes(".")) return false;
  if (label.endsWith("-projects")) return true;
  if (label.includes("-git-")) return true;
  // Deployment URLs: <project>-<9-char hash>[-<scope>].vercel.app
  return label.split("-").slice(1).some((part) => /^[a-z0-9]{9}$/.test(part) && /\d/.test(part) && /[a-z]/.test(part));
}
