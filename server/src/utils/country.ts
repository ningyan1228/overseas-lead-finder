const aliases: Record<string, string> = {
  germany: "germany", deutschland: "germany", de: "germany",
  turkey: "turkey", "türkiye": "turkey", turkiye: "turkey", tr: "turkey",
  china: "china", "people's republic of china": "china", cn: "china",
  "hong kong": "hong kong", hk: "hong kong",
  "united states": "united states", "united states of america": "united states", usa: "united states", us: "united states",
  "united kingdom": "united kingdom", uk: "united kingdom", "great britain": "united kingdom", gb: "united kingdom",
  france: "france", fr: "france", italy: "italy", it: "italy", spain: "spain", es: "spain",
  brazil: "brazil", br: "brazil", mexico: "mexico", mx: "mexico", india: "india", in: "india",
  japan: "japan", jp: "japan", "south korea": "south korea", korea: "south korea", kr: "south korea",
  vietnam: "vietnam", vn: "vietnam", indonesia: "indonesia", id: "indonesia",
  thailand: "thailand", th: "thailand", malaysia: "malaysia", my: "malaysia",
  poland: "poland", pl: "poland", netherlands: "netherlands", nl: "netherlands",
  belgium: "belgium", be: "belgium", austria: "austria", at: "austria",
  switzerland: "switzerland", ch: "switzerland", canada: "canada", ca: "canada",
  australia: "australia", au: "australia",
  "美国": "united states", "加拿大": "canada", "墨西哥": "mexico", "巴西": "brazil",
  "德国": "germany", "法国": "france", "意大利": "italy", "西班牙": "spain", "葡萄牙": "portugal", "英国": "united kingdom", "爱尔兰": "ireland",
  "荷兰": "netherlands", "比利时": "belgium", "波兰": "poland", "奥地利": "austria", "瑞士": "switzerland", "瑞典": "sweden", "挪威": "norway", "丹麦": "denmark", "芬兰": "finland", "捷克": "czechia", "罗马尼亚": "romania",
  "土耳其": "turkey", "沙特阿拉伯": "saudi arabia", "阿联酋": "united arab emirates", "以色列": "israel", "埃及": "egypt", "南非": "south africa",
  "中国": "china", "中国大陆": "china", "中国香港": "hong kong", "香港": "hong kong", "日本": "japan", "韩国": "south korea", "南韩": "south korea", "印度": "india", "越南": "vietnam", "泰国": "thailand", "印度尼西亚": "indonesia", "印尼": "indonesia", "马来西亚": "malaysia", "新加坡": "singapore", "菲律宾": "philippines", "澳大利亚": "australia", "新西兰": "new zealand",
};

function normalize(value?: string) {
  return (value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

export function canonicalCountry(value?: string) {
  const normalized = normalize(value);
  return aliases[normalized] || normalized || undefined;
}

export function countriesMatch(left?: string, right?: string) {
  const a = canonicalCountry(left);
  const b = canonicalCountry(right);
  return Boolean(a && b && a === b);
}

export function knownCountryIn(value?: string) {
  const normalized = normalize(value);
  if (!normalized) return undefined;
  return Object.entries(aliases)
    .filter(([alias]) => alias.length > 2 && new RegExp(`(^|[^a-z])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z])`, "i").test(normalized))
    .map(([, country]) => country)[0];
}

// A country-code domain is weaker than a postal address, but it is useful
// supporting evidence when a public company site omits JSON-LD address data.
const countryDomainSuffixes: Record<string, string[]> = {
  germany: [".de"], turkey: [".tr"], brazil: [".br"], spain: [".es"], france: [".fr"], italy: [".it"],
  portugal: [".pt"], poland: [".pl"], netherlands: [".nl"], belgium: [".be"], austria: [".at"],
  switzerland: [".ch"], canada: [".ca"], australia: [".com.au", ".au"], japan: [".co.jp", ".jp"],
  india: [".co.in", ".in"], south korea: [".co.kr", ".kr"], singapore: [".com.sg", ".sg"],
  united kingdom: [".co.uk", ".org.uk", ".uk"],
};

export function websiteMatchesCountryDomain(country: string | undefined, website: string | undefined) {
  const canonical = canonicalCountry(country);
  if (!canonical || !website) return false;
  try {
    const hostname = new URL(website).hostname.toLowerCase();
    return (countryDomainSuffixes[canonical] || []).some((suffix) => hostname === suffix.slice(1) || hostname.endsWith(suffix));
  } catch { return false; }
}
