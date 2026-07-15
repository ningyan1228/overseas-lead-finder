import type { LeadGrade } from "../types/domain.js";

export interface LeadAssessment {
  score: number;
  grade: LeadGrade;
  details: string;
  eligible: boolean;
  companyType?: string;
}

export interface LeadEvidence {
  publicContactCount?: number;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasAddress?: boolean;
}

// These pages can mention a product many times, but they are not organisations
// that buy, convert, distribute, or manufacture it.
const disqualifiers: [RegExp, string][] = [
  [/(market\s*(research|report|outlook|analysis|size|forecast)|industry\s*report|research\s*report|buy\s*(this|the)?\s*report)/i, "市场报告或研究页面"],
  [/\b(news|blog|directory|jobs?|webinar|whitepaper|wikipedia)\b/i, "资讯、目录或招聘页面"],
  [/(marketpublishers|indexbox|marketreportanalytics|data\s*insights|global\s*info\s*research)/i, "已识别的市场研究来源"],
  [/(e-?commerce|add to cart|shopping cart|buy now|marketplace|wholesale platform)/i, "电商或交易平台"],
];

const signals: [RegExp, number, string, "manufacturer" | "distributor" | ""][] = [
  [/(film|flexible|pharmaceutical|food)\s+packaging\s+(manufacturer|converter|producer)|\b(manufacturer|converter|producer)\b.{0,45}\b(packaging|film)\b/i, 35, "明确的包装或薄膜制造信号", "manufacturer"],
  [/(coextrud|co-extrud|multilayer).{0,60}(barrier|film)|(barrier|film).{0,60}(coextrud|co-extrud|multilayer)/i, 25, "共挤或多层高阻隔膜能力", "manufacturer"],
  [/(blown film|cast film|film extrusion|film converting|lamination)/i, 20, "薄膜加工能力", "manufacturer"],
  [/(shrink bag|sausage casing|blister film|pharmaceutical packaging|meat packaging)/i, 20, "目标包装应用", "manufacturer"],
  [/(high\s*barrier).{0,60}(packaging|film)|(packaging|film).{0,60}(high\s*barrier)/i, 15, "高阻隔包装膜信号", "manufacturer"],
  [/(cheese|dairy|fresh\s*meat|food).{0,60}(packaging|film)|(packaging|film).{0,60}(cheese|dairy|fresh\s*meat|food)/i, 15, "食品包装应用信号", "manufacturer"],
  [/(resin importer|polymer distributor|resin distributor|chemical distributor)/i, 25, "树脂经销或进口能力", "distributor"],
  [/\bpvdc\b|vinylidene\s+chloride/i, 15, "内容与 PVDC 相关", ""],
];

export function isDisqualified(text: string) { return disqualifiers.find(([pattern]) => pattern.test(text))?.[1]; }

export function scoreLead(text: string, evidence: LeadEvidence = {}): LeadAssessment {
  const rejected = isDisqualified(text);
  if (rejected) return { score: 0, grade: "D", eligible: false, details: `排除：${rejected}` };

  const hits = signals.filter(([pattern]) => pattern.test(text));
  const contactPoints = evidence.publicContactCount ? 10 : 0;
  const communicationPoints = evidence.hasEmail ? 5 : 0;
  const locationPoints = evidence.hasPhone && evidence.hasAddress ? 5 : 0;
  const score = Math.max(0, Math.min(100, hits.reduce((sum, [, points]) => sum + points, 0) + contactPoints + communicationPoints + locationPoints));
  const companyType = hits.find(([, , , type]) => type === "manufacturer")?.[3] || hits.find(([, , , type]) => type === "distributor")?.[3];
  const grade: LeadGrade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";
  const eligible = score >= 40 && Boolean(companyType);
  const details = [...hits.map(([, points, label]) => `+${points} ${label}`), ...(contactPoints ? ["+10 找到公开业务联系人"] : []), ...(communicationPoints ? ["+5 找到公开企业邮箱"] : []), ...(locationPoints ? ["+5 找到公开电话和地址"] : [])].join("；") || "未命中企业能力信号";
  return { score, grade, eligible, details, companyType };
}
