import type { Product } from "../types/domain.js";

// Put buyer/use-case queries first.  Searching only for the raw material name
// disproportionately returns resin producers, reports and distributors selling
// to us rather than companies that consume the material.
const pvdcBuyerTemplates = [
  '"high barrier packaging film" manufacturer',
  '"multilayer barrier film" manufacturer',
  '"flexible packaging" film converter',
  '"meat shrink bag" manufacturer',
  '"sausage casing" manufacturer',
  '"pharmaceutical blister film" manufacturer',
  '"PVC PVDC" pharmaceutical film manufacturer',
  '"vacuum packaging bag" manufacturer',
  '"polymer distributor" packaging resin',
  '"resin importer" packaging polymer',
];

const pvdcMaterialTemplates = [
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
  const applicationFirst = product.applications.flatMap((application) => [
    `${quote(application)} manufacturer`,
    `${quote(application)} converter`,
  ]);
  const buyerSpecific = [
    ...applicationFirst,
    ...product.companyTypes.map((type) => `${quote(type)} high barrier packaging`),
    ...pvdcBuyerTemplates,
  ];
  const materialSpecific = [
    `${productName} manufacturer`,
    `${productName} flexible packaging manufacturer`,
    `${productName} film converter`,
    `${productName} distributor`,
    ...product.companyTypes.map((type) => `${productName} ${type}`),
    ...product.applications.map((application) => `${quote(application)} manufacturer`),
    ...product.customKeywords,
  ];
  const exclusions = '-report -"market research" -outlook -forecast -directory -jobs';
  const base = [...buyerSpecific, ...materialSpecific, ...pvdcMaterialTemplates];
  return [...new Set(base.map((term) => `${term} ${country} ${exclusions}`.replace(/\s+/g, " ").trim()))]
    .filter((term) => !excluded.some((excludedTerm) => term.toLowerCase().includes(excludedTerm)))
    .slice(0, limit);
}
