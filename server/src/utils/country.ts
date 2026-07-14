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
