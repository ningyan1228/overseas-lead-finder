import { lookup } from "node:dns/promises";
import net from "node:net";

function privateIp(ip: string): boolean {
  if (net.isIP(ip) === 4) { const [a,b] = ip.split(".").map(Number); return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168); }
  const lower = ip.toLowerCase(); return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80:");
}
export async function assertSafePublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw); if (!["http:", "https:"].includes(url.protocol) || !url.hostname) throw new Error("仅允许公开 HTTP/HTTPS 地址。");
  if (url.hostname === "localhost" || url.hostname.endsWith(".localhost")) throw new Error("不允许访问本地地址。");
  const addresses = await lookup(url.hostname, { all: true }); if (!addresses.length || addresses.some((x) => privateIp(x.address))) throw new Error("不允许访问私有网络地址。");
  return url;
}

