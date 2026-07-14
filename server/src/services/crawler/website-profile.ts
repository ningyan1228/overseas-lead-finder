import axios from "axios";
import * as cheerio from "cheerio";
import { assertSafePublicUrl } from "../../utils/ssrf.js";
import { rootDomain } from "../../utils/url.js";

export interface PublicContact {
  name: string;
  jobTitle?: string;
  department?: string;
  email?: string;
  phone?: string;
  sourceUrl: string;
  confidence: "high" | "medium" | "low";
}

export interface WebsiteProfile {
  companyName?: string;
  website: string;
  country?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  region?: string;
  emails: string[];
  phones: string[];
  contacts: PublicContact[];
  evidenceText: string;
  evidenceUrl: string;
}

interface Page { url: string; html: string; text: string; title: string; }

const maxPages = 5;
const userAgent = "LeadFinderBot/1.0 (+public-business-information-only)";
const pageLink = /(products?|applications?|solutions?|industries|about|company|contact|team|management|leadership)/i;
const excludedAsset = /\.(?:pdf|zip|rar|7z|png|jpe?g|gif|webp|svg|mp4|mp3|docx?|xlsx?)$/i;
const emailPattern = /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+/gi;
const phonePattern = /(?:\+?\d[\d\s().-]{6,}\d)/g;
const contactRole = /\b(Procurement Manager|Purchasing Manager|Raw Material Buyer|Strategic Sourcing Manager|Supply Chain Manager|Packaging Materials Manager|Technical Director|R&D Manager|Film Extrusion Manager|Plant Manager|General Manager|Managing Director|Owner|Commercial Director|Business Development Manager)\b/i;

function unique(values: string[]) { return [...new Set(values.map((value) => value.trim()).filter(Boolean))]; }
function cleanEmail(value: string) { return value.trim().toLowerCase(); }
function usableEmail(value: string) { return !/^(example|test|noreply|no-reply|webmaster)@/i.test(value); }
function generalEmail(value: string) { return /^(info|sales|contact|enquiries|inquiries|marketing|service|support|office|export|hello)@/i.test(value); }
function cleanPhone(value: string) { return value.replace(/\s+/g, " ").trim(); }

async function fetchHtml(rawUrl: string): Promise<Page | null> {
  let current = await assertSafePublicUrl(rawUrl);
  for (let redirect = 0; redirect <= 2; redirect += 1) {
    const response = await axios.get<string>(current.href, {
      responseType: "text", timeout: 12000, maxRedirects: 0, maxContentLength: 1_000_000,
      validateStatus: (status) => (status >= 200 && status < 300) || (status >= 300 && status < 400),
      headers: { "User-Agent": userAgent, Accept: "text/html,application/xhtml+xml" },
    });
    if (response.status >= 300) {
      const location = response.headers.location;
      if (!location) return null;
      current = await assertSafePublicUrl(new URL(location, current).href);
      continue;
    }
    const contentType = String(response.headers["content-type"] || "").toLowerCase();
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) return null;
    const $ = cheerio.load(response.data);
    $("script,style,noscript,svg,canvas,iframe").remove();
    return { url: current.href, html: response.data, title: $("title").first().text().trim(), text: $("body").text().replace(/\s+/g, " ").trim().slice(0, 16000) };
  }
  return null;
}

async function robotsAllows(url: string): Promise<boolean> {
  const target = new URL(url);
  try {
    await assertSafePublicUrl(target.origin);
    const response = await axios.get<string>(new URL("/robots.txt", target).href, { responseType: "text", timeout: 5000, maxRedirects: 0, maxContentLength: 100_000, validateStatus: (status) => status >= 200 && status < 500, headers: { "User-Agent": userAgent } });
    if (response.status !== 200) return true;
    let applies = false;
    for (const line of response.data.split(/\r?\n/)) {
      const [rawKey, rawValue = ""] = line.split(":", 2); const key = rawKey.trim().toLowerCase(); const value = rawValue.trim();
      if (key === "user-agent") applies = value === "*" || value.toLowerCase() === "leadfinderbot";
      if (applies && key === "disallow" && value && new URL(url).pathname.startsWith(value)) return false;
    }
  } catch { return false; }
  return true;
}

function jsonLdObjects($: cheerio.CheerioAPI): any[] {
  const values: any[] = [];
  $("script[type='application/ld+json']").each((_, element) => { try { values.push(JSON.parse($(element).text())); } catch { /* malformed public metadata is ignored */ } });
  return values;
}

function visitJsonLd(value: any, callback: (item: any) => void) {
  if (!value) return;
  if (Array.isArray(value)) { value.forEach((item) => visitJsonLd(item, callback)); return; }
  if (typeof value !== "object") return;
  callback(value);
  Object.values(value).forEach((child) => { if (child && typeof child === "object") visitJsonLd(child, callback); });
}

