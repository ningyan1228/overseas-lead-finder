import type { Product } from "../types/domain.js";
const templates = [
  '"PVDC resin" manufacturer', '"PVDC-MA resin" buyer', '"PVDC copolymer" film manufacturer', 'PVDC coextruded film manufacturer', 'PVDC multilayer barrier film manufacturer', 'PVDC blown film manufacturer', 'PVDC cast film manufacturer', 'high barrier coextrusion film company', 'multilayer barrier packaging film manufacturer', 'PVDC shrink bag manufacturer', 'high barrier meat shrink bag manufacturer', 'PVDC sausage casing manufacturer', 'ham packaging film manufacturer', 'cheese barrier film manufacturer', 'fresh meat vacuum packaging manufacturer', 'PVDC pharmaceutical packaging film manufacturer', 'PVDC blister film manufacturer', 'PVC PVDC pharma film manufacturer', 'pharmaceutical barrier film company', 'PVDC resin distributor', 'barrier resin importer', 'specialty polymer distributor', 'packaging polymer distributor'
];
export function generateKeywords(product: Product, country: string, limit: number): string[] {
  const excluded = new Set(product.excludeKeywords.map((x) => x.toLowerCase()));
  const base = [...templates, ...product.applications.map((x) => `${x} manufacturer`), ...product.customKeywords];
  return [...new Set(base.map((x) => `${x} ${country}`.replace(/\s+/g, " ").trim()))].filter((x) => ![...excluded].some((term) => x.toLowerCase().includes(term))).slice(0, limit);
}

