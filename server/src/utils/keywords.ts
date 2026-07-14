import type { Product } from "../types/domain.js";

const pvdcTemplates = [
  '"PVDC resin" film manufacturer',
  '"PVDC coated film" manufacturer',
  '"PVDC film" flexible packaging manufacturer',
  '"PVDC" barrier film converter',
  '"PVDC" multilayer film manufacturer',
  '"PVDC" shrink bag manufacturer',
  '"PVDC" blister film manufacturer',
  '"PVDC resin" polymer distributor',
  '"PVDC resin" importer',
];

function quote(value: string) { return `"${value.replaceAll('"', "").trim()}"`; }

export function generateKeywords(product: Product, country: string, limit: number): string[] {
  const excluded = product.excludeKeywords.map((x) => x.toLowerCase());
  const productName = quote(product.englishName);
  const productSpecific = [
    `${productName} manufacturer`,
    `${productName} flexible packaging manufacturer`,
    `${productName} film converter`,
    `${productName} distributor`,
    ...product.companyTypes.map((type) => `${productName} ${type}`),
    ...product.applications.map((application) => `${quote(application)} manufacturer`),
    ...product.customKeywords,
  ];
  const base = [...productSpecific, ...pvdcTemplates];
  return [...new Set(base.map((term) => `${term} ${country}`.replace(/\s+/g, " ").trim()))]
    .filter((term) => !excluded.some((excludedTerm) => term.toLowerCase().includes(excludedTerm)))
    .slice(0, limit);
}