function addressFrom(value: any) {
  if (!value || typeof value !== "object") return {};
  const parts = [value.streetAddress, value.addressLocality, value.addressRegion, value.postalCode, value.addressCountry].filter(Boolean).map(String);
  return { address: parts.join(", ") || undefined, country: value.addressCountry ? String(value.addressCountry) : undefined, city: value.addressLocality ? String(value.addressLocality) : undefined, region: value.addressRegion ? String(value.addressRegion) : undefined, postalCode: value.postalCode ? String(value.postalCode) : undefined };
}

function publicContactsFromPage($: cheerio.CheerioAPI, sourceUrl: string): PublicContact[] {
  const found: PublicContact[] = [];
  $("h1,h2,h3,h4,p,li").each((_, element) => {
    const text = $(element).text().replace(/\s+/g, " ").trim(); const role = text.match(contactRole)?.[0];
    if (!role) return;
    const name = text.match(/^([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3})\s*[-,|]/)?.[1] || text.match(/[-,|]\s*([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3})$/)?.[1];
    if (name) found.push({ name, jobTitle: role, sourceUrl, confidence: "medium" });
  });
  return found;
}

export async function inspectPublicWebsite(initialUrl: string): Promise<WebsiteProfile | null> {
  const start = await assertSafePublicUrl(initialUrl);
  if (!(await robotsAllows(start.href))) return null;
  const home = await fetchHtml(start.origin);
  if (!home) return null;
  const domain = rootDomain(home.url); if (!domain) return null;
  const urls = [home.url]; const $home = cheerio.load(home.html);
  $home("a[href]").each((_, element) => {
    if (urls.length >= maxPages) return;
    const href = $home(element).attr("href") || ""; const label = $home(element).text();
    if (!pageLink.test(`${href} ${label}`) || excludedAsset.test(href)) return;
    try { const resolved = new URL(href, home.url); if (rootDomain(resolved.href) === domain && !urls.includes(resolved.href)) urls.push(resolved.href); } catch { /* invalid link */ }
  });
  const pages: Page[] = [home];
  for (const url of urls.slice(1)) { if (await robotsAllows(url)) { try { const page = await fetchHtml(url); if (page) pages.push(page); } catch { /* inaccessible pages are skipped */ } } }

  const emails: string[] = []; const phones: string[] = []; const contacts: PublicContact[] = [];
  let companyName: string | undefined; let country: string | undefined; let address: string | undefined; let city: string | undefined; let region: string | undefined; let postalCode: string | undefined;
  for (const page of pages) {
    const $ = cheerio.load(page.html); const pageText = page.text;
    emails.push(...($("a[href^='mailto:']").map((_, element) => $(element).attr("href")?.replace(/^mailto:/i, "") || "").get()), ...(pageText.match(emailPattern) || []));
    phones.push(...($("a[href^='tel:']").map((_, element) => $(element).attr("href")?.replace(/^tel:/i, "") || "").get()), ...(pageText.match(phonePattern) || []));
    contacts.push(...publicContactsFromPage($, page.url));
    for (const json of jsonLdObjects($)) visitJsonLd(json, (item) => {
      const types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
      if (types.some((type: unknown) => /Organization|Corporation|LocalBusiness/i.test(String(type)))) {
        companyName ||= typeof item.name === "string" ? item.name : undefined;
        const parsedAddress = addressFrom(item.address); address ||= parsedAddress.address; country ||= parsedAddress.country; city ||= parsedAddress.city; region ||= parsedAddress.region; postalCode ||= parsedAddress.postalCode;
        if (item.email) emails.push(String(item.email)); if (item.telephone) phones.push(String(item.telephone));
      }
      if (types.some((type: unknown) => String(type).toLowerCase() === "person") && typeof item.name === "string") contacts.push({ name: item.name, jobTitle: typeof item.jobTitle === "string" ? item.jobTitle : undefined, email: typeof item.email === "string" ? item.email : undefined, phone: typeof item.telephone === "string" ? item.telephone : undefined, sourceUrl: page.url, confidence: "high" });
    });
  }
  companyName ||= $home("meta[property='og:site_name']").attr("content") || home.title.split(/[|–-]/)[0].trim() || domain;
  const cleanedEmails = unique(emails.map(cleanEmail).filter(usableEmail).filter(generalEmail)).slice(0, 5); const cleanedPhones = unique(phones.map(cleanPhone).filter((phone) => phone.replace(/\D/g, "").length >= 7)).slice(0, 5);
  const dedupedContacts = Array.from(new Map(contacts.filter((contact) => contact.name && contactRole.test(contact.jobTitle || "")).map((contact) => [`${contact.name}|${contact.jobTitle}`, contact])).values()).slice(0, 8);
  const evidenceText = pages.map((page) => page.text).join(" ").slice(0, 50000);
  return { companyName, website: home.url, country, address, city, region, postalCode, emails: cleanedEmails, phones: cleanedPhones, contacts: dedupedContacts, evidenceText, evidenceUrl: home.url };
}
