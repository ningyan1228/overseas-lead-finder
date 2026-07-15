const blockedDomains = new Set([
  "google.com", "bing.com", "facebook.com", "instagram.com", "youtube.com", "linkedin.com", "wikipedia.org",
  "amazon.com", "alibaba.com", "made-in-china.com", "indiamart.com", "marketpublishers.com", "indexbox.io",
  "marketreportanalytics.com", "dataintelo.com", "researchandmarkets.com", "globenewswire.com", "prnewswire.com",
]);
const tracking = /^(utm_|gclid$|fbclid$|mc_[ce]id$)/i;
const twoPartPublicSuffixes = new Set(["co.uk", "org.uk", "ac.uk", "com.br", "com.mx", "com.au", "co.nz", "co.in", "co.jp", "co.kr", "com.tr", "com.sg", "com.my", "com.tw", "co.za", "com.ar"]);

export function normalizeUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.protocol = "https:";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.hash = "";
    [...url.searchParams.keys()].filter((key) => tracking.test(key)).forEach((key) => url.searchParams.delete(key));
    if (url.pathname === "/") url.pathname = "";
    return url.toString().replace(/\/$/, "");
  } catch { return null; }
}
export function rootDomain(raw: string): string | null {
  const normalized = normalizeUrl(raw); if (!normalized) return null;
  const host = new URL(normalized).hostname;
  const bits = host.split(".");
  const suffix = bits.slice(-2).join(".");
  return bits.length > 2 ? bits.slice(-(twoPartPublicSuffixes.has(suffix) ? 3 : 2)).join(".") : host;
}
export function isExcludedDomain(domain: string): boolean { return [...blockedDomains].some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`)); }
export function uniqueOfficialDomains(urls: string[]): string[] { return [...new Set(urls.map(rootDomain).filter((d): d is string => Boolean(d)).filter((d) => !isExcludedDomain(d)))]; }
